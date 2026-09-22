package com.smartbox.backend.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu điều chỉnh số lượng tồn kho")
public class StockAdjustRequest {

    @Schema(description = "Số lượng thay đổi (dương là nhập thêm, âm là xuất bớt)", example = "10")
    private Integer delta;
}
