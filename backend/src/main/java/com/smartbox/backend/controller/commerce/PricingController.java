package com.smartbox.backend.controller.commerce;

import com.smartbox.backend.dto.request.commerce.CalculatePricingRequest;
import com.smartbox.backend.dto.response.commerce.CalculatePricingResponse;
import com.smartbox.backend.service.commerce.PricingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pricing")
@RequiredArgsConstructor
@Tag(name = "Pricing & Calculation API", description = "Tính toán đơn giá, thành tiền, chiết khấu voucher (100% tại backend)")
public class PricingController {

    private final PricingService pricingService;

    @PostMapping("/calculate")
    @Operation(summary = "Tính toán trước bảng giá và chiết khấu cho giỏ hàng/đơn hàng", description = "Tính toán chi tiết giá tạm tính, phí giao hàng lắp đặt, số tiền giảm giá từ voucher và tổng tiền thanh toán cuối cùng hoàn toàn tại backend")
    public ResponseEntity<CalculatePricingResponse> calculate(
            @Valid @RequestBody CalculatePricingRequest request) {
        return ResponseEntity.ok(pricingService.calculate(request));
    }
}
