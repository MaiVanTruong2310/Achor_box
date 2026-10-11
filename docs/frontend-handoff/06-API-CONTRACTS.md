# 06 — API contracts thực tế và dự kiến

## Mục lục

- [Quy ước](#quy-ước)
- [Catalog mọi endpoint](#catalog-mọi-endpoint)
- [DTO dictionary](contracts/DTO-DICTIONARY.md)
- [Map responses chính xác](contracts/MAP-RESPONSES.md)
- [Proposed API Contract](contracts/PROPOSED-API.md)

## Quy ước

Đã đối chiếu **114 operations** trong source với Springdoc runtime (profile demo, H2 trong RAM, workers tắt). H2 chỉ để xuất metadata, không kiểm chứng SQL business. OpenAPI thô có annotation lỗi thời về OTP/cache/payment; mô tả dưới đây ưu tiên code Service/Security. `114` runtime/source routes khớp. Không gọi DB thật.

Auth/role trong cột quyền là giao của filter và service, không chỉ global Swagger Bearer. Trừ public paths, luôn cần access token Supabase + profile role hợp lệ chưa khóa. X-Trace-Id tùy chọn; X-Trace-Id response được tạo bởi TraceFilter. API đa số trả DTO/Map trực tiếp, **không unwrap data chung**. Error envelope numeric code theo HTTP; token nghiệp vụ nằm trong message, không có errorCode riêng. Report params dùng code string ngoại lệ.

Không có sort query mặc định ngoài cái khai báo dưới đây. UUID là string; BigDecimal ra JSON number; date/timestamp theo kiểu DTO. required từ OpenAPI không thay cho thực tế @Valid: bảng DTO ghi annotation, mục endpoint ghi có @Valid hay không. JSON ví dụ dùng placeholders, là minh họa shape, không copy dữ liệu requirements và không phải request gửi nguyên xi.

Pagination legacy `/paged`: content/currentPage/pageSize/totalElements/totalPages/numberOfElements/isFirst/isLast/hasNext/hasPrevious. page=0,size=10 mặc định AppConstants; mới commerce/device/notification default0/20, max100, trả array, không metadata; emails trả content/page/size/totalElements.

Shared error handling: 400 body/type/UUID/validation; 401 thiếu/sai token/locked; 403 sai role/owner; 404 missing row; 409 state/stock/constraint/lock; 429 auth/device rate limit; 503 auth provider/MQTT/font/dashboard config; 500 generic có traceId header. Các endpoint chưa có guard riêng có thể trả 500 khi input null; không mô tả mọi 400 như đã có.

## Catalog mọi endpoint

| ID | Method/path | Controller.handler | Trạng thái |
|---|---|---|---|
| API-001 | `GET /api/audit-logs` | `AuditLogController.getLogs` | IMPLEMENTED |
| API-002 | `POST /api/audit-logs` | `AuditLogController.logAction` | IMPLEMENTED |
| API-003 | `GET /api/audit-logs/paged` | `AuditLogController.getLogsPaged` | IMPLEMENTED |
| API-004 | `POST /api/auth/login` | `AuthController.login` | IMPLEMENTED |
| API-005 | `POST /api/auth/logout` | `AuthController.logout` | IMPLEMENTED |
| API-006 | `POST /api/auth/refresh-token` | `AuthController.refreshToken` | IMPLEMENTED |
| API-007 | `GET /api/admin/emails` | `CommerceController.emails` | IMPLEMENTED |
| API-008 | `POST /api/admin/emails/{id}/resend` | `CommerceController.resend` | IMPLEMENTED |
| API-009 | `GET /api/admin/refunds` | `CommerceController.refunds` | IMPLEMENTED |
| API-010 | `POST /api/admin/refunds/{id}/complete` | `CommerceController.refund` | IMPLEMENTED |
| API-011 | `POST /api/orders` | `CommerceController.create` | IMPLEMENTED |
| API-012 | `GET /api/orders/my-orders` | `CommerceController.mine` | IMPLEMENTED |
| API-013 | `GET /api/orders/{id}` | `CommerceController.detail` | IMPLEMENTED |
| API-014 | `POST /api/orders/{id}/cancel` | `CommerceController.cancel` | IMPLEMENTED |
| API-015 | `POST /api/orders/{id}/checkout` | `CommerceController.checkout` | IMPLEMENTED |
| API-016 | `POST /api/orders/{id}/devices` | `CommerceController.assign` | IMPLEMENTED |
| API-017 | `GET /api/orders/{id}/history` | `CommerceController.history` | IMPLEMENTED |
| API-018 | `POST /api/orders/{id}/items` | `CommerceController.add` | IMPLEMENTED |
| API-019 | `DELETE /api/orders/{id}/items/{variantId}` | `CommerceController.remove` | IMPLEMENTED |
| API-020 | `PATCH /api/orders/{id}/items/{variantId}` | `CommerceController.quantity` | IMPLEMENTED |
| API-021 | `POST /api/orders/{id}/shipment/deliver` | `CommerceController.deliver` | PARTIAL |
| API-022 | `POST /api/orders/{id}/shipment/ship` | `CommerceController.ship` | IMPLEMENTED |
| API-023 | `POST /api/payments/callback` | `CommerceController.callback` | IMPLEMENTED |
| API-024 | `GET /api/tickets` | `CommerceController.tickets` | IMPLEMENTED |
| API-025 | `GET /api/tickets/{id}` | `CommerceController.ticket` | IMPLEMENTED |
| API-026 | `POST /api/tickets/{id}/approve` | `CommerceController.approve` | IMPLEMENTED |
| API-027 | `POST /api/tickets/{id}/reject` | `CommerceController.reject` | IMPLEMENTED |
| API-028 | `POST /api/tickets/{id}/resubmit` | `CommerceController.resubmit` | IMPLEMENTED |
| API-029 | `POST /api/tickets/{id}/return` | `CommerceController.returnTicket` | IMPLEMENTED |
| API-030 | `GET /api/admin/dashboard` | `ConcurrentDashboardController.dashboard` | IMPLEMENTED |
| API-031 | `GET /api/content/articles` | `ContentController.getAllArticles` | IMPLEMENTED |
| API-032 | `POST /api/content/articles` | `ContentController.createArticle` | IMPLEMENTED |
| API-033 | `GET /api/content/articles/paged` | `ContentController.getArticlesPaged` | IMPLEMENTED |
| API-034 | `DELETE /api/content/articles/{id}` | `ContentController.deleteArticle` | IMPLEMENTED |
| API-035 | `GET /api/content/articles/{id}` | `ContentController.getArticleById` | IMPLEMENTED |
| API-036 | `PUT /api/content/articles/{id}` | `ContentController.updateArticle` | IMPLEMENTED |
| API-037 | `GET /api/content/banners` | `ContentController.getAllBanners` | IMPLEMENTED |
| API-038 | `POST /api/content/banners` | `ContentController.createBanner` | IMPLEMENTED |
| API-039 | `DELETE /api/content/banners/{id}` | `ContentController.deleteBanner` | IMPLEMENTED |
| API-040 | `PUT /api/content/banners/{id}` | `ContentController.updateBanner` | IMPLEMENTED |
| API-041 | `PATCH /api/content/banners/{id}/toggle` | `ContentController.toggleBannerStatus` | IMPLEMENTED |
| API-042 | `GET /api/content/faqs` | `ContentController.getAllFaqs` | IMPLEMENTED |
| API-043 | `POST /api/content/faqs` | `ContentController.createFaq` | IMPLEMENTED |
| API-044 | `DELETE /api/content/faqs/{id}` | `ContentController.deleteFaq` | IMPLEMENTED |
| API-045 | `PUT /api/content/faqs/{id}` | `ContentController.updateFaq` | IMPLEMENTED |
| API-046 | `PATCH /api/content/faqs/{id}/toggle` | `ContentController.toggleFaqStatus` | IMPLEMENTED |
| API-047 | `GET /api/content/reviews` | `ContentController.getAllReviews` | IMPLEMENTED |
| API-048 | `GET /api/content/reviews/paged` | `ContentController.getReviewsPaged` | IMPLEMENTED |
| API-049 | `DELETE /api/content/reviews/{id}` | `ContentController.deleteReview` | IMPLEMENTED |
| API-050 | `POST /api/content/reviews/{id}/reply` | `ContentController.replyReview` | IMPLEMENTED |
| API-051 | `PATCH /api/content/reviews/{id}/status` | `ContentController.updateReviewStatus` | IMPLEMENTED |
| API-052 | `GET /api/content/summary` | `ContentController.getSummaryStats` | IMPLEMENTED |
| API-053 | `GET /api/dashboard/stats` | `DashboardController.getDashboardStats` | IMPLEMENTED |
| API-054 | `GET /api/devices` | `DeviceController.getAllDevices` | IMPLEMENTED |
| API-055 | `GET /api/devices/events` | `DeviceController.getDeviceEvents` | IMPLEMENTED |
| API-056 | `GET /api/devices/paged` | `DeviceController.getDevicesPaged` | IMPLEMENTED |
| API-057 | `PATCH /api/devices/{id}/status` | `DeviceController.updateDeviceStatus` | IMPLEMENTED |
| API-058 | `GET /api/devices/my-devices` | `DeviceWorkflowController.mine` | IMPLEMENTED |
| API-059 | `POST /api/devices/register` | `DeviceWorkflowController.register` | IMPLEMENTED |
| API-060 | `POST /api/devices/{id}/activate` | `DeviceWorkflowController.activate` | IMPLEMENTED |
| API-061 | `POST /api/devices/{id}/commands` | `DeviceWorkflowController.command` | IMPLEMENTED |
| API-062 | `GET /api/devices/{id}/commands/{commandId}` | `DeviceWorkflowController.command` | IMPLEMENTED |
| API-063 | `GET /api/devices/{id}/packages` | `DeviceWorkflowController.packages` | IMPLEMENTED |
| API-064 | `GET /api/devices/{id}/readings` | `DeviceWorkflowController.readings` | IMPLEMENTED |
| API-065 | `GET /mock-payment/payments/{id}` | `MockPaymentController.detail` | IMPLEMENTED; demo-only |
| API-066 | `POST /mock-payment/payments/{id}/complete` | `MockPaymentController.complete` | IMPLEMENTED; demo-only |
| API-067 | `GET /api/notifications` | `NotificationController.list` | IMPLEMENTED |
| API-068 | `PUT /api/notifications/preferences/{event}` | `NotificationController.preference` | IMPLEMENTED |
| API-069 | `POST /api/notifications/tokens` | `NotificationController.register` | IMPLEMENTED |
| API-070 | `DELETE /api/notifications/tokens/{id}` | `NotificationController.remove` | IMPLEMENTED |
| API-071 | `PATCH /api/notifications/{id}/read` | `NotificationController.read` | IMPLEMENTED |
| API-072 | `GET /api/orders` | `OrderController.getOrders` | IMPLEMENTED |
| API-073 | `GET /api/orders/paged` | `OrderController.getOrdersPaged` | IMPLEMENTED |
| API-074 | `PATCH /api/orders/{id}/status` | `OrderController.updateOrderStatus` | IMPLEMENTED |
| API-075 | `PATCH /api/orders/{id}/tracking` | `OrderController.updateTrackingNumber` | IMPLEMENTED |
| API-076 | `GET /api/products` | `ProductController.getAllProducts` | IMPLEMENTED |
| API-077 | `POST /api/products` | `ProductController.createProduct` | IMPLEMENTED |
| API-078 | `GET /api/products/categories` | `ProductController.getCategories` | IMPLEMENTED |
| API-079 | `GET /api/products/paged` | `ProductController.getProductsPaged` | IMPLEMENTED |
| API-080 | `DELETE /api/products/{id}` | `ProductController.deleteProduct` | IMPLEMENTED |
| API-081 | `PUT /api/products/{id}` | `ProductController.updateProduct` | IMPLEMENTED |
| API-082 | `PATCH /api/products/{id}/stock` | `ProductController.adjustStock` | IMPLEMENTED |
| API-083 | `GET /api/products/{id}/variants` | `ProductController.getProductVariants` | IMPLEMENTED |
| API-084 | `PATCH /api/products/{id}/variants/{variantId}/stock` | `ProductController.adjustVariant` | IMPLEMENTED |
| API-085 | `GET /api/promotions` | `PromotionController.getAllPromotions` | IMPLEMENTED |
| API-086 | `POST /api/promotions` | `PromotionController.createPromotion` | IMPLEMENTED |
| API-087 | `GET /api/promotions/paged` | `PromotionController.getPromotionsPaged` | IMPLEMENTED |
| API-088 | `POST /api/promotions/validate` | `PromotionController.validateAndCalculate` | IMPLEMENTED |
| API-089 | `DELETE /api/promotions/{id}` | `PromotionController.deletePromotion` | IMPLEMENTED |
| API-090 | `GET /api/promotions/{id}` | `PromotionController.getPromotionById` | IMPLEMENTED |
| API-091 | `PUT /api/promotions/{id}` | `PromotionController.updatePromotion` | IMPLEMENTED |
| API-092 | `PATCH /api/promotions/{id}/toggle` | `PromotionController.toggleActive` | IMPLEMENTED |
| API-093 | `GET /api/reports/{code}` | `RevenueReportController.definition` | IMPLEMENTED |
| API-094 | `POST /api/reports/{code}/export` | `RevenueReportController.export` | IMPLEMENTED |
| API-095 | `GET /api/settings` | `SettingsController.getSettings` | IMPLEMENTED |
| API-096 | `GET /api/settings/templates` | `SettingsController.getAllTemplates` | IMPLEMENTED |
| API-097 | `POST /api/settings/templates` | `SettingsController.saveTemplate` | IMPLEMENTED |
| API-098 | `GET /api/settings/templates/{code}` | `SettingsController.getTemplateByCode` | IMPLEMENTED |
| API-099 | `POST /api/settings/templates/{code}/reset-default` | `SettingsController.resetTemplateToDefault` | IMPLEMENTED |
| API-100 | `POST /api/settings/templates/{code}/test-send` | `SettingsController.testSendTemplate` | PARTIAL |
| API-101 | `GET /api/users` | `UserController.getAllUsers` | IMPLEMENTED |
| API-102 | `GET /api/users/paged` | `UserController.getUsersPaged` | IMPLEMENTED |
| API-103 | `POST /api/users/staff` | `UserController.createStaffUser` | IMPLEMENTED |
| API-104 | `GET /api/users/{id}/details` | `UserController.getUser360Details` | IMPLEMENTED |
| API-105 | `PATCH /api/users/{id}/role` | `UserController.updateRole` | IMPLEMENTED |
| API-106 | `POST /api/users/{id}/send-reset-otp` | `UserController.sendResetOtp` | PARTIAL |
| API-107 | `PATCH /api/users/{id}/toggle-lock` | `UserController.toggleLock` | IMPLEMENTED |
| API-108 | `POST /api/users/{id}/verify-reset-password` | `UserController.verifyResetPassword` | PARTIAL |
| API-109 | `GET /api/warranties/claims` | `WarrantyController.getClaims` | IMPLEMENTED |
| API-110 | `GET /api/warranties/claims/paged` | `WarrantyController.getClaimsPaged` | IMPLEMENTED |
| API-111 | `PATCH /api/warranties/claims/{id}/assign` | `WarrantyController.assignTechnician` | IMPLEMENTED |
| API-112 | `PATCH /api/warranties/claims/{id}/notes` | `WarrantyController.updateNotes` | IMPLEMENTED |
| API-113 | `PATCH /api/warranties/claims/{id}/status` | `WarrantyController.updateClaimStatus` | IMPLEMENTED |
| API-114 | `GET /api/warranties/lookup` | `WarrantyController.lookupWarrantyBySerial` | IMPLEMENTED |

### API-001 — GET `/api/audit-logs`

**Module/mục đích:** Lấy 50 nhật ký thao tác gần nhất. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/accountant. **Màn hình:** AdminAudit.

**Source:** [AuditLogController.getLogs](../../backend/src/main/java/com/smartbox/backend/controller/AuditLogController.java) dòng 25; service: `backend/src/main/java/com/smartbox/backend/service/AuditLogService.java::getRecentLogs`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `getRecentLogs`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<List<AuditLogResponse>>`. Schema Springdoc:

```json
[
  {
    "id": "<UUID>",
    "actorId": "<UUID>",
    "actorName": "<string>",
    "actorRole": "<string>",
    "action": "<string>",
    "targetTable": "<string>",
    "targetId": "<UUID>",
    "meta": "<string>",
    "createdAt": "<ISO-8601 timestamp>"
  }
]
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-002 — POST `/api/audit-logs`

**Module/mục đích:** Ghi nhận một hành động mới vào nhật ký. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin. **Màn hình:** AdminAudit.

**Source:** [AuditLogController.logAction](../../backend/src/main/java/com/smartbox/backend/controller/AuditLogController.java) dòng 39; service: `backend/src/main/java/com/smartbox/backend/service/AuditLogService.java::logAction`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** AuditLogRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `actorId` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `action` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `targetTable` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `targetId` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `meta` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "actorId": "<UUID>",
  "action": "<string>",
  "targetTable": "<string>",
  "targetId": "<UUID>",
  "meta": "<string>"
}
```

**Preconditions/business:** Theo `logAction`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<AuditLogResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "actorId": "<UUID>",
  "actorName": "<string>",
  "actorRole": "<string>",
  "action": "<string>",
  "targetTable": "<string>",
  "targetId": "<UUID>",
  "meta": "<string>",
  "createdAt": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-003 — GET `/api/audit-logs/paged`

**Module/mục đích:** Lấy danh sách nhật ký kiểm toán có phân trang dạng Map<String, Object>. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/accountant. **Màn hình:** AdminAudit.

**Source:** [AuditLogController.getLogsPaged](../../backend/src/main/java/com/smartbox/backend/controller/AuditLogController.java) dòng 31; service: `backend/src/main/java/com/smartbox/backend/service/AuditLogService.java::getLogsPaged`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `page` | query | integer(int32) | required=False; default=0 |
| `size` | query | integer(int32) | required=False; default=10 |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `getLogsPaged`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** page=0; size=10

**Success HTTP:** 200; response signature `ResponseEntity<Map<String, Object>>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "content": [
    {
      "id": "<UUID>",
      "actorId": "<UUID>",
      "actorName": "<string>",
      "actorRole": "<string>",
      "action": "<string>",
      "targetTable": "<string>",
      "targetId": "<UUID>",
      "meta": "<string>",
      "createdAt": "<ISO-8601 timestamp>"
    }
  ],
  "currentPage": 0,
  "totalElements": 1,
  "totalPages": 1,
  "pageSize": 10,
  "numberOfElements": 1,
  "isFirst": true,
  "isLast": true,
  "hasNext": false,
  "hasPrevious": false
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-004 — POST `/api/auth/login`

**Module/mục đích:** Đăng nhập hệ thống (Cấp phát cặp Access Token và Refresh Token cho mọi vai trò). **Trạng thái:** IMPLEMENTED.

**Quyền:** Public. **Màn hình:** Login/Session.

**Source:** [AuthController.login](../../backend/src/main/java/com/smartbox/backend/controller/AuthController.java) dòng 25; service: `backend/src/main/java/com/smartbox/backend/service/AuthService.java::login`.

**Authentication/headers:** Không cần Bearer. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** LoginRequest; controller @Valid = True.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `email` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `password` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "email": "<string>",
  "password": "<string>"
}
```

**Preconditions/business:** Theo `login`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<LoginResponse>`. Schema Springdoc:

```json
{
  "success": true,
  "message": "<string>",
  "userId": "<UUID>",
  "email": "<string>",
  "fullName": "<string>",
  "role": "<string>",
  "accessToken": "<string>",
  "refreshToken": "<string>",
  "tokenType": "<string>",
  "expiresIn": 1,
  "token": "<string>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `ACCOUNT_LOCKED` |
| 401 | `AUTH_PROFILE_MISSING` |
| 401 | `Thông tin đăng nhập hoặc refresh token không hợp lệ` |
| 503 | `AUTH_PROVIDER_NOT_CONFIGURED` |
| 503 | `AUTH_PROVIDER_UNAVAILABLE` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-005 — POST `/api/auth/logout`

**Module/mục đích:** Đăng xuất khỏi hệ thống. **Trạng thái:** IMPLEMENTED.

**Quyền:** Bearer; mọi role hợp lệ, tài khoản chưa khóa. **Màn hình:** Login/Session.

**Source:** [AuthController.logout](../../backend/src/main/java/com/smartbox/backend/controller/AuthController.java) dòng 41; service: `backend/src/main/java/com/smartbox/backend/service/AuthService.java::logout`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `Authorization` | header | string | required=False; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `logout`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<ApiResponse<String>>`. Schema Springdoc:

```json
{
  "code": 1,
  "message": "<string>",
  "data": "<string>",
  "timestamp": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `UnauthorizedException`: `Yêu cầu access token`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `INVALID_ACCESS_TOKEN` |
| 401 | `Yêu cầu access token` |
| 503 | `AUTH_PROVIDER_NOT_CONFIGURED` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-006 — POST `/api/auth/refresh-token`

**Module/mục đích:** Làm mới Access Token. **Trạng thái:** IMPLEMENTED.

**Quyền:** Public. **Màn hình:** Login/Session.

**Source:** [AuthController.refreshToken](../../backend/src/main/java/com/smartbox/backend/controller/AuthController.java) dòng 35; service: `backend/src/main/java/com/smartbox/backend/service/AuthService.java::refreshToken`.

**Authentication/headers:** Không cần Bearer. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** RefreshTokenRequest; controller @Valid = True.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `refreshToken` | string | Có | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "refreshToken": "<string>"
}
```

