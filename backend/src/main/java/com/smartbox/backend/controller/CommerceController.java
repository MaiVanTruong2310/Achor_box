package com.smartbox.backend.controller;

import com.smartbox.backend.dto.request.CommerceRequests;
import com.smartbox.backend.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequiredArgsConstructor
public class CommerceController {
    private final OrderWorkflowService orders;
    private final PaymentService payments;
    private final ApprovalTicketService tickets;
    private final FulfillmentService fulfillment;
    private final OutboxService outbox;

    @PostMapping("/api/orders")
    public ResponseEntity<Map<String,Object>> create(@Valid @RequestBody CommerceRequests.CreateOrder request) {return ResponseEntity.status(201).body(orders.create(request));}
    @GetMapping("/api/orders/{id}")
    public Map<String,Object> detail(@PathVariable UUID id) {return orders.detail(id);}
    @GetMapping("/api/orders/my-orders")
    public List<Map<String,Object>> mine(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {return orders.mine(page,size);}
    @GetMapping("/api/orders/{id}/history")
    public List<Map<String,Object>> history(@PathVariable UUID id) {return orders.history(id);}
    @PostMapping("/api/orders/{id}/items")
    public Map<String,Object> add(@PathVariable UUID id,@Valid @RequestBody CommerceRequests.Item item) {return orders.add(id,item.variantId(),item.quantity());}
    @PatchMapping("/api/orders/{id}/items/{variantId}")
    public Map<String,Object> quantity(@PathVariable UUID id,@PathVariable UUID variantId,@Valid @RequestBody CommerceRequests.Quantity request) {return orders.setQuantity(id,variantId,request.quantity());}
    @DeleteMapping("/api/orders/{id}/items/{variantId}")
    public Map<String,Object> remove(@PathVariable UUID id,@PathVariable UUID variantId) {return orders.remove(id,variantId);}
    @PostMapping("/api/orders/{id}/checkout")
    public Map<String,Object> checkout(@PathVariable UUID id,@RequestHeader(value="Idempotency-Key",required=false) String key) {return payments.checkout(id,key);}
    @GetMapping("/api/orders/{id}/payment-session") public Map<String,Object> paymentSession(@PathVariable UUID id){return payments.session(id);}
    @PostMapping("/api/orders/{id}/cancel")
    public Map<String,Object> cancel(@PathVariable UUID id,@Valid @RequestBody CommerceRequests.Reason request) {return orders.cancel(id,request.reason());}
    @PostMapping("/api/payments/callback")
    public Map<String,Object> callback(@Valid @RequestBody CommerceRequests.Callback request) {return payments.callback(request);}
    @GetMapping("/api/tickets")
    public List<Map<String,Object>> tickets(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {return tickets.list(page,size);}
    @GetMapping("/api/tickets/{id}")
    public Map<String,Object> ticket(@PathVariable UUID id) {return tickets.detail(id);}
    @PostMapping("/api/tickets/{id}/approve")
    public Map<String,Object> approve(@PathVariable UUID id) {return tickets.act(id,"APPROVE",null);}
    @PostMapping("/api/tickets/{id}/return")
    public Map<String,Object> returnTicket(@PathVariable UUID id,@Valid @RequestBody CommerceRequests.Reason request) {return tickets.act(id,"RETURN",request.reason());}
    @PostMapping("/api/tickets/{id}/resubmit")
    public Map<String,Object> resubmit(@PathVariable UUID id,@Valid @RequestBody CommerceRequests.Reason request) {return tickets.act(id,"RESUBMIT",request.reason());}
    @PostMapping("/api/tickets/{id}/reject")
    public Map<String,Object> reject(@PathVariable UUID id,@Valid @RequestBody CommerceRequests.Reason request) {return tickets.act(id,"REJECT",request.reason());}
    @PostMapping("/api/orders/{id}/shipment/ship")
    public Map<String,Object> ship(@PathVariable UUID id,@Valid @RequestBody CommerceRequests.Shipment request) {return fulfillment.ship(id,request);}
    @PostMapping("/api/orders/{id}/shipment/deliver")
    public Map<String,Object> deliver(@PathVariable UUID id) {return fulfillment.delivered(id);}
    @PostMapping("/api/orders/{id}/devices")
    public Map<String,Object> assign(@PathVariable UUID id,@Valid @RequestBody CommerceRequests.DeviceAssignment request) {fulfillment.assign(id,request);return Map.of("assigned",true);}
    @GetMapping("/api/admin/refunds")
    public List<Map<String,Object>> refunds(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {return fulfillment.refunds(page,size);}
    @PostMapping("/api/admin/refunds/{id}/complete")
    public Map<String,Object> refund(@PathVariable UUID id,@Valid @RequestBody CommerceRequests.RefundCompletion request) {fulfillment.completeRefund(id,request.providerRef());return Map.of("completed",true);}
    @GetMapping("/api/admin/emails")
    public Map<String,Object> emails(@RequestParam(defaultValue="FAILED") String status,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {return outbox.list(status,page,size);}
    @PostMapping("/api/admin/emails/{id}/resend")
    public Map<String,Object> resend(@PathVariable UUID id) {outbox.resend(id);return Map.of("queued",true);}
}
