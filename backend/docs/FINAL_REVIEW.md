# Kết quả sửa backend SmartBox — 10/10/2026

Đã sửa trực tiếp backend hiện có, ưu tiên hoàn thành Order → Inventory → Payment → PO Ticket → Email Outbox và nối shipment/device ownership. Đã đọc bốn tài liệu theo Master Context, xuất audit matrix và implementation plan trước khi sửa. Không viết lại dự án, không thay frontend, không sử dụng dữ liệu mẫu từ requirements.docx, không chạy migration lên database người dùng, không commit/push.

Đây là bản backend đã build và kiểm thử trên PostgreSQL cô lập. **Không tuyên bố toàn bộ hệ thống production đã hoàn tất**: gateway thanh toán thật, kiểm chứng phần cứng/dịch vụ bên ngoài và một số module phụ còn thiếu như bảng dưới. Cấu hình, migration, hợp đồng API và việc frontend cần xử lý nằm trong [RUNBOOK.md](RUNBOOK.md).

## Coverage sau thay đổi

| Module | Kết quả và bằng chứng | Trạng thái thực tế |
|---|---|---|
| Order/items | `OrderWorkflowService.create/add/setQuantity/remove`: UUID principal, merge SKU, quantity, snapshot giá/tên/size/capacity, tổng server, pending-only | Đã triển khai; integration test |
| Inventory | Guarded variant update, order lock, UUID lock order thống nhất, movement ledger, reserve/release exactly once, expiry đơn nháp; `VariantInventoryService.adjust` | Đã triển khai; race test PostgreSQL |
| ProductVariant | Giữ ID khi update, deactivation khi bỏ SKU, soft delete, size S/M/L ↔ 45/85/150 khi khai báo, lock trước đọc trạng thái update | Đã sửa; khóa JPA được startup kiểm chứng, chưa có test tải đồng thời riêng cho toàn bộ ProductService |
| Payment | `PaymentService.checkout/callback/expire`, key 24h, HMAC, amount/order check, duplicate callback, late success→refund_required | Hoàn thành provider mô phỏng; gateway thật chưa triển khai |
| State machine | `OrderStateMachine` sáu trạng thái; không cho PATCH status bỏ qua payment/ticket | Đã triển khai; transition/race test |
| PO Ticket/history | `ApprovalTicketService.act`: Approve/Return/Resubmit/Reject, reason, role, owner, round, lock, independent history | Đã triển khai; concurrent review test |
| Refund | Request khi reject/cancel paid/late success, unique payment, manual reconciliation reference, history/audit/email | Đã triển khai sổ đối soát; không gọi dịch vụ chuyển tiền |
| Email | `OutboxService` MANDATORY business tx, event dedup/snapshot/claim lease/SKIP LOCKED; `EmailOutboxWorker` gửi ngoài tx, 50/10s, 5 retries, exponential backoff, resend, Thymeleaf tiếng Việt | Đã triển khai; rollback/retry/SMTP failure test, chưa gửi SMTP thật |
| Shipment | `FulfillmentService`: preparing/shipped/delivered + history, đúng số serial/variant, completed và owner sau delivered | Đã triển khai; integration test đầy đủ |
| Device activation | Đăng ký serial/topic/variant, sale link, owner-only activate sau completed | Đã triển khai; integration test |
| MQTT | `MqttIntegration/MqttDeviceService`: configured broker, subscribe/reconnect, command after commit, ACK binding, retry/timeout kể cả broker down, online/offline, readings/packages | Adapter và xử lý dữ liệu đã triển khai; unit/integration nghiệp vụ pass, chưa chạy với broker/ESP32 thật |
| Notifications/FCM | Notifications/preferences/token ownership, push outbox/per-token successes và retry HTTP v1 | Đã triển khai adapter; chưa kiểm thử Firebase/điện thoại thật |
| Reports | `RevenueReportService`: DB ParamSet và SELECT template, typed bind, gom lỗi, paid_at UTC+7, zero days, PDF font Việt/XLSX numeric, phân biệt dòng tiền/refunds | Đã triển khai; PostgreSQL/XLSX/PDF test và kiểm tra ảnh PDF |
| Dashboard | `ConcurrentDashboardService`: 4 parallel parts, executor bounded, timeout/partial/failedParts, MDC, 503 khi full; dashboard cũ dùng aggregate paid_at | Đã triển khai; concurrency/timeout/MDC/overload test |
| Auth/security | `SupabaseAuthGateway`, `JwtAuthenticationFilter`, `SecurityConfig`: password qua provider, fail closed, DB role/lock, private GET, CORS allowlist, traceId/error sanitation, auth rate limit | Local behavior kiểm thử; cần credentials/RLS và end-to-end Supabase thật |
| User | Tạo staff qua Auth admin, profile UUID đúng, compensation rollback; recovery provider; chống tự khóa/tự đổi role, support chỉ khóa customer, audit principal | Đã sửa; provisioning/recovery bên ngoài chưa kiểm thử thực tế |
| Warranty | Tra serial sai 404; không fake ngày/phone/hardware; validate status/technician role; technician chỉ sửa claim được giao | Một phần: chưa tự phát hành warranty khi deliver, chưa API customer tạo claim và policy CRUD |
| Content | API quản trị private; read tx tránh lazy error; category+status áp dụng đồng thời | CRUD hiện có giữ lại; chưa bổ sung toàn bộ public CMS/validation/sanitization HTML |
| Settings | Các API đọc cấu hình/template hiện có được RBAC bảo vệ | Chưa có đầy đủ CRUD category/shipping/payment; chỉnh template settings chưa nối với Thymeleaf outbox mới |
| Promotions | CRUD/validate coupon cũ giữ nguyên; checkout không nhận tổng/giá client | Chưa tích hợp coupon/discount/shipping fee vào workflow mới |
| Audit | Actor lấy từ principal, JSON serialize; transaction order/ticket/refund/command/stock; lock/role audit không swallow lỗi | Đã sửa luồng mới; chưa phủ toàn bộ mutation legacy bằng audit |

