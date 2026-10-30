package com.smartbox.backend.dto.request.commerce;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Yêu cầu tra cứu tiến trình đơn hàng công khai")
public record OrderLookupRequest(
        @Schema(description = "Mã định danh đơn hàng UUID hoặc tiền tố mã đơn", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String orderId,

        @Schema(description = "Số điện thoại nhận hàng", example = "0987654321")
        String phone
) {}
