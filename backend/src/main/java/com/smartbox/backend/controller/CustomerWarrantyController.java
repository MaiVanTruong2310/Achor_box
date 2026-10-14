package com.smartbox.backend.controller;
import com.smartbox.backend.service.AcceptanceWarrantyService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController @RequiredArgsConstructor
public class CustomerWarrantyController {
    private final AcceptanceWarrantyService warranties;
    private final com.smartbox.backend.service.CustomerWarrantyClaimService claims;
    @GetMapping("/api/customer/warranties") public Map<String,Object> mine(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return warranties.mine(page,size);}
    @PostMapping(value="/api/customer/warranties/{id}/images",consumes="multipart/form-data")
    public Map<String,Object> upload(@PathVariable java.util.UUID id,@RequestPart("file") org.springframework.web.multipart.MultipartFile file){return claims.upload(id,file);}
    @PostMapping("/api/customer/warranty-claims")
    public Map<String,Object> create(@jakarta.validation.Valid @RequestBody com.smartbox.backend.dto.request.CustomerClaimRequest request,@RequestHeader("Idempotency-Key") java.util.UUID key){return claims.create(request,key);}
    @GetMapping("/api/customer/warranty-claims") public Map<String,Object> list(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return claims.list(page,size);}
    @GetMapping("/api/customer/warranty-claims/{id}") public Map<String,Object> detail(@PathVariable java.util.UUID id){return claims.detail(id);}
}