## Lỗi quan trọng đã sửa

1. `AuthService.login` trước đây chấp nhận password chung theo email; giờ chỉ nhận session đã xác minh bởi Supabase Auth. `JwtAuthenticationFilter` trước đây cho GET nhạy cảm public và catch lỗi vẫn tiếp tục; giờ 401/403 và kiểm tra role/lock DB.
2. `OrderService.updateOrderStatus` trước đây cho đổi status tùy ý; giờ workflow actions quyết định status. Legacy order không bị tự giả định inventory reservation.
3. `ProductService.updateProduct` trước đây xóa/recreate variants gây đổi identity hoặc lỗi FK. Giờ giữ ID, lock toàn bộ variants theo thứ tự trước cập nhật, deactive variant bỏ khỏi request, soft-delete product. Stock âm không còn bị clamp về 0.
4. Stock mutation mới atomic theo SKU, giữ kho trong cùng transaction với order item và hoàn kho đúng một lần; merge duplicate items trước reservation. Callback/scheduler/review cùng khóa order đầu tiên.
5. Giá/tên SKU đã mua dùng snapshot; Order/Device/Warranty mappers không dựng transaction ref, MAC/IP/pin battery hoặc warranty giả khi thiếu dữ liệu.
6. `WarrantyService.lookupWarrantyBySerial` không trả bảo hành hợp lệ cho serial bất kỳ; ngày và số điện thoại lấy dữ liệu thật. Technician phải hợp lệ và không bị khóa; status không hợp lệ trả 400.
7. Enum và JSONB JPA có explicit PostgreSQL casts. `BackendApplicationTests` đã save/read profile role enum và product images JSONB trên schema thật được clone.
8. Lỗi hệ thống không trả SQL/credentials qua ex.message; traceId hỗ trợ nối request với log. CORS bỏ wildcard khi credentials, secret chuyển sang môi trường.

## Kiến trúc và refactor

Giữ modular monolith controller/service/repository, thêm service theo nghiệp vụ thay vì interface cho mọi class. JDBC dùng cho lock/update/aggregate đặc thù PostgreSQL; JPA giữ quản trị catalog/user/device hiện có. `CurrentActor` tập trung principal và role/owner checks; state machine tập trung transition; outbox tách side effect mạng khỏi transaction business. Scheduler gọi public service qua Spring proxy, không self-invocation transaction giả. Worker MQTT nhận domain event AFTER_COMMIT.

Giới hạn clean code còn lại: các service cũ và mapper có logic mapping trùng; DTO Map của API mới chưa mạnh kiểu như DTO cũ; một số legacy list/customer360/warranty còn đọc nhiều bản ghi/N+1; JSON cast explicit gắn PostgreSQL; chưa tách HTTP contract tests cho tất cả endpoint. Không thêm design pattern chỉ để làm phức tạp.

## Migration và tác động API

- `001_order_enum.sql`: thêm awaiting_payment/paid; phải commit trước script 002.
- `002_commerce.sql`: variant metadata/checks, order version/paid_at/expiry/release marker, item snapshots/unique, payment expiry/index, checkout keys/history/movements/tickets/refunds/outbox/shipments/report metadata, sale link cho device. Report definitions là cấu hình nghiệp vụ, không seed khách hàng/sản phẩm.
- `003_iot.sql`: weight capability, variant/topic association, durable commands/status/requestKey/attempts/ACK/expiry, readings, packages, tokens và push outbox/deliveries.

Không xóa bảng hoặc tự backfill trạng thái/tồn kho/paid_at legacy. `database.sql` được giữ nguyên. Chưa có migration runner tự quản version; operator phải ghi nhận script đã chạy và không chạy lại scripts additive.

