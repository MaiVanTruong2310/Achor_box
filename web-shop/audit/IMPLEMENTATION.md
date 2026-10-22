# Achor_box webshop — đối chiếu 17/10/2026

Backend: Java 21, Spring Boot 3.4, PostgreSQL, Liquibase, Redis, JWT/Supabase, VNPay Sandbox. Nhánh website. Backend/Admin/Docker/database chỉ đọc.

| Chức năng | API thực tế | Phát hiện trước sửa | Ưu tiên / xử lý |
|---|---|---|---|
| Catalog | GET /products, /products/paged, /products/{id}, /products/categories, /products/{id}/variants | Ẩn sản phẩm chưa có SKU; thiếu giá trên thẻ, lọc category, sort | P1: dữ liệu Admin, bộ lọc và phân trang |
| Auth | POST /auth/login, /refresh-token, /logout, /register, /forgot-password, /reset-password; GET/PUT /customer/profile | Hợp đồng phẳng còn tương thích; cần chặn tài khoản nhân viên trong portal khách hàng | P0: phiên/401/role; giữ tích hợp Supabase recovery |
| Cart | Không có cart API; POST /pricing/calculate là read-only | Tổng cũ từ localStorage, chưa voucher | P0: báo giá máy chủ, revalidate SKU trước tạo đơn |
| Order | POST /orders; GET /customer/orders, /customer/orders/{id}; item CRUD | Đã có, nhưng luồng cũ thanh toán trước duyệt | P0: tạo đơn → chờ duyệt → quyết định nếu duyệt một phần → thanh toán |
| Approval | GET /orders/{id}/ticket; POST /orders/{id}/customer-decision {accept}; POST /tickets/{id}/resubmit | Thiếu quyết định và trạng thái customer_decision_pending | P0: bổ sung quyết định, kết quả từng dòng |
| Payment | GET /payments/mode; POST /orders/{id}/checkout; GET /orders/{id}/payment-session | Nhầm awaiting_payment luôn có payment | P0: chỉ resume khi payment pending; tạo phiên sau duyệt |
| Voucher | POST /pricing/calculate {items,voucherCode}; POST /orders nhận couponCode | /promotions/validate thuộc role nhân viên, không dùng | P1: dùng pricing API, giá cuối từ order |
| Invoice | GET/POST /orders/{id}/sales-invoice | Đã có iframe sandbox và tải HTML | Giữ, xác minh hợp đồng |
| Address | GET/POST /customer/addresses; PUT/DELETE /customer/addresses/{id} | Đã có | Validation theo DTO |
| Delivery | GET /orders/{id}/delivery-installation; customer detail/timeline | Đã có màn theo dõi | Bổ sung nhãn trạng thái nghiệm thu |
| Warranty | /customer/warranties, /customer/warranty-claims, upload images | Đã có | Giữ ownership + idempotency |
| Devices | Chỉ POST /devices/register (staff); /devices/my-devices và command routes không còn | UI gọi API đã bị loại bỏ | P1: giữ code cũ, hiển thị giới hạn và không gọi API không tồn tại |
| CMS/Review | /content/** chỉ super_admin/product_manager | Không có API công khai | Giữ bài hướng dẫn tĩnh; không giả reviews/CMS |
| Wishlist/contact | Không có API | Form liên hệ disabled | Thay bằng liên kết tác vụ đang hỗ trợ |

## Nghiệp vụ
SKU = product_variants, giá calculatedPrice (backend base price + price_delta), tồn kho SKU. Đơn giữ kho và snapshot tại server. Pending là chờ duyệt; có ticket ngay lúc tạo. APPROVED chuyển awaiting_payment; PARTIALLY_REJECTED chuyển customer_decision_pending. Customer accept chỉ giữ dòng được duyệt; decline hủy. Không tự tính tổng mới sau duyệt một phần. Đơn paid/confirmed cần nhân viên xử lý hủy; khách chỉ hủy trước thanh toán. Hóa đơn chỉ server phát hành sau thanh toán và xác minh snapshot.

## Môi trường đã quan sát
Docker PostgreSQL/Redis/Mailpit healthy, pgAdmin running. Tiến trình backend thuộc Achor_box. GET /products trả mảng rỗng; /payments/mode trả vnpay/sandbox. Không seed, không tạo đơn, không đăng ký account, không phát hành hóa đơn khi kiểm thử. Không khởi chạy backend do Liquibase mặc định bật và có thể ghi schema. VNPAY_RETURN_URL mặc định ở mã nguồn là cổng 5173, webshop 5174: cần người quản trị xác minh env thực tế, frontend không sửa backend.


## Kết quả thực hiện
- P0: giỏ hàng báo giá từ pricing API, voucher gửi đúng tên trường cho từng endpoint, revalidate SKU và giá trước tạo đơn, giữ giỏ khi lỗi, khóa thao tác khi kết quả không xác định.
- P0: đơn mới chuyển chi tiết chờ duyệt, không mở checkout khi pending/customer_decision_pending. Quyết định đơn được duyệt một phần có xác nhận và không tự tính tổng.
- P0: awaiting_payment chưa có payment thì POST checkout; có pending payment thì GET payment-session. Giữ idempotency key và chỉ redirect VNPay Sandbox đúng host.
- P1: danh mục category/search/size/stock/sort/pagination 12 phía client; thẻ giá SKU; chi tiết gọi API theo ID, không phụ thuộc catalog cache. Sản phẩm active chưa có SKU vẫn xem được nhưng không mua được.
- P1: trạng thái chờ duyệt/duyệt một phần/hoàn tiền được dịch; tổng đơn hiển thị subtotal/discount/voucher từ backend; giữ hóa đơn sandbox, địa chỉ, hồ sơ, bảo hành và theo dõi giao/lắp.
- P1: role guard khách hàng, xử lý GET vẫn 401 sau refresh, form phone, chống NaN trong hiển thị tiền, giỏ không crash khi localStorage bị chặn.
- P2: skeleton tôn trọng reduced motion, toast thêm giỏ, toolbar responsive, empty state, thay form liên hệ vô dụng bằng các tác vụ hỗ trợ thật. Source thiết bị cũ được giữ nhưng route không gọi API đã loại bỏ.

## Kiểm thử 17/10/2026
- `npm run typecheck`: PASS.
- `npm run build`: PASS (Vite 8.3.0, 1908 modules).
- `npm test`: 33/33 PASS; 9 test hợp đồng mới. HTTP test độc lập, không gọi DB.
- Không có lint script/config ESLint: không báo lint pass.
- GET thật `/products`: 200, []; GET `/products/categories`: có 3 danh mục; GET `/payments/mode`: VNPay Sandbox. Không gửi POST nghiệp vụ trên backend thật.
- Browser: catalog rỗng đúng dữ liệu; categories có dữ liệu; protected route đưa khách chưa đăng nhập tới login với returnTo; menu sản phẩm vẫn cùng tab `/#choose`; cart rỗng có CTA. Viewport 390 và 1440, scrollWidth bằng clientWidth ở màn đã kiểm tra. Console error: 0 trong các màn đã mở. Không khẳng định mọi trang mobile đã kiểm tra bằng dữ liệu thực.
- Flow A với sản phẩm/SKU, Flow B tạo đơn/thanh toán/hóa đơn, Flow C register/login/profile/logout thật, Flow D lịch sử/chi tiết thật: CHƯA E2E vì catalog đang rỗng, chưa có tài khoản và chưa có phép ghi dữ liệu thử. Các hợp đồng và nhánh lỗi được kiểm bằng unit tests; không coi đó là E2E.
- Cấu hình env hiện có đã đặt VNPay return về cổng 5174 (đã đọc riêng giá trị công khai); không sửa cấu hình backend.

## Bảo toàn
Đối chiếu SHA-256 với baseline: không có file ngoài web-shop bị đổi, thêm hoặc xóa trong tập kiểm tra (loại .git, build, node_modules, dist, .gradle). Git vẫn nhánh website, `?? web-shop/`, không thay đổi tracked files. Không xóa file cũ của webshop. Không chạy Git mutation, backend build/start, SQL, migration, seed, thao tác Docker mutation hay API ghi dữ liệu thật. Bản sao code trước sửa ở audit/webshop-before.zip (không chứa .env, dependency hoặc build). Danh sách thay đổi tại scope-check.json.

### File đã chỉnh sửa
- `web-shop/.env.example`
- `web-shop/HANDOFF-COVERAGE.md`
- `web-shop/package.json`
- `web-shop/README.md`
- `web-shop/src/App.tsx`
- `web-shop/src/CatalogContext.tsx`
- `web-shop/src/shop.css`
- `web-shop/src/ShopContext.tsx`
- `web-shop/src/api/customer.ts`
- `web-shop/src/api/shop.ts`
- `web-shop/src/components/DraftEditor.tsx`
- `web-shop/src/components/QuantityStepper.tsx`
- `web-shop/src/components/ShopUi.tsx`
- `web-shop/src/pages/CustomerAccount.tsx`
- `web-shop/src/pages/ShopCommerce.tsx`
- `web-shop/src/pages/ShopPlanned.tsx`
- `web-shop/src/pages/ShopPublic.tsx`
- `web-shop/src/pages/ShopStories.tsx`

### File mới
- `web-shop/scripts/commerce.test.mjs`
- `web-shop/src/api/commerce.ts`
- `web-shop/src/components/ApprovalDecision.tsx`
