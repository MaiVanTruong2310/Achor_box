package com.smartbox.backend.controller.commerce;

import com.smartbox.backend.service.commerce.SalesInvoiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Tag(name = "Sales Invoice API", description = "Quản lý hóa đơn bán hàng điện tử")
public class SalesInvoiceController {

    private final SalesInvoiceService invoices;

    @PostMapping("/api/orders/{id}/sales-invoice")
    @Operation(summary = "Phát hành hóa đơn bán hàng cho đơn hàng đã thanh toán")
    public ResponseEntity<Map<String, Object>> issue(@PathVariable UUID id) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(invoices.issue(id));
    }

    @GetMapping("/api/orders/{id}/sales-invoice")
    @Operation(summary = "Lấy dữ liệu hóa đơn bán hàng hiện có")
    public ResponseEntity<Map<String, Object>> existing(@PathVariable UUID id) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(invoices.existing(id));
    }

    @GetMapping(value = "/api/orders/{id}/sales-invoice.html", produces = "text/html;charset=UTF-8")
    @Operation(summary = "Tải bản in hóa đơn dạng HTML chuẩn bảo mật")
    public ResponseEntity<String> html(@PathVariable UUID id) {
        var invoice = invoices.existing(id);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'")
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + invoice.get("invoiceNumber") + ".html\"")
                .body(invoice.get("html").toString());
    }
}
