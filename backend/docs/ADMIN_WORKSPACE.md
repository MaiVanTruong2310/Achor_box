# Quản trị hợp nhất, khách hàng riêng và ba role nhân viên

## Menu và nhóm nghiệp vụ

| Nhóm | Màn hình bên trong |
|---|---|
| Dashboard | REQ-05 theo SKU, công việc tồn đọng, thông báo hoạt động |
| Sản phẩm | Sản phẩm/tồn kho, biến thể và thông số kỹ thuật, danh mục |
| Đơn hàng | Danh sách, phê duyệt PO, giao/lắp đặt, processing history tổng hợp |
| Bảo hành | Yêu cầu, phân công, tra cứu serial/đường dẫn QR, thiết bị |
| Khách hàng | Danh bạ độc lập, thêm/sửa/lưu trữ, tùy chọn tạo đăng nhập |
| Quản lý người dùng | Tài khoản, tạo nhân viên, khóa/mở khóa, phân quyền |
| Email đã gửi | FAILED/PENDING/SENT, lỗi gửi, đưa mail lỗi lại vào hàng đợi |
| Báo cáo | JasperReports PDF/XLSX theo khoảng ngày và khách nếu cần |
| Hệ thống | Cấu hình, nội dung/CMS và nhật ký thao tác |

Sidebar có thu gọn, menu trượt trên điện thoại, theme sáng/tối và nhãn không bị cắt bởi menu quá dài. Các nhóm dùng tab nội bộ; route cũ `/approval-tickets`, `/delivery-installations`, `/variant-specifications`, `/devices`, `/permissions`, `/settings`, `/content`, `/audit-logs`, `/admin/warranty` chuyển tiếp sang đường dẫn mới và giữ query/hash. Các màn hình tải theo nhu cầu bằng React.lazy; dựng giao diện không tạo dữ liệu giả khi API lỗi.

## Ba role quản trị

Không thêm role mới hoặc bảng nhân viên. Giữ mã đang dùng để không đổi toàn bộ khóa nghiệp vụ:

| Role hiển thị | Mã backend | Phạm vi |
|---|---|---|
| Admin | super_admin | Toàn bộ quản trị, cấp tài khoản, phân quyền, khóa/mở khóa |
| PO | product_manager | Dashboard, sản phẩm, đơn/PO, điều phối, bảo hành, danh bạ khách, email, báo cáo, nội dung |
| Technician | technician | Công việc giao/lắp đặt được giao, xử lý bảo hành được phân công, tra cứu và thiết bị theo module hiện có |

customer là vai trò người mua trên web-shop, không phải role nhân viên và không truy cập admin workspace. Tạo nhân viên chỉ có Admin/PO/Technician. Danh sách người dùng chỉ Admin; PO được tạo/chỉnh hồ sơ khách không có đăng nhập, nhưng không cấp đăng nhập cho khách và không phân quyền.

Role được tải từ profiles trong mỗi request backend; không tin role trong metadata/token của trình duyệt. PO hiện có thể approve/return/reject PO Ticket theo quyền được hợp nhất. Hai role support_agent và accountant bị loại khỏi Java enum, frontend và danh sách quyền API. Migration 012 chuyển tài khoản cũ sang PO **và khóa lại** để Admin xem xét/cấp lại quyền, không tự nâng thành Admin. PostgreSQL giữ giá trị enum lịch sử vì không thể drop từng enum value an toàn; CHECK trên profiles chặn gán hai role cũ.

## Khách hàng và tài khoản

`customers` là hồ sơ nghiệp vụ; `profiles` là hồ sơ của tài khoản đăng nhập Supabase Auth. `customers.profile_id` nullable và UNIQUE: một hồ sơ có thể không có tài khoản, hoặc liên kết một tài khoản. Không cần bảng nhân viên riêng khi chỉ quản lý vai trò và phân công công việc.

- Thêm khách không bật **Tạo tài khoản đăng nhập**: lưu họ tên, email/điện thoại/địa chỉ/ghi chú tùy chọn; không tạo auth.users/profiles, không lưu username/password.
- Bật tùy chọn: Admin nhập username, email, mật khẩu và xác nhận mật khẩu. Username 3–32 ký tự ASCII chữ/số/chấm/gạch dưới/gạch ngang, chuẩn hóa chữ thường và duy nhất; email hợp lệ tối đa 254; mật khẩu 8–72 ký tự giống đăng ký. Quyền tài khoản luôn customer; client không thể chọn Admin.
- Mật khẩu chỉ gửi tới Supabase Auth để băm/lưu; không có cột mật khẩu trong customers/profiles, không trả mật khẩu trong response/audit. Cần SUPABASE_SERVICE_ROLE_KEY cho việc cấp tài khoản quản trị này. Tài khoản do Admin tạo được xác nhận email tại provider; đăng ký công khai vẫn dùng luồng xác minh email hiện có.
- Web-shop nhận **email hoặc username** trong form đăng nhập; API giữ tên trường `email` để tương thích client cũ, backend giải username thành email và vẫn kiểm tra mật khẩu bằng provider. Username/email sai trả 401; không tạo phiên giả.
- Đăng ký công khai: sau xác minh và phiên hợp lệ, CustomerIdentityService tạo profile role customer. Trigger 011 tự tạo/sync danh bạ; backfill các profile customer đã có. Không tự ghép hồ sơ liên hệ độc lập với tài khoản chỉ vì trùng email.
- Sửa khách đã liên kết sẽ sync họ tên/điện thoại/địa chỉ với profile. Email tài khoản không cho sửa qua CRM vì cần xác minh tại Auth provider. Lưu trữ khách không khóa user; khóa tài khoản nằm ở Quản lý người dùng.
- Website vẫn yêu cầu đăng nhập để checkout. Hồ sơ liên hệ không có tài khoản chưa hỗ trợ guest checkout hoặc tạo đơn offline trong luồng này. Tùy chọn cấp đăng nhập hiện ở form thêm khách; chưa có chức năng ghép một contact có sẵn với một tài khoản có sẵn.

