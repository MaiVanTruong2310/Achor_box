# Hoàn thiện nghiệp vụ quản trị bán hàng

## Phạm vi đã nối

- Shop `/account/warranties`: chọn thiết bị có bảo hành, mô tả sự cố, chọn tối đa 5 ảnh, gửi yêu cầu và xem tiến độ xử lý.
- Admin `/warranties`: danh sách phân trang, xem ảnh khách gửi, phân công kỹ thuật viên thật chưa bị khóa, đổi trạng thái và ghi chú nội bộ. Kỹ thuật viên chỉ đọc/sửa yêu cầu được giao. Bỏ nhân viên/ảnh minh chứng mẫu và trạng thái lưu trong localStorage của giao diện cũ; bản này không cung cấp nghiệp vụ ảnh nghiệm thu sửa chữa/lưu linh kiện thay thế.
- Admin `/settings`: CRUD danh mục, phương thức thanh toán, cấu hình giao/lắp nội bộ. Danh mục có sản phẩm/chính sách bảo hành không được xóa. DELETE phương thức thanh toán/giao hàng ngừng sử dụng thay vì xóa lịch sử.
- Admin `/users`, `/orders`: tìm kiếm, lọc, phân trang tại backend; không tải toàn bộ dữ liệu để lọc trên browser. Các thẻ thống kê tại hai trang phản ánh trang hiện tại, không phải tổng toàn hệ thống.
- Admin không ghi trực tiếp Supabase database/storage. Supabase chỉ tiếp tục cấp phiên Auth; hồ sơ lấy từ `/api/auth/me`. Ảnh sản phẩm cũng đi qua backend/Cloudinary.
- PUT sản phẩm không được ghi đè tồn hiện hữu. SKU mới có movement `INITIAL_STOCK`; thay đổi SKU hiện hữu dùng delta và movement `MANUAL_ADJUSTMENT`. UI chỉnh kho chọn SKU, tải lại trạng thái server sau thành công.

Không bổ sung Shipper Portal hoặc logistics. Danh mục phương thức thanh toán không kích hoạt VNPay/MoMo; checkout vẫn do PaymentService/mock quyết định. Phí trong danh mục giao/lắp hiện là thông tin tham khảo, chưa tự cộng vào Order. Không sửa tổng tiền hoặc lịch sử đơn cũ khi thay đổi danh mục.

## Migration và môi trường

Chạy `008_customer_warranty_claims.sql` sau 001–007 trên database thử nghiệm trước. Script thêm claimant/idempotency vào claims và bảng ảnh riêng có RLS, không seed tài khoản/sản phẩm hoặc sửa yêu cầu bảo hành cũ. Đây vẫn là migration thủ công; chưa áp dụng lên database đích của người dùng.

Điền các biến sau trong `backend/.env` (giữ các cấu hình database/Auth hiện có):

