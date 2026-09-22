package com.smartbox.backend.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu tạo hoặc chỉnh sửa mã khuyến mãi / voucher")
public class PromotionRequest {

    @Schema(description = "Mã voucher", example = "SUMMER2026")
    private String code;

    @Schema(description = "Mô tả ưu đãi", example = "Giảm 10% tối đa 100k cho đơn hàng từ 500k")
    private String description;

    @Schema(description = "Loại chiết khấu (percentage, fixed_amount)", example = "percentage")
    private String discountType;

    @Schema(description = "Giá trị chiết khấu", example = "10")
    private BigDecimal discountValue;

    @Schema(description = "Giá trị đơn hàng tối thiểu", example = "500000")
    private BigDecimal minOrderValue;

    @Schema(description = "Mức giảm tối đa", example = "100000")
    private BigDecimal maxDiscount;

    @Schema(description = "Ngày bắt đầu hiệu lực (YYYY-MM-DD)", example = "2026-06-01")
    private String startDate;

    @Schema(description = "Ngày kết thúc hiệu lực (YYYY-MM-DD)", example = "2026-08-31")
    private String endDate;

    @Schema(description = "Giới hạn số lần sử dụng", example = "100")
    private Integer usageLimit;

    @Schema(description = "Số lần đã sử dụng", example = "0")
    private Integer usedCount;

    @Schema(description = "Trạng thái kích hoạt", example = "true")
    private Boolean isActive;
}
