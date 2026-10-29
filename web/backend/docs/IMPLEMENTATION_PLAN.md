# Kế hoạch hoàn thiện backend SmartBox

Ngày khảo sát: 10/10/2026. Giữ Spring Boot 3.4.3, Java 21, Gradle, PostgreSQL và kiến trúc controller/service/repository hiện có. README ghi Java 17 nhưng build thực tế yêu cầu 21. Không sửa frontend, seed dữ liệu mẫu, reset DB hoặc commit/push.

## Căn cứ và quyết định tương thích

Đã đọc bốn tài liệu người dùng cung cấp: đề cương chính thức DOCX, đề cương chi tiết PDF (14 trang), modules website PDF (3 trang), requirements DOCX (REQ-01 đến REQ-05). Các tài liệu là căn cứ nghiệp vụ; yêu cầu trực tiếp trong Master Context có ưu tiên khi có khác biệt.

- Schema thực tế dùng `profiles` liên kết `auth.users`; giữ Supabase Auth thay vì tạo bảng users/password thứ hai. Mật khẩu phải được xác minh bởi Auth provider.
- Giữ `products.price + product_variants.price_delta` làm nguồn giá. `products.stock_quantity` giữ cho API cũ; tồn kho bán hàng mới chỉ dùng variant.
- Bổ sung size/capacity/is_active cho variant, không suy diễn hoặc seed kích cỡ cho dữ liệu hiện hữu.
- REQ-01 dùng productId và LONG: chuyển sang variantId và UUID theo SmartBox; unique theo (order_id, variant_id).
- REQ-02 cho admin xác nhận PAID trực tiếp: SmartBox yêu cầu qua PO Ticket; endpoint status không được bỏ qua duyệt.
- Giao vận trong enum hiện tại (`processing/shipping/delivered/refunded`) khác sáu trạng thái đã chốt. Giữ dữ liệu cũ nguyên trạng; đơn mới dùng sáu trạng thái, shipment/refund riêng. Đơn cũ cần kiểm tra thủ công trước khi đưa vào luồng mới, không giả định đã giữ kho.
- Đề cương chi tiết đưa Servo 0°=locked/90°=unlocked nhưng bước tự khóa ghi 90°: phải xác minh với firmware; backend không gửi góc servo, chỉ gửi LOCK/UNLOCK.
- Topic đề cương `delivery_box/{id}` khác fallback UI `smartbox/dev/{serial}`; topic thiết bị phải được cấu hình/đăng ký, không suy diễn từ dữ liệu giả.
- Requirements gốc chỉ email ORDER_PAID; SmartBox bổ sung thông báo ticket/cancel/refund/shipment. Thêm event key cho sự kiện lặp như Return/Resubmit để deduplicate từng sự kiện, không chặn email của vòng duyệt sau.
- Không có migration tool hiện tại. Thêm SQL migration đánh số, chạy có kiểm soát sau backup; không tự động áp dụng vào DB đang cấu hình.

## Thứ tự triển khai

1. Migration thêm cột snapshot/reservation/paid_at, constraint, ticket/history/payment idempotency/refund/outbox/shipment.
2. Order creation và item mutation: order lock, variant stock guard, quantity 1–99, snapshot, total tính server, hết hạn đơn nháp và hoàn kho đúng một lần.
3. Checkout: key 24 giờ, payment timeout, callback HMAC, amount/order validation, scheduler và callback cùng khóa order trước payment.
4. State machine duy nhất; paid + history + ticket + outbox trong một transaction.
5. Ticket return/resubmit/approve/reject với quyền và history; rejection tạo refund, không cho sửa paid items.
6. Outbox claim qua SKIP LOCKED; gửi SMTP ngoài transaction; retry/backoff/resend, template HTML, Gmail/Mailpit.
7. Shipment và gắn device serial/owner theo order item, trạng thái delivery riêng; báo cáo paidAt UTC+7 và dashboard có timeout/partial/executor.
8. IoT command/ACK/telemetry theo topic đã đăng ký, ownership, timeout; thông báo và lịch sử phân biệt bưu kiện với order bán thiết bị.
9. Security: chặn demo login, lấy role/lock từ DB, access/refresh token type, RBAC/ownership, hạn chế API public, không lộ lỗi nội bộ.
10. Unit/integration tests trên DB cô lập; kiểm tra build và startup. Ghi rõ kiểm thử cần broker/SMTP/FCM/thiết bị thật và các giới hạn môi trường.

## Rủi ro và vận hành

Migration phải dừng khi có duplicate order items hoặc tồn kho âm; không tự sửa hoặc gộp dữ liệu đã thanh toán. Không phục hồi stock cho đơn legacy vì không biết trước đó đã trừ hay chưa. Không suy diễn paid_at từ created_at. Supabase frontend đang đọc/ghi DB trực tiếp; cần RLS tương ứng và chuyển mutation order mới qua backend để không bypass inventory. Sửa frontend/RLS remote nằm ngoài quyền ghi DB trong lần chạy này.

SMTP là at-least-once: crash sau SMTP accept trước khi đánh dấu SENT có thể gửi lặp. Claim lease ngăn worker gửi đồng thời thông thường; không tuyên bố exactly-once SMTP. Payment/refund mock không đại diện gateway thật.
