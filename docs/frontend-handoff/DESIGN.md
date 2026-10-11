# SmartBox — Frontend design brief

## Mục tiêu

Xây dựng website bán thiết bị SmartBox và khu vực account/admin theo API thực tế. Cảm giác công nghệ cao, tối giản, tối, nhiều khoảng trống; sản phẩm là trung tâm. Chỉ triển khai vào source frontend ở nhiệm vụ riêng. Bộ này gồm đặc tả và prototype chỉnh sửa được, không có file Figma, không có model CAD/GLB chính thức.

Reference: tinh thần sản phẩm và CTA của [Apple HomePod](https://www.apple.com/homepod/), câu chuyện smart home nền tối của [Nexa / Outcrowd](https://dribbble.com/shots/25371374-Landing-Page-for-Nexa-Smart-Home-App). Không copy assets hay bố cục nguyên bản. Xem [13](13-LANDING-PAGE-DESIGN.md) cho áp dụng cụ thể.

## Điều bắt buộc khi coding

1. Hero toàn màn hình, nền #07090F, SmartBox trực tiếp trên nền. **Không card, viền hoặc khung bo góc bao sản phẩm.** Product visual lớn, ánh sáng mềm, reflection nhẹ, text/CTA rõ.
2. 360° phải tương tác thực: drag, zoom có giới hạn, camera trước/sau/bên/trên, keyboard/reset. Nếu không có asset thật, label minh họa hoặc ảnh tĩnh fallback; không gọi ảnh tĩnh là3D thật.
3. Base/Pro là product; S45L/M85L/L150L là yêu cầu biến thể. UUID/SKU/price/stock lấy API, không mapping giá từ tên sản phẩm. `finalPrice=product.price+priceDelta`, snapshot order không repricelocal.
4. Cinematic chỉ ở marketing. Account/checkout/admin không scroll pin, không animation làm chậm nhập liệu. Mobile ưu tiên CTA và form; reduced motion dừng automaticcamera/float.
5. Flutter screenshot/store chưa xác minh; smartphone concept có nhãn. Không có nút tải dẫn giả, không quảng cáo App đã chạy từ backend API alone.
6. Order mua thiết bị, DeliveryInstallation và Package nhận bưu kiện là ba domain khác nhau. Technician nội bộ là một người giao+lắp, không shipperapp/GPS/logistics.
7. DeliveryInstallation là PLANNED. Không gọishipmentdeliver để giả nghiệm thu; backend hiện completed sớm theo flow cũ. UI prototype không được làm nguồn dữ liệu business.
8. API thiếu featureflagoff/comingsoon; không mock success production, không Supabase fallback writes. Authenticationresponseflat, mixedDTO/Map/array/page/void/blob có adapter riêng.

## Design composition

Landing: Hero → viewer/câu chuyện khóa → công nghệ → so sánh Base/Pro → chọn size/mua hàng → giao+lắp → app concept → nhận bưu kiện → FAQ/footer. Header trong suốt, sản phẩm trong hero không có card. Desktop dùng model lớn ở bên phải hoặc trung tâm, chữ48–96px; mobile dùng chữ44px, visual38–46svh, CTA dễ bấm. Chọn size cập nhật thông tin và asset tương ứng khi có; không dùng CSS scale để giả kích thước vật lý.

Account: điều hướng đơn hàng, thiết bị, thông báo. MyOrders nhận array; OrderDetail có items/timeline/ticket/shipment, job được trình bày riêng. TicketRETURNED cho giải trình tối đa2.000ký tự và Resubmit; items đã thanh toán chỉ đọc. PaymentResult xác minh trạng thái từ server, không tin querystring success. DeviceControl tách pending/SENT/ACK và telemetry, ghi rõ offline hoặc dữ liệu cũ.

Admin: sidebar theo role, Dashboard hỗ trợ partial result, PO Review có quyết định cụ thể, inventory dùng delta, refund ghi nhận đối soát, email FAILED có resend; thêm Users360/Warranty/CMS/Reports. JobPlanning/MyJobs/JobDetail là PLANNED và ưu tiên mobile; serial/checklist cho từng thiết bị, failure/reschedule giữ lịch sử. Chỉ hoàn thành sau acceptance gate của server.

## Component và asset handoff

Tokens/contrast/type/grid/componentstate: [12](12-UI-UX-DESIGN-SYSTEM.md). Sitemap/screenlayout/focus/userflows: [14](14-WIREFRAMES-AND-USER-FLOWS.md). Motion/viewerperformance/GLB/photosequence/poster/screenshotsmanifest: [15](15-MOTION-AND-ASSET-SPEC.md). Screenrequirements: [10](10-FRONTEND-REQUIREMENTS.md). APIintegration: [11](11-FRONTEND-API-INTEGRATION.md), [06](06-API-CONTRACTS.md), [DTOs](contracts/DTO-DICTIONARY.md), [Mapshapes](contracts/MAP-RESPONSES.md).

Editablefiles: [landing prototype](preview/index.html), [wireframes](preview/wireframes.html), [CSS](preview/styles.css), [JS](preview/viewer.js), [tokens](preview/tokens.json). Preview không gọi backend, không giữ hồ sơ/đơn hàng, không fake stock/price; WebGLgeometry là minh họa do code tạo. Tất cả thay đổi nằm trong docs.

## Gate bàn giao

Frontend implementation theo [16](16-FRONTEND-IMPLEMENTATION-ROADMAP.md), backendblockers[17](17-BACKEND-GAP-ANALYSIS.md), acceptance tests[18](18-ACCEPTANCE-TEST-CASES.md). Chưa có API/assets không thể coi là done; có Swagger không đủ productionE2E. Dùng response/error/status từ source, bảo toàn null/empty, không leaksecret/PII. Chỉ công bố giá/dung tích/khả năng phầncứng/app/chínhsách có dữ liệu được duyệt.
