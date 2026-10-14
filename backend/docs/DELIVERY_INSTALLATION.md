# DeliveryInstallation — giao thiết bị và lắp đặt

Module đã triển khai trong backend và web-admin. Một nhân viên `technician` giao hàng kiêm lắp đặt; không có Shipper Portal hoặc hệ thống logistics riêng. Tài liệu này cập nhật phần giao/lắp đặt trong bộ bàn giao snapshot 10/10/2026.

## Luồng và phân quyền

1. `super_admin` hoặc `support_agent` phân công nhân viên đang hoạt động, đặt lịch tương lai. Chỉ nhận đơn `workflow_version=2`, `CONFIRMED`, PO Ticket `APPROVED`; mỗi đơn có một công việc.
2. Nhân viên được phân công xem công việc, xác nhận nhận việc: `ASSIGNED → IN_PROGRESS`. Shipment chuyển sang `SHIPPED`.
3. Xác nhận giao: `IN_PROGRESS → DELIVERED`; shipment `DELIVERED`, đơn vẫn `CONFIRMED`.
4. Nhập serial thực tế cho từng dòng đơn. Serial phải đã đăng ký, đúng product/variant, đủ số lượng, chưa bán cho đơn khác. Thiết bị được gắn chủ sở hữu khi đã giao.
5. Ghi chú lắp đặt bắt buộc: `DELIVERED → INSTALLED`; đơn vẫn `CONFIRMED`.
6. Kiểm tra phần cứng và xác nhận khách nghiệm thu: `INSTALLED → COMPLETED`. Cập nhật công việc, bằng chứng nghiệm thu, trạng thái đơn, lịch sử và email outbox trong cùng transaction.

Nhân viên chỉ thao tác công việc được giao. Quản lý xem toàn bộ, phân công, ghi thất bại và phân công lại; không thay nhân viên xác nhận nghiệm thu. Khách chỉ đọc công việc thuộc đơn của mình với thông tin rút gọn, không nhận ghi chú nội bộ/lý do thất bại/lịch sử nhân viên.

Thất bại có lý do bắt buộc: trạng thái `FAILED`. Quản lý phân công lại từ `ASSIGNED` hoặc `FAILED`, tăng `attempt`, giữ lịch sử và mốc giao thực tế; bằng chứng kiểm tra của lần trước không được dùng nghiệm thu lần mới. Không phân công lại công việc đã hoàn tất. Hủy đơn trước khi nhận việc đóng công việc với `ORDER_CANCELLED`; sau khi bắt đầu giao, luồng hủy thông thường bị chặn.

## API

Mọi endpoint cần Bearer token; role/trạng thái khóa đọc từ database. M = quản lý (`super_admin`, `support_agent`), T = nhân viên được giao, C = chủ đơn.

| Method và path | Quyền | Body / kết quả |
|---|---|---|
| POST `/api/orders/{id}/delivery-installation` | M | `{assignedTo,scheduledAt,installationNote?}`; 201 |
| GET `/api/orders/{id}/delivery-installation` | M/T/C | Công việc của đơn |
| GET `/api/delivery-installations/eligible-orders` | M | Đơn đã duyệt chưa được phân công |
| GET `/api/delivery-installations/technicians` | M | Nhân viên hoạt động |
| GET `/api/delivery-installations` | M | Danh sách toàn bộ |
| GET `/api/delivery-installations/my-jobs` | T | Danh sách được giao cho người hiện tại |
| GET `/api/delivery-installations/{id}` | M/T/C | Chi tiết theo phạm vi |
| GET `/api/delivery-installations/{id}/checks` | M/T | Kết quả kiểm tra do server tính |
| POST `/{id}/start` dưới `/api/delivery-installations` | T | Không body |
| POST `/{id}/confirm-delivery` | T | `{note?}` |
| POST `/{id}/devices` | T | `{orderItemId,serialNumber}` |
| POST `/{id}/checks/commands` | T | `{deviceId,action:"LOCK"\|"UNLOCK"\|"TARE"}`; 202 |
| POST `/{id}/confirm-installation` | T | `{installationNote}` |
| POST `/{id}/acceptance` | T | `{customerAccepted:true,note?}` |
| POST `/{id}/fail` | M/T | `{failureReason}` |
| POST `/{id}/reassign` | M | `{assignedTo,scheduledAt,reason}` |

Tất cả mutation cần `Idempotency-Key` là UUID. Mutation công việc đã tồn tại cần `If-Match` chứa `version` hiện tại (số hoặc số trong dấu ngoặc kép). Thiếu header trả 400, version cũ trả 409. Retry cùng người/key/body/version trả snapshot đã lưu; đổi nội dung với cùng key trả 409. Sau retry phải GET lại trạng thái mới nhất. UI giữ key khi kết quả request chưa rõ, không tự tạo key mới để gửi lại thao tác cũ.

Danh sách dùng `page=0`, `size=20` (tối đa 100); danh sách công việc nhận thêm `status`. Response có `content`, `page`, `size`, `totalElements`, `totalPages`. Chuỗi ghi chú/lý do tối đa 2.000 ký tự, serial tối đa 100 ký tự; `scheduledAt` theo ISO timestamp có múi giờ và phải ở tương lai.

Chi tiết dùng camelCase: `id`, `orderId`, `orderStatus`, `assignedTo`, `status`, `attempt`, `version`, các mốc thời gian, `items`, `devices`; nhân viên nhận thêm liên hệ giao hàng, ghi chú và lịch sử. Không cung cấp giá/thanh toán trong màn hình công việc. `checks.ready` và các cờ thiết bị là kết quả server, không cho client tự đánh dấu đạt.

