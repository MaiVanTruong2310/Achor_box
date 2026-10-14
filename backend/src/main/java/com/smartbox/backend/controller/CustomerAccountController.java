package com.smartbox.backend.controller;

import com.smartbox.backend.dto.request.CustomerRequests;
import com.smartbox.backend.service.CustomerAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/customer") @RequiredArgsConstructor
public class CustomerAccountController {
    private final CustomerAccountService customers;
    @GetMapping("/profile") public Map<String,Object> profile(){return customers.profile();}
    @PutMapping("/profile") public Map<String,Object> profile(@Valid @RequestBody CustomerRequests.ProfileUpdate request){return customers.updateProfile(request);}
    @GetMapping("/addresses") public List<Map<String,Object>> addresses(){return customers.addresses();}
    @PostMapping("/addresses") public ResponseEntity<Map<String,Object>> create(@Valid @RequestBody CustomerRequests.Address request){return ResponseEntity.status(201).body(customers.saveAddress(null,request));}
    @PutMapping("/addresses/{id}") public Map<String,Object> update(@PathVariable UUID id,@Valid @RequestBody CustomerRequests.Address request){return customers.saveAddress(id,request);}
    @DeleteMapping("/addresses/{id}") public ResponseEntity<Void> delete(@PathVariable UUID id){customers.deleteAddress(id);return ResponseEntity.noContent().build();}
}
