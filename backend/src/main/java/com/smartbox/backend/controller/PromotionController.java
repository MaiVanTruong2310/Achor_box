package com.smartbox.backend.controller;

import com.smartbox.backend.dto.PromotionDTO;
import com.smartbox.backend.service.PromotionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/promotions")
@RequiredArgsConstructor
@Tag(name = "Promotion & Coupon API", description = "Quản lý mã giảm giá, voucher khuyến mãi và tính toán chiết khấu đơn hàng")
public class PromotionController {

    private final PromotionService promotionService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả mã khuyến mãi")
    public ResponseEntity<List<PromotionDTO.PromotionResponse>> getAllPromotions() {
        return ResponseEntity.ok(promotionService.getAllPromotions());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy thông tin chi tiết một mã khuyến mãi theo ID")
    public ResponseEntity<PromotionDTO.PromotionResponse> getPromotionById(@PathVariable UUID id) {
        return ResponseEntity.ok(promotionService.getPromotionById(id));
    }

    @PostMapping
    @Operation(summary = "Tạo mới mã khuyến mãi")
    public ResponseEntity<PromotionDTO.PromotionResponse> createPromotion(
            @RequestBody PromotionDTO.PromotionRequest request) {
        return ResponseEntity.ok(promotionService.createPromotion(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật thông tin mã khuyến mãi")
    public ResponseEntity<PromotionDTO.PromotionResponse> updatePromotion(
            @PathVariable UUID id,
            @RequestBody PromotionDTO.PromotionRequest request) {
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
    public ResponseEntity<PromotionDTO.PromotionResponse> toggleActive(@PathVariable UUID id) {
        return ResponseEntity.ok(promotionService.toggleActive(id));
    }

    @PostMapping("/validate")
    @Operation(summary = "Kiểm tra điều kiện hợp lệ và tính số tiền giảm giá cho đơn hàng")
    public ResponseEntity<PromotionDTO.ValidateCouponResponse> validateAndCalculate(
            @RequestBody PromotionDTO.ValidateCouponRequest request) {
        return ResponseEntity.ok(promotionService.validateAndCalculate(request));
    }
}
