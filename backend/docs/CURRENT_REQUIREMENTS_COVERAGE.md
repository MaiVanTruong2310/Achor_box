# Đánh giá mức đầy đủ theo yêu cầu ban đầu và đề cương

Đối chiếu yêu cầu người dùng trong hai MASTER CONTEXT/PROMPT, bản trích xuất bốn tài liệu trong backend/build/audit và source sau migration 009. Đây là đánh giá phạm vi hiện tại; không coi các gap của snapshot 10/10/2026 là vẫn còn nếu đã được thay thế bởi các lần triển khai mới. Cập nhật bốn mục quản trị trong [hợp đồng triển khai](ADMIN_COMMERCE_COMPLETION.md), và [VNPAY Sandbox](VNPAY_SANDBOX.md).

**Kết luận:** luồng bán thiết bị cốt lõi theo phương án nội bộ đã có triển khai và kiểm thử. Chưa đủ cơ sở tuyên bố hoàn thành 100% checklist quản trị hoặc nghiệm thu toàn bộ đề cương IoT.

## Đã triển khai

| Phạm vi | Hiện trạng |
|---|---|
| Tài khoản khách | Đăng ký, hồ sơ, địa chỉ, mật khẩu/recovery, API đơn hàng và phân quyền ownership |
| Product/SKU | Base/Pro, size/dung tích, kích thước/khối lượng/tải trọng, ảnh SKU và thời hạn bảo hành; dữ liệu thực cần nhập |
| Đơn/kho | Draft/items/merge/validation/giữ kho/trả kho/expiry/ledger/concurrency, snapshot địa chỉ/giá/tháng bảo hành |
| Payment | Mock hoặc VNPAY Sandbox; URL ký HMAC, IPN/ReturnURL tách biệt, success/failure/duplicate/late, timeout, refund-required/refunded và đối soát nội bộ; UI ghi rõ môi trường thử |
| PO Ticket | Approve/Return/Reject/Resubmit; refund pending khi reject sau paid |
| Giao/lắp đặt | Một nhân viên được giao, tiến độ/serial/check MQTT-lock-Pro, failure/reassign, version/idempotency và acceptance gate |
| Tracking/bảo hành | Timeline Order + PO + giao/lắp; tự cấp theo serial tại nghiệm thu, ngày Việt Nam, không reset khi activate |
| Claim khách | Gửi sự cố và ảnh Cloudinary, kiểm tra ownership/ngày hiệu lực/idempotency; khách xem tiến độ, kỹ thuật viên chỉ xem việc được giao |
| Cấu hình/search | CRUD danh mục/payment/giao lắp nội bộ; backend tìm khách và lọc đơn có phân trang; admin bỏ mutation Supabase và tồn tuyệt đối |
| Admin | RBAC, quản lý khách/thiết bị, xử lý claim và phân công kỹ thuật, dashboard doanh thu/thiết bị/bảo hành và công việc tồn đọng |
| Email/báo cáo | Transactional outbox, retry/lease, template SmartBox, PDF/XLSX và dashboard song song |

Luồng mục tiêu hiện tại: tài khoản → chọn SKU → draft/giữ kho → checkout mock → paid → PO approved → phân công → giao/lắp → kiểm tra → nghiệm thu → completed/bảo hành. Không cần VNPay để đạt phạm vi đồ án đã chốt; refund hiện không chuyển tiền thật.

## Khoảng trống còn lại

### Core quản trị cần hoàn thiện/review

- Bốn gap claim khách/ảnh, cấu hình core, server search/filter và mutation Supabase/tồn tuyệt đối đã được xử lý trong source. Cần migration 008, điền Cloudinary và thử bằng dữ liệu đích trước khi xác nhận chạy thực tế.
- Mobile chưa có source trên máy để đối chiếu. Giao diện xử lý claim hiện lưu phân công/status/notes, không hỗ trợ hồ sơ linh kiện/ảnh nghiệm thu sửa chữa trước đây chỉ được mô phỏng trong browser.
- Audit/nhất quán mutation: các thao tác mới và product/warranty đã có audit; chưa review/chuẩn hóa mọi mutation legacy ở các module khác. Không khẳng định toàn hệ thống đã bao phủ audit.
- Cấu hình phương thức là danh mục; provider VNPAY Sandbox đã có, chưa nhận tiền production hoặc gọi QueryDR/Refund API; chưa tự cộng phí giao/lắp vào checkout. Điều chỉnh kho theo delta chưa có idempotency, cần đối chiếu trạng thái khi timeout.
- Variant checklist: đã có SKU/size/Base/Pro/specs; chưa có metadata màu và firmware mặc định đầy đủ như các ví dụ trong tài liệu modules.
- IoT monitoring: có trạng thái/heartbeat/telemetry; chưa chứng minh hệ thống tự chẩn đoán đầy đủ lỗi cảm biến và bảng công việc xử lý lỗi thiết bị.
- Auth: giao diện khách/admin tách và role kiểm tra từ DB; vẫn chung Supabase Auth/profiles. Nếu yêu cầu “tách biệt hoàn toàn” nghĩa là hai identity realm độc lập, bản hiện tại chưa đáp ứng cách hiểu đó.

### Website bán hàng/CMS và email

