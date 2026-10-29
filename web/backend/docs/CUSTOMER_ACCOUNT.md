# Customer Account — tài khoản tự phục vụ

**Cập nhật kiểm chứng sau phần Payment:** Docker đã hoạt động lại; các suite PostgreSQL và full HTTP cho Customer Account đã chạy thành công trong bộ kiểm thử tổng hợp. Xem [báo cáo kiểm chứng](../../docs/frontend-handoff/contracts/payment-lifecycle-validation.json). Các ghi chú Docker/skip phía dưới ghi lại lần kiểm thử trước khi môi trường được khôi phục.

Đã triển khai backend và web-shop: đăng ký, hồ sơ, sổ địa chỉ giao/lắp đặt, đổi mật khẩu, khôi phục mật khẩu và đơn hàng kèm tiến độ DeliveryInstallation. Các màn hình tài khoản/đơn hàng dùng backend thật, không tạo phiên đăng nhập, đơn hàng hoặc thành công giả trong localStorage.

## API và quyền

| Method / path | Quyền | Body / response |
|---|---|---|
| POST `/api/auth/register` | Public, giới hạn tốc độ | `{email,password,fullName,phone?}` → thông báo chung, `requiresLogin:true` |
| POST `/api/auth/forgot-password` | Public, giới hạn tốc độ | `{email}` → cùng thông báo nếu email tồn tại hoặc không tồn tại |
| POST `/api/auth/reset-password` | Public, giới hạn tốc độ | `{tokenHash,newPassword}`; Supabase xác minh proof loại `recovery` trước khi đổi mật khẩu |
| POST `/api/auth/change-password` | Khách, Bearer | `{currentPassword,newPassword}`; xác thực lại mật khẩu cũ và kiểm tra UUID phiên trùng khách hiện tại |
| GET `/api/customer/profile` | Khách, Bearer | `{id,email,fullName,phone,createdAt}` |
| PUT `/api/customer/profile` | Khách, Bearer | `{fullName,phone?}` → hồ sơ đã lưu |
| GET `/api/customer/addresses` | Khách, Bearer | Danh sách địa chỉ của người hiện tại |
| POST `/api/customer/addresses` | Khách, Bearer | Address → 201 |
| PUT `/api/customer/addresses/{id}` | Chủ địa chỉ | Address → địa chỉ đã lưu |
| DELETE `/api/customer/addresses/{id}` | Chủ địa chỉ | 204 |
| GET `/api/customer/orders?page=0&size=20` | Khách, Bearer | `{content,page,size,totalElements,totalPages}`; mỗi đơn kèm snapshot và `deliveryInstallation` |
| GET `/api/customer/orders/{id}` | Chủ đơn | Chi tiết, lịch sử trạng thái và tiến độ giao/lắp đặt |

Address: `{label,recipientName,phone,addressLine,installationNote?,isDefault}`; response thêm `id`. Giới hạn 20 địa chỉ/khách. Địa chỉ đầu tiên thành mặc định; chọn địa chỉ mặc định mới thay thế địa chỉ cũ. Xóa địa chỉ mặc định chọn địa chỉ còn lại đầu tiên. Đổi thông tin địa chỉ mặc định vẫn giữ nó làm mặc định nếu chưa chọn địa chỉ khác.

Hồ sơ không cho sửa email, role, trạng thái khóa, UUID hoặc bảo mật qua DTO khách. Vai trò mới luôn `customer`, không lấy role từ client/user_metadata. Profile chỉ tạo khi nhận được phiên/user đã được auth provider xác minh; signup trả user giả khi trùng email không được dùng để sửa hồ sơ hiện hữu. Đăng nhập/refresh giữ hợp đồng cũ; frontend lưu access/refresh token, làm mới một lần cho các request đồng thời và xóa phiên khi nhận 401. Không lưu mật khẩu trong database ứng dụng.

