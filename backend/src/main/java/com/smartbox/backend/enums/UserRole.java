package com.smartbox.backend.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum UserRole {
    SUPER_ADMIN("super_admin", "Admin"),
    PRODUCT_MANAGER("product_manager", "PO"),
    TECHNICIAN("technician", "Technician"),
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
