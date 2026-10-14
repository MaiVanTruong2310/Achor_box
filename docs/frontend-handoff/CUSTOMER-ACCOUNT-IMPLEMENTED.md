# Cập nhật Customer Account

**Cập nhật kiểm chứng sau phần Payment:** Docker đã hoạt động lại; các suite PostgreSQL và full HTTP cho Customer Account đã chạy thành công trong bộ kiểm thử tổng hợp. Xem [báo cáo kiểm chứng](contracts/payment-lifecycle-validation.json). Các ghi chú Docker/skip phía dưới ghi lại lần kiểm thử trước khi môi trường được khôi phục.

Các mục đăng ký, hồ sơ, sổ địa chỉ, đổi/quên mật khẩu và đơn hàng kèm tiến độ giao/lắp đặt đã được bổ sung trong backend và web-shop. Những mô tả PLANNED hoặc dữ liệu mock của Customer Account trong snapshot 10/10/2026 được thay thế bởi [hợp đồng hiện tại](../../backend/docs/CUSTOMER_ACCOUNT.md).

Migration `006_customer_account.sql` thêm sổ địa chỉ theo chủ sở hữu, snapshot người nhận/điện thoại/email/địa chỉ trên Order và trigger giữ nguyên địa chỉ sau checkout. DeliveryInstallation dùng liên hệ đã chụp trên đơn.

Cần áp dụng migration trên database đích và cấu hình Supabase Auth SMTP/redirect/template reset-password trước khi chạy thật. Không có khóa mới cần đưa lên frontend. Payment provider vẫn mô phỏng; luồng này không xác nhận nhận tiền thật.

Kiểm thử PostgreSQL và HTTP đã chạy riêng trước lỗi Docker/WSL; lần tổng hợp cuối bỏ qua các suite này. Xem hướng dẫn kiểm chứng và giới hạn trong tài liệu backend. Các snapshot OpenAPI cũ vẫn là hồ sơ lịch sử, không đại diện cho bản API mới.

Artifacts: [OpenAPI có 12 operations Customer Account mới](contracts/openapi-customer-account.json) và [báo cáo kiểm chứng](contracts/customer-account-validation.json). Lần tổng hợp cuối có 90 test đạt, 92 skip, không lỗi; các skip bao gồm toàn bộ PostgreSQL/HTTP khi Docker không khả dụng. Frontend có 6 test transport đạt, web-shop và web-admin build thành công. Không coi các test bị skip là đã xác nhận bản cuối.
