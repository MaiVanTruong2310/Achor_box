package com.smartbox.backend.controller.catalog;

import com.smartbox.backend.dto.request.catalog.ProductVariantRequest;
import com.smartbox.backend.dto.response.catalog.ProductVariantResponse;
import com.smartbox.backend.service.catalog.VariantSpecificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Tag(name = "Product API", description = "Quản lý danh mục, sản phẩm SmartBox IoT, biến thể kích cỡ và tồn kho")
public class VariantSpecificationController {

    private final VariantSpecificationService specs;

    @PatchMapping("/api/products/{product}/variants/{id}/specifications")
    @Operation(summary = "Cập nhật thông số kỹ thuật (kích thước, tải trọng, cảm biến) của biến thể", description = "Cập nhật chi tiết các thông số kỹ thuật như kích thước (dài, rộng, cao), tải trọng, công nghệ cảm biến và kết nối IoT")
    public ProductVariantResponse update(
            @PathVariable UUID product,
            @PathVariable UUID id,
            @RequestBody ProductVariantRequest request) {
        return specs.update(product, id, request);
    }
}
