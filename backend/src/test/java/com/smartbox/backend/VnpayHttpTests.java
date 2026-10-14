package com.smartbox.backend;
import com.smartbox.backend.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.*;
import org.springframework.test.util.*;
import org.springframework.http.*;
import java.util.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ActiveProfiles("demo")
@TestPropertySource(properties={"smartbox.vnpay.tmn-code=TEST1234","smartbox.vnpay.hash-secret=test-vnpay-secret-at-least-thirty-two-characters","smartbox.vnpay.return-url=http://localhost:5174/payments/vnpay/return","smartbox.payment.timeout-minutes=15"})
class VnpayHttpTests extends BackendApplicationTests {
    @Autowired VnpayGateway gateway;
    @BeforeEach void provider(){ReflectionTestUtils.setField((Object)AopTestUtils.getTargetObject(payments),"provider","mock");}
    void activate(){ReflectionTestUtils.setField((Object)AopTestUtils.getTargetObject(payments),"provider","vnpay");}
    @Override protected ResponseEntity<Map> call(String path,HttpMethod method,String token,Object body,String key,String version){
        var headers=new HttpHeaders();headers.setContentType(MediaType.APPLICATION_JSON);if(token!=null)headers.setBearerAuth(token);if(key!=null)headers.set("Idempotency-Key",key);if(version!=null)headers.set("If-Match",version);
        return http.exchange(java.net.URI.create(http.getRootUri()+path),method,new HttpEntity<>(body,headers),Map.class);
    }
    Map checkout(){
        UUID owner=profile("customer"),other=profile("customer");when(identity.identity("vnpay-owner")).thenReturn(owner);when(identity.identity("vnpay-other")).thenReturn(other);
        UUID product=UUID.randomUUID(),variant=UUID.randomUUID();jdbc.update("INSERT INTO public.products(id,sku,name,price) VALUES(?,?,?,10000)",product,"VNP-P-"+product,"VNPAY test product");
        jdbc.update("INSERT INTO public.product_variants(id,product_id,variant_name,sku,price_delta,stock_quantity) VALUES(?,?,'M',?,0,5)",variant,product,"VNP-V-"+variant);
        var created=call("/api/orders",HttpMethod.POST,"vnpay-owner",Map.of("shippingAddress","Địa chỉ kiểm thử VNPAY","items",List.of(Map.of("variantId",variant,"quantity",1))),null,null);assertEquals(201,created.getStatusCode().value());
        activate();var response=call("/api/orders/"+created.getBody().get("id")+"/checkout",HttpMethod.POST,"vnpay-owner",null,UUID.randomUUID().toString(),null);assertEquals(200,response.getStatusCode().value());return response.getBody();
    }
    Map<String,String> notification(Map session){
        var fields=new TreeMap<String,String>();fields.put("vnp_TmnCode","TEST1234");fields.put("vnp_TxnRef",session.get("paymentId").toString().replace("-",""));fields.put("vnp_Amount","1000000");fields.put("vnp_ResponseCode","00");fields.put("vnp_TransactionStatus","00");
        fields.put("vnp_BankCode","NCB");fields.put("vnp_OrderInfo","Thanh toan SmartBox");fields.put("vnp_TransactionNo",Long.toString(Math.floorMod(System.nanoTime(),100000000000000L)+1));fields.put("vnp_PayDate",DateTimeFormatter.ofPattern("uuuuMMddHHmmss").format(OffsetDateTime.now(ZoneOffset.ofHours(7))));return fields;
    }
    String query(Map<String,String> fields){return VnpayGateway.canonical(fields)+"&vnp_SecureHash="+gateway.signature(fields);}
    ResponseEntity<Map> ipn(Map<String,String> fields){return call("/api/payments/vnpay/ipn?"+query(fields),HttpMethod.GET,null,null,null,null);}
    @Test void returnIsReadOnlyIpnIsPublicAndOwnerProjectionUsesSandbox(){
        var session=checkout();String order=session.get("orderId").toString(),payment=session.get("paymentId").toString();var fields=notification(session);
        assertEquals("sandbox",session.get("environment"));assertEquals(false,session.get("demoActionsEnabled"));
        assertEquals(200,call("/api/payments/vnpay/return?"+query(fields),HttpMethod.GET,null,null,null,null).getStatusCode().value());
        assertEquals("awaiting_payment",jdbc.queryForObject("SELECT status FROM public.orders WHERE id=?",String.class,UUID.fromString(order)));
        assertEquals(403,call("/api/mock-payment/payments/"+payment+"/complete?result=SUCCESS",HttpMethod.POST,"vnpay-owner",null,null,null).getStatusCode().value());
        assertEquals(403,call("/api/orders/"+order+"/payment-session",HttpMethod.GET,"vnpay-other",null,null,null).getStatusCode().value());
        var first=ipn(fields);assertEquals(200,first.getStatusCode().value());assertEquals("00",first.getBody().get("RspCode"));assertEquals("02",ipn(fields).getBody().get("RspCode"));
        var view=call("/api/customer/orders/by-payment/"+payment,HttpMethod.GET,"vnpay-owner",null,null,null);assertEquals(200,view.getStatusCode().value());assertEquals("sandbox",((Map<?,?>)view.getBody().get("payment")).get("environment"));assertEquals(true,((Map<?,?>)view.getBody().get("payment")).get("isSimulated"));
        assertEquals(404,call("/api/customer/orders/by-payment/"+payment,HttpMethod.GET,"vnpay-other",null,null,null).getStatusCode().value());
    }
    @Test void protocolReturns97ForSignature04ForAmount01ForUnknownAnd99OnRollback(){
        var session=checkout();var fields=notification(session);String order=session.get("orderId").toString();
        assertEquals("97",call("/api/payments/vnpay/ipn?"+VnpayGateway.canonical(fields)+"&vnp_SecureHash="+"0".repeat(128),HttpMethod.GET,null,null,null,null).getBody().get("RspCode"));
        var changed=new TreeMap<>(fields);changed.put("vnp_Amount","100");assertEquals("04",ipn(changed).getBody().get("RspCode"));
        changed=new TreeMap<>(fields);changed.put("vnp_TxnRef",UUID.randomUUID().toString().replace("-",""));assertEquals("01",ipn(changed).getBody().get("RspCode"));
        assertEquals("97",call("/api/payments/vnpay/ipn?"+query(fields)+"&vnp_Amount=1000000",HttpMethod.GET,null,null,null,null).getBody().get("RspCode"));
        jdbc.execute("ALTER TABLE public.payment_provider_notifications ADD CONSTRAINT test_vnpay_rollback CHECK (response_code<>'00')");
        try{
            assertEquals("99",ipn(fields).getBody().get("RspCode"));assertEquals("awaiting_payment",jdbc.queryForObject("SELECT status FROM public.orders WHERE id=?",String.class,UUID.fromString(order)));
            assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM public.approval_tickets WHERE order_id=?",Integer.class,UUID.fromString(order)));
            assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM public.payment_provider_notifications WHERE payment_id=?",Integer.class,UUID.fromString(session.get("paymentId").toString())));
        }finally{jdbc.execute("ALTER TABLE public.payment_provider_notifications DROP CONSTRAINT test_vnpay_rollback");}
        assertEquals("00",ipn(fields).getBody().get("RspCode"));
    }
}