**Preconditions/business:** Theo `refreshToken`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<RefreshTokenResponse>`. Schema Springdoc:

```json
{
  "success": true,
  "message": "<string>",
  "accessToken": "<string>",
  "refreshToken": "<string>",
  "tokenType": "<string>",
  "expiresIn": 1
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `ACCOUNT_LOCKED` |
| 401 | `AUTH_PROFILE_MISSING` |
| 401 | `Thông tin đăng nhập hoặc refresh token không hợp lệ` |
| 503 | `AUTH_PROVIDER_NOT_CONFIGURED` |
| 503 | `AUTH_PROVIDER_UNAVAILABLE` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-007 — GET `/api/admin/emails`

**Module/mục đích:** Đọc email outbox theo trạng thái. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/support_agent. **Màn hình:** AdminEmails.

**Source:** [CommerceController.emails](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 62; service: `backend/src/main/java/com/smartbox/backend/service/OutboxService.java::list`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `status` | query | string | required=False; default=FAILED |
| `page` | query | integer(int32) | required=False; default=0 |
| `size` | query | integer(int32) | required=False; default=20 |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `list`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** status=FAILED; page=0; size=20

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "content": [
    {
      "id": "<UUID>",
      "template": "<string>",
      "reference_id": "<UUID>",
      "recipient": "<email>",
      "status": "PENDING",
      "attempts": 0,
      "last_error": null,
      "next_attempt_at": "<ISO8601 timestamp>",
      "created_at": "<ISO8601 timestamp>",
      "sent_at": null
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `Yêu cầu đăng nhập` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-008 — POST `/api/admin/emails/{id}/resend`

**Module/mục đích:** Xếp lại emailFAILED vào hàng đợi. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/support_agent. **Màn hình:** AdminEmails.

**Source:** [CommerceController.resend](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 64; service: `backend/src/main/java/com/smartbox/backend/service/OutboxService.java::resend`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Chỉ email FAILED; reset attempts=0 rồi PENDING, không gửi SMTP trong request.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: email_outbox.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "queued": true
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ConflictException`: `EMAIL_NOT_RESENDABLE`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `Yêu cầu đăng nhập` |
| 409 | `EMAIL_NOT_RESENDABLE` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `email_outbox`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-009 — GET `/api/admin/refunds`

**Module/mục đích:** Đọc danh sách refund để đối soát. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/accountant. **Màn hình:** AdminRefunds.

**Source:** [CommerceController.refunds](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 58; service: `backend/src/main/java/com/smartbox/backend/service/FulfillmentService.java::refunds`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `page` | query | integer(int32) | required=False; default=0 |
| `size` | query | integer(int32) | required=False; default=20 |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `refunds`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** page=0; size=20

**Success HTTP:** 200; response signature `List<Map<String,Object>>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
[
  {
    "id": "<UUID>",
    "payment_id": "<UUID>",
    "order_id": "<UUID>",
    "amount": 0,
    "status": "PENDING",
    "reason": "<string>",
    "provider_ref": null,
    "created_at": "<ISO8601 timestamp>",
    "completed_at": null
  }
]
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `BadRequestException`: `VALIDATION_ERROR`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `VALIDATION_ERROR` |
| 401 | `Yêu cầu đăng nhập` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-010 — POST `/api/admin/refunds/{id}/complete`

**Module/mục đích:** Ghi nhận hoàn tiền đã đối soát. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/accountant. **Màn hình:** AdminRefunds.

**Source:** [CommerceController.refund](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 60; service: `backend/src/main/java/com/smartbox/backend/service/FulfillmentService.java::completeRefund`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** RefundCompletion; controller @Valid = True.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `providerRef` | string | Có | maxLength=200, minLength=0 |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "providerRef": "<string>"
}
```

**Preconditions/business:** super_admin/accountant đối soát providerRef; cùng refund/ref lặp idempotent; không chuyển tiền thật. Email khách sau COMPLETED.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: payments, refunds.

**Idempotency:** Có guard terminal trong service. Khi timeout đọc lại trạng thái trước retry; không suy diễn mọi tham số khác vẫn được chấp nhận. Xem literal lỗi và source bên dưới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "completed": true
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ConflictException`: `REFUND_REFERENCE_MISMATCH`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `Yêu cầu đăng nhập` |
| 409 | `REFUND_REFERENCE_MISMATCH` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `audit_logs`, `email_outbox`, `payments`, `refunds`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-011 — POST `/api/orders`

**Module/mục đích:** Tạo đơn nháp và giữ kho theo variant. **Trạng thái:** IMPLEMENTED.

**Quyền:** Bearer + chủ đơn (create/mine theo principal). **Màn hình:** Cart / CreateDraft.

**Source:** [CommerceController.create](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 20; service: `backend/src/main/java/com/smartbox/backend/service/OrderWorkflowService.java::create`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** CreateOrder; controller @Valid = True.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `shippingAddress` | string | Có | maxLength=2000, minLength=0 |
| `items` | array<Item> | Có | maxItems=100, minItems=0 |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "shippingAddress": "<string>",
  "items": [
    {
      "variantId": "<UUID>",
      "quantity": 1
    }
  ]
}
```

**Preconditions/business:** OrderWorkflowService: shippingAddress string, email profile bắt buộc; items variantId 1–99, tối đa 100 entries; merge trùng rồi reserve kho. Không có recipientName/phone riêng, shipping fee/coupon/COD.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: orders.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 201; response signature `ResponseEntity<Map<String,Object>>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "id": "<UUID>",
  "orderId": "<UUID>",
  "userId": "<UUID>",
  "status": "pending",
  "shippingAddress": "<địa chỉ do khách nhập>",
  "total": 0,
  "totalAmount": 0,
  "paidAt": null,
  "expiresAt": "<ISO8601 timestamp>",
  "createdAt": "<ISO8601 timestamp>",
  "updatedAt": "<ISO8601 timestamp>",
  "items": [
    {
      "id": "<UUID>",
      "productId": "<UUID>",
      "variantId": "<UUID>",
      "sku": "<SKU>",
      "productName": "<snapshot>",
      "variantName": "<snapshot>",
      "size": null,
      "capacityLiter": null,
      "unitPrice": 0,
      "quantity": 1,
      "subtotal": 0
    }
  ],
  "ticket": [],
  "shipment": []
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `BadRequestException`: `EMAIL_REQUIRED: Tài khoản cần có email nhận thông báo`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `EMAIL_REQUIRED: Tài khoản cần có email nhận thông báo` |
| 400 | `INVALID_PRICE: Giá SKU phải không âm` |
| 400 | `PRODUCT_INACTIVE: SKU không được bán` |
| 400 | `QUANTITY_LIMIT_EXCEEDED: Số lượng phải từ 1 đến 99` |
| 401 | `Yêu cầu đăng nhập` |
| 409 | `INSUFFICIENT_STOCK: Không đủ tồn kho cho SKU ` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `audit_logs`, `inventory_movements`, `order_items`, `order_status_history`, `orders`, `product_variants`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-012 — GET `/api/orders/my-orders`

**Module/mục đích:** Đọc các đơn thuộc actor hiện tại. **Trạng thái:** IMPLEMENTED.

**Quyền:** Bearer + chủ đơn (create/mine theo principal). **Màn hình:** MyOrders.

**Source:** [CommerceController.mine](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 24; service: `backend/src/main/java/com/smartbox/backend/service/OrderWorkflowService.java::mine`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `page` | query | integer(int32) | required=False; default=0 |
| `size` | query | integer(int32) | required=False; default=20 |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `mine`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** page=0; size=20

**Success HTTP:** 200; response signature `List<Map<String,Object>>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
[
  {
    "id": "<UUID>",
    "status": "<order status>",
    "total": 0,
    "shippingAddress": "<address text>",
    "paidAt": null,
    "createdAt": "<ISO8601 timestamp>"
  }
]
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `BadRequestException`: `VALIDATION_ERROR`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `VALIDATION_ERROR` |
| 401 | `Yêu cầu đăng nhập` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-013 — GET `/api/orders/{id}`

**Module/mục đích:** Đọc snapshot, ticket và shipment của đơn. **Trạng thái:** IMPLEMENTED.

**Quyền:** Chủ đơn hoặc super_admin/support_agent/accountant. **Màn hình:** OrderDetail.

**Source:** [CommerceController.detail](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 22; service: `backend/src/main/java/com/smartbox/backend/service/OrderWorkflowService.java::detail`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `detail`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "id": "<UUID>",
  "orderId": "<UUID>",
  "userId": "<UUID>",
  "status": "pending",
  "shippingAddress": "<địa chỉ do khách nhập>",
  "total": 0,
  "totalAmount": 0,
  "paidAt": null,
  "expiresAt": "<ISO8601 timestamp>",
  "createdAt": "<ISO8601 timestamp>",
  "updatedAt": "<ISO8601 timestamp>",
  "items": [
    {
      "id": "<UUID>",
      "productId": "<UUID>",
      "variantId": "<UUID>",
      "sku": "<SKU>",
      "productName": "<snapshot>",
      "variantName": "<snapshot>",
      "size": null,
      "capacityLiter": null,
      "unitPrice": 0,
      "quantity": 1,
      "subtotal": 0
    }
  ],
  "ticket": [],
  "shipment": []
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `Yêu cầu đăng nhập` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-014 — POST `/api/orders/{id}/cancel`

**Module/mục đích:** Hủy đơn theo quyền và hoàn kho một lần. **Trạng thái:** IMPLEMENTED.

**Quyền:** Chủ đơn trước paid; super_admin/support_agent trước shipment SHIPPED. **Màn hình:** OrderDetail / AdminOrders.

**Source:** [CommerceController.cancel](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 36; service: `backend/src/main/java/com/smartbox/backend/service/OrderWorkflowService.java::cancel`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Reason; controller @Valid = True.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `reason` | string | Có | maxLength=2000, minLength=0 |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "reason": "<string>"
}
```

**Preconditions/business:** Legacy workflow 1 bị chặn; cancelled lặp trả view; customer paid/confirmed bị chặn; shipment không PREPARING bị chặn. Paid cancellation tạo refund; hoàn kho một lần.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: approval_tickets, devices, payments, ticket_history.

**Idempotency:** Có guard terminal trong service. Khi timeout đọc lại trạng thái trước retry; không suy diễn mọi tham số khác vẫn được chấp nhận. Xem literal lỗi và source bên dưới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "id": "<UUID>",
  "orderId": "<UUID>",
  "userId": "<UUID>",
  "status": "pending",
  "shippingAddress": "<địa chỉ do khách nhập>",
  "total": 0,
  "totalAmount": 0,
  "paidAt": null,
  "expiresAt": "<ISO8601 timestamp>",
  "createdAt": "<ISO8601 timestamp>",
  "updatedAt": "<ISO8601 timestamp>",
  "items": [
    {
      "id": "<UUID>",
      "productId": "<UUID>",
      "variantId": "<UUID>",
      "sku": "<SKU>",
      "productName": "<snapshot>",
      "variantName": "<snapshot>",
      "size": null,
      "capacityLiter": null,
      "unitPrice": 0,
      "quantity": 1,
      "subtotal": 0
    }
  ],
  "ticket": [],
  "shipment": []
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ConflictException`: `ORDER_ALREADY_SHIPPED`; `ConflictException`: `PAID_ORDER_REQUIRES_STAFF_CANCELLATION`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `Yêu cầu đăng nhập` |
| 409 | `INSUFFICIENT_STOCK: Không đủ tồn kho cho SKU ` |
| 409 | `INVALID_ORDER_TRANSITION: ` |
| 409 | `LEGACY_ORDER_REVIEW_REQUIRED: Đơn cũ chưa xác minh giữ kho/thanh toán` |
| 409 | `ORDER_ALREADY_SHIPPED` |
| 409 | `PAID_ORDER_REQUIRES_STAFF_CANCELLATION` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `approval_tickets`, `audit_logs`, `devices`, `email_outbox`, `inventory_movements`, `order_status_history`, `orders`, `payments`, `product_variants`, `refunds`, `ticket_history`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-015 — POST `/api/orders/{id}/checkout`

**Module/mục đích:** Tạo payment mock với key chống lặp. **Trạng thái:** IMPLEMENTED.

**Quyền:** Bearer + chủ đơn (create/mine theo principal). **Màn hình:** Checkout.

**Source:** [CommerceController.checkout](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 34; service: `backend/src/main/java/com/smartbox/backend/service/PaymentService.java::checkout`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |
| `Idempotency-Key` | header | string | required=False; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Idempotency-Key bắt buộc <=128 ký tự, response lưu 24h; cùng key/order trả nguyên response. Order pending unexpired, items không rỗng và total>0; provider mock. Không re-checkout cancelled: tạo order mới.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: checkout_keys, orders, payments.

**Idempotency:** Cùng key/order trong 24 giờ trả response snapshot lần đầu. Key dùng lại cho order khác bị409. Retry mạng giữ cùng key, sau đó GET order để xác minh trạng thái mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "orderId": "<UUID>",
  "status": "awaiting_payment",
  "paymentId": "<UUID>",
  "amount": 0,
  "paymentUrl": "<URL do server trả>",
  "expiresAt": "<ISO8601 timestamp>"
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `BadRequestException`: `IDEMPOTENCY_KEY_REQUIRED`; `BadRequestException`: `INVALID_IDEMPOTENCY_KEY`; `ConflictException`: `IDEMPOTENCY_KEY_REUSED`; `ConflictException`: `ORDER_NOT_CHECKOUTABLE: Đơn cần sản phẩm và tổng tiền dương`; `IllegalStateException`: `Cannot save checkout response`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `IDEMPOTENCY_KEY_REQUIRED` |
| 400 | `INVALID_IDEMPOTENCY_KEY` |
| 401 | `Yêu cầu đăng nhập` |
| 409 | `IDEMPOTENCY_KEY_REUSED` |
| 409 | `INVALID_ORDER_TRANSITION: ` |
| 409 | `LEGACY_ORDER_REVIEW_REQUIRED: Đơn cũ chưa xác minh giữ kho/thanh toán` |
| 409 | `ORDER_NOT_CHECKOUTABLE: Đơn cần sản phẩm và tổng tiền dương` |
| 409 | `ORDER_NOT_EDITABLE: Đơn không còn cho phép sửa sản phẩm` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `audit_logs`, `checkout_keys`, `order_status_history`, `orders`, `payments`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-016 — POST `/api/orders/{id}/devices`

**Module/mục đích:** Liên kết device với item đã bán. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/support_agent/technician. **Màn hình:** AdminSerialAssignment.

**Source:** [CommerceController.assign](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 56; service: `backend/src/main/java/com/smartbox/backend/service/FulfillmentService.java::assign`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** DeviceAssignment; controller @Valid = True.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `orderItemId` | string(uuid) | Có | Không khai báo trong schema; xem service/rules |
| `deviceId` | string(uuid) | Có | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "orderItemId": "<UUID>",
  "deviceId": "<UUID>"
}
```

**Preconditions/business:** Order confirmed, serial chưa bán, đúng product và variant; không vượt quantity. Gắn sold_order_item_id nhưng chưa owner trước deliver.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: devices.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "assigned": true
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ConflictException`: `ORDER_NOT_CONFIRMED`; `ConflictException`: `DEVICE_ALREADY_SOLD`; `ConflictException`: `DEVICE_PRODUCT_MISMATCH`; `ConflictException`: `DEVICE_VARIANT_MISMATCH`; `ConflictException`: `ITEM_DEVICE_LIMIT`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `Yêu cầu đăng nhập` |
| 409 | `DEVICE_ALREADY_SOLD` |
| 409 | `DEVICE_PRODUCT_MISMATCH` |
| 409 | `DEVICE_VARIANT_MISMATCH` |
| 409 | `ITEM_DEVICE_LIMIT` |
| 409 | `ORDER_NOT_CONFIRMED` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `devices`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-017 — GET `/api/orders/{id}/history`

**Module/mục đích:** Đọc lịch sử trạng thái đơn. **Trạng thái:** IMPLEMENTED.

**Quyền:** Chủ đơn hoặc super_admin/support_agent/accountant. **Màn hình:** OrderTimeline.

**Source:** [CommerceController.history](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 26; service: `backend/src/main/java/com/smartbox/backend/service/OrderWorkflowService.java::history`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `history`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `List<Map<String,Object>>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
[
  {
    "id": "<UUID>",
    "order_id": "<UUID>",
    "from_status": "<string>",
    "to_status": "<string>",
    "changed_by": "<string>",
    "reason": "<string>",
    "created_at": "<ISO8601 timestamp>"
  }
]
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `Yêu cầu đăng nhập` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-018 — POST `/api/orders/{id}/items`

**Module/mục đích:** Thêm hoặc gộp variant trong đơn pending. **Trạng thái:** IMPLEMENTED.

**Quyền:** Bearer + chủ đơn (create/mine theo principal). **Màn hình:** OrderDraft.

**Source:** [CommerceController.add](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 28; service: `backend/src/main/java/com/smartbox/backend/service/OrderWorkflowService.java::add`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Item; controller @Valid = True.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `variantId` | string(uuid) | Có | Không khai báo trong schema; xem service/rules |
| `quantity` | integer(int32) | Không khai báo @NotNull trong schema | maximum=99, minimum=1 |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "variantId": "<UUID>",
  "quantity": 1
}
```

**Preconditions/business:** Chỉ workflow_version=2, pending và chưa hết draft; cộng qty, giữ snapshot lần đầu; khóa order và SKU, guard stock.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "id": "<UUID>",
  "orderId": "<UUID>",
  "userId": "<UUID>",
  "status": "pending",
  "shippingAddress": "<địa chỉ do khách nhập>",
  "total": 0,
  "totalAmount": 0,
  "paidAt": null,
  "expiresAt": "<ISO8601 timestamp>",
  "createdAt": "<ISO8601 timestamp>",
  "updatedAt": "<ISO8601 timestamp>",
  "items": [
    {
      "id": "<UUID>",
      "productId": "<UUID>",
      "variantId": "<UUID>",
      "sku": "<SKU>",
      "productName": "<snapshot>",
      "variantName": "<snapshot>",
      "size": null,
      "capacityLiter": null,
      "unitPrice": 0,
      "quantity": 1,
      "subtotal": 0
    }
  ],
  "ticket": [],
  "shipment": []
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `INVALID_PRICE: Giá SKU phải không âm` |
| 400 | `PRODUCT_INACTIVE: SKU không được bán` |
| 400 | `QUANTITY_LIMIT_EXCEEDED: Số lượng phải từ 1 đến 99` |
| 401 | `Yêu cầu đăng nhập` |
| 409 | `INSUFFICIENT_STOCK: Không đủ tồn kho cho SKU ` |
| 409 | `LEGACY_ORDER_REVIEW_REQUIRED: Đơn cũ chưa xác minh giữ kho/thanh toán` |
| 409 | `ORDER_NOT_EDITABLE: Đơn không còn cho phép sửa sản phẩm` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `inventory_movements`, `order_items`, `orders`, `product_variants`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-019 — DELETE `/api/orders/{id}/items/{variantId}`

**Module/mục đích:** Xóa variant và hoàn lượng kho đã giữ. **Trạng thái:** IMPLEMENTED.

**Quyền:** Bearer + chủ đơn (create/mine theo principal). **Màn hình:** OrderDraft.

**Source:** [CommerceController.remove](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 32; service: `backend/src/main/java/com/smartbox/backend/service/OrderWorkflowService.java::remove`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |
| `variantId` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Chỉ pending chưa hết hạn; hoàn đúng qty đã giữ rồi xóa row và tính lại total.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: order_items.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "id": "<UUID>",
  "orderId": "<UUID>",
  "userId": "<UUID>",
  "status": "pending",
  "shippingAddress": "<địa chỉ do khách nhập>",
  "total": 0,
  "totalAmount": 0,
  "paidAt": null,
  "expiresAt": "<ISO8601 timestamp>",
  "createdAt": "<ISO8601 timestamp>",
  "updatedAt": "<ISO8601 timestamp>",
  "items": [
    {
      "id": "<UUID>",
      "productId": "<UUID>",
      "variantId": "<UUID>",
      "sku": "<SKU>",
      "productName": "<snapshot>",
      "variantName": "<snapshot>",
      "size": null,
      "capacityLiter": null,
      "unitPrice": 0,
      "quantity": 1,
      "subtotal": 0
    }
  ],
  "ticket": [],
  "shipment": []
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `Yêu cầu đăng nhập` |
| 409 | `INSUFFICIENT_STOCK: Không đủ tồn kho cho SKU ` |
| 409 | `LEGACY_ORDER_REVIEW_REQUIRED: Đơn cũ chưa xác minh giữ kho/thanh toán` |
| 409 | `ORDER_NOT_EDITABLE: Đơn không còn cho phép sửa sản phẩm` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `inventory_movements`, `order_items`, `orders`, `product_variants`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-020 — PATCH `/api/orders/{id}/items/{variantId}`

**Module/mục đích:** Đặt số lượng đích cho variant trong đơn. **Trạng thái:** IMPLEMENTED.

**Quyền:** Bearer + chủ đơn (create/mine theo principal). **Màn hình:** OrderDraft.

**Source:** [CommerceController.quantity](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 30; service: `backend/src/main/java/com/smartbox/backend/service/OrderWorkflowService.java::setQuantity`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |
| `variantId` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Quantity; controller @Valid = True.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `quantity` | integer(int32) | Không khai báo @NotNull trong schema | maximum=99, minimum=1 |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "quantity": 1
}
```

**Preconditions/business:** Chỉ pending chưa hết hạn; quantity là số lượng đích, không phải delta. Giảm qty trả kho, tăng qty kiểm tra active và stock.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: order_items.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "id": "<UUID>",
  "orderId": "<UUID>",
  "userId": "<UUID>",
  "status": "pending",
  "shippingAddress": "<địa chỉ do khách nhập>",
  "total": 0,
  "totalAmount": 0,
  "paidAt": null,
  "expiresAt": "<ISO8601 timestamp>",
  "createdAt": "<ISO8601 timestamp>",
  "updatedAt": "<ISO8601 timestamp>",
  "items": [
    {
      "id": "<UUID>",
      "productId": "<UUID>",
      "variantId": "<UUID>",
      "sku": "<SKU>",
      "productName": "<snapshot>",
      "variantName": "<snapshot>",
      "size": null,
      "capacityLiter": null,
      "unitPrice": 0,
      "quantity": 1,
      "subtotal": 0
    }
  ],
  "ticket": [],
  "shipment": []
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `BadRequestException`: `PRODUCT_INACTIVE`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `PRODUCT_INACTIVE` |
| 400 | `QUANTITY_LIMIT_EXCEEDED: Số lượng phải từ 1 đến 99` |
| 401 | `Yêu cầu đăng nhập` |
| 409 | `INSUFFICIENT_STOCK: Không đủ tồn kho cho SKU ` |
| 409 | `LEGACY_ORDER_REVIEW_REQUIRED: Đơn cũ chưa xác minh giữ kho/thanh toán` |
| 409 | `ORDER_NOT_EDITABLE: Đơn không còn cho phép sửa sản phẩm` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `inventory_movements`, `order_items`, `orders`, `product_variants`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-021 — POST `/api/orders/{id}/shipment/deliver`

**Module/mục đích:** Ghi nhận giao đủ serial; chưa có nghiệm thu lắp đặt. **Trạng thái:** PARTIAL.

**Quyền:** super_admin/support_agent. **Màn hình:** AdminShipment legacy.

**Source:** [CommerceController.deliver](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 54; service: `backend/src/main/java/com/smartbox/backend/service/FulfillmentService.java::delivered`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Shipment SHIPPED, số devices gắn order item phải bằng quantity; hoàn thành shipment và order, owner được gắn lúc này. Chưa kiểm tra lắp đặt/ACK/nghiệm thu, vì vậy PARTIAL so với nghiệp vụ mới.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: devices, shipment_history, shipments.

**Idempotency:** Có guard terminal trong service. Khi timeout đọc lại trạng thái trước retry; không suy diễn mọi tham số khác vẫn được chấp nhận. Xem literal lỗi và source bên dưới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "id": "<UUID>",
  "orderId": "<UUID>",
  "userId": "<UUID>",
  "status": "pending",
  "shippingAddress": "<địa chỉ do khách nhập>",
  "total": 0,
  "totalAmount": 0,
  "paidAt": null,
  "expiresAt": "<ISO8601 timestamp>",
  "createdAt": "<ISO8601 timestamp>",
  "updatedAt": "<ISO8601 timestamp>",
  "items": [
    {
      "id": "<UUID>",
      "productId": "<UUID>",
      "variantId": "<UUID>",
      "sku": "<SKU>",
      "productName": "<snapshot>",
      "variantName": "<snapshot>",
      "size": null,
      "capacityLiter": null,
      "unitPrice": 0,
      "quantity": 1,
      "subtotal": 0
    }
  ],
  "ticket": [],
  "shipment": []
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ConflictException`: `SHIPMENT_NOT_SHIPPED`; `ConflictException`: `DEVICE_SERIAL_ASSIGNMENT_INCOMPLETE`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `Yêu cầu đăng nhập` |
| 409 | `DEVICE_SERIAL_ASSIGNMENT_INCOMPLETE` |
| 409 | `INVALID_ORDER_TRANSITION: ` |
| 409 | `SHIPMENT_NOT_SHIPPED` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `audit_logs`, `devices`, `email_outbox`, `order_status_history`, `orders`, `shipment_history`, `shipments`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-022 — POST `/api/orders/{id}/shipment/ship`

**Module/mục đích:** Ghi nhận shipment đang giao theo flow cũ. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/support_agent. **Màn hình:** AdminShipment.

**Source:** [CommerceController.ship](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 52; service: `backend/src/main/java/com/smartbox/backend/service/FulfillmentService.java::ship`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Shipment; controller @Valid = True.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `carrier` | string | Có | maxLength=200, minLength=0 |
| `trackingNumber` | string | Có | maxLength=200, minLength=0 |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "carrier": "<string>",
  "trackingNumber": "<string>"
}
```

**Preconditions/business:** Order confirmed, shipment PREPARING; ghi carrier/tracking, SHIPPED và email. Đây là shipment cũ, không tương đương công việc delivery_installations.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: orders, shipment_history, shipments.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "id": "<UUID>",
  "orderId": "<UUID>",
  "userId": "<UUID>",
  "status": "pending",
  "shippingAddress": "<địa chỉ do khách nhập>",
  "total": 0,
  "totalAmount": 0,
  "paidAt": null,
  "expiresAt": "<ISO8601 timestamp>",
  "createdAt": "<ISO8601 timestamp>",
  "updatedAt": "<ISO8601 timestamp>",
  "items": [
    {
      "id": "<UUID>",
      "productId": "<UUID>",
      "variantId": "<UUID>",
      "sku": "<SKU>",
      "productName": "<snapshot>",
      "variantName": "<snapshot>",
      "size": null,
      "capacityLiter": null,
      "unitPrice": 0,
      "quantity": 1,
      "subtotal": 0
    }
  ],
  "ticket": [],
  "shipment": []
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ConflictException`: `ORDER_NOT_CONFIRMED`; `ConflictException`: `SHIPMENT_NOT_PREPARING`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `Yêu cầu đăng nhập` |
| 409 | `ORDER_NOT_CONFIRMED` |
| 409 | `SHIPMENT_NOT_PREPARING` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `email_outbox`, `orders`, `shipment_history`, `shipments`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-023 — POST `/api/payments/callback`

**Module/mục đích:** Xác minh HMAC và xử lý kết quả payment. **Trạng thái:** IMPLEMENTED.

**Quyền:** Public; callback cần HMAC, không cần Bearer. **Màn hình:** Gateway backend; frontend chỉ đọc OrderDetail.

**Source:** [CommerceController.callback](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 38; service: `backend/src/main/java/com/smartbox/backend/service/PaymentService.java::callback`.

**Authentication/headers:** Không cần Bearer; callback bắt buộc chữ ký HMAC trong body. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** Callback; controller @Valid = True.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `paymentId` | string(uuid) | Có | Không khai báo trong schema; xem service/rules |
| `orderId` | string(uuid) | Có | Không khai báo trong schema; xem service/rules |
| `amount` | number | Có | minimum=0 |
| `result` | string | Có | pattern=SUCCESS\|FAILED |
| `signature` | string | Có | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "paymentId": "<UUID>",
  "orderId": "<UUID>",
  "amount": 1,
  "result": "<string>",
  "signature": "<string>"
}
```

**Preconditions/business:** HMAC-SHA256 xác minh trước mutation; khóa order→payment; amount/order match; duplicate success ACK; expired/cancelled SUCCESS tạo refund_required, không hồi sinh order. Không phải API frontend xác nhận paid.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: approval_tickets, orders, payments, ticket_history.

**Idempotency:** Callback hợp lệ terminal success/refund_required/refunded được ACK mà không tạo ticket/history/outbox trùng. Chữ ký và amount vẫn phải hợp lệ.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "acknowledged": true
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `UnauthorizedException`: `INVALID_SIGNATURE`; `BadRequestException`: `INVALID_PAYMENT_RESULT`; `BadRequestException`: `PAYMENT_ORDER_MISMATCH`; `BadRequestException`: `AMOUNT_MISMATCH`; `IllegalStateException`: `DEMO_FAIL_AFTER_PAID`; `ConflictException`: `PAYMENT_ORDER_STATE_MISMATCH`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `AMOUNT_MISMATCH` |
| 400 | `INVALID_PAYMENT_RESULT` |
| 400 | `PAYMENT_ORDER_MISMATCH` |
| 401 | `INVALID_SIGNATURE` |
| 401 | `Yêu cầu đăng nhập` |
| 409 | `INSUFFICIENT_STOCK: Không đủ tồn kho cho SKU ` |
| 409 | `INVALID_ORDER_TRANSITION: ` |
| 409 | `LEGACY_ORDER_REVIEW_REQUIRED: Đơn cũ chưa xác minh giữ kho/thanh toán` |
| 409 | `PAYMENT_ORDER_STATE_MISMATCH` |
| 503 | `PAYMENT_NOT_CONFIGURED` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `approval_tickets`, `audit_logs`, `email_outbox`, `inventory_movements`, `order_status_history`, `orders`, `payments`, `product_variants`, `refunds`, `ticket_history`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-024 — GET `/api/tickets`

**Module/mục đích:** Đọc danh sách ticket cho nhân viên có quyền. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/support_agent/accountant. **Màn hình:** AdminPOQueue.

**Source:** [CommerceController.tickets](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 40; service: `backend/src/main/java/com/smartbox/backend/service/ApprovalTicketService.java::list`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `page` | query | integer(int32) | required=False; default=0 |
| `size` | query | integer(int32) | required=False; default=20 |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `list`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** page=0; size=20

**Success HTTP:** 200; response signature `List<Map<String,Object>>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
[
  {
    "id": "<UUID>",
    "order_id": "<UUID>",
    "status": "PENDING",
    "review_round": 1,
    "reason": null,
    "created_at": "<ISO8601 timestamp>",
    "updated_at": "<ISO8601 timestamp>"
  }
]
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `BadRequestException`: `VALIDATION_ERROR`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `VALIDATION_ERROR` |
| 401 | `Yêu cầu đăng nhập` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-025 — GET `/api/tickets/{id}`

**Module/mục đích:** Đọc ticket và lịch sử quyết định. **Trạng thái:** IMPLEMENTED.

**Quyền:** Chủ đơn hoặc super_admin/support_agent/accountant. **Màn hình:** CustomerTicket / AdminPOReview.

**Source:** [CommerceController.ticket](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 42; service: `backend/src/main/java/com/smartbox/backend/service/ApprovalTicketService.java::detail`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `detail`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "id": "<UUID>",
  "order_id": "<UUID>",
  "status": "PENDING",
  "review_round": 1,
  "reason": null,
  "created_at": "<ISO8601 timestamp>",
  "updated_at": "<ISO8601 timestamp>",
  "history": [
    {
      "id": "<UUID>",
      "ticket_id": "<UUID>",
      "action": "<action từ history>",
      "actor_id": null,
      "reason": null,
      "created_at": "<ISO8601 timestamp>"
    }
  ]
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `Yêu cầu đăng nhập` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-026 — POST `/api/tickets/{id}/approve`

**Module/mục đích:** Duyệt ticket và xác nhận đơn. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/support_agent. **Màn hình:** AdminPOReview.

**Source:** [CommerceController.approve](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 44; service: `backend/src/main/java/com/smartbox/backend/service/ApprovalTicketService.java::act`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Ticket PENDING, order paid; update APPROVED + order confirmed + shipment PREPARING trong transaction; audit/history/outbox. Chưa phân công kỹ thuật viên.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: approval_tickets, shipments, ticket_history.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "id": "<UUID>",
  "order_id": "<UUID>",
  "status": "PENDING",
  "review_round": 1,
  "reason": null,
  "created_at": "<ISO8601 timestamp>",
  "updated_at": "<ISO8601 timestamp>",
  "history": [
    {
      "id": "<UUID>",
      "ticket_id": "<UUID>",
      "action": "<action từ history>",
      "actor_id": null,
      "reason": null,
      "created_at": "<ISO8601 timestamp>"
    }
  ]
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ConflictException`: `TICKET_ORDER_NOT_PAID`; `ConflictException`: `INVALID_TICKET_TRANSITION`; `ConflictException`: `TICKET_ALREADY_REVIEWED`; `BadRequestException`: `INVALID_TICKET_ACTION`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `INVALID_TICKET_ACTION` |
| 400 | `TICKET_REASON_REQUIRED` |
| 401 | `Yêu cầu đăng nhập` |
| 409 | `INSUFFICIENT_STOCK: Không đủ tồn kho cho SKU ` |
| 409 | `INVALID_ORDER_TRANSITION: ` |
| 409 | `INVALID_TICKET_TRANSITION` |
| 409 | `LEGACY_ORDER_REVIEW_REQUIRED: Đơn cũ chưa xác minh giữ kho/thanh toán` |
| 409 | `TICKET_ALREADY_REVIEWED` |
| 409 | `TICKET_ORDER_NOT_PAID` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `approval_tickets`, `audit_logs`, `email_outbox`, `inventory_movements`, `order_status_history`, `orders`, `payments`, `product_variants`, `refunds`, `shipments`, `ticket_history`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-027 — POST `/api/tickets/{id}/reject`

**Module/mục đích:** Từ chối ticket, hủy đơn và yêu cầu refund. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/support_agent. **Màn hình:** AdminPOReview.

**Source:** [CommerceController.reject](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 50; service: `backend/src/main/java/com/smartbox/backend/service/ApprovalTicketService.java::act`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Reason; controller @Valid = True.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `reason` | string | Có | maxLength=2000, minLength=0 |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "reason": "<string>"
}
```

**Preconditions/business:** Ticket PENDING/order paid; reason bắt buộc; REJECTED, order cancelled, refund PENDING, stock restore, outbox.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: approval_tickets, shipments, ticket_history.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "id": "<UUID>",
  "order_id": "<UUID>",
  "status": "PENDING",
  "review_round": 1,
  "reason": null,
  "created_at": "<ISO8601 timestamp>",
  "updated_at": "<ISO8601 timestamp>",
  "history": [
    {
      "id": "<UUID>",
      "ticket_id": "<UUID>",
      "action": "<action từ history>",
      "actor_id": null,
      "reason": null,
      "created_at": "<ISO8601 timestamp>"
    }
  ]
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ConflictException`: `TICKET_ORDER_NOT_PAID`; `ConflictException`: `INVALID_TICKET_TRANSITION`; `ConflictException`: `TICKET_ALREADY_REVIEWED`; `BadRequestException`: `INVALID_TICKET_ACTION`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `INVALID_TICKET_ACTION` |
| 400 | `TICKET_REASON_REQUIRED` |
| 401 | `Yêu cầu đăng nhập` |
| 409 | `INSUFFICIENT_STOCK: Không đủ tồn kho cho SKU ` |
| 409 | `INVALID_ORDER_TRANSITION: ` |
| 409 | `INVALID_TICKET_TRANSITION` |
| 409 | `LEGACY_ORDER_REVIEW_REQUIRED: Đơn cũ chưa xác minh giữ kho/thanh toán` |
| 409 | `TICKET_ALREADY_REVIEWED` |
| 409 | `TICKET_ORDER_NOT_PAID` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `approval_tickets`, `audit_logs`, `email_outbox`, `inventory_movements`, `order_status_history`, `orders`, `payments`, `product_variants`, `refunds`, `shipments`, `ticket_history`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-028 — POST `/api/tickets/{id}/resubmit`

**Module/mục đích:** Chủ đơn gửi giải trình xét duyệt lại. **Trạng thái:** IMPLEMENTED.

**Quyền:** Bearer + chủ đơn (create/mine theo principal). **Màn hình:** CustomerTicket.

**Source:** [CommerceController.resubmit](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 48; service: `backend/src/main/java/com/smartbox/backend/service/ApprovalTicketService.java::act`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Reason; controller @Valid = True.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `reason` | string | Có | maxLength=2000, minLength=0 |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "reason": "<string>"
}
```

**Preconditions/business:** Chủ đơn, ticket RETURNED/order paid; reason bắt buộc; ticket PENDING, review_round tăng. Chỉ text reason, chưa có attachments.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: approval_tickets, shipments, ticket_history.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "id": "<UUID>",
  "order_id": "<UUID>",
  "status": "PENDING",
  "review_round": 1,
  "reason": null,
  "created_at": "<ISO8601 timestamp>",
  "updated_at": "<ISO8601 timestamp>",
  "history": [
    {
      "id": "<UUID>",
      "ticket_id": "<UUID>",
      "action": "<action từ history>",
      "actor_id": null,
      "reason": null,
      "created_at": "<ISO8601 timestamp>"
    }
  ]
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ConflictException`: `TICKET_ORDER_NOT_PAID`; `ConflictException`: `INVALID_TICKET_TRANSITION`; `ConflictException`: `TICKET_ALREADY_REVIEWED`; `BadRequestException`: `INVALID_TICKET_ACTION`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `INVALID_TICKET_ACTION` |
| 400 | `TICKET_REASON_REQUIRED` |
| 401 | `Yêu cầu đăng nhập` |
| 409 | `INSUFFICIENT_STOCK: Không đủ tồn kho cho SKU ` |
| 409 | `INVALID_ORDER_TRANSITION: ` |
| 409 | `INVALID_TICKET_TRANSITION` |
| 409 | `LEGACY_ORDER_REVIEW_REQUIRED: Đơn cũ chưa xác minh giữ kho/thanh toán` |
| 409 | `TICKET_ALREADY_REVIEWED` |
| 409 | `TICKET_ORDER_NOT_PAID` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `approval_tickets`, `audit_logs`, `email_outbox`, `inventory_movements`, `order_status_history`, `orders`, `payments`, `product_variants`, `refunds`, `shipments`, `ticket_history`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-029 — POST `/api/tickets/{id}/return`

**Module/mục đích:** Yêu cầu khách giải trình. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/support_agent. **Màn hình:** AdminPOReview.

**Source:** [CommerceController.returnTicket](../../backend/src/main/java/com/smartbox/backend/controller/CommerceController.java) dòng 46; service: `backend/src/main/java/com/smartbox/backend/service/ApprovalTicketService.java::act`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Reason; controller @Valid = True.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `reason` | string | Có | maxLength=2000, minLength=0 |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "reason": "<string>"
}
```

**Preconditions/business:** Ticket PENDING/order paid; reason bắt buộc. Ticket RETURNED nhưng order vẫn paid, items bất biến.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: approval_tickets, shipments, ticket_history.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "id": "<UUID>",
  "order_id": "<UUID>",
  "status": "PENDING",
  "review_round": 1,
  "reason": null,
  "created_at": "<ISO8601 timestamp>",
  "updated_at": "<ISO8601 timestamp>",
  "history": [
    {
      "id": "<UUID>",
      "ticket_id": "<UUID>",
      "action": "<action từ history>",
      "actor_id": null,
      "reason": null,
      "created_at": "<ISO8601 timestamp>"
    }
  ]
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ConflictException`: `TICKET_ORDER_NOT_PAID`; `ConflictException`: `INVALID_TICKET_TRANSITION`; `ConflictException`: `TICKET_ALREADY_REVIEWED`; `BadRequestException`: `INVALID_TICKET_ACTION`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `INVALID_TICKET_ACTION` |
| 400 | `TICKET_REASON_REQUIRED` |
| 401 | `Yêu cầu đăng nhập` |
| 409 | `INSUFFICIENT_STOCK: Không đủ tồn kho cho SKU ` |
| 409 | `INVALID_ORDER_TRANSITION: ` |
| 409 | `INVALID_TICKET_TRANSITION` |
| 409 | `LEGACY_ORDER_REVIEW_REQUIRED: Đơn cũ chưa xác minh giữ kho/thanh toán` |
| 409 | `TICKET_ALREADY_REVIEWED` |
| 409 | `TICKET_ORDER_NOT_PAID` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `approval_tickets`, `audit_logs`, `email_outbox`, `inventory_movements`, `order_status_history`, `orders`, `payments`, `product_variants`, `refunds`, `shipments`, `ticket_history`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-030 — GET `/api/admin/dashboard`

**Module/mục đích:** ConcurrentDashboard / dashboard. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/accountant. **Màn hình:** AdminDashboard.

**Source:** [ConcurrentDashboardController.dashboard](../../backend/src/main/java/com/smartbox/backend/controller/ConcurrentDashboardController.java) dòng 14; service: `backend/src/main/java/com/smartbox/backend/service/ConcurrentDashboardService.java::dashboard`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `date` | query | string(date) | required=False; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `dashboard`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "date": "<yyyy-MM-dd>",
  "revenueToday": null,
  "orderCountByStatus": null,
  "top5Products": null,
  "lowStockProducts": null,
  "partial": true,
  "failedParts": [
    "<failed part name>"
  ],
  "elapsedMs": 0
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `AppException`: `DASHBOARD_BUSY`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `Yêu cầu đăng nhập` |
| 503 | `DASHBOARD_BUSY` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-031 — GET `/api/content/articles`

**Module/mục đích:** Lấy danh sách bài viết blog / tin tức. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminCMS (không public CMS).

**Source:** [ContentController.getAllArticles](../../backend/src/main/java/com/smartbox/backend/controller/ContentController.java) dòng 38; service: `backend/src/main/java/com/smartbox/backend/service/ContentService.java::getAllArticles`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `category` | query | string | required=False; Không khai báo trong schema; xem service/rules |
| `status` | query | string | required=False; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** category=tùy chọn; status=tùy chọn

**Success HTTP:** 200; response signature `ResponseEntity<List<ArticleResponse>>`. Schema Springdoc:

```json
[
  {
    "id": "<UUID>",
    "title": "<string>",
    "slug": "<string>",
    "category": "<string>",
    "summary": "<string>",
    "content": "<string>",
    "coverImage": "<string>",
    "authorName": "<string>",
    "status": "<string>",
    "viewCount": 1,
    "tags": [
      "<string>"
    ],
    "publishedAt": "<ISO-8601 timestamp>",
    "createdAt": "<ISO-8601 timestamp>",
    "updatedAt": "<ISO-8601 timestamp>"
  }
]
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-032 — POST `/api/content/articles`

**Module/mục đích:** Tạo bài viết mới. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminCMS (không public CMS).

**Source:** [ContentController.createArticle](../../backend/src/main/java/com/smartbox/backend/controller/ContentController.java) dòng 60; service: `backend/src/main/java/com/smartbox/backend/service/ContentService.java::createArticle`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** ArticleRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `title` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `slug` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `category` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `summary` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `content` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `coverImage` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `authorName` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `status` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `tags` | array<string> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "title": "<string>",
  "slug": "<string>",
  "category": "<string>",
  "summary": "<string>",
  "content": "<string>",
  "coverImage": "<string>",
  "authorName": "<string>",
  "status": "<string>",
  "tags": [
    "<string>"
  ]
}
```

**Preconditions/business:** Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<ArticleResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "title": "<string>",
  "slug": "<string>",
  "category": "<string>",
  "summary": "<string>",
  "content": "<string>",
  "coverImage": "<string>",
  "authorName": "<string>",
  "status": "<string>",
  "viewCount": 1,
  "tags": [
    "<string>"
  ],
  "publishedAt": "<ISO-8601 timestamp>",
  "createdAt": "<ISO-8601 timestamp>",
  "updatedAt": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-033 — GET `/api/content/articles/paged`

**Module/mục đích:** Lấy danh sách bài viết có phân trang dạng Map<String, Object>. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminCMS (không public CMS).

**Source:** [ContentController.getArticlesPaged](../../backend/src/main/java/com/smartbox/backend/controller/ContentController.java) dòng 46; service: `backend/src/main/java/com/smartbox/backend/service/ContentService.java::getArticlesPaged`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `page` | query | integer(int32) | required=False; default=0 |
| `size` | query | integer(int32) | required=False; default=10 |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** page=0; size=10

**Success HTTP:** 200; response signature `ResponseEntity<Map<String, Object>>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "content": [
    {
      "id": "<UUID>",
      "title": "<string>",
      "slug": "<string>",
      "category": "<string>",
      "summary": "<string>",
      "content": "<string>",
      "coverImage": "<string>",
      "authorName": "<string>",
      "status": "<string>",
      "viewCount": 1,
      "tags": [
        "<string>"
      ],
      "publishedAt": "<ISO-8601 timestamp>",
      "createdAt": "<ISO-8601 timestamp>",
      "updatedAt": "<ISO-8601 timestamp>"
    }
  ],
  "currentPage": 0,
  "totalElements": 1,
  "totalPages": 1,
  "pageSize": 10,
  "numberOfElements": 1,
  "isFirst": true,
  "isLast": true,
  "hasNext": false,
  "hasPrevious": false
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-034 — DELETE `/api/content/articles/{id}`

**Module/mục đích:** Xóa bài viết. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminCMS (không public CMS).

**Source:** [ContentController.deleteArticle](../../backend/src/main/java/com/smartbox/backend/controller/ContentController.java) dòng 74; service: `backend/src/main/java/com/smartbox/backend/service/ContentService.java::deleteArticle`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<Map<String, Object>>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "success": true,
  "message": "Đã xóa bài viết thành công."
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Bài viết`. Các helper/service được gọi có thêm lỗi như rules.

### API-035 — GET `/api/content/articles/{id}`

**Module/mục đích:** Lấy chi tiết một bài viết theo ID. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminCMS (không public CMS).

**Source:** [ContentController.getArticleById](../../backend/src/main/java/com/smartbox/backend/controller/ContentController.java) dòng 54; service: `backend/src/main/java/com/smartbox/backend/service/ContentService.java::getArticleById`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<ArticleResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "title": "<string>",
  "slug": "<string>",
  "category": "<string>",
  "summary": "<string>",
  "content": "<string>",
  "coverImage": "<string>",
  "authorName": "<string>",
  "status": "<string>",
  "viewCount": 1,
  "tags": [
    "<string>"
  ],
  "publishedAt": "<ISO-8601 timestamp>",
  "createdAt": "<ISO-8601 timestamp>",
  "updatedAt": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Bài viết`. Các helper/service được gọi có thêm lỗi như rules.

### API-036 — PUT `/api/content/articles/{id}`

**Module/mục đích:** Chỉnh sửa bài viết. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminCMS (không public CMS).

**Source:** [ContentController.updateArticle](../../backend/src/main/java/com/smartbox/backend/controller/ContentController.java) dòng 66; service: `backend/src/main/java/com/smartbox/backend/service/ContentService.java::updateArticle`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** ArticleRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `title` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `slug` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `category` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `summary` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `content` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `coverImage` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `authorName` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `status` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `tags` | array<string> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "title": "<string>",
  "slug": "<string>",
  "category": "<string>",
  "summary": "<string>",
  "content": "<string>",
  "coverImage": "<string>",
  "authorName": "<string>",
  "status": "<string>",
  "tags": [
    "<string>"
  ]
}
```

**Preconditions/business:** Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<ArticleResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "title": "<string>",
  "slug": "<string>",
  "category": "<string>",
  "summary": "<string>",
  "content": "<string>",
  "coverImage": "<string>",
  "authorName": "<string>",
  "status": "<string>",
  "viewCount": 1,
  "tags": [
    "<string>"
  ],
  "publishedAt": "<ISO-8601 timestamp>",
  "createdAt": "<ISO-8601 timestamp>",
  "updatedAt": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Bài viết`. Các helper/service được gọi có thêm lỗi như rules.

### API-037 — GET `/api/content/banners`

**Module/mục đích:** Lấy danh sách banner trang chủ & quảng cáo. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminCMS (không public CMS).

**Source:** [ContentController.getAllBanners](../../backend/src/main/java/com/smartbox/backend/controller/ContentController.java) dòng 84; service: `backend/src/main/java/com/smartbox/backend/service/ContentService.java::getAllBanners`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `position` | query | string | required=False; Không khai báo trong schema; xem service/rules |
| `activeOnly` | query | boolean | required=False; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** position=tùy chọn; activeOnly=tùy chọn

**Success HTTP:** 200; response signature `ResponseEntity<List<BannerResponse>>`. Schema Springdoc:

```json
[
  {
    "id": "<UUID>",
    "title": "<string>",
    "imageUrl": "<string>",
    "targetUrl": "<string>",
    "position": "<string>",
    "displayOrder": 1,
    "isActive": true,
    "clickCount": 1,
    "startDate": "<ISO-8601 timestamp>",
    "endDate": "<ISO-8601 timestamp>",
    "createdAt": "<ISO-8601 timestamp>",
    "updatedAt": "<ISO-8601 timestamp>"
  }
]
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-038 — POST `/api/content/banners`

**Module/mục đích:** Thêm banner mới. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminCMS (không public CMS).

**Source:** [ContentController.createBanner](../../backend/src/main/java/com/smartbox/backend/controller/ContentController.java) dòng 92; service: `backend/src/main/java/com/smartbox/backend/service/ContentService.java::createBanner`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** BannerRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `title` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `imageUrl` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `targetUrl` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `position` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `displayOrder` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `isActive` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `startDate` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `endDate` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "title": "<string>",
  "imageUrl": "<string>",
  "targetUrl": "<string>",
  "position": "<string>",
  "displayOrder": 1,
  "isActive": true,
  "startDate": "<string>",
  "endDate": "<string>"
}
```

**Preconditions/business:** Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<BannerResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "title": "<string>",
  "imageUrl": "<string>",
  "targetUrl": "<string>",
  "position": "<string>",
  "displayOrder": 1,
  "isActive": true,
  "clickCount": 1,
  "startDate": "<ISO-8601 timestamp>",
  "endDate": "<ISO-8601 timestamp>",
  "createdAt": "<ISO-8601 timestamp>",
  "updatedAt": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-039 — DELETE `/api/content/banners/{id}`

**Module/mục đích:** Xóa banner. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminCMS (không public CMS).

**Source:** [ContentController.deleteBanner](../../backend/src/main/java/com/smartbox/backend/controller/ContentController.java) dòng 112; service: `backend/src/main/java/com/smartbox/backend/service/ContentService.java::deleteBanner`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<Map<String, Object>>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "success": true,
  "message": "Đã xóa banner thành công."
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Banner`. Các helper/service được gọi có thêm lỗi như rules.

### API-040 — PUT `/api/content/banners/{id}`

**Module/mục đích:** Chỉnh sửa thông tin banner. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminCMS (không public CMS).

**Source:** [ContentController.updateBanner](../../backend/src/main/java/com/smartbox/backend/controller/ContentController.java) dòng 98; service: `backend/src/main/java/com/smartbox/backend/service/ContentService.java::updateBanner`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** BannerRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `title` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `imageUrl` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `targetUrl` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `position` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `displayOrder` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `isActive` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `startDate` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `endDate` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "title": "<string>",
  "imageUrl": "<string>",
  "targetUrl": "<string>",
  "position": "<string>",
  "displayOrder": 1,
  "isActive": true,
  "startDate": "<string>",
  "endDate": "<string>"
}
```

**Preconditions/business:** Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<BannerResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "title": "<string>",
  "imageUrl": "<string>",
  "targetUrl": "<string>",
  "position": "<string>",
  "displayOrder": 1,
  "isActive": true,
  "clickCount": 1,
  "startDate": "<ISO-8601 timestamp>",
  "endDate": "<ISO-8601 timestamp>",
  "createdAt": "<ISO-8601 timestamp>",
  "updatedAt": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Banner`. Các helper/service được gọi có thêm lỗi như rules.

### API-041 — PATCH `/api/content/banners/{id}/toggle`

**Module/mục đích:** Bật/tắt trạng thái hiển thị của banner. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminCMS (không public CMS).

**Source:** [ContentController.toggleBannerStatus](../../backend/src/main/java/com/smartbox/backend/controller/ContentController.java) dòng 106; service: `backend/src/main/java/com/smartbox/backend/service/ContentService.java::toggleBannerStatus`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<BannerResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "title": "<string>",
  "imageUrl": "<string>",
  "targetUrl": "<string>",
  "position": "<string>",
  "displayOrder": 1,
  "isActive": true,
  "clickCount": 1,
  "startDate": "<ISO-8601 timestamp>",
  "endDate": "<ISO-8601 timestamp>",
  "createdAt": "<ISO-8601 timestamp>",
  "updatedAt": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Banner`. Các helper/service được gọi có thêm lỗi như rules.

### API-042 — GET `/api/content/faqs`

**Module/mục đích:** Lấy danh sách câu hỏi thường gặp FAQ. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminCMS (không public CMS).

**Source:** [ContentController.getAllFaqs](../../backend/src/main/java/com/smartbox/backend/controller/ContentController.java) dòng 164; service: `backend/src/main/java/com/smartbox/backend/service/ContentService.java::getAllFaqs`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `category` | query | string | required=False; Không khai báo trong schema; xem service/rules |
| `publishedOnly` | query | boolean | required=False; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** category=tùy chọn; publishedOnly=tùy chọn

**Success HTTP:** 200; response signature `ResponseEntity<List<FaqResponse>>`. Schema Springdoc:

```json
[
  {
    "id": "<UUID>",
    "question": "<string>",
    "answer": "<string>",
    "category": "<string>",
    "displayOrder": 1,
    "isPublished": true,
    "helpfulCount": 1,
    "createdAt": "<ISO-8601 timestamp>",
    "updatedAt": "<ISO-8601 timestamp>"
  }
]
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-043 — POST `/api/content/faqs`

**Module/mục đích:** Thêm câu hỏi FAQ mới. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminCMS (không public CMS).

**Source:** [ContentController.createFaq](../../backend/src/main/java/com/smartbox/backend/controller/ContentController.java) dòng 172; service: `backend/src/main/java/com/smartbox/backend/service/ContentService.java::createFaq`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** FaqRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `question` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `answer` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `category` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `displayOrder` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `isPublished` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "question": "<string>",
  "answer": "<string>",
  "category": "<string>",
  "displayOrder": 1,
  "isPublished": true
}
```

**Preconditions/business:** Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<FaqResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "question": "<string>",
  "answer": "<string>",
  "category": "<string>",
  "displayOrder": 1,
  "isPublished": true,
  "helpfulCount": 1,
  "createdAt": "<ISO-8601 timestamp>",
  "updatedAt": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-044 — DELETE `/api/content/faqs/{id}`

**Module/mục đích:** Xóa câu hỏi FAQ. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminCMS (không public CMS).

**Source:** [ContentController.deleteFaq](../../backend/src/main/java/com/smartbox/backend/controller/ContentController.java) dòng 192; service: `backend/src/main/java/com/smartbox/backend/service/ContentService.java::deleteFaq`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<Map<String, Object>>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "success": true,
  "message": "Đã xóa câu hỏi FAQ thành công."
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `FAQ`. Các helper/service được gọi có thêm lỗi như rules.

### API-045 — PUT `/api/content/faqs/{id}`

**Module/mục đích:** Chỉnh sửa câu hỏi FAQ. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminCMS (không public CMS).

**Source:** [ContentController.updateFaq](../../backend/src/main/java/com/smartbox/backend/controller/ContentController.java) dòng 178; service: `backend/src/main/java/com/smartbox/backend/service/ContentService.java::updateFaq`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** FaqRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `question` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `answer` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `category` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `displayOrder` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `isPublished` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "question": "<string>",
  "answer": "<string>",
  "category": "<string>",
  "displayOrder": 1,
  "isPublished": true
}
```

**Preconditions/business:** Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<FaqResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "question": "<string>",
  "answer": "<string>",
  "category": "<string>",
  "displayOrder": 1,
  "isPublished": true,
  "helpfulCount": 1,
  "createdAt": "<ISO-8601 timestamp>",
  "updatedAt": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `FAQ`. Các helper/service được gọi có thêm lỗi như rules.

### API-046 — PATCH `/api/content/faqs/{id}/toggle`

**Module/mục đích:** Bật/tắt hiển thị câu hỏi FAQ. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminCMS (không public CMS).

**Source:** [ContentController.toggleFaqStatus](../../backend/src/main/java/com/smartbox/backend/controller/ContentController.java) dòng 186; service: `backend/src/main/java/com/smartbox/backend/service/ContentService.java::toggleFaqStatus`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<FaqResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "question": "<string>",
  "answer": "<string>",
  "category": "<string>",
  "displayOrder": 1,
  "isPublished": true,
  "helpfulCount": 1,
  "createdAt": "<ISO-8601 timestamp>",
  "updatedAt": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `FAQ`. Các helper/service được gọi có thêm lỗi như rules.

### API-047 — GET `/api/content/reviews`

**Module/mục đích:** Lấy danh sách đánh giá sản phẩm của khách hàng. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminCMS (không public CMS).

**Source:** [ContentController.getAllReviews](../../backend/src/main/java/com/smartbox/backend/controller/ContentController.java) dòng 122; service: `backend/src/main/java/com/smartbox/backend/service/ContentService.java::getAllReviews`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `status` | query | string | required=False; Không khai báo trong schema; xem service/rules |
| `productId` | query | string(uuid) | required=False; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** status=tùy chọn

**Success HTTP:** 200; response signature `ResponseEntity<List<ProductReviewResponse>>`. Schema Springdoc:

```json
[
  {
    "id": "<UUID>",
    "productId": "<UUID>",
    "productName": "<string>",
    "customerName": "<string>",
    "customerEmail": "<string>",
    "customerPhone": "<string>",
    "rating": 1,
    "title": "<string>",
    "comment": "<string>",
    "images": [
      "<string>"
    ],
    "status": "<string>",
    "rejectReason": "<string>",
    "adminReply": "<string>",
    "adminRepliedAt": "<ISO-8601 timestamp>",
    "createdAt": "<ISO-8601 timestamp>"
  }
]
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-048 — GET `/api/content/reviews/paged`

**Module/mục đích:** Lấy danh sách đánh giá sản phẩm có phân trang dạng Map<String, Object>. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminCMS (không public CMS).

**Source:** [ContentController.getReviewsPaged](../../backend/src/main/java/com/smartbox/backend/controller/ContentController.java) dòng 130; service: `backend/src/main/java/com/smartbox/backend/service/ContentService.java::getReviewsPaged`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `page` | query | integer(int32) | required=False; default=0 |
| `size` | query | integer(int32) | required=False; default=10 |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** page=0; size=10

**Success HTTP:** 200; response signature `ResponseEntity<Map<String, Object>>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "content": [
    {
      "id": "<UUID>",
      "productId": "<UUID>",
      "productName": "<string>",
      "customerName": "<string>",
      "customerEmail": "<string>",
      "customerPhone": "<string>",
      "rating": 1,
      "title": "<string>",
      "comment": "<string>",
      "images": [
        "<string>"
      ],
      "status": "<string>",
      "rejectReason": "<string>",
      "adminReply": "<string>",
      "adminRepliedAt": "<ISO-8601 timestamp>",
      "createdAt": "<ISO-8601 timestamp>"
    }
  ],
  "currentPage": 0,
  "totalElements": 1,
  "totalPages": 1,
  "pageSize": 10,
  "numberOfElements": 1,
  "isFirst": true,
  "isLast": true,
  "hasNext": false,
  "hasPrevious": false
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-049 — DELETE `/api/content/reviews/{id}`

**Module/mục đích:** Xóa đánh giá khỏi hệ thống. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminCMS (không public CMS).

**Source:** [ContentController.deleteReview](../../backend/src/main/java/com/smartbox/backend/controller/ContentController.java) dòng 154; service: `backend/src/main/java/com/smartbox/backend/service/ContentService.java::deleteReview`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<Map<String, Object>>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "success": true,
  "message": "Đã xóa đánh giá thành công."
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Đánh giá`. Các helper/service được gọi có thêm lỗi như rules.

### API-050 — POST `/api/content/reviews/{id}/reply`

**Module/mục đích:** Admin gửi phản hồi chính thức cho đánh giá. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminCMS (không public CMS).

**Source:** [ContentController.replyReview](../../backend/src/main/java/com/smartbox/backend/controller/ContentController.java) dòng 146; service: `backend/src/main/java/com/smartbox/backend/service/ContentService.java::replyReview`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** ReviewReplyRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `adminReply` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "adminReply": "<string>"
}
```

**Preconditions/business:** Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<ProductReviewResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "productId": "<UUID>",
  "productName": "<string>",
  "customerName": "<string>",
  "customerEmail": "<string>",
  "customerPhone": "<string>",
  "rating": 1,
  "title": "<string>",
  "comment": "<string>",
  "images": [
    "<string>"
  ],
  "status": "<string>",
  "rejectReason": "<string>",
  "adminReply": "<string>",
  "adminRepliedAt": "<ISO-8601 timestamp>",
  "createdAt": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Đánh giá`. Các helper/service được gọi có thêm lỗi như rules.

### API-051 — PATCH `/api/content/reviews/{id}/status`

**Module/mục đích:** Cập nhật trạng thái duyệt/ẩn đánh giá. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminCMS (không public CMS).

**Source:** [ContentController.updateReviewStatus](../../backend/src/main/java/com/smartbox/backend/controller/ContentController.java) dòng 138; service: `backend/src/main/java/com/smartbox/backend/service/ContentService.java::updateReviewStatus`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** ReviewStatusUpdateRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `status` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `rejectReason` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "status": "<string>",
  "rejectReason": "<string>"
}
```

**Preconditions/business:** Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<ProductReviewResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "productId": "<UUID>",
  "productName": "<string>",
  "customerName": "<string>",
  "customerEmail": "<string>",
  "customerPhone": "<string>",
  "rating": 1,
  "title": "<string>",
  "comment": "<string>",
  "images": [
    "<string>"
  ],
  "status": "<string>",
  "rejectReason": "<string>",
  "adminReply": "<string>",
  "adminRepliedAt": "<ISO-8601 timestamp>",
  "createdAt": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Đánh giá`. Các helper/service được gọi có thêm lỗi như rules.

### API-052 — GET `/api/content/summary`

**Module/mục đích:** Lấy số liệu thống kê tổng quan CMS. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminCMS (không public CMS).

**Source:** [ContentController.getSummaryStats](../../backend/src/main/java/com/smartbox/backend/controller/ContentController.java) dòng 29; service: `backend/src/main/java/com/smartbox/backend/service/ContentService.java::getSummaryStats`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<ContentSummaryStatsResponse>`. Schema Springdoc:

```json
{
  "totalArticles": 1,
  "publishedArticles": 1,
  "totalBanners": 1,
  "activeBanners": 1,
  "totalReviews": 1,
  "pendingReviews": 1,
  "totalFaqs": 1
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-053 — GET `/api/dashboard/stats`

**Module/mục đích:** Lấy dữ liệu thống kê tổng quan Dashboard. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/accountant. **Màn hình:** AdminDashboard legacy.

**Source:** [DashboardController.getDashboardStats](../../backend/src/main/java/com/smartbox/backend/controller/DashboardController.java) dòng 23; service: `backend/src/main/java/com/smartbox/backend/service/DashboardService.java::getDashboardStats`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `range` | query | string | required=False; default=6m |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `getDashboardStats`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** range=6m

**Success HTTP:** 200; response signature `ResponseEntity<DashboardStatsResponse>`. Schema Springdoc:

```json
{
  "totalRevenue": 1,
  "revenueGrowth": 1,
  "totalOrders": 1,
  "ordersGrowth": 1,
  "activeDevices": 1,
  "totalDevices": 1,
  "pendingWarranties": 1,
  "monthlyRevenue": [
    {
      "month": "<string>",
      "label": "<string>",
      "revenue": 1,
      "orders": 1
    }
  ],
  "productSales": [
    {
      "id": "<string>",
      "name": "<string>",
      "sub": "<string>",
      "percent": 1,
      "revenue": 1,
      "color": "<string>"
    }
  ],
  "recentOrders": [
    {
      "id": "<UUID>",
      "userId": "<UUID>",
      "customerName": "<string>",
      "customerPhone": "<string>",
      "shippingAddress": "<string>",
      "trackingNumber": "<string>",
      "status": "<string>",
      "total": 1,
      "paymentMethod": "<string>",
      "paymentStatus": "<string>",
      "transactionRef": "<string>",
      "itemsSummary": "<string>",
      "createdAt": "<ISO-8601 timestamp>",
      "updatedAt": "<ISO-8601 timestamp>",
      "items": [
        "<nested>"
      ]
    }
  ]
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `BadRequestException`: `INVALID_DASHBOARD_RANGE`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `INVALID_DASHBOARD_RANGE` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-054 — GET `/api/devices`

**Module/mục đích:** Lấy danh sách tất cả thiết bị IoT. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/technician. **Màn hình:** AdminDevices.

**Source:** [DeviceController.getAllDevices](../../backend/src/main/java/com/smartbox/backend/controller/DeviceController.java) dòng 27; service: `backend/src/main/java/com/smartbox/backend/service/DeviceService.java::getAllDevices`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `getAllDevices`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<List<DeviceResponse>>`. Schema Springdoc:

```json
[
  {
    "id": "<UUID>",
    "productId": "<UUID>",
    "productName": "<string>",
    "ownerId": "<UUID>",
    "ownerName": "<string>",
    "ownerPhone": "<string>",
    "serialNumber": "<string>",
    "name": "<string>",
    "locationLabel": "<string>",
    "status": "<string>",
    "batteryLevel": 1,
    "firmwareVersion": "<string>",
    "lastSeenAt": "<ISO-8601 timestamp>",
    "createdAt": "<ISO-8601 timestamp>",
    "macAddress": "<string>",
    "chipModel": "<string>",
    "publicIp": "<string>",
    "localIp": "<string>",
    "geoCity": "<string>",
    "mapX": 1,
    "mapY": 1,
    "lockStatus": "<string>",
    "wifiRssi": 1,
    "pingMs": 1,
    "doorStatus": "<string>",
    "weightKg": 1,
    "packageDetected": true,
    "scaleReady": true,
    "deviceState": "<string>",
    "mqttTopicId": "<string>"
  }
]
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-055 — GET `/api/devices/events`

**Module/mục đích:** Lấy lịch sử sự kiện cảm biến telemetry. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/technician. **Màn hình:** AdminDevices.

**Source:** [DeviceController.getDeviceEvents](../../backend/src/main/java/com/smartbox/backend/controller/DeviceController.java) dòng 41; service: `backend/src/main/java/com/smartbox/backend/service/DeviceService.java::getDeviceEvents`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `deviceId` | query | string(uuid) | required=False; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `getDeviceEvents`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<List<DeviceEventResponse>>`. Schema Springdoc:

```json
[
  {
    "id": "<UUID>",
    "deviceId": "<UUID>",
    "deviceSerial": "<string>",
    "eventType": "<string>",
    "payload": "<string>",
    "createdAt": "<ISO-8601 timestamp>"
  }
]
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-056 — GET `/api/devices/paged`

**Module/mục đích:** Lấy danh sách thiết bị có phân trang dạng Map<String, Object>. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/technician. **Màn hình:** AdminDevices.

**Source:** [DeviceController.getDevicesPaged](../../backend/src/main/java/com/smartbox/backend/controller/DeviceController.java) dòng 33; service: `backend/src/main/java/com/smartbox/backend/service/DeviceService.java::getDevicesPaged`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `page` | query | integer(int32) | required=False; default=0 |
| `size` | query | integer(int32) | required=False; default=10 |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `getDevicesPaged`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** page=0; size=10

**Success HTTP:** 200; response signature `ResponseEntity<Map<String, Object>>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "content": [
    {
      "id": "<UUID>",
      "productId": "<UUID>",
      "productName": "<string>",
      "ownerId": "<UUID>",
      "ownerName": "<string>",
      "ownerPhone": "<string>",
      "serialNumber": "<string>",
      "name": "<string>",
      "locationLabel": "<string>",
      "status": "<string>",
      "batteryLevel": 1,
      "firmwareVersion": "<string>",
      "lastSeenAt": "<ISO-8601 timestamp>",
      "createdAt": "<ISO-8601 timestamp>",
      "macAddress": "<string>",
      "chipModel": "<string>",
      "publicIp": "<string>",
      "localIp": "<string>",
      "geoCity": "<string>",
      "mapX": 1,
      "mapY": 1,
      "lockStatus": "<string>",
      "wifiRssi": 1,
      "pingMs": 1,
      "doorStatus": "<string>",
      "weightKg": 1,
      "packageDetected": true,
      "scaleReady": true,
      "deviceState": "<string>",
      "mqttTopicId": "<string>"
    }
  ],
  "currentPage": 0,
  "totalElements": 1,
  "totalPages": 1,
  "pageSize": 10,
  "numberOfElements": 1,
  "isFirst": true,
  "isLast": true,
  "hasNext": false,
  "hasPrevious": false
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-057 — PATCH `/api/devices/{id}/status`

**Module/mục đích:** Cập nhật trạng thái thiết bị (online, offline, maintenance, error). **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/technician. **Màn hình:** AdminDevices.

**Source:** [DeviceController.updateDeviceStatus](../../backend/src/main/java/com/smartbox/backend/controller/DeviceController.java) dòng 48; service: `backend/src/main/java/com/smartbox/backend/service/DeviceService.java::updateDeviceStatus`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** DeviceStatusUpdateRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `status` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "status": "<string>"
}
```

**Preconditions/business:** Theo `updateDeviceStatus`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<DeviceResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "productId": "<UUID>",
  "productName": "<string>",
  "ownerId": "<UUID>",
  "ownerName": "<string>",
  "ownerPhone": "<string>",
  "serialNumber": "<string>",
  "name": "<string>",
  "locationLabel": "<string>",
  "status": "<string>",
  "batteryLevel": 1,
  "firmwareVersion": "<string>",
  "lastSeenAt": "<ISO-8601 timestamp>",
  "createdAt": "<ISO-8601 timestamp>",
  "macAddress": "<string>",
  "chipModel": "<string>",
  "publicIp": "<string>",
  "localIp": "<string>",
  "geoCity": "<string>",
  "mapX": 1,
  "mapY": 1,
  "lockStatus": "<string>",
  "wifiRssi": 1,
  "pingMs": 1,
  "doorStatus": "<string>",
  "weightKg": 1,
  "packageDetected": true,
  "scaleReady": true,
  "deviceState": "<string>",
  "mqttTopicId": "<string>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Thiết bị`. Các helper/service được gọi có thêm lỗi như rules.

### API-058 — GET `/api/devices/my-devices`

**Module/mục đích:** Đọc thiết bị thuộc owner. **Trạng thái:** IMPLEMENTED.

**Quyền:** Bearer + owner thiết bị. **Màn hình:** MyDevices.

**Source:** [DeviceWorkflowController.mine](../../backend/src/main/java/com/smartbox/backend/controller/DeviceWorkflowController.java) dòng 13; service: `backend/src/main/java/com/smartbox/backend/service/DeviceWorkflowService.java::myDevices`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `myDevices`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `List<Map<String,Object>>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
[
  {
    "id": "<UUID>",
    "serial_number": "<string>",
    "name": "<string>",
    "status": "<health>",
    "door_status": null,
    "lock_status": null,
    "weight_kg": null,
    "package_detected": null,
    "last_seen_at": null,
    "activated_at": null
  }
]
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `Yêu cầu đăng nhập` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-059 — POST `/api/devices/register`

**Module/mục đích:** Đăng ký thiết bị với variant và MQTTtopic. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/technician. **Màn hình:** AdminDeviceRegistration.

**Source:** [DeviceWorkflowController.register](../../backend/src/main/java/com/smartbox/backend/controller/DeviceWorkflowController.java) dòng 12; service: `backend/src/main/java/com/smartbox/backend/service/DeviceWorkflowService.java::register`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** Registration; controller @Valid = True.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `serialNumber` | string | Có | maxLength=100, minLength=0 |
| `variantId` | string(uuid) | Có | Không khai báo trong schema; xem service/rules |
| `mqttTopicId` | string | Có | pattern=[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)+ |
| `name` | string | Không khai báo @NotNull trong schema | maxLength=100, minLength=0 |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "serialNumber": "<string>",
  "variantId": "<UUID>",
  "mqttTopicId": "<string>",
  "name": "<string>"
}
```

**Preconditions/business:** super_admin/technician; variant tồn tại; serial và mqttTopicId theo RegistrationDTO, unique ở DB. Service hiện không kiểm tra mqttTopicId cùng prefix subscription: cần chốt cấu hình/topic ở backend.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: devices.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "deviceId": "<UUID>",
  "serialNumber": "<serial>"
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `Yêu cầu đăng nhập` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `devices`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-060 — POST `/api/devices/{id}/activate`

**Module/mục đích:** Owner kích hoạt thiết bị đã giao. **Trạng thái:** IMPLEMENTED.

**Quyền:** Bearer + owner thiết bị. **Màn hình:** MyDevices.

**Source:** [DeviceWorkflowController.activate](../../backend/src/main/java/com/smartbox/backend/controller/DeviceWorkflowController.java) dòng 14; service: `backend/src/main/java/com/smartbox/backend/service/DeviceWorkflowService.java::activate`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Owner, sold_order_item_id có order completed. activated_at COALESCE nên lặp an toàn. Chưa chờ nghiệm thu installation.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: devices.

**Idempotency:** Có guard terminal trong service. Khi timeout đọc lại trạng thái trước retry; không suy diễn mọi tham số khác vẫn được chấp nhận. Xem literal lỗi và source bên dưới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "activated": true
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ConflictException`: `DEVICE_SALE_NOT_LINKED`; `ConflictException`: `DEVICE_NOT_DELIVERED`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `Yêu cầu đăng nhập` |
| 409 | `DEVICE_NOT_DELIVERED` |
| 409 | `DEVICE_SALE_NOT_LINKED` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `devices`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-061 — POST `/api/devices/{id}/commands`

**Module/mục đích:** Tạo lệnh điều khiển; chưa xác nhận hành động vật lý. **Trạng thái:** IMPLEMENTED.

**Quyền:** Bearer + owner thiết bị. **Màn hình:** DeviceControl.

**Source:** [DeviceWorkflowController.command](../../backend/src/main/java/com/smartbox/backend/controller/DeviceWorkflowController.java) dòng 15; service: `backend/src/main/java/com/smartbox/backend/service/DeviceWorkflowService.java::command`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Control; controller @Valid = True.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `command` | string | Có | pattern=LOCK\|UNLOCK\|TARE |
| `requestKey` | string(uuid) | Có | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "command": "LOCK",
  "requestKey": "<UUID>"
}
```

**Preconditions/business:** Owner; MQTT enabled, activated và online; TARE cần has_weight_sensor. Key request UUID idempotent cùng command; max20/min/device. Trả PENDING không phải đã mở khóa. GET command trả ACK/timeout.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: device_commands.

**Idempotency:** requestKey UUID cùng command/device được dùng lại; khác command bị409. Response lần dùng lại có id thay commandId; xem Map contract.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "commandId": "<UUID>",
  "status": "PENDING"
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `AppException`: `MQTT_NOT_CONFIGURED`; `ConflictException`: `DEVICE_NOT_ACTIVATED`; `ConflictException`: `DEVICE_OFFLINE`; `BadRequestException`: `WEIGHT_SENSOR_NOT_SUPPORTED`; `ConflictException`: `COMMAND_KEY_REUSED`; `AppException`: `DEVICE_COMMAND_RATE_LIMITED`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `WEIGHT_SENSOR_NOT_SUPPORTED` |
| 401 | `Yêu cầu đăng nhập` |
| 409 | `COMMAND_KEY_REUSED` |
| 409 | `DEVICE_NOT_ACTIVATED` |
| 409 | `DEVICE_OFFLINE` |
| 429 | `DEVICE_COMMAND_RATE_LIMITED` |
| 503 | `MQTT_NOT_CONFIGURED` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `audit_logs`, `device_commands`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.

**Response biến thể khi dùng lại requestKey:** raw row có `id`, không luôn có `commandId`; xem Map contract và adapter trong11.
### API-062 — GET `/api/devices/{id}/commands/{commandId}`

**Module/mục đích:** Đọc trạng thái xử lý command của owner. **Trạng thái:** IMPLEMENTED.

**Quyền:** Bearer + owner thiết bị. **Màn hình:** DeviceControl / CommandPolling.

**Source:** [DeviceWorkflowController.command](../../backend/src/main/java/com/smartbox/backend/controller/DeviceWorkflowController.java) dòng 16; service: `backend/src/main/java/com/smartbox/backend/service/DeviceWorkflowService.java::command`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |
| `commandId` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Owner đúng thiết bị và commandId thuộc thiết bị. GET chỉ đọc, không yêu cầu MQTT bật/online/activated như POST command.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "id": "<UUID>",
  "status": "<PENDING|SENT|ACKNOWLEDGED|FAILED|TIMED_OUT|LEGACY>",
  "attempts": 0,
  "last_error": null,
  "ack_at": null
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `AppException`: `MQTT_NOT_CONFIGURED`; `ConflictException`: `DEVICE_NOT_ACTIVATED`; `ConflictException`: `DEVICE_OFFLINE`; `BadRequestException`: `WEIGHT_SENSOR_NOT_SUPPORTED`; `ConflictException`: `COMMAND_KEY_REUSED`; `AppException`: `DEVICE_COMMAND_RATE_LIMITED`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `Yêu cầu đăng nhập` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-063 — GET `/api/devices/{id}/packages`

**Module/mục đích:** Đọc bưu kiện thiết bị đã nhận. **Trạng thái:** IMPLEMENTED.

**Quyền:** Bearer + owner thiết bị. **Màn hình:** DevicePackageHistory.

**Source:** [DeviceWorkflowController.packages](../../backend/src/main/java/com/smartbox/backend/controller/DeviceWorkflowController.java) dòng 17; service: `backend/src/main/java/com/smartbox/backend/service/DeviceWorkflowService.java::packages`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |
| `page` | query | integer(int32) | required=False; default=0 |
| `size` | query | integer(int32) | required=False; default=20 |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `packages`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** page=0; size=20

**Success HTTP:** 200; response signature `List<Map<String,Object>>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
[
  {
    "id": "<UUID>",
    "device_id": "<UUID>",
    "weight_kg": null,
    "detected_at": "<ISO8601 timestamp>",
    "collected_at": null,
    "status": "DELIVERED"
  }
]
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `VALIDATION_ERROR` |
| 401 | `Yêu cầu đăng nhập` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-064 — GET `/api/devices/{id}/readings`

**Module/mục đích:** Đọc dữ liệu cảm biến theo thời gian. **Trạng thái:** IMPLEMENTED.

**Quyền:** Bearer + owner thiết bị. **Màn hình:** DeviceReadings.

**Source:** [DeviceWorkflowController.readings](../../backend/src/main/java/com/smartbox/backend/controller/DeviceWorkflowController.java) dòng 18; service: `backend/src/main/java/com/smartbox/backend/service/DeviceWorkflowService.java::readings`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |
| `page` | query | integer(int32) | required=False; default=0 |
| `size` | query | integer(int32) | required=False; default=20 |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `readings`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** page=0; size=20

**Success HTTP:** 200; response signature `List<Map<String,Object>>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
[
  {
    "id": "<UUID>",
    "device_id": "<UUID>",
    "weight_kg": null,
    "distance_cm": null,
    "door_status": null,
    "payload": "<JSONB representation; cần xác minh serializer PostgreSQL>",
    "received_at": "<ISO8601 timestamp>"
  }
]
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `VALIDATION_ERROR` |
| 401 | `Yêu cầu đăng nhập` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-065 — GET `/mock-payment/payments/{id}`

**Module/mục đích:** MockPayment / detail. **Trạng thái:** IMPLEMENTED (profile demo).

**Quyền:** Bearer + chủ đơn; chỉ profile demo. **Màn hình:** DemoPayment (không production).

**Source:** [MockPaymentController.detail](../../backend/src/main/java/com/smartbox/backend/controller/MockPaymentController.java) dòng 27; service: `backend/src/main/java/com/smartbox/backend/service/OrderWorkflowService.java::owned`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Chỉ profile demo; chính owner gọi mock result. detail SQL row không phải Payment result từ gateway thật.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "id": "<UUID>",
  "order_id": "<UUID>",
  "amount": 0,
  "status": "pending",
  "provider": "mock",
  "transaction_ref": null,
  "paid_at": null,
  "expires_at": "<ISO8601 timestamp>",
  "created_at": "<ISO8601 timestamp>"
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

**Demo:** không đưa flow tự chọn SUCCESS vào frontend production.

### API-066 — POST `/mock-payment/payments/{id}/complete`

**Module/mục đích:** MockPayment / complete. **Trạng thái:** IMPLEMENTED (profile demo).

**Quyền:** Bearer + chủ đơn; chỉ profile demo. **Màn hình:** DemoPayment (không production).

**Source:** [MockPaymentController.complete](../../backend/src/main/java/com/smartbox/backend/controller/MockPaymentController.java) dòng 35; service: `backend/src/main/java/com/smartbox/backend/service/PaymentService.java::callback`; `backend/src/main/java/com/smartbox/backend/service/PaymentService.java::sign`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |
| `result` | query | string | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Chỉ profile demo; chính owner gọi mock result. detail SQL row không phải Payment result từ gateway thật.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: approval_tickets, orders, payments, ticket_history.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "acknowledged": true
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `UnauthorizedException`: `INVALID_SIGNATURE`; `BadRequestException`: `INVALID_PAYMENT_RESULT`; `BadRequestException`: `PAYMENT_ORDER_MISMATCH`; `BadRequestException`: `AMOUNT_MISMATCH`; `IllegalStateException`: `DEMO_FAIL_AFTER_PAID`; `ConflictException`: `PAYMENT_ORDER_STATE_MISMATCH`; `AppException`: `PAYMENT_NOT_CONFIGURED`. Các helper/service được gọi có thêm lỗi như rules.

**Demo:** không đưa flow tự chọn SUCCESS vào frontend production.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `AMOUNT_MISMATCH` |
| 400 | `INVALID_PAYMENT_RESULT` |
| 400 | `PAYMENT_ORDER_MISMATCH` |
| 401 | `INVALID_SIGNATURE` |
| 401 | `Yêu cầu đăng nhập` |
| 409 | `INSUFFICIENT_STOCK: Không đủ tồn kho cho SKU ` |
| 409 | `INVALID_ORDER_TRANSITION: ` |
| 409 | `LEGACY_ORDER_REVIEW_REQUIRED: Đơn cũ chưa xác minh giữ kho/thanh toán` |
| 409 | `PAYMENT_ORDER_STATE_MISMATCH` |
| 503 | `PAYMENT_NOT_CONFIGURED` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `approval_tickets`, `audit_logs`, `email_outbox`, `inventory_movements`, `order_status_history`, `orders`, `payments`, `product_variants`, `refunds`, `ticket_history`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-067 — GET `/api/notifications`

**Module/mục đích:** Đọc thông báo của actor. **Trạng thái:** IMPLEMENTED.

**Quyền:** Bearer + dữ liệu principal. **Màn hình:** NotificationCenter.

**Source:** [NotificationController.list](../../backend/src/main/java/com/smartbox/backend/controller/NotificationController.java) dòng 16; service: `backend/src/main/java/com/smartbox/backend/service/PushNotificationService.java::list`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `page` | query | integer(int32) | required=False; default=0 |
| `size` | query | integer(int32) | required=False; default=20 |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `list`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** page=0; size=20

**Success HTTP:** 200; response signature `List<Map<String,Object>>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
[
  {
    "id": "<UUID>",
    "user_id": "<UUID>",
    "device_id": "<UUID>",
    "type": "PACKAGE_DETECTED",
    "title": "<string>",
    "body": null,
    "is_read": false,
    "created_at": "<ISO8601 timestamp>"
  }
]
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `BadRequestException`: `VALIDATION_ERROR`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `VALIDATION_ERROR` |
| 401 | `Yêu cầu đăng nhập` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-068 — PUT `/api/notifications/preferences/{event}`

**Module/mục đích:** Bật/tắt sự kiện PACKAGE_DETECTED. **Trạng thái:** IMPLEMENTED.

**Quyền:** Bearer + dữ liệu principal. **Màn hình:** NotificationPreferences.

**Source:** [NotificationController.preference](../../backend/src/main/java/com/smartbox/backend/controller/NotificationController.java) dòng 18; service: `backend/src/main/java/com/smartbox/backend/service/PushNotificationService.java::preference`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `event` | path | string | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Preference; controller @Valid = True.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `enabled` | boolean | Có | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "enabled": true
}
```

**Preconditions/business:** Theo `preference`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: notification_preferences.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `void`. Schema Springdoc:

Không có body. Không gọi res.json() vô điều kiện.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `BadRequestException`: `INVALID_NOTIFICATION_EVENT`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `INVALID_NOTIFICATION_EVENT` |
| 401 | `Yêu cầu đăng nhập` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `notification_preferences`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-069 — POST `/api/notifications/tokens`

**Module/mục đích:** Đăng ký push token của actor. **Trạng thái:** IMPLEMENTED.

**Quyền:** Bearer + dữ liệu principal. **Màn hình:** NotificationPreferences.

**Source:** [NotificationController.register](../../backend/src/main/java/com/smartbox/backend/controller/NotificationController.java) dòng 14; service: `backend/src/main/java/com/smartbox/backend/service/PushNotificationService.java::register`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** Token; controller @Valid = True.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `token` | string | Có | maxLength=4096, minLength=0 |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "token": "<string>"
}
```

**Preconditions/business:** Theo `register`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: push_tokens.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "id": "<UUID>"
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `BadRequestException`: `INVALID_PUSH_TOKEN`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `INVALID_PUSH_TOKEN` |
| 401 | `Yêu cầu đăng nhập` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `push_tokens`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-070 — DELETE `/api/notifications/tokens/{id}`

**Module/mục đích:** Xóa push token thuộc actor. **Trạng thái:** IMPLEMENTED.

**Quyền:** Bearer + dữ liệu principal. **Màn hình:** NotificationPreferences.

**Source:** [NotificationController.remove](../../backend/src/main/java/com/smartbox/backend/controller/NotificationController.java) dòng 15; service: `backend/src/main/java/com/smartbox/backend/service/PushNotificationService.java::remove`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `remove`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: push_tokens.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `void`. Schema Springdoc:

Không có body. Không gọi res.json() vô điều kiện.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `Yêu cầu đăng nhập` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `push_tokens`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-071 — PATCH `/api/notifications/{id}/read`

**Module/mục đích:** Đánh dấu thông báo đã đọc. **Trạng thái:** IMPLEMENTED.

**Quyền:** Bearer + dữ liệu principal. **Màn hình:** NotificationCenter.

**Source:** [NotificationController.read](../../backend/src/main/java/com/smartbox/backend/controller/NotificationController.java) dòng 17; service: `backend/src/main/java/com/smartbox/backend/service/PushNotificationService.java::read`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `read`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Các bảng ghi trực tiếp tìm thấy trong service handler: notifications.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `void`. Schema Springdoc:

Không có body. Không gọi res.json() vô điều kiện.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Thông báo`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `Yêu cầu đăng nhập` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `notifications`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-072 — GET `/api/orders`

**Module/mục đích:** Lấy danh sách tất cả đơn hàng. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/support_agent/accountant. **Màn hình:** AdminOrders.

**Source:** [OrderController.getOrders](../../backend/src/main/java/com/smartbox/backend/controller/OrderController.java) dòng 27; service: `backend/src/main/java/com/smartbox/backend/service/OrderService.java::getOrders`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `getOrders`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<List<OrderResponse>>`. Schema Springdoc:

```json
[
  {
    "id": "<UUID>",
    "userId": "<UUID>",
    "customerName": "<string>",
    "customerPhone": "<string>",
    "shippingAddress": "<string>",
    "trackingNumber": "<string>",
    "status": "<string>",
    "total": 1,
    "paymentMethod": "<string>",
    "paymentStatus": "<string>",
    "transactionRef": "<string>",
    "itemsSummary": "<string>",
    "createdAt": "<ISO-8601 timestamp>",
    "updatedAt": "<ISO-8601 timestamp>",
    "items": [
      {
        "id": "<nested>",
        "productId": "<nested>",
        "variantId": "<nested>",
        "sku": "<nested>",
        "variantName": "<nested>",
        "subtotal": "<nested>",
        "productName": "<nested>",
        "quantity": "<nested>",
        "unitPrice": "<nested>"
      }
    ]
  }
]
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-073 — GET `/api/orders/paged`

**Module/mục đích:** Lấy danh sách đơn hàng có phân trang dạng Map<String, Object>. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/support_agent/accountant. **Màn hình:** AdminOrders.

**Source:** [OrderController.getOrdersPaged](../../backend/src/main/java/com/smartbox/backend/controller/OrderController.java) dòng 33; service: `backend/src/main/java/com/smartbox/backend/service/OrderService.java::getOrdersPaged`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `page` | query | integer(int32) | required=False; default=0 |
| `size` | query | integer(int32) | required=False; default=10 |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `getOrdersPaged`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** page=0; size=10

**Success HTTP:** 200; response signature `ResponseEntity<Map<String, Object>>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "content": [
    {
      "id": "<UUID>",
      "userId": "<UUID>",
      "customerName": "<string>",
      "customerPhone": "<string>",
      "shippingAddress": "<string>",
      "trackingNumber": "<string>",
      "status": "<string>",
      "total": 1,
      "paymentMethod": "<string>",
      "paymentStatus": "<string>",
      "transactionRef": "<string>",
      "itemsSummary": "<string>",
      "createdAt": "<ISO-8601 timestamp>",
      "updatedAt": "<ISO-8601 timestamp>",
      "items": [
        {
          "id": "<UUID>",
          "productId": "<UUID>",
          "variantId": "<UUID>",
          "sku": "<string>",
          "variantName": "<string>",
          "subtotal": 1,
          "productName": "<string>",
          "quantity": 1,
          "unitPrice": 1
        }
      ]
    }
  ],
  "currentPage": 0,
  "totalElements": 1,
  "totalPages": 1,
  "pageSize": 10,
  "numberOfElements": 1,
  "isFirst": true,
  "isLast": true,
  "hasNext": false,
  "hasPrevious": false
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-074 — PATCH `/api/orders/{id}/status`

**Module/mục đích:** Cập nhật trạng thái đơn hàng. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/support_agent. **Màn hình:** AdminOrders.

**Source:** [OrderController.updateOrderStatus](../../backend/src/main/java/com/smartbox/backend/controller/OrderController.java) dòng 41; service: `backend/src/main/java/com/smartbox/backend/service/OrderService.java::updateOrderStatus`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** OrderStatusUpdateRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `status` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "status": "<string>"
}
```

**Preconditions/business:** Theo `updateOrderStatus`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<OrderResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "userId": "<UUID>",
  "customerName": "<string>",
  "customerPhone": "<string>",
  "shippingAddress": "<string>",
  "trackingNumber": "<string>",
  "status": "<string>",
  "total": 1,
  "paymentMethod": "<string>",
  "paymentStatus": "<string>",
  "transactionRef": "<string>",
  "itemsSummary": "<string>",
  "createdAt": "<ISO-8601 timestamp>",
  "updatedAt": "<ISO-8601 timestamp>",
  "items": [
    {
      "id": "<UUID>",
      "productId": "<UUID>",
      "variantId": "<UUID>",
      "sku": "<string>",
      "variantName": "<string>",
      "subtotal": 1,
      "productName": "<string>",
      "quantity": 1,
      "unitPrice": 1
    }
  ]
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `Yêu cầu đăng nhập` |
| 409 | `INSUFFICIENT_STOCK: Không đủ tồn kho cho SKU ` |
| 409 | `INVALID_ORDER_TRANSITION: ` |
| 409 | `LEGACY_ORDER_REVIEW_REQUIRED: Đơn cũ chưa xác minh giữ kho/thanh toán` |
| 409 | `ORDER_ALREADY_SHIPPED` |
| 409 | `PAID_ORDER_REQUIRES_STAFF_CANCELLATION` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `approval_tickets`, `audit_logs`, `devices`, `email_outbox`, `inventory_movements`, `order_status_history`, `orders`, `payments`, `product_variants`, `refunds`, `ticket_history`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-075 — PATCH `/api/orders/{id}/tracking`

**Module/mục đích:** Cập nhật mã vận đơn. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/support_agent. **Màn hình:** AdminOrders.

**Source:** [OrderController.updateTrackingNumber](../../backend/src/main/java/com/smartbox/backend/controller/OrderController.java) dòng 49; service: `backend/src/main/java/com/smartbox/backend/service/OrderService.java::updateTrackingNumber`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** TrackingUpdateRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `trackingNumber` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "trackingNumber": "<string>"
}
```

**Preconditions/business:** Theo `updateTrackingNumber`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<OrderResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "userId": "<UUID>",
  "customerName": "<string>",
  "customerPhone": "<string>",
  "shippingAddress": "<string>",
  "trackingNumber": "<string>",
  "status": "<string>",
  "total": 1,
  "paymentMethod": "<string>",
  "paymentStatus": "<string>",
  "transactionRef": "<string>",
  "itemsSummary": "<string>",
  "createdAt": "<ISO-8601 timestamp>",
  "updatedAt": "<ISO-8601 timestamp>",
  "items": [
    {
      "id": "<UUID>",
      "productId": "<UUID>",
      "variantId": "<UUID>",
      "sku": "<string>",
      "variantName": "<string>",
      "subtotal": 1,
      "productName": "<string>",
      "quantity": 1,
      "unitPrice": 1
    }
  ]
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `INVALID_TRACKING_NUMBER` |
| 401 | `Yêu cầu đăng nhập` |
| 409 | `LEGACY_ORDER_REVIEW_REQUIRED: Đơn cũ chưa xác minh giữ kho/thanh toán` |
| 409 | `SHIPMENT_ALREADY_DELIVERED` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).

**Side effects qua helper/service:** `orders`, `shipment_history`, `shipments`. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.
### API-076 — GET `/api/products`

**Module/mục đích:** Lấy danh sách tất cả sản phẩm. **Trạng thái:** IMPLEMENTED.

**Quyền:** Public. **Màn hình:** Catalog/ProductDetail/AdminProducts.

**Source:** [ProductController.getAllProducts](../../backend/src/main/java/com/smartbox/backend/controller/ProductController.java) dòng 34; service: `backend/src/main/java/com/smartbox/backend/service/ProductService.java::getAllProducts`.

**Authentication/headers:** Không cần Bearer. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Public list vẫn có thể chứa inactive; lọc isActive/variant.isActive. ProductResponse chưa expose hasWeightSensor. SKU stock dùng variant, không product.stockQuantity; update cần ID variant cũ, delete soft deactivate.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<List<ProductResponse>>`. Schema Springdoc:

```json
[
  {
    "id": "<UUID>",
    "categoryId": "<UUID>",
    "categoryName": "<string>",
    "sku": "<string>",
    "name": "<string>",
    "description": "<string>",
    "price": 1,
    "images": [
      "<string>"
    ],
    "stockQuantity": 1,
    "isActive": true,
    "createdAt": "<ISO-8601 timestamp>",
    "variants": [
      {
        "id": "<nested>",
        "productId": "<nested>",
        "variantName": "<nested>",
        "sku": "<nested>",
        "priceDelta": "<nested>",
        "calculatedPrice": "<nested>",
        "stockQuantity": "<nested>",
        "isActive": "<nested>",
        "size": "<nested>",
        "capacityLiter": "<nested>"
      }
    ]
  }
]
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-077 — POST `/api/products`

**Module/mục đích:** Tạo mới sản phẩm. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** Catalog/ProductDetail/AdminProducts.

**Source:** [ProductController.createProduct](../../backend/src/main/java/com/smartbox/backend/controller/ProductController.java) dòng 54; service: `backend/src/main/java/com/smartbox/backend/service/ProductService.java::createProduct`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** ProductRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `categoryId` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `sku` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `name` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `description` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `price` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `images` | array<string> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `stockQuantity` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `isActive` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `hasWeightSensor` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `variants` | array<ProductVariantRequest> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "categoryId": "<UUID>",
  "sku": "<string>",
  "name": "<string>",
  "description": "<string>",
  "price": 1,
  "images": [
    "<string>"
  ],
  "stockQuantity": 1,
  "isActive": true,
  "hasWeightSensor": true,
  "variants": [
    {
      "id": "<UUID>",
      "variantName": "<string>",
      "sku": "<string>",
      "priceDelta": 1,
      "stockQuantity": 1,
      "isActive": true,
      "size": "<string>",
      "capacityLiter": 1
    }
  ]
}
```

**Preconditions/business:** Public list vẫn có thể chứa inactive; lọc isActive/variant.isActive. ProductResponse chưa expose hasWeightSensor. SKU stock dùng variant, không product.stockQuantity; update cần ID variant cũ, delete soft deactivate.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<ProductResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "categoryId": "<UUID>",
  "categoryName": "<string>",
  "sku": "<string>",
  "name": "<string>",
  "description": "<string>",
  "price": 1,
  "images": [
    "<string>"
  ],
  "stockQuantity": 1,
  "isActive": true,
  "createdAt": "<ISO-8601 timestamp>",
  "variants": [
    {
      "id": "<UUID>",
      "productId": "<UUID>",
      "variantName": "<string>",
      "sku": "<string>",
      "priceDelta": 1,
      "calculatedPrice": 1,
      "stockQuantity": 1,
      "isActive": true,
      "size": "<string>",
      "capacityLiter": 1
    }
  ]
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-078 — GET `/api/products/categories`

**Module/mục đích:** Lấy danh sách danh mục sản phẩm. **Trạng thái:** IMPLEMENTED.

**Quyền:** Public. **Màn hình:** Catalog/ProductDetail/AdminProducts.

**Source:** [ProductController.getCategories](../../backend/src/main/java/com/smartbox/backend/controller/ProductController.java) dòng 48; service: `backend/src/main/java/com/smartbox/backend/service/ProductService.java::getAllCategories`.

**Authentication/headers:** Không cần Bearer. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Public list vẫn có thể chứa inactive; lọc isActive/variant.isActive. ProductResponse chưa expose hasWeightSensor. SKU stock dùng variant, không product.stockQuantity; update cần ID variant cũ, delete soft deactivate.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<List<ProductCategory>>`. Schema Springdoc:

```json
[
  {
    "id": "<UUID>",
    "name": "<string>",
    "slug": "<string>"
  }
]
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-079 — GET `/api/products/paged`

**Module/mục đích:** Lấy danh sách sản phẩm có phân trang dạng Map<String, Object>. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager/support_agent/accountant. **Màn hình:** Catalog/ProductDetail/AdminProducts.

**Source:** [ProductController.getProductsPaged](../../backend/src/main/java/com/smartbox/backend/controller/ProductController.java) dòng 40; service: `backend/src/main/java/com/smartbox/backend/service/ProductService.java::getProductsPaged`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `page` | query | integer(int32) | required=False; default=0 |
| `size` | query | integer(int32) | required=False; default=10 |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Public list vẫn có thể chứa inactive; lọc isActive/variant.isActive. ProductResponse chưa expose hasWeightSensor. SKU stock dùng variant, không product.stockQuantity; update cần ID variant cũ, delete soft deactivate.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** page=0; size=10

**Success HTTP:** 200; response signature `ResponseEntity<Map<String, Object>>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "content": [
    {
      "id": "<UUID>",
      "categoryId": "<UUID>",
      "categoryName": "<string>",
      "sku": "<string>",
      "name": "<string>",
      "description": "<string>",
      "price": 1,
      "images": [
        "<string>"
      ],
      "stockQuantity": 1,
      "isActive": true,
      "createdAt": "<ISO-8601 timestamp>",
      "variants": [
        {
          "id": "<UUID>",
          "productId": "<UUID>",
          "variantName": "<string>",
          "sku": "<string>",
          "priceDelta": 1,
          "calculatedPrice": 1,
          "stockQuantity": 1,
          "isActive": true,
          "size": "<string>",
          "capacityLiter": 1
        }
      ]
    }
  ],
  "currentPage": 0,
  "totalElements": 1,
  "totalPages": 1,
  "pageSize": 10,
  "numberOfElements": 1,
  "isFirst": true,
  "isLast": true,
  "hasNext": false,
  "hasPrevious": false
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-080 — DELETE `/api/products/{id}`

**Module/mục đích:** Xóa sản phẩm theo ID. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** Catalog/ProductDetail/AdminProducts.

**Source:** [ProductController.deleteProduct](../../backend/src/main/java/com/smartbox/backend/controller/ProductController.java) dòng 68; service: `backend/src/main/java/com/smartbox/backend/service/ProductService.java::deleteProduct`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Public list vẫn có thể chứa inactive; lọc isActive/variant.isActive. ProductResponse chưa expose hasWeightSensor. SKU stock dùng variant, không product.stockQuantity; update cần ID variant cũ, delete soft deactivate.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 204; response signature `ResponseEntity<Void>`. Schema Springdoc:

```json
{"note":"Không có response body (void/204), hoặc file nhị phân đối với export"}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Sản phẩm`. Các helper/service được gọi có thêm lỗi như rules.

### API-081 — PUT `/api/products/{id}`

**Module/mục đích:** Cập nhật thông tin sản phẩm. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** Catalog/ProductDetail/AdminProducts.

**Source:** [ProductController.updateProduct](../../backend/src/main/java/com/smartbox/backend/controller/ProductController.java) dòng 60; service: `backend/src/main/java/com/smartbox/backend/service/ProductService.java::updateProduct`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** ProductRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `categoryId` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `sku` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `name` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `description` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `price` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `images` | array<string> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `stockQuantity` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `isActive` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `hasWeightSensor` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `variants` | array<ProductVariantRequest> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "categoryId": "<UUID>",
  "sku": "<string>",
  "name": "<string>",
  "description": "<string>",
  "price": 1,
  "images": [
    "<string>"
  ],
  "stockQuantity": 1,
  "isActive": true,
  "hasWeightSensor": true,
  "variants": [
    {
      "id": "<UUID>",
      "variantName": "<string>",
      "sku": "<string>",
      "priceDelta": 1,
      "stockQuantity": 1,
      "isActive": true,
      "size": "<string>",
      "capacityLiter": 1
    }
  ]
}
```

**Preconditions/business:** Public list vẫn có thể chứa inactive; lọc isActive/variant.isActive. ProductResponse chưa expose hasWeightSensor. SKU stock dùng variant, không product.stockQuantity; update cần ID variant cũ, delete soft deactivate.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<ProductResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "categoryId": "<UUID>",
  "categoryName": "<string>",
  "sku": "<string>",
  "name": "<string>",
  "description": "<string>",
  "price": 1,
  "images": [
    "<string>"
  ],
  "stockQuantity": 1,
  "isActive": true,
  "createdAt": "<ISO-8601 timestamp>",
  "variants": [
    {
      "id": "<UUID>",
      "productId": "<UUID>",
      "variantName": "<string>",
      "sku": "<string>",
      "priceDelta": 1,
      "calculatedPrice": 1,
      "stockQuantity": 1,
      "isActive": true,
      "size": "<string>",
      "capacityLiter": 1
    }
  ]
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Sản phẩm`; `ResourceNotFoundException`: `Biến thể`. Các helper/service được gọi có thêm lỗi như rules.

### API-082 — PATCH `/api/products/{id}/stock`

**Module/mục đích:** Điều chỉnh số lượng tồn kho (+1, -1, +10). **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** Catalog/ProductDetail/AdminProducts.

**Source:** [ProductController.adjustStock](../../backend/src/main/java/com/smartbox/backend/controller/ProductController.java) dòng 75; service: `backend/src/main/java/com/smartbox/backend/service/ProductService.java::adjustStock`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** StockAdjustRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `delta` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "delta": 1
}
```

**Preconditions/business:** Public list vẫn có thể chứa inactive; lọc isActive/variant.isActive. ProductResponse chưa expose hasWeightSensor. SKU stock dùng variant, không product.stockQuantity; update cần ID variant cũ, delete soft deactivate.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<ProductResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "categoryId": "<UUID>",
  "categoryName": "<string>",
  "sku": "<string>",
  "name": "<string>",
  "description": "<string>",
  "price": 1,
  "images": [
    "<string>"
  ],
  "stockQuantity": 1,
  "isActive": true,
  "createdAt": "<ISO-8601 timestamp>",
  "variants": [
    {
      "id": "<UUID>",
      "productId": "<UUID>",
      "variantName": "<string>",
      "sku": "<string>",
      "priceDelta": 1,
      "calculatedPrice": 1,
      "stockQuantity": 1,
      "isActive": true,
      "size": "<string>",
      "capacityLiter": 1
    }
  ]
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Sản phẩm`. Các helper/service được gọi có thêm lỗi như rules.

### API-083 — GET `/api/products/{id}/variants`

**Module/mục đích:** Lấy danh sách các biến thể kích cỡ (Size S/M/L) của sản phẩm. **Trạng thái:** IMPLEMENTED.

**Quyền:** Public. **Màn hình:** Catalog/ProductDetail/AdminProducts.

**Source:** [ProductController.getProductVariants](../../backend/src/main/java/com/smartbox/backend/controller/ProductController.java) dòng 83; service: `backend/src/main/java/com/smartbox/backend/service/ProductService.java::getVariantsByProductId`.

**Authentication/headers:** Không cần Bearer. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Public list vẫn có thể chứa inactive; lọc isActive/variant.isActive. ProductResponse chưa expose hasWeightSensor. SKU stock dùng variant, không product.stockQuantity; update cần ID variant cũ, delete soft deactivate.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<List<com.smartbox.backend.dto.response.ProductVariantResponse>>`. Schema Springdoc:

```json
[
  {
    "id": "<UUID>",
    "productId": "<UUID>",
    "variantName": "<string>",
    "sku": "<string>",
    "priceDelta": 1,
    "calculatedPrice": 1,
    "stockQuantity": 1,
    "isActive": true,
    "size": "<string>",
    "capacityLiter": 1
  }
]
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Sản phẩm`. Các helper/service được gọi có thêm lỗi như rules.

### API-084 — PATCH `/api/products/{id}/variants/{variantId}/stock`

**Module/mục đích:** Product / adjustVariant. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** Catalog/ProductDetail/AdminProducts.

**Source:** [ProductController.adjustVariant](../../backend/src/main/java/com/smartbox/backend/controller/ProductController.java) dòng 29; service: Xử lý trực tiếp ở controller.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |
| `variantId` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** StockAdjustRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `delta` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "delta": 1
}
```

**Preconditions/business:** Public list vẫn có thể chứa inactive; lọc isActive/variant.isActive. ProductResponse chưa expose hasWeightSensor. SKU stock dùng variant, không product.stockQuantity; update cần ID variant cũ, delete soft deactivate.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "id": "<UUID>",
  "product_id": "<UUID>",
  "stock_quantity": 0
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-085 — GET `/api/promotions`

**Module/mục đích:** Lấy danh sách tất cả mã khuyến mãi. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager/support_agent/accountant. **Màn hình:** AdminPromotions (không nối checkout).

**Source:** [PromotionController.getAllPromotions](../../backend/src/main/java/com/smartbox/backend/controller/PromotionController.java) dòng 28; service: `backend/src/main/java/com/smartbox/backend/service/PromotionService.java::getAllPromotions`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** CRUD/validate hiện có; customer bị RBAC chặn cả POST validate; checkout không sử dụng coupon. Date parsing legacy có fallback, không coi là validation chặt.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<List<PromotionResponse>>`. Schema Springdoc:

```json
[
  {
    "id": "<UUID>",
    "code": "<string>",
    "description": "<string>",
    "discountType": "<string>",
    "discountValue": 1,
    "minOrderValue": 1,
    "maxDiscount": 1,
    "startDate": "<string>",
    "endDate": "<string>",
    "usageLimit": 1,
    "usedCount": 1,
    "isActive": true,
    "createdAt": "<ISO-8601 timestamp>",
    "updatedAt": "<ISO-8601 timestamp>"
  }
]
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-086 — POST `/api/promotions`

**Module/mục đích:** Tạo mới mã khuyến mãi. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminPromotions (không nối checkout).

**Source:** [PromotionController.createPromotion](../../backend/src/main/java/com/smartbox/backend/controller/PromotionController.java) dòng 48; service: `backend/src/main/java/com/smartbox/backend/service/PromotionService.java::createPromotion`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** PromotionRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `code` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `description` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `discountType` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `discountValue` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `minOrderValue` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `maxDiscount` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `startDate` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `endDate` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `usageLimit` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `usedCount` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `isActive` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "code": "<string>",
  "description": "<string>",
  "discountType": "<string>",
  "discountValue": 1,
  "minOrderValue": 1,
  "maxDiscount": 1,
  "startDate": "<string>",
  "endDate": "<string>",
  "usageLimit": 1,
  "usedCount": 1,
  "isActive": true
}
```

**Preconditions/business:** CRUD/validate hiện có; customer bị RBAC chặn cả POST validate; checkout không sử dụng coupon. Date parsing legacy có fallback, không coi là validation chặt.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<PromotionResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "code": "<string>",
  "description": "<string>",
  "discountType": "<string>",
  "discountValue": 1,
  "minOrderValue": 1,
  "maxDiscount": 1,
  "startDate": "<string>",
  "endDate": "<string>",
  "usageLimit": 1,
  "usedCount": 1,
  "isActive": true,
  "createdAt": "<ISO-8601 timestamp>",
  "updatedAt": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `AppException`: `Mã khuyến mãi không được để trống.`; `AppException`: `Mã khuyến mãi '`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `Mã khuyến mãi '` |
| 400 | `Mã khuyến mãi không được để trống.` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-087 — GET `/api/promotions/paged`

**Module/mục đích:** Lấy danh sách mã khuyến mãi có phân trang dạng Map<String, Object>. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager/support_agent/accountant. **Màn hình:** AdminPromotions (không nối checkout).

**Source:** [PromotionController.getPromotionsPaged](../../backend/src/main/java/com/smartbox/backend/controller/PromotionController.java) dòng 34; service: `backend/src/main/java/com/smartbox/backend/service/PromotionService.java::getPromotionsPaged`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `page` | query | integer(int32) | required=False; default=0 |
| `size` | query | integer(int32) | required=False; default=10 |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** CRUD/validate hiện có; customer bị RBAC chặn cả POST validate; checkout không sử dụng coupon. Date parsing legacy có fallback, không coi là validation chặt.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** page=0; size=10

**Success HTTP:** 200; response signature `ResponseEntity<Map<String, Object>>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "content": [
    {
      "id": "<UUID>",
      "code": "<string>",
      "description": "<string>",
      "discountType": "<string>",
      "discountValue": 1,
      "minOrderValue": 1,
      "maxDiscount": 1,
      "startDate": "<string>",
      "endDate": "<string>",
      "usageLimit": 1,
      "usedCount": 1,
      "isActive": true,
      "createdAt": "<ISO-8601 timestamp>",
      "updatedAt": "<ISO-8601 timestamp>"
    }
  ],
  "currentPage": 0,
  "totalElements": 1,
  "totalPages": 1,
  "pageSize": 10,
  "numberOfElements": 1,
  "isFirst": true,
  "isLast": true,
  "hasNext": false,
  "hasPrevious": false
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-088 — POST `/api/promotions/validate`

**Module/mục đích:** Kiểm tra điều kiện hợp lệ và tính số tiền giảm giá cho đơn hàng. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminPromotions (không nối checkout).

**Source:** [PromotionController.validateAndCalculate](../../backend/src/main/java/com/smartbox/backend/controller/PromotionController.java) dòng 76; service: `backend/src/main/java/com/smartbox/backend/service/PromotionService.java::validateAndCalculate`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** ValidateCouponRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `code` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `orderTotal` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "code": "<string>",
  "orderTotal": 1
}
```

**Preconditions/business:** CRUD/validate hiện có; customer bị RBAC chặn cả POST validate; checkout không sử dụng coupon. Date parsing legacy có fallback, không coi là validation chặt.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<ValidateCouponResponse>`. Schema Springdoc:

```json
{
  "message": "<string>",
  "code": "<string>",
  "discountType": "<string>",
  "discountValue": 1,
  "discountAmount": 1,
  "originalTotal": 1,
  "finalTotal": 1,
  "promotionId": "<UUID>",
  "isValid": true
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-089 — DELETE `/api/promotions/{id}`

**Module/mục đích:** Xóa mã khuyến mãi. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminPromotions (không nối checkout).

**Source:** [PromotionController.deletePromotion](../../backend/src/main/java/com/smartbox/backend/controller/PromotionController.java) dòng 63; service: `backend/src/main/java/com/smartbox/backend/service/PromotionService.java::deletePromotion`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** CRUD/validate hiện có; customer bị RBAC chặn cả POST validate; checkout không sử dụng coupon. Date parsing legacy có fallback, không coi là validation chặt.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 204; response signature `ResponseEntity<Void>`. Schema Springdoc:

```json
{"note":"Không có response body (void/204), hoặc file nhị phân đối với export"}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Mã khuyến mãi`. Các helper/service được gọi có thêm lỗi như rules.

### API-090 — GET `/api/promotions/{id}`

**Module/mục đích:** Lấy thông tin chi tiết một mã khuyến mãi theo ID. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager/support_agent/accountant. **Màn hình:** AdminPromotions (không nối checkout).

**Source:** [PromotionController.getPromotionById](../../backend/src/main/java/com/smartbox/backend/controller/PromotionController.java) dòng 42; service: `backend/src/main/java/com/smartbox/backend/service/PromotionService.java::getPromotionById`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** CRUD/validate hiện có; customer bị RBAC chặn cả POST validate; checkout không sử dụng coupon. Date parsing legacy có fallback, không coi là validation chặt.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<PromotionResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "code": "<string>",
  "description": "<string>",
  "discountType": "<string>",
  "discountValue": 1,
  "minOrderValue": 1,
  "maxDiscount": 1,
  "startDate": "<string>",
  "endDate": "<string>",
  "usageLimit": 1,
  "usedCount": 1,
  "isActive": true,
  "createdAt": "<ISO-8601 timestamp>",
  "updatedAt": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Mã khuyến mãi`. Các helper/service được gọi có thêm lỗi như rules.

### API-091 — PUT `/api/promotions/{id}`

**Module/mục đích:** Cập nhật thông tin mã khuyến mãi. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminPromotions (không nối checkout).

**Source:** [PromotionController.updatePromotion](../../backend/src/main/java/com/smartbox/backend/controller/PromotionController.java) dòng 55; service: `backend/src/main/java/com/smartbox/backend/service/PromotionService.java::updatePromotion`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** PromotionRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `code` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `description` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `discountType` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `discountValue` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `minOrderValue` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `maxDiscount` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `startDate` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `endDate` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `usageLimit` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `usedCount` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `isActive` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "code": "<string>",
  "description": "<string>",
  "discountType": "<string>",
  "discountValue": 1,
  "minOrderValue": 1,
  "maxDiscount": 1,
  "startDate": "<string>",
  "endDate": "<string>",
  "usageLimit": 1,
  "usedCount": 1,
  "isActive": true
}
```

**Preconditions/business:** CRUD/validate hiện có; customer bị RBAC chặn cả POST validate; checkout không sử dụng coupon. Date parsing legacy có fallback, không coi là validation chặt.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<PromotionResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "code": "<string>",
  "description": "<string>",
  "discountType": "<string>",
  "discountValue": 1,
  "minOrderValue": 1,
  "maxDiscount": 1,
  "startDate": "<string>",
  "endDate": "<string>",
  "usageLimit": 1,
  "usedCount": 1,
  "isActive": true,
  "createdAt": "<ISO-8601 timestamp>",
  "updatedAt": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Mã khuyến mãi`; `AppException`: `Mã khuyến mãi '`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `Mã khuyến mãi '` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-092 — PATCH `/api/promotions/{id}/toggle`

**Module/mục đích:** Bật / Tắt kích hoạt mã khuyến mãi. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/product_manager. **Màn hình:** AdminPromotions (không nối checkout).

**Source:** [PromotionController.toggleActive](../../backend/src/main/java/com/smartbox/backend/controller/PromotionController.java) dòng 70; service: `backend/src/main/java/com/smartbox/backend/service/PromotionService.java::toggleActive`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** CRUD/validate hiện có; customer bị RBAC chặn cả POST validate; checkout không sử dụng coupon. Date parsing legacy có fallback, không coi là validation chặt.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<PromotionResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "code": "<string>",
  "description": "<string>",
  "discountType": "<string>",
  "discountValue": 1,
  "minOrderValue": 1,
  "maxDiscount": 1,
  "startDate": "<string>",
  "endDate": "<string>",
  "usageLimit": 1,
  "usedCount": 1,
  "isActive": true,
  "createdAt": "<ISO-8601 timestamp>",
  "updatedAt": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Mã khuyến mãi`. Các helper/service được gọi có thêm lỗi như rules.

### API-093 — GET `/api/reports/{code}`

**Module/mục đích:** RevenueReport / definition. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/accountant. **Màn hình:** AdminReports.

**Source:** [RevenueReportController.definition](../../backend/src/main/java/com/smartbox/backend/controller/RevenueReportController.java) dòng 18; service: `backend/src/main/java/com/smartbox/backend/service/RevenueReportService.java::definition`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `code` | path | string | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `definition`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `Map<String,Object>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "code": "RPT_REVENUE_DAILY",
  "name": "<tên report từ metadata>",
  "params": [
    {
      "name": "<param name>",
      "dataType": "<DATE|UUID|LONG|DECIMAL>",
      "required": true,
      "maxDays": null
    }
  ]
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Báo cáo`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 401 | `Yêu cầu đăng nhập` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-094 — POST `/api/reports/{code}/export`

**Module/mục đích:** RevenueReport / export. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/accountant. **Màn hình:** AdminReports.

**Source:** [RevenueReportController.export](../../backend/src/main/java/com/smartbox/backend/controller/RevenueReportController.java) dòng 19; service: `backend/src/main/java/com/smartbox/backend/service/RevenueReportService.java::definition`; `backend/src/main/java/com/smartbox/backend/service/RevenueReportService.java::data`; `backend/src/main/java/com/smartbox/backend/service/RevenueReportService.java::export`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `code` | path | string | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Export; controller @Valid = True.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `format` | string | Có | pattern=PDF\|XLSX |
| `params` | object | Có | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "format": "XLSX",
  "params": {
    "fromDate": "<yyyy-MM-dd>",
    "toDate": "<yyyy-MM-dd>",
    "customerId": "<UUID; optional, bỏ nếu không lọc>",
    "minAmount": 0
  }
}
```

**Preconditions/business:** Theo `definition, data, export`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<byte[]>`. Schema Springdoc:

Body nhị phân PDF/XLSX theo format, không phải JSON. Đọc Content-Type, xử lý error JSON trước blob. Content-Disposition hiện chưa được CORS expose.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Báo cáo`; `IllegalStateException`: `INVALID_REPORT_TEMPLATE`; `BadRequestException`: `INVALID_REPORT_FORMAT`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `INVALID_REPORT_FORMAT` |
| 401 | `Yêu cầu đăng nhập` |
| 503 | `REPORT_FONT_NOT_CONFIGURED` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-095 — GET `/api/settings`

**Module/mục đích:** Lấy tất cả cài đặt hệ thống. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin. **Màn hình:** AdminSettings.

**Source:** [SettingsController.getSettings](../../backend/src/main/java/com/smartbox/backend/controller/SettingsController.java) dòng 25; service: `backend/src/main/java/com/smartbox/backend/service/SettingsService.java::getSettings`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Template DB legacy không nối Thymeleaf outbox. test-send có thể success=true trong simulation: phải xét isRealSent. Không có CRUD shipping/payment/category ở controller này.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<SystemSettingsResponse>`. Schema Springdoc:

```json
{
  "messageTemplates": [
    {
      "id": "<UUID>",
      "code": "<string>",
      "name": "<string>",
      "description": "<string>",
      "channel": "<string>",
      "subject": "<string>",
      "body": "<string>",
      "variables": "<string>",
      "isActive": true,
      "updatedAt": "<ISO-8601 timestamp>"
    }
  ],
  "shippingMethods": [
    {
      "id": "<UUID>",
      "name": "<string>",
      "fee": 1,
      "isActive": true
    }
  ],
  "paymentMethods": [
    {
      "id": "<UUID>",
      "name": "<string>",
      "isActive": true
    }
  ]
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-096 — GET `/api/settings/templates`

**Module/mục đích:** Lấy danh sách tất cả các mẫu thông báo (Templates). **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin. **Màn hình:** AdminSettings.

**Source:** [SettingsController.getAllTemplates](../../backend/src/main/java/com/smartbox/backend/controller/SettingsController.java) dòng 31; service: `backend/src/main/java/com/smartbox/backend/service/SettingsService.java::getAllTemplates`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Template DB legacy không nối Thymeleaf outbox. test-send có thể success=true trong simulation: phải xét isRealSent. Không có CRUD shipping/payment/category ở controller này.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<List<MessageTemplate>>`. Schema Springdoc:

```json
[
  {
    "id": "<UUID>",
    "code": "<string>",
    "name": "<string>",
    "description": "<string>",
    "channel": "<string>",
    "subject": "<string>",
    "body": "<string>",
    "variables": "<string>",
    "isActive": true,
    "updatedAt": "<ISO-8601 timestamp>"
  }
]
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-097 — POST `/api/settings/templates`

**Module/mục đích:** Tạo mới hoặc cập nhật mẫu thông báo Email/SMS/Push. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin. **Màn hình:** AdminSettings.

**Source:** [SettingsController.saveTemplate](../../backend/src/main/java/com/smartbox/backend/controller/SettingsController.java) dòng 43; service: `backend/src/main/java/com/smartbox/backend/service/SettingsService.java::saveTemplate`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** TemplateUpdateRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `code` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `name` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `description` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `channel` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `subject` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `body` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `variables` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `isActive` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "code": "<string>",
  "name": "<string>",
  "description": "<string>",
  "channel": "<string>",
  "subject": "<string>",
  "body": "<string>",
  "variables": "<string>",
  "isActive": true
}
```

**Preconditions/business:** Template DB legacy không nối Thymeleaf outbox. test-send có thể success=true trong simulation: phải xét isRealSent. Không có CRUD shipping/payment/category ở controller này.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<MessageTemplate>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "code": "<string>",
  "name": "<string>",
  "description": "<string>",
  "channel": "<string>",
  "subject": "<string>",
  "body": "<string>",
  "variables": "<string>",
  "isActive": true,
  "updatedAt": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-098 — GET `/api/settings/templates/{code}`

**Module/mục đích:** Lấy chi tiết một mẫu thông báo theo mã code. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin. **Màn hình:** AdminSettings.

**Source:** [SettingsController.getTemplateByCode](../../backend/src/main/java/com/smartbox/backend/controller/SettingsController.java) dòng 37; service: `backend/src/main/java/com/smartbox/backend/service/SettingsService.java::getTemplateByCode`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `code` | path | string | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Template DB legacy không nối Thymeleaf outbox. test-send có thể success=true trong simulation: phải xét isRealSent. Không có CRUD shipping/payment/category ở controller này.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<MessageTemplate>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "code": "<string>",
  "name": "<string>",
  "description": "<string>",
  "channel": "<string>",
  "subject": "<string>",
  "body": "<string>",
  "variables": "<string>",
  "isActive": true,
  "updatedAt": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Mẫu thông báo`. Các helper/service được gọi có thêm lỗi như rules.

### API-099 — POST `/api/settings/templates/{code}/reset-default`

**Module/mục đích:** Khôi phục mẫu thông báo về mặc định chuẩn của hệ thống. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin. **Màn hình:** AdminSettings.

**Source:** [SettingsController.resetTemplateToDefault](../../backend/src/main/java/com/smartbox/backend/controller/SettingsController.java) dòng 49; service: `backend/src/main/java/com/smartbox/backend/service/SettingsService.java::resetToDefault`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `code` | path | string | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Template DB legacy không nối Thymeleaf outbox. test-send có thể success=true trong simulation: phải xét isRealSent. Không có CRUD shipping/payment/category ở controller này.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<MessageTemplate>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "code": "<string>",
  "name": "<string>",
  "description": "<string>",
  "channel": "<string>",
  "subject": "<string>",
  "body": "<string>",
  "variables": "<string>",
  "isActive": true,
  "updatedAt": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Mẫu thông báo`. Các helper/service được gọi có thêm lỗi như rules.

### API-100 — POST `/api/settings/templates/{code}/test-send`

**Module/mục đích:** Gửi thử nghiệm mẫu thông báo (Test Send via SMTP / Simulation). **Trạng thái:** PARTIAL.

**Quyền:** super_admin. **Màn hình:** AdminSettings.

**Source:** [SettingsController.testSendTemplate](../../backend/src/main/java/com/smartbox/backend/controller/SettingsController.java) dòng 55; service: `backend/src/main/java/com/smartbox/backend/service/SettingsService.java::testSendTemplate`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `code` | path | string | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** TestSendTemplateRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `templateCode` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `recipientEmail` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `recipientPhone` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `customSubject` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `customBody` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `mockVariables` | object | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "templateCode": "<string>",
  "recipientEmail": "<string>",
  "recipientPhone": "<string>",
  "customSubject": "<string>",
  "customBody": "<string>",
  "mockVariables": {
    "<dynamic-key>": "Xem MAP-RESPONSES.md; không suy diễn schema này"
  }
}
```

**Preconditions/business:** Template DB legacy không nối Thymeleaf outbox. test-send có thể success=true trong simulation: phải xét isRealSent. Không có CRUD shipping/payment/category ở controller này.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<TestSendResponse>`. Schema Springdoc:

```json
{
  "success": true,
  "channel": "<string>",
  "recipient": "<string>",
  "renderedSubject": "<string>",
  "renderedBody": "<string>",
  "message": "<string>",
  "isRealSent": true
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-101 — GET `/api/users`

**Module/mục đích:** Lấy danh sách tất cả người dùng / nhân viên. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/support_agent; support chỉ khóa customer. **Màn hình:** AdminUsers/Customer360.

**Source:** [UserController.getAllUsers](../../backend/src/main/java/com/smartbox/backend/controller/UserController.java) dòng 33; service: `backend/src/main/java/com/smartbox/backend/service/UserService.java::getAllUsers`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `getAllUsers`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<List<UserProfileResponse>>`. Schema Springdoc:

```json
[
  {
    "id": "<UUID>",
    "fullName": "<string>",
    "phone": "<string>",
    "email": "<string>",
    "avatarUrl": "<string>",
    "defaultAddress": "<string>",
    "role": "<string>",
    "isLocked": true,
    "is2faEnabled": true,
    "createdAt": "<ISO-8601 timestamp>",
    "updatedAt": "<ISO-8601 timestamp>"
  }
]
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-102 — GET `/api/users/paged`

**Module/mục đích:** Lấy danh sách người dùng có phân trang dạng Map<String, Object>. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/support_agent; support chỉ khóa customer. **Màn hình:** AdminUsers/Customer360.

**Source:** [UserController.getUsersPaged](../../backend/src/main/java/com/smartbox/backend/controller/UserController.java) dòng 39; service: `backend/src/main/java/com/smartbox/backend/service/UserService.java::getUsersPaged`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `page` | query | integer(int32) | required=False; default=0 |
| `size` | query | integer(int32) | required=False; default=10 |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `getUsersPaged`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** page=0; size=10

**Success HTTP:** 200; response signature `ResponseEntity<Map<String, Object>>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "content": [
    {
      "id": "<UUID>",
      "fullName": "<string>",
      "phone": "<string>",
      "email": "<string>",
      "avatarUrl": "<string>",
      "defaultAddress": "<string>",
      "role": "<string>",
      "isLocked": true,
      "is2faEnabled": true,
      "createdAt": "<ISO-8601 timestamp>",
      "updatedAt": "<ISO-8601 timestamp>"
    }
  ],
  "currentPage": 0,
  "totalElements": 1,
  "totalPages": 1,
  "pageSize": 10,
  "numberOfElements": 1,
  "isFirst": true,
  "isLast": true,
  "hasNext": false,
  "hasPrevious": false
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-103 — POST `/api/users/staff`

**Module/mục đích:** Cấp tài khoản nhân viên mới theo vai trò (Dành cho Super Admin). **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin. **Màn hình:** AdminUsers/Customer360.

**Source:** [UserController.createStaffUser](../../backend/src/main/java/com/smartbox/backend/controller/UserController.java) dòng 69; service: `backend/src/main/java/com/smartbox/backend/service/UserService.java::createStaffUser`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** CreateStaffRequest; controller @Valid = True.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `fullName` | string | Có | Không khai báo trong schema; xem service/rules |
| `email` | string | Có | Không khai báo trong schema; xem service/rules |
| `phone` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `role` | string | Có | Không khai báo trong schema; xem service/rules |
| `defaultAddress` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `initialPassword` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "fullName": "<string>",
  "email": "<string>",
  "phone": "<string>",
  "role": "<string>",
  "defaultAddress": "<string>",
  "initialPassword": "<string>"
}
```

**Preconditions/business:** Theo `createStaffUser`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<UserProfileResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "fullName": "<string>",
  "phone": "<string>",
  "email": "<string>",
  "avatarUrl": "<string>",
  "defaultAddress": "<string>",
  "role": "<string>",
  "isLocked": true,
  "is2faEnabled": true,
  "createdAt": "<ISO-8601 timestamp>",
  "updatedAt": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `AppException`: `INVALID_STAFF_ROLE`; `AppException`: `INITIAL_PASSWORD_REQUIRED: Mật khẩu phải dài 12–128 ký tự`; `AppException`: `EMAIL_ALREADY_EXISTS`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `INITIAL_PASSWORD_REQUIRED: Mật khẩu phải dài 12–128 ký tự` |
| 400 | `INVALID_STAFF_ROLE` |
| 409 | `EMAIL_ALREADY_EXISTS` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-104 — GET `/api/users/{id}/details`

**Module/mục đích:** Xem hồ sơ khách hàng 360° (Thông tin, Đơn hàng, Thiết bị sở hữu, Lịch sử bảo hành). **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/support_agent; support chỉ khóa customer. **Màn hình:** AdminUsers/Customer360.

**Source:** [UserController.getUser360Details](../../backend/src/main/java/com/smartbox/backend/controller/UserController.java) dòng 47; service: `backend/src/main/java/com/smartbox/backend/service/UserService.java::getUser360Details`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `getUser360Details`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<Customer360Response>`. Schema Springdoc:

