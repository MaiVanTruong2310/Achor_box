package com.smartbox.backend.controller;

import com.smartbox.backend.dto.request.DeliveryInstallationRequests.*;
import com.smartbox.backend.service.DeliveryInstallationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequiredArgsConstructor
public class DeliveryInstallationController {
    private final DeliveryInstallationService jobs;
    @PostMapping("/api/orders/{id}/delivery-installation")
    public ResponseEntity<Map<String,Object>> assign(@PathVariable UUID id,@Valid @RequestBody Assignment request,
        @RequestHeader(value="Idempotency-Key",required=false) UUID key) {
        return ResponseEntity.status(201).body(jobs.assign(id,request,key));
    }
    @GetMapping("/api/orders/{id}/delivery-installation")
    public Map<String,Object> forOrder(@PathVariable UUID id){return jobs.forOrder(id);}
    @GetMapping("/api/delivery-installations/eligible-orders")
    public Map<String,Object> eligible(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return jobs.eligible(page,size);}
    @GetMapping("/api/delivery-installations/technicians")
    public List<Map<String,Object>> technicians(){return jobs.technicians();}
    @GetMapping("/api/delivery-installations/my-jobs")
    public Map<String,Object> mine(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,@RequestParam(required=false) String status){return jobs.list(true,page,size,status);}
    @GetMapping("/api/delivery-installations")
    public Map<String,Object> all(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,@RequestParam(required=false) String status){return jobs.list(false,page,size,status);}
    @GetMapping("/api/delivery-installations/{id}")
    public Map<String,Object> detail(@PathVariable UUID id){return jobs.detail(id);}
    @GetMapping("/api/delivery-installations/{id}/checks")
    public Map<String,Object> checks(@PathVariable UUID id){return jobs.checks(id);}
    @PostMapping("/api/delivery-installations/{id}/start")
    public Map<String,Object> start(@PathVariable UUID id,@RequestHeader(value="If-Match",required=false) String version,@RequestHeader(value="Idempotency-Key",required=false) UUID key){return jobs.progress(id,"START",new Note(null),version,key);}
    @PostMapping("/api/delivery-installations/{id}/confirm-delivery")
    public Map<String,Object> delivery(@PathVariable UUID id,@Valid @RequestBody Note request,@RequestHeader(value="If-Match",required=false) String version,@RequestHeader(value="Idempotency-Key",required=false) UUID key){return jobs.progress(id,"DELIVER",request,version,key);}
    @PostMapping("/api/delivery-installations/{id}/devices")
    public Map<String,Object> serial(@PathVariable UUID id,@Valid @RequestBody Serial request,@RequestHeader(value="If-Match",required=false) String version,@RequestHeader(value="Idempotency-Key",required=false) UUID key){return jobs.serial(id,request,version,key);}
    @PostMapping("/api/delivery-installations/{id}/checks/commands")
    public ResponseEntity<Map<String,Object>> command(@PathVariable UUID id,@Valid @RequestBody Command request,@RequestHeader(value="If-Match",required=false) String version,@RequestHeader(value="Idempotency-Key",required=false) UUID key){return ResponseEntity.accepted().body(jobs.command(id,request,version,key));}
    @PostMapping("/api/delivery-installations/{id}/confirm-installation")
    public Map<String,Object> installation(@PathVariable UUID id,@Valid @RequestBody Installation request,@RequestHeader(value="If-Match",required=false) String version,@RequestHeader(value="Idempotency-Key",required=false) UUID key){return jobs.progress(id,"INSTALL",request,version,key);}
    @PostMapping("/api/delivery-installations/{id}/acceptance")
    public Map<String,Object> acceptance(@PathVariable UUID id,@Valid @RequestBody Acceptance request,@RequestHeader(value="If-Match",required=false) String version,@RequestHeader(value="Idempotency-Key",required=false) UUID key){return jobs.progress(id,"ACCEPT",request,version,key);}
    @PostMapping("/api/delivery-installations/{id}/fail")
    public Map<String,Object> fail(@PathVariable UUID id,@Valid @RequestBody Failure request,@RequestHeader(value="If-Match",required=false) String version,@RequestHeader(value="Idempotency-Key",required=false) UUID key){return jobs.progress(id,"FAIL",request,version,key);}
    @PostMapping("/api/delivery-installations/{id}/reassign")
    public Map<String,Object> reassign(@PathVariable UUID id,@Valid @RequestBody Reassignment request,@RequestHeader(value="If-Match",required=false) String version,@RequestHeader(value="Idempotency-Key",required=false) UUID key){return jobs.progress(id,"REASSIGN",request,version,key);}
}
