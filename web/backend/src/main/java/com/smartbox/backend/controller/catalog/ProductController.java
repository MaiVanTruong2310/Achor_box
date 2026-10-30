package com.smartbox.backend.controller.catalog;

import com.smartbox.backend.common.AppConstants;
import com.smartbox.backend.dto.request.catalog.ProductCategoryRequest;
import com.smartbox.backend.dto.request.catalog.ProductRequest;
import com.smartbox.backend.dto.request.catalog.StockAdjustRequest;
import com.smartbox.backend.dto.response.catalog.ProductResponse;
import com.smartbox.backend.dto.response.catalog.ProductVariantResponse;
import com.smartbox.backend.entity.ProductCategory;
import com.smartbox.backend.security.CurrentActor;
import com.smartbox.backend.service.catalog.ProductService;
import com.smartbox.backend.service.catalog.VariantInventoryService;
import com.smartbox.backend.service.warranty.ClaimImageStorage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Tag(name = "Product API", description = "Quản lý danh mục, sản phẩm SmartBox IoT và định mức tồn kho")
public class ProductController {

    private final ProductService productService;
    private final VariantInventoryService variantInventory;
    private final ClaimImageStorage imageStorage;
    private final CurrentActor actors;

    @GetMapping("/inventory-movements")
    @Operation(summary = "Lấy lịch sử biến động kho hàng tổng thể", description = "Truy xuất danh sách các lần nhập, xuất, điều chỉnh tồn kho của các biến thể sản phẩm trong toàn hệ thống")
    public Object movements(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "false") boolean paged) {
        if (paged) {
            return variantInventory.movementsPaged(page, size);
        }
        return variantInventory.movements();
    }

    @PostMapping(value = "/images", consumes = "multipart/form-data")
    @Operation(summary = "Tải ảnh sản phẩm lên Cloudinary", description = "Upload hình ảnh sản phẩm hoặc biến thể lên Cloudinary dành cho Super Admin và Product Manager")
    public Map<String, String> upload(@RequestPart("file") MultipartFile file) {
        actors.get().requireRoles("super_admin", "product_manager");
        return Map.of("url", imageStorage.upload(file).secureUrl());
    }

    @PatchMapping("/{id}/variants/{variantId}/stock")
    @Operation(summary = "Điều chỉnh số lượng tồn kho của biến thể sản phẩm", description = "Tăng hoặc giảm số lượng tồn kho thực tế của một biến thể cụ thể kèm theo lý do điều chỉnh")
    public Map<String, Object> adjustVariant(@PathVariable UUID id, @PathVariable UUID variantId, @RequestBody StockAdjustRequest request) {
        return variantInventory.adjust(id, variantId, request.getDelta(), request.getReason());
    }

    @GetMapping("/{id}/inventory-history")
    @Operation(summary = "Xem lịch sử biến động tồn kho chi tiết của sản phẩm", description = "Lấy toàn bộ nhật ký thay đổi số lượng tồn kho theo thời gian của sản phẩm tương ứng")
    public ResponseEntity<List<Map<String, Object>>> getInventoryHistory(@PathVariable UUID id) {
        return ResponseEntity.ok(variantInventory.movementsByProduct(id));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết sản phẩm theo ID", description = "Xem đầy đủ thông tin sản phẩm, danh sách biến thể kích cỡ, thông số kỹ thuật và hình ảnh mô tả")
    public ResponseEntity<ProductResponse> getProductById(@PathVariable UUID id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách sản phẩm (có thể lọc theo categoryId hoặc categorySlug)", description = "Truy xuất toàn bộ danh sách sản phẩm SmartBox, hỗ trợ lọc theo ID hoặc slug của danh mục sản phẩm")
    public ResponseEntity<List<ProductResponse>> getAllProducts(
            @Parameter(description = "ID loại sản phẩm") @RequestParam(required = false) UUID categoryId,
            @Parameter(description = "Slug loại sản phẩm (ví dụ: linh-kien-thay-the)") @RequestParam(required = false) String categorySlug) {
        return ResponseEntity.ok(productService.getAllProducts(categoryId, categorySlug));
    }

    @GetMapping("/paged")
    @Operation(summary = "Lấy danh sách sản phẩm có phân trang dạng Map<String, Object>", description = "Hỗ trợ phân trang, tìm kiếm theo tên/SKU và lọc sản phẩm theo danh mục")
    public ResponseEntity<Map<String, Object>> getProductsPaged(
            @Parameter(description = "Chỉ số trang (0-based)") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_NUMBER) int page,
            @Parameter(description = "Số lượng bản ghi mỗi trang") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_SIZE) int size,
            @Parameter(description = "ID loại sản phẩm") @RequestParam(required = false) UUID categoryId,
            @Parameter(description = "Slug loại sản phẩm") @RequestParam(required = false) String categorySlug,
            @Parameter(description = "Từ khóa tìm kiếm theo tên, SKU, mô tả") @RequestParam(required = false) String search) {
        return ResponseEntity.ok(productService.getProductsPaged(page, size, categoryId, categorySlug, search));
    }

    @GetMapping("/by-category/{slug}")
    @Operation(summary = "Lấy danh sách sản phẩm theo slug loại/danh mục sản phẩm", description = "Lọc các sản phẩm thuộc một danh mục cụ thể thông qua slug URL thân thiện (vd: tu-nhan-hang-thong-minh)")
    public ResponseEntity<List<ProductResponse>> getProductsByCategorySlug(
            @Parameter(description = "Slug loại sản phẩm (ví dụ: tu-nhan-hang-thong-minh, linh-kien-thay-the, phu-kien-tien-ich)") @PathVariable String slug) {
        return ResponseEntity.ok(productService.getAllProducts(null, slug));
    }

    @GetMapping("/categories")
    @Operation(summary = "Lấy danh sách tất cả loại/danh mục sản phẩm", description = "Truy xuất danh sách các nhóm danh mục sản phẩm SmartBox (Tủ thông minh, Phụ kiện, Linh kiện thay thế)")
    public ResponseEntity<List<ProductCategory>> getCategories() {
        return ResponseEntity.ok(productService.getAllCategories());
    }

    @GetMapping("/categories/{id}")
    @Operation(summary = "Lấy chi tiết loại sản phẩm theo ID", description = "Xem thông tin chi tiết tên, mô tả và cấu hình của một danh mục sản phẩm cụ thể")
    public ResponseEntity<ProductCategory> getCategoryById(@PathVariable UUID id) {
        return ResponseEntity.ok(productService.getCategoryById(id));
    }

    @PostMapping("/categories")
    @Operation(summary = "Tạo mới loại sản phẩm (Admin / Product Manager)", description = "Khởi tạo một danh mục sản phẩm mới với tên, mã code và mô tả")
    public ResponseEntity<ProductCategory> createCategory(
            @Valid @RequestBody ProductCategoryRequest request) {
        return ResponseEntity.ok(productService.createCategory(request));
    }

    @PutMapping("/categories/{id}")
    @Operation(summary = "Cập nhật loại sản phẩm (Admin / Product Manager)", description = "Chỉnh sửa thông tin tên hoặc mô tả của danh mục sản phẩm theo ID")
    public ResponseEntity<ProductCategory> updateCategory(
            @PathVariable UUID id,
            @Valid @RequestBody ProductCategoryRequest request) {
        return ResponseEntity.ok(productService.updateCategory(id, request));
    }

    @DeleteMapping("/categories/{id}")
    @Operation(summary = "Xóa loại sản phẩm theo ID (Admin / Product Manager)", description = "Xóa danh mục sản phẩm khỏi hệ thống (chỉ cho phép xóa khi không còn sản phẩm trực thuộc)")
    public ResponseEntity<Void> deleteCategory(@PathVariable UUID id) {
        productService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping
    @Operation(summary = "Tạo mới sản phẩm", description = "Thêm sản phẩm mới vào catalog kèm thông tin giá, mô tả, danh mục và các biến thể kích cỡ ban đầu")
    public ResponseEntity<ProductResponse> createProduct(@RequestBody ProductRequest request) {
        return ResponseEntity.ok(productService.createProduct(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật thông tin sản phẩm", description = "Chỉnh sửa tên, thông số, mô tả, hình ảnh và danh mục của sản phẩm hiện có")
    public ResponseEntity<ProductResponse> updateProduct(
            @PathVariable UUID id,
            @RequestBody ProductRequest request) {
        return ResponseEntity.ok(productService.updateProduct(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa sản phẩm theo ID", description = "Xóa sản phẩm khỏi hệ thống danh mục bán hàng")
    public ResponseEntity<Void> deleteProduct(@PathVariable UUID id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/stock")
    @Operation(summary = "Điều chỉnh số lượng tồn kho (+1, -1, +10)", description = "Cập nhật tăng/giảm tồn kho tổng thể của sản phẩm và ghi nhận nhật ký xuất nhập kho")
    public ResponseEntity<ProductResponse> adjustStock(
            @PathVariable UUID id,
            @RequestBody StockAdjustRequest request) {
        return ResponseEntity.ok(productService.adjustStock(id, request.getDelta() != null ? request.getDelta() : 0, request.getReason()));
    }

    @GetMapping("/{id}/variants")
    @Operation(summary = "Lấy danh sách các biến thể kích cỡ (Size S/M/L) của sản phẩm", description = "Truy xuất danh sách tất cả các biến thể kích thước, màu sắc, giá bán và tồn kho của sản phẩm")
    public ResponseEntity<List<ProductVariantResponse>> getProductVariants(@PathVariable UUID id) {
        return ResponseEntity.ok(productService.getVariantsByProductId(id));
    }
}
