package com.smartbox.backend.service.admin;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/** HTML mail bodies for customer messages that are not tied to an order template in the database. */
public final class CustomerMailBodies {

    public record Rendered(String subject, String html) {}

    private CustomerMailBodies() {}

    public static boolean supports(String template) {
        return "TECHNICIAN_ARRIVING".equals(template) || "WARRANTY_EXPIRING".equals(template);
    }

    public static Rendered render(String template, Map<String, Object> payload) {
        return switch (template) {
            case "TECHNICIAN_ARRIVING" -> arriving(payload);
            case "WARRANTY_EXPIRING" -> warrantyExpiring(payload);
            default -> throw new IllegalArgumentException("UNSUPPORTED_TEMPLATE");
        };
    }

    private static Rendered arriving(Map<String, Object> p) {
        String body = paragraph("Xin chào " + esc(p.get("customer_name")) + ",")
                + paragraph("Kỹ thuật viên <strong>" + esc(p.get("technician_name")) + "</strong> dự kiến tới lúc <strong>"
                + esc(p.get("scheduled_time")) + "</strong> để giao và lắp đặt cho đơn #" + esc(p.get("order_code")) + ".")
                + paragraph("Số điện thoại kỹ thuật viên: <strong>" + esc(p.get("technician_phone")) + "</strong>. Vui lòng có mặt tại địa chỉ nhận hàng.");
        return new Rendered("Kỹ thuật viên sắp tới, đơn #" + text(p.get("order_code")), page("Kỹ thuật viên sắp tới", body));
    }

    @SuppressWarnings("unchecked")
    private static Rendered warrantyExpiring(Map<String, Object> p) {
        StringBuilder plans = new StringBuilder();
        Object raw = p.get("plans");
        if (raw instanceof List<?> list && !list.isEmpty()) {
            plans.append("<p style=\"margin:16px 0 8px;font-weight:600\">Các gói gia hạn</p><table style=\"width:100%;border-collapse:collapse\">");
            for (Object item : list) {
                Map<String, Object> plan = (Map<String, Object>) item;
                plans.append("<tr><td style=\"padding:10px 0;border-top:1px solid #e5e5ea\">").append(esc(plan.get("name")))
                        .append(" (thêm ").append(esc(plan.get("extra_months"))).append(" tháng)</td>")
                        .append("<td style=\"padding:10px 0;border-top:1px solid #e5e5ea;text-align:right;font-weight:600\">")
                        .append(esc(plan.get("price_formatted"))).append("</td></tr>");
            }
            plans.append("</table>");
        }
        String button = "<p style=\"margin:24px 0\"><a href=\"" + esc(p.get("contact_url"))
                + "\" style=\"display:inline-block;padding:12px 20px;border-radius:12px;background:#007AFF;color:#ffffff;text-decoration:none;font-weight:600\">Liên hệ tư vấn gia hạn</a></p>";
        String body = paragraph("Xin chào " + esc(p.get("customer_name")) + ",")
                + paragraph("Bảo hành của <strong>" + esc(p.get("device_name")) + "</strong> sẽ hết hạn vào ngày <strong>"
                + esc(p.get("end_date")) + "</strong>, còn " + esc(p.get("days_left")) + " ngày.")
                + plans + button;
        return new Rendered("Bảo hành sắp hết hạn sau " + text(p.get("days_left")) + " ngày", page("Bảo hành sắp hết hạn", body));
    }

    private static String page(String title, String body) {
        return "<div style=\"background:#f2f2f7;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#000\">"
                + "<div style=\"max-width:520px;margin:0 auto;background:#ffffff;border-radius:18px;padding:24px\">"
                + "<h1 style=\"font-size:22px;margin:0 0 16px\">" + esc(title) + "</h1>" + body
                + "<p style=\"margin:24px 0 0;font-size:13px;color:#8e8e93\">AnchorBox Vietnam</p></div></div>";
    }

    private static String paragraph(String html) {
        return "<p style=\"margin:0 0 12px;font-size:16px;line-height:22px\">" + html + "</p>";
    }

    private static String text(Object value) {
        return Objects.toString(value, "");
    }

    private static String esc(Object value) {
        return text(value).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;");
    }
}
