package com.smartbox.backend.controller;
import com.smartbox.backend.service.VariantSpecificationService;
import com.smartbox.backend.dto.request.ProductVariantRequest;
import com.smartbox.backend.dto.response.ProductVariantResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
@RestController @RequiredArgsConstructor
public class VariantSpecificationController {
    private final VariantSpecificationService specs;
    @PatchMapping("/api/products/{product}/variants/{id}/specifications") public ProductVariantResponse update(@PathVariable UUID product,@PathVariable UUID id,@RequestBody ProductVariantRequest request){return specs.update(product,id,request);}
}
