# Kiểm tra webshop — 19/10/2026

## Đã sửa
- Trạng thái gửi đơn chưa xác định lưu theo tài khoản qua lần tải lại; yêu cầu đối chiếu lịch sử trước khi cho gửi lại. Đây là bảo vệ phía trình duyệt, không thay thế idempotency server khi có nhiều thiết bị/tab đồng thời.
- Khi trình duyệt không ghi được recovery marker, không gửi POST tạo đơn.
- Phản hồi HTTP thành công nhưng JSON sai được phân loại lỗi 502, không coi là kết quả xác định.
- Màn phục hồi lỗi React và thông báo ngoại tuyến.
- So sánh lấy thông số từng SKU từ API, bỏ bảng thiết kế tĩnh khỏi chi tiết sản phẩm.
- Gallery vẫn chọn được ảnh khác khi một ảnh hỏng.
- Tiêu đề trang, lịch sử tiếng Việt, nút cập nhật danh sách đơn.
- Giữ đăng ký ngoài phạm vi theo yêu cầu mới nhất.

## Quan sát thật
- Người dùng tự đăng nhập tài khoản khách hàng trên trình duyệt.
- API danh mục có AnchorBox Base, SKU SBX-8211-STD giá 2.500.000 VND, tồn kho trước đặt 18.
- Thêm 1 sản phẩm vào giỏ; pricing API trả subtotal 2.500.000, giảm giá 0, giao/lắp 0.
- Đã tạo đơn thử được người dùng cho phép: 47150879-e6a6-4b5a-8ac4-86025b14b1a0.
- Phiếu bfe48153-cd6c-422a-bcc0-7e0d81bdebe7, trạng thái PENDING. Không thu tiền, không giao hàng; ghi chú đơn đánh dấu kiểm thử.
- PO không thấy đơn vì tài khoản người dùng đang đăng nhập không phải người phụ trách sản phẩm (người dùng xác nhận).
- Chưa duyệt/thanh toán/giao lắp/hoàn tiền; chưa được coi là hoàn thành E2E.
- Không sửa backend, web-admin hay phân quyền. Việc tạo đơn là API nghiệp vụ duy nhất đã ghi dữ liệu trong đợt này.

## Kiểm thử và giới hạn triển khai
- Build và 36 tests đạt trước thay đổi gallery cuối; cần chạy lại build sau thay đổi cuối.
- npm audit không lấy được kết quả do lỗi chứng chỉ registry, kể cả ngoài sandbox; không tắt kiểm tra TLS.
- Backend đang cung cấp Sandbox/mô phỏng. Không triển khai thu tiền thật bằng cấu hình frontend.
- Cần người quản trị bổ sung ảnh, thông số sản phẩm, thông tin liên hệ và chính sách bán hàng đã được phê duyệt.
- Cần hosting HTTPS, VITE_API_URL trỏ API triển khai, cấu hình CORS/return URL và SPA fallback index.html.
- Cần kiểm chứng quyền sở hữu đơn, phiên hết hạn, duyệt toàn phần/một phần, hủy/hoàn tiền và hóa đơn trên môi trường thử trước khi phát hành.
- Không có cam kết “hoàn hảo” hoặc production-ready khi các phần trên chưa được kiểm chứng.

## Xác minh cuối
- Build cuối sau sửa gallery: PASS.
- Browser xác nhận bảng so sánh có 2 SKU thật: Standard 2.500.000 VND, Pro Max 3.000.000 VND; cả hai có cảm biến và bảo hành 12 tháng theo API.
- Chưa có kết quả audit dependency do lỗi chứng chỉ; không coi audit là đạt.
