package com.smartbox.backend.controller.admin;

import com.smartbox.backend.dto.request.admin.AdminSettingsRequests.Category;
import com.smartbox.backend.dto.request.admin.AdminSettingsRequests.Payment;
import com.smartbox.backend.dto.request.admin.AdminSettingsRequests.Shipping;
import com.smartbox.backend.service.admin.AdminSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
@Tag(name = "Settings API", description = "Cấu hình hệ thống, mẫu tin nhắn email/SMS, phương thức vận chuyển và thanh toán")
public class AdminSettingsController {

    private final AdminSettingsService settings;

    @GetMapping({"/categories", "/payment-methods", "/shipping-methods"})
    @Operation(summary = "Lấy danh sách cấu hình theo loại (categories, payment-methods, shipping-methods)", description = "Truy xuất danh sách các mục cấu hình tương ứng với loại danh mục, phương thức thanh toán hoặc phương thức vận chuyển")
    public List<Map<String, Object>> list(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String kind = uri.substring(uri.lastIndexOf('/') + 1);
        return settings.list(kind);
    }

    @PostMapping("/categories")
    @Operation(summary = "Thêm danh mục mới vào cấu hình", description = "Khởi tạo một danh mục sản phẩm mới vào danh mục cấu hình hệ thống")
    public Map<String, Object> createCategory(@Valid @RequestBody Category request) {
        return settings.category(null, request);
    }

    @PutMapping("/categories/{id}")
    @Operation(summary = "Cập nhật danh mục trong cấu hình", description = "Chỉnh sửa tên, mã và thông tin mô tả của danh mục cấu hình theo ID")
    public Map<String, Object> updateCategory(@PathVariable UUID id, @Valid @RequestBody Category request) {
        return settings.category(id, request);
    }

    @PostMapping("/payment-methods")
    @Operation(summary = "Thêm phương thức thanh toán vào cấu hình tham khảo", description = "Khai báo phương thức thanh toán mới áp dụng trong quy trình thanh toán đơn hàng")
    public Map<String, Object> createPayment(@Valid @RequestBody Payment request) {
        return settings.payment(null, request);
    }

    @PutMapping("/payment-methods/{id}")
    @Operation(summary = "Cập nhật trạng thái phương thức thanh toán", description = "Bật, tắt hoặc điều chỉnh tham số của phương thức thanh toán trong hệ thống")
    public Map<String, Object> updatePayment(@PathVariable UUID id, @Valid @RequestBody Payment request) {
        return settings.payment(id, request);
    }

    @PostMapping("/shipping-methods")
    @Operation(summary = "Thêm phương thức giao lắp nội bộ", description = "Tạo mới phương thức giao nhận và lắp đặt áp dụng cho kỹ thuật viên SmartBox")
    public Map<String, Object> createShipping(@Valid @RequestBody Shipping request) {
        return settings.shipping(null, request);
    }

    @PutMapping("/shipping-methods/{id}")
    @Operation(summary = "Cập nhật phương thức giao lắp", description = "Cập nhật tên, chi phí hoặc quy chuẩn của phương thức giao hàng lắp đặt")
    public Map<String, Object> updateShipping(@PathVariable UUID id, @Valid @RequestBody Shipping request) {
        return settings.shipping(id, request);
    }

    @DeleteMapping("/{kind:categories|payment-methods|shipping-methods}/{id}")
    @Operation(summary = "Xóa cấu hình theo loại và ID", description = "Xóa một mục cấu hình cụ thể thuộc loại categories, payment-methods hoặc shipping-methods")
    public ResponseEntity<Void> delete(@PathVariable String kind, @PathVariable UUID id) {
        settings.delete(kind, id);
        return ResponseEntity.noContent().build();
    }
}
