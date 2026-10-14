# VNPAY Sandbox trong luồng bán hàng SmartBox

Đã tích hợp PAY 2.1.0 vào checkout hiện có: backend ký URL thanh toán, shop chuyển sang VNPAY, IPN xác nhận giao dịch và tạo PO Ticket. Order vẫn chỉ COMPLETED sau nghiệm thu DeliveryInstallation. Thanh toán/VNPAY không phụ thuộc MQTT; MQTT thuộc IoT/app và kiểm tra hộp tại nghiệm thu.

Đây là môi trường Sandbox, không nhận tiền thật. Giao diện shop và đơn hàng admin ghi rõ môi trường. Mock vẫn dùng được với `PAYMENT_PROVIDER=mock`; mock callback và nút demo không được xác nhận payment của VNPAY, kể cả khi profile demo bật.

Nguồn giao thức: [tài liệu PAY VNPAY](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html). Không dùng trang ReturnURL để cập nhật đơn. Chỉ IPN có chữ ký hợp lệ và đúng giao dịch/số tiền mới được cập nhật trạng thái.

## Cấu hình

Đã lưu TmnCode và HashSecret người dùng cung cấp trong `backend/.env` (Git ignore). Không đưa secret vào `.env.example`, frontend, log hoặc tài liệu.

```dotenv
PAYMENT_PROVIDER=vnpay
VNPAY_ENVIRONMENT=sandbox
VNPAY_TMN_CODE=<mã merchant>
VNPAY_HASH_SECRET=<secret chỉ đặt ở backend>
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:5174/payments/vnpay/return
PAYMENT_TIMEOUT_MINUTES=15
SMARTBOX_JOBS_ENABLED=true
MQTT_ENABLED=false
FCM_ENABLED=false
```

Đường dẫn ReturnURL local ở trên được browser của khách sử dụng, nên có thể dùng khi shop/backend chạy trên chính máy đó. Khi dùng điện thoại/máy khác, đổi sang URL shop mà thiết bị đó truy cập được. Nếu dùng web-shop HTTPS, backend cũng cần HTTPS để tránh mixed content.

IPN cần URL HTTPS công khai. Người dùng hiện chưa có URL, vì vậy chưa đăng ký IPN hoặc chạy một giao dịch Sandbox từ đầu đến cuối với máy chủ VNPAY. Sau khi có địa chỉ backend công khai, gửi VNPAY:

```text
https://<backend-public-host>/api/payments/vnpay/ipn
```

Không gửi URL localhost làm IPN. Không tự nhận thanh toán thành công khi IPN chưa về. Khi dùng proxy/tunnel, `vnp_IpAddr` hiện lấy remote address của request (loopback quy về 127.0.0.1); không tin trực tiếp header X-Forwarded-For từ client. Có thể cấu hình proxy tin cậy khi triển khai.

Spring không tự nạp `.env`; dùng `backend/run-local.ps1` hoặc export các biến vào cấu hình chạy. Java 21, backend 8080, shop 5174, admin 5173. Giữ các giá trị DB/Auth/Cloudinary đã thiết lập trước đó; SMTP/jobs không bắt buộc để nhận IPN nhưng jobs cần bật để tự thu hồi kho khi quá hạn.

## Migration

Chạy `009_vnpay_sandbox.sql` sau 001–008 trên bản sao/test DB trước bản ứng dụng mới. Migration thêm environment/merchant/ref/payment time/result và bảng receipt fingerprint; không seed đơn, không chuyển các giao dịch mock cũ sang VNPAY. Gateway reference và transaction number được giới hạn unique theo provider/môi trường/merchant. Bảng notification bật RLS, chỉ backend ghi. Migration chưa áp dụng lên DB đích.

## API và luồng giao dịch

