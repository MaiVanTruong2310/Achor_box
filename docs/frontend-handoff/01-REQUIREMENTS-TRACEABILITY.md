# 01 — Requirements traceability

## Nguồn và quy tắc đọc

D1=`Đề cương đồ án tốt nghiệp.docx` (mục Mục đích/Nội dung/Giải pháp công nghệ); D2=`Đề-cương.pdf` (14 trang, mục2–8); D3=`Các modules của websitedf.pdf` (3 trang, modules1–9); D4=`requirements.docx` (REQ01–05). Các nguồn nằm ở đường dẫn người dùng cung cấp, đã truy cập được; extract trong backend/build/audit chỉ phục vụ đọc. D4 lấy rules, không lấy sample IDs/khách/sản phẩm/giá/địa chỉ. Prompt mới ưu tiên quyết định giao+lắp nội bộ khi khác shipment cũ.

| ID | Nguồn/requirement | Source hiện tại | Trạng thái/ảnh hưởng UI |
|---|---|---|---|
| R01 | D1/D2 IoT4tầng/Flutter/ESP32 | MqttIntegration, MqttDeviceService, FcmWorker | Adapter IMPLEMENTED; firmware/Flutter NOT VERIFIED, không claim demo đạt SLA |
| R02 | Prompt Base/Pro S/M/L | Product,ProductVariant,ProductService.validateVariant | PARTIAL catalog capability chưa trả; metadata hiện hữu có thể null |
| R03 | D4REQ01 create/items/merge/snapshot | CommerceController; OrderWorkflowService.create/add/setQuantity/remove | IMPLEMENTED UUID/variant; frontend dùng snapshot server |
| R04 | D4REQ01 quantity1–99/stock/active | quantity/moveStock; ck_order_item_quantity/ck_variant_stock | IMPLEMENTED; errors rawcode message, không có errorCode field |
| R05 | D4REQ01 editable pending | editable/requireNewWorkflow | IMPLEMENTED; legacy workflow1 chặn mutation |
| R06 | Prompt đơn nháp hết hạn | OrderExpiryJob,PaymentService.expire | IMPLEMENTED 30m mặc định; jobs phải bật |
| R07 | D4REQ02 idempotency/HMAC/expiry | PaymentService,checkout_keys | IMPLEMENTED mock; không frontend tự set paid |
| R08 | D4REQ02 late/callback/job race | callback/expireLocked/requestRefund | IMPLEMENTED test race; cancelled giữ nguyên, refund_required |
| R09 | Prompt PO Ticket | ApprovalTicketService,approval_tickets/ticket_history | IMPLEMENTED Approve/Return/Reject/Resubmit; customer không list all |
| R10 | D4REQ03 tx outbox/retry/template | OutboxService,EmailOutboxWorker,order-notification.html | IMPLEMENTED; SMTP thật NOT VERIFIED |
| R11 | Prompt Delivery Installation nội bộ | FulfillmentService.ship/delivered chỉ shipment | PLANNED; không hiện progress/acceptance như có data |
| R12 | Prompt một công việc/order | Chưa delivery_installations table/controller | PLANNED; contract PROPOSED ở contracts/PROPOSED-API.md |
| R13 | Prompt assigned-only staff/acceptance | technician broad devices filter; no job ownership | MISSING; cần API restricted, không mở GET all orders cho technician |
| R14 | Prompt nghiệm thu serial/MQTT/lock/Pro | DeviceWorkflowService.command; ACK/readings/sale link | PARTIAL primitives; chưa acceptance gate/evidence storage |
| R15 | Prompt email assignment/schedule/acceptance | Không template/triggers tương ứng | PLANNED; tách khỏi ORDER_DELIVERED cũ |
| R16 | D3M1 auth/admin/customer/RBAC | JwtAuthenticationFilter,CurrentActor,SupabaseAuthGateway | IMPLEMENTED chung provider, UI riêng; chưa credential realm tách hoàn toàn như D3 |
| R17 | D3M1 audit | AuditLogService,CommerceRepository.audit | PARTIAL audit toàn mutation legacy chưa phủ |
| R18 | D3M2 product/inventory/variant | ProductController/ProductService,VariantInventoryService | IMPLEMENTED; physical width/depth/height thiếu; no fake scale |
| R19 | D3M3 list/filter/ordertracking | OrderController,paged/my-orders; no status filter param | PARTIAL server filter chưa có; client không filter một page rồi coi toàn bộ |
| R20 | D3M4 warranty/claim/assignment | WarrantyService/Controller | PARTIAL staff-only, chưa customer claim issuance/policy CRUD |
| R21 | D3M5 user/search/360/lock | UserService/Controller | PARTIAL search chỉ frontend, no query search backend; staff provisioning adapter thật |
| R22 | D3M6 devices/state/events | DeviceService/WorkflowService,MqttDeviceService | IMPLEMENTED poll/history; real time SSE/WebSocket MISSING |
| R23 | D3M7 CMS/banner/review/FAQ | ContentController/ContentService | IMPLEMENTED admin; public CMS endpoints MISSING |
| R24 | D4REQ04 DBParamSet/PDF/XLSX/timezone | RevenueReportService,report_definitions/report_params | IMPLEMENTED OpenPDF/POI; Jasper jrxml/Liquibase không dùng |
| R25 | D4REQ04 thêm params không Java | typed conversion + template SQL metadata | IMPLEMENTED DATE/UUID/LONG/DECIMAL; report code/range fields cố định; mới data type cần Java |
| R26 | D4REQ05 four parts/timeout/MDC | ConcurrentDashboardService,DashboardExecutorConfig | IMPLEMENTED; demo sequential/delay config yêu cầu gốc MISSING |
| R27 | D3M9 settings/category/shipping/payment | SettingsService read/template; category GET | PARTIAL CRUD config MISSING; shipping ngoài trái quyết định giao nội bộ nếu marketing sử dụng |
| R28 | D3 expansion2FA/IP/OTA/AI | Fields/mocks không chứng minh chức năng | PROPOSED/out of MVP; không quảng cáo đã có |
| R29 | Prompt account/address/register | Shop gọi auth/register,auth/me không tồn tại | MISSING; đề xuất profile/address APIs; Supabase signUp profile FK phải xác minh |
| R30 | Prompt cinematic/360/design | Không xác nhận GLB thực/asset bundle | PROPOSED design + functional schematic preview; asset production NOT VERIFIED |

