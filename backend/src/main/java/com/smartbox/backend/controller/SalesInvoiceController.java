package com.smartbox.backend.controller;

import com.smartbox.backend.service.SalesInvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequiredArgsConstructor
public class SalesInvoiceController {
    private final SalesInvoiceService invoices;
    @PostMapping("/api/orders/{id}/sales-invoice")
    public ResponseEntity<Map<String,Object>> issue(@PathVariable UUID id){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(invoices.issue(id));}
    @GetMapping("/api/orders/{id}/sales-invoice")
    public ResponseEntity<Map<String,Object>> existing(@PathVariable UUID id){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(invoices.existing(id));}
    @GetMapping(value="/api/orders/{id}/sales-invoice.html",produces="text/html;charset=UTF-8")
    public ResponseEntity<String> html(@PathVariable UUID id){
        var invoice=invoices.existing(id);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff")
            .header("Content-Security-Policy","default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'")
            .header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\""+invoice.get("invoiceNumber")+".html\"")
            .body(invoice.get("html").toString());
    }
}
