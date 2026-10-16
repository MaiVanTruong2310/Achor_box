package com.smartbox.backend;

import com.smartbox.backend.dto.request.commerce.CalculatePricingRequest;
import com.smartbox.backend.dto.response.commerce.CalculatePricingResponse;
import com.smartbox.backend.dto.response.catalog.ValidateCouponResponse;
import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.service.warranty.AcceptanceWarrantyService;
import com.smartbox.backend.service.commerce.PricingService;
import com.smartbox.backend.service.catalog.PromotionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PricingServiceTests {

    @Mock
    private CommerceRepository db;

    @Mock
    private PromotionService promotionService;

    @Mock
    private AcceptanceWarrantyService warranties;

    private PricingService pricingService;

    @BeforeEach
    void setUp() {
        pricingService = new PricingService(db, promotionService, warranties);
    }

    @Test
    void calculatesStandardItemPricesCorrectlyWithoutVoucher() {
        UUID variantId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();

        Map<String, Object> variantRow = new HashMap<>();
        variantRow.put("id", variantId);
        variantRow.put("product_id", productId);
        variantRow.put("product_name", "Tủ nhận hàng thông minh SmartBox Standard");
        variantRow.put("variant_name", "Dung tích M (85 Lít)");
        variantRow.put("sku", "SB-STD-M85L");
        variantRow.put("base_price", new BigDecimal("2500000"));
        variantRow.put("price_delta", new BigDecimal("500000"));
        variantRow.put("stock_quantity", 20);
        variantRow.put("is_active", true);
        variantRow.put("product_active", true);
        variantRow.put("size", "M");
        variantRow.put("capacity_liter", 85);

        when(db.list(anyString(), eq(variantId))).thenReturn(List.of(variantRow));
        when(warranties.months(any())).thenReturn(12);

        var request = CalculatePricingRequest.builder()
                .items(List.of(new CalculatePricingRequest.PricingItem(variantId, 2)))
                .build();

        CalculatePricingResponse response = pricingService.calculate(request);

        assertNotNull(response);
        // Unit price = 2,500,000 + 500,000 = 3,000,000
        // Quantity = 2 -> Subtotal = 6,000,000
        assertEquals(new BigDecimal("6000000"), response.getSubtotal());
        assertEquals(BigDecimal.ZERO, response.getDiscountAmount());
        assertEquals(new BigDecimal("6000000"), response.getFinalTotal());
        assertFalse(response.isVoucherApplied());
        assertEquals(1, response.getItemDetails().size());
        assertEquals(new BigDecimal("3000000"), response.getItemDetails().get(0).getUnitPrice());
    }

    @Test
    void appliesPercentageVoucherWithCapCorrectly() {
        UUID variantId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();

        Map<String, Object> variantRow = new HashMap<>();
        variantRow.put("id", variantId);
        variantRow.put("product_id", productId);
        variantRow.put("product_name", "Tủ nhận hàng cao cấp SmartBox Pro");
        variantRow.put("variant_name", "Bản Pro M (85 Lít)");
        variantRow.put("sku", "SB-PRO-M85L");
        variantRow.put("base_price", new BigDecimal("4200000"));
        variantRow.put("price_delta", BigDecimal.ZERO);
        variantRow.put("stock_quantity", 10);
        variantRow.put("is_active", true);
        variantRow.put("product_active", true);
        variantRow.put("size", "M");
        variantRow.put("capacity_liter", 85);

        when(db.list(anyString(), eq(variantId))).thenReturn(List.of(variantRow));
        when(warranties.months(any())).thenReturn(24);

        // Subtotal = 4,200,000; Voucher 10% max 500,000 -> discount 420,000
        when(promotionService.validateCoupon(eq("SMARTBOX10"), any(BigDecimal.class)))
                .thenReturn(ValidateCouponResponse.builder()
                        .isValid(true)
                        .code("SMARTBOX10")
                        .discountAmount(new BigDecimal("420000"))
                        .message("Giảm 10%")
                        .build());

        var request = CalculatePricingRequest.builder()
                .items(List.of(new CalculatePricingRequest.PricingItem(variantId, 1)))
                .voucherCode("SMARTBOX10")
                .build();

        CalculatePricingResponse response = pricingService.calculate(request);

        assertEquals(new BigDecimal("4200000"), response.getSubtotal());
        assertTrue(response.isVoucherApplied());
        assertEquals(new BigDecimal("420000"), response.getDiscountAmount());
        assertEquals(new BigDecimal("3780000"), response.getFinalTotal());
    }

    @Test
    void handlesInvalidVoucherGracefullyWithoutFailingOrderCalculation() {
        UUID variantId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();

        Map<String, Object> variantRow = new HashMap<>();
        variantRow.put("id", variantId);
        variantRow.put("product_id", productId);
        variantRow.put("product_name", "Hộp SmartBox Mini");
        variantRow.put("variant_name", "Tiêu chuẩn");
        variantRow.put("sku", "SB-MINI-STD");
        variantRow.put("base_price", new BigDecimal("1800000"));
        variantRow.put("price_delta", BigDecimal.ZERO);
        variantRow.put("stock_quantity", 15);
        variantRow.put("is_active", true);
        variantRow.put("product_active", true);

        when(db.list(anyString(), eq(variantId))).thenReturn(List.of(variantRow));
        when(warranties.months(any())).thenReturn(12);

        when(promotionService.validateCoupon(eq("EXPIRED_CODE"), any(BigDecimal.class)))
                .thenReturn(ValidateCouponResponse.builder()
                        .isValid(false)
                        .code("EXPIRED_CODE")
                        .discountAmount(BigDecimal.ZERO)
                        .message("Mã giảm giá đã hết hạn sử dụng")
                        .build());

        var request = CalculatePricingRequest.builder()
                .items(List.of(new CalculatePricingRequest.PricingItem(variantId, 1)))
                .voucherCode("EXPIRED_CODE")
                .build();

        CalculatePricingResponse response = pricingService.calculate(request);

        assertEquals(new BigDecimal("1800000"), response.getSubtotal());
        assertFalse(response.isVoucherApplied());
        assertEquals(BigDecimal.ZERO, response.getDiscountAmount());
        assertEquals(new BigDecimal("1800000"), response.getFinalTotal());
        assertEquals("Mã giảm giá đã hết hạn sử dụng", response.getVoucherMessage());
    }
}
