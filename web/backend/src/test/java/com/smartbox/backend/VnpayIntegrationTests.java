package com.smartbox.backend;
import com.smartbox.backend.service.admin.*;
import com.smartbox.backend.service.auth.*;
import com.smartbox.backend.service.catalog.*;
import com.smartbox.backend.service.commerce.*;
import com.smartbox.backend.service.customer.*;
import com.smartbox.backend.service.device.*;
import com.smartbox.backend.service.warranty.*;
import com.smartbox.backend.dto.request.commerce.CommerceRequests;
import com.smartbox.backend.exception.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.*;
import org.springframework.util.*;
import java.util.*;
import java.util.concurrent.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import static org.junit.jupiter.api.Assertions.*;

@TestPropertySource(properties={"smartbox.vnpay.tmn-code=TEST1234","smartbox.vnpay.hash-secret=test-vnpay-secret-at-least-thirty-two-characters","smartbox.vnpay.return-url=http://localhost:5174/payments/vnpay/return","smartbox.payment.timeout-minutes=15"})
class VnpayIntegrationTests extends CommerceIntegrationTests {
    @Autowired VnpayGateway gateway;
    @BeforeEach void provider(){ReflectionTestUtils.setField((Object)AopTestUtils.getTargetObject(payments),"provider","mock");}
    void vnpay(){ReflectionTestUtils.setField((Object)AopTestUtils.getTargetObject(payments),"provider","vnpay");}
    UUID checkout(UUID id){approve(id);vnpay();return UUID.fromString(payments.checkout(id,UUID.randomUUID().toString()).get("paymentId").toString());}
    LinkedMultiValueMap<String,String> notification(UUID payment,String response,String status,String transaction){
        var data=new TreeMap<String,String>();data.put("vnp_TmnCode","TEST1234");data.put("vnp_TxnRef",payment.toString().replace("-",""));data.put("vnp_Amount",jdbc.queryForObject("SELECT amount FROM public.payments WHERE id=?",java.math.BigDecimal.class,payment).movePointRight(2).toBigIntegerExact().toString());
        data.put("vnp_ResponseCode",response);data.put("vnp_TransactionStatus",status);data.put("vnp_TransactionNo",transaction);data.put("vnp_PayDate",DateTimeFormatter.ofPattern("uuuuMMddHHmmss").format(OffsetDateTime.now(ZoneOffset.ofHours(7))));
        return signed(data);
    }
    LinkedMultiValueMap<String,String> signed(Map<String,String> data){var result=new LinkedMultiValueMap<String,String>();data.forEach(result::add);result.set("vnp_SecureHash",gateway.signature(data));return result;}
    void code(String expected,MultiValueMap<String,String> data){assertEquals(expected,payments.vnpayIpn(data).get("RspCode"));}
    @Test void checkoutUrlAndOwnerResumeDoNotCreateAnotherPayment(){
        UUID order=order(1);approve(order);vnpay();String key=UUID.randomUUID().toString();var first=payments.checkout(order,key);assertEquals(first,payments.checkout(order,key));assertEquals(first,payments.session(order));assertEquals("sandbox",first.get("environment"));assertEquals(false,first.get("demoActionsEnabled"));assertTrue(first.get("paymentUrl").toString().startsWith("https://sandbox.vnpayment.vn/"));assertEquals(1,count("payments"));
        actors.actor.set(new com.smartbox.backend.security.CurrentActor.Actor(STAFF,"customer"));assertThrows(ForbiddenException.class,()->payments.session(order));
    }
    @Test void validIpnSuccessIsAtomicAndDuplicateIsAcknowledgedOnce(){
        UUID order=order(2),payment=checkout(order);var data=notification(payment,"00","00","111111");code("00",data);code("02",data);
        assertEquals("confirmed",orders.detail(order).get("status"));assertEquals(1,count("approval_tickets"));assertEquals(1,count("payment_provider_notifications"));assertEquals(8,stock());assertEquals("111111",jdbc.queryForObject("SELECT transaction_ref FROM public.payments WHERE id=?",String.class,payment));
    }
    @Test void signatureAmountMerchantAndDuplicateFieldsCannotMutateOrders(){
        UUID order=order(1),payment=checkout(order);var valid=notification(payment,"00","00","222222");
        var bad=new LinkedMultiValueMap<>(valid);bad.set("vnp_Amount","100");assertEquals("97",assertThrows(VnpayGateway.InvalidNotification.class,()->payments.vnpayIpn(bad)).code());
        var fields=new TreeMap<>(valid.toSingleValueMap());fields.remove("vnp_SecureHash");fields.put("vnp_Amount","100");code("04",signed(fields));
        fields.put("vnp_TmnCode","OTHER123");assertEquals("97",assertThrows(VnpayGateway.InvalidNotification.class,()->payments.vnpayIpn(signed(fields))).code());
        var duplicated=new LinkedMultiValueMap<>(valid);duplicated.add("vnp_Amount",valid.getFirst("vnp_Amount"));assertEquals("97",assertThrows(VnpayGateway.InvalidNotification.class,()->payments.vnpayIpn(duplicated)).code());
        assertEquals("awaiting_payment",orders.detail(order).get("status"));assertEquals(1,count("approval_tickets"));assertEquals(0,count("payment_provider_notifications"));assertEquals(9,stock());
    }
    @Test void failureAndLateSuccessReleaseOnceThenRequireRefund(){
        UUID order=order(2),payment=checkout(order);var failed=notification(payment,"24","02","0");code("00",failed);code("02",failed);assertEquals(10,stock());
        code("00",notification(payment,"00","00","333333"));assertEquals("refund_required",jdbc.queryForObject("SELECT status FROM public.payments WHERE id=?",String.class,payment));assertEquals(1,count("refunds"));assertEquals(1,count("approval_tickets"));assertEquals(10,stock());
    }
    @Test void bothSuccessCodesRequiredAndTimeoutDoesNotReopenInventory(){
        UUID order=order(1),payment=checkout(order);code("00",notification(payment,"00","02","0"));assertEquals("cancelled",orders.detail(order).get("status"));assertEquals(10,stock());
        UUID next=order(2),second=checkout(next);jdbc.update("UPDATE public.payments SET expires_at=? WHERE id=?",OffsetDateTime.now().minusMinutes(1),second);code("00",notification(second,"00","00","444444"));assertEquals("cancelled",orders.detail(next).get("status"));assertEquals(10,stock());assertEquals(1,count("refunds"));
    }
    @Test void mockSignatureCannotConfirmVnpayAndReturnVerificationIsReadOnly(){
        UUID order=order(1),payment=checkout(order);var amount=jdbc.queryForObject("SELECT amount FROM public.payments WHERE id=?",java.math.BigDecimal.class,payment);
        assertThrows(ForbiddenException.class,()->payments.callback(new CommerceRequests.Callback(payment,order,amount,"SUCCESS",payments.sign(payment,order,amount,"SUCCESS"))));
        assertTrue(gateway.verify(notification(payment,"00","00","555555")).success());assertEquals("awaiting_payment",orders.detail(order).get("status"));assertEquals(0,count("payment_provider_notifications"));
    }
    @Test void concurrentDuplicateIpnsProduceOneTicketAndNotification()throws Exception {
        UUID order=order(1),payment=checkout(order);var data=notification(payment,"00","00","666666");
        try(var pool=Executors.newFixedThreadPool(2)){var barrier=new CyclicBarrier(2);Callable<String> task=()->{barrier.await();return payments.vnpayIpn(data).get("RspCode");};var first=pool.submit(task);var second=pool.submit(task);assertEquals(Set.of("00","02"),Set.of(first.get(10,TimeUnit.SECONDS),second.get(10,TimeUnit.SECONDS)));}
        assertEquals(1,count("approval_tickets"));assertEquals(1,count("payment_provider_notifications"));assertEquals(9,stock());
    }
}
