# Achor_box Webshop

React 19 + TypeScript + Vite. Giữ giao diện sáng và animation hiện tại, kết nối backend hiện có. Báo cáo: [audit/IMPLEMENTATION.md](audit/IMPLEMENTATION.md). Danh sách endpoint: [audit/API-INVENTORY.md](audit/API-INVENTORY.md).

## Chạy webshop
```powershell
cd D:\BAV\Project\DoAn\Achor_box\web-shop
npm install
npm run dev -- --strictPort
```
Mở http://localhost:5174. `.env` tùy chọn: `VITE_API_URL=http://localhost:8080/api`. Không cần Supabase key/database password trong frontend. Payment mode lấy từ backend, không ép mock bằng biến VITE.

## Backend (do người quản trị chạy)
Backend hiện có đang chạy trên http://localhost:8080. Script có sẵn:
```powershell
cd D:\BAV\Project\DoAn\Achor_box\backend
.\run-local.ps1
```
Script nạp `backend/.env`, rồi chạy Gradle bootRun. Java 21, PostgreSQL, Redis và cấu hình Supabase/JWT phải hợp lệ. **Liquibase mặc định bật: khởi động backend có thể chạy migration.** Không chạy lại khi backend đang chiếm cổng 8080. Đợt chỉnh webshop này không chạy script/backend build/migration.

Các biến cần người quản trị kiểm tra (không đưa secrets vào web-shop): SPRING_DATASOURCE_URL/USERNAME/PASSWORD, REDIS_HOST/PORT, JWT_SECRET, SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY, CORS_ORIGINS, SHOP_URL, PAYMENT_PROVIDER, VNPAY_TMN_CODE, VNPAY_HASH_SECRET, VNPAY_RETURN_URL. CORS cần origin webshop; VNPay ReturnURL phải trỏ route `/payments/vnpay/return` của webshop (cổng 5174). Đã xác minh file env hiện có đặt VNPAY_RETURN_URL về localhost:5174/payments/vnpay/return; không chỉnh sửa file này.

## Luồng
Sản phẩm → chọn SKU → giỏ hàng → báo giá/voucher từ `/pricing/calculate` → gửi đơn → chờ quản lý duyệt → xác nhận nếu duyệt một phần → mở thanh toán → xác minh trạng thái từ backend → hóa đơn → giao/lắp/ nghiệm thu → bảo hành.
Giá trong localStorage chỉ là cache. Tạo đơn chỉ gửi SKU, số lượng, địa chỉ và couponCode. Không gửi tổng tiền hoặc tự trừ kho. Tạo đơn lỗi giữ giỏ; lỗi chưa xác định không tự POST lại. Checkout dùng Idempotency-Key.

## Giới hạn thật
- Backend trả catalog rỗng khi kiểm tra. Người quản trị cần tạo sản phẩm/SKU/giá/tồn kho qua Web Admin. Webshop không seed hay chèn dữ liệu giả.
- Auth customer vẫn phụ thuộc Supabase qua backend; Redis chỉ là một phần quản lý phiên/rate limit.
- API CMS/reviews/settings/promotions list dành cho nhân viên; không gọi từ storefront. Voucher dùng pricing API công khai.
- Không có wishlist/contact form/cart persistence API hoặc API điều khiển thiết bị khách hàng trong controller hiện tại. Cart lưu cục bộ; routes thiết bị giải thích giới hạn. Giữ source cũ để không mất code.
- Catalog dùng API danh sách và phân trang phía trình duyệt (12 sản phẩm) để sort giá SKU trên toàn bộ kết quả. Backend `/products/paged` hiện chưa có tham số sort/public-active. Khi danh mục lớn cần quyết định chiến lược phân trang mới; không sửa backend trong tác vụ này.
- Chưa kiểm thử giao dịch E2E thật vì không có sản phẩm, tài khoản test và chưa có quyền ghi dữ liệu. Không tạo tài khoản/đơn/thanh toán/hóa đơn thử.

## Kiểm tra
```powershell
npm run typecheck
npm test
npm run build
```
Không có cấu hình ESLint trong dự án; không báo lint pass thay cho typecheck. Tests dùng mock HTTP độc lập, không kết nối database.