| API | Ý nghĩa |
|---|---|
| GET `/api/payments/mode` | Provider `vnpay`, environment `sandbox`, isSimulated true, demoActionsEnabled false |
| POST `/api/orders/{id}/checkout` | Chủ đơn; giữ nguyên Idempotency-Key; trả URL VNPAY ký từ giá/số lượng đã snapshot tại backend |
| GET `/api/orders/{id}/payment-session` | Chủ đơn; lấy lại URL còn hiệu lực khi mất sessionStorage; không tạo payment mới |
| GET `/api/payments/vnpay/ipn` | Public server-to-server; checksum thay cho Bearer; HTTP 200 với `{RspCode,Message}` |
| GET `/api/payments/vnpay/return` | Public, kiểm tra query rồi trả paymentId/kết quả gateway; tuyệt đối không sửa DB |
| GET `/api/customer/orders/by-payment/{paymentId}` | Customer; tra đơn theo payment với ownership, dùng để đọc trạng thái sau ReturnURL |
| Shop `/payments/vnpay/return` | Xác thực kết quả qua backend và đọc/poll trạng thái đơn tối đa khoảng 60 giây |

Amount nguyên VND, nhân 100 khi gửi VNPAY, không lấy amount từ client. TxnRef là payment UUID bỏ dấu gạch nối; tạo một lần, không dùng mã theo giây có thể trùng. HMAC-SHA512 ký các tham số vnp_ đã sắp xếp/URL encode, bỏ SecureHash/HashType. Date dùng giờ Việt Nam. Mỗi query key vnp_ chỉ được xuất hiện một lần; reject parameter pollution. Success cần đồng thời ResponseCode=00 và TransactionStatus=00.

IPN khóa order rồi payment; receipt, paid state, ticket, history/audit và outbox cùng transaction. Chỉ phản hồi thành công khi commit được. RspCode: 00 nhận thành công; 02 đã xử lý; 01 không tìm thấy payment phù hợp; 04 sai amount/currency; 97 sai signature/merchant; 99 dữ liệu kết quả không hợp lệ hoặc xử lý DB thất bại. Gateway có thể retry 99 mà không tạo PO/stock/email trùng.

Failure khi đang chờ thanh toán hủy đơn và trả kho một lần. Success sau khi đơn hết hạn/đã hủy không mở lại đơn hoặc lấy lại kho, mà tạo refund pending. Success sau failure cũng được ghi nhận ở nhánh refund, thay vì bỏ mất giao dịch tiền đã đến. Failure/duplicate sau success không hạ trạng thái. PayDate có thì lưu giờ provider; nếu thiếu tham số tùy chọn này, paid_at dùng giờ nhận IPN và gateway_paid_at để null.

## Kiểm thử local

1. Cấu hình Auth/DB, chạy đủ migrations trên DB thử; chạy backend bằng run-local và hai website.
2. Đăng nhập khách thật, chọn SKU, đặt hàng; kiểm tra địa chỉ/giá/tồn được snapshot và chuyển sang trang Sandbox.
3. Dùng thông tin thẻ test do VNPAY cung cấp. Không dùng thẻ thật để kiểm thử.
4. ReturnURL hiển thị thông tin gateway nhưng trạng thái đơn phải được đọc từ backend. Khi chưa có IPN công khai, đơn có thể vẫn awaiting_payment; đây không phải căn cứ để giả lập paid.
5. Khi có IPN HTTPS, đăng ký với VNPAY rồi chạy SIT: success/failure/duplicate/amount mismatch/signature mismatch/unknown reference, timeout và IPN đến muộn.

Kiểm thử tự động dùng secret giả, PostgreSQL tạm và ranh giới Auth mock: golden HMAC vector độc lập, HTTP ReturnURL không sửa DB, IPN public/response code, provider guard, concurrency/duplicate, rollback toàn bộ khi không ghi được receipt, failure/late/refund và owner resume. Không gọi cổng VNPAY thật trong tests. [Báo cáo kiểm chứng](../../docs/frontend-handoff/contracts/vnpay-validation.json).

Chưa tích hợp QueryDR/Refund API của VNPAY. Đối soát hiện tại là DB nội bộ; hoàn tiền vẫn là trạng thái/yêu cầu ghi nhận, không gọi provider chuyển tiền. Chưa hỗ trợ production VNPAY; cấu hình URL/môi trường live bị từ chối để không vô tình dùng thông tin Sandbox cho giao dịch thật. Không điều chỉnh đơn giao/lắp hoặc kiểm tra MQTT trong lần tích hợp này.
