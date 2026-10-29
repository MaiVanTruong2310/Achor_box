package com.smartbox.backend.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum PaymentStatus {
    PENDING("pending", "Chờ thanh toán"),
    SUCCESS("success", "Thành công"),
    FAILED("failed", "Thất bại"),
    EXPIRED("expired", "Hết hạn"),
    REFUND_REQUIRED("refund_required", "Yêu cầu hoàn tiền"),
    REFUNDED("refunded", "Đã hoàn tiền");

    private final String value;
    private final String displayName;

    PaymentStatus(String value, String displayName) {
        this.value = value;
        this.displayName = displayName;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static PaymentStatus fromString(String text) {
        if (text == null || text.trim().isEmpty()) {
            return PENDING;
        }
        for (PaymentStatus s : PaymentStatus.values()) {
            if (s.value.equalsIgnoreCase(text.trim()) || s.name().equalsIgnoreCase(text.trim())) {
                return s;
            }
        }
        return PENDING;
    }
}
