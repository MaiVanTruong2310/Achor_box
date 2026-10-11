# 13 — Landing page: Một nơi an tâm cho bưu kiện

Thiết kế đề xuất, chưa phải website đã tích hợp. [Prototype](preview/index.html) cho phép xem và sửa HTML/CSS/JS. Reference Apple HomePod thể hiện tiêu đề ngắn, sản phẩm lớn và CTA rõ; Nexa của Outcrowd thể hiện nền tối, điểm nhấn sáng và câu chuyện smart home tương tác. Đây là quan sát để định hướng, không sao chép bố cục/tài sản. Nguồn: [Apple HomePod](https://www.apple.com/homepod/), [Nexa Smart Home](https://dribbble.com/shots/25371374-Landing-Page-for-Nexa-Smart-Home-App).

## Nội dung và trình tự

| Section | Copy đề xuất / nội dung | Interaction/data/CTA |
|---|---|---|
| 01 Hero | Eyebrow SMARTBOX; “Một nơi an tâm. Cho mỗi bưu kiện.”; subline “Khám phá hộp nhận hàng thông minh, từ khóa điện tử đến kết nối IoT.” | Full-screen, sản phẩm trực tiếp trên nền; “Khám phá phiên bản” → selector; “Xem cách hoạt động” → flow |
| 02 360° | “Chạm. Xoay. Khám phá.” | Viewer ngay hero hoặc sân khấu liền nền; front/rear/side/top; drag/zoom/reset; model minh họa được gắn nhãn |
| 03 Lock story | “Trạng thái rõ ràng. Thao tác có phản hồi.” | Close-up khóa đã kiểm chứng asset; giải thích command→ACK→telemetry; không hứa mở <1s khi chưa đo |
| 04 Technology | Base: chốt điện tử, trạng thái thiết bị, điều khiển theo khả năng phần cứng. Pro: thêm loadcell/HX711, dữ liệu trọng lượng | Diagram hoặc exploded model đã duyệt; chú thích nếu chỉ là hình nguyên lý; không công bố tiêu chuẩn IP/AI/battery chưa có |
| 05 Base / Pro | “Chọn trải nghiệm phù hợp.” | Selector hai dòng; shared features + Pro weight; bảng compare, giữ selection khi cuộn |
| 06 Size/purchase | “Ba dung tích. Cùng một trải nghiệm.” S45L/M85L/L150L | GET products/variants cho SKU, finalPrice, stockQuantity, active; missing size/capacity không bịa mapping từ tên SKU |
| 07 Commercial flow | “Từ lựa chọn đến sử dụng.” Chọn→thanh toán→xét duyệt→giao & lắp→nghiệm thu→kích hoạt | Job workflow PLANNED phải ghi rõ trong tài liệu/prototype; production copy chỉ bật sau backend gate |
| 08 App | “Kết nối với SmartBox.” | Smartphone concept, features backend có; Flutter source/store chưa xác minh; không CTA tải giả, dùng “Ứng dụng đang chuẩn bị” |
| 09 Parcel experience | Người sở hữu điều khiển thiết bị, nhận thông báo bưu kiện, xem lịch sử | Tách khỏi đơn mua thiết bị; dữ liệu cân chỉ Pro; privacy không public serial/customer |
| 10 FAQ/footer | Giá/size/giao+lắp/phần cứng/bảo hành/điều kiện sử dụng | Nội dung biên tập đã duyệt; public CMS API còn thiếu; legal/contact cần dữ liệu chính thức |

## Hero high-fidelity

Desktop: background #07090F phủ viewport; header transparent64px; headline góc trái vùng40% hoặc trên sân khấu; model khoảng50–60% width, 65–75% height, centered hơi lệch phải. Chữ có khoảng trống, không chồng lên khóa. Rim light cyan phía sau, key light trắng mềm từ trên trái, contact shadow và reflection rất nhẹ. Không có viền, bo góc, card, nền panel quanh sản phẩm. Controls viewer ở chân sân khấu, là nút nhỏ riêng, không đóng thành frame.

Tablet: headline32–48px, model lớn ở giữa, CTA dưới text; hero có thể dài hơn100svh nếu cần. Mobile: header56px, headline44px, subline16px, visual cao38–46svh, CTA full width; visual không bị cắt khóa. 360° chỉ drag chủ động, `touch-action:pan-y`, scrolling dọc bình thường. Legend “Mô hình minh họa” đọc được; không dùng fine print để che hạn chế.

## Choreography có mục đích

Khi vào trang: text xuất hiện trước, poster sản phẩm sẵn ngay; renderer tải sau. Sau khi user tương tác, tự xoay dừng. Desktop scroll narrative: text giảm opacity trong section, camera tiến gần khóa, chuyển góc qua technology, tách linh kiện khi asset có node thật, rồi lùi để chọn Base/Pro. Không pin toàn trang hoặc bắt user xem hết animation mới mua. CTA chọn SKU luôn truy cập được. Reduced motion dùng scene tĩnh và anchor thông thường.

Prototype hiện có drag/zoom/góc camera và reveal nhẹ; chưa có asset exploded thực, chưa có Flutter screenshot/store hoặc cinematic film. Kế hoạch motion đủ trong [15](15-MOTION-AND-ASSET-SPEC.md), không tuyên bố prototype đạt toàn bộ production motion.

## Size selector và mua hàng

Source `ProductService`/`ProductVariantResponse`: dùng một giá `finalPrice = product.price + priceDelta`; size/capacity có thể null. Không hardcode giá catalog, không dùng giá hiển thị làm request checkout. Chọn product UUID→load variants→chọn variant UUID; auto chọn SKU khả dụng đầu tiên chỉ khi không có selection hợp lệ. Out of stock/inactive disable mua và giải thích. Price/stock request fail hiển thị retry, không fallback giá demo.

Cart là ý định lựa chọn; POST draft mới giữ kho. Sau create, render snapshot server; expired draft cần tạo lại, không retry POST mù. Payment hiện mock; không quảng bá gateway thật hoặc COD. Production landing giữ CTA khám phá khi gateway chưa đủ điều kiện phát hành. Footer không gắn đánh giá khách/đơn đã bán giả để tạo uy tín.

## Content governance

Mọi claim có nguồn: Base/Pro và45/85/150L từ quyết định prompt; features phần cứng từ đề cương, cần đối chiếu cấu hình SKU/device thực tế; app/firmware/runtime E2E chưa kiểm chứng. QR/download link chỉ bật khi có URL chính thức. Warranty duration, installation fee, service region, SLA, hotline và địa chỉ doanh nghiệp phải do chủ dự án cấp, chưa dùng placeholder trong bản public.