Mật khẩu mới 8–72 ký tự; họ tên tối đa 200, email 254, label 100, phone 30, địa chỉ và ghi chú 2.000. Các thao tác Auth giới hạn 10 request/phút/IP/endpoint tại backend, ngoài giới hạn provider. UUID/token/body sai trả 400, không đăng nhập hoặc recovery proof hết hạn trả 401, sai role/phạm vi trả 403 hoặc 404, giới hạn địa chỉ trả 409, giới hạn tốc độ 429, provider chưa cấu hình/mất kết nối 503. Không trả chi tiết lỗi provider chứa thông tin tài khoản.

## Địa chỉ trên đơn và checkout

POST `/api/orders` giữ tương thích `{shippingAddress:"địa chỉ",items:[{variantId,quantity}]}` và nhận thêm hai cách mới. Chỉ chọn **một** nguồn địa chỉ:

```json
{"addressId":"UUID địa chỉ thuộc khách","items":[{"variantId":"UUID phiên bản","quantity":1}]}
```

```json
{"shippingDetails":{"label":"Địa chỉ trên đơn","recipientName":"Người nhận","phone":"0912345678","addressLine":"Địa chỉ đầy đủ","installationNote":"Gọi trước khi đến","isDefault":false},"items":[{"variantId":"UUID phiên bản","quantity":1}]}
```

Backend đọc địa chỉ theo UUID **và chủ sở hữu**, lưu `shipping_address` cùng `shipping_address_snapshot` chứa người nhận, điện thoại, email của tài khoản, địa chỉ và hướng dẫn lắp đặt. Không nhận giá/tổng tiền/email người đặt từ client để quyết định thanh toán. `source_address_id` chỉ để truy vết, không có FK đến sổ địa chỉ; xóa địa chỉ không làm mất snapshot.

Snapshot được sao chép ngay khi tạo đơn, giữ nguyên khi checkout; không đọc lại địa chỉ đang sống. Đơn draft workflow 2 có trước migration và chưa có snapshot sẽ được sao chép từ địa chỉ trên đơn + liên hệ hiện tại tại thời điểm checkout. Không backfill thông tin liên hệ cho đơn lịch sử đã thanh toán/giao. PostgreSQL trigger chặn sửa địa chỉ/snapshot/source UUID sau khi đơn rời `pending`.

Màn hình nhân viên DeliveryInstallation dùng liên hệ từ snapshot cho các đơn mới, tránh thay đổi người nhận khi khách sửa hồ sơ. Đơn cũ chưa có snapshot vẫn giữ cách đọc tương thích cũ; không xem đó là bằng chứng liên hệ lịch sử.

API khách bỏ ticket/shipment quản trị, actor ID, lý do thất bại và ghi chú nội bộ của nhân viên. `deliveryInstallation=null` nếu chưa phân công; khi có, trả status, lịch hẹn và mốc nhận việc/giao/lắp/nghiệm thu, xác nhận khách, serial của thiết bị thuộc đơn. Order vẫn `confirmed` trong giai đoạn giao/lắp, chỉ `completed` sau nghiệm thu đạt.

## Cấu hình Supabase Auth và email

Không cần thêm khóa admin để đăng ký khách: dùng `SUPABASE_URL`, `SUPABASE_ANON_KEY` và kết nối database backend hiện có. `SHOP_URL` là origin web-shop (mặc định local `http://localhost:5174`); production phải dùng URL thật, khai báo trong redirect allowlist của Supabase. Bật email/password signup và nên bật xác nhận email. Signup không tự đăng nhập; khách xác nhận email nếu được yêu cầu rồi đăng nhập bằng mật khẩu.

