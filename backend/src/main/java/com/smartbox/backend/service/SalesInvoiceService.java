package com.smartbox.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbox.backend.config.InvoiceShopConfig;
import com.smartbox.backend.exception.ConflictException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.security.CurrentActor;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import static com.smartbox.backend.service.OrderWorkflowService.*;

@Service @RequiredArgsConstructor
public class SalesInvoiceService {
    private final CommerceRepository db;
    private final CurrentActor actors;
    private final CustomerAccountService customers;
    private final InvoiceShopConfig shop;
    private final ObjectMapper json;
    private final TemplateEngine templates;

    private void authorize(Map<String,Object> order){
        var actor=actors.get();actor.requireRoles("customer","super_admin","accountant","support_agent");
        if("customer".equals(actor.role()))actor.requireOwner(uuid(order.get("user_id")));
    }
    @Transactional
    public Map<String,Object> issue(UUID orderId){
        var order=db.order(orderId,false);authorize(order);
        // Serialize issuance with payment/cancellation using the common order-first lock.
        order=db.order(orderId,true);
        var invoices=db.list("SELECT * FROM public.sales_invoices WHERE order_id=?",orderId);
        if(!invoices.isEmpty())return render(invoices.getFirst(),order);
        if(!Set.of("paid","confirmed","completed").contains(order.get("status").toString())||order.get("paid_at")==null)
            throw new ConflictException("INVOICE_REQUIRES_PAID_ORDER: Chỉ lập hóa đơn cho đơn đã thanh toán");
        if(((Number)order.get("workflow_version")).intValue()!=2||order.get("shipping_address_snapshot")==null)
            throw new ConflictException("INVOICE_LEGACY_REVIEW_REQUIRED: Đơn cũ cần xác minh thông tin trước khi lập hóa đơn");
        var payments=db.list("SELECT * FROM public.payments WHERE order_id=? AND status='success' AND amount=? AND paid_at IS NOT NULL ORDER BY paid_at DESC,id LIMIT 1",orderId,order.get("total"));
        if(payments.isEmpty())throw new ConflictException("INVOICE_PAYMENT_MISMATCH: Chưa đối chiếu được thanh toán của đơn");
        var payment=payments.getFirst();
        var rows=db.list("SELECT id,product_name_snapshot,variant_name_snapshot,sku_snapshot,quantity,unit_price FROM public.order_items WHERE order_id=? ORDER BY variant_id,id",orderId);
        if(rows.isEmpty())throw new ConflictException("INVOICE_ITEMS_REQUIRED");
        List<Map<String,Object>> items=new ArrayList<>();BigDecimal subtotal=BigDecimal.ZERO;
        for(var row:rows){
            if(row.get("product_name_snapshot")==null||row.get("sku_snapshot")==null)throw new ConflictException("INVOICE_LEGACY_REVIEW_REQUIRED");
            int quantity=((Number)row.get("quantity")).intValue();BigDecimal price=money(row.get("unit_price")),line=price.multiply(BigDecimal.valueOf(quantity));
            if(quantity<=0||price.signum()<0)throw new ConflictException("INVOICE_INVALID_ITEM");
            subtotal=subtotal.add(line);var item=new LinkedHashMap<String,Object>();
            item.put("name",row.get("product_name_snapshot"));item.put("variant",row.get("variant_name_snapshot"));item.put("sku",row.get("sku_snapshot"));
            item.put("quantity",quantity);item.put("price",formatMoney(price));item.put("subtotal",formatMoney(line));items.add(item);
        }
        if(subtotal.compareTo(money(order.get("total")))!=0)throw new ConflictException("INVOICE_TOTAL_MISMATCH: Tổng đơn cần được đối chiếu");
        String number="SB-"+orderId.toString().toUpperCase(Locale.ROOT);
        OffsetDateTime issued=now();var snapshot=new LinkedHashMap<String,Object>();
        snapshot.put("number",number);snapshot.put("orderId",orderId.toString());snapshot.put("shop",shop.snapshot());
        snapshot.put("customer",customers.readSnapshot(order.get("shipping_address_snapshot")));
        snapshot.put("purchaseDate",formatTime(order.get("created_at")));snapshot.put("paidDate",formatTime(order.get("paid_at")));snapshot.put("issuedDate",formatTime(issued));
        snapshot.put("items",items);snapshot.put("total",formatMoney(subtotal));
        snapshot.put("paymentId",payment.get("id").toString());snapshot.put("paymentMethod",paymentLabel(payment));snapshot.put("transactionRef",Objects.toString(payment.get("transaction_ref"),"—"));
        snapshot.put("simulated","mock".equals(payment.get("provider"))||"sandbox".equals(payment.get("provider_environment")));
        snapshot.put("logo",logo());
        try {db.update("INSERT INTO public.sales_invoices(id,order_id,invoice_number,snapshot,issued_at,issued_by) VALUES(?,?,?,?,?,?)",UUID.randomUUID(),orderId,number,json.writeValueAsString(snapshot),issued,actors.get().id());}
        catch(com.fasterxml.jackson.core.JsonProcessingException ex){throw new IllegalStateException("INVOICE_SNAPSHOT_FAILED",ex);}
        db.audit(actors.get().id(),"SALES_INVOICE_ISSUED","orders",orderId,number);
        return render(db.one("SELECT * FROM public.sales_invoices WHERE order_id=?",orderId),order);
    }
    @Transactional(readOnly=true)
    public Map<String,Object> existing(UUID orderId){var order=db.order(orderId,false);authorize(order);return render(db.one("SELECT * FROM public.sales_invoices WHERE order_id=?",orderId),order);}
    private Map<String,Object> render(Map<String,Object> invoice,Map<String,Object> order){
        Map<String,Object> snapshot;
        try{snapshot=json.readValue(invoice.get("snapshot").toString(),new TypeReference<>(){});}catch(Exception ex){throw new IllegalStateException("INVOICE_SNAPSHOT_INVALID",ex);}
        String notice="";
        if("cancelled".equals(order.get("status").toString()))notice="ĐƠN ĐÃ HỦY — Hóa đơn lưu để đối chiếu lịch sử.";
        var refunds=db.list("SELECT status FROM public.refunds WHERE payment_id=? ORDER BY created_at DESC,id LIMIT 1",uuid(snapshot.get("paymentId")));
        if(!refunds.isEmpty())notice+=" "+("COMPLETED".equals(refunds.getFirst().get("status"))?"Đã ghi nhận đối soát hoàn tiền.":"Đang chờ xử lý hoàn tiền.");
        var context=new Context(Locale.forLanguageTag("vi-VN"));context.setVariable("invoice",snapshot);context.setVariable("notice",notice.trim());
        return Map.of("invoiceNumber",invoice.get("invoice_number"),"orderId",order.get("id"),"issuedAt",time(invoice.get("issued_at")),"html",templates.process("invoice/sales-invoice",context));
    }
    private String paymentLabel(Map<String,Object> payment){
        String provider=Objects.toString(payment.get("provider"),"");
        return switch(provider){case "mock"->"Thanh toán giả lập (Mock)";case "vnpay"->"VNPAY"+("sandbox".equals(payment.get("provider_environment"))?" Sandbox — kiểm thử":"");case "cod"->"Thanh toán khi nhận hàng (COD)";case "bank_transfer"->"Chuyển khoản ngân hàng";case "momo"->"Ví MoMo";default->provider;};
    }
    private String logo(){try(var input=new ClassPathResource("invoice/logo.png").getInputStream()){return "data:image/png;base64,"+Base64.getEncoder().encodeToString(input.readAllBytes());}catch(java.io.IOException ex){throw new IllegalStateException("INVOICE_LOGO_MISSING",ex);}}
    private String formatTime(Object value){return time(value).atZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh")).format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));}
    private String formatMoney(BigDecimal amount){var format=NumberFormat.getNumberInstance(Locale.forLanguageTag("vi-VN"));format.setMaximumFractionDigits(Math.max(0,amount.scale()));return format.format(amount)+" ₫";}
}