API: GET/POST `/api/admin/customers`, GET/PUT `/api/admin/customers/{id}`. List có search, page/size, account=all/with/without và state=active/archived/all. Create cần Idempotency-Key UUID; gửi lại cùng key trả cùng hồ sơ, khác dữ liệu trả 409. Fingerprint không chứa mật khẩu; gửi lại key không đổi mật khẩu. Record được tạo trong transaction trước khi gọi provider; race username/email hoặc DB rollback sẽ bù bằng xóa **chỉ Auth user vừa được cấp**, không xóa tài khoản đã có. Nếu bù gặp lỗi external thì log UUID để vận hành xử lý, không báo tạo thành công.

## Thông báo, lịch sử và email

GET `/api/admin/notifications`: dữ liệu thật từ orders, approval_tickets, delivery_installations, warranty_claims và email_outbox FAILED. Các truy vấn giới hạn số dòng; Technician chỉ thấy job/claim được giao, customer bị từ chối. Frontend poll 20 giây khi tab đang mở, hiển thị toast cho sự kiện mới sau lần nạp đầu. Trạng thái đọc lưu theo user trong trình duyệt; chưa đồng bộ đa thiết bị và không có push khi đóng trình duyệt.

Lịch sử đơn dùng `/api/orders/{id}/timeline`: ORDER + PO_TICKET + DELIVERY_INSTALLATION, timestamp thật, lý do/lần thực hiện theo quyền. Chi tiết đơn bỏ tiến trình dựng giả từ created_at/updated_at. Danh sách dùng đủ trạng thái pending/awaiting_payment/paid/confirmed/completed/cancelled; trạng thái legacy vẫn hiển thị. Thống kê ngay trong bảng đơn là của **trang hiện tại**, dashboard/report dùng aggregate backend.

Email dùng outbox hiện có, không giả lập “đã gửi”. API resend đưa FAILED về PENDING; gửi SMTP chỉ khi bật worker/jobs và cấu hình mail. Nút gửi lại không bảo đảm giao mail thành công. Các template preview/OTP cũ không được dùng thay cho Auth provider.

## JasperReports

REQ-04 tiếp tục đọc định nghĩa và params từ report_definitions/report_params, kiểm tra quyền/kiểu/ngày tối đa và bind query SQL ở backend. Dữ liệu đã kiểm tra được đưa vào JRMapCollectionDataSource của mẫu `reports/revenue-daily.jrxml`; không nhận JRXML/query từ client. JasperReports 6.21.3 xuất cả PDF/XLSX; font extension DejaVu Sans đóng gói, không cần REPORT_FONT_PATH. Excel giữ trường số; PDF A4 lặp tiêu đề bảng và có trang/tổng/doanh thu/cash-in/refund/net.

[Tài liệu font extension JasperReports](https://jasperreports.sourceforge.net/6.21.3/sample.reference/fonts/index.html) và [JRXlsxExporter](https://jasperreports.sourceforge.net/6.21.3/api/net/sf/jasperreports/engine/export/ooxml/JRXlsxExporter.html) là căn cứ cho cấu hình export/font. Báo cáo có thể gồm giao dịch mock/Sandbox trong môi trường demo; doanh thu các đơn hợp lệ và cash-in/hoàn trong kỳ là hai thước đo khác nhau.

## Áp dụng và kiểm chứng

Sau 001–010, áp dụng **011_customer_directory.sql**, rồi **012_staff_roles.sql**, trước khi chạy backend mới. Chỉ đã thử trên PostgreSQL tạm riêng; chưa sửa database Supabase thật. 011 thêm username vào profiles, customers và sync trigger; 012 khóa/chuyển role cũ và giới hạn role active. Không tự chạy migrations.

Chạy backend mới và build web-admin/web-shop. Admin xem lại các tài khoản bị khóa do role cũ trong Quản lý người dùng trước khi mở khóa. Tạo khách với đăng nhập cần service-role key backend; nếu không có, vẫn quản lý contact độc lập và hiển thị lỗi rõ khi cấp Auth.

Kiểm thử: toàn bộ backend với PostgreSQL; CRM contact-only/optional account/username/idempotency/rollback compensation, role đã bỏ bị từ chối, scopes Technician, PO approve/return/reject, Jasper numeric XLSX và PDF nhiều trang, API frontend và Chromium desktop/mobile theo ba role. Browser kiểm thử sử dụng session và dữ liệu giả trong harness, không có mock fallback trong ứng dụng. PDF kiểm thử đã render/kiểm tra đủ bốn trang. Xem [admin-workspace-validation.json](../../docs/frontend-handoff/contracts/admin-workspace-validation.json).
