package com.smartbox.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.backend.exception.ConflictException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import static com.smartbox.backend.service.OrderWorkflowService.*;

@Service
@RequiredArgsConstructor
public class OutboxService {
    private final CommerceRepository db;
    private final ObjectMapper json;
    private final CurrentActor actors;

    /** Must join the caller's business transaction, never SMTP here. */
    @Transactional(propagation=Propagation.MANDATORY)
    public void enqueue(String template,UUID orderId,String eventKey,String reason) {
        var order=db.one("SELECT o.*,p.email,p.full_name FROM public.orders o JOIN public.profiles p ON p.id=o.user_id WHERE o.id=?",orderId);
        Map<String,Object> payload=new LinkedHashMap<>();
        payload.put("orderId",orderId.toString()); payload.put("name",order.get("full_name"));
        payload.put("total",order.get("total")); payload.put("status",order.get("status"));
        payload.put("reason",reason); payload.put("time",now().toString());
        payload.put("items",db.list("SELECT product_name_snapshot AS name,sku_snapshot AS sku,variant_name_snapshot AS variant,quantity,unit_price AS price,unit_price*quantity AS subtotal FROM public.order_items WHERE order_id=? ORDER BY variant_id",orderId));
        String recipient=Objects.toString(order.get("email"),"");
        boolean valid=recipient.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
        try {
            db.update("INSERT INTO public.email_outbox(id,template,reference_id,event_key,recipient,payload,status,next_attempt_at,last_error,created_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(event_key) DO NOTHING",
                UUID.randomUUID(),template,orderId,eventKey,recipient,json.writeValueAsString(payload),valid?"PENDING":"FAILED",now(),valid?null:"EMAIL_RECIPIENT_MISSING",now());
        } catch(com.fasterxml.jackson.core.JsonProcessingException ex) { throw new IllegalStateException("Cannot serialize email snapshot",ex); }
    }
    @Transactional
    public List<Map<String,Object>> claim(UUID token,int leaseSeconds) {
        var rows=db.list("SELECT * FROM public.email_outbox WHERE status='PENDING' AND next_attempt_at<=? AND (claimed_until IS NULL OR claimed_until<?) ORDER BY id LIMIT 50 FOR UPDATE SKIP LOCKED",now(),now());
        for(var row:rows) db.update("UPDATE public.email_outbox SET claim_token=?,claimed_until=? WHERE id=?",token,now().plusSeconds(leaseSeconds),row.get("id"));
        return rows;
    }
    @Transactional
    public void sent(UUID id,UUID token) {
        db.update("UPDATE public.email_outbox SET status='SENT',sent_at=?,claim_token=NULL,claimed_until=NULL WHERE id=? AND claim_token=?",now(),id,token);
    }
    @Transactional
    public void failed(UUID id,UUID token,String error,long backoffSeconds) {
        var rows=db.list("SELECT * FROM public.email_outbox WHERE id=? AND claim_token=? FOR UPDATE",id,token);
        if(rows.isEmpty()) return;
        int attempts=((Number)rows.getFirst().get("attempts")).intValue()+1;
        db.update("UPDATE public.email_outbox SET attempts=?,status=?,next_attempt_at=?,last_error=?,claim_token=NULL,claimed_until=NULL WHERE id=? AND claim_token=?",
            attempts,attempts>=5?"FAILED":"PENDING",now().plusSeconds(backoffSeconds*(1L << (attempts-1))),error.substring(0,Math.min(error.length(),1000)),id,token);
    }
    public Map<String,Object> payload(Map<String,Object> row) {
        try { return json.readValue(row.get("payload").toString(),new TypeReference<>(){}); }
        catch(Exception ex) { throw new IllegalStateException("Invalid outbox payload",ex); }
    }
    @Transactional(readOnly=true)
    public Map<String,Object> list(String status,int page,int size) {
        actors.get().requireRoles("super_admin","support_agent");
        if(!Set.of("PENDING","SENT","FAILED").contains(status) || page<0 || size<1 || size>100)
            throw new com.smartbox.backend.exception.BadRequestException("VALIDATION_ERROR");
        return Map.of("content",db.list("SELECT id,template,reference_id,recipient,status,attempts,last_error,next_attempt_at,created_at,sent_at FROM public.email_outbox WHERE status=? ORDER BY created_at DESC LIMIT ? OFFSET ?",status,size,(long)page*size),
            "page",page,"size",size,"totalElements",db.one("SELECT count(*) AS total FROM public.email_outbox WHERE status=?",status).get("total"));
    }
    @Transactional
    public void resend(UUID id) {
        actors.get().requireRoles("super_admin","support_agent");
        if(db.update("UPDATE public.email_outbox SET status='PENDING',attempts=0,next_attempt_at=?,last_error=NULL,claimed_until=NULL,claim_token=NULL WHERE id=? AND status='FAILED'",now(),id)!=1)
            throw new ConflictException("EMAIL_NOT_RESENDABLE");
    }
}
