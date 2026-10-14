package com.smartbox.backend.service;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.exception.ForbiddenException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.util.*;
import static com.smartbox.backend.service.OrderWorkflowService.*;

@Service @RequiredArgsConstructor
public class OrderTrackingService {
    private final CommerceRepository db;private final CurrentActor actors;
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Map<String,Object> timeline(UUID id){
        var actor=actors.get();var order=db.order(id,false);boolean privateNotes=false;
        switch(actor.role()){
            case "customer" -> actor.requireOwner(uuid(order.get("user_id")));
            case "technician" -> {if(db.list("SELECT id FROM public.delivery_installations WHERE order_id=? AND assigned_to=?",id,actor.id()).isEmpty())throw new ForbiddenException("JOB_NOT_ASSIGNED");}
            case "super_admin","support_agent","accountant" -> privateNotes=true;
            default -> throw new ForbiddenException("TRACKING_NOT_ALLOWED");
        }
        List<Map<String,Object>> events=new ArrayList<>();
        for(var row:db.list("SELECT id,to_status AS status,reason,created_at FROM public.order_status_history WHERE order_id=?",id))events.add(event("ORDER",row,row.get("status").toString(),privateNotes));
        for(var row:db.list("SELECT h.id,h.action AS status,h.reason,h.created_at FROM public.ticket_history h JOIN public.approval_tickets t ON t.id=h.ticket_id WHERE t.order_id=?",id))events.add(event("PO_TICKET",row,row.get("status").toString(),privateNotes));
        for(var row:db.list("SELECT h.id,h.action AS status,h.reason,h.attempt,h.version,h.created_at FROM public.delivery_installation_history h JOIN public.delivery_installations j ON j.id=h.job_id WHERE j.order_id=?",id)){
            String action=row.get("status").toString();if(!privateNotes&&action.startsWith("CHECK_"))continue;
            events.add(event("DELIVERY_INSTALLATION",row,action,privateNotes));
        }
        events.sort(Comparator.comparing((Map<String,Object> e)->time(e.get("occurredAt"))).thenComparing(e->e.get("source").toString()).thenComparing(e->e.get("id").toString()));
        return Map.of("orderId",id.toString(),"orderStatus",order.get("status"),"events",events);
    }
    private Map<String,Object> event(String source,Map<String,Object> row,String action,boolean notes){
        var e=new LinkedHashMap<String,Object>();e.put("id",source+":"+row.get("id"));e.put("source",source);e.put("action",action);e.put("occurredAt",time(row.get("created_at")).toString());
        if(row.containsKey("attempt")){e.put("attempt",row.get("attempt"));e.put("version",row.get("version"));}if(notes)e.put("reason",row.get("reason"));return e;
    }
}
