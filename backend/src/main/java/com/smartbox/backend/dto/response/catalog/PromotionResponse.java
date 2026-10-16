package com.smartbox.backend.dto.response.catalog;

import com.smartbox.backend.dto.request.admin.*;
import com.smartbox.backend.dto.request.auth.*;
import com.smartbox.backend.dto.request.catalog.*;
import com.smartbox.backend.dto.request.commerce.*;
import com.smartbox.backend.dto.request.customer.*;
import com.smartbox.backend.dto.request.device.*;
import com.smartbox.backend.dto.request.warranty.*;
import com.smartbox.backend.dto.response.admin.*;
import com.smartbox.backend.dto.response.auth.*;
import com.smartbox.backend.dto.response.catalog.*;
import com.smartbox.backend.dto.response.commerce.*;
import com.smartbox.backend.dto.response.customer.*;
import com.smartbox.backend.dto.response.device.*;
import com.smartbox.backend.dto.response.warranty.*;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Thông tin chi tiết chương trình khuyến mãi")
public class PromotionResponse {

    @Schema(description = "ID khuyến mãi")
    private UUID id;

    @Schema(description = "Mã voucher", example = "SUMMER2026")
    private String code;

    @Schema(description = "Mô tả ưu đãi")
    private String description;

    @Schema(description = "Loại chiết khấu", example = "percentage")
    private String discountType;

    @Schema(description = "Giá trị chiết khấu", example = "10")
    private BigDecimal discountValue;

    @Schema(description = "Giá trị đơn hàng tối thiểu", example = "500000")
    private BigDecimal minOrderValue;

    @Schema(description = "Mức giảm tối đa", example = "100000")
    private BigDecimal maxDiscount;

    @Schema(description = "Ngày bắt đầu")
    private String startDate;

    @Schema(description = "Ngày kết thúc")
    private String endDate;

    @Schema(description = "Giới hạn số lần dùng", example = "100")
    private Integer usageLimit;

    @Schema(description = "Số lần đã sử dụng", example = "12")
    private Integer usedCount;

    @Schema(description = "Đang kích hoạt", example = "true")
    private Boolean isActive;

    @Schema(description = "Ngày tạo")
    private OffsetDateTime createdAt;

    @Schema(description = "Ngày cập nhật")
    private OffsetDateTime updatedAt;
}
