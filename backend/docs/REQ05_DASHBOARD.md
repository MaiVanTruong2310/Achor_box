# REQ-05 — Dashboard bán hàng theo biến thể

Đối chiếu REQ-05 trong `requirements.docx`. Đây là dashboard tổng hợp bốn phần, không phải chức năng xuất PDF/XLSX của REQ-04. Theo yêu cầu SmartBox, thay `top5Products`/`lowStockProducts` bằng `top5Variants`/`lowStockVariants`; định danh là UUID biến thể và SKU. API cũ `/api/dashboard/stats` vẫn tồn tại cho các client cũ, nhưng màn hình `/dashboard` của web-admin dùng API dưới đây.

## API và phạm vi thống kê

`GET /api/admin/dashboard?date=2026-10-07&mode=parallel`, Bearer token; chỉ `super_admin` và `accountant`. Bỏ date thì lấy ngày hiện tại theo Asia/Ho_Chi_Minh. Sai ngày/mode trả 400; không đăng nhập 401; không đủ quyền 403.

```json
{
  "date": "2026-10-07",
  "revenueToday": 1200000,
  "orderCountByStatus": {"PENDING":0,"AWAITING_PAYMENT":0,"PAID":1,"CONFIRMED":0,"COMPLETED":0,"CANCELLED":0},
  "top5Variants": [{"variantId":"UUID","productId":"UUID","name":"SmartBox","variantName":"Base","sku":"SB-BASE","quantitySold":1}],
  "lowStockVariants": [{"variantId":"UUID","productId":"UUID","name":"SmartBox","sku":"SB-BASE","stock":5}],
  "partial": false,
  "failedParts": [],
  "elapsedMs": 20,
  "demo": false,
  "mode": "parallel"
}
```

- Doanh thu: SUM(total), `paid_at` trong [00:00 ngày chọn, 00:00 ngày tiếp theo), giờ Việt Nam; chỉ paid/confirmed/completed. Bao gồm giao dịch mock/Sandbox nếu các đơn này đạt trạng thái hợp lệ; UI ghi rõ điều này. Không phải doanh thu ròng sau hoàn tiền.
- Trạng thái: toàn bộ đơn, không lọc theo ngày; luôn đủ sáu trạng thái kể cả 0.
- Top 5: SUM(quantity) theo variant_id/product_id, 30 ngày từ đầu ngày D−29 đến trước đầu ngày D+1, cùng điều kiện thanh toán/trạng thái. Đồng hạng theo variantId tăng dần. Tên/SKU lấy từ snapshot khi mua; vẫn tính biến thể đã ngừng bán để giữ lịch sử. Dòng legacy không có variant_id không thể quy cho SKU nên bị loại khỏi bảng này.
- Tồn thấp: stock_quantity hiện tại ≤ 5, gồm cả 0; cả sản phẩm cha và biến thể phải active; tăng dần theo tồn rồi variantId. Đây là tồn có thể bán sau giữ/hoàn kho, không phải tồn lịch sử tại ngày chọn.

## Đồng thời, lỗi và trace

Executor riêng `dashboardExecutor`, mặc định core=max=4, queue=50; TaskDecorator truyền/khôi phục MDC. Bốn tác vụ được đưa trực tiếp vào executor này; CompletableFuture thu kết quả và áp dụng timeout 1500ms riêng cho từng phần, tính cả thời gian chờ hàng đợi. FutureTask cho phép interrupt tác vụ khi timeout hoặc request bị từ chối; không dùng commonPool/parallelStream.

Lỗi/timeout: HTTP 200, trường tương ứng null, partial=true, failedParts chứa tên phần; ba phần tốt vẫn hiển thị. Kết quả rỗng là [] hoặc 0, khác với null do lỗi. Executor từ chối: HTTP 503 DASHBOARD_BUSY. Mỗi phần và tổng request log elapsedMs; lỗi log ERROR với traceId. Tổng thời gian đo là xử lý phía backend, không gồm đường truyền/trình duyệt.

Interrupt không bảo đảm driver đã hủy truy vấn JDBC. Khi triển khai cần statement_timeout phù hợp, giới hạn connection pool và đo tải với dữ liệu thật. Bốn truy vấn dùng kết nối độc lập nên không cam kết một snapshot giao dịch duy nhất khi có cập nhật đồng thời.

## Demo so sánh và giả lập lỗi

Kích hoạt profile `demo` trên môi trường kiểm thử. Dùng prefix hiện có của dự án là `smartbox`, thay cho prefix `app` của tài liệu tham khảo. Các tên phần đổi theo biến thể.

```properties
smartbox.demo.dashboard.delay.revenueToday=500ms
smartbox.demo.dashboard.delay.orderCountByStatus=500ms
smartbox.demo.dashboard.delay.top5Variants=500ms
smartbox.demo.dashboard.delay.lowStockVariants=500ms
```

So sánh cùng date, `mode=parallel` và `mode=sequential`: khoảng 500ms và ít nhất 2000ms khi truy vấn nhanh. UI chỉ hiện lựa chọn so sánh nếu backend báo demo=true; không cache báo cáo. Ngoài demo, sequential trả 400 và cấu hình delay/fail bị bỏ qua.

Để kiểm tra timeout, chỉ đặt `smartbox.demo.dashboard.delay.top5Variants=3s`; top5Variants=null sau khoảng 1500ms. Để lỗi tức thời, đặt `smartbox.demo.dashboard.fail[0]=lowStockVariants`. Delay phải từ 0 đến 30s. Bỏ các cấu hình khi kết thúc demo; không mặc định bật giả lập lỗi.

## Kiểm chứng

`DashboardAndEmailTests`: bốn truy vấn thực sự cùng chạy, truyền MDC; partial/timeout; từ chối 503; sequential 4×500ms so với parallel; delay 3s bị ngắt và phục hồi; 60 request cùng lúc trong giới hạn thời gian rồi phục hồi; binding Duration và tên SKU; khóa demo ngoài profile.

`PostgresDashboardTests`: PostgreSQL 16 tạm riêng, kiểm tra biên ngày Việt Nam và 30 ngày, loại đơn hủy/chưa trả tiền, hai biến thể cùng sản phẩm không bị gộp, đồng hạng, tồn 0/5 và loại variant/parent inactive. Không đọc backend/.env, không chạm Supabase thật.

`BackendApplicationTests.dashboardHttpUsesRolesDateValidationAndDemoGate`: HTTP thực, phân quyền, ngày, contract biến thể, giới hạn profile. `web-admin/tests/admin-api.test.mjs`: không cache, giữ null/0, truyền date/mode, hiển thị lỗi 503 thay vì dữ liệu thay thế.

Email local hiện MAIL_ENABLED=false và SMARTBOX_JOBS_ENABLED=false; SMTP localhost:1025, giao diện Mailpit localhost:8025 chưa chạy tại thời điểm kiểm tra. Dashboard không phụ thuộc SMTP.
