# SmartBox — bộ bàn giao frontend

**Hóa đơn bán hàng:** [HTML/logo/snapshot, xem/in và tải](../../backend/docs/SALES_INVOICE.md) đã có cho admin và khách sở hữu đơn; cần migration 010 và cấu hình cửa hàng. Không còn nút xuất VAT giả lập trong chi tiết đơn.

**Cập nhật REQ-05:** [Dashboard bốn phần theo biến thể/SKU](../../backend/docs/REQ05_DASHBOARD.md) đã nối vào web-admin `/dashboard`; có timeout/partial, 503 và demo sequential/delay/fail. [Kiểm chứng](contracts/req05-validation.json).

**Cập nhật VNPAY:** [Sandbox checkout, IPN và ReturnURL](../../backend/docs/VNPAY_SANDBOX.md) đã có trong source. Cần migration 009; chưa thử callback từ VNPAY thật vì chưa có IPN HTTPS công khai. [Kiểm chứng](contracts/vnpay-validation.json).

**Đánh giá đầy đủ theo yêu cầu ban đầu:** xem [coverage hiện tại và khoảng trống còn lại](../../backend/docs/CURRENT_REQUIREMENTS_COVERAGE.md). Luồng bán hàng cốt lõi đã có; chưa đánh dấu toàn bộ checklist quản trị/đề cương IoT là hoàn tất.

**Cập nhật quản trị:** [claim khách/Cloudinary, CRUD cấu hình, tìm kiếm/phân trang và kho](../../backend/docs/ADMIN_COMMERCE_COMPLETION.md). Admin đã bỏ ghi Supabase trực tiếp; cần migration 008 và cấu hình Cloudinary backend. [Kết quả kiểm thử](contracts/admin-commerce-validation.json).

**Cập nhật mới:** [Timeline, bảo hành sau nghiệm thu, thông số SKU và dashboard công việc](TRACKING-WARRANTY-SPECS-IMPLEMENTED.md) đã triển khai; nội dung cập nhật thay thế các gap tương ứng trong snapshot cũ.

**Cập nhật Payment:** [kiểm chứng vòng đời và giao diện giả lập](PAYMENT-VERIFIED.md). API/giao diện hiện tại hiển thị rõ mock và trạng thái hoàn tiền.

**Cập nhật Customer Account:** [backend và web-shop đã nối API thật](CUSTOMER-ACCOUNT-IMPLEMENTED.md): đăng ký, hồ sơ, địa chỉ, mật khẩu và tiến độ đơn hàng. Đọc cập nhật này trước các mô tả snapshot cũ.

**Cập nhật triển khai:** [Delivery & Installation đã có backend và web-admin](DELIVERY-INSTALLATION-IMPLEMENTED.md). Nội dung cập nhật này thay thế các phần PLANNED và luồng hoàn tất đơn khi giao trong snapshot bên dưới; xem hợp đồng mới trước khi tích hợp.

Ngày snapshot: **10/10/2026**, nguồn trực tiếp `backend/src`, `web-shop/src`, `web-admin/src`, database.sql, migrations và bốn tài liệu người dùng. Nhiệm vụ này chỉ tạo tài liệu/prototype, không sửa ứng dụng hoặc database.

## Đọc theo vai trò

- BA/PO: 00 → 01 → 02 → 03 → 04 → 07 → 17 → 18.
- Frontend: 00 → 08 → 10 → 11 → 06 + DTO/Map contracts → DESIGN → 12–16 → 18.
- Backend: 01 → 05 → 06 → 07 → 08 → 09 → 17; ưu tiên Delivery & Installation.
- UI/UX: DESIGN → 12 → 13 → 14 → 15 → prototype.

## Mục lục