API mới đầy đủ liệt kê trong RUNBOOK. Thay đổi hành vi cần tích hợp frontend: Bearer trên API private; password/refresh/recovery thật; OTP preview không còn; hotline verify-reset trả 503 khi chưa có provider workflow an toàn; status cũ không được set paid/confirmed/completed trực tiếp; product deletion là soft delete; stock theo SKU; new order có awaiting_payment/paid; checkout cần idempotency key. Giữ các path đọc cũ và field DTO cũ, thêm field mới. Đây là thay đổi security/business behavior có thể ảnh hưởng UI đang dựa vào demo logic; chưa sửa frontend.

## Kết quả kiểm thử

Lệnh: `gradlew.bat test bootJar --no-daemon`, Java 21, Docker Desktop Linux, Testcontainers PostgreSQL 16. Bộ kiểm thử 51 test: **50 pass, 0 fail, 1 skip**. Test bị skip chỉ là timezone SQL trên H2; cùng test đã pass trên PostgreSQL.

| Suite | Test/pass/skip | Phạm vi |
|---|---|---|
| BackendApplicationTests | 1/1/0 | Full Spring Boot/Tomcat random port, clone schema thực tế, ba migrations, anonymous orders 401/catalog 200, JPA enum/JSONB write-read |
| PostgresCommerceIntegrationTests | 20/20/0 | Workflow, migrations, locks/races, expiry/refund/outbox, reports, delivery/device, MQTT nghiệp vụ trên PostgreSQL |
| CommerceIntegrationTests | 20/19/1 | Workflow nhanh trên H2; timezone dành PostgreSQL |
| DashboardAndEmailTests | 4/4/0 | Four-way concurrency, MDC, partial timeout, queue rejection, template render rồi SMTP failure |
| SecurityTests | 6/6/0 | Private GET, public catalog/callback, wrong roles, account lock, provider fail closed, không bypass bằng demo password |

Đã tạo `build/libs/backend-0.0.1-SNAPSHOT.jar`. Các test concurrency bao gồm chống overselling, callback-vs-timeout và review đồng thời; rollback sau paid giữ payment pending và không tạo ticket/history/outbox. Callback duplicate không tạo event thứ hai. Outbox retry 5 lần/resend/claim token được kiểm tra. Delivery không đủ serial bị chặn; completed gắn đúng owner và chỉ owner activate; lệnh timeout khi không có ACK. PDF xuất với embedded Arial tiếng Việt, đọc lại được và render bằng Poppler để kiểm tra layout; XLSX có cell tiền kiểu numeric.

Nguồn kết quả máy: `build/test-results/test/TEST-*.xml` và `build/reports/tests/test/index.html`. Test DB chỉ ở containers tạm, không dùng Supabase/database đang cấu hình. Fixture là dữ liệu kiểm thử tự tạo, không lấy sample nghiệp vụ từ requirements.docx.

## Những việc còn cần làm trước triển khai thật

1. Backup, review dữ liệu legacy, chạy migration trên bản sao rồi DB đích; kiểm tra RLS/grants để frontend không bypass inventory/payment. Thêm credentials qua môi trường, bật scheduler có chủ đích.
2. Tích hợp frontend API trong RUNBOOK. Việc đọc/ghi Supabase trực tiếp hiện tại cần rà soát; backend không thể bảo đảm invariant nếu vẫn cho client ghi trực tiếp orders/payments/stock.
3. Gateway thật và refund provider; SMTP Mailpit/Gmail end-to-end; Supabase provisioning/recovery thực tế; MQTT TLS/ACL và firmware command dedup/ACK, GPIO/servo; Firebase device delivery. Chưa có bằng chứng thực tế cho các dịch vụ này, không thể đánh dấu production verified.
4. Warranty issuance/policy/customer claims, settings CRUD, public CMS và coupon/shipping fee integration là phần thiếu cụ thể trong matrix; không đưa sample hoặc chính sách giả vào DB để che phần thiếu.
5. Kiểm thử tải/N+1, DB statement_timeout và retention/cleanup checkout keys/readings/outboxes. Dashboard HTTP timeout không hủy chắc chắn JDBC query. Auth rate limiting hiện per-instance RAM/IP; cần gateway/distributed limiter nếu chạy nhiều instance; trusted proxy/X-Forwarded-For phải cấu hình đúng.
6. Quyền provisioning remote và local transaction không atomic: đã có compensation rollback nhưng nếu provider unavailable lúc compensation cần operator đối soát tài khoản orphan qua log. FCM token hết hiệu lực cần cleanup; SMTP/FCM delivery là at-least-once khi crash sau bên ngoài accept, không exactly-once.

2FA/IP whitelist/OTA/AI là phần mở rộng trong tài liệu modules, chưa được biến thành yêu cầu bắt buộc của bản sửa này.
