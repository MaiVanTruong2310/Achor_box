package com.smartbox.backend.service;

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
public class ApprovalTicketService {
    private final CommerceRepository db;
    private final OrderWorkflowService orders;
    private final OutboxService outbox;
    private final CurrentActor actors;

    @Transactional
    public Map<String,Object> act(UUID ticketId,String action,String reason) {
        var actor=actors.get();
        var ticket=db.one("SELECT * FROM public.approval_tickets WHERE id=?",ticketId);
        UUID orderId=uuid(ticket.get("order_id"));
        var order=db.order(orderId,true);
        ticket=db.one("SELECT * FROM public.approval_tickets WHERE id=? FOR UPDATE",ticketId);
        orders.requireNewWorkflow(order);
        if(!"paid".equals(order.get("status"))) throw new ConflictException("TICKET_ORDER_NOT_PAID");
        String status=ticket.get("status").toString(); int round=((Number)ticket.get("review_round")).intValue();
        String next;
        if("RESUBMIT".equals(action)) {
            actor.requireOwner(uuid(order.get("user_id")));
            if(!"RETURNED".equals(status)) throw new ConflictException("INVALID_TICKET_TRANSITION");
            requireReason(reason); next="PENDING"; round++;
        } else {
            actor.requireRoles("super_admin","support_agent");
            if(!"PENDING".equals(status)) throw new ConflictException("TICKET_ALREADY_REVIEWED");
            next=switch(action) {
                case "APPROVE" -> "APPROVED";
                case "RETURN" -> {requireReason(reason); yield "RETURNED";}
                case "REJECT" -> {requireReason(reason); yield "REJECTED";}
                default -> throw new BadRequestException("INVALID_TICKET_ACTION");
            };
        }
        UUID event=UUID.randomUUID();
        db.update("UPDATE public.approval_tickets SET status=?,review_round=?,reason=?,updated_at=? WHERE id=?",next,round,reason,now(),ticketId);
        db.update("INSERT INTO public.ticket_history VALUES(?,?,?,?,?,?)",event,ticketId,action,actor.id(),reason,now());
        db.audit(actor.id(),"TICKET_"+action,"approval_tickets",ticketId,reason);
        if("APPROVE".equals(action)) {
            orders.transition(order,"confirmed",actor.id().toString(),"TICKET_APPROVED");
            db.update("INSERT INTO public.shipments(id,order_id,status,created_at) VALUES(?,?,'PREPARING',?)",UUID.randomUUID(),orderId,now());
        } else if("REJECT".equals(action)) {
            orders.requestRefund(order,reason);
            orders.transition(order,"cancelled",actor.id().toString(),"TICKET_REJECTED");
            orders.release(order,actor.id(),"TICKET_REJECTED");
        }
        String template=switch(action) {case "APPROVE" -> "ORDER_CONFIRMED"; case "RETURN" -> "TICKET_RETURNED"; case "REJECT" -> "TICKET_REJECTED"; default -> "TICKET_RESUBMITTED";};
        outbox.enqueue(template,orderId,"ticket:"+event,reason);
        return detail(ticketId);
    }
    @Transactional(readOnly=true)
    public Map<String,Object> detail(UUID id) {
        var ticket=db.one("SELECT * FROM public.approval_tickets WHERE id=?",id);
        var actor=actors.get(); var order=db.order(uuid(ticket.get("order_id")),false);
        if(!actor.staff()) actor.requireOwner(uuid(order.get("user_id")));
        else actor.requireRoles("super_admin","support_agent","accountant");
        Map<String,Object> result=new LinkedHashMap<>(ticket);
        result.put("history",db.list("SELECT * FROM public.ticket_history WHERE ticket_id=? ORDER BY created_at,id",id)); return result;
    }
    @Transactional(readOnly=true)
    public List<Map<String,Object>> list(int page,int size) {
        actors.get().requireRoles("super_admin","support_agent","accountant");
        if(page<0||size<1||size>100) throw new BadRequestException("VALIDATION_ERROR");
        return db.list("SELECT * FROM public.approval_tickets ORDER BY created_at DESC LIMIT ? OFFSET ?",size,(long)page*size);
    }
    private void requireReason(String reason) {if(reason==null||reason.isBlank()) throw new BadRequestException("TICKET_REASON_REQUIRED");}
}
