package com.smartbox.backend.controller;
import com.smartbox.backend.service.CustomerOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequestMapping("/api/customer/orders") @RequiredArgsConstructor
public class CustomerOrderController {
    private final CustomerOrderService orders;
    @GetMapping public Map<String,Object> list(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return orders.list(page,size);}
    @GetMapping("/{id}") public Map<String,Object> detail(@PathVariable UUID id){return orders.detail(id);}
    @GetMapping("/by-payment/{paymentId}") public Map<String,Object> paymentOrder(@PathVariable UUID paymentId){return orders.paymentOrder(paymentId);}
}
