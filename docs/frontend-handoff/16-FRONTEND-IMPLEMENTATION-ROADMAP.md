# 16 — Roadmap và điều kiện bàn giao

Các phase dưới đây là kế hoạch, chưa sửa frontend. Hoàn thành bằng evidence và acceptance, không dựa số màn hình đã vẽ. Thời lượng cần đội dự án ước lượng sau khi chốt gap; không cam kết ngày phát hành giả.

| Phase / ưu tiên | Công việc frontend | Backend/asset dependencies | Deliverable / gate |
|---|---|---|---|
| 0 — Contract foundation / P0 | Wire DTOs, flat auth mapper, per-response adapter, error handling, role nav, refresh, remove fake success | Supabase dev project hợp lệ; CORS; thống nhất environment | Login thật/401/403/429/503; không fallback DB write hoặc mock production; AT01–04 |
| 1 — Catalog & design / P1 | Design tokens/components, public landing, listing/detail/compare, variant selector, poster/viewer fallback | Active catalog, size/capacity/features/assets chính xác; public detail capability gap | Responsive320/768/1440, nohero productcard; không bịa giá/kho; AT05–07, AT50–55 |
| 2 — Draft/order / P0 | Create, edit qty, merge, snapshots, expiry hint, myorders/detail/history | Stock reservation current; create idempotency gap cần policy | API payload đúng, price server, unknown outcome recovery; AT08–14 |
| 3 — Payment / P0 | Stable checkout key, demo-only payment UI riêng, result polling, cancelled/unknown | Production gateway chưa có; customer payment/refund summary | Demo integration có label; public checkout release blocked tới gateway verified; AT15–22 |
| 4 — PO workflow / P0 | Review queue, approve/return/reject, customer reason/resubmit/history | Existingticket APIs; notification/outbox config | Concurrent409 recovery, no edit paid items, RBAC; AT23–28 |
| 5 — Delivery installation / P0 | Adminplanning, assigned jobs mobile, serial/checks/acceptance/failure/reschedule/customertracking | **PLANNED backend** table/state/scope/evidence, replace shipment completed gate, approved contracts | Không bật production khi chưa cóAPI; end-to-end everyserial evidence; AT40–49 |
| 6 — IoT & notifications / P1 | Owner device/activation/commandACK+telemetry/readings/packages/notificationprefs | Real MQTT/firmware topic/commandId/capabilities, FCM config | Wrong-owner403, offline/timeout, Baseweighthidden, real hardware validation; AT29–34 |
| 7 — Admin modules / P1 | Inventory/users/warranty/CMS/email/refunds/settings withrole guards | PublicCMS/customer warranty/profile/address remain gaps; actualSMTP/provider | No directSupabasewrite, actualvsimulatedmail distinction; AT35–39 |
| 8 — Finance/quality / P1 | Reports typed filters/binary; partial dashboard; integration/regression; accessibility/perf | PG timezone andqueryscope, CORSheaders, font config; realassets | AT56–60 + contractdiff + authorization + viewport; nofakeKPI |

## Trình tự triển khai an toàn

Phase0 là nền cho mọi phase. Design/catalog có thể làm song song với backend DeliveryInstallation; draft/payment/ticket cần API adapter xong. Job frontend chỉ kết nối sau contract/backend test; prototype review trước không nghĩa module đã chạy. Cinematic motion đi sau usability và asset verification. Đăng ký/profile/address/publicCMS/warranty customer tách backlog: không tự đưa UI live nếu không có backend contract hoặc flow SDK được chốt.

## Definition of ready

Mỗi screen có owner, route, actual endpoint hoặc feature flag PLANNED, DTO/Map adapter, role và ownership, loading/empty/error/unknown outcome, labels/rawstates, acceptance IDs, test data do team tạo không copy requirements. API đổi cần diff [openapi-audited.json](contracts/openapi-audited.json), sample response từ môi trường dev đã bỏ PII, và ký duyệt contract. Secrets ở môi trường riêng, frontend chỉ public URL/anon key theo provider policy; không HMAC/service-role/SMTP/MQTT admin credential trong bundle.

## Definition of done

Màn hình gọi đúng backend, không tự ghi DB hay fallback fake. Role/owner kiểm tra server; frontend chỉ UX. Error/race/timeout có recovery, không duplicate payment/order. Data từ server được giữ null/empty đúng ý nghĩa; loading không coi là zero. Accessible keyboard và mobile; asset licensed/approved, claim có evidence; reduced motion/fallback hoạt động. Đã chạy acceptance tương ứng trên PG/provider/hardware khi có dependency và ghi rõ những test chưa chạy. Không suy diễn một test unit pass thành productionE2E.

## Release blockers

P0: productionpayment chưa tích hợp, new delivery acceptance chưa code, directDB/mock fallback frontend, register/profile missing nếu publicsignuponboarding cần, jobs scheduler config vận hành, DTO capability chưa đủ cho an toàn controls. Ưu tiên [17](17-BACKEND-GAP-ANALYSIS.md). Có thể bàn giao thiết kế và demo có nhãn trước, nhưng không công bố các nghiệp vụ còn thiếu như hoạt động thật.
