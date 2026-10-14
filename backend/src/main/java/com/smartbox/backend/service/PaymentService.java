package com.smartbox.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.backend.dto.request.CommerceRequests;
import com.smartbox.backend.exception.*;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import static com.smartbox.backend.service.OrderWorkflowService.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {
    private final CommerceRepository db;
    private final OrderWorkflowService orders;
    private final CurrentActor actors;
    private final OutboxService outbox;
    private final ObjectMapper json;
    private final org.springframework.core.env.Environment environment;
    @Value("${smartbox.payment.hmac-secret:}") private String secret;
    @Value("${smartbox.payment.timeout-minutes:15}") private int timeoutMinutes;
    @Value("${smartbox.public-url:http://localhost:8080}") private String publicUrl;
    @Value("${smartbox.demo.fail-after-paid:false}") private boolean failAfterPaid;
    public Map<String,Object> mode(){return Map.of("provider","mock","isSimulated",true,"demoActionsEnabled",Arrays.asList(environment.getActiveProfiles()).contains("demo")&&secret!=null&&secret.length()>=32);}

    @Transactional
    public Map<String,Object> checkout(UUID id,String key) {
        if(key==null || key.isBlank()) throw new BadRequestException("IDEMPOTENCY_KEY_REQUIRED");
        if(key.length()>128) throw new BadRequestException("INVALID_IDEMPOTENCY_KEY");
        // Insert then lock the key before the order. Unique insertion serializes concurrent same-key calls.
        db.update("INSERT INTO public.checkout_keys(key,order_id,created_at,expires_at) VALUES(?,?,?,?) ON CONFLICT(key) DO NOTHING",key,id,now(),now().plusHours(24));
        var stored=db.one("SELECT * FROM public.checkout_keys WHERE key=? FOR UPDATE",key);
        var actor=actors.get();
        // Never return another customer's stored response, even if its key is known.
        var order=orders.owned(id,actor,true);
        if(time(stored.get("expires_at")).isAfter(now())) {
            if(!id.equals(uuid(stored.get("order_id")))) throw new ConflictException("IDEMPOTENCY_KEY_REUSED");
            if(stored.get("response")!=null) return readResponse(stored.get("response").toString());
        }
        orders.editable(order);
        orders.freezeAddress(order);
        if(db.list("SELECT id FROM public.order_items WHERE order_id=?",id).isEmpty() || money(order.get("total")).signum()<=0)
            throw new ConflictException("ORDER_NOT_CHECKOUTABLE: Đơn cần sản phẩm và tổng tiền dương");
        UUID payment=UUID.randomUUID(); var expires=now().plusMinutes(timeoutMinutes);
        db.update("INSERT INTO public.payments(id,order_id,amount,status,provider,expires_at) VALUES(?,?,?,'pending','mock',?)",payment,id,order.get("total"),expires);
        orders.transition(order,"awaiting_payment",actor.id().toString(),"CHECKOUT");
        db.update("UPDATE public.orders SET expires_at=? WHERE id=?",expires,id);
        Map<String,Object> response=new LinkedHashMap<>();
        response.put("orderId",id.toString()); response.put("status","awaiting_payment");
        response.put("paymentId",payment.toString()); response.put("amount",order.get("total"));
        response.putAll(mode());
        response.put("paymentUrl",publicUrl+"/mock-payment/payments/"+payment); response.put("expiresAt",expires.toString());
        try {
            db.update("UPDATE public.checkout_keys SET order_id=?,payment_id=?,response=?,created_at=?,expires_at=? WHERE key=?",id,payment,json.writeValueAsString(response),now(),now().plusHours(24),key);
        } catch(Exception ex) { throw new IllegalStateException("Cannot save checkout response",ex); }
        return readResponse(serialize(response));
    }
    private String serialize(Object value) { try {return json.writeValueAsString(value);} catch(Exception ex){throw new IllegalStateException(ex);} }
    private Map<String,Object> readResponse(String value) { try {return json.readValue(value,new TypeReference<>(){});} catch(Exception ex){throw new IllegalStateException(ex);} }

    public String sign(UUID payment,UUID order,java.math.BigDecimal amount,String result) {
        if(secret==null || secret.length()<32) throw new AppException(503,"PAYMENT_NOT_CONFIGURED");
        try {
            Mac mac=Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
            String message=payment+"|"+order+"|"+amount.stripTrailingZeros().toPlainString()+"|"+result;
            return HexFormat.of().formatHex(mac.doFinal(message.getBytes(StandardCharsets.UTF_8)));
        } catch(java.security.GeneralSecurityException ex) { throw new IllegalStateException(ex); }
    }
    @Transactional
    public Map<String,Object> callback(CommerceRequests.Callback callback) {
        String expected=sign(callback.paymentId(),callback.orderId(),callback.amount(),callback.result());
        if(!MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII),callback.signature().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII)))
            throw new UnauthorizedException("INVALID_SIGNATURE");
        if(!Set.of("SUCCESS","FAILED").contains(callback.result())) throw new BadRequestException("INVALID_PAYMENT_RESULT");
        // All payment paths lock order first, then payment: scheduler/callback/refund share this order.
        var order=db.order(callback.orderId(),true); orders.requireNewWorkflow(order);
        var payment=db.one("SELECT * FROM public.payments WHERE id=? FOR UPDATE",callback.paymentId());
        if(!callback.orderId().equals(uuid(payment.get("order_id")))) throw new BadRequestException("PAYMENT_ORDER_MISMATCH");
        if(callback.amount().compareTo(money(payment.get("amount")))!=0 || callback.amount().compareTo(money(order.get("total")))!=0)
            throw new BadRequestException("AMOUNT_MISMATCH");
        String status=payment.get("status").toString();
        if(Set.of("success","refund_required","refunded").contains(status)) return Map.of("acknowledged",true);
        if("SUCCESS".equals(callback.result())) {
            if("cancelled".equals(order.get("status"))) {
                db.update("UPDATE public.payments SET status='refund_required',paid_at=? WHERE id=?",now(),callback.paymentId());
                orders.requestRefund(order,"LATE_PAYMENT_SUCCESS");
                log.warn("Late successful payment {} requires refund",callback.paymentId());
            } else if("awaiting_payment".equals(order.get("status"))) {
                if(!time(payment.get("expires_at")).isAfter(now())) {
                    expireLocked(order,payment);
                    db.update("UPDATE public.payments SET status='refund_required',paid_at=? WHERE id=?",now(),callback.paymentId());
                    orders.requestRefund(order,"LATE_PAYMENT_SUCCESS");
                } else {
                    db.update("UPDATE public.payments SET status='success',paid_at=? WHERE id=?",now(),callback.paymentId());
                    db.update("UPDATE public.orders SET paid_at=? WHERE id=?",now(),callback.orderId());
                    orders.transition(order,"paid","SYSTEM","PAYMENT_SUCCESS");
                    UUID ticket=UUID.randomUUID();
                    db.update("INSERT INTO public.approval_tickets(id,order_id,status,created_at,updated_at) VALUES(?,?,'PENDING',?,?) ON CONFLICT(order_id) DO NOTHING",ticket,callback.orderId(),now(),now());
                    var actual=db.one("SELECT id FROM public.approval_tickets WHERE order_id=?",callback.orderId());
                    db.update("INSERT INTO public.ticket_history VALUES(?,?,?,NULL,?,?)",UUID.randomUUID(),actual.get("id"),"CREATED","PAYMENT_SUCCESS",now());
                    outbox.enqueue("ORDER_PAID",callback.orderId(),"paid:"+callback.paymentId(),"Thanh toán thành công");
                    if(failAfterPaid) throw new IllegalStateException("DEMO_FAIL_AFTER_PAID");
                }
            } else throw new ConflictException("PAYMENT_ORDER_STATE_MISMATCH");
        } else if("pending".equals(status) && "awaiting_payment".equals(order.get("status"))) {
            db.update("UPDATE public.payments SET status='failed' WHERE id=?",callback.paymentId());
            orders.transition(order,"cancelled","SYSTEM","PAYMENT_FAILED"); orders.release(order,null,"PAYMENT_FAILED");
            outbox.enqueue("ORDER_CANCELLED",callback.orderId(),"cancelled:"+callback.orderId(),"Thanh toán thất bại");
        }
        return Map.of("acknowledged",true);
    }
    @Transactional
    public void expire(UUID orderId) {
        var order=db.order(orderId,true);
        if(!Set.of("pending","awaiting_payment").contains(order.get("status")) || time(order.get("expires_at")).isAfter(now())) return;
        if("pending".equals(order.get("status"))) {
            orders.transition(order,"cancelled","SYSTEM","DRAFT_EXPIRED"); orders.release(order,null,"DRAFT_EXPIRED");
            outbox.enqueue("ORDER_CANCELLED",orderId,"cancelled:"+orderId,"Đơn nháp hết hạn");
        } else expireLocked(order,db.one("SELECT * FROM public.payments WHERE order_id=? AND expires_at IS NOT NULL FOR UPDATE",orderId));
    }
    private void expireLocked(Map<String,Object> order,Map<String,Object> payment) {
        db.update("UPDATE public.payments SET status='expired' WHERE id=?",payment.get("id"));
        orders.transition(order,"cancelled","SYSTEM","PAYMENT_TIMEOUT"); orders.release(order,null,"PAYMENT_TIMEOUT");
        UUID id=uuid(order.get("id")); outbox.enqueue("ORDER_CANCELLED",id,"cancelled:"+id,"Quá thời hạn thanh toán");
    }
}
