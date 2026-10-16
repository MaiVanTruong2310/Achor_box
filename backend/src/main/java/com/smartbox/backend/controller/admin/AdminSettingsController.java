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
@Tag(name = "Admin Settings API", description = "Quản lý cài đặt danh mục, phương thức thanh toán và phương thức giao hàng")
public class AdminSettingsController {

    private final AdminSettingsService settings;

    @GetMapping({"/categories", "/payment-methods", "/shipping-methods"})
    @Operation(summary = "Lấy danh sách cấu hình theo loại (categories, payment-methods, shipping-methods)")
    public List<Map<String, Object>> list(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String kind = uri.substring(uri.lastIndexOf('/') + 1);
        return settings.list(kind);
    }

    @PostMapping("/categories")
    @Operation(summary = "Thêm danh mục mới vào cấu hình")
    public Map<String, Object> createCategory(@Valid @RequestBody Category request) {
        return settings.category(null, request);
    }

    @PutMapping("/categories/{id}")
    @Operation(summary = "Cập nhật danh mục trong cấu hình")
    public Map<String, Object> updateCategory(@PathVariable UUID id, @Valid @RequestBody Category request) {
        return settings.category(id, request);
    }

    @PostMapping("/payment-methods")
    @Operation(summary = "Thêm phương thức thanh toán vào cấu hình tham khảo")
    public Map<String, Object> createPayment(@Valid @RequestBody Payment request) {
        return settings.payment(null, request);
    }

    @PutMapping("/payment-methods/{id}")
    @Operation(summary = "Cập nhật trạng thái phương thức thanh toán")
    public Map<String, Object> updatePayment(@PathVariable UUID id, @Valid @RequestBody Payment request) {
        return settings.payment(id, request);
    }

    @PostMapping("/shipping-methods")
    @Operation(summary = "Thêm phương thức giao lắp nội bộ")
    public Map<String, Object> createShipping(@Valid @RequestBody Shipping request) {
        return settings.shipping(null, request);
    }

    @PutMapping("/shipping-methods/{id}")
    @Operation(summary = "Cập nhật phương thức giao lắp")
    public Map<String, Object> updateShipping(@PathVariable UUID id, @Valid @RequestBody Shipping request) {
        return settings.shipping(id, request);
    }

    @DeleteMapping("/{kind:categories|payment-methods|shipping-methods}/{id}")
    @Operation(summary = "Xóa cấu hình theo loại và ID")
    public ResponseEntity<Void> delete(@PathVariable String kind, @PathVariable UUID id) {
        settings.delete(kind, id);
        return ResponseEntity.noContent().build();
    }
}
