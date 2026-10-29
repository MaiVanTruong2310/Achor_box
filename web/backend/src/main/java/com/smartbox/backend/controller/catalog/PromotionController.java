package com.smartbox.backend.controller.catalog;

import com.smartbox.backend.common.AppConstants;
import com.smartbox.backend.dto.request.catalog.PromotionRequest;
import com.smartbox.backend.dto.request.catalog.ValidateCouponRequest;
import com.smartbox.backend.dto.response.catalog.PromotionResponse;
import com.smartbox.backend.dto.response.catalog.ValidateCouponResponse;
import com.smartbox.backend.service.catalog.PromotionService;
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
    @Operation(summary = "Lấy danh sách tất cả mã khuyến mãi", description = "Truy xuất toàn bộ danh sách voucher, mã giảm giá và chương trình ưu đãi hiện có")
    public ResponseEntity<List<PromotionResponse>> getAllPromotions() {
        return ResponseEntity.ok(promotionService.getAllPromotions());
    }

    @GetMapping("/paged")
    @Operation(summary = "Lấy danh sách mã khuyến mãi có phân trang dạng Map<String, Object>", description = "Phân trang danh sách voucher khuyến mãi, hỗ trợ tìm kiếm và kiểm tra hiệu lực")
    public ResponseEntity<Map<String, Object>> getPromotionsPaged(
            @Parameter(description = "Chỉ số trang (0-based)") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_NUMBER) int page,
            @Parameter(description = "Số lượng bản ghi mỗi trang") @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_SIZE) int size) {
        return ResponseEntity.ok(promotionService.getPromotionsPaged(page, size));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy thông tin chi tiết một mã khuyến mãi theo ID", description = "Xem điều kiện áp dụng, tỷ lệ giảm giá, mức giảm tối đa và thời hạn hiệu lực của voucher")
    public ResponseEntity<PromotionResponse> getPromotionById(@PathVariable UUID id) {
        return ResponseEntity.ok(promotionService.getPromotionById(id));
    }

    @PostMapping
    @Operation(summary = "Tạo mới mã khuyến mãi", description = "Tạo chương trình ưu đãi mới với mã code, mức giảm giá (% hoặc cố định), giá trị đơn hàng tối thiểu và ngày bắt đầu/kết thúc")
    public ResponseEntity<PromotionResponse> createPromotion(
            @RequestBody PromotionRequest request) {
        return ResponseEntity.ok(promotionService.createPromotion(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật thông tin mã khuyến mãi", description = "Chỉnh sửa các tham số điều kiện, số lượng mã phát hành hoặc thời hạn của mã ưu đãi")
    public ResponseEntity<PromotionResponse> updatePromotion(
            @PathVariable UUID id,
            @RequestBody PromotionRequest request) {
        return ResponseEntity.ok(promotionService.updatePromotion(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa mã khuyến mãi", description = "Xóa voucher khuyến mãi khỏi hệ thống bán hàng")
    public ResponseEntity<Void> deletePromotion(@PathVariable UUID id) {
        promotionService.deletePromotion(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/toggle")
    @Operation(summary = "Bật / Tắt kích hoạt mã khuyến mãi", description = "Tạm dừng hoặc kích hoạt lại trạng thái cho phép người dùng áp dụng mã voucher khi mua hàng")
    public ResponseEntity<PromotionResponse> toggleActive(@PathVariable UUID id) {
        return ResponseEntity.ok(promotionService.toggleActive(id));
    }

    @PostMapping("/validate")
    @Operation(summary = "Kiểm tra điều kiện hợp lệ và tính số tiền giảm giá cho đơn hàng", description = "Xác thực mã giảm giá dựa trên người dùng, tổng tiền đơn hàng và trả về số tiền chiết khấu thực tế")
    public ResponseEntity<ValidateCouponResponse> validateAndCalculate(
            @RequestBody ValidateCouponRequest request) {
        return ResponseEntity.ok(promotionService.validateAndCalculate(request));
    }
}
