package com.smartbox.backend;

import com.smartbox.backend.dto.request.commerce.CommerceRequests;
import com.smartbox.backend.exception.*;
import com.smartbox.backend.service.commerce.PaymentAuditService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.now;

class PaymentLifecycleTests extends CommerceIntegrationTests {
    @Autowired PaymentAuditService audit;
    @Autowired com.smartbox.backend.service.commerce.CustomerOrderService customerOrders;
    @Autowired com.smartbox.backend.repository.CommerceRepository repository;
    void consistent(UUID order){actors.staff();assertEquals(true,audit.reconcile(order).get("consistent"),()->audit.reconcile(order).toString());actors.customer();}
    CommerceRequests.Callback result(CommerceRequests.Callback event,String result){return new CommerceRequests.Callback(event.paymentId(),event.orderId(),event.amount(),result,payments.sign(event.paymentId(),event.orderId(),event.amount(),result));}
    @Test void failedThenLateSuccessClosesStockAndCreatesOnePendingRefund(){
        UUID id=order(2);var failed=callback(id,"failure-late","FAILED");payments.callback(failed);payments.callback(failed);consistent(id);
        var success=result(failed,"SUCCESS");payments.callback(success);payments.callback(success);payments.callback(failed);
        assertEquals(10,stock());assertEquals(1,count("approval_tickets"));assertEquals(1,count("refunds"));assertEquals("refund_required",jdbc.queryForObject("SELECT status FROM public.payments",String.class));consistent(id);
    }
    @Test void expiredSuccessBeforeSchedulerNeverReopensOrderOrReservesStock(){
        UUID id=order(2);var success=callback(id,"late-before-job","SUCCESS");jdbc.update("UPDATE public.payments SET expires_at=? WHERE id=?",now().minusMinutes(1),success.paymentId());
        payments.callback(success);payments.expire(id);payments.callback(success);assertEquals("cancelled",orders.detail(id).get("status"));assertEquals(10,stock());assertEquals(1,count("refunds"));assertEquals(1,count("approval_tickets"));consistent(id);
    }
    @Test void timeoutAndLateFailureKeepExpiredAndReleaseExactlyOnce(){
        UUID id=order(2);var failure=callback(id,"timeout-failure","FAILED");jdbc.update("UPDATE public.orders SET expires_at=? WHERE id=?",now().minusMinutes(1),id);
        payments.expire(id);payments.expire(id);payments.callback(failure);payments.callback(failure);
        assertEquals("expired",jdbc.queryForObject("SELECT status FROM public.payments",String.class));assertEquals(10,stock());assertEquals(0,count("refunds"));consistent(id);
    }
    @Test void conflictingCallbacksAfterSuccessAndRefundCannotDowngradeFinalStatus(){
        UUID id=order(1);var success=callback(id,"success-first","SUCCESS");payments.callback(success);payments.callback(result(success,"FAILED"));consistent(id);
        actors.staff();orders.cancel(id,"Không thể giao/lắp đặt");actors.customer();payments.callback(success);payments.callback(result(success,"FAILED"));consistent(id);
        actors.staff();UUID refund=jdbc.queryForObject("SELECT id FROM public.refunds",UUID.class);
        assertThrows(BadRequestException.class,()->fulfillment.completeRefund(refund,""));fulfillment.completeRefund(refund,"DEMO-REFUND-1");fulfillment.completeRefund(refund,"DEMO-REFUND-1");
        assertThrows(ConflictException.class,()->fulfillment.completeRefund(refund,"DEMO-REFUND-2"));payments.callback(success);payments.callback(result(success,"FAILED"));consistent(id);
        assertEquals("refunded",jdbc.queryForObject("SELECT status FROM public.payments",String.class));assertEquals(10,stock());assertEquals(1,count("refunds"));
    }
    @Test void cancelledPendingThenSuccessRequiresRefundWithoutReopeningTicket(){
        UUID id=order(2);var success=callback(id,"cancelled-late","SUCCESS");orders.cancel(id,"Không mua nữa");payments.callback(success);consistent(id);
        assertEquals(10,stock());assertEquals(1,count("approval_tickets"));assertEquals("cancelled",orders.detail(id).get("status"));
    }
    @Test void concurrentDuplicateSuccessCreatesExactlyOneTicketAndPaidEmail() throws Exception {
        UUID id=order(1);var event=callback(id,"same-success","SUCCESS");
        try(var pool=Executors.newFixedThreadPool(2)){var barrier=new CyclicBarrier(2);Callable<Object> callback=()->{barrier.await();return payments.callback(event);};var a=pool.submit(callback);var b=pool.submit(callback);a.get(10,TimeUnit.SECONDS);b.get(10,TimeUnit.SECONDS);}
        assertEquals(1,count("approval_tickets"));assertEquals(2,count("ticket_history"));assertEquals(1,count("email_outbox"));assertEquals(4,count("order_status_history"));assertEquals(9,stock());consistent(id);
    }
    @Test void auditDetectsMismatchWithoutRepairingAndIsStaffScoped(){
        UUID id=order(1);var event=callback(id,"audit","SUCCESS");payments.callback(event);assertThrows(ForbiddenException.class,()->audit.reconcile(id));
        jdbc.update("UPDATE public.payments SET amount=amount+1 WHERE id=?",event.paymentId());actors.staff();var result=audit.reconcile(id);assertEquals(false,result.get("consistent"));assertTrue(((List<?>)result.get("issues")).contains("AMOUNT_MISMATCH"));
        assertEquals(event.amount().add(java.math.BigDecimal.ONE).intValue(),jdbc.queryForObject("SELECT amount FROM public.payments WHERE id=?",java.math.BigDecimal.class,event.paymentId()).intValue());
    }
    @Test void checkoutMetadataAndCustomerRefundProjectionAreExplicitlySimulated(){
        UUID id=order(1);approve(id);var checkout=payments.checkout(id,"mode");assertEquals("mock",checkout.get("provider"));assertEquals(true,checkout.get("isSimulated"));assertEquals(false,checkout.get("demoActionsEnabled"));
        var event=callback(id,"mode","SUCCESS");payments.callback(event);actors.staff();orders.cancel(id,"Không thể giao");actors.customer();
        var projection=(Map<?,?>)customerOrders.detail(id).get("payment");assertEquals(true,projection.get("isSimulated"));assertEquals("PENDING",((Map<?,?>)projection.get("refund")).get("status"));assertFalse(((Map<?,?>)projection.get("refund")).containsKey("provider_ref"));
        var payment=jdbc.queryForObject("SELECT status FROM public.payments WHERE order_id=?",String.class,id);assertEquals("refund_required",payment);consistent(id);
    }
    @Test void simulatedCompletionRequiresPaymentOwnerAndCannotReadAnotherCustomer(){
        UUID id=order(1);approve(id);var checkout=payments.checkout(id,"demo-owner");UUID payment=UUID.fromString(checkout.get("paymentId").toString());
        var controller=new com.smartbox.backend.controller.commerce.MockPaymentController(repository,orders,actors,payments);
        actors.staff();assertThrows(ForbiddenException.class,()->controller.detail(payment));assertThrows(ForbiddenException.class,()->controller.complete(payment,"SUCCESS"));
        actors.customer();controller.complete(payment,"SUCCESS");controller.complete(payment,"SUCCESS");assertEquals(1,count("approval_tickets"));assertEquals(1,count("email_outbox"));consistent(id);
    }
}
