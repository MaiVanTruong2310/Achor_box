# 15 — Motion, 360° và asset requirements

## Asset register

Chưa xác minh có model GLB/GLTF hoặc bộ render đa góc chính thức của SmartBox trong source. Flutter/firmware không nằm trong hai thư mục frontend hiện tại; screenshot, store link và mô hình điện tử phải được cung cấp/đối chiếu trước công bố.

| Asset | Yêu cầu đầu vào / naming | Dùng / fallback |
|---|---|---|
| Model Base/Pro S/M/L | `smartbox-{base,pro}-{s,m,l}.glb`; đúng kích thước/metre; origin đáy giữa; nodes body/door/lock/sensor; normals/UV/PBR | Production360°; thiếu model dùng ảnh tĩnh ghi rõ, không gọi ảnh đó là360° |
| 360 photo sequence thay thế | 36–72 góc thật cùng lens/light/background; AVIF/WebP, manifest góc và product/variant UUID | Drag chuyển frame; label “Bộ ảnh nhiều góc”; không hứa camera top tự do nếu không có ảnh |
| Hero poster | Transparent hoặc background cùng màu,1600–2400px desktop/800–1200px mobile; legal approval | LCP trước viewer; snapshot rõ là render/ảnh thật |
| Lock/sensor close-up | Ảnh/render phần cứng đúng dòng; annotation editable riêng | Technology; thiếu dùng diagram nguyên lý có nhãn |
| Exploded assembly | CAD/nodes đúng vị trí/constraint + xác nhận kỹ thuật | Scroll section; thiếu bỏ animation exploded, dùng sơ đồ khối |
| Flutter screenshots | Device dashboard/control/history/settings từ build thật, 2x, không PII/token | Smartphone marketing; thiếu concept label và CTA chưa có tải |
| Store badges/QR | URL chính thức và brand/license hợp lệ | Chỉ publish khi có destination kiểm tra được |
| Icons/fonts/content | SVG sạch, licensed WOFF2 tiếng Việt, approved copy/contact/policy | System font và icon tự vẽ ở prototype |

Manifest production đề xuất: `{productId,variantId,assetVersion,modelUrl,posterUrl,physicalDimensionsMm?,cameraViews,capabilities,license,approvedAt}`. Không suy ra dimensions từ dung tích. Model chuyển size bằng asset đúng variant hoặc crossfade; không CSS scale rồi ghi đó là kích thước thật. Không tải Apple/Nexa assets làm sản phẩm SmartBox.

## Viewer contract

Production có thể chọn React Three Fiber/drei hoặc Three.js khi phiên bản được kiểm tra trong lúc triển khai. Đây là phương án kiến trúc, chưa cài dependency trong nhiệm vụ này. Prototype dùng WebGL thuần, khối geometry minh họa có các mặt thật, depth và ánh sáng; drag đổi camera yaw/pitch, zoom đổi khoảng cách, góc trước/sau/bên/trên có camera riêng. Nó không thể hiện CAD hoặc chi tiết khóa/loadcell của thiết bị thật.

Input: selected product/variant, asset manifest, reducedMotion, viewport. Output: loaded/error/interaction events; không side effect đặt hàng. Góc mặc định trước chếch15–25°, quay ngang360°, pitch clamp để không lộn model; zoom clamp tránh xuyên geometry. Pointer capture cho drag, touch-action pan-y, không chặn cuộn ngoài canvas; keyboard Arrow để xoay, +/- zoom, Home reset. Nút camera có label, active state, aria-live tên góc. Wheel zoom chỉ khi viewer đã focus hoặc user bật, tránh cướp scroll trang.

Fallback: WebGL unsupported/context lost/asset fail→poster + thông báo “Chế độ ảnh” + retry renderer nếu phù hợp; nút rotate bị disable có lý do. Prototype fallback SVG là sơ đồ minh họa tự vẽ, không ảnh sản phẩm. Không spinner vô hạn; không che buy UI vì renderer fail. User có thể dừng auto rotation, và tương tác sẽ dừng auto.

## Motion storyboard đề xuất

| Scene | Trigger / duration | Mục đích / reduced motion |
|---|---|---|
| Hero entry | Content ready; text420ms, model900ms | Ưu tiên chữ và poster; reduced: xuất hiện ngay |
| Gentle float | Khi hero visible và chưa interaction; amplitude ≤8px /6s | Gợi vật thể, không rung; reduced: off |
| Front-to-lock | Desktop scroll section riêng, camera path900ms equivalent | Nhìn khóa; reduced: close-up static |
| Technology handoff | Highlight node khóa, fade copy420ms | Giải thích ACK/telemetry; không flash |
| Exploded components | Chỉ asset approved; nodes tách có giới hạn | Hiểu nguyên lý; reduced: diagram cạnh text |
| Base→Pro | User selector; crossfade250ms; giữ focus | Thêm weight capability rõ ràng; không fake sensor data |
| Size selection | User; poster/modelcrossfade250ms | Dung tích/SKU/giá cập nhật nguyên tử; reduced: ngay |
| Hardware→app | Section intersection; phone slide24px420ms | UI app thật hoặc concept label; reduced: static |
| Checkout / admin | Fee db ack120–180ms | Không scroll pin/3D; preserve input |

Prototype thực hiện một phần storyboard: viewer, các góc, zoom, Base/Pro và size selectors, reveal và nội dung app concept. Cinematic exploded view cần asset thật, chưa implemented. Không gọi screenshot tĩnh là chuyển màn hình app đã hoạt động.

## Performance budgets đề xuất

LCP mục tiêu≤2.5s, INP≤200ms, CLS≤0.1 trên profile mobile thực tế; đây là acceptance target, chưa benchmark. Initial JS marketing≤200KB gzip không tính lazy3D; hero poster≤250KB mobile/500KB desktop; GLB≤3MB mobile/6MB desktop, textures≤1024 mobile/2048 desktop, compressed assets dùng loader hỗ trợ đã kiểm tra. Lazy viewer sau text/poster, DPR clamp1–1.5 mobile/2 desktop; giảm shadow/pass trên mobile. Khi tab hidden hoặc canvas ngoài viewport, dừng requestAnimationFrame/render; dispose buffers/textures/listeners khi unmount. Không tái tải model mỗi frame/resize.

Đo low-end device, slow network, memory/context-loss, reduced motion, 320px layout, touch scroll, keyboard và fallback. Mục tiêu60fps desktop/30fps mobile phải được đo, không ghi đã đạt chỉ vì local preview mượt.
