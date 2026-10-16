package com.smartbox.backend.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum WarrantyStatus {
    ACTIVE("active", "Còn hiệu lực"),
    EXPIRED("expired", "Hết hạn"),
    VOID("void", "Vô hiệu hóa");

    private final String value;
    private final String displayName;

    WarrantyStatus(String value, String displayName) {
        this.value = value;
        this.displayName = displayName;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static WarrantyStatus fromString(String text) {
        if (text == null || text.trim().isEmpty()) {
            return ACTIVE;
        }
        for (WarrantyStatus s : WarrantyStatus.values()) {
            if (s.value.equalsIgnoreCase(text.trim()) || s.name().equalsIgnoreCase(text.trim())) {
                return s;
            }
        }
        return ACTIVE;
    }
}
