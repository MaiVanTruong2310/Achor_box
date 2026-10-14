# Payment — vòng đời giao dịch và chế độ giả lập

Backend hiện dùng provider `mock` trong mọi profile; chưa tích hợp nhận tiền thật hoặc chuyển tiền hoàn qua VNPay/ngân hàng. Profile `demo` chỉ bật endpoint tạo kết quả giả lập, không biến mock thành provider thật. Các nút giả lập cần profile demo và `PAYMENT_HMAC_SECRET` tối thiểu 32 ký tự.

## Vòng đời đã kiểm tra

| Tình huống | Order | Payment | Kho / ticket / hoàn tiền |
|---|---|---|---|
| Tạo draft | `pending` | Chưa có | Giữ kho; chưa có ticket |
| Checkout | `awaiting_payment` | `pending` | Kho vẫn giữ, snapshot địa chỉ cố định |
| Callback SUCCESS còn hạn | `paid` | `success` | Một PO Ticket PENDING và một email ORDER_PAID |
| Callback FAILED trước SUCCESS | `cancelled` | `failed` | Trả kho đúng một lần, không tạo ticket |
| Timeout | `cancelled` | `expired` | Trả kho đúng một lần |
| SUCCESS đến sau timeout/hủy/thất bại | Giữ `cancelled` | `refund_required` | Một refund PENDING, không giữ lại kho/không mở ticket |
| SUCCESS đã quá hạn nhưng scheduler chưa xử lý | `cancelled` | `refund_required` | Callback tự xử lý hết hạn, trả kho và tạo chờ hoàn tiền |
| FAILED đến sau khi đã hết hạn | Giữ `cancelled` | Giữ `expired` | Không trả kho lần hai |
| PO Ticket REJECT sau đã trả tiền | `cancelled` | `refund_required` | Kho trả một lần; refund PENDING |
| Xác nhận đối soát hoàn tiền | Giữ `cancelled` | `refunded` | Refund COMPLETED; bắt buộc reference hợp lệ |
| Callback trùng / trái chiều sau SUCCESS hoặc refund | Không lùi trạng thái | Giữ trạng thái cuối | Không tạo thêm ticket/email/refund/kho |

Chữ ký HMAC, order/payment ID và amount được kiểm tra trước xử lý trạng thái. Callback không nhận giá từ frontend. Khóa order trước payment, cùng thứ tự với timeout/hủy/review để tránh quyết định cạnh tranh làm nhân đôi kho. Ticket, order history, paid timestamps và email outbox được ghi cùng transaction; lỗi có thể rollback toàn bộ.

FAILED rồi SUCCESS là tình huống nhận thành công muộn: không đổi đơn đã hủy thành paid, phải tạo chờ hoàn tiền. SUCCESS rồi FAILED giữ thành công, không biến thành thất bại. Refund hoàn tất rồi callback lặp vẫn giữ refunded. Chỉ nhận một refund toàn phần cho payment; chưa có partial refund.

## API và giao diện

- GET `/api/payments/mode` public: `{provider:"mock",isSimulated:true,demoActionsEnabled}`. Không trả secret/config credential.
- Checkout trả thêm ba trường này ngoài hợp đồng cũ. Idempotency-Key giữ kết quả checkout; không tạo payment mới khi retry.
- API `/api/customer/orders` và chi tiết trả `payment` gồm id/provider/status/amount/paidAt/expiresAt/isSimulated và refund rút gọn (status/amount/completedAt). Không trả lý do hoàn nội bộ hoặc providerRef.
- GET `/api/orders/{id}/payment-reconciliation`: chỉ `super_admin`/`accountant`, workflow 2. Trả trạng thái order/payment/refund, inventoryReleased, `consistent`, danh sách `issues` và observedAt. Đọc ở REPEATABLE_READ để không ghép dữ liệu từ hai thời điểm khác nhau trong lúc callback xử lý. Không tự sửa dữ liệu.
- Profile demo: POST `/api/mock-payment/payments/{id}/complete?result=SUCCESS|FAILED`; alias `/mock-payment/payments/...` giữ tương thích. Cần Bearer của chủ đơn, nhân viên không được giả lập cho khách khác. Khi không có profile demo, controller không tồn tại.

