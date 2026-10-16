package com.smartbox.backend.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum DiscountType {
    PERCENTAGE("percentage", "Phần trăm (%)"),
    FIXED_AMOUNT("fixed_amount", "Số tiền cố định (VNĐ)");

    private final String value;
    private final String displayName;

    DiscountType(String value, String displayName) {
        this.value = value;
        this.displayName = displayName;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static DiscountType fromString(String text) {
        if (text == null || text.trim().isEmpty()) {
            return PERCENTAGE;
        }
        for (DiscountType t : DiscountType.values()) {
            if (t.value.equalsIgnoreCase(text.trim()) || t.name().equalsIgnoreCase(text.trim())) {
                return t;
            }
        }
        return PERCENTAGE;
    }
}
