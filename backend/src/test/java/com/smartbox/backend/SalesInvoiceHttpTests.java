package com.smartbox.backend;

import com.smartbox.backend.config.InvoiceShopConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.test.context.TestPropertySource;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@TestPropertySource(properties={"smartbox.invoice.shop.name=SmartBox Test Store","smartbox.invoice.shop.address=Địa chỉ cửa hàng kiểm thử","smartbox.invoice.shop.phone=0900000000","smartbox.invoice.shop.email=shop@smartbox.test","smartbox.invoice.shop.website=https://smartbox.test","smartbox.invoice.shop.tax-code=TEST-ONLY"})
class SalesInvoiceHttpTests extends BackendApplicationTests {
    @Autowired InvoiceShopConfig shop;
    @Override protected ResponseEntity<Map> call(String path,HttpMethod method,String token,Object body,String key,String version){
        var headers=new HttpHeaders();headers.setContentType(MediaType.APPLICATION_JSON);if(token!=null)headers.setBearerAuth(token);if(key!=null)headers.set("Idempotency-Key",key);if(version!=null)headers.set("If-Match",version);
        return http.exchange(java.net.URI.create(http.getRootUri()+path),method,new HttpEntity<>(body,headers),Map.class);
    }
    record Fixture(UUID order,UUID owner,UUID product,UUID payment){}
    Fixture order(boolean paid){return order(paid,true);}
    Fixture order(boolean paid,boolean malicious){
        var owner=profile("customer");when(identity.identity("invoice-owner")).thenReturn(owner);
        var product=UUID.randomUUID();var base=UUID.randomUUID();var pro=UUID.randomUUID();
        jdbc.update("INSERT INTO public.products(id,sku,name,price) VALUES(?,?,?,1000000)",product,"INV-P-"+product,malicious?"SmartBox <script>alert(1)</script>":"SmartBox");
        for(var variant:List.of(base,pro))jdbc.update("INSERT INTO public.product_variants(id,product_id,variant_name,sku,price_delta,stock_quantity) VALUES(?,?,?,?,?,10)",variant,product,variant.equals(base)?"Base 60L":"Pro 85L","INV-"+variant,variant.equals(base)?0:200000);
        var created=call("/api/orders",HttpMethod.POST,"invoice-owner",Map.of("shippingDetails",Map.of("label","Nhà","recipientName",malicious?"Khách <img src=x onerror=alert(1)>":"Nguyễn Văn A (kiểm thử)","phone","0900000001","addressLine","Địa chỉ giao kiểm thử","isDefault",false),"items",List.of(Map.of("variantId",base,"quantity",2),Map.of("variantId",pro,"quantity",1))),null,null);
        assertEquals(201,created.getStatusCode().value());var id=UUID.fromString(created.getBody().get("id").toString());
        if(!paid)return new Fixture(id,owner,product,null);
        var session=call("/api/orders/"+id+"/checkout",HttpMethod.POST,"invoice-owner",null,UUID.randomUUID().toString(),null).getBody();
        var payment=UUID.fromString(session.get("paymentId").toString());var amount=new java.math.BigDecimal(session.get("amount").toString());
        assertEquals(200,call("/api/payments/callback",HttpMethod.POST,null,Map.of("paymentId",payment,"orderId",id,"amount",amount,"result","SUCCESS","signature",payments.sign(payment,id,amount,"SUCCESS")),null,null).getStatusCode().value());
        return new Fixture(id,owner,product,payment);
    }
    @Test void invoiceRequiresPaymentOwnerOrAuthorizedStaff(){
        var f=order(false);String path="/api/orders/"+f.order+"/sales-invoice";
        assertEquals(401,call(path,HttpMethod.POST,null,null,null,null).getStatusCode().value());
        assertEquals(409,call(path,HttpMethod.POST,"invoice-owner",null,null,null).getStatusCode().value());
        when(identity.identity("invoice-other")).thenReturn(profile("customer"));when(identity.identity("invoice-product-manager")).thenReturn(profile("product_manager"));
        assertEquals(403,call(path,HttpMethod.POST,"invoice-other",null,null,null).getStatusCode().value());
        assertEquals(409,call(path,HttpMethod.POST,"invoice-product-manager",null,null,null).getStatusCode().value());
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM public.sales_invoices WHERE order_id=?",Integer.class,f.order));
    }
    @Test void concurrentFirstIssueCreatesOneInvoiceAndCancelledOrderCannotBeIssued() throws Exception {
        var f=order(true,false);String path="/api/orders/"+f.order+"/sales-invoice";
        var pool=Executors.newFixedThreadPool(8);var gate=new CountDownLatch(1);
        try {
            var tasks=new ArrayList<Future<ResponseEntity<Map>>>();for(int i=0;i<8;i++)tasks.add(pool.submit(()->{gate.await();return call(path,HttpMethod.POST,"invoice-owner",null,null,null);}));
            gate.countDown();Set<String> numbers=new HashSet<>();
            for(var task:tasks){var result=task.get(10,TimeUnit.SECONDS);assertEquals(200,result.getStatusCode().value());numbers.add(result.getBody().get("invoiceNumber").toString());}
            assertEquals(1,numbers.size());
        }finally{pool.shutdownNow();}
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM public.sales_invoices WHERE order_id=?",Integer.class,f.order));
        var sample=call(path,HttpMethod.GET,"invoice-owner",null,null,null).getBody().get("html").toString();
        var output=Path.of("build/audit/sales-invoice-example.html");Files.createDirectories(output.getParent());Files.writeString(output,sample);
        var cancelled=order(true,false);when(identity.identity("cancel-invoice-staff")).thenReturn(profile("super_admin"));
        assertEquals(200,call("/api/orders/"+cancelled.order+"/cancel",HttpMethod.POST,"cancel-invoice-staff",Map.of("reason","Cancelled before invoice"),null,null).getStatusCode().value());
        assertEquals(409,call("/api/orders/"+cancelled.order+"/sales-invoice",HttpMethod.POST,"invoice-owner",null,null,null).getStatusCode().value());
    }
    @Test void invoiceSnapshotsEscapeInputsAreIdempotentAndShowCancellation() throws Exception {
        var f=order(true);String path="/api/orders/"+f.order+"/sales-invoice";
        var first=call(path,HttpMethod.POST,"invoice-owner",null,null,null);assertEquals(200,first.getStatusCode().value());assertEquals("no-store",first.getHeaders().getFirst("Cache-Control"));
        String html=first.getBody().get("html").toString();
        assertTrue(html.contains("SmartBox Test Store"));assertTrue(html.contains("data:image/png;base64,"));assertTrue(html.contains("Base 60L"));assertTrue(html.contains("Pro 85L"));assertTrue(html.contains("3.200.000 ₫"));assertTrue(html.contains("BẢN KIỂM THỬ"));
        assertFalse(html.contains("<script>"));assertFalse(html.contains("<img src=x"));assertTrue(html.contains("&lt;script&gt;"));assertTrue(html.contains("&lt;img"));
        assertTrue(html.contains("Địa chỉ giao kiểm thử"));assertTrue(html.contains("TEST-ONLY"));assertTrue(html.contains("Không phải hóa đơn điện tử VAT"));
        assertTrue(html.contains("thead{display:table-header-group}"));
        var output=Path.of("build/audit/sales-invoice-security-example.html");Files.createDirectories(output.getParent());Files.writeString(output,html);
        var pool=Executors.newFixedThreadPool(8);
        try {
            var tasks=new ArrayList<Future<ResponseEntity<Map>>>();for(int i=0;i<8;i++)tasks.add(pool.submit(()->call(path,HttpMethod.POST,"invoice-owner",null,null,null)));
            for(var task:tasks){var result=task.get(10,TimeUnit.SECONDS);assertEquals(200,result.getStatusCode().value());assertEquals(first.getBody().get("invoiceNumber"),result.getBody().get("invoiceNumber"));}
        }finally{pool.shutdownNow();}
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM public.sales_invoices WHERE order_id=?",Integer.class,f.order));
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM public.audit_logs WHERE target_id=? AND action='SALES_INVOICE_ISSUED'",Integer.class,f.order));
        String oldName=shop.getName();shop.setName("Changed shop");
        try {jdbc.update("UPDATE public.products SET name='Changed catalog' WHERE id=?",f.product);jdbc.update("UPDATE public.profiles SET full_name='Changed profile' WHERE id=?",f.owner);
            var next=call(path,HttpMethod.POST,"invoice-owner",null,null,null);assertEquals(html,next.getBody().get("html"));
        }finally{shop.setName(oldName);}
        when(identity.identity("invoice-staff")).thenReturn(profile("super_admin"));when(identity.identity("invoice-accountant")).thenReturn(profile("product_manager"));when(identity.identity("invoice-support")).thenReturn(profile("product_manager"));
        for(String token:List.of("invoice-staff","invoice-accountant","invoice-support"))assertEquals(200,call(path,HttpMethod.GET,token,null,null,null).getStatusCode().value());
        var headers=new HttpHeaders();headers.setBearerAuth("invoice-owner");
        var file=http.exchange(path+".html",HttpMethod.GET,new HttpEntity<>(headers),String.class);assertEquals(200,file.getStatusCode().value());assertTrue(file.getHeaders().getContentType().isCompatibleWith(MediaType.TEXT_HTML));assertTrue(file.getHeaders().getFirst("Content-Security-Policy").contains("default-src 'none'"));assertTrue(file.getHeaders().getFirst("Content-Disposition").endsWith(".html\""));
        assertThrows(org.springframework.dao.DataAccessException.class,()->jdbc.update("UPDATE public.sales_invoices SET invoice_number='modified' WHERE order_id=?",f.order));
        assertEquals(200,call("/api/orders/"+f.order+"/cancel",HttpMethod.POST,"invoice-staff",Map.of("reason","Invoice cancellation test"),null,null).getStatusCode().value());
        var cancelled=call(path,HttpMethod.POST,"invoice-owner",null,null,null);assertEquals(200,cancelled.getStatusCode().value());assertTrue(cancelled.getBody().get("html").toString().contains("ĐƠN ĐÃ HỦY"));assertTrue(cancelled.getBody().get("html").toString().contains("chờ xử lý hoàn tiền"));
        assertEquals(first.getBody().get("invoiceNumber"),cancelled.getBody().get("invoiceNumber"));
        when(identity.identity("invoice-other-owner")).thenReturn(profile("customer"));assertEquals(403,call(path,HttpMethod.GET,"invoice-other-owner",null,null,null).getStatusCode().value());
        headers.setBearerAuth("invoice-other-owner");assertEquals(403,http.exchange(path+".html",HttpMethod.GET,new HttpEntity<>(headers),String.class).getStatusCode().value());
    }
}
