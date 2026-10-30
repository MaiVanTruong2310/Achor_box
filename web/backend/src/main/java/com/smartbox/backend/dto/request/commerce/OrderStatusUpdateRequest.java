package com.smartbox.backend.dto.request.commerce;


import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu cập nhật trạng thái đơn hàng")
public class OrderStatusUpdateRequest {

    @Schema(description = "Trạng thái mới của đơn hàng (pending, processing, shipping, delivered, cancelled)", example = "processing")
    private String status;
}
