package com.smartbox.backend.service;

import com.smartbox.backend.service.commerce.OrderWorkflowService;
import com.smartbox.backend.service.warranty.AcceptanceWarrantyService;
import org.junit.jupiter.api.Test;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.*;

class OrderWorkflowServiceDateTests {

    @Test
    void parsesVariousDateFormatsCorrectly() {
        LocalDate expected = LocalDate.of(2027, 9, 16);

        // 1. String formatted as Timestamp with spaces (the exact error from Swagger)
        assertEquals(expected, OrderWorkflowService.date("2027-09-16 23:29:32.423709"));
        assertEquals(expected, AcceptanceWarrantyService.parseLocalDate("2027-09-16 23:29:32.423709"));

        // 2. java.sql.Timestamp instance
        Timestamp ts = Timestamp.valueOf("2027-09-16 23:29:32.423709");
        assertEquals(expected, OrderWorkflowService.date(ts));
        assertEquals(expected, AcceptanceWarrantyService.parseLocalDate(ts));

        // 3. java.sql.Date instance
        java.sql.Date sqlDate = java.sql.Date.valueOf("2027-09-16");
        assertEquals(expected, OrderWorkflowService.date(sqlDate));

        // 4. Standard ISO-8601 string
        assertEquals(expected, OrderWorkflowService.date("2027-09-16"));

        // 5. ISO LocalDateTime string
        assertEquals(expected, OrderWorkflowService.date("2027-09-16T23:29:32.423709"));

        // 6. LocalDateTime & OffsetDateTime
        assertEquals(expected, OrderWorkflowService.date(LocalDateTime.of(2027, 9, 16, 10, 30)));
        assertEquals(expected, OrderWorkflowService.date(OffsetDateTime.of(2027, 9, 16, 10, 30, 0, 0, ZoneOffset.UTC)));

        // 7. Null returns null
        assertNull(OrderWorkflowService.date(null));
        assertNull(AcceptanceWarrantyService.parseLocalDate(null));
    }
}
