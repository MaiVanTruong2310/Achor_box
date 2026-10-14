# Payment — cập nhật kiểm chứng và UI giả lập

Xem [vòng đời, API và hướng dẫn demo](../../backend/docs/PAYMENT_LIFECYCLE.md). Đã bổ sung kiểm thử callback trùng/trái chiều/muộn, timeout/trả kho, từ chối ticket sau paid, chờ hoàn/hoàn tất hoàn tiền và đối soát nội bộ.

Web-shop hiện đọc chế độ từ server, hiển thị giả lập trên toàn website và trạng thái payment/refund trên đơn. Profile demo mới có các nút tạo kết quả giả lập; không có thao tác nào nhận hoặc chuyển tiền thật. Đối soát chỉ đọc, không tự sửa Order/Payment hoặc chứng minh thanh toán tại ngân hàng.

Phần kiểm thử hộp thật ESP32/MQTT/Flutter được người dùng yêu cầu để sau vì code chưa có trên máy. Chưa nhận code firmware/app, chưa đo độ trễ phần cứng hoặc xác minh FCM đến điện thoại; test backend với dữ liệu mô phỏng không thay thế kiểm thử đó.

Kiểm chứng: 237 test backend đạt, 4 test riêng của H2 bỏ qua; toàn bộ suite PostgreSQL và HTTP đã chạy. Bổ sung 7 test HTTP profile demo đạt, 8 test transport frontend đạt và web-shop build thành công. [Báo cáo](contracts/payment-lifecycle-validation.json), [OpenAPI runtime profile demo](contracts/openapi-payment-demo.json).
