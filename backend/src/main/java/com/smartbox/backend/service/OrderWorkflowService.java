package com.smartbox.backend.service;

import com.smartbox.backend.dto.request.CommerceRequests;
import com.smartbox.backend.exception.*;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
@RequiredArgsConstructor
public class OrderWorkflowService {
    private final CommerceRepository db;
    private final OrderStateMachine states;
    private final CurrentActor actors;
    private final OutboxService outbox;
    private final CustomerAccountService customers;
    private final AcceptanceWarrantyService warranties;
    @Value("${smartbox.orders.draft-minutes:30}") private int draftMinutes;

    public static UUID uuid(Object value) { return value == null ? null : UUID.fromString(value.toString()); }
    public static BigDecimal money(Object value) { return new BigDecimal(value.toString()); }
    public static OffsetDateTime time(Object value) {
        if (value == null) return null;
        if (value instanceof OffsetDateTime t) return t;
        if (value instanceof java.sql.Timestamp t) return t.toInstant().atOffset(ZoneOffset.UTC);
        return OffsetDateTime.parse(value.toString());
    }
    public static OffsetDateTime now() { return OffsetDateTime.now(ZoneOffset.UTC); }

    @Transactional
    public Map<String,Object> create(CommerceRequests.CreateOrder request) {
        UUID user = actors.get().id();
        Map<String,Object> profile = db.one("SELECT * FROM public.profiles WHERE id=?", user);
        if (profile.get("email") == null || profile.get("email").toString().isBlank())
            throw new BadRequestException("EMAIL_REQUIRED: Tài khoản cần có email nhận thông báo");
        TreeMap<UUID,Integer> quantities = new TreeMap<>(Comparator.comparing(UUID::toString));
        for (var item : request.items()) {
            quantity(item.quantity());
            int total = quantities.getOrDefault(item.variantId(),0) + item.quantity();
            quantity(total); quantities.put(item.variantId(), total);
        }
        UUID id = UUID.randomUUID();
        var snapshot=customers.snapshot(user,request.addressId(),request.shippingDetails(),request.shippingAddress());
        db.update("INSERT INTO public.orders(id,user_id,status,shipping_address,shipping_address_snapshot,source_address_id,total,expires_at,workflow_version) VALUES(?,?,CAST(? AS public.order_status),?,?,?,0,?,2)",
            id,user,"pending",snapshot.get("addressLine"),customers.serialize(snapshot),request.addressId(),now().plusMinutes(draftMinutes));
        for (var entry : quantities.entrySet()) addLocked(id,entry.getKey(),entry.getValue(),user);
        recalculate(id);
        history(id,null,"pending",user.toString(),"ORDER_CREATED");
        return view(id);
    }

    @Transactional
    public Map<String,Object> add(UUID id, UUID variant, int quantity) {
        var actor = actors.get(); var order = owned(id,actor,true); editable(order);
        addLocked(id,variant,quantity,actor.id()); recalculate(id); return view(id);
    }

