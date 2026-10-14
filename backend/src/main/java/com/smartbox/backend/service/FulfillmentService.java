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
        throw new ConflictException("DELIVERY_INSTALLATION_REQUIRED: Sử dụng công việc giao và lắp đặt đã phân công");
    }
    @Transactional
    public Map<String,Object> delivered(UUID orderId) {
        var actor=actors.get();actor.requireRoles("super_admin","support_agent");
        throw new ConflictException("INSTALLATION_ACCEPTANCE_REQUIRED: Chỉ hoàn thành sau nghiệm thu công việc giao/lắp");
    }
    @Transactional
    public void assign(UUID orderId,CommerceRequests.DeviceAssignment request) {
        var actor=actors.get();actor.requireRoles("super_admin","support_agent","technician");
        throw new ConflictException("DELIVERY_INSTALLATION_REQUIRED: Nhập serial trong công việc được phân công");
    }
    @Transactional
    public void completeRefund(UUID refundId,String providerRef) {
        var actor=actors.get();actor.requireRoles("super_admin","accountant");
        if(providerRef==null||providerRef.isBlank()||providerRef.length()>200)throw new BadRequestException("REFUND_REFERENCE_REQUIRED");
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