```json
{
  "profile": {
    "id": "<UUID>",
    "fullName": "<string>",
    "phone": "<string>",
    "email": "<string>",
    "avatarUrl": "<string>",
    "defaultAddress": "<string>",
    "role": "<string>",
    "isLocked": true,
    "is2faEnabled": true,
    "createdAt": "<ISO-8601 timestamp>",
    "updatedAt": "<ISO-8601 timestamp>"
  },
  "orders": [
    {
      "id": "<UUID>",
      "userId": "<UUID>",
      "customerName": "<string>",
      "customerPhone": "<string>",
      "shippingAddress": "<string>",
      "trackingNumber": "<string>",
      "status": "<string>",
      "total": 1,
      "paymentMethod": "<string>",
      "paymentStatus": "<string>",
      "transactionRef": "<string>",
      "itemsSummary": "<string>",
      "createdAt": "<ISO-8601 timestamp>",
      "updatedAt": "<ISO-8601 timestamp>",
      "items": [
        "<nested>"
      ]
    }
  ],
  "devices": [
    {
      "id": "<UUID>",
      "productId": "<UUID>",
      "productName": "<string>",
      "ownerId": "<UUID>",
      "ownerName": "<string>",
      "ownerPhone": "<string>",
      "serialNumber": "<string>",
      "name": "<string>",
      "locationLabel": "<string>",
      "status": "<string>",
      "batteryLevel": 1,
      "firmwareVersion": "<string>",
      "lastSeenAt": "<ISO-8601 timestamp>",
      "createdAt": "<ISO-8601 timestamp>",
      "macAddress": "<string>",
      "chipModel": "<string>",
      "publicIp": "<string>",
      "localIp": "<string>",
      "geoCity": "<string>",
      "mapX": 1,
      "mapY": 1,
      "lockStatus": "<string>",
      "wifiRssi": 1,
      "pingMs": 1,
      "doorStatus": "<string>",
      "weightKg": 1,
      "packageDetected": true,
      "scaleReady": true,
      "deviceState": "<string>",
      "mqttTopicId": "<string>"
    }
  ],
  "warrantyClaims": [
    {
      "id": "<UUID>",
      "warrantyId": "<UUID>",
      "description": "<string>",
      "images": [
        "<nested>"
      ],
      "status": "<string>",
      "assignedTo": "<UUID>",
      "assigneeName": "<string>",
      "assigneePhone": "<string>",
      "internalNotes": "<string>",
      "createdAt": "<ISO-8601 timestamp>",
      "resolvedAt": "<ISO-8601 timestamp>",
      "serialNumber": "<string>",
      "deviceName": "<string>",
      "customerName": "<string>",
      "customerPhone": "<string>",
      "customerAddress": "<string>",
      "faultCategory": "<string>",
      "warrantyStartDate": "<yyyy-MM-dd>",
      "warrantyEndDate": "<yyyy-MM-dd>"
    }
  ]
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Người dùng`. Các helper/service được gọi có thêm lỗi như rules.

