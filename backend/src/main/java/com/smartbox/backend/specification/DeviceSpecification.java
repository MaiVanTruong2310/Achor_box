package com.smartbox.backend.specification;

import com.smartbox.backend.entity.Device;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public class DeviceSpecification {

    private DeviceSpecification() {}

    public static Specification<Device> hasStatus(String status) {
        return (root, query, cb) -> {
            if (status == null || status.isBlank()) return null;
            return cb.equal(cb.lower(root.get("status")), status.trim().toLowerCase());
        };
    }

    public static Specification<Device> hasOwnerId(UUID ownerId) {
        return (root, query, cb) -> {
            if (ownerId == null) return null;
            return cb.equal(root.get("ownerId"), ownerId);
        };
    }

    public static Specification<Device> hasSerialNumber(String serialNumber) {
        return (root, query, cb) -> {
            if (serialNumber == null || serialNumber.isBlank()) return null;
            return cb.like(cb.lower(root.get("serialNumber")), "%" + serialNumber.trim().toLowerCase() + "%");
        };
    }
}
