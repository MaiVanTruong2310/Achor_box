# Cập nhật triển khai Delivery & Installation

Backend và web-admin đã có module chung DeliveryInstallation: điều phối, việc được giao, nhận việc, giao, nhập serial, lắp đặt, kiểm tra MQTT/khóa/cảm biến và nghiệm thu. Trạng thái Order chỉ chuyển COMPLETED sau nghiệm thu đạt. Có thất bại/phân công lại, phạm vi nhân viên, version/idempotency và bằng chứng nghiệm thu lưu cố định.

Hợp đồng API, phân quyền, state machine, cấu hình firmware và triển khai: [backend/docs/DELIVERY_INSTALLATION.md](../../backend/docs/DELIVERY_INSTALLATION.md).

Artifacts hiện tại: [OpenAPI runtime](contracts/openapi-delivery-installation.json) có 128 operations khi tắt profile demo, trong đó 16 operations của module mới; [kết quả kiểm thử](contracts/delivery-installation-validation.json) ghi nhận 120 test, 118 đạt và 2 bỏ qua kiểm tra timezone riêng của H2. Các suite PostgreSQL đã chạy, không bị bỏ qua. Ví dụ dữ liệu trong OpenAPI đã được loại bỏ.

Giao diện thật ở web-admin `/delivery-installations`; nhân viên `technician` được dẫn đến màn hình công việc khi đăng nhập. Module dùng API thật; không tạo portal riêng. Có 16 operation mới; các endpoint gắn thiết bị/ship/deliver cũ trả 409.

Các tài liệu 00–18 và contracts trước cập nhật này là snapshot 10/10/2026. Những mô tả DeliveryInstallation còn PLANNED, luồng giao xong là completed, hoặc nút xác nhận thu tiền hoàn tất đơn đã được thay thế bởi hợp đồng trên. Không sử dụng prototype hay số operation của snapshot cũ để xác nhận bản triển khai mới.

Kiểm thử nghiệp vụ, PostgreSQL cô lập, HTTP backend và build frontend được thực hiện. Chưa áp dụng migration 004/005 lên database thật hoặc nghiệm thu với thiết bị/broker thật. Khả năng đạt kiểm tra phụ thuộc firmware echo commandId trong ACK, status và baseline TARE. Bản này chưa có chữ ký khách; nhân viên ghi nhận khách chấp thuận.