### API-105 — PATCH `/api/users/{id}/role`

**Module/mục đích:** Cập nhật vai trò / quyền hạn người dùng (super_admin, technician, product_manager,...). **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin. **Màn hình:** AdminUsers/Customer360.

**Source:** [UserController.updateRole](../../backend/src/main/java/com/smartbox/backend/controller/UserController.java) dòng 61; service: `backend/src/main/java/com/smartbox/backend/service/UserService.java::updateRole`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** RoleUpdateRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `role` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "role": "<string>"
}
```

**Preconditions/business:** Theo `updateRole`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<UserProfileResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "fullName": "<string>",
  "phone": "<string>",
  "email": "<string>",
  "avatarUrl": "<string>",
  "defaultAddress": "<string>",
  "role": "<string>",
  "isLocked": true,
  "is2faEnabled": true,
  "createdAt": "<ISO-8601 timestamp>",
  "updatedAt": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `AppException`: `INVALID_ROLE`; `AppException`: `CANNOT_CHANGE_OWN_ROLE`; `ResourceNotFoundException`: `Người dùng`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `INVALID_ROLE` |
| 409 | `CANNOT_CHANGE_OWN_ROLE` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-106 — POST `/api/users/{id}/send-reset-otp`

**Module/mục đích:** Phát mã xác thực OTP gửi qua Email cho khách hàng (Hotline Reset). **Trạng thái:** PARTIAL.

**Quyền:** super_admin/support_agent; support chỉ khóa customer. **Màn hình:** AdminUsers/Customer360.

**Source:** [UserController.sendResetOtp](../../backend/src/main/java/com/smartbox/backend/controller/UserController.java) dòng 76; service: `backend/src/main/java/com/smartbox/backend/service/UserService.java::sendResetPasswordOtp`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Theo `sendResetPasswordOtp`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<SendOtpResponse>`. Schema Springdoc:

