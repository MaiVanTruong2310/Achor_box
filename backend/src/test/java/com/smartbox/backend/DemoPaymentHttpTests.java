package com.smartbox.backend;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.http.HttpMethod;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ActiveProfiles("demo")
class DemoPaymentHttpTests extends BackendApplicationTests {
    @Test void demoAliasUsesAuthenticatedOwnerAndReturnsServerMode(){
        var mode=call("/api/payments/mode",HttpMethod.GET,null,null,null,null);assertEquals(200,mode.getStatusCode().value());assertEquals(true,mode.getBody().get("isSimulated"));assertEquals(true,mode.getBody().get("demoActionsEnabled"));
        UUID customer=profile("customer"),other=profile("customer");when(identity.identity("demo-customer")).thenReturn(customer);when(identity.identity("demo-other")).thenReturn(other);
        var product=products.saveAndFlush(com.smartbox.backend.entity.Product.builder().sku("DEMO-"+UUID.randomUUID()).name("Thiết bị demo HTTP").price(java.math.BigDecimal.valueOf(1000)).images("[]").isActive(true).build());
        UUID variant=UUID.randomUUID();jdbc.update("INSERT INTO public.product_variants(id,product_id,variant_name,sku,price_delta,stock_quantity) VALUES(?,?,'Demo',?,0,2)",variant,product.getId(),"DEMO-V-"+variant);
        var created=call("/api/orders",HttpMethod.POST,"demo-customer",Map.of("shippingAddress","Địa chỉ demo","items",List.of(Map.of("variantId",variant.toString(),"quantity",1))),null,null);assertEquals(201,created.getStatusCode().value());String id=created.getBody().get("id").toString();
        var checkout=call("/api/orders/"+id+"/checkout",HttpMethod.POST,"demo-customer",null,UUID.randomUUID().toString(),null);assertEquals(true,checkout.getBody().get("isSimulated"));String payment=checkout.getBody().get("paymentId").toString();String path="/api/mock-payment/payments/"+payment+"/complete?result=SUCCESS";
        assertEquals(401,call(path,HttpMethod.POST,null,null,null,null).getStatusCode().value());assertEquals(403,call(path,HttpMethod.POST,"demo-other",null,null,null).getStatusCode().value());
        assertEquals(200,call(path,HttpMethod.POST,"demo-customer",null,null,null).getStatusCode().value());assertEquals(200,call(path,HttpMethod.POST,"demo-customer",null,null,null).getStatusCode().value());
        assertEquals("paid",jdbc.queryForObject("SELECT status FROM public.orders WHERE id=?",String.class,UUID.fromString(id)));assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM public.approval_tickets WHERE order_id=?",Integer.class,UUID.fromString(id)));
        var detail=call("/api/customer/orders/"+id,HttpMethod.GET,"demo-customer",null,null,null).getBody();assertEquals("success",((Map<?,?>)detail.get("payment")).get("status"));
    }
}
