# Timeline, bảo hành nghiệm thu, thông số biến thể và công việc tồn đọng

Bốn phần đã triển khai trong backend, web-shop và web-admin. Không có dữ liệu kích thước/ảnh được tự suy ra hoặc tự điền vào database thật.

## Timeline tổng hợp

GET `/api/orders/{id}/timeline` trả `{orderId,orderStatus,events}`. Mỗi event có `id` ổn định, `source` (`ORDER`, `PO_TICKET`, `DELIVERY_INSTALLATION`), `action`, `occurredAt`; sự kiện giao/lắp có thêm `attempt`, `version`. Sắp xếp theo thời điểm, source và ID để kết quả ổn định khi hai sự kiện cùng thời gian. Timeline phản ánh sự kiện đã ghi, không suy diễn ngày dự kiến thành ngày thực hiện.

Phân quyền:

- Khách: đơn của chính mình; không nhận reason nội bộ hoặc sự kiện lệnh kiểm tra thiết bị.
- Nhân viên lắp đặt: chỉ đơn có công việc được giao cho mình; không nhận reason nội bộ.
- Super admin/support/accountant: được xem lịch sử phục vụ điều phối/đối soát, gồm reason.

Đọc trong transaction REPEATABLE_READ. API `/api/customer/orders/{id}` và danh sách đơn trả thêm `timeline`, nên frontend không phải tự ghép ba endpoint. Web-shop hiển thị timeline hợp nhất trong chi tiết đơn, cùng trạng thái thanh toán và lịch giao/lắp hiện tại. API lịch sử Order cũ vẫn giữ tương thích.

## Bảo hành tự tạo khi nghiệm thu

Khi nghiệm thu đạt, backend cấp một bản ghi bảo hành cho **mỗi serial thực tế**, liên kết device/order item/job/acceptedAt. Việc cấp bảo hành, lưu bằng chứng nghiệm thu, hoàn tất job và Order, lịch sử và email outbox nằm cùng transaction. Xung đột bản ghi bảo hành cũ hoặc lỗi outbox rollback toàn bộ lần nghiệm thu.

Ngày bắt đầu là ngày nghiệm thu theo `Asia/Ho_Chi_Minh`; ngày kết thúc = ngày bắt đầu + số tháng − một ngày, tính bao gồm ngày cuối. Kích hoạt thiết bị hoặc retry cùng Idempotency-Key không đổi ngày bảo hành.

Thời hạn được chọn theo thứ tự:

1. `warrantyMonths` của SKU.
2. `warranty_policies.duration_months` theo category của sản phẩm.
3. `WARRANTY_DEFAULT_MONTHS`, mặc định **12 tháng**, phù hợp mặc định schema cũ.

Cho phép 1–120 tháng. Nhiều policy cùng category yêu cầu xử lý trước (`WARRANTY_POLICY_AMBIGUOUS`), không chọn ngẫu nhiên. Thời hạn được snapshot vào order item khi tạo dòng đơn; thay đổi SKU/policy sau đó không đổi thời hạn của dòng đã mua. Dòng workflow 2 có trước migration chưa có snapshot sẽ dùng policy đang cấu hình tại nghiệm thu và lưu kết quả; không xem đó là bằng chứng chính sách tại thời điểm mua cũ.

Không tự backfill bảo hành cho đơn đã nghiệm thu trước migration. Nếu device đã có bảo hành không gắn đúng job hiện tại, trả `EXISTING_WARRANTY_REVIEW_REQUIRED`, không ghi đè lịch sử. Đây là bước review cho dữ liệu cũ.

GET `/api/customer/warranties?page=0&size=20` trả `{content,page,size,totalElements,totalPages}`; chỉ thiết bị thuộc khách hiện tại. Mỗi bản ghi có serial, device/order ID, startDate/endDate/status/durationMonths/acceptedAt. Trạng thái hết hạn tính theo ngày Việt Nam. Web-shop `/account/warranties` đã dùng API thật; không còn danh sách bảo hành giả trong màn hình này.

## Thông số SKU

ProductVariant request/response bổ sung:

| Trường | Ý nghĩa |
|---|---|
| `modelTier` | `BASE` hoặc `PRO`; nullable cho dữ liệu chưa xác định |
| `widthCm`, `heightCm`, `depthCm` | Kích thước vật lý, đơn vị cm |
| `weightKg`, `maxLoadKg` | Khối lượng và tải trọng tối đa, kg |
| `images` | Tối đa 10 URL ảnh riêng của SKU |
| `hasWeightSensor` | Base=false, Pro=true; phải khớp modelTier |
| `warrantyMonths` | Thời hạn bảo hành; API catalog trả thời hạn hiệu lực theo policy/default nếu SKU chưa override |