Đối soát API là **kiểm tra nhất quán nội bộ**, không đối soát ngân hàng: kiểm tra payment/amount/paidAt, ticket theo giai đoạn, refund link/status/amount và ledger giữ/trả kho so với order items. `consistent=true` không phải bằng chứng đã chuyển tiền thật.

Web-shop có banner “Thanh toán GIẢ LẬP phục vụ đồ án — không thu tiền hoặc chuyển tiền hoàn thật”. Chế độ lấy từ backend, không từ cờ mock tùy ý của browser. Không xác định được chế độ thì chặn checkout. Chi tiết đơn hiển thị trạng thái payment thật trong DB, gồm chờ hoàn tiền/refunded, không suy ra từ paidAt của Order. Chỉ bật nút “Giả lập thành công/thất bại” khi server cho phép; kết quả phải được backend ghi và GET lại, không tự cập nhật thành công trong browser.

Để demo timeout, bật `SMARTBOX_JOBS_ENABLED=true`. Demo timeout mặc định một phút, scheduler kiểm tra mỗi phút; đơn có thể được hủy ở lần quét tiếp theo. Nếu worker tắt, background timeout không chạy; callback SUCCESS quá hạn vẫn tự xử lý đúng. Không gọi thời gian API HTTP là thời gian thanh toán ngân hàng.

Khi cấu hình database thử nghiệm, Supabase Auth và HMAC secret đã sẵn sàng, chạy từ thư mục backend:

```powershell
$env:SPRING_PROFILES_ACTIVE='demo'
$env:SMARTBOX_JOBS_ENABLED='true'
.\gradlew.bat bootRun
```

Spring không tự đọc file `.env`; cần export các biến trong `.env.example` vào process. Dùng database thử nghiệm để demo, không dùng tài khoản/tiền thật. Không bật `DEMO_FAIL_AFTER_PAID` trừ khi cố ý trình diễn rollback.

## Hoàn tiền và giới hạn

POST `/api/admin/refunds/{id}/complete` hiện chỉ ghi xác nhận đối soát cùng providerRef; **không chuyển tiền**. Với mock, dùng reference ghi rõ demo (ví dụ `DEMO-REFUND-1`) và trình bày kết quả là giả lập. Với thanh toán thật trong tương lai, chỉ đóng refund sau khi đối soát provider; cần thêm tích hợp, xác minh external transaction ID và xử lý kết quả provider.

Không cần tích hợp VNPay để trình diễn luồng đồ án hiện tại. Không dùng callback HMAC mô phỏng như giao thức của VNPay. Khi chuyển sang provider thật phải triển khai checkout/refund/status reconciliation theo hợp đồng provider và giữ nhãn chế độ phù hợp; bản hiện tại luôn khai báo isSimulated=true.

## Kiểm chứng

Các test Commerce có callback hợp lệ/sai chữ ký/sai amount, trùng callback, timeout, late success, review từ chối sau paid, rollback transaction và cạnh tranh callback/timeout. `PaymentLifecycleTests` bổ sung failed→late success, quá hạn trước scheduler, late failure, trái chiều sau success/refund, hủy→late success, callback thành công đồng thời, đối soát phát hiện sai lệch mà không sửa, projection chờ refund và phạm vi chủ đơn của demo. `PaymentModeTests` kiểm tra giả lập luôn rõ và điều kiện bật nút demo. Có suite PostgreSQL tương ứng.

Frontend test bổ sung giữ trạng thái refund_required khi Order đã có paidAt và xác minh thao tác demo dùng request Bearer thật, lỗi backend không được biến thành thành công. Các transport/provider trong test là fixture cục bộ; không giao dịch tiền thật.

Kết quả cuối nằm ở [báo cáo kiểm chứng](../../docs/frontend-handoff/contracts/payment-lifecycle-validation.json). Docker/WSL từng không khả dụng trong phiên làm việc này; luôn kiểm tra trường skipped và chạy lại suite PostgreSQL/full HTTP với Docker hoạt động trước khi chốt nghiệm thu. Không coi test bị skip là đã kiểm chứng.

Không có migration riêng cho thay đổi Payment lần này; bản tích hợp cần schema 001–006 đã bàn giao. Database thật của người dùng chưa được sửa, không có giao dịch/hoàn tiền thật được thực hiện.