Quên mật khẩu cần **SMTP của Supabase Auth**, khác SMTP email outbox của backend. Kiểm tra Site URL và redirect allowlist. Backend này dùng flow `TokenHash` xác minh recovery ở server; cấu hình template **Reset Password** trong Supabase với liên kết:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}">Đặt lại mật khẩu SmartBox</a>
```

`RedirectTo` được backend cố định thành `SHOP_URL/reset-password`; không nhận URL chuyển hướng từ client. Trình duyệt đọc tokenHash rồi xóa query khỏi thanh địa chỉ; chỉ POST proof khi khách gửi mật khẩu mới. Backend cố định `type=recovery`, không chấp nhận access token thông thường hoặc signup token làm proof. Template mặc định dùng `ConfirmationURL` không phù hợp với màn hình này; cần đổi template trước khi thử luồng quên mật khẩu thật. Không log token hoặc đưa vào báo cáo/OpenAPI examples.

Đổi mật khẩu dùng phiên mới sau xác thực mật khẩu cũ, kiểm tra đúng UUID; reset dùng phiên provider trả từ proof. Sau thao tác, backend yêu cầu thu hồi phiên và frontend xóa phiên, yêu cầu đăng nhập lại. Nếu provider không thu hồi được phiên, backend ghi cảnh báo và không báo sai rằng đổi mật khẩu đã thất bại; access token cũ có thể còn hiệu lực đến hạn của provider. Recovery proof một lần: nếu cập nhật mật khẩu thất bại sau khi proof đã được dùng, khách yêu cầu email mới.

Tham chiếu chính thức: [Password-based Auth](https://supabase.com/docs/guides/auth/passwords), [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates), [Supabase Auth API](https://github.com/supabase/auth).

## Triển khai, UI và kiểm chứng

**Chưa áp dụng schema lên database thật.** Sau backup/thử trên bản sao và migration 001–005, chạy `006_customer_account.sql` trước bản ứng dụng mới. Bảng `customer_addresses` bật RLS, không có policy cho browser; backend cần DB role phù hợp. Cấu hình quyền profiles phải giữ việc đổi role/khóa tài khoản ở backend quản trị.

Web-shop: `/register`, `/account`, `/account/addresses`, `/account/password`, `/forgot-password`, `/reset-password`, `/account/orders` và chi tiết đơn. Checkout yêu cầu đăng nhập, chọn địa chỉ lưu hoặc nhập cho riêng đơn. Danh mục mua hàng lấy phiên bản/SKU thật từ backend để gửi `variantId`; giỏ hàng cũ thiếu phiên bản yêu cầu chọn lại. Thông số chưa có trong API không được bổ sung bằng dữ liệu mock.

Checkout gọi luồng thanh toán backend hiện có, chuyển sang chờ thanh toán; đã bỏ lựa chọn COD giả. Gateway thanh toán vẫn là provider mô phỏng như trước, chưa có tích hợp nhận tiền thật. Nếu checkout lỗi sau khi tạo draft, UI mở đơn đã tạo để xem trạng thái/tiếp tục, không tạo lại đơn tự động. Phần Customer Account không thay thế việc tích hợp payment gateway.

Kiểm thử bổ sung: ownership/default/xóa/giới hạn địa chỉ, giữ snapshot qua sửa/xóa địa chỉ và hồ sơ, snapshot draft cũ tại checkout, ràng buộc SQL/RLS PostgreSQL, đăng ký không nâng role, tự tạo profile từ identity đã xác minh, HTTP validation/phạm vi, mật khẩu cũ/recovery proof, REST contract Auth trên server giả lập cục bộ. Frontend có 6 test transport/phiên/payload/checkout retry; TypeScript và Vite build đạt. Chạy frontend test bằng `node --experimental-vm-modules --test tests/customer-api.test.mjs` từ web-shop.

Các test PostgreSQL Customer Account và full HTTP đã chạy riêng thành công trước khi Docker bị gián đoạn. Lần chạy toàn bộ cuối có các suite PostgreSQL/HTTP bị skip vì Docker/WSL không khả dụng; phải chạy lại `gradlew test bootJar` với Docker hoạt động để xác nhận toàn bộ trên bản cuối. Không coi skip là đã kiểm chứng. Chưa gửi email Auth thật, đăng ký/đổi mật khẩu trên tài khoản thật hoặc chạy browser end-to-end với Supabase thật.
