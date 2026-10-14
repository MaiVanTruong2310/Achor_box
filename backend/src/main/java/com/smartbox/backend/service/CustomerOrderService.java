package com.smartbox.backend.service;

import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service @RequiredArgsConstructor
public class CustomerOrderService {
    private final CommerceRepository db;
    private final CurrentActor actors;
    private final OrderWorkflowService orders;
    private final DeliveryInstallationService delivery;
    private final OrderTrackingService tracking;
    @Transactional(readOnly=true)
    public Map<String,Object> detail(UUID id){
        actors.get().requireRoles("customer");var result=new LinkedHashMap<>(orders.detail(id));
        // Do not include staff identifiers, internal ticket notes or shipment administration data.
        result.remove("ticket");result.remove("shipment");
        var payments=db.list("SELECT id,provider,provider_environment AS environment,status,amount,transaction_ref AS \"transactionRef\",paid_at AS \"paidAt\",expires_at AS \"expiresAt\" FROM public.payments WHERE order_id=? AND expires_at IS NOT NULL",id);
        if(!payments.isEmpty()){
            var payment=new LinkedHashMap<>(payments.getFirst());payment.put("isSimulated","mock".equals(payment.get("provider"))||"sandbox".equals(payment.get("environment")));
            var refunds=db.list("SELECT status,amount,completed_at AS \"completedAt\" FROM public.refunds WHERE payment_id=?",payment.get("id"));payment.put("refund",refunds.isEmpty()?null:refunds.getFirst());result.put("payment",payment);
        }else result.put("payment",null);
        var jobs=db.list("SELECT id FROM public.delivery_installations WHERE order_id=?",id);
        result.put("deliveryInstallation",jobs.isEmpty()?null:delivery.forOrder(id));
        result.put("statusHistory",db.list("SELECT to_status AS status,created_at AS timestamp FROM public.order_status_history WHERE order_id=? ORDER BY created_at,id",id));
        result.put("timeline",tracking.timeline(id).get("events"));
        return result;
    }
    @Transactional(readOnly=true)
    public Map<String,Object> paymentOrder(UUID payment){
        actors.get().requireRoles("customer");
        var row=db.one("SELECT p.order_id FROM public.payments p JOIN public.orders o ON o.id=p.order_id WHERE p.id=? AND o.user_id=?",payment,actors.get().id());
        return detail(UUID.fromString(row.get("order_id").toString()));
    }
    @Transactional(readOnly=true)
    public Map<String,Object> list(int page,int size){
        actors.get().requireRoles("customer");if(page<0||size<1||size>100)throw new BadRequestException("VALIDATION_ERROR");
        UUID owner=actors.get().id();long total=((Number)db.one("SELECT count(*) AS n FROM public.orders WHERE user_id=?",owner).get("n")).longValue();
        var content=db.list("SELECT id FROM public.orders WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?",owner,size,(long)page*size).stream().map(r->detail(UUID.fromString(r.get("id").toString()))).toList();
        return Map.of("content",content,"page",page,"size",size,"totalElements",total,"totalPages",(total+size-1)/size);
    }
}
