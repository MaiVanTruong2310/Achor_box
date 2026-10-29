# Chạy và tích hợp backend SmartBox

## Migration trước khi chạy ứng dụng

Quản trị mới / khách hàng riêng / ba role: chạy `011_customer_directory.sql` rồi `012_staff_roles.sql` sau 001–010. Role cũ được chuyển về PO và khóa để Admin xem xét. [Menu, quyền và khách hàng](ADMIN_WORKSPACE.md). Báo cáo hiện dùng Jasper với font đóng gói; không cần font-path ngoài.

Hóa đơn bán hàng HTML: chạy `010_sales_invoices.sql` sau 001–009; điền `INVOICE_SHOP_*` trước lần lập đầu tiên. Xem [mẫu, API và cấu hình](SALES_INVOICE.md).

VNPAY Sandbox: chạy `009_vnpay_sandbox.sql` sau 001–008 trước bản mới; xem [cấu hình và IPN/ReturnURL](VNPAY_SANDBOX.md). Provider có thể là mock hoặc VNPAY Sandbox. Mô tả mock-only trong snapshot cũ bên dưới được thay thế bởi cập nhật này.

Quản trị bán hàng/claim ảnh: chạy `008_customer_warranty_claims.sql` sau 001–007. Xem [hợp đồng API và Cloudinary](ADMIN_COMMERCE_COMPLETION.md). Có thể nạp `backend/.env` bằng `run-local.ps1`; backend tự nạp file này khi khởi động từ thư mục backend hoặc source_code.

Timeline/bảo hành/thông số SKU/dashboard: chạy migration `007_tracking_warranty_variant_specs.sql` sau 001–006 trước bản backend mới. Xem [hướng dẫn và hợp đồng](TRACKING_WARRANTY_SPECS_BACKLOG.md), đặc biệt policy bảo hành và duplicate warranty/device trước migration.

Customer Account đã triển khai: xem [hợp đồng và cấu hình Auth/email](CUSTOMER_ACCOUNT.md). Sau 001–005, chạy `006_customer_account.sql` trước bản ứng dụng mới; cấu hình template Reset Password theo tài liệu để dùng quên mật khẩu.

Delivery & Installation đã triển khai: xem [hợp đồng và hướng dẫn](DELIVERY_INSTALLATION.md). Sau 001–003, áp dụng `004_delivery_installation.sql` rồi `005_installation_completion_guard.sql` trên bản sao để kiểm tra trước khi cập nhật database thật; chạy schema trước bản ứng dụng mới.

## Migration cơ sở dữ liệu với Liquibase

Dự án hiện đã tích hợp **Liquibase** (`org.liquibase:liquibase-core`) tự động quản lý schema khi Spring Boot khởi động:
- Master changelog: `src/main/resources/db/changelog/db.changelog-master.xml`
- Các changeset: `src/main/resources/db/changelog/changesets/000_base_schema.xml` đến `012_staff_roles.xml`
- Cấu hình: `spring.liquibase.enabled=true` (có thể tắt qua biến môi trường `LIQUIBASE_ENABLED=false` nếu cần).
- Các changeset được thiết kế idempotent (dùng `IF NOT EXISTS`, trigger/function replace và `MARK_RAN`), an toàn khi chạy trên cả database mới tinh lẫn database đã có sẵn dữ liệu Supabase.
- Bảng lịch sử di chuyển schema được lưu tự động tại `DATABASECHANGELOG` và `DATABASECHANGELOGLOCK`.

Đơn tồn tại trước migration mang `workflow_version=1`. Không chuyển tự động sang luồng mới: thiếu bằng chứng giữ kho/paid_at. Đơn do backend tạo mang `workflow_version=2`. API mutation đơn legacy trả `LEGACY_ORDER_REVIEW_REQUIRED`; API đọc giữ dữ liệu cũ. Không suy diễn paid_at từ created_at hoặc từ enum trạng thái cũ. Script là thay đổi bổ sung, không có rollback xóa bảng vì có thể mất dữ liệu mới.

## Cấu hình và kiểm thử

