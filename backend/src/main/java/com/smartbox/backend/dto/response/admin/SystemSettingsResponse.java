package com.smartbox.backend.dto.response.admin;

import com.smartbox.backend.entity.MessageTemplate;
import com.smartbox.backend.entity.PaymentMethod;
import com.smartbox.backend.entity.ShippingMethod;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Thông tin cấu hình tổng thể hệ thống")
public class SystemSettingsResponse implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Schema(description = "Danh sách mẫu thông báo")
    private List<MessageTemplate> messageTemplates;

    @Schema(description = "Danh sách phương thức vận chuyển")
    private List<ShippingMethod> shippingMethods;

    @Schema(description = "Danh sách cổng/phương thức thanh toán")
    private List<PaymentMethod> paymentMethods;
}