    private void addLocked(UUID orderId, UUID variantId, int amount, UUID actor) {
        quantity(amount);
        var existing = db.list("SELECT * FROM public.order_items WHERE order_id=? AND variant_id=?",orderId,variantId);
        int previous = existing.isEmpty() ? 0 : ((Number)existing.getFirst().get("quantity")).intValue();
        quantity(previous + amount);
        var variant = db.one("SELECT v.*,p.name AS product_name,p.price AS base_price,p.is_active AS product_active FROM public.product_variants v JOIN public.products p ON p.id=v.product_id WHERE v.id=? FOR UPDATE OF v",variantId);
        if (!Boolean.TRUE.equals(variant.get("is_active")) || !Boolean.TRUE.equals(variant.get("product_active")))
            throw new BadRequestException("PRODUCT_INACTIVE: SKU không được bán");
        BigDecimal price = money(variant.get("base_price")).add(money(variant.get("price_delta")));
        if (price.signum()<0) throw new BadRequestException("INVALID_PRICE: Giá SKU phải không âm");
        moveStock(variantId,-amount,orderId,actor,"RESERVE");
        if (existing.isEmpty()) {
            db.update("INSERT INTO public.order_items(id,order_id,product_id,variant_id,quantity,unit_price,sku_snapshot,product_name_snapshot,variant_name_snapshot,size_snapshot,capacity_liter_snapshot) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                UUID.randomUUID(),orderId,variant.get("product_id"),variantId,amount,price,variant.get("sku"),variant.get("product_name"),variant.get("variant_name"),variant.get("size"),variant.get("capacity_liter"));
            db.update("UPDATE public.order_items SET warranty_months_snapshot=? WHERE order_id=? AND variant_id=?",warranties.months(variant),orderId,variantId);
        } else db.update("UPDATE public.order_items SET quantity=? WHERE id=?",previous+amount,existing.getFirst().get("id"));
    }

    @Transactional
    public Map<String,Object> setQuantity(UUID id, UUID variantId, int amount) {
        quantity(amount); var actor=actors.get(); editable(owned(id,actor,true));
        var item=db.one("SELECT * FROM public.order_items WHERE order_id=? AND variant_id=?",id,variantId);
        int delta=((Number)item.get("quantity")).intValue()-amount;
        if (delta<0) {
            var variant=db.one("SELECT v.is_active,p.is_active AS product_active FROM public.product_variants v JOIN public.products p ON p.id=v.product_id WHERE v.id=? FOR UPDATE OF v",variantId);
            if (!Boolean.TRUE.equals(variant.get("is_active")) || !Boolean.TRUE.equals(variant.get("product_active"))) throw new BadRequestException("PRODUCT_INACTIVE");
        }
        moveStock(variantId,delta,id,actor.id(),"QUANTITY_CHANGE");
        db.update("UPDATE public.order_items SET quantity=? WHERE id=?",amount,item.get("id"));
        recalculate(id); return view(id);
    }

    @Transactional
    public Map<String,Object> remove(UUID id, UUID variantId) {
        var actor=actors.get(); editable(owned(id,actor,true));
        var item=db.one("SELECT * FROM public.order_items WHERE order_id=? AND variant_id=?",id,variantId);
        moveStock(variantId,((Number)item.get("quantity")).intValue(),id,actor.id(),"ITEM_REMOVED");
        db.update("DELETE FROM public.order_items WHERE id=?",item.get("id")); recalculate(id); return view(id);
    }

    public Map<String,Object> owned(UUID id, CurrentActor.Actor actor, boolean lock) {
        var order=db.order(id,lock);
        actor.requireOwner(uuid(order.get("user_id")));
        return order;
    }
    public void requireNewWorkflow(Map<String,Object> order) {
        if (((Number)order.get("workflow_version")).intValue()!=2)
            throw new ConflictException("LEGACY_ORDER_REVIEW_REQUIRED: Đơn cũ chưa xác minh giữ kho/thanh toán");
    }
    public void editable(Map<String,Object> order) {
        requireNewWorkflow(order);
        if (!"pending".equals(order.get("status")) || !time(order.get("expires_at")).isAfter(now()))
            throw new ConflictException("ORDER_NOT_EDITABLE: Đơn không còn cho phép sửa sản phẩm");
    }
    /** Existing pre-migration drafts get a contact snapshot at checkout; never re-read saved addresses. */
    public void freezeAddress(Map<String,Object> order) {
        if(order.get("shipping_address_snapshot")==null){
            var snapshot=customers.snapshot(uuid(order.get("user_id")),null,null,Objects.toString(order.get("shipping_address"),null));
            db.update("UPDATE public.orders SET shipping_address_snapshot=? WHERE id=?",customers.serialize(snapshot),order.get("id"));
        } else {
            var snapshot=customers.readSnapshot(order.get("shipping_address_snapshot"));
            if(!Objects.equals(snapshot.get("addressLine"),order.get("shipping_address")))throw new ConflictException("ADDRESS_SNAPSHOT_MISMATCH");
        }
    }
    public void moveStock(UUID variant,int delta,UUID order,UUID actor,String reason) {
        if (delta==0) return;
        int changed=db.update("UPDATE public.product_variants SET stock_quantity=stock_quantity+? WHERE id=? AND stock_quantity+?>=0",delta,variant,delta);
        if(changed!=1) throw new ConflictException("INSUFFICIENT_STOCK: Không đủ tồn kho cho SKU " + variant);
        db.update("INSERT INTO public.inventory_movements VALUES(?,?,?,?,?,?,?)",UUID.randomUUID(),variant,order,delta,reason,actor,now());
    }
    public void recalculate(UUID id) {
        db.update("UPDATE public.orders SET total=(SELECT COALESCE(sum(unit_price*quantity),0) FROM public.order_items WHERE order_id=?),updated_at=? WHERE id=?",id,now(),id);
    }
    public void transition(Map<String,Object> order,String target,String actor,String reason) {
        UUID id=uuid(order.get("id")); String from=order.get("status").toString();
        if("completed".equals(target)&&db.list("SELECT id FROM public.delivery_installations WHERE order_id=? AND status='COMPLETED' AND customer_accepted=true",id).isEmpty())
            throw new ConflictException("INSTALLATION_ACCEPTANCE_REQUIRED");
        states.requireTransition(from,target);
        db.update("UPDATE public.orders SET status=CAST(? AS public.order_status),updated_at=? WHERE id=?",target,now(),id);
        history(id,from,target,actor,reason); order.put("status",target);
    }
    private void history(UUID id,String from,String to,String actor,String reason) {
        db.update("INSERT INTO public.order_status_history VALUES(?,?,?,?,?,?,?)",UUID.randomUUID(),id,from,to,actor,reason,now());
        db.audit("SYSTEM".equals(actor)?null:uuid(actor),"ORDER_"+to.toUpperCase(Locale.ROOT),"orders",id,reason);
    }
    public void release(Map<String,Object> order,UUID actor,String reason) {
        requireNewWorkflow(order);
        if(Boolean.TRUE.equals(order.get("inventory_released"))) return;
        UUID id=uuid(order.get("id"));
        for(var item:db.list("SELECT * FROM public.order_items WHERE order_id=? ORDER BY variant_id",id))
            moveStock(uuid(item.get("variant_id")),((Number)item.get("quantity")).intValue(),id,actor,reason);
        db.update("UPDATE public.orders SET inventory_released=true WHERE id=?",id);
        order.put("inventory_released",true);
    }

    @Transactional
    public Map<String,Object> cancel(UUID id,String reason) {
        var actor=actors.get(); var order=db.order(id,true);
        if(!actor.staff()) actor.requireOwner(uuid(order.get("user_id")));
        else actor.requireRoles("super_admin","support_agent");
        requireNewWorkflow(order);
        if("cancelled".equals(order.get("status"))) return view(id);
        // After shipping, returned goods must be inspected before inventory can be restored.
        if(!db.list("SELECT id FROM public.shipments WHERE order_id=? AND status<>'PREPARING'",id).isEmpty())
            throw new ConflictException("ORDER_ALREADY_SHIPPED");
        if("paid".equals(order.get("status")) || "confirmed".equals(order.get("status"))) {
            if(!actor.staff()) throw new ConflictException("PAID_ORDER_REQUIRES_STAFF_CANCELLATION");
            requestRefund(order,reason);
        } else db.update("UPDATE public.payments SET status='expired' WHERE order_id=? AND status='pending'",id);
        transition(order,"cancelled",actor.id().toString(),reason); release(order,actor.id(),"CANCELLED");
        for(var job:db.list("SELECT * FROM public.delivery_installations WHERE order_id=? FOR UPDATE",id)) {
            long version=((Number)job.get("version")).longValue()+1;
            db.update("UPDATE public.delivery_installations SET status='FAILED',failure_reason='ORDER_CANCELLED',version=?,updated_at=? WHERE id=?",version,now(),job.get("id"));
            db.update("INSERT INTO public.delivery_installation_history VALUES(?,?,?,?,?,?,?,?,?,?)",UUID.randomUUID(),job.get("id"),actor.id(),"ORDER_CANCELLED",job.get("status"),"FAILED","Đơn hàng đã hủy",job.get("attempt"),version,now());
        }
        for(var ticket:db.list("SELECT id FROM public.approval_tickets WHERE order_id=? AND status IN ('PENDING','RETURNED')",id))
            db.update("INSERT INTO public.ticket_history VALUES(?,?,?,?,?,?)",UUID.randomUUID(),ticket.get("id"),"CANCELLED",actor.id(),reason,now());
        db.update("UPDATE public.approval_tickets SET status='REJECTED',reason=?,updated_at=? WHERE order_id=? AND status IN ('PENDING','RETURNED')",reason,now(),id);
        db.update("UPDATE public.devices SET sold_order_item_id=NULL WHERE sold_order_item_id IN(SELECT id FROM public.order_items WHERE order_id=?) AND owner_id IS NULL",id);
        outbox.enqueue("ORDER_CANCELLED",id,"cancelled:"+id,reason);
        return view(id);
    }
    public void requestRefund(Map<String,Object> order,String reason) {
        UUID orderId=uuid(order.get("id"));
        var payment=db.one("SELECT * FROM public.payments WHERE order_id=? AND expires_at IS NOT NULL FOR UPDATE",orderId);
        UUID paymentId=uuid(payment.get("id"));
        db.update("INSERT INTO public.refunds(id,payment_id,order_id,amount,status,reason,created_at) VALUES(?,?,?,?,'PENDING',?,?) ON CONFLICT(payment_id) DO NOTHING",UUID.randomUUID(),paymentId,orderId,payment.get("amount"),reason,now());
        db.update("UPDATE public.payments SET status='refund_required' WHERE id=? AND status<>'refunded'",paymentId);
    }
    @Transactional(readOnly=true)
    public Map<String,Object> detail(UUID id) {
        var actor=actors.get(); var order=db.order(id,false);
        if(!actor.staff()) actor.requireOwner(uuid(order.get("user_id")));
        else actor.requireRoles("super_admin","support_agent","accountant");
        return view(id);
    }
    @Transactional(readOnly=true)
    public List<Map<String,Object>> history(UUID id) {
        detail(id); return db.list("SELECT * FROM public.order_status_history WHERE order_id=? ORDER BY created_at,id",id);
    }
    @Transactional(readOnly=true)
    public List<Map<String,Object>> mine(int page,int size) {
        if(page<0||size<1||size>100)throw new BadRequestException("VALIDATION_ERROR");
        return db.list("SELECT id,status,total,shipping_address AS \"shippingAddress\",paid_at AS \"paidAt\",created_at AS \"createdAt\" FROM public.orders WHERE user_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?",actors.get().id(),size,(long)page*size);
    }
    public Map<String,Object> view(UUID id) {
        var o=db.order(id,false); Map<String,Object> response=new LinkedHashMap<>();
        response.put("id",id); response.put("orderId",id); response.put("userId",o.get("user_id"));
        response.put("status",o.get("status")); response.put("shippingAddress",o.get("shipping_address"));
        response.put("shippingAddressSnapshot",customers.readSnapshot(o.get("shipping_address_snapshot")));
        response.put("total",o.get("total")); response.put("totalAmount",o.get("total"));
        response.put("paidAt",o.get("paid_at")); response.put("expiresAt",o.get("expires_at"));
        response.put("createdAt",o.get("created_at")); response.put("updatedAt",o.get("updated_at"));
        response.put("items",db.list("SELECT id,product_id AS \"productId\",variant_id AS \"variantId\",sku_snapshot AS sku,product_name_snapshot AS \"productName\",variant_name_snapshot AS \"variantName\",size_snapshot AS size,capacity_liter_snapshot AS \"capacityLiter\",unit_price AS \"unitPrice\",quantity,unit_price*quantity AS subtotal FROM public.order_items WHERE order_id=? ORDER BY variant_id",id));
        response.put("ticket",db.list("SELECT * FROM public.approval_tickets WHERE order_id=?",id));
        response.put("shipment",db.list("SELECT * FROM public.shipments WHERE order_id=?",id));
        return response;
    }
    private void quantity(int amount) {
        if(amount<1 || amount>99) throw new BadRequestException("QUANTITY_LIMIT_EXCEEDED: Số lượng phải từ 1 đến 99");
    }
}