Java **21**. Docker cần chạy để kiểm thử PostgreSQL/Testcontainers và full Spring Boot startup. Xem `backend/.env.example`; file này là danh sách biến môi trường, Backend tự nạp `backend/.env` khi chạy từ thư mục backend hoặc source_code, dùng UTF-8 và giữ ưu tiên cấu hình OS/CLI. Có thể dùng `--smartbox.env-file=<đường dẫn>` nếu chạy từ thư mục khác; `--smartbox.env-file.enabled=false` để tắt. Automated tests tắt việc nạp cấu hình local.

```powershell
$env:JAVA_HOME='C:\Program Files\Java\jdk-21.0.12'
.\gradlew.bat test bootJar --no-daemon
```

Nếu Docker mới từ chối Docker API của Testcontainers, build đã đặt phiên bản API mặc định `1.44`; có thể thay qua `DOCKER_API_VERSION`. Trên Windows Docker Desktop dùng engine Linux. Báo cáo nằm trong `build/reports/tests/test/index.html`; khi Docker không chạy, các test PostgreSQL có thể bị skip, không được coi là đã kiểm chứng PostgreSQL.

Để chạy thật, export `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PAYMENT_HMAC_SECRET` (ít nhất 32 ký tự). `SUPABASE_SERVICE_ROLE_KEY` chỉ dùng trên backend khi tạo nhân viên, không đưa ra frontend. Profile người dùng phải có UUID trùng `auth.users.id`; role và trạng thái khóa đọc từ DB.

`SMARTBOX_JOBS_ENABLED=true` bật hủy đơn quá hạn và worker email. Nếu tắt, các đơn giữ kho sẽ không được scheduler thu hồi tự động. `MAIL_ENABLED=true` và địa chỉ gửi hợp lệ bật gửi email. Mailpit: localhost:1025, không auth/TLS. Gmail: smtp.gmail.com:587, `SMTP_AUTH=true`, `SMTP_STARTTLS=true`, username và app password qua môi trường. Chưa gửi email qua tài khoản thật trong lần sửa này.

`REPORT_FONT_PATH` trỏ font TTF hỗ trợ tiếng Việt (Windows mặc định Arial). Thiếu font trả 503, không tạo PDF mất dấu. Report được dựng bằng OpenPDF/POI, không dùng JasperReports vì giữ một template SQL có tham số trong DB và không cần jrxml runtime.

## API thương mại mới

Payment: xem [vòng đời, đối soát nội bộ và nhãn giả lập](PAYMENT_LIFECYCLE.md). Provider hiện luôn mock; profile demo cần HMAC secret hợp lệ và bật jobs nếu muốn trình diễn timeout tự động.

Mọi API dưới đây cần `Authorization: Bearer <Supabase access token>`, ngoại trừ callback. Không chấp nhận userId/role/price từ client. Giữ đường dẫn API cũ nhưng khóa các thao tác bỏ qua thanh toán/duyệt. Response của API thương mại mới dùng Map/JSON; các field nghiệp vụ trong `items` có snapshot, đối tượng ticket/shipment vẫn có các tên cột snake_case.

