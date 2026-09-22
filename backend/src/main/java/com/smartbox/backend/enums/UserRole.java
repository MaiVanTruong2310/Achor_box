package com.smartbox.backend.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum UserRole {
    SUPER_ADMIN("super_admin", "Tổng Quản Trị Hệ Thống"),
    PRODUCT_MANAGER("product_manager", "Quản Lý Sản Phẩm & Kho"),
    TECHNICIAN("technician", "Kỹ Thuật Viên IoT"),
    SUPPORT_AGENT("support_agent", "Nhân Viên CSKH & Hỗ Trợ"),
    ACCOUNTANT("accountant", "Kế Toán & Đối Soát Doanh Thu"),
    CUSTOMER("customer", "Khách Hàng");

    private final String value;
    private final String displayName;

    UserRole(String value, String displayName) {
        this.value = value;
        this.displayName = displayName;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static UserRole fromString(String text) {
        if (text == null || text.trim().isEmpty()) {
            return CUSTOMER;
        }
        for (UserRole r : UserRole.values()) {
            if (r.value.equalsIgnoreCase(text.trim()) || r.name().equalsIgnoreCase(text.trim())) {
                return r;
            }
        }
        return CUSTOMER;
    }
}
