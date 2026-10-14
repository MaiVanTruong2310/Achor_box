package com.smartbox.backend.controller;
import com.smartbox.backend.dto.request.AdminSettingsRequests.*;
import com.smartbox.backend.service.AdminSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.*;

@RestController @RequestMapping("/api/settings") @RequiredArgsConstructor
public class AdminSettingsController {
    private final AdminSettingsService settings;
    @GetMapping({"/categories","/payment-methods","/shipping-methods"})
    public List<Map<String,Object>> list(jakarta.servlet.http.HttpServletRequest request) { return settings.list(request.getRequestURI().substring(request.getRequestURI().lastIndexOf('/')+1)); }
    @PostMapping("/categories") public Map<String,Object> createCategory(@Valid @RequestBody Category request){return settings.category(null,request);}
    @PutMapping("/categories/{id}") public Map<String,Object> updateCategory(@PathVariable UUID id,@Valid @RequestBody Category request){return settings.category(id,request);}
    @PostMapping("/payment-methods") public Map<String,Object> createPayment(@Valid @RequestBody Payment request){return settings.payment(null,request);}
    @PutMapping("/payment-methods/{id}") public Map<String,Object> updatePayment(@PathVariable UUID id,@Valid @RequestBody Payment request){return settings.payment(id,request);}
    @PostMapping("/shipping-methods") public Map<String,Object> createShipping(@Valid @RequestBody Shipping request){return settings.shipping(null,request);}
    @PutMapping("/shipping-methods/{id}") public Map<String,Object> updateShipping(@PathVariable UUID id,@Valid @RequestBody Shipping request){return settings.shipping(id,request);}
    @DeleteMapping("/{kind:categories|payment-methods|shipping-methods}/{id}")
    public ResponseEntity<Void> delete(@PathVariable String kind,@PathVariable UUID id){settings.delete(kind,id);return ResponseEntity.noContent().build();}
}
