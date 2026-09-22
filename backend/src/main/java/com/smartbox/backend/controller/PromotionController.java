package com.smartbox.backend.controller;

import com.smartbox.backend.common.AppConstants;
import com.smartbox.backend.dto.request.PromotionRequest;
import com.smartbox.backend.dto.request.ValidateCouponRequest;
import com.smartbox.backend.dto.response.PromotionResponse;
import com.smartbox.backend.dto.response.ValidateCouponResponse;
import com.smartbox.backend.service.PromotionService;
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
@RequestMapping("/api/promotions")
@RequiredArgsConstructor
@Tag(name = "Promotion & Coupon API", description = "Quản lý mã giảm giá, voucher khuyến mãi và tính toán chiết khấu đơn hàng")
public class PromotionController {

    private final PromotionService promotionService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả mã khuyến mãi")
    public ResponseEntity<List<PromotionResponse>> getAllPromotions() {
        return ResponseEntity.ok(promotionService.getAllPromotions());
    }

    @GetMapping("/paged")
    @Operation(summary = "Lấy danh sách mã khuyến mãi có phân trang dạng Map<String, Object>")
    public ResponseEntity<Map<String, Object>> getPromotionsPaged(
            @Parameter(description = "Chỉ số trang (0-based)") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_NUMBER) int page,
            @Parameter(description = "Số lượng bản ghi mỗi trang") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_SIZE) int size) {
        return ResponseEntity.ok(promotionService.getPromotionsPaged(page, size));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy thông tin chi tiết một mã khuyến mãi theo ID")
    public ResponseEntity<PromotionResponse> getPromotionById(@PathVariable UUID id) {
        return ResponseEntity.ok(promotionService.getPromotionById(id));
    }

    @PostMapping
    @Operation(summary = "Tạo mới mã khuyến mãi")
    public ResponseEntity<PromotionResponse> createPromotion(
            @RequestBody PromotionRequest request) {
        return ResponseEntity.ok(promotionService.createPromotion(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật thông tin mã khuyến mãi")
    public ResponseEntity<PromotionResponse> updatePromotion(
            @PathVariable UUID id,
            @RequestBody PromotionRequest request) {
        return ResponseEntity.ok(promotionService.updatePromotion(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa mã khuyến mãi")
    public ResponseEntity<Void> deletePromotion(@PathVariable UUID id) {
        promotionService.deletePromotion(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/toggle")
    @Operation(summary = "Bật / Tắt kích hoạt mã khuyến mãi")
    public ResponseEntity<PromotionResponse> toggleActive(@PathVariable UUID id) {
        return ResponseEntity.ok(promotionService.toggleActive(id));
    }

    @PostMapping("/validate")
    @Operation(summary = "Kiểm tra điều kiện hợp lệ và tính số tiền giảm giá cho đơn hàng")
    public ResponseEntity<ValidateCouponResponse> validateAndCalculate(
            @RequestBody ValidateCouponRequest request) {
        return ResponseEntity.ok(promotionService.validateAndCalculate(request));
    }
}
