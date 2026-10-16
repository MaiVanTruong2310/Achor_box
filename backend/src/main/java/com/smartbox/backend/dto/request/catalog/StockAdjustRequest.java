package com.smartbox.backend.dto.request.catalog;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu điều chỉnh số lượng tồn kho")
public class StockAdjustRequest {

    @Schema(description = "Số lượng thay đổi (dương là nhập thêm, âm là xuất bớt)", example = "10")
    private Integer delta;

    @Schema(description = "Lý do / ghi chú điều chỉnh tồn kho", example = "Nhập thêm 20 chiếc từ nhà sản xuất")
    private String reason;
}
