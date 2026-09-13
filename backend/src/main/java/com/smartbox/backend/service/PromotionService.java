package com.smartbox.backend.service;

import com.smartbox.backend.dto.PromotionDTO;
import com.smartbox.backend.model.Promotion;
import com.smartbox.backend.repository.PromotionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PromotionService {

    private final PromotionRepository promotionRepository;

    @Transactional(readOnly = true)
    public List<PromotionDTO.PromotionResponse> getAllPromotions() {
        return promotionRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PromotionDTO.PromotionResponse getPromotionById(UUID id) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy mã khuyến mãi với ID: " + id));
        return mapToResponse(promotion);
    }

    @Transactional
    public PromotionDTO.PromotionResponse createPromotion(PromotionDTO.PromotionRequest request) {
        String cleanCode = request.getCode() != null ? request.getCode().trim().toUpperCase() : "";
        if (cleanCode.isEmpty()) {
            throw new IllegalArgumentException("Mã khuyến mãi không được để trống.");
        }
        if (promotionRepository.existsByCodeIgnoreCase(cleanCode)) {
            throw new IllegalArgumentException("Mã khuyến mãi '" + cleanCode + "' đã tồn tại trên hệ thống.");
        }

        Promotion promotion = Promotion.builder()
                .code(cleanCode)
                .description(request.getDescription())
                .discountType(request.getDiscountType() != null ? request.getDiscountType() : "percentage")
                .discountValue(request.getDiscountValue() != null ? request.getDiscountValue() : BigDecimal.ZERO)
                .minOrderValue(request.getMinOrderValue() != null ? request.getMinOrderValue() : BigDecimal.ZERO)
                .maxDiscount(request.getMaxDiscount())
                .startDate(parseDate(request.getStartDate(), true))
                .endDate(parseDate(request.getEndDate(), false))
                .usageLimit(request.getUsageLimit() != null ? request.getUsageLimit() : 100)
                .usedCount(request.getUsedCount() != null ? request.getUsedCount() : 0)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        Promotion saved = promotionRepository.save(promotion);
        log.info("Đã tạo mới mã khuyến mãi thành công: {}", saved.getCode());
        return mapToResponse(saved);
    }

    @Transactional
    public PromotionDTO.PromotionResponse updatePromotion(UUID id, PromotionDTO.PromotionRequest request) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy mã khuyến mãi với ID: " + id));

        if (request.getCode() != null) {
            String cleanCode = request.getCode().trim().toUpperCase();
            if (!cleanCode.equalsIgnoreCase(promotion.getCode()) && promotionRepository.existsByCodeIgnoreCase(cleanCode)) {
                throw new IllegalArgumentException("Mã khuyến mãi '" + cleanCode + "' đã tồn tại.");
            }
            promotion.setCode(cleanCode);
        }

        if (request.getDescription() != null) promotion.setDescription(request.getDescription());
        if (request.getDiscountType() != null) promotion.setDiscountType(request.getDiscountType());
        if (request.getDiscountValue() != null) promotion.setDiscountValue(request.getDiscountValue());
        if (request.getMinOrderValue() != null) promotion.setMinOrderValue(request.getMinOrderValue());
        if (request.getMaxDiscount() != null) promotion.setMaxDiscount(request.getMaxDiscount());
        if (request.getStartDate() != null) promotion.setStartDate(parseDate(request.getStartDate(), true));
        if (request.getEndDate() != null) promotion.setEndDate(parseDate(request.getEndDate(), false));
        if (request.getUsageLimit() != null) promotion.setUsageLimit(request.getUsageLimit());
        if (request.getUsedCount() != null) promotion.setUsedCount(request.getUsedCount());
        if (request.getIsActive() != null) promotion.setIsActive(request.getIsActive());

        Promotion updated = promotionRepository.save(promotion);
        log.info("Đã cập nhật mã khuyến mãi: {}", updated.getCode());
        return mapToResponse(updated);
    }

    @Transactional
    public void deletePromotion(UUID id) {
        if (!promotionRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy mã khuyến mãi để xóa.");
        }
        promotionRepository.deleteById(id);
        log.info("Đã xóa mã khuyến mãi ID: {}", id);
    }

    @Transactional
    public PromotionDTO.PromotionResponse toggleActive(UUID id) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy mã khuyến mãi."));
        promotion.setIsActive(!Boolean.TRUE.equals(promotion.getIsActive()));
        Promotion updated = promotionRepository.save(promotion);
        return mapToResponse(updated);
    }

    /**
     * Validate coupon code against business constraints and calculate exact discount amount
     */
    @Transactional(readOnly = true)
    public PromotionDTO.ValidateCouponResponse validateAndCalculate(PromotionDTO.ValidateCouponRequest request) {
        String code = request.getCode() != null ? request.getCode().trim().toUpperCase() : "";
        BigDecimal orderTotal = request.getOrderTotal() != null ? request.getOrderTotal() : BigDecimal.ZERO;

        if (code.isEmpty()) {
            return PromotionDTO.ValidateCouponResponse.builder()
                    .isValid(false)
                    .message("Vui lòng nhập mã giảm giá.")
                    .originalTotal(orderTotal)
                    .finalTotal(orderTotal)
                    .discountAmount(BigDecimal.ZERO)
                    .build();
        }

        var opt = promotionRepository.findByCodeIgnoreCase(code);
        if (opt.isEmpty()) {
            return PromotionDTO.ValidateCouponResponse.builder()
                    .isValid(false)
                    .message("Mã giảm giá '" + code + "' không tồn tại.")
                    .code(code)
                    .originalTotal(orderTotal)
                    .finalTotal(orderTotal)
                    .discountAmount(BigDecimal.ZERO)
                    .build();
        }

        Promotion p = opt.get();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        // 1. Check if active
        if (!Boolean.TRUE.equals(p.getIsActive())) {
            return PromotionDTO.ValidateCouponResponse.builder()
                    .isValid(false)
                    .message("Mã giảm giá '" + code + "' hiện đang tạm ngưng áp dụng.")
                    .code(code)
                    .originalTotal(orderTotal)
                    .finalTotal(orderTotal)
                    .discountAmount(BigDecimal.ZERO)
                    .build();
        }

        // 2. Check validity dates
        if (p.getStartDate() != null && now.isBefore(p.getStartDate())) {
            return PromotionDTO.ValidateCouponResponse.builder()
                    .isValid(false)
                    .message("Chương trình khuyến mãi của mã '" + code + "' chưa bắt đầu.")
                    .code(code)
                    .originalTotal(orderTotal)
                    .finalTotal(orderTotal)
                    .discountAmount(BigDecimal.ZERO)
                    .build();
        }

        if (p.getEndDate() != null && now.isAfter(p.getEndDate())) {
            return PromotionDTO.ValidateCouponResponse.builder()
                    .isValid(false)
                    .message("Mã giảm giá '" + code + "' đã hết hạn sử dụng.")
                    .code(code)
                    .originalTotal(orderTotal)
                    .finalTotal(orderTotal)
                    .discountAmount(BigDecimal.ZERO)
                    .build();
        }

        // 3. Check usage limit
        if (p.getUsageLimit() != null && p.getUsedCount() != null && p.getUsedCount() >= p.getUsageLimit()) {
            return PromotionDTO.ValidateCouponResponse.builder()
                    .isValid(false)
                    .message("Mã giảm giá '" + code + "' đã hết lượt sử dụng.")
                    .code(code)
                    .originalTotal(orderTotal)
                    .finalTotal(orderTotal)
                    .discountAmount(BigDecimal.ZERO)
                    .build();
        }

        // 4. Check min order value
        if (p.getMinOrderValue() != null && orderTotal.compareTo(p.getMinOrderValue()) < 0) {
            return PromotionDTO.ValidateCouponResponse.builder()
                    .isValid(false)
                    .message(String.format("Đơn hàng chưa đạt giá trị tối thiểu %,.0f VNĐ để áp dụng mã này.", p.getMinOrderValue()))
                    .code(code)
                    .originalTotal(orderTotal)
                    .finalTotal(orderTotal)
                    .discountAmount(BigDecimal.ZERO)
                    .build();
        }

        // 5. Calculate discount
        BigDecimal discountAmount = BigDecimal.ZERO;
        if ("percentage".equalsIgnoreCase(p.getDiscountType())) {
            BigDecimal percent = p.getDiscountValue() != null ? p.getDiscountValue() : BigDecimal.ZERO;
            discountAmount = orderTotal.multiply(percent).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
            if (p.getMaxDiscount() != null && p.getMaxDiscount().compareTo(BigDecimal.ZERO) > 0) {
                if (discountAmount.compareTo(p.getMaxDiscount()) > 0) {
                    discountAmount = p.getMaxDiscount();
                }
            }
        } else {
            // fixed_amount
            discountAmount = p.getDiscountValue() != null ? p.getDiscountValue() : BigDecimal.ZERO;
            if (discountAmount.compareTo(orderTotal) > 0) {
                discountAmount = orderTotal;
            }
        }

        BigDecimal finalTotal = orderTotal.subtract(discountAmount);
        if (finalTotal.compareTo(BigDecimal.ZERO) < 0) {
            finalTotal = BigDecimal.ZERO;
        }

        return PromotionDTO.ValidateCouponResponse.builder()
                .isValid(true)
                .message("Áp dụng mã giảm giá thành công!")
                .code(p.getCode())
                .discountType(p.getDiscountType())
                .discountValue(p.getDiscountValue())
                .discountAmount(discountAmount)
                .originalTotal(orderTotal)
                .finalTotal(finalTotal)
                .promotionId(p.getId())
                .build();
    }

    private PromotionDTO.PromotionResponse mapToResponse(Promotion p) {
        return PromotionDTO.PromotionResponse.builder()
                .id(p.getId())
                .code(p.getCode())
                .description(p.getDescription())
                .discountType(p.getDiscountType())
                .discountValue(p.getDiscountValue())
                .minOrderValue(p.getMinOrderValue())
                .maxDiscount(p.getMaxDiscount())
                .startDate(p.getStartDate() != null ? p.getStartDate().toString().substring(0, 10) : "")
                .endDate(p.getEndDate() != null ? p.getEndDate().toString().substring(0, 10) : "")
                .usageLimit(p.getUsageLimit())
                .usedCount(p.getUsedCount())
                .isActive(p.getIsActive())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }

    private OffsetDateTime parseDate(String dateStr, boolean isStart) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return isStart ? OffsetDateTime.now(ZoneOffset.UTC) : OffsetDateTime.now(ZoneOffset.UTC).plusYears(1);
        }
        try {
            if (dateStr.length() == 10) {
                LocalDate ld = LocalDate.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE);
                return isStart ? ld.atStartOfDay().atOffset(ZoneOffset.UTC) : ld.atTime(23, 59, 59).atOffset(ZoneOffset.UTC);
            }
            return OffsetDateTime.parse(dateStr);
        } catch (Exception e) {
            LocalDate ld = LocalDate.now();
            return isStart ? ld.atStartOfDay().atOffset(ZoneOffset.UTC) : ld.atTime(23, 59, 59).atOffset(ZoneOffset.UTC);
        }
    }
}
