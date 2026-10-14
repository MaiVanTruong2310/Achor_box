package com.smartbox.backend.service;

import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import static com.smartbox.backend.service.OrderWorkflowService.*;

/** Read-only internal reconciliation. Does not prove a provider transferred money. */
@Service @RequiredArgsConstructor
public class PaymentAuditService {
    private final CommerceRepository db;
    private final CurrentActor actors;
    @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Map<String,Object> reconcile(UUID id){
        actors.get().requireRoles("super_admin","accountant");var order=db.order(id,false);
        if(((Number)order.get("workflow_version")).intValue()!=2)throw new ConflictException("LEGACY_ORDER_REVIEW_REQUIRED");
        List<String> issues=new ArrayList<>();String state=order.get("status").toString();
        var payments=db.list("SELECT * FROM public.payments WHERE order_id=? AND expires_at IS NOT NULL",id);
        var tickets=db.list("SELECT status FROM public.approval_tickets WHERE order_id=?",id);
        var refunds=db.list("SELECT * FROM public.refunds WHERE order_id=?",id);
        Map<String,Object> payment=payments.isEmpty()?null:payments.getFirst();String paid=payment==null?null:payment.get("status").toString();
        if(payments.size()>1)issues.add("MULTIPLE_WORKFLOW_PAYMENTS");
        if("pending".equals(state)&&payment!=null)issues.add("DRAFT_HAS_PAYMENT");
        if("awaiting_payment".equals(state)&&!"pending".equals(paid))issues.add("AWAITING_PAYMENT_NOT_PENDING");
        if(Set.of("paid","confirmed","completed").contains(state)&&!"success".equals(paid))issues.add("PAID_ORDER_PAYMENT_NOT_SUCCESS");
        if(Set.of("paid","confirmed","completed").contains(state)&&order.get("paid_at")==null)issues.add("ORDER_PAID_AT_MISSING");
        if("cancelled".equals(state)&&paid!=null&&!Set.of("expired","failed","refund_required","refunded").contains(paid))issues.add("CANCELLED_PAYMENT_NOT_CLOSED");
        if(payment!=null&&money(payment.get("amount")).compareTo(money(order.get("total")))!=0)issues.add("AMOUNT_MISMATCH");
        if(paid!=null&&Set.of("success","refund_required","refunded").contains(paid)&&payment.get("paid_at")==null)issues.add("PAYMENT_PAID_AT_MISSING");
        if("refund_required".equals(paid)&&(refunds.size()!=1||!"PENDING".equals(refunds.getFirst().get("status"))))issues.add("REFUND_PENDING_MISSING");
        if("refunded".equals(paid)&&(refunds.size()!=1||!"COMPLETED".equals(refunds.getFirst().get("status"))))issues.add("REFUND_COMPLETION_MISSING");
        if(!refunds.isEmpty()&&(paid==null||!Set.of("refund_required","refunded").contains(paid)))issues.add("UNEXPECTED_REFUND");
        if(!refunds.isEmpty()&&payment!=null&&(!uuid(refunds.getFirst().get("payment_id")).equals(uuid(payment.get("id")))||money(refunds.getFirst().get("amount")).compareTo(money(payment.get("amount")))!=0))issues.add("REFUND_PAYMENT_MISMATCH");
        if("paid".equals(state)&&(tickets.size()!=1||!Set.of("PENDING","RETURNED").contains(tickets.getFirst().get("status"))))issues.add("PAID_TICKET_MISSING_OR_INVALID");
        if(Set.of("confirmed","completed").contains(state)&&(tickets.size()!=1||!"APPROVED".equals(tickets.getFirst().get("status"))))issues.add("APPROVED_TICKET_MISSING");
        boolean released=Boolean.TRUE.equals(order.get("inventory_released"));
        if("cancelled".equals(state)!=released)issues.add("INVENTORY_RELEASE_STATE_MISMATCH");
        Map<UUID,Long> balances=new HashMap<>();
        for(var row:db.list("SELECT variant_id,sum(delta) AS balance FROM public.inventory_movements WHERE order_id=? GROUP BY variant_id",id))balances.put(uuid(row.get("variant_id")),((Number)row.get("balance")).longValue());
        if(!released)for(var row:db.list("SELECT variant_id,quantity FROM public.order_items WHERE order_id=?",id))balances.merge(uuid(row.get("variant_id")),((Number)row.get("quantity")).longValue(),Long::sum);
        if(balances.values().stream().anyMatch(b->b!=0))issues.add("INVENTORY_LEDGER_MISMATCH");
        var result=new LinkedHashMap<String,Object>();result.put("orderId",id.toString());result.put("orderStatus",state);result.put("paymentStatus",paid);result.put("refundStatus",refunds.isEmpty()?null:refunds.getFirst().get("status"));result.put("provider",payment==null?null:payment.get("provider"));result.put("inventoryReleased",released);result.put("consistent",issues.isEmpty());result.put("issues",issues);result.put("observedAt",now().toString());return result;
    }
}