| File | Nội dung |
|---|---|
| [00](00-PROJECT-OVERVIEW.md) | Tổng quan/kiến trúc/phạm vi |
| [01](01-REQUIREMENTS-TRACEABILITY.md) | Requirement → tài liệu → source → trạng thái |
| [02](02-MODULE-SPECIFICATIONS.md) | Modules, actor và dependency |
| [03](03-BUSINESS-FLOWS.md) | Happy paths/error paths và sequence |
| [04](04-STATE-MACHINES.md) | Order/payment/ticket/refund/installation/device |
| [05](05-DATABASE-DOMAIN-MODEL.md) | ERD, constraint, domain boundaries |
| [06](06-API-CONTRACTS.md) | 114 operations đã khớp source/Swagger |
| [07](07-BUSINESS-RULES.md) | Rules, lỗi thật, UI behavior/tests |
| [08](08-AUTHORIZATION-MATRIX.md) | RBAC/ownership/giới hạn phân quyền |
| [09](09-EMAIL-NOTIFICATION-SPEC.md) | Trigger/template/recipient/outbox |
| [10](10-FRONTEND-REQUIREMENTS.md) | Từng màn hình public/customer/admin/staff |
| [11](11-FRONTEND-API-INTEGRATION.md) | Screen/action/API và adapter/error strategy |
| [12](12-UI-UX-DESIGN-SYSTEM.md) | Tokens/components/accessibility |
| [13](13-LANDING-PAGE-DESIGN.md) | Full-screen hero/cinematic story |
| [14](14-WIREFRAMES-AND-USER-FLOWS.md) | Sitemap/navigation/wireframes |
| [15](15-MOTION-AND-ASSET-SPEC.md) | 360°, assets, fallback/budgets |
| [16](16-FRONTEND-IMPLEMENTATION-ROADMAP.md) | Milestones/dependencies/gates |
| [17](17-BACKEND-GAP-ANALYSIS.md) | Backend gaps/blockers rõ ràng |
| [18](18-ACCEPTANCE-TEST-CASES.md) | Acceptance scenarios |
| [DESIGN](DESIGN.md) | Brief thiết kế cho AI frontend |

Chi tiết bổ sung: [DTO dictionary](contracts/DTO-DICTIONARY.md), [Map response shapes](contracts/MAP-RESPONSES.md), [50 ví dụ Map response](contracts/response-shapes.json), [Proposed API](contracts/PROPOSED-API.md), [OpenAPI đã chú giải](contracts/openapi-audited.json), [OpenAPI runtime đã bỏ ví dụ annotation](contracts/openapi-runtime.raw.json), [inventory source](contracts/source-inventory.json), [validation](validation/REPORT.md).

## Nhãn trạng thái

IMPLEMENTED = có code cụ thể; không tự đồng nghĩa production/E2E đã kiểm chứng. PARTIAL = có code nhưng thiếu rule/scope. PLANNED = nghiệp vụ prompt đã thống nhất nhưng chưa code. PROPOSED = phương án thiết kế/hợp đồng mới cần backend chốt. NOT VERIFIED = không đủ source/asset/runtime để xác nhận. MISSING = không tìm thấy triển khai; ở API cần triển khai được đặt dưới Proposed Contract.

**Delivery & Installation là PLANNED, mọi endpoint `/api/delivery-installations` là PROPOSED, chưa gọi được.** Shipment cũ completed khi delivered không đạt điều kiện nghiệm thu mới. Không nối nút nghiệm thu vào shipment/deliver để giả tính năng.

## Preview có thể chỉnh sửa

Mở [prototype](preview/index.html) và [wireframes](preview/wireframes.html) bằng browser. Tất cả HTML/CSS/JS nằm trong thư mục tài liệu, không phải frontend production, không gọi API hoặc lưu customer/order. Viewer là **khối 3D WebGL minh họa dựng bằng code**, hỗ trợ drag/zoom/góc xem; chưa có GLB/render thực của sản phẩm. Không coi model này là cấu tạo hay kích thước vật lý đã chứng minh. Không tạo file Figma trong môi trường hiện tại.

Phiên xem trước đang phục vụ cục bộ tại [Landing](http://127.0.0.1:18082/preview/index.html) và [Wireframes](http://127.0.0.1:18082/preview/wireframes.html). Nếu máy khởi động lại, có thể mở HTML trực tiếp hoặc phục vụ thư mục này bằng HTTPserver cục bộ. Kiểm tra fallback bằng query `?viewer=fallback`. Không cần cung cấp API key để xem thiết kế.

## Thuật ngữ

Product=dòng Base/Pro; ProductVariant=SKU S/M/L có kho/giá; Device=thiết bị serial vật lý; Order=mua thiết bị; PO Ticket=phê duyệt đã thanh toán; Shipment=flow giao vận; Delivery Installation=công việc giao+lắp+nghiệm thu đã triển khai; Package=bưu kiện mà thiết bị nhận sau khi sử dụng; ACK=phản hồi firmware theo commandId; Outbox=sự kiện lưu cùng transaction rồi worker gửi.

UUID/example JSON dùng placeholder. Không có seed khách hàng/sản phẩm/giá/địa chỉ từ requirements. Secret không thuộc bộ bàn giao; xem backend `.env.example` để cấu hình ở môi trường riêng.
