# DTO dictionary — schema hiện tại

Không sao chép @Schema example có sẵn. Required/constraints là metadata; chỉ được controller có @Valid thực thi Bean Validation. Những field không required vẫn có thể cần business/DB, hoặc là response field optional/null. Xem endpoint tương ứng.

## ApiResponseString

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `code` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `message` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `data` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `timestamp` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## ArticleRequest

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

## ArticleResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `id` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `title` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `slug` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `category` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `summary` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `content` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `coverImage` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `authorName` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `status` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `viewCount` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `tags` | array<string> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `publishedAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `createdAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `updatedAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## AssignTechnicianRequest

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `technicianId` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## AuditLogRequest

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `actorId` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `action` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `targetTable` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `targetId` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `meta` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## AuditLogResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `id` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `actorId` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `actorName` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `actorRole` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `action` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `targetTable` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `targetId` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `meta` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `createdAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## BannerRequest

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

## BannerResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `id` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `title` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `imageUrl` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `targetUrl` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `position` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `displayOrder` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `isActive` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `clickCount` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `startDate` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `endDate` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `createdAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `updatedAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## Callback

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `paymentId` | string(uuid) | Có | Không khai báo trong schema; xem service/rules |
| `orderId` | string(uuid) | Có | Không khai báo trong schema; xem service/rules |
| `amount` | number | Có | minimum=0 |
| `result` | string | Có | pattern=SUCCESS\|FAILED |
| `signature` | string | Có | Không khai báo trong schema; xem service/rules |

## ClaimResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `id` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `warrantyId` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `description` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `images` | array<string> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `status` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `assignedTo` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `assigneeName` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `assigneePhone` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `internalNotes` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `createdAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `resolvedAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `serialNumber` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `deviceName` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `customerName` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `customerPhone` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `customerAddress` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `faultCategory` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `warrantyStartDate` | string(date) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `warrantyEndDate` | string(date) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## ClaimStatusUpdateRequest

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `status` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## ContentSummaryStatsResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `totalArticles` | integer(int64) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `publishedArticles` | integer(int64) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `totalBanners` | integer(int64) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `activeBanners` | integer(int64) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `totalReviews` | integer(int64) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `pendingReviews` | integer(int64) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `totalFaqs` | integer(int64) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## Control

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `command` | string | Có | pattern=LOCK\|UNLOCK\|TARE |
| `requestKey` | string(uuid) | Có | Không khai báo trong schema; xem service/rules |

## CreateOrder

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `shippingAddress` | string | Có | maxLength=2000, minLength=0 |
| `items` | array<Item> | Có | maxItems=100, minItems=0 |

## CreateStaffRequest

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `fullName` | string | Có | Không khai báo trong schema; xem service/rules |
| `email` | string | Có | Không khai báo trong schema; xem service/rules |
| `phone` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `role` | string | Có | Không khai báo trong schema; xem service/rules |
| `defaultAddress` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `initialPassword` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## Customer360Response

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `profile` | UserProfileResponse | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `orders` | array<OrderResponse> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `devices` | array<DeviceResponse> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `warrantyClaims` | array<ClaimResponse> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## DashboardStatsResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `totalRevenue` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `revenueGrowth` | number(double) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `totalOrders` | integer(int64) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `ordersGrowth` | number(double) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `activeDevices` | integer(int64) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `totalDevices` | integer(int64) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `pendingWarranties` | integer(int64) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `monthlyRevenue` | array<MonthlyRevenueItem> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `productSales` | array<ProductSalesItem> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `recentOrders` | array<OrderResponse> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## DeviceAssignment

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `orderItemId` | string(uuid) | Có | Không khai báo trong schema; xem service/rules |
| `deviceId` | string(uuid) | Có | Không khai báo trong schema; xem service/rules |

## DeviceEventResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `id` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `deviceId` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `deviceSerial` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `eventType` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `payload` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `createdAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## DeviceResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `id` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `productId` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `productName` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `ownerId` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `ownerName` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `ownerPhone` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `serialNumber` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `name` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `locationLabel` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `status` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `batteryLevel` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `firmwareVersion` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `lastSeenAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `createdAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `macAddress` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `chipModel` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `publicIp` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `localIp` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `geoCity` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `mapX` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `mapY` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `lockStatus` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `wifiRssi` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `pingMs` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `doorStatus` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `weightKg` | number(double) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `packageDetected` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `scaleReady` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `deviceState` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `mqttTopicId` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## DeviceStatusUpdateRequest

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `status` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## Export

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `format` | string | Có | pattern=PDF\|XLSX |
| `params` | object | Có | Không khai báo trong schema; xem service/rules |

## FaqRequest

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `question` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `answer` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `category` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `displayOrder` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `isPublished` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## FaqResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `id` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `question` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `answer` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `category` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `displayOrder` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `isPublished` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `helpfulCount` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `createdAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `updatedAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## Item

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `variantId` | string(uuid) | Có | Không khai báo trong schema; xem service/rules |
| `quantity` | integer(int32) | Không khai báo @NotNull trong schema | maximum=99, minimum=1 |