```json
{
  "success": true,
  "message": "<string>",
  "email": "<string>",
  "previewOtp": "<string>",
  "emailSent": true
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Người dùng`; `AppException`: `EMAIL_REQUIRED`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `EMAIL_REQUIRED` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-107 — PATCH `/api/users/{id}/toggle-lock`

**Module/mục đích:** Khóa hoặc mở khóa tài khoản. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/support_agent; support chỉ khóa customer. **Màn hình:** AdminUsers/Customer360.

**Source:** [UserController.toggleLock](../../backend/src/main/java/com/smartbox/backend/controller/UserController.java) dòng 53; service: `backend/src/main/java/com/smartbox/backend/service/UserService.java::toggleLock`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** LockUpdateRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `isLocked` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `reason` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "isLocked": true,
  "reason": "<string>"
}
```

**Preconditions/business:** Theo `toggleLock`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<UserProfileResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "fullName": "<string>",
  "phone": "<string>",
  "email": "<string>",
  "avatarUrl": "<string>",
  "defaultAddress": "<string>",
  "role": "<string>",
  "isLocked": true,
  "is2faEnabled": true,
  "createdAt": "<ISO-8601 timestamp>",
  "updatedAt": "<ISO-8601 timestamp>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `AppException`: `LOCK_STATE_REQUIRED`; `AppException`: `CANNOT_LOCK_OWN_ACCOUNT`; `ResourceNotFoundException`: `Người dùng`; `AppException`: `SUPPORT_CAN_ONLY_LOCK_CUSTOMERS`. Các helper/service được gọi có thêm lỗi như rules.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 400 | `LOCK_STATE_REQUIRED` |
| 403 | `SUPPORT_CAN_ONLY_LOCK_CUSTOMERS` |
| 409 | `CANNOT_LOCK_OWN_ACCOUNT` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-108 — POST `/api/users/{id}/verify-reset-password`

**Module/mục đích:** Xác thực mã OTP và đặt lại mật khẩu mới cho khách hàng. **Trạng thái:** PARTIAL.

**Quyền:** super_admin/support_agent; support chỉ khóa customer. **Màn hình:** AdminUsers/Customer360.

**Source:** [UserController.verifyResetPassword](../../backend/src/main/java/com/smartbox/backend/controller/UserController.java) dòng 82; service: `backend/src/main/java/com/smartbox/backend/service/UserService.java::verifyOtpAndResetPassword`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** VerifyResetPasswordRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `otp` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `newPassword` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "otp": "<string>",
  "newPassword": "<string>"
}
```

