package com.smartbox.backend.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum OrderStatus {
    PENDING("pending", "Chờ xử lý"),
    AWAITING_PAYMENT("awaiting_payment", "Chờ thanh toán"),
    PAID("paid", "Đã thanh toán"),
    CONFIRMED("confirmed", "Đã xác nhận"),
    PROCESSING("processing", "Đang đóng gói"),
    SHIPPING("shipping", "Đang giao hàng"),
    DELIVERED("delivered", "Đã giao đến hộp"),
    COMPLETED("completed", "Hoàn thành"),
    CANCELLED("cancelled", "Đã hủy"),
    REFUNDED("refunded", "Đã hoàn tiền");

    private final String value;
    private final String displayName;

    OrderStatus(String value, String displayName) {
        this.value = value;
        this.displayName = displayName;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static OrderStatus fromString(String text) {
        if (text == null || text.trim().isEmpty()) {
            return PENDING;
        }
        for (OrderStatus s : OrderStatus.values()) {
            if (s.value.equalsIgnoreCase(text.trim()) || s.name().equalsIgnoreCase(text.trim())) {
                return s;
            }
        }
        throw new IllegalArgumentException("Trạng thái đơn hàng không hợp lệ: " + text);
    }
}
