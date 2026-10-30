package com.smartbox.backend.dto.response.admin;


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