```dotenv
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Lấy ba giá trị trong Cloudinary Console của product environment đang dùng. API Secret chỉ nằm trên backend; không đặt vào biến VITE, source frontend hoặc chat. Upload từ backend qua HTTPS bằng Basic Auth theo [tài liệu Cloudinary](https://cloudinary.com/documentation/image_upload_api_reference).

Spring không tự nạp `.env`. Đã thêm `backend/run-local.ps1` để nạp các dòng NAME=value vào môi trường tiến trình, hỗ trợ giá trị có dấu nháy ngoài và không in giá trị. Trong thư mục backend, dùng Java 21 và chạy:

```powershell
$env:JAVA_HOME='C:\Program Files\Java\jdk-21.0.12'
.\run-local.ps1
```

Nếu chạy IDE/jar/Gradle trực tiếp, export các biến vào cấu hình chạy tương ứng. Không chạy ứng dụng mới trước migration 008.

Thiếu Cloudinary: upload trả 503 `CLOUDINARY_NOT_CONFIGURED`; không lưu URL giả. Vẫn có thể gửi claim không kèm ảnh. Lỗi provider trả 502 `CLOUDINARY_UPLOAD_FAILED` và không ghi credentials vào lỗi trả về.

## Hợp đồng API

| API | Quyền / dữ liệu |
|---|---|
| POST `/api/customer/warranties/{id}/images` | Customer sở hữu thiết bị; multipart phần `file`; trả `{id,url}` |
| POST `/api/customer/warranty-claims` | Customer; header `Idempotency-Key` UUID; body `{warrantyId,description,imageIds}` |
| GET `/api/customer/warranty-claims?page=0&size=20` | Chỉ claims do khách hiện tại gửi |
| GET `/api/customer/warranty-claims/{id}` | Chủ claim; không trả ghi chú nội bộ |
| GET `/api/warranties/technicians` | Super admin/support; kỹ thuật viên chưa bị khóa |
| GET `/api/settings/{categories\|payment-methods\|shipping-methods}` | Super admin; đọc danh mục |
| POST `/api/settings/categories` | `{name,slug}`; slug chữ thường/số/gạch nối |
| PUT `/api/settings/categories/{id}` | Cùng body tạo; DELETE chặn `CATEGORY_IN_USE` |
| POST `/api/settings/payment-methods` | `{name,isActive}` |
| PUT `/api/settings/payment-methods/{id}` | Cùng body tạo; DELETE ngừng sử dụng |
| POST `/api/settings/shipping-methods` | `{name,fee,isActive}`; fee 0–100000000, tối đa 2 chữ số thập phân |
| PUT `/api/settings/shipping-methods/{id}` | Cùng body tạo; DELETE ngừng sử dụng |
| GET `/api/users/paged` | Super admin/support; `page,size,search,role,locked` |
| GET `/api/orders/paged` | Super admin/support/accountant; `page,size,search,status,payment` |
| GET `/api/products/inventory-movements` | Super admin/product manager/accountant; 500 movement mới nhất |
| POST `/api/products/images` | Super admin/product manager; multipart `file` |

Phân trang: page >=0, size 1–100, sắp xếp createdAt DESC và id DESC. `search` tối đa 200 ký tự; `%`, `_`, dấu gạch chéo ngược được hiểu như ký tự tìm kiếm, không phải wildcard SQL. User search tên/email/điện thoại; order search mã đơn/tên/email/điện thoại/mã vận đơn. Role/status sai trả 400. Order payment lọc status hoặc provider hiện có, không suy diễn đã thanh toán từ trạng thái giao hàng.

Claim: mô tả 10–5000 ký tự sau trim; bảo hành active và trong ngày hiệu lực tại Việt Nam. Tối đa 5 imageIds, không trùng, cùng khách/cùng warranty, chưa gắn claim khác. Ảnh được kiểm tra nội dung thật JPEG/PNG, <=5 MB và <=12 triệu pixel, đọc/re-encode để bỏ metadata; không chấp nhận URL upload tùy ý/SVG. Tối đa 20 ảnh chưa gắn claim trên một bảo hành; upload có giới hạn theo IP. Upload thành công rồi bỏ form có thể để lại ảnh chưa sử dụng; chưa có job tự xóa ảnh Cloudinary. Khi lưu Cloudinary thành công nhưng transaction DB lỗi cũng có thể có asset mồ côi; vận hành cần đối chiếu/dọn ảnh chưa sử dụng.

Idempotency: cùng khách/cùng key/cùng body trả claim đã tạo; key khác body trả 409. Khóa profile/warranty và image row ngăn submit đồng thời sử dụng cùng ảnh. Client giữ key khi retry không rõ kết quả; không sửa trạng thái hoặc tự tạo claim ở localStorage.

Ghi audit khi tạo claim, phân công/status/notes, CRUD cấu hình, create/update/disable product và điều chỉnh tồn. Chưa tuyên bố tất cả module legacy khác đã có audit đầy đủ. Inventory lịch sử trước ledger có số dư ban đầu suy ra từ tồn hiện tại; không tự tạo movement giả cho dữ liệu lịch sử. Điều chỉnh kho hiện chưa có idempotency key: nếu timeout, tải lại lịch sử/tồn trước khi gửi lại.

## Kiểm chứng

Các kiểm thử mới dùng PostgreSQL/Testcontainers và HTTP thật trong ứng dụng test; Cloudinary/Supabase Auth được mock ở ranh giới provider, không upload ảnh ra tài khoản thật. Bao phủ ownership, expiry, idempotency, ảnh đã dùng, provider failure, technician scope, settings FK/RBAC/validation, search/filter/wildcard/pagination và giữ kho → điều chỉnh → hủy → đối chiếu ledger. Unit kiểm tra nội dung ảnh thật và cấu hình thiếu; frontend transport kiểm tra 403/401/204, multipart, không fallback và không gửi tồn tuyệt đối.

Chưa chạy browser end-to-end với tài khoản/database của người dùng hoặc upload Cloudinary thực. Xem [bảng coverage hiện tại](CURRENT_REQUIREMENTS_COVERAGE.md) và [báo cáo xác nhận](../../docs/frontend-handoff/contracts/admin-commerce-validation.json).
