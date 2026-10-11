# Requirements Coverage Matrix và source audit

Trạng thái dưới đây là trước thay đổi; coverage sau triển khai và kết quả kiểm thử ghi trong [FINAL_REVIEW.md](FINAL_REVIEW.md), hướng dẫn migration/API trong [RUNBOOK.md](RUNBOOK.md).

Kết quả bàn giao: luồng ưu tiên Order/Inventory/Payment mock/PO Ticket/Email Outbox/Shipment-ownership đã triển khai; reports/dashboard và adapters MQTT/FCM đã thêm. Build thành công, 50 test pass/0 fail/1 skip (H2 timezone; PostgreSQL pass). Settings CRUD, warranty issuance/customer claims, public CMS, coupon/shipping fee và kiểm chứng dịch vụ thật vẫn cần hoàn thiện; không đánh dấu các phần này Completed.

| Module | Requirement | Current Implementation | Status | Priority | Required Changes |
|---|---|---|---|---|---|
| Kiến trúc | Layered modular monolith | Controller/service/repository, DTO và mapper; mapper trùng service mapper | Needs Refactor | P1 | Giữ kiến trúc; tập trung rule, tránh interface vô nghĩa |
| Auth | Xác minh password/JWT/RBAC | AuthService.login chấp nhận password demo, JwtProvider default secret; filter GET public và fail-open catch | Incorrect | P0 | Auth provider thật; DB role, locked account; fail closed; scope API |
| Product | CRUD/category/variant | ProductService CRUD, giá price+delta; update xóa toàn bộ variant | Partially Implemented | P0 | Giữ variant ID, active/size/capacity; ngăn xóa SKU đã dùng |
| Inventory | Không overselling | adjustStock ở product, Math.max(0), không lock; không quản lý reservation | Incorrect | P0 | Variant guarded stock update, delta, expiry, inventory movement |
| Order | REQ-01 create/items | OrderController chỉ GET, status/tracking PATCH; OrderItem có variantId nhưng không snapshot/unique | Missing | P0 | Create/items CRUD, validation, merge, snapshot, ownership, transactions |
| Order status | State machine/history | OrderService.updateOrderStatus setStatus bất kỳ | Incorrect | P0 | Central transitions/history, sáu trạng thái cho order mới |
| Payment | REQ-02 | Payment entity/repository để đọc; không checkout/callback/scheduler | Missing | P0 | HMAC/idempotency/expiry/race handling/late refund |
| PO Ticket | Approve/Return/Resubmit/Reject | Không có | Missing | P0 | Ticket, history, role, lock, refund |
| Email | REQ-03 đầy đủ | EmailService sendHtmlEmail/OTP gửi trực tiếp, không outbox | Missing | P0 | Transactional outbox, worker, Thymeleaf, retry, resend |
| Refund | Nhất quán với payment/order | Enum có refunded nhưng không refund record | Missing | P1 | Refund request/completion, lịch sử, chống trùng |
| Shipment | Tracking/delivery history | updateTrackingNumber ghi string, không shipment/history | Partially Implemented | P1 | Shipment state riêng, delivery/serial ownership |
| Device | Monitoring/owner/events | DeviceService đọc trạng thái; mapToResponse giả IP/MAC/battery/ping | Incorrect | P0 | Trả dữ liệu thật hoặc null; ownership/registration/activation |
| MQTT | Command/ACK/telemetry | Chỉ dependency Paho, không integration | Missing | P0 | Broker cấu hình, command ID/ACK/timeout/reconnect, topic binding |
| FCM | Notification sau có bưu kiện | DB có notifications nhưng Java không triển khai | Missing | P1 | Notification persistence và FCM adapter có retry/config |
| Warranty | List/detail/assign/status/serial | WarrantyService có CRUD; serial không tồn tại vẫn trả bảo hành demo | Incorrect | P0 | 404 đúng, không bịa ngày/chính sách; validation/ownership |
| User | List/search/360/lock | UserService list/360/lock; createStaff chưa tạo auth.users; reset chỉ OTP cache | Partially Implemented | P1 | Auth provider provisioning/reset, không lộ OTP, search DB |
| Content | Article/banner/review/FAQ | ContentService CRUD; status filtering từng nhánh, public GET có thể đọc draft | Partially Implemented | P1 | Hạn chế public; validation/filter/pagination |
| Promotion | Coupon | PromotionService validation giá trị client, chưa dùng checkout | Partially Implemented | P2 | Không tin total client cho thanh toán; tích hợp coupon sau review |
| Settings | Category/shipping/payment | Read methods/template endpoints; không CRUD đầy đủ shipping/payment | Partially Implemented | P1 | CRUD dữ liệu cấu hình và role |
| Audit | ai/lúc nào/target | AuditLogService; nhiều actor null, JSON nối chuỗi | Incorrect | P1 | Actor từ principal, JSON serialize, atomic business history |
| Reports | REQ-04 ParamSet PDF/XLSX | Không có | Missing | P1 | DB definitions, validation tất cả lỗi, paidAt UTC+7, safe parameters |
| Dashboard | REQ-05 | DashboardService đọc toàn bảng tuần tự, thời gian createdAt, DTO không partial | Incorrect | P1 | Endpoint admin mới, aggregate SQL, bounded executor/MDC/timeout |
| JPA | PostgreSQL enum/json | String fields vào enum/jsonb thiếu JDBC mapping | Incorrect | P0 | Explicit enum casts/json mapping, integration test |
| Test | Build/startup/concurrency | Một contextLoads dùng DB cấu hình thật | Not Verified | P0 | DB test cô lập; tests core, SMTP/HMAC/role/race |
| Extension | 2FA/IP whitelist/OTA/AI | Không xác minh hoặc chưa có | Out of Scope | P2 | Không thêm bắt buộc từ ký hiệu mở rộng trong modules PDF |

## Vấn đề cần kiểm thử khi sửa

P0 `AuthService.login`: biết email + mật khẩu chung có thể chiếm tài khoản bất kỳ. Test sai password, tài khoản locked, access/refresh type, role không tin từ client.

P0 `JwtAuthenticationFilter.doFilterInternal`: GET orders/users/devices/audit public, customer có thể mutate phần lớn admin API; exception khi extract claims vẫn đi tiếp. Test 401 anonymous, 403 sai role, UUID subject sai và cross-owner.

P0 `OrderService.updateOrderStatus`: có thể pending→paid/completed tùy chuỗi mà không payment/history. Test invalid transition và ticket approval bắt buộc.

P0 `ProductService.updateProduct`: delete/recreate variant gây lỗi FK hoặc đổi SKU identity đã được mua. Test ID không đổi, variant đã dùng không bị xóa, tồn kho cập nhật đồng thời.

P0 `WarrantyService.lookupWarrantyBySerial`: serial bất kỳ được trả bảo hành hợp lệ. Test serial không tồn tại và thiết bị chưa có warranty.

P1 `OrderService.mapToResponse`, `DeviceService.mapToResponse`, `WarrantyService.mapToResponse`: dữ liệu tài chính/khách hàng/IoT giả che lỗi dữ liệu. Test null vẫn null; snapshot không đổi sau đổi tên/giá.

P1 `GlobalExceptionHandler.handleGeneralException`: trả ex.getMessage lộ SQL/config. Test lỗi nội bộ có message chung và traceId; input malformed trả 400.

P1 các service list/mappers: truy vấn N+1 và read toàn bảng (dashboard/customer360/warranty). Test phân trang, aggregate query và performance với dữ liệu lớn.