## Điều kiện nghiệm thu

- Đủ serial theo số lượng; liên kết dòng đơn, phiên bản và chủ sở hữu hợp lệ.
- MQTT được bật; thiết bị online, có topic và lần thấy gần nhất còn mới, sau thời điểm bắt đầu công việc.
- Lệnh UNLOCK và LOCK của **attempt hiện tại** được ACK thành công. Status phải mang đúng `commandId`, phát sinh sau lệnh và còn mới; trạng thái cuối cùng khóa đóng, cửa đóng.
- Thiết bị có cảm biến cân (snapshot capability khi gắn serial): TARE được ACK, baseline gắn đúng `commandId` và gần zero, sau đó nhận mẫu cân mới thay đổi đủ ngưỡng. Phiên bản không có cảm biến cân không yêu cầu bước này.
- Khách đồng ý nghiệm thu; nhân viên xác nhận `customerAccepted=true`.

Server khóa các bản ghi liên quan và kiểm tra lại khi nghiệm thu, không chỉ dựa vào kết quả GET trước đó. Lưu snapshot bằng chứng gồm command ID, event/reading ID, thời điểm và số đo. GET checks của công việc đã hoàn tất trả bằng chứng đã lưu (`recorded=true`), không đánh giá lại nghiệm thu lịch sử khi thiết bị mất mạng về sau.

Firmware cần nhận payload lệnh có `commandId` và `action`; ACK trả cùng `commandId` và `result=SUCCESS`. Status sau LOCK/UNLOCK phải trả cùng `commandId` cùng trạng thái cửa/khóa. Baseline sensor sau TARE phải trả cùng `commandId` và giá trị cân; mẫu kiểm tra tiếp theo phải mới hơn baseline. ACK và telemetry có thể đến theo bất kỳ thứ tự nào, nhưng phải sau lúc tạo lệnh. Broker phải giới hạn thiết bị đúng topic; chỉ ACK không đủ để nghiệm thu. Lệnh giới hạn 20/phút/thiết bị, timeout ACK 10 giây.

## Triển khai và cấu hình

Bản tích hợp Customer Account hiện tại cần thêm migration `006_customer_account.sql`; liên hệ giao/lắp đặt lấy từ snapshot trên Order. Xem [Customer Account](CUSTOMER_ACCOUNT.md).

**Chưa áp dụng migration vào database thật của người dùng.** Backup và thử trên bản sao trước; sau các migration 001–003, chạy lần lượt:

- `004_delivery_installation.sql`: năm bảng công việc, lịch sử, thiết bị, lệnh và idempotency. RLS bật, không cấp policy cho frontend; backend cần DB role phù hợp.
- `005_installation_completion_guard.sql`: PostgreSQL trigger chặn chuyển đơn sang `COMPLETED` nếu chưa có công việc nghiệm thu đạt. Không sửa đơn lịch sử đã hoàn tất.

Schema phải được cập nhật trước khi chạy bản backend mới. Không có Flyway tự áp dụng. Các endpoint cũ `POST /api/orders/{id}/devices`, `/shipment/ship`, `/shipment/deliver` trả 409 và hướng sang module này; không còn hoàn tất đơn chỉ vì đã giao. Trigger còn chặn đường ghi trực tiếp vào orders để bỏ qua nghiệm thu. Luồng đơn legacy vẫn yêu cầu xử lý nghiệp vụ riêng.

Biến môi trường (xem `.env.example`):

| Biến | Mặc định |
|---|---|
| `INSTALLATION_FRESHNESS_SECONDS` | 90 |
| `INSTALLATION_WEIGHT_MIN_DELTA_KG` | 0.05 |
| `INSTALLATION_TARE_TOLERANCE_KG` | 0.05 |

MQTT dùng cấu hình broker hiện có; không đưa mật khẩu vào frontend. Email outbox bổ sung `INSTALLATION_SCHEDULED`, `DEVICE_DELIVERED`, `INSTALLATION_DELAYED`, `INSTALLATION_COMPLETED`; cần cấu hình mail/worker hiện có để gửi thật.

## Giao diện và kiểm thử

Trang web-admin `/delivery-installations`: quản lý điều phối, nhân viên xem việc được giao, nhập serial, phát lệnh kiểm tra, ghi giao/lắp đặt/thất bại và nghiệm thu. Dùng API backend thật, không fallback mock hoặc ghi Supabase trực tiếp. Trang đơn hàng dẫn sang module này; đã bỏ thao tác giả chuyển đơn sang completed. Chi tiết kiểm tra được làm mới mỗi 5 giây khi đang mở; nghiệm thu yêu cầu kết quả cùng version và khách xác nhận.

Kiểm thử tự động bao gồm H2 và PostgreSQL cô lập: phân quyền, serial, idempotency, version, MQTT ACK/status tương quan, cảm biến cân, phân công lại, hủy trước giao, cạnh tranh nghiệm thu/thất bại, rollback khi outbox lỗi, trigger và RLS. Full Spring Boot HTTP kiểm tra token/role database, validation, phạm vi công việc, CORS và OpenAPI; identity provider được stub trong test. Web-admin được kiểm tra TypeScript và build.

Chưa kiểm thử end-to-end với thiết bị, broker, Supabase issuer và SMTP thật. Cần firmware echo `commandId` theo hợp đồng trên để nghiệm thu tự động. MVP chưa có đổi serial sau giao, quy trình hoàn trả sau giao, chữ ký khách hoặc tự dọn lịch sử/idempotency; `customerAccepted` là xác nhận do nhân viên nhập.