**Preconditions/business:** Theo `verifyOtpAndResetPassword`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<ResetPasswordResponse>`. Schema Springdoc:

```json
{
  "success": true,
  "message": "<string>",
  "updatedPassword": "<string>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `AppException`: `AUTH_PROVIDER_RECOVERY_REQUIRED: Chưa có tích hợp reset hotline an toàn; không báo thành công khi mật khẩu chưa đổi`. Các helper/service được gọi có thêm lỗi như rules.

**PARTIAL:** service luôn ném 503 `AUTH_PROVIDER_RECOVERY_REQUIRED`; không có success thực thi mặc dù DTO/Swagger vẫn khai báo.


**Lỗi business qua helper/service (source, không phải errorCode field):**

| HTTP | Tiền tố message literal |
|---|---|
| 503 | `AUTH_PROVIDER_RECOVERY_REQUIRED: Chưa có tích hợp reset hotline an toàn; không báo thành công khi mật khẩu chưa đổi` |

Các nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).
### API-109 — GET `/api/warranties/claims`

**Module/mục đích:** Lấy danh sách tất cả yêu cầu bảo hành. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/support_agent/technician; mutation technician chỉ claim được giao. **Màn hình:** AdminWarranty (không customer).

**Source:** [WarrantyController.getClaims](../../backend/src/main/java/com/smartbox/backend/controller/WarrantyController.java) dòng 36; service: `backend/src/main/java/com/smartbox/backend/service/WarrantyService.java::getClaims`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| — | — | — | Không có path/query/header khai báo thêm |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Staff-only; lookup không phải public API. Technician mutation chỉ claim được giao; chưa có customer create claim/warranty issuance khi bán.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<List<ClaimResponse>>`. Schema Springdoc:

```json
[
  {
    "id": "<UUID>",
    "warrantyId": "<UUID>",
    "description": "<string>",
    "images": [
      "<string>"
    ],
    "status": "<string>",
    "assignedTo": "<UUID>",
    "assigneeName": "<string>",
    "assigneePhone": "<string>",
    "internalNotes": "<string>",
    "createdAt": "<ISO-8601 timestamp>",
    "resolvedAt": "<ISO-8601 timestamp>",
    "serialNumber": "<string>",
    "deviceName": "<string>",
    "customerName": "<string>",
    "customerPhone": "<string>",
    "customerAddress": "<string>",
    "faultCategory": "<string>",
    "warrantyStartDate": "<yyyy-MM-dd>",
    "warrantyEndDate": "<yyyy-MM-dd>"
  }
]
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-110 — GET `/api/warranties/claims/paged`

