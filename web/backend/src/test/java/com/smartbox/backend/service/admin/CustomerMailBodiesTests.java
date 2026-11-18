package com.smartbox.backend.service.admin;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CustomerMailBodiesTests {

    private static Map<String, Object> arrival() {
        return Map.of("customer_name", "Lan", "technician_name", "Minh Kỹ Thuật", "technician_phone", "0901234567",
                "scheduled_time", "09:30 10/11/2026", "order_code", "AB12CD34");
    }

    private static Map<String, Object> warranty(String customer) {
        return Map.of("customer_name", customer, "device_name", "Hộp AnchorBox", "end_date", "30/11/2026", "days_left", 20,
                "plans", List.of(
                        Map.of("name", "Gia hạn 12 tháng", "extra_months", 12, "price_formatted", "990.000 ₫"),
                        Map.of("name", "Gia hạn 24 tháng", "extra_months", 24, "price_formatted", "1.790.000 ₫")),
                "contact_url", "https://shop.test/contact");
    }

    @Test
    void arrivalMailNamesTechnicianPhoneAndTime() {
        var mail = CustomerMailBodies.render("TECHNICIAN_ARRIVING", arrival());
        assertTrue(mail.html().contains("Minh Kỹ Thuật"));
        assertTrue(mail.html().contains("0901234567"));
        assertTrue(mail.html().contains("09:30 10/11/2026"));
        assertTrue(mail.subject().contains("AB12CD34"));
    }

    @Test
    void warrantyMailListsEveryPlanAndContactLink() {
        var mail = CustomerMailBodies.render("WARRANTY_EXPIRING", warranty("Lan"));
        for (String part : List.of("Gia hạn 12 tháng", "Gia hạn 24 tháng", "990.000 ₫", "1.790.000 ₫", "30/11/2026", "Hộp AnchorBox")) {
            assertTrue(mail.html().contains(part), part);
        }
        assertTrue(mail.html().contains("href=\"https://shop.test/contact\""));
        assertTrue(mail.html().contains("Liên hệ tư vấn gia hạn"));
        assertTrue(mail.subject().contains("20"));
    }

    @Test
    void warrantyMailStillRendersWithoutPlans() {
        var payload = new java.util.HashMap<>(warranty("Lan"));
        payload.put("plans", List.of());
        var mail = CustomerMailBodies.render("WARRANTY_EXPIRING", payload);
        assertTrue(mail.html().contains("href=\"https://shop.test/contact\""));
    }

    @Test
    void valuesAreHtmlEscaped() {
        var mail = CustomerMailBodies.render("WARRANTY_EXPIRING", warranty("<b>x</b>"));
        assertTrue(mail.html().contains("&lt;b&gt;x&lt;/b&gt;"));
        assertFalse(mail.html().contains("<b>x</b>"));
    }

    @Test
    void supportsOnlyTheTwoTemplates() {
        assertTrue(CustomerMailBodies.supports("TECHNICIAN_ARRIVING"));
        assertTrue(CustomerMailBodies.supports("WARRANTY_EXPIRING"));
        assertFalse(CustomerMailBodies.supports("ORDER_PAID"));
        assertEquals(false, CustomerMailBodies.supports(null));
    }
}
