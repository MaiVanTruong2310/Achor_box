package com.smartbox.backend.controller;

import com.smartbox.backend.dto.ProductDTO;
import com.smartbox.backend.model.ProductCategory;
import com.smartbox.backend.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Tag(name = "Product API", description = "Quản lý danh mục, sản phẩm SmartBox IoT và định mức tồn kho")
public class ProductController {

    private final ProductService productService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả sản phẩm")
    public ResponseEntity<List<ProductDTO.ProductResponse>> getAllProducts() {
        return ResponseEntity.ok(productService.getAllProducts());
    }

    @GetMapping("/categories")
    @Operation(summary = "Lấy danh sách danh mục sản phẩm")
    public ResponseEntity<List<ProductCategory>> getCategories() {
        return ResponseEntity.ok(productService.getAllCategories());
    }

    @PostMapping
    @Operation(summary = "Tạo mới sản phẩm")
    public ResponseEntity<ProductDTO.ProductResponse> createProduct(@RequestBody ProductDTO.ProductRequest request) {
        return ResponseEntity.ok(productService.createProduct(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật thông tin sản phẩm")
    public ResponseEntity<ProductDTO.ProductResponse> updateProduct(
            @PathVariable UUID id,
            @RequestBody ProductDTO.ProductRequest request) {
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
    public ResponseEntity<ProductDTO.ProductResponse> adjustStock(
            @PathVariable UUID id,
            @RequestBody ProductDTO.StockAdjustRequest request) {
        return ResponseEntity.ok(productService.adjustStock(id, request.getDelta() != null ? request.getDelta() : 0));
    }
}