**Module/mục đích:** Lấy danh sách yêu cầu bảo hành có phân trang dạng Map<String, Object>. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/support_agent/technician; mutation technician chỉ claim được giao. **Màn hình:** AdminWarranty (không customer).

**Source:** [WarrantyController.getClaimsPaged](../../backend/src/main/java/com/smartbox/backend/controller/WarrantyController.java) dòng 42; service: `backend/src/main/java/com/smartbox/backend/service/WarrantyService.java::getClaimsPaged`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `page` | query | integer(int32) | required=False; default=0 |
| `size` | query | integer(int32) | required=False; default=10 |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Staff-only; lookup không phải public API. Technician mutation chỉ claim được giao; chưa có customer create claim/warranty issuance khi bán.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** page=0; size=10

**Success HTTP:** 200; response signature `ResponseEntity<Map<String, Object>>`. Schema Springdoc:

Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:
```json
{
  "content": [
    {
      "id": "<UUID>",
      "warrantyId": "<UUID>",
      "description": "<string>",
      "images": [
        "<string>"
      ],
      "status": "<string>",
      "assignedTo": "<UUID>",
      "assigneeName": "<string>",
      "assigneePhone": "<string>",
      "internalNotes": "<string>",
      "createdAt": "<ISO-8601 timestamp>",
      "resolvedAt": "<ISO-8601 timestamp>",
      "serialNumber": "<string>",
      "deviceName": "<string>",
      "customerName": "<string>",
      "customerPhone": "<string>",
      "customerAddress": "<string>",
      "faultCategory": "<string>",
      "warrantyStartDate": "<yyyy-MM-dd>",
      "warrantyEndDate": "<yyyy-MM-dd>"
    }
  ],
  "currentPage": 0,
  "totalElements": 1,
  "totalPages": 1,
  "pageSize": 10,
  "numberOfElements": 1,
  "isFirst": true,
  "isLast": true,
  "hasNext": false,
  "hasPrevious": false
}
```

Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

