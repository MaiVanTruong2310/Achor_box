package com.smartbox.backend.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum ClaimStatus {
    NEW("new", "Mới tiếp nhận"),
    ASSIGNED("assigned", "Đã phân công"),
    IN_PROGRESS("in_progress", "Đang xử lý"),
    RESOLVED("resolved", "Đã giải quyết"),
    REJECTED("rejected", "Từ chối bảo hành");

    private final String value;
    private final String displayName;

    ClaimStatus(String value, String displayName) {
        this.value = value;
        this.displayName = displayName;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static ClaimStatus fromString(String text) {
        if (text == null || text.trim().isEmpty()) {
            return NEW;
        }
        for (ClaimStatus s : ClaimStatus.values()) {
            if (s.value.equalsIgnoreCase(text.trim()) || s.name().equalsIgnoreCase(text.trim())) {
                return s;
            }
        }
        return NEW;
    }
}
