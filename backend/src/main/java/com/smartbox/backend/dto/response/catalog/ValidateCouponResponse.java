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

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Kết quả kiểm tra mã giảm giá")
public class ValidateCouponResponse {

    @JsonProperty("isValid")
    @Schema(description = "Mã có hợp lệ không", example = "true")
    private boolean isValid;

    @Schema(description = "Thông báo kết quả", example = "Áp dụng mã thành công!")
    private String message;

    @Schema(description = "Mã đã áp dụng", example = "SUMMER2026")
    private String code;

    @Schema(description = "Loại chiết khấu", example = "percentage")
    private String discountType;

    @Schema(description = "Giá trị chiết khấu", example = "10")
    private BigDecimal discountValue;

    @Schema(description = "Số tiền được giảm thực tế (VNĐ)", example = "100000")
    private BigDecimal discountAmount;

    @Schema(description = "Tổng đơn ban đầu", example = "1200000")
    private BigDecimal originalTotal;

    @Schema(description = "Tổng đơn sau chiết khấu", example = "1100000")
    private BigDecimal finalTotal;

    @Schema(description = "ID voucher")
    private UUID promotionId;
}
