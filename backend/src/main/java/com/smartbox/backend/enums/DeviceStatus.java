package com.smartbox.backend.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;

@Getter
public enum DeviceStatus {
    ONLINE("online", "Trực tuyến"),
    OFFLINE("offline", "Ngoại tuyến"),
    MAINTENANCE("maintenance", "Đang bảo trì"),
    ERROR("error", "Báo lỗi");

    private final String value;
    private final String displayName;

    DeviceStatus(String value, String displayName) {
        this.value = value;
        this.displayName = displayName;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static DeviceStatus fromString(String text) {
        if (text == null || text.trim().isEmpty()) {
            return OFFLINE;
        }
        for (DeviceStatus s : DeviceStatus.values()) {
            if (s.value.equalsIgnoreCase(text.trim()) || s.name().equalsIgnoreCase(text.trim())) {
                return s;
            }
        }
        return OFFLINE;
    }
}
