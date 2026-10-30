package com.smartbox.backend.service.commerce;

import com.smartbox.backend.dto.request.commerce.CalculatePricingRequest;
import com.smartbox.backend.dto.response.catalog.ValidateCouponResponse;
import com.smartbox.backend.dto.response.commerce.CalculatePricingResponse;
import com.smartbox.backend.exception.BadRequestException;
import com.smartbox.backend.exception.ResourceNotFoundException;
import com.smartbox.backend.repository.CommerceRepository;
import com.smartbox.backend.service.catalog.PromotionService;
import com.smartbox.backend.service.warranty.AcceptanceWarrantyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import static com.smartbox.backend.service.commerce.OrderWorkflowService.money;
import static com.smartbox.backend.service.commerce.OrderWorkflowService.uuid;

/**
 * Service tính toán giá đơn hàng, chiết khấu voucher tập trung tại Backend (Single Source of Truth).
 * Toàn bộ giá bán, phụ thu biến thể, điều kiện voucher và tổng tiền thanh toán được xử lý ở đây,
 * Frontend tuyệt đối không tự tính toán tiền.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PricingService {

    private final CommerceRepository db;
    private final PromotionService promotionService;
    private final AcceptanceWarrantyService warranties;

    /**
     * Tính toán bảng chiết tính chi tiết cho danh sách sản phẩm và mã voucher.
     *
     * @param request Danh sách các SKU/variantId và số lượng, kèm mã giảm giá (nếu có)
     * @return Kết quả chiết tính gồm đơn giá, thành tiền từng dòng, giảm giá, và tổng thanh toán
     */
    @Transactional(readOnly = true)
    public CalculatePricingResponse calculate(CalculatePricingRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BadRequestException("Danh sách sản phẩm không được rỗng");
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        List<CalculatePricingResponse.PricingItemDetail> details = new ArrayList<>();

        List<UUID> variantIds = request.getItems().stream()
                .map(CalculatePricingRequest.PricingItem::getVariantId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        Map<UUID, Map<String, Object>> variantMap = new LinkedHashMap<>();
        if (!variantIds.isEmpty()) {
            String placeholders = String.join(",", Collections.nCopies(variantIds.size(), "?"));
            var allVariants = db.list(
                    "SELECT v.*, p.name AS product_name, p.price AS base_price, p.is_active AS product_active " +
                            "FROM public.product_variants v " +
                            "JOIN public.products p ON p.id = v.product_id " +
                            "WHERE v.id IN (" + placeholders + ")",
                    variantIds.toArray()
            );
            for (var v : allVariants) {
                variantMap.put(uuid(v.get("id")), v);
            }
        }

        for (var itemReq : request.getItems()) {
            UUID variantId = itemReq.getVariantId();
            int qty = itemReq.getQuantity();

            if (qty < 1 || qty > 99) {
                throw new BadRequestException("Số lượng cho mỗi sản phẩm phải từ 1 đến 99");
            }

            var variant = variantMap.get(variantId);
            if (variant == null) {
                throw new ResourceNotFoundException("Biến thể sản phẩm", "variantId", variantId);
            }
            boolean active = Boolean.TRUE.equals(variant.get("is_active"))
                    && Boolean.TRUE.equals(variant.get("product_active"));

            if (!active) {
                throw new BadRequestException("Sản phẩm '" + variant.get("product_name") + "' hiện tạm ngưng bán");
            }

            BigDecimal basePrice = money(variant.get("base_price"));
            BigDecimal delta = money(variant.get("price_delta"));
            BigDecimal unitPrice = basePrice.add(delta);

            if (unitPrice.signum() < 0) {
                unitPrice = BigDecimal.ZERO;
            }

            BigDecimal itemTotal = unitPrice.multiply(BigDecimal.valueOf(qty));
            subtotal = subtotal.add(itemTotal);

            int stock = ((Number) variant.get("stock_quantity")).intValue();
            int warrantyMonths = warranties.months(variant);

            details.add(CalculatePricingResponse.PricingItemDetail.builder()
                    .variantId(variantId)
                    .productId((UUID) variant.get("product_id"))
                    .productName((String) variant.get("product_name"))
                    .variantName((String) variant.get("variant_name"))
                    .sku((String) variant.get("sku"))
                    .unitPrice(unitPrice)
                    .quantity(qty)
                    .itemTotal(itemTotal)
                    .size((String) variant.get("size"))
                    .capacityLiter(variant.get("capacity_liter") != null ? ((Number) variant.get("capacity_liter")).intValue() : null)
                    .warrantyMonths(warrantyMonths)
                    .inStock(stock >= qty)
                    .build());
        }

        BigDecimal discountAmount = BigDecimal.ZERO;
        String voucherCode = request.getVoucherCode() != null ? request.getVoucherCode().trim().toUpperCase() : null;
        boolean voucherApplied = false;
        String voucherMessage = null;

        if (voucherCode != null && !voucherCode.isBlank()) {
            ValidateCouponResponse couponRes = promotionService.validateCoupon(voucherCode, subtotal);
            if (couponRes.isValid()) {
                voucherApplied = true;
                discountAmount = couponRes.getDiscountAmount();
                voucherMessage = "Áp dụng mã giảm giá thành công: " + couponRes.getMessage();
            } else {
                voucherApplied = false;
                discountAmount = BigDecimal.ZERO;
                voucherMessage = couponRes.getMessage();
            }
        }

        BigDecimal shippingFee = BigDecimal.ZERO; // Miễn phí giao hàng & lắp đặt tiêu chuẩn
        BigDecimal finalTotal = subtotal.subtract(discountAmount).add(shippingFee);
        if (finalTotal.signum() < 0) {
            finalTotal = BigDecimal.ZERO;
        }

        return CalculatePricingResponse.builder()
                .subtotal(subtotal)
                .discountAmount(discountAmount)
                .shippingFee(shippingFee)
                .finalTotal(finalTotal)
                .voucherCode(voucherCode)
                .voucherApplied(voucherApplied)
                .voucherMessage(voucherMessage)
                .itemDetails(details)
                .build();
    }
}
