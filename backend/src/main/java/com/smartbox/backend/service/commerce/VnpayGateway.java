package com.smartbox.backend.service.commerce;

import com.smartbox.backend.exception.AppException;
import com.smartbox.backend.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Cổng thanh toán VNPAY PAY 2.1.0 (Sandbox).
 * Đảm bảo các yêu cầu bảo mật: HMAC-SHA512, không in chuỗi bí mật ra log,
 * mã hóa tham số UTF-8 theo thứ tự từ điển, và kiểm tra tính toàn vẹn dữ liệu IPN/Return.
 */
@Service
public class VnpayGateway {

    @Value("${smartbox.vnpay.tmn-code:}")
    private String terminal;

    @Value("${smartbox.vnpay.hash-secret:}")
    private String secret;

    @Value("${smartbox.vnpay.url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}")
    private String url;

    @Value("${smartbox.vnpay.return-url:http://localhost:5173/payments/vnpay/return}")
    private String returnUrl;

    @Value("${smartbox.vnpay.environment:sandbox}")
    private String environment;

    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DATE = DateTimeFormatter
            .ofPattern("uuuuMMddHHmmss")
            .withResolverStyle(ResolverStyle.STRICT);

    public record Notification(
            String reference,
            String terminal,
            BigDecimal amount,
            boolean success,
            String transactionNo,
            String responseCode,
            String transactionStatus,
            OffsetDateTime paidAt,
            String fingerprint
    ) {}

    public static class InvalidNotification extends RuntimeException {
        private final String code;

        public InvalidNotification(String code) {
            super("Invalid VNPAY notification: code=" + code);
            this.code = code;
        }

        public String code() {
            return code;
        }
    }

    public String terminal() {
        configured();
        return terminal;
    }

    /**
     * Xác thực các tham số cấu hình sandbox của VNPAY.
     */
    public void configured() {
        if (terminal == null || !terminal.matches("[A-Za-z0-9]{8}")
                || secret == null || secret.length() < 32
                || !"sandbox".equals(environment)
                || !"https://sandbox.vnpayment.vn/paymentv2/vpcpay.html".equals(url)) {
            throw new AppException(503, "VNPAY_SANDBOX_NOT_CONFIGURED");
        }

        try {
            var uri = URI.create(returnUrl);
            if (uri.getHost() == null || uri.getUserInfo() != null || uri.getFragment() != null
                    || uri.getRawQuery() != null || !Set.of("https", "http").contains(uri.getScheme())) {
                throw new IllegalArgumentException();
            }
            if ("http".equals(uri.getScheme()) && !Set.of("localhost", "127.0.0.1").contains(uri.getHost())) {
                throw new IllegalArgumentException();
            }
        } catch (Exception ex) {
            throw new AppException(503, "VNPAY_RETURN_URL_INVALID");
        }
    }

    /**
     * Sắp xếp và mã hóa các trường theo chuẩn canonical của VNPAY.
     */
    public static String canonical(Map<String, String> fields) {
        return new TreeMap<>(fields).entrySet().stream()
                .filter(e -> e.getKey().startsWith("vnp_")
                        && !Set.of("vnp_SecureHash", "vnp_SecureHashType").contains(e.getKey())
                        && e.getValue() != null && !e.getValue().isEmpty())
                .map(e -> encode(e.getKey()) + "=" + encode(e.getValue()))
                .collect(Collectors.joining("&"));
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    /**
     * Tính toán chữ ký HMAC-SHA512 cho danh sách tham số.
     */
    public String signature(Map<String, String> fields) {
        configured();
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] hashBytes = mac.doFinal(canonical(fields).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Không thể tạo chữ ký HMAC-SHA512", ex);
        }
    }

