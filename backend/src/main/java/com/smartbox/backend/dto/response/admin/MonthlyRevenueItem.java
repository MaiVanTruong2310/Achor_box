package com.smartbox.backend.dto.response.admin;

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

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Doanh thu theo từng tháng")
public class MonthlyRevenueItem {

    @Schema(description = "Mã tháng (YYYY-MM hoặc T1, T2,...)", example = "T6")
    private String month;

    @Schema(description = "Nhãn hiển thị", example = "Tháng 6")
    private String label;

    @Schema(description = "Doanh thu (VNĐ)", example = "125000000")
    private Double revenue;

    @Schema(description = "Số lượng đơn hàng", example = "48")
    private Integer orders;
}
