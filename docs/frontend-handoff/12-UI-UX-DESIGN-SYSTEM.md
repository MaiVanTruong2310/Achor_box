# 12 — Design system SmartBox

Đây là đặc tả thiết kế đề xuất. Tokens có bản máy đọc được tại [tokens.json](preview/tokens.json); prototype dùng cùng màu và khoảng cách. Không thay stylesheet của hai ứng dụng hiện tại.

## Màu và độ tương phản

| Token | Giá trị | Vai trò |
|---|---|---|
| background | #07090F | Nền chính, hero liền với trang |
| surface | #11141D | Form, bảng, drawer; không bao quanh sản phẩm trong hero |
| surfaceRaised | #1A2030 | Hover, popover |
| text | #F5F7FA | Tiêu đề, dữ liệu chính |
| textMuted | #A4AAB5 | Nội dung phụ; không giảm opacity thêm |
| accent | #64D9FF | Focus, liên kết, điểm nhấn ánh sáng |
| primary | #1F62DD | Nút xanh với chữ trắng; kiểm tra lại tương phản khi đổi màu |
| primaryText | #07121A | Chữ tối trên nút cyan |
| border | #30394C | Phân cách trang trí và bảng |
| controlBorder | #63748A | Viền control/input cần nhận diện được trên nền tối |
| success | #79E2AE | Thành công, kèm icon/chữ |
| warning | #FFD58A | Chờ xử lý, hết hạn, kèm chữ |
| danger | #FF9B9B | Lỗi, từ chối, kèm lý do |
| focus | #64D9FF | Outline 2px, offset 4px |

Chữ thường đạt WCAG AA 4.5:1, chữ lớn 3:1; control/focus 3:1 so với nền cạnh nó. Kiểm tra bằng công cụ đo trong validation khi có màu mới. Gradient trang trí không làm nền chữ khó đọc. Status không chỉ phân biệt bằng màu. Text disabled vẫn đọc được, có giải thích lý do và không thể kích hoạt.

## Typography, grid, spacing

Font mặc định `Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif`; cần font có dấu tiếng Việt. Prototype dùng system font, không tải font ngoài. Nếu dùng Inter ở production, cấp WOFF2 hợp lệ, subset tiếng Việt và `font-display:swap`.

| Token | Desktop / mobile | Line-height, weight |
|---|---|---|
| display | clamp(48px, 6.5vw, 96px) / 44–56px | 1.02, 600; tracking -0.045em |
| h1 | 56px / 36px | 1.10, 600 |
| h2 | 40px / 28px | 1.15, 600 |
| h3 | 24px / 22px | 1.25, 600 |
| body | 16–18px | 1.6, 400 |
| label | 14px | 1.4, 500 |
| caption | 12px | 1.5, 400; không dùng cho lỗi form |
| numeric | body, tabular-nums | Giá, kho, dashboard |

Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. Form gap 16–24px; marketing section gap 96–128px desktop, 64px mobile. Container max 1280px, gutter 64px desktop, 32px tablet, 20px mobile. Desktop grid 12 cột/gap24; tablet 8/gap20; mobile 4/gap16. Hero dùng viewport trực tiếp, không grid card.

Breakpoints: base 320–767px, tablet 768–1023px, desktop 1024–1439px, wide từ1440px. Không đặt min-width body lớn hơn320px. Header64px desktop/56px mobile; hero `min-height:100svh`, có padding cho header, vẫn cuộn được nếu chữ lớn. Long UUID/address wrap; bảng admin có vùng cuộn ngang riêng với heading cố định.

Radius: field12px, panel20px, popover16px, pill999px. Shadow: panel `0 20px 70px rgba(0,0,0,.35)`; focus không dùng shadow mờ thay outline. Hero reflection là hiệu ứng sân khấu, không border/frame. Z-index: base0, sticky20, header30, drawer50, backdrop60, modal70, toast90, tooltip100. Modal có focus trap, Escape, restore focus; không khóa cuộn bằng cơ chế làm trang nhảy.