### API-111 — PATCH `/api/warranties/claims/{id}/assign`

**Module/mục đích:** Phân công kỹ thuật viên xử lý yêu cầu bảo hành. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/support_agent. **Màn hình:** AdminWarranty (không customer).

**Source:** [WarrantyController.assignTechnician](../../backend/src/main/java/com/smartbox/backend/controller/WarrantyController.java) dòng 50; service: `backend/src/main/java/com/smartbox/backend/service/WarrantyService.java::assignTechnician`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** AssignTechnicianRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `technicianId` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "technicianId": "<UUID>"
}
```

**Preconditions/business:** Staff-only; lookup không phải public API. Technician mutation chỉ claim được giao; chưa có customer create claim/warranty issuance khi bán.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<ClaimResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "warrantyId": "<UUID>",
  "description": "<string>",
  "images": [
    "<string>"
  ],
  "status": "<string>",
  "assignedTo": "<UUID>",
  "assigneeName": "<string>",
  "assigneePhone": "<string>",
  "internalNotes": "<string>",
  "createdAt": "<ISO-8601 timestamp>",
  "resolvedAt": "<ISO-8601 timestamp>",
  "serialNumber": "<string>",
  "deviceName": "<string>",
  "customerName": "<string>",
  "customerPhone": "<string>",
  "customerAddress": "<string>",
  "faultCategory": "<string>",
  "warrantyStartDate": "<yyyy-MM-dd>",
  "warrantyEndDate": "<yyyy-MM-dd>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Kỹ thuật viên`; `ResourceNotFoundException`: `Khiếu nại bảo hành`. Các helper/service được gọi có thêm lỗi như rules.

### API-112 — PATCH `/api/warranties/claims/{id}/notes`

**Module/mục đích:** Cập nhật ghi chú nội bộ cho ticket bảo hành. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/support_agent/technician; mutation technician chỉ claim được giao. **Màn hình:** AdminWarranty (không customer).

**Source:** [WarrantyController.updateNotes](../../backend/src/main/java/com/smartbox/backend/controller/WarrantyController.java) dòng 66; service: `backend/src/main/java/com/smartbox/backend/service/WarrantyService.java::addInternalNote`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** NotesUpdateRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `notes` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "notes": "<string>"
}
```

**Preconditions/business:** Staff-only; lookup không phải public API. Technician mutation chỉ claim được giao; chưa có customer create claim/warranty issuance khi bán.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<ClaimResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "warrantyId": "<UUID>",
  "description": "<string>",
  "images": [
    "<string>"
  ],
  "status": "<string>",
  "assignedTo": "<UUID>",
  "assigneeName": "<string>",
  "assigneePhone": "<string>",
  "internalNotes": "<string>",
  "createdAt": "<ISO-8601 timestamp>",
  "resolvedAt": "<ISO-8601 timestamp>",
  "serialNumber": "<string>",
  "deviceName": "<string>",
  "customerName": "<string>",
  "customerPhone": "<string>",
  "customerAddress": "<string>",
  "faultCategory": "<string>",
  "warrantyStartDate": "<yyyy-MM-dd>",
  "warrantyEndDate": "<yyyy-MM-dd>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Khiếu nại bảo hành`. Các helper/service được gọi có thêm lỗi như rules.

### API-113 — PATCH `/api/warranties/claims/{id}/status`

**Module/mục đích:** Cập nhật trạng thái yêu cầu bảo hành (new, in_progress, resolved, rejected). **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/support_agent/technician; mutation technician chỉ claim được giao. **Màn hình:** AdminWarranty (không customer).

**Source:** [WarrantyController.updateClaimStatus](../../backend/src/main/java/com/smartbox/backend/controller/WarrantyController.java) dòng 58; service: `backend/src/main/java/com/smartbox/backend/service/WarrantyService.java::updateClaimStatus`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. Content-Type: application/json khi gửi body. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `id` | path | string(uuid) | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** ClaimStatusUpdateRequest; controller @Valid = False.

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `status` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:
```json
{
  "status": "<string>"
}
```

**Preconditions/business:** Staff-only; lookup không phải public API. Technician mutation chỉ claim được giao; chưa có customer create claim/warranty issuance khi bán.

**Side effects:** Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.

**Idempotency:** Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<ClaimResponse>`. Schema Springdoc:

```json
{
  "id": "<UUID>",
  "warrantyId": "<UUID>",
  "description": "<string>",
  "images": [
    "<string>"
  ],
  "status": "<string>",
  "assignedTo": "<UUID>",
  "assigneeName": "<string>",
  "assigneePhone": "<string>",
  "internalNotes": "<string>",
  "createdAt": "<ISO-8601 timestamp>",
  "resolvedAt": "<ISO-8601 timestamp>",
  "serialNumber": "<string>",
  "deviceName": "<string>",
  "customerName": "<string>",
  "customerPhone": "<string>",
  "customerAddress": "<string>",
  "faultCategory": "<string>",
  "warrantyStartDate": "<yyyy-MM-dd>",
  "warrantyEndDate": "<yyyy-MM-dd>"
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `ResourceNotFoundException`: `Khiếu nại bảo hành`. Các helper/service được gọi có thêm lỗi như rules.

### API-114 — GET `/api/warranties/lookup`

**Module/mục đích:** Tra cứu thông tin bảo hành điện tử theo Serial Number của thiết bị. **Trạng thái:** IMPLEMENTED.

**Quyền:** super_admin/support_agent/technician; mutation technician chỉ claim được giao. **Màn hình:** AdminWarranty (không customer).

**Source:** [WarrantyController.lookupWarrantyBySerial](../../backend/src/main/java/com/smartbox/backend/controller/WarrantyController.java) dòng 29; service: `backend/src/main/java/com/smartbox/backend/service/WarrantyService.java::lookupWarrantyBySerial`.

**Authentication/headers:** Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa. X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.

**Parameters/headers:**

| Tên | Vị trí | Kiểu | Required/default/constraint |
|---|---|---|---|
| `serial` | query | string | required=True; Không khai báo trong schema; xem service/rules |

**Request body/validation:** Không có body; controller @Valid = False.

**Preconditions/business:** Staff-only; lookup không phải public API. Technician mutation chỉ claim được giao; chưa có customer create claim/warranty issuance khi bán.

**Side effects:** Đọc; không mutation nghiệp vụ.

**Idempotency:** Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.

**Pagination/sorting:** Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.

**Success HTTP:** 200; response signature `ResponseEntity<WarrantyLookupResponse>`. Schema Springdoc:

```json
{
  "serialNumber": "<string>",
  "productName": "<string>",
  "variantName": "<string>",
  "status": "<string>",
  "statusLabel": "<string>",
  "startDate": "<yyyy-MM-dd>",
  "endDate": "<yyyy-MM-dd>",
  "remainingDays": 1,
  "isValid": true,
  "ownerNameMasked": "<string>",
  "ownerPhoneMasked": "<string>",
  "locationLabel": "<string>",
  "deviceStatus": "<string>",
  "features": [
    "<string>"
  ],
  "hardwareSpecs": [
    "<string>"
  ]
}
```

**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.

Literals ngay trong handler: `IllegalArgumentException`: `Mã Serial thiết bị không được để trống`; `ResourceNotFoundException`: `Bảo hành`; `ResourceNotFoundException`: `Thiết bị`. Các helper/service được gọi có thêm lỗi như rules.
