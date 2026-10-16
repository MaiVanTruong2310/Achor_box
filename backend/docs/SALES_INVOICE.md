# Hóa đơn bán hàng HTML SmartBox

Đã có mẫu HTML tiếng Việt dùng Thymeleaf, logo từ `web-admin/public/Logo.png` nhúng vào chứng từ, thông tin cửa hàng, khách/người nhận, địa chỉ giao/lắp đặt, mã đơn, ngày đặt mua/thanh toán/lập hóa đơn (giờ Việt Nam), SKU/biến thể, số lượng, đơn giá, thành tiền, tổng thanh toán và hình thức/mã giao dịch. CSS hỗ trợ màn hình nhỏ và in A4, lặp tiêu đề bảng khi nhiều trang. Đây là chứng từ bán hàng; không phát hành hóa đơn điện tử VAT.

## Trước khi chạy

Áp dụng [010_sales_invoices.sql](../src/main/resources/db/migration/010_sales_invoices.sql) sau 001–009. Migration chỉ đã được kiểm thử trên PostgreSQL tạm; chưa chạy vào Supabase của người dùng. Dự án không tự chạy migration.

Điền thông tin thực trong `backend/.env`, khởi động lại backend từ backend/source_code để nạp biến môi trường (hoặc dùng `run-local.ps1`):

```dotenv
INVOICE_SHOP_NAME=SmartBox
INVOICE_SHOP_ADDRESS=
INVOICE_SHOP_PHONE=
INVOICE_SHOP_EMAIL=
INVOICE_SHOP_WEBSITE=
INVOICE_SHOP_TAX_CODE=
```

Tên mặc định SmartBox; trường thiếu hiện “chưa cấu hình”. Không tự đặt địa chỉ, số điện thoại hoặc mã số thuế. Điền trước lần lập đầu tiên: cấu hình cửa hàng đã lưu trong hóa đơn cũ không bị thay đổi khi sửa `.env`. Thay logo mặc định bằng tài sản cửa hàng trong `src/main/resources/invoice/logo.png` trước build nếu cần; không lấy ảnh từ URL bên ngoài khi xem/in.

## Sử dụng

- Admin/kế toán/hỗ trợ: mở chi tiết đơn → **Xem / In hóa đơn bán hàng**. Nút bật khi API đơn ghi nhận đã thanh toán.
- Khách: vào Tài khoản → Đơn hàng → Chi tiết → **Xem / In hóa đơn bán hàng**.
- **Tải HTML** lưu bản HTML độc lập có logo và CSS. **In / Lưu PDF** mở hộp thoại in trình duyệt; chọn Save as PDF để lưu PDF. Đây không phải API xuất PDF phía server.
- Hóa đơn lập khi người dùng yêu cầu lần đầu, sau thanh toán hợp lệ; chưa tự gửi hóa đơn qua email.

## API và tính nhất quán

Bearer token ở tất cả endpoint. Customer phải sở hữu order; super_admin/accountant/support_agent được xem; các vai trò khác bị từ chối tại service.

| Endpoint | Kết quả |
|---|---|
| POST `/api/orders/{id}/sales-invoice` | Lập lần đầu hoặc trả hóa đơn đã có, HTTP 200 |
| GET `/api/orders/{id}/sales-invoice` | Trả hóa đơn đã có; chưa lập trả 404 |
| GET `/api/orders/{id}/sales-invoice.html` | Tải HTML của hóa đơn đã có, cùng kiểm tra quyền |

JSON: `{invoiceNumber,orderId,issuedAt,html}`. Number là `SB-` + UUID đơn in hoa, không dùng số thứ tự để suy đoán giao dịch. Không có hóa đơn demo thay thế khi API lỗi.

Lần đầu yêu cầu paid/confirmed/completed và paid_at, workflow_version=2, snapshot địa chỉ, payment success có paid_at và amount bằng total, snapshot tên/SKU của từng dòng, tổng quantity×unit_price bằng total. Không phát hành cho pending/awaiting_payment/cancelled, giao dịch callback chưa xác nhận hoặc đơn legacy chưa đối chiếu. Dữ liệu hiện tại không có tách phí giao/thuế/giảm giá trên Order: không tự thêm các khoản này; nếu tổng lệch, trả 409 yêu cầu đối chiếu.

Lập khóa order trước, cùng thứ tự với payment/cancel; bảng sales_invoices UNIQUE(order_id) và invoice_number. Nhiều lượt lập đồng thời chỉ tạo một snapshot và một audit SALES_INVOICE_ISSUED. Thông tin người nhận từ order.shipping_address_snapshot; tên, SKU và giá lấy từ order_items snapshots. Cửa hàng, logo, giao dịch và các số tiền được lưu khi lập; trigger chặn sửa/xóa chứng từ.

In lại không sửa snapshot. Nếu đơn sau đó bị hủy, bản xem ghi **ĐƠN ĐÃ HỦY**; nếu có refund, hiển thị chờ xử lý hoặc đã ghi nhận đối soát hoàn tiền theo dữ liệu backend. Trạng thái này được đọc mỗi lần yêu cầu, không tự xác nhận provider đã hoàn tiền. File HTML đã tải trước đó là bản tại thời điểm tải; muốn trạng thái mới phải tải lại.

Mock và VNPAY Sandbox được đánh dấu **BẢN KIỂM THỬ**, không khẳng định thu tiền thật. Không biến ReturnURL của VNPAY thành bằng chứng thanh toán.

Response no-store; HTML attachment có nosniff và CSP chặn script/kết nối/ảnh ngoài. Frontend nhận HTML bằng API có xác thực rồi hiển thị iframe sandbox, không đưa token vào URL. Template chỉ dùng th:text với dữ liệu khách/SKU/config, không th:utext. sales_invoices bật RLS không có policy cho frontend Supabase, chỉ backend ghi/đọc.

## Kiểm thử

SalesInvoiceHttpTests dùng đầy đủ schema + 001–010 trên PostgreSQL riêng: auth/ownership/roles, từ chối đơn chưa trả tiền và hủy trước lập, mẫu HTML/tiếng Việt/logo/tổng biến thể, escaping, no-store/CSP/attachment, snapshot khi đổi catalog/profile/shop, tám lượt lập đồng thời, immutable trigger, hủy/hoàn tiền sau khi lập. Các kiểm thử API frontend kiểm tra POST có xác thực, hết phiên và lỗi 403/409.

File mẫu trong `backend/build/audit/sales-invoice-example.html` chỉ chứa dữ liệu kiểm thử. Kết quả xác minh: [sales-invoice-validation.json](../../docs/frontend-handoff/contracts/sales-invoice-validation.json).