## Component specification

| Component | Anatomy/variants | Trạng thái và behavior |
|---|---|---|
| Button | primary cyan, secondary outline, tertiary text; min-height44px | hover, focus-visible, pressed, disabled, busy; loading giữ width và nhãn, không double submit |
| Field | label, input, helper/error, optional suffix | required ghi rõ; aria-describedby; invalid outline+message; preserve value sau lỗi |
| QuantityStepper | −, input integer, + | min1/max99; không vượt server stock; nhập tay hợp lệ, read-only sau checkout |
| SegmentedSelector | Base/Pro; size S/M/L | radiogroup/aria-checked, Arrow/Home/End; unavailable có lý do; SKU là ID thật |
| Price | finalPrice từ API + VND formatter | loading skeleton; null là chưa có giá, không hiển thị 0₫; snapshot trong order giữ nguyên |
| StatusBadge | icon + tên tiếng Việt + raw status cho tooltip hỗ trợ | order/ticket/job/device là bốn namespace riêng |
| Timeline | ordered list, actor/time/reason | giờ Việt Nam; không bịa event thiếu; placeholder “Chưa có dữ liệu” |
| Table/Pagination | caption, headers, rows, contextual actions | empty khác error; pagination theo loại response, không đoán total của array |
| Toast/Alert | short message, trace/retry khi có | alert lỗi quan trọng; status cho thông báo nhẹ; không tự đóng lý do từ chối |
| ConfirmDialog | action cụ thể + hậu quả + cancel | return/reject có reason bắt buộc; refund ghi nhận đối soát, không hứa chuyển tiền |
| DeviceCommand | action + pending/ACK/result + telemetry | SENT không thành “Đã mở”; stale status/timeout hiển thị rõ |
| JobChecklist | serial, owner, connection, lock, weight Pro, acceptance | PLANNED: kết quả server, không checkbox local giả kiểm tra phần cứng |
| ProductViewer | canvas + nút góc/zoom + mô tả + fallback | drag/keyboard, reset, không chiếm scroll mobile; xem [15](15-MOTION-AND-ASSET-SPEC.md) |

## Status mapping cho UI

Order: pending=Đơn nháp; awaiting_payment=Chờ thanh toán; paid=Đã thanh toán, chờ xét duyệt; confirmed=Đã xác nhận; completed=Hoàn thành theo flow hiện có; cancelled=Đã hủy. Order completed hiện chưa chứng minh nghiệm thu lắp đặt. Ticket: PENDING=Chờ xét duyệt; RETURNED=Cần giải trình; APPROVED=Đã duyệt; REJECTED=Từ chối. Job PLANNED: ASSIGNED=Đã phân công; IN_PROGRESS=Đang thực hiện; DELIVERED=Đã giao; INSTALLED=Đã lắp; COMPLETED=Đã nghiệm thu; FAILED=Cần xử lý lại. Device health và door/lock hiển thị riêng, không suy diễn sức khỏe từ đơn hàng.

## Motion và accessibility

Tokens: instant0, fee db ack120ms, control180ms, reveal420ms, scene900ms; easing `cubic-bezier(.22,1,.36,1)`. Hover dịch tối đa2px, section reveal16px. Reduced motion bỏ parallax, tự xoay, spring và scroll-camera; giữ chuyển trạng thái tức thời/opacity ngắn. User có thể dừng tự xoay. Không hijack cuộn trang, không flash >3 lần/giây.

Skip link; landmarks header/nav/main/footer; một h1/trang; keyboard đầy đủ; touch target44px; visible focus; thông báo loading/error qua aria-live phù hợp. Canvas focus làm nổi bật và gạch dưới caption thay vì vẽ khung quanh sản phẩm. Kiểm tra 200% zoom, 320px width, screen reader label, tương phản, reduced-motion, form keyboard, camera denied và WebGL unavailable. Checkout không chạy cinematic animation.
