package com.smartbox.backend.dto;

import com.smartbox.backend.model.MessageTemplate;
import com.smartbox.backend.model.PaymentMethod;
import com.smartbox.backend.model.ShippingMethod;
import lombok.*;

import java.util.List;
import java.util.Map;

public class SettingsDTO {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SystemSettingsResponse {
        private List<MessageTemplate> messageTemplates;
        private List<ShippingMethod> shippingMethods;
        private List<PaymentMethod> paymentMethods;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TemplateUpdateRequest {
        private String code;
        private String name;
        private String description;
        private String channel;
        private String subject;
        private String body;
        private String variables;
        private Boolean isActive;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TestSendTemplateRequest {
        private String templateCode;
        private String recipientEmail;
        private String recipientPhone;
        private String customSubject;
        private String customBody;
        private Map<String, String> mockVariables;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TestSendResponse {
        private Boolean success;
        private String channel;
        private String recipient;
        private String renderedSubject;
        private String renderedBody;
        private String message;
        private Boolean isRealSent;
    }
}