| Method/path | Nội dung/quyền |
|---|---|
| POST `/api/orders` | Tạo đơn của principal: `{shippingAddress,items:[{variantId,quantity}]}`; số lượng 1–99; SKU trùng được gộp |
| GET `/api/orders/my-orders?page=0&size=20` | Đơn của chủ tài khoản |
| GET `/api/orders/{id}` và `/{id}/history` | Chủ đơn hoặc nhân viên được phân quyền |
| POST `/api/orders/{id}/items` | Chủ đơn, pending: `{variantId,quantity}` |
| PATCH `/api/orders/{id}/items/{variantId}` | `{quantity}`; cập nhật tổng server và delta kho |
| DELETE `/api/orders/{id}/items/{variantId}` | Chủ đơn pending; trả kho |
| POST `/api/orders/{id}/checkout` | Chủ đơn; header `Idempotency-Key` bắt buộc, tối đa 128 ký tự, lưu 24 giờ |
| POST `/api/orders/{id}/cancel` | `{reason}`; chủ đơn trước thanh toán, nhân viên xử lý sau thanh toán; đã ship không hủy |
| POST `/api/payments/callback` | Không Bearer; `{paymentId,orderId,amount,result,signature}` với HMAC |
| GET `/api/tickets` và `/{id}` | List chỉ nhân viên; detail cho chủ đơn hoặc nhân viên được phân quyền |
| POST `/api/tickets/{id}/approve` | super_admin/support_agent; confirmed và tạo shipment |
| POST `/api/tickets/{id}/return` hoặc `/reject` | super_admin/support_agent; `{reason}` |
| POST `/api/tickets/{id}/resubmit` | Chủ đơn RETURNED; `{reason}`; tăng vòng duyệt |
| POST `/api/orders/{id}/devices` | Đã ngừng mutation: 409; dùng DeliveryInstallation |
| POST `/api/orders/{id}/shipment/ship` | Đã ngừng mutation: 409; dùng DeliveryInstallation |
| POST `/api/orders/{id}/shipment/deliver` | Đã ngừng mutation: 409; chỉ nghiệm thu đạt mới completed |
| PATCH `/api/products/{id}/variants/{variantId}/stock` | super_admin/product_manager: `{delta}`; ghi inventory movement |
| GET `/api/admin/refunds` | super_admin/accountant; phân trang |
| POST `/api/admin/refunds/{id}/complete` | `{providerRef}`; chỉ sau đối soát hoàn tiền thực tế |
| GET `/api/admin/emails?status=FAILED` | super_admin/support_agent; phân trang theo trạng thái |
| POST `/api/admin/emails/{id}/resend` | super_admin/support_agent; chỉ FAILED; reset attempts rồi đưa về PENDING |

Chuỗi HMAC UTF-8: `paymentId|orderId|amount|result`. UUID dạng chuỗi chuẩn; amount dùng `BigDecimal.stripTrailingZeros().toPlainString()`; result `SUCCESS` hoặc `FAILED`; HmacSHA256, hex. Callback sai chữ ký 401; sai amount/order 400; callback hợp lệ trùng chỉ ACK. Khóa order trước payment để callback/scheduler/refund không deadlock. Paid + order history + ticket + ticket history + outbox cùng transaction.

Checkout hiện là **provider mô phỏng**. Chạy profile `demo` mới có GET `/mock-payment/payments/{paymentId}` và POST `/{paymentId}/complete?result=SUCCESS` hoặc FAILED; cần Bearer của chủ đơn. URL trả về là endpoint JSON, chưa có trang thanh toán. Demo timeout 1 phút, retry email 5 giây. `DEMO_FAIL_AFTER_PAID=true` cố tình rollback để trình diễn; chỉ dùng DB thử. Không bật demo khi nhận tiền thật. Gateway thật và việc chuyển tiền refund chưa triển khai; API refund hoàn tất chỉ ghi đối soát, không chuyển tiền.

## Reports/dashboard

GET `/api/reports/RPT_REVENUE_DAILY` trả ParamSet từ DB. POST `/api/reports/RPT_REVENUE_DAILY/export` body:

```json
{"format":"PDF","params":{"fromDate":"2026-10-01","toDate":"2026-10-03"}}
```

Có thể dùng XLSX; customerId UUID và minAmount DECIMAL là tham số tùy chọn. Khoảng ngày mặc định tối đa 92 ngày theo metadata. Trả tất cả lỗi params trong một lần; bind typed parameters, không nối dữ liệu client thành SQL. Definition/query chỉ DBA được sửa; template phải SELECT đơn. Doanh thu đơn hợp lệ dùng paid_at UTC+7; tiền đã thu/đã hoàn/dòng tiền hiển thị riêng, có ngày 0 doanh thu.

GET `/api/admin/dashboard?date=2026-10-10` (super_admin/accountant) có revenueToday/orderCountByStatus/top5Variants/lowStockVariants/partial/failedParts/elapsedMs. Bốn phần chạy song song, pool 4, queue 50, timeout 1500 ms; phần lỗi null, không mất kết quả tốt. Quá tải trả 503. Timeout response không đồng nghĩa truy vấn JDBC đã hủy; cần statement_timeout ở DB và kiểm thử tải trước production.

## IoT, notifications và hợp đồng firmware