    /**
     * Tạo đường dẫn thanh toán VNPAY sandbox.
     */
    public String paymentUrl(UUID payment, BigDecimal amount, OffsetDateTime created, OffsetDateTime expires, String ip) {
        configured();
        String value;
        try {
            value = amount.movePointRight(2).toBigIntegerExact().toString();
            if (amount.signum() <= 0 || amount.stripTrailingZeros().scale() > 0 || value.length() > 12) {
                throw new ArithmeticException();
            }
        } catch (ArithmeticException ex) {
            throw new BadRequestException("VNPAY_AMOUNT_REQUIRES_WHOLE_VND");
        }

        var params = new TreeMap<String, String>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", terminal);
        params.put("vnp_Amount", value);
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", payment.toString().replace("-", ""));
        params.put("vnp_OrderInfo", "Thanh toan SmartBox " + payment);
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        OffsetDateTime safeExpires = (expires != null && expires.isAfter(created.plusMinutes(20)))
                ? expires : created.plusMinutes(30);
        params.put("vnp_CreateDate", DATE.format(created.atZoneSameInstant(VIETNAM)));
        params.put("vnp_ExpireDate", DATE.format(safeExpires.atZoneSameInstant(VIETNAM)));
        params.put("vnp_ReturnUrl", returnUrl);
        params.put("vnp_IpAddr", (ip == null || !ip.matches("[0-9a-fA-F:.]{3,45}")) ? "127.0.0.1" : ip);

        return url + "?" + canonical(params) + "&vnp_SecureHash=" + signature(params);
    }

    /**
     * Xác thực thông điệp gửi về từ VNPAY (IPN hoặc Return URL).
     */
    public Notification verify(MultiValueMap<String, String> input) {
        configured();
        var fields = new TreeMap<String, String>();

        if (input.size() > 40) {
            throw new InvalidNotification("97");
        }

        for (var entry : input.entrySet()) {
            if (!entry.getKey().startsWith("vnp_")) {
                continue;
            }
            if (!entry.getKey().matches("vnp_[A-Za-z0-9_]{1,40}")
                    || entry.getValue() == null
                    || entry.getValue().size() != 1
                    || entry.getValue().getFirst() == null
                    || entry.getValue().getFirst().length() > 2000) {
                throw new InvalidNotification("97");
            }
            fields.put(entry.getKey(), entry.getValue().getFirst());
        }

        String received = fields.get("vnp_SecureHash");
        if (received == null || !received.matches("[0-9a-fA-F]{128}")) {
            throw new InvalidNotification("97");
        }

        byte[] receivedBytes = HexFormat.of().parseHex(received);
        byte[] expectedBytes = HexFormat.of().parseHex(signature(fields));
        if (!MessageDigest.isEqual(receivedBytes, expectedBytes)) {
            throw new InvalidNotification("97");
        }

        if (!terminal.equals(fields.get("vnp_TmnCode"))) {
            throw new InvalidNotification("97");
        }

        String ref = fields.get("vnp_TxnRef");
        if (ref == null || !ref.matches("[0-9a-fA-F]{32}")) {
            throw new InvalidNotification("01");
        }

        String amount = fields.get("vnp_Amount");
        if (amount == null || !amount.matches("[0-9]{1,12}") || new BigDecimal(amount).signum() <= 0) {
            throw new InvalidNotification("04");
        }

        String response = fields.get("vnp_ResponseCode");
        String status = fields.get("vnp_TransactionStatus");
        if (response == null || status == null || !response.matches("[0-9]{2}") || !status.matches("[0-9]{2}")) {
            throw new InvalidNotification("99");
        }

        if (fields.containsKey("vnp_CurrCode") && !"VND".equals(fields.get("vnp_CurrCode"))) {
            throw new InvalidNotification("04");
        }

        boolean success = "00".equals(response) && "00".equals(status);
        String transaction = fields.get("vnp_TransactionNo");
        OffsetDateTime paidAt = null;

        if (transaction == null || !transaction.matches("[0-9]{1,15}")
                || (success && new BigInteger(transaction).signum() <= 0)) {
            throw new InvalidNotification("99");
        }

        if (success && fields.get("vnp_PayDate") != null && !fields.get("vnp_PayDate").isBlank()) {
            try {
                paidAt = LocalDateTime.parse(fields.get("vnp_PayDate"), DATE).atZone(VIETNAM).toOffsetDateTime();
            } catch (Exception ex) {
                throw new InvalidNotification("99");
            }
        }

        String fingerprint;
        try {
            fingerprint = HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(canonical(fields).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Không thể tính fingerprint", ex);
        }

        return new Notification(
                ref.toLowerCase(Locale.ROOT),
                terminal,
                new BigDecimal(amount).movePointLeft(2),
                success,
                transaction,
                response,
                status,
                paidAt,
                fingerprint
        );
    }

    public static UUID paymentId(String reference) {
        return UUID.fromString(
                reference.substring(0, 8) + "-" +
                reference.substring(8, 12) + "-" +
                reference.substring(12, 16) + "-" +
                reference.substring(16, 20) + "-" +
                reference.substring(20)
        );
    }
}
