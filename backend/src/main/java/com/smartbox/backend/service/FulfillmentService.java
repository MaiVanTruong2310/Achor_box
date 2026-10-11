package com.smartbox.backend.service;

import com.smartbox.backend.dto.request.CommerceRequests;
import com.smartbox.backend.exception.*;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import static com.smartbox.backend.service.OrderWorkflowService.*;

@Service
@RequiredArgsConstructor
public class FulfillmentService {
    private final CommerceRepository db;
    private final OrderWorkflowService orders;
    private final CurrentActor actors;
    private final OutboxService outbox;

    @Transactional
    public void tracking(UUID orderId,String tracking) {
        var actor=actors.get();actor.requireRoles("super_admin","support_agent");
        if(tracking==null||tracking.isBlank()||tracking.length()>200)throw new BadRequestException("INVALID_TRACKING_NUMBER");
        var order=db.order(orderId,true);orders.requireNewWorkflow(order);
        var shipment=db.one("SELECT * FROM public.shipments WHERE order_id=? FOR UPDATE",orderId);
        if("DELIVERED".equals(shipment.get("status")))throw new ConflictException("SHIPMENT_ALREADY_DELIVERED");
        db.update("UPDATE public.shipments SET tracking_number=? WHERE id=?",tracking,shipment.get("id"));
        db.update("UPDATE public.orders SET tracking_number=? WHERE id=?",tracking,orderId);
        db.update("INSERT INTO public.shipment_history VALUES(?,?,?,?,?)",UUID.randomUUID(),shipment.get("id"),shipment.get("status"),actor.id(),now());
    }