Dung tích `capacityLiter` và size vẫn có; giữ quy tắc S=45L, M=85L, L=150L hiện tại. Kích thước không suy ra từ dung tích. Số đo phải dương; trường chưa biết để null. PATCH không gửi trường hoặc gửi null giữ giá trị cũ; `images:[]` bỏ ảnh riêng để dùng ảnh sản phẩm cha. URL ảnh chỉ nhận HTTP(S) hoặc đường dẫn bắt đầu bằng `/` trong website; không upload file qua API này.

PATCH `/api/products/{product}/variants/{id}/specifications` dành cho super_admin/product_manager; chỉ cập nhật metadata kỹ thuật, không sửa giá, SKU hoặc tồn kho từ payload. POST/PUT Product hiện có cũng nhận các trường mới. Đã bảo vệ đổi capability cảm biến khi SKU có thiết bị đăng ký; registry khóa SKU để tránh race với metadata update. SKU đã đăng ký không được đổi từ khả năng không cân sang có cân hoặc ngược lại.

MQTT ingestion, lệnh TARE và kiểm tra nghiệm thu dùng capability của SKU, fallback sang sản phẩm cha cho dữ liệu cũ. Capability được snapshot khi liên kết serial vào công việc. Pro trên sản phẩm cha Base vẫn được ingest/check cảm biến đúng theo SKU. Kiểm thử bằng telemetry mô phỏng không phải xác nhận firmware thật.

Web-admin `/variant-specifications` có màn hình nhập số đo/phiên bản/thời hạn/URL ảnh, gọi backend thật. Web-shop dùng ảnh SKU nếu có, fallback ảnh cha; hiển thị dung tích, Base/Pro, số đo và bảo hành từ API. Kích thước thiếu một thành phần được hiển thị “Chưa đủ thông tin”, không hiển thị giá trị 0 như số đo thật.

## Dashboard công việc

GET `/api/delivery-installations/dashboard`: super_admin/support_agent xem toàn bộ, technician chỉ công việc được giao. Trả `scope`, `counts`, `attention` (10 công việc có lịch sớm nhất), `observedAt`.

Counts gồm PO Ticket PENDING của đơn paid, đơn đã duyệt chưa phân công, ASSIGNED/IN_PROGRESS/DELIVERED/INSTALLED/FAILED, overdue và totalOutstanding. Completed/cancelled bị loại. `overdue` là phần giao nhau của các trạng thái công việc đang mở, không cộng thêm vào totalOutstanding. Nhân viên không nhận thống kê PO Ticket hoặc đơn chưa phân công của toàn hệ thống.

Web-admin có widget trên dashboard super admin và trang Giao & Lắp đặt. Widget làm mới 30 giây khi trang đang hiển thị, cập nhật khi phiên bản job thay đổi, ghi thời điểm quan sát và báo lỗi khi API lỗi. Bộ lọc công việc theo trạng thái và phạm vi nhân viên vẫn được giữ.

## Migration và kiểm chứng

**Chưa áp dụng thay đổi vào database thật.** Sau backup và thử trên bản sao, chạy `007_tracking_warranty_variant_specs.sql` sau 001–006, rồi chạy backend mới. Migration thêm metadata SKU, snapshot tháng bảo hành, liên kết nghiệm thu và unique warranty/device. Nếu có nhiều bảo hành cho cùng device, unique index dừng migration; cần review dữ liệu, không tự gộp/xóa bản ghi. Kiểm tra quyền DB: browser không được ghi trực tiếp trạng thái bảo hành hoặc role.

Không seed số đo, ảnh hoặc phiên bản cho sản phẩm thật. Cần nhập thông số nhà sản xuất/đo thực tế trong màn hình quản trị. Có thể chỉnh `WARRANTY_DEFAULT_MONTHS` theo chính sách đồ án trước khi tạo đơn; không đổi snapshot của đơn đã tạo.

Kiểm thử bao gồm timeline ba nguồn/phạm vi/ghi chú riêng, bảo hành một và nhiều serial, retry không trùng, thời hạn snapshot, activation không đổi ngày, xung đột bảo hành và rollback outbox, dashboard theo role/overdue, Pro override parent Base, metadata HTTP round-trip, validation, ảnh không hợp lệ và bảo vệ SKU đã đăng ký. Có các suite H2, PostgreSQL, full HTTP và demo HTTP, test transport frontend, build hai website. Xem [báo cáo](../../docs/frontend-handoff/contracts/tracking-warranty-specs-validation.json).

Email branding/template chuyên biệt và nối toàn bộ landing vào CMS vẫn là các phần riêng chưa được hoàn thiện trong thay đổi này. Phần hộp ESP32/Flutter thật vẫn được người dùng yêu cầu để sau; không có đo độ trễ hardware hoặc gửi FCM thật.
