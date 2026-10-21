> Ghi chú 17/10/2026: Đây là bản đối chiếu handoff lịch sử. Hợp đồng Achor_box hiện tại và giới hạn API được cập nhật trong [audit/IMPLEMENTATION.md](audit/IMPLEMENTATION.md). Các API điều khiển thiết bị cũ không còn được gọi từ route webshop.

# Web-shop: chức năng và motion theo handoff

Phạm vi được người dùng chốt: web-shop khách hàng trước; giữ giao diện sáng hiện tại. Nguồn: frontend-handoff 10, 11, 12, 13, 14, 15, 16, 17, 18 và contracts. Không thay web-admin/backend/database.

## Motion

| Yêu cầu | Triển khai | Giới hạn / evidence |
|---|---|---|
| Hero text 420 ms / visual 900 ms | CSS entry chỉ trang marketing | Reduced motion bỏ animation; không animation account/checkout |
| Reveal 16 px / 420 ms | IntersectionObserver và focus-within | Không ẩn section đã trong viewport; hủy observer khi chuyển trang |
| Float nhẹ, dừng khi tương tác | Viewer render float hình minh họa | Dừng khi tab hidden / parent ngoài viewport / reduced motion |
| Camera tiến gần khóa 900 ms | Scene lock, camera target, highlight vùng control | Geometry minh họa; chưa phải ảnh chi tiết phần cứng |
| Story command → ACK → telemetry | Ba nút khám phá, copy chuyển 250 ms | Nội dung giải thích, không gửi command thật từ marketing |
| Base → Pro 250 ms | Controls khám phá, geometry Pro, feature copy | Không suy capability từ tên SKU hoặc dữ liệu device |
| S/M/L | Controls 45/85/150 L, cập nhật label và crossfade | Không scale geometry để giả kích thước vật lý; asset từng SKU chưa có |
| Phone 24 px / 420 ms | Reveal app concept, chuyển tab Thiết bị/Bưu kiện | Không screenshot Flutter, không điều khiển thiết bị thật |
| Gallery | Chuyển ảnh 250 ms, retry ảnh hỏng | Chỉ ảnh từ catalog |
| Exploded/CAD/GLB thật | Chưa bật; dùng sơ đồ nguyên lý | BLOCKED: thiếu CAD/nodes/manifest/assets được duyệt |

## Public và customer screens

| Route / chức năng | Trạng thái frontend | Dependency |
|---|---|---|
| `/`, `/products`, `/products/:id` | Catalog/variants thật, filter toàn bộ dữ liệu đã tải, gallery, quantity stepper, sticky CTA mobile | Backend catalog + variants theo handoff; SKU hợp lệ mới mua |
| `/compare`, `/technology`, `/how-it-works` | Nội dung/diagram/flow theo phạm vi thiết kế | Không claim IP65/SLA/battery/warranty giả |
| `/app` | App concept, tabs, feature descriptions, download disabled | Flutter screenshot/store chính thức thiếu |
| `/blog`, `/blog/:slug` | Bài giải thích tĩnh từ nội dung thiết kế, search/chủ đề/detail | Không dùng CMS admin cho guest; public CMS thiếu |
| `/faq`, `/about` | FAQ search/accordion và nội dung dự án | Không đưa thông tin cá nhân hoặc chính sách chưa duyệt |
| `/contact` | Form đúng cấu trúc nhưng khóa gửi | Contact submit và contact chính thức thiếu |
| `/login` | Flat response, show password, safe returnTo, cooldown, refresh | Backend auth/provider đúng contract |
| `/register`, recovery/reset | Register/forgot/reset thật, xác nhận mật khẩu, thiếu proof không gửi | Supabase email template/redirect cần token_hash |
| `/account/profile`, `/account/addresses` | GET/PUT hồ sơ, đổi mật khẩu, address CRUD/mặc định | API customer, phiên đăng nhập |
| `/cart` | Quantity stepper, addressId hoặc shippingDetails, revalidate giá/kho, tạo draft | POST create không tự replay; timeout hướng dẫn reconcile |
| `/checkout/:orderId` | Server snapshots, expiry hint, stable checkout key | Production gateway chưa có; demo phải bật rõ |
| `/demo-payment/:paymentId` | GET payment, POST complete có query result, xác minh lại order | Chỉ `VITE_ENABLE_DEMO_PAYMENT=true` + backend profile demo; không sign HMAC phía client |
| `/payment/result` | GET/poll 2–5 s tối đa 120 s, query success ignored | Payment/refund từ customer projection; mock gắn nhãn |
| Orders/detail/ticket | Paging, history, edit pending SKU, cancel unpaid, RETURNED resubmit | Paid items immutable; 401/403 không fallback |
| Installation tracking | Lịch, các mốc giao/lắp, nghiệm thu và timeline từ customer order | Không hiển thị staff ID/internal notes; không suy từ shipment |
| Devices/detail | Owner list/activation, LOCK/UNLOCK, command poll 15 s, telemetry poll 10 s, readings/packages paging | Hardware/MQTT cần E2E; TARE/weight ẩn do thiếu capability |
| Notifications | List/read void/preference | FCM token chỉ thêm khi SDK/provider cấu hình được chốt |
| Warranty/claim | Warranties/claims phân trang, claim và ảnh multipart | Schema, Cloudinary; server quyết định eligibility |

## Kiểm tra và blockers

`npm run build` kiểm tra TypeScript/Vite. `npm test` kiểm tra hợp đồng HTTP/auth, cờ demo, WebGL fallback, camera transition, Pro geometry, reduced motion, render visibility và origin của message. Đây là unit/contract tests, không thay cho provider/GPU/phần cứng E2E.

Backend đã cập nhật tới 811cd1a, có customer auth/account/order/warranty và delivery installation. Frontend đã nối API. 23 unit/contract tests và build đã qua; trình duyệt xác nhận đăng ký bắt buộc và reset thiếu mã. Backend chưa chạy khi kiểm tra nên chưa xác nhận E2E DB/provider.

Còn cần kiểm tra với dữ liệu test: Supabase email/recovery, PostgreSQL schema, Cloudinary, MQTT/firmware, FCM và payment demo. Contact/CMS public, gateway tiền thật, app release và CAD/GLB thật chưa hoàn thành. Unit tests không xác nhận các dịch vụ ngoài đã hoạt động.