- POST `/api/devices/register`: nhân viên, `{serialNumber,variantId,mqttTopicId,name}`. Topic prefix cấu hình rõ, ví dụ `delivery_box/{id}`, không suy diễn từ serial.
- GET `/api/devices/my-devices`; POST `/api/devices/{id}/activate`: owner, sau giao hàng completed.
- POST `/api/devices/{id}/commands`: owner, `{command:"UNLOCK",requestKey:"<UUID>"}`; LOCK/UNLOCK/TARE. Yêu cầu activated, online, MQTT enabled. TARE chỉ khi product có has_weight_sensor. Cùng key/cùng command idempotent; tối đa 20 lệnh/phút/thiết bị.
- GET `/api/devices/{id}/commands/{commandId}`; `/{id}/packages` và `/{id}/readings`: owner, phân trang.
- POST `/api/notifications/tokens`: `{token}`; DELETE `/tokens/{id}`; GET `/api/notifications`; PATCH `/{id}/read`; PUT `/preferences/PACKAGE_DETECTED` với `{enabled}`. Mọi truy cập theo principal.

`MQTT_ENABLED=true` yêu cầu broker URL/user/password. Backend subscribe topic prefix `/status`, `/sensor`, `/ack`; publish `/command`, QoS 1, không retained. TLS dùng broker `ssl://...`; tài khoản thiết bị phải được broker ACL giới hạn topic của mình. Backend topic binding không thay thế ACL broker.

Payload command có commandId/action/requested_by/timestamp. Firmware phải thực hiện commandId đúng một lần và gửi ACK `{commandId,result:"SUCCESS"}` hoặc FAILED trên prefix của thiết bị; trạng thái cửa/khóa gửi riêng trên `/status` `{door:"closed",lock:"locked"}`. Backend không gửi góc servo: tài liệu có mâu thuẫn 0°/90° cần xác minh phần cứng. Retry tối đa 3, timeout 10 giây, thiết bị offline sau 90 giây không telemetry. `/sensor` nhận `{package_detected:true,weight:1.5,distance_cm:10}`; Base không loadcell nên không lưu weight làm số đo thật. False→true tạo một bưu kiện/notification; false sau đó ghi collected. Đây là lịch sử bưu kiện, độc lập order bán SmartBox.

`FCM_ENABLED=true`, `FCM_PROJECT_ID`, `FCM_CREDENTIALS_FILE` trỏ service account để chạy FCM HTTP v1. Token theo user, push outbox retries và ghi success theo token. Chưa kiểm tra delivery thật trên điện thoại, broker hoặc firmware ESP32. Email/FCM đều có thể gửi lặp khi dịch vụ đã nhận nhưng worker crash trước ghi success; không cam kết exactly-once cho hệ thống bên ngoài.

## Thay đổi mà frontend cần xử lý

Frontend chưa sửa trong lần này. Login phải dùng tài khoản Supabase thật; API private cần Bearer. Demo password và OTP preview bị loại bỏ; recovery đi qua Supabase email link. Legacy hotline verify-reset trả 503 thay vì trả thành công giả. Các status mutation paid/confirmed/completed qua PATCH cũ trả conflict hướng sang workflow actions. Soft delete product/variant giữ FK; cập nhật product cần gửi ID variant cũ để giữ identity. Product stock không đại diện stock SKU. Tích hợp callback, checkout key, ticket, shipment, dashboard partial và các trạng thái mới theo bảng API trên. Không ghi trực tiếp orders/payments/stock từ frontend nếu muốn giữ invariants.

REQ-05: xem [hướng dẫn dashboard](REQ05_DASHBOARD.md) để cấu hình demo delay/fail, so sánh tuần tự và quy tắc thống kê SKU.

## AUTH_PROVIDER_NOT_CONFIGURED

Lỗi 503 này xuất hiện khi runtime thiếu SUPABASE_URL hoặc SUPABASE_ANON_KEY. File .env của backend khác file .env của Vite. Sau khi sửa cấu hình hoặc nâng bản backend, dừng và khởi động lại tiến trình backend. Bản mới tự nạp .env từ backend/source_code; run-local.ps1 vẫn dùng được. SUPABASE_SERVICE_ROLE_KEY chỉ cần cho các thao tác quản trị Auth, không phải điều kiện kiểm tra phiên đăng nhập cơ bản. Không dùng access_token/refresh_token thay cho API key.