- CMS admin có blog/banner/FAQ/review; landing chưa nối đầy đủ public CMS/CTA tải app tập trung.
- Public WarrantyPage/warrantyApi còn nhánh mock; trang tài khoản MyWarranties đã chuyển sang API thật. Chưa thể đánh dấu mọi màn hình website đều bỏ mock.
- Template email SmartBox có và trigger duyệt/phân công/lịch/nghiệm thu đã có; chưa hoàn thiện template chuyên biệt từng sự kiện hoặc mail riêng cho nhân viên, chưa gửi SMTP thật.
- Coupon/khuyến mãi và phí giao/lắp chưa thành luồng checkout hoàn chỉnh. Đây là phần mở rộng hoặc quyết định phí cần chốt, không tự coi là core bắt buộc khi tài liệu ghi mở rộng.

### REQ-01–05 và công nghệ

- REQ-01/02/03 đã có luồng nghiệp vụ chính và test; REQ-02 yêu cầu payment giả lập, nên thiếu provider nhận tiền thật không phải tự động là không đạt REQ-02.
- REQ-04 có ParamSet lưu DB/PDF/XLSX nhưng dùng OpenPDF/POI và migration SQL thủ công; không phải JasperReports/jrxml/Liquibase như câu chữ requirements.docx. MASTER CONTEXT cho phép Jasper “nếu phù hợp kiến trúc”; cần trình bày đây là lựa chọn thay thế có căn cứ, không tuyên bố tuân thủ literal công nghệ gốc. Chưa hỗ trợ mọi loại parameter mới không sửa Java.
- REQ-05 đã nối dashboard admin với bốn phần theo biến thể/SKU, executor 4/queue 50, timeout 1500ms, partial/null, MDC và 503; có sequential/delay/fail chỉ trong profile demo. Chi tiết và kiểm thử: [REQ05_DASHBOARD.md](REQ05_DASHBOARD.md).
- DTO/validation/error response ở các API legacy chưa được chuẩn hóa hết; không coi mọi input sai đều đã có test trả 400.

### Nghiệm thu đề cương và môi trường thật

Đề cương yêu cầu mô hình phần cứng ổn định, Flutter/backend vận hành tin cậy, mở khóa dưới 1 giây và video demo thực tế. Chưa có source ESP32/Flutter trên máy, chưa thử MQTT reconnect, khóa thực, cảm biến thực, FCM đến điện thoại hoặc lỗi mất mạng/mất điện; không có phép đo độ trễ thực. Phần này đã được người dùng yêu cầu để sau, vẫn là chưa kiểm chứng.

Schema 001–009 chưa áp dụng lên database đích của người dùng. Chưa chạy browser end-to-end toàn bộ bằng tài khoản/dữ liệu đích, Cloudinary/SMTP/Auth provider thật hoặc demo tích hợp hộp thật. VNPAY chưa có IPN HTTPS công khai, nên chưa chạy một giao dịch end-to-end với cổng Sandbox thật. Báo cáo mới: [vnpay-validation.json](../../docs/frontend-handoff/contracts/vnpay-validation.json). Test và build chỉ xác nhận phạm vi đã thử, không bao phủ mọi checklist hoặc phần cứng thực.

## Ưu tiên để chốt phạm vi

1. Đã đóng nhánh mutation bypass/chỉnh tồn trực tiếp, filter/search backend, claim khách/ảnh và CRUD cấu hình core; tiếp theo chạy DB/browser/provider thực.
2. Nối public CMS/CTA và các màn hình shop còn mock; chuẩn hóa audit/validation còn lại.
3. Chạy migrations trên DB thử nghiệm và browser end-to-end; gửi email thật trong môi trường thử.
4. Khi có code/hộp: kiểm chứng ESP32–MQTT–backend–Flutter, đo command-to-actual-state latency và video demo.
5. Trong báo cáo đề tài, ghi rõ các điều chỉnh đã thống nhất: nội bộ giao+lắp, payment mock, reports thay thế công nghệ và những tính năng mở rộng không nằm MVP.

Nguồn source tiêu biểu: CustomerAccountService, OrderWorkflowService, PaymentService, PaymentAuditService, ApprovalTicketService, DeliveryInstallationService, OrderTrackingService, AcceptanceWarrantyService, ProductService, InstallationDashboardService, WarrantyController, SettingsController, ConcurrentDashboardService, RevenueReportService và hai frontend. Báo cáo kiểm thử hiện tại: [tracking-warranty-specs-validation.json](../../docs/frontend-handoff/contracts/tracking-warranty-specs-validation.json).

## Hóa đơn bán hàng HTML

Đã bổ sung API lập/idempotent và tải HTML, snapshot bất biến, quyền admin/kế toán/hỗ trợ và khách sở hữu đơn, xem/in/Lưu PDF ở cả hai frontend. Logo từ tài sản cửa hàng hiện có. Cần migration 010 và cấu hình INVOICE_SHOP_*; chưa áp dụng vào Supabase thật. Xem [hợp đồng và cấu hình](SALES_INVOICE.md), [kết quả kiểm thử](../../docs/frontend-handoff/contracts/sales-invoice-validation.json). Không tích hợp nhà cung cấp hóa đơn điện tử VAT.

## Cập nhật quản trị hợp nhất, khách hàng và role

[ADMIN_WORKSPACE.md](ADMIN_WORKSPACE.md) là mô tả hiện tại: 3 role nhân viên Admin/PO/Technician, customer cho người mua; khách hàng tách khỏi user, tùy chọn username/email/password tại form thêm khách; thông báo/processing history/email dùng API thật và báo cáo Jasper PDF/XLSX. Cần 011–012; chưa áp dụng Supabase thật. Xem ma trận quyền mới trước các mô tả support/accountant của snapshot cũ.