## Khác biệt bắt buộc giữ minh bạch

- D4 productId/LONG/uppercase/other-ecommerce → SmartBox variantId/UUID/order lowercase. Các dashboard counts uppercase, Ticket/Shipment/Refund uppercase; không áp một enum serializer cho mọi loại.
- D4 “admin confirm paid” → PO Ticket action, không PATCH trực tiếp. D4 total input → chỉ server tính products.price+price_delta.
- D3 shipper/tracking → prompt mới một technician nội bộ giao+lắp. Carrier string tồn tại vì source cũ; không phát triển logistics/GPS/app shipper.
- D2 servo góc locked0/unlocked90 nhưng flow tự khóa ghi90 → chưa chốt firmware; backend action LOCK/UNLOCK, frontend không gửi góc.
- D1/D2 scope prototype, tương laiCOD/GPS/FaceAI → không lấy thành lời quảng cáo/requirement core.
- D3 quản trị và customer tách UI; source cùng Supabase provider+profiles role. Tách credential realm chưa chứng minh; menu guards không thay server checks.

Các điểm thiếu ưu tiên và dependency trong [17](17-BACKEND-GAP-ANALYSIS.md); coverage API đầy đủ ở [06](06-API-CONTRACTS.md), không dùng dấu IMPLEMENTED cho các endpoint đề xuất.
