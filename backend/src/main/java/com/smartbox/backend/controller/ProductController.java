package com.smartbox.backend.controller;

import com.smartbox.backend.common.AppConstants;
import com.smartbox.backend.dto.request.ProductRequest;
import com.smartbox.backend.dto.request.StockAdjustRequest;
import com.smartbox.backend.dto.response.ProductResponse;
import com.smartbox.backend.entity.ProductCategory;
import com.smartbox.backend.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Tag(name = "Product API", description = "Quản lý danh mục, sản phẩm SmartBox IoT và định mức tồn kho")
public class ProductController {

    private final ProductService productService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả sản phẩm")
    public ResponseEntity<List<ProductResponse>> getAllProducts() {
        return ResponseEntity.ok(productService.getAllProducts());
    }

    @GetMapping("/paged")
    @Operation(summary = "Lấy danh sách sản phẩm có phân trang dạng Map<String, Object>")
    public ResponseEntity<Map<String, Object>> getProductsPaged(
            @Parameter(description = "Chỉ số trang (0-based)") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_NUMBER) int page,
            @Parameter(description = "Số lượng bản ghi mỗi trang") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_SIZE) int size) {
        return ResponseEntity.ok(productService.getProductsPaged(page, size));
    }

    @GetMapping("/categories")
    @Operation(summary = "Lấy danh sách danh mục sản phẩm")
    public ResponseEntity<List<ProductCategory>> getCategories() {
        return ResponseEntity.ok(productService.getAllCategories());
    }

    @PostMapping
    @Operation(summary = "Tạo mới sản phẩm")
    public ResponseEntity<ProductResponse> createProduct(@RequestBody ProductRequest request) {
        return ResponseEntity.ok(productService.createProduct(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật thông tin sản phẩm")
    public ResponseEntity<ProductResponse> updateProduct(
            @PathVariable UUID id,
            @RequestBody ProductRequest request) {
        return ResponseEntity.ok(productService.updateProduct(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa sản phẩm theo ID")
    public ResponseEntity<Void> deleteProduct(@PathVariable UUID id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/stock")
    @Operation(summary = "Điều chỉnh số lượng tồn kho (+1, -1, +10)")
    public ResponseEntity<ProductResponse> adjustStock(
            @PathVariable UUID id,
            @RequestBody StockAdjustRequest request) {
        return ResponseEntity.ok(productService.adjustStock(id, request.getDelta() != null ? request.getDelta() : 0));
    }

    @GetMapping("/{id}/variants")
    @Operation(summary = "Lấy danh sách các biến thể kích cỡ (Size S/M/L) của sản phẩm")
    public ResponseEntity<List<com.smartbox.backend.dto.response.ProductVariantResponse>> getProductVariants(@PathVariable UUID id) {
        return ResponseEntity.ok(productService.getVariantsByProductId(id));
    }
}
