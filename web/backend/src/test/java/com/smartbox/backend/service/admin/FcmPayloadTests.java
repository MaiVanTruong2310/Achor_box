package com.smartbox.backend.service.admin;

import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

class FcmPayloadTests {

    @Test
    void dataOmitsDeviceIdWhenNull() {
        UUID id = UUID.randomUUID();
        assertEquals(Map.of("notificationId", id.toString()), FcmWorker.data(id, null));
    }

    @Test
    void dataIncludesDeviceIdWhenPresent() {
        UUID id = UUID.randomUUID();
        UUID device = UUID.randomUUID();
        assertEquals(Map.of("notificationId", id.toString(), "deviceId", device.toString()), FcmWorker.data(id, device));
    }
}