## LockUpdateRequest

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `isLocked` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `reason` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## LoginRequest

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `email` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `password` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## LoginResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `success` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `message` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `userId` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `email` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `fullName` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `role` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `accessToken` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `refreshToken` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `tokenType` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `expiresIn` | integer(int64) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `token` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## MessageTemplate

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `id` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `code` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `name` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `description` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `channel` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `subject` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `body` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `variables` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `isActive` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `updatedAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## MonthlyRevenueItem

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `month` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `label` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `revenue` | number(double) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `orders` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## NotesUpdateRequest

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `notes` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## OrderItemResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `id` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `productId` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `variantId` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `sku` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `variantName` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `subtotal` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `productName` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `quantity` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `unitPrice` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## OrderResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `id` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `userId` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `customerName` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `customerPhone` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `shippingAddress` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `trackingNumber` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `status` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `total` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `paymentMethod` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `paymentStatus` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `transactionRef` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `itemsSummary` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `createdAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `updatedAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `items` | array<OrderItemResponse> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## OrderStatusUpdateRequest

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `status` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## PaymentMethod

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `id` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `name` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `isActive` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## Preference

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `enabled` | boolean | Có | Không khai báo trong schema; xem service/rules |

## ProductCategory

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `id` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `name` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `slug` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## ProductRequest

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

## ProductResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `id` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `categoryId` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `categoryName` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `sku` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `name` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `description` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `price` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `images` | array<string> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `stockQuantity` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `isActive` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `createdAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `variants` | array<ProductVariantResponse> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## ProductReviewResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `id` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `productId` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `productName` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `customerName` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `customerEmail` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `customerPhone` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `rating` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `title` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `comment` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `images` | array<string> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `status` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `rejectReason` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `adminReply` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `adminRepliedAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `createdAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## ProductSalesItem

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `id` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `name` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `sub` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `percent` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `revenue` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `color` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## ProductVariantRequest

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `id` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `variantName` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `sku` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `priceDelta` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `stockQuantity` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `isActive` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `size` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `capacityLiter` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## ProductVariantResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `id` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `productId` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `variantName` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `sku` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `priceDelta` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `calculatedPrice` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `stockQuantity` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `isActive` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `size` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `capacityLiter` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## PromotionRequest

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

## PromotionResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `id` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
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
| `createdAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `updatedAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## Quantity

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `quantity` | integer(int32) | Không khai báo @NotNull trong schema | maximum=99, minimum=1 |

## Reason

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `reason` | string | Có | maxLength=2000, minLength=0 |

## RefreshTokenRequest

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `refreshToken` | string | Có | Không khai báo trong schema; xem service/rules |

## RefreshTokenResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `success` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `message` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `accessToken` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `refreshToken` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `tokenType` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `expiresIn` | integer(int64) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## RefundCompletion

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `providerRef` | string | Có | maxLength=200, minLength=0 |

## Registration

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `serialNumber` | string | Có | maxLength=100, minLength=0 |
| `variantId` | string(uuid) | Có | Không khai báo trong schema; xem service/rules |
| `mqttTopicId` | string | Có | pattern=[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)+ |
| `name` | string | Không khai báo @NotNull trong schema | maxLength=100, minLength=0 |

## ResetPasswordResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `success` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `message` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `updatedPassword` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## ReviewReplyRequest

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `adminReply` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## ReviewStatusUpdateRequest

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `status` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `rejectReason` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## RoleUpdateRequest

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `role` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## SendOtpResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `success` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `message` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `email` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `previewOtp` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `emailSent` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## Shipment

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `carrier` | string | Có | maxLength=200, minLength=0 |
| `trackingNumber` | string | Có | maxLength=200, minLength=0 |

## ShippingMethod

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `id` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `name` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `fee` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `isActive` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## StockAdjustRequest

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `delta` | integer(int32) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## SystemSettingsResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `messageTemplates` | array<MessageTemplate> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `shippingMethods` | array<ShippingMethod> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `paymentMethods` | array<PaymentMethod> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## TemplateUpdateRequest

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

## TestSendResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `success` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `channel` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `recipient` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `renderedSubject` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `renderedBody` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `message` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `isRealSent` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## TestSendTemplateRequest

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `templateCode` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `recipientEmail` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `recipientPhone` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `customSubject` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `customBody` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `mockVariables` | object | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## Token

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `token` | string | Có | maxLength=4096, minLength=0 |

## TrackingUpdateRequest

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `trackingNumber` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## UserProfileResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `id` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `fullName` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `phone` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `email` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `avatarUrl` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `defaultAddress` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `role` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `isLocked` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `is2faEnabled` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `createdAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `updatedAt` | string(date-time) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## ValidateCouponRequest

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `code` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `orderTotal` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## ValidateCouponResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `message` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `code` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `discountType` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `discountValue` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `discountAmount` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `originalTotal` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `finalTotal` | number | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `promotionId` | string(uuid) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `isValid` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## VerifyResetPasswordRequest

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `otp` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `newPassword` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |

## WarrantyLookupResponse

| Field | Kiểu | Required | Constraint |
|---|---|---|---|
| `serialNumber` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `productName` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `variantName` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `status` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `statusLabel` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `startDate` | string(date) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `endDate` | string(date) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `remainingDays` | integer(int64) | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `isValid` | boolean | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `ownerNameMasked` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `ownerPhoneMasked` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `locationLabel` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `deviceStatus` | string | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `features` | array<string> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
| `hardwareSpecs` | array<string> | Không khai báo @NotNull trong schema | Không khai báo trong schema; xem service/rules |
