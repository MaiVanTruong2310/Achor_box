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

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Tỷ lệ cơ cấu doanh số theo dòng sản phẩm")
public class ProductSalesItem {

    @Schema(description = "ID hoặc mã sản phẩm", example = "SBX-PRO")
    private String id;

    @Schema(description = "Tên sản phẩm", example = "SmartBox Pro Max")
    private String name;

    @Schema(description = "Mô tả phụ", example = "Bản cao cấp tích hợp camera")
    private String sub;

    @Schema(description = "Tỷ lệ phần trăm đóng góp", example = "45")
    private Integer percent;

    @Schema(description = "Tổng doanh thu mang lại (VNĐ)", example = "180000000")
    private BigDecimal revenue;

    @Schema(description = "Mã màu hiển thị biểu đồ", example = "#3B82F6")
    private String color;
}
