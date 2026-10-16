package com.smartbox.backend.dto.request.catalog;

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

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu kiểm tra tính hợp lệ và áp dụng mã giảm giá")
public class ValidateCouponRequest {

    @Schema(description = "Mã voucher cần kiểm tra", example = "SUMMER2026")
    private String code;

    @Schema(description = "Tổng giá trị đơn hàng trước giảm (VNĐ)", example = "1200000")
    private BigDecimal orderTotal;
}
