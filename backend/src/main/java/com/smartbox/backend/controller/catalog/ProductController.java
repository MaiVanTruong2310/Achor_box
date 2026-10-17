package com.smartbox.backend.controller.catalog;

import com.smartbox.backend.common.AppConstants;
import com.smartbox.backend.dto.request.catalog.ProductRequest;
import com.smartbox.backend.dto.request.catalog.StockAdjustRequest;
import com.smartbox.backend.dto.response.catalog.ProductResponse;
import com.smartbox.backend.entity.ProductCategory;
import com.smartbox.backend.service.catalog.ProductService;
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
    private final com.smartbox.backend.service.catalog.VariantInventoryService variantInventory;
    private final com.smartbox.backend.service.warranty.ClaimImageStorage imageStorage;
    private final com.smartbox.backend.security.CurrentActor actors;
    @GetMapping("/inventory-movements")
    public Object movements(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "false") boolean paged) {
        if (paged) {
            return variantInventory.movementsPaged(page, size);
        }
        return variantInventory.movements();
    }
    @PostMapping(value="/images",consumes="multipart/form-data")
    public Map<String,String> upload(@RequestPart("file") org.springframework.web.multipart.MultipartFile file){actors.get().requireRoles("super_admin","product_manager");return Map.of("url",imageStorage.upload(file).secureUrl());}

    @PatchMapping("/{id}/variants/{variantId}/stock")
    public Map<String,Object> adjustVariant(@PathVariable UUID id, @PathVariable UUID variantId, @RequestBody StockAdjustRequest request) {
        return variantInventory.adjust(id, variantId, request.getDelta(), request.getReason());
    }

    @GetMapping("/{id}/inventory-history")
    @Operation(summary = "Xem lịch sử biến động tồn kho chi tiết của sản phẩm")
    public ResponseEntity<List<Map<String, Object>>> getInventoryHistory(@PathVariable UUID id) {
        return ResponseEntity.ok(variantInventory.movementsByProduct(id));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết sản phẩm theo ID")
    public ResponseEntity<ProductResponse> getProductById(@PathVariable UUID id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách sản phẩm (có thể lọc theo categoryId hoặc categorySlug)")
    public ResponseEntity<List<ProductResponse>> getAllProducts(
            @Parameter(description = "ID loại sản phẩm") @RequestParam(required = false) UUID categoryId,
            @Parameter(description = "Slug loại sản phẩm (ví dụ: linh-kien-thay-the)") @RequestParam(required = false) String categorySlug) {
        return ResponseEntity.ok(productService.getAllProducts(categoryId, categorySlug));
    }

    @GetMapping("/paged")
    @Operation(summary = "Lấy danh sách sản phẩm có phân trang dạng Map<String, Object>")
    public ResponseEntity<Map<String, Object>> getProductsPaged(
            @Parameter(description = "Chỉ số trang (0-based)") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_NUMBER) int page,
            @Parameter(description = "Số lượng bản ghi mỗi trang") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_SIZE) int size,
            @Parameter(description = "ID loại sản phẩm") @RequestParam(required = false) UUID categoryId,
            @Parameter(description = "Slug loại sản phẩm") @RequestParam(required = false) String categorySlug,
            @Parameter(description = "Từ khóa tìm kiếm theo tên, SKU, mô tả") @RequestParam(required = false) String search) {
        return ResponseEntity.ok(productService.getProductsPaged(page, size, categoryId, categorySlug, search));
    }

    @GetMapping("/by-category/{slug}")
    @Operation(summary = "Lấy danh sách sản phẩm theo slug loại/danh mục sản phẩm")
    public ResponseEntity<List<ProductResponse>> getProductsByCategorySlug(
            @Parameter(description = "Slug loại sản phẩm (ví dụ: tu-nhan-hang-thong-minh, linh-kien-thay-the, phu-kien-tien-ich)") @PathVariable String slug) {
        return ResponseEntity.ok(productService.getAllProducts(null, slug));
    }

    @GetMapping("/categories")
    @Operation(summary = "Lấy danh sách tất cả loại/danh mục sản phẩm")
    public ResponseEntity<List<ProductCategory>> getCategories() {
        return ResponseEntity.ok(productService.getAllCategories());
    }

    @GetMapping("/categories/{id}")
    @Operation(summary = "Lấy chi tiết loại sản phẩm theo ID")
    public ResponseEntity<ProductCategory> getCategoryById(@PathVariable UUID id) {
        return ResponseEntity.ok(productService.getCategoryById(id));
    }

    @PostMapping("/categories")
    @Operation(summary = "Tạo mới loại sản phẩm (Admin / Product Manager)")
    public ResponseEntity<ProductCategory> createCategory(
            @jakarta.validation.Valid @RequestBody com.smartbox.backend.dto.request.catalog.ProductCategoryRequest request) {
        return ResponseEntity.ok(productService.createCategory(request));
    }

    @PutMapping("/categories/{id}")
    @Operation(summary = "Cập nhật loại sản phẩm (Admin / Product Manager)")
    public ResponseEntity<ProductCategory> updateCategory(
            @PathVariable UUID id,
            @jakarta.validation.Valid @RequestBody com.smartbox.backend.dto.request.catalog.ProductCategoryRequest request) {
        return ResponseEntity.ok(productService.updateCategory(id, request));
    }

    @DeleteMapping("/categories/{id}")
    @Operation(summary = "Xóa loại sản phẩm theo ID (Admin / Product Manager)")
    public ResponseEntity<Void> deleteCategory(@PathVariable UUID id) {
        productService.deleteCategory(id);
        return ResponseEntity.noContent().build();
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
        return ResponseEntity.ok(productService.adjustStock(id, request.getDelta() != null ? request.getDelta() : 0, request.getReason()));
    }

    @GetMapping("/{id}/variants")
    @Operation(summary = "Lấy danh sách các biến thể kích cỡ (Size S/M/L) của sản phẩm")
    public ResponseEntity<List<com.smartbox.backend.dto.response.catalog.ProductVariantResponse>> getProductVariants(@PathVariable UUID id) {
        return ResponseEntity.ok(productService.getVariantsByProductId(id));
    }
}
