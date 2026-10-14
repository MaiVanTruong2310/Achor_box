# Bốn phần đã triển khai tiếp theo

Timeline Order + PO Ticket + DeliveryInstallation, bảo hành tự tạo sau nghiệm thu, thông số SKU và dashboard công việc tồn đọng đã có backend cùng giao diện liên quan. Những mô tả “còn thiếu” của bốn mục này trong các snapshot cũ được thay thế bởi [hợp đồng hiện tại](../../backend/docs/TRACKING_WARRANTY_SPECS_BACKLOG.md).

Customer Order API trả timeline tổng hợp; tài khoản khách có danh sách bảo hành thật. Quản trị có màn hình `/variant-specifications` và widget tồn đọng trên dashboard/Giao & Lắp đặt. Quyền nhân viên giới hạn theo phân công.

Cần migration 007 và dữ liệu thông số thực tế; chưa sửa database thật. Bảo hành ưu tiên tháng theo SKU/policy, fallback mặc định 12 tháng có thể cấu hình; bắt đầu theo ngày nghiệm thu Việt Nam. Không tự seed thông số hoặc backfill bảo hành lịch sử.

Email template chuyên biệt, landing CMS đầy đủ và kiểm thử ESP32/Flutter thật vẫn còn riêng, không được coi là đã hoàn thành bởi bốn phần này.

Kiểm chứng cuối: **260 test backend đạt, 4 test timezone riêng của H2 bỏ qua**; mọi suite PostgreSQL/full HTTP/demo HTTP đã chạy, không lỗi. **10 test transport frontend đạt**, web-shop và web-admin build thành công. [Báo cáo](contracts/tracking-warranty-specs-validation.json), [OpenAPI runtime](contracts/openapi-tracking-warranty-specs.json) có 150 operations khi bật demo (146 khi không có demo).
