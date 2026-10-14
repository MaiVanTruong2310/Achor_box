package com.smartbox.backend.controller;
import com.smartbox.backend.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequiredArgsConstructor
public class PaymentAuditController {
    private final PaymentService payments;
    private final PaymentAuditService audit;
    @GetMapping("/api/payments/mode") public Map<String,Object> mode(){return payments.mode();}
    @GetMapping("/api/orders/{id}/payment-reconciliation") public Map<String,Object> reconcile(@PathVariable UUID id){return audit.reconcile(id);}
}
