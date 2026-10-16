package com.smartbox.backend.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum InstallationStatus {
    ASSIGNED("ASSIGNED", "Đã phân công"),
    IN_PROGRESS("IN_PROGRESS", "Đang giao / lắp đặt"),
    DELIVERED("DELIVERED", "Đã giao đến nơi"),
    INSTALLED("INSTALLED", "Đã lắp đặt"),
    COMPLETED("COMPLETED", "Hoàn tất"),
    FAILED("FAILED", "Thất bại / Hủy");

    private final String value;
    private final String displayName;

    InstallationStatus(String value, String displayName) {
        this.value = value;
        this.displayName = displayName;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static InstallationStatus fromString(String text) {
        if (text == null || text.trim().isEmpty()) {
            return ASSIGNED;
        }
        for (InstallationStatus s : InstallationStatus.values()) {
            if (s.value.equalsIgnoreCase(text.trim()) || s.name().equalsIgnoreCase(text.trim())) {
                return s;
            }
        }
        return ASSIGNED;
    }
}