    @Transactional
    public Map<String,Object> ship(UUID orderId,CommerceRequests.Shipment request) {
        var actor=actors.get();actor.requireRoles("super_admin","support_agent");
        var order=db.order(orderId,true);
        if(!"confirmed".equals(order.get("status"))) throw new ConflictException("ORDER_NOT_CONFIRMED");
        var shipment=db.one("SELECT * FROM public.shipments WHERE order_id=? FOR UPDATE",orderId);
        if(!"PREPARING".equals(shipment.get("status"))) throw new ConflictException("SHIPMENT_NOT_PREPARING");
        db.update("UPDATE public.shipments SET carrier=?,tracking_number=?,status='SHIPPED' WHERE id=?",request.carrier(),request.trackingNumber(),shipment.get("id"));
        db.update("UPDATE public.orders SET tracking_number=? WHERE id=?",request.trackingNumber(),orderId);
        db.update("INSERT INTO public.shipment_history VALUES(?,?,?,?,?)",UUID.randomUUID(),shipment.get("id"),"SHIPPED",actor.id(),now());
        outbox.enqueue("ORDER_SHIPPED",orderId,"shipped:"+shipment.get("id"),"Đã giao cho đơn vị vận chuyển");
        return orders.view(orderId);
    }
    @Transactional
    public Map<String,Object> delivered(UUID orderId) {
        var actor=actors.get();actor.requireRoles("super_admin","support_agent");
        var order=db.order(orderId,true);
        var shipment=db.one("SELECT * FROM public.shipments WHERE order_id=? FOR UPDATE",orderId);
        if("DELIVERED".equals(shipment.get("status"))) return orders.view(orderId);
        if(!"SHIPPED".equals(shipment.get("status"))) throw new ConflictException("SHIPMENT_NOT_SHIPPED");
        for(var item:db.list("SELECT i.id,i.quantity,count(d.id) AS assigned FROM public.order_items i LEFT JOIN public.devices d ON d.sold_order_item_id=i.id WHERE i.order_id=? GROUP BY i.id,i.quantity",orderId))
            if(((Number)item.get("quantity")).longValue()!=((Number)item.get("assigned")).longValue()) throw new ConflictException("DEVICE_SERIAL_ASSIGNMENT_INCOMPLETE");
        db.update("UPDATE public.shipments SET status='DELIVERED',delivered_at=? WHERE id=?",now(),shipment.get("id"));
        db.update("INSERT INTO public.shipment_history VALUES(?,?,?,?,?)",UUID.randomUUID(),shipment.get("id"),"DELIVERED",actor.id(),now());
        orders.transition(order,"completed",actor.id().toString(),"DELIVERY_CONFIRMED");
        db.update("UPDATE public.devices SET owner_id=? WHERE sold_order_item_id IN(SELECT id FROM public.order_items WHERE order_id=?)",order.get("user_id"),orderId);
        outbox.enqueue("ORDER_DELIVERED",orderId,"delivered:"+shipment.get("id"),"Giao hàng thành công");
        return orders.view(orderId);
    }
    @Transactional
    public void assign(UUID orderId,CommerceRequests.DeviceAssignment request) {
        var actor=actors.get();actor.requireRoles("super_admin","support_agent","technician");
        var order=db.order(orderId,true);
        if(!"confirmed".equals(order.get("status"))) throw new ConflictException("ORDER_NOT_CONFIRMED");
        var item=db.one("SELECT * FROM public.order_items WHERE id=? AND order_id=?",request.orderItemId(),orderId);
        var device=db.one("SELECT * FROM public.devices WHERE id=? FOR UPDATE",request.deviceId());
        if(request.orderItemId().equals(uuid(device.get("sold_order_item_id")))) return;
        if(device.get("owner_id")!=null || device.get("sold_order_item_id")!=null) throw new ConflictException("DEVICE_ALREADY_SOLD");
        if(!Objects.equals(uuid(item.get("product_id")),uuid(device.get("product_id")))) throw new ConflictException("DEVICE_PRODUCT_MISMATCH");
        if(!Objects.equals(uuid(item.get("variant_id")),uuid(device.get("product_variant_id")))) throw new ConflictException("DEVICE_VARIANT_MISMATCH");
        long assigned=((Number)db.one("SELECT count(*) AS total FROM public.devices WHERE sold_order_item_id=?",request.orderItemId()).get("total")).longValue();
        if(assigned>=((Number)item.get("quantity")).longValue()) throw new ConflictException("ITEM_DEVICE_LIMIT");
        db.update("UPDATE public.devices SET sold_order_item_id=? WHERE id=?",request.orderItemId(),request.deviceId());
    }
    @Transactional
    public void completeRefund(UUID refundId,String providerRef) {
        var actor=actors.get();actor.requireRoles("super_admin","accountant");
        var refund=db.one("SELECT * FROM public.refunds WHERE id=?",refundId);
        UUID orderId=uuid(refund.get("order_id")); db.order(orderId,true);
        refund=db.one("SELECT * FROM public.refunds WHERE id=? FOR UPDATE",refundId);
        if("COMPLETED".equals(refund.get("status"))) {
            if(!Objects.equals(providerRef,refund.get("provider_ref"))) throw new ConflictException("REFUND_REFERENCE_MISMATCH");
            return;
        }
        db.update("UPDATE public.refunds SET status='COMPLETED',provider_ref=?,completed_at=? WHERE id=?",providerRef,now(),refundId);
        db.update("UPDATE public.payments SET status='refunded' WHERE id=?",refund.get("payment_id"));
        db.audit(actor.id(),"REFUND_COMPLETED","refunds",refundId,providerRef);
        outbox.enqueue("ORDER_REFUNDED",orderId,"refunded:"+refundId,"Hoàn tiền đã được đối soát: "+providerRef);
    }
    @Transactional(readOnly=true)
    public List<Map<String,Object>> refunds(int page,int size) {
        actors.get().requireRoles("super_admin","accountant");
        if(page<0||size<1||size>100) throw new BadRequestException("VALIDATION_ERROR");
        return db.list("SELECT * FROM public.refunds ORDER BY created_at DESC LIMIT ? OFFSET ?",size,(long)page*size);
    }
}
