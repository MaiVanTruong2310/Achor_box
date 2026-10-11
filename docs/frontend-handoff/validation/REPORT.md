# Kiểm chứng bộ bàn giao

Ngày: 10/10/2026. Chỉ tạo/chỉnh tài liệu và prototype trong `docs/frontend-handoff/`; không sửa backend/frontend/database ở nhiệm vụ này. Chi tiết máy đọc được: [check-results.json](check-results.json), [API audit](api-audit.json), [source evidence](source-evidence.json), [input sources](input-sources.json).

## Nguồn

Đã truy cập và đọc bốn tài liệu người dùng cung cấp, `database.sql`, migrations, các lớp controller/service/repository/DTO/entity/security/config và tests liên quan. Inventory175 Java files có SHA256 và method/error/query evidence. D1/D2 xác nhận phạm vi đồ án, D3 modules website, D4 REQ01–05; không nhập hay seed dữ liệu mẫu từ requirements. Phân tích frontend hiện có gồm web-shop và web-admin, đặc biệt API client/checkout/auth/fallback.

## Swagger đối chiếu

Khởi động jar đã build bằng Java21, demo profile, H2 in-memory PostgreSQL mode, địa chỉ127.0.0.1:18081, jobs/email/MQTT/FCM tắt. Chỉ lấy `/v3/api-docs`, không gọi các nghiệp vụ hoặc DB sản xuất. **114 operations source khớp114 runtime, 70 schemas.** Hai mock-payment operations chỉ ở demo profile. Không phát hiện delivery-installation API trong source/runtime.

OpenAPI runtime giữ bằng chứng routes/schema, đã bỏ ví dụ annotation để không phát tán dữ liệu demo; SHA256 payload gốc và số examples bỏ được ghi trong [runtime-capture.json](runtime-capture.json). Bản audited thêm x-source/x-access/x-implementation-status, chỉnh public-path security và dev server. Mô tả cũ về OTP/cache/production domain không chứng minh hoạt động; source filter/service là chuẩn xác nhận. Generic Map schema được bổ sung bằng SQL/Map shape; constructor arguments của ResourceNotFoundException không phải errorCode.

H2 startup chỉ chứng minh exportmetadata, **không** chứng minh SQL PostgreSQL business, provider, SMTP, FCM, broker/firmware, Flutter hoặc acceptance hardware. DeliveryInstallation và những endpoint Proposed chưa được chạy và không trình bày như đã triển khai.

## Checks tài liệu

21 top-level Markdown đúng yêu cầu; 114 endpoint sections có params/body/schema/source/access/HTTP và helpererrors; DTO dictionary70schemas,50 Map response examples bổ sung từ source. Kiểm tra file tồn tại, liên kết nội bộ, Markdown fences, JSON examples/JSON artifacts và SHA256 của277file ứng dụng. `application-hashes.json` là baseline lúc làm tài liệu, `check-results.json` là kết quả so sánh cuối. Chỉ kết quả máy đọc `allChecksPassed:true` xác nhận các check tĩnh đã pass; không thay thế review nghiệp vụ/UI.

## Preview đã kiểm tra

Đã mở HTTPpreview cục bộ và xác nhận geometryWebGL có mặt trước/sau/trên, drag thực thay góc nhìn, đổi camera từ nút, zoom và keyboardrotation. Đã chọn Pro/L: nội dung đổi sang150L và weightfeature, không tạo giá/kho giả. Đã ép fallback bằng query `viewer=fallback`: canvasẩn, sơ đồ hiện, các nút xoay bịdisable. Console không có JavaScript error trong các thao tác đã kiểm tra.

Wireframes đã kiểm tra stage ASSIGNED→IN_PROGRESS→DELIVERED→INSTALLED; acceptance bị chặn trước kết quả mô phỏng; sau mô phỏng checks mớiCOMPLETED. FAILED bắt buộc lý do; reassign cùng luồng giữhistory và tăngattempt. Đây là **UI simulation**, không có bằng chứng hardware hay APInewjob. Tabs/forms dùng label và thông báo status.

Đã đo DOMlayout320/768/1440 cho cả landing/wireframes: không tràn ngang toàn trang; bảng có vùng cuộn riêng nếu cần. Screenshot viewer xác nhận 3D minh họa. In-appbrowser có giới hạn capture khi override lớn hơn panel; không dùng screenshot này làm performancebenchmark. Reducedmotion có code; chưa ép mọi OS/contextloss hoặc screenreader để chứng nhận accessibility hoàn chỉnh. Màu token được đo tương phản trong check-results; cần run AT50–60 khi tích hợp thật.

## Test source và kết quả trước nhiệm vụ tài liệu

XML có51tests:20Commerce (1skiptimezoneH2),20PostgresCommerce (0skip),4DashboardAndEmail,6Security,1BackendApplication. Tổng50pass,0failure,0error,1skip. Timestamps vàsuitecounts trongcheck-results.json. Kết quả là run trước bước tài liệu; không chạy lại toàn bộ testbusiness hoặc khẳng định mọi APIexternalE2E từ kết quả này. Test UTC+7 phải dùng PostgreSQL, không lấy H2skip thànhpass.

## Hạn chế / bước tiếp theo

Marketing asset/model và Flutter/firmware thực chưa xác minh; viewer minh họa không phản ánh cấu tạo/kích thước thật. Chưa có Figma. Chưa tích hợp paymentproduction, deliveryacceptance, publicCMS, selfprofile/addressbook/customerwarranty. Backendgap và source evidence ở17, ProposedContracts và acceptance18. Thực hiện các thay đổi ứng dụng ở nhiệm vụ riêng sau khi đội backend/frontend chốt contract.
