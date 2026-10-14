# Response Map — bổ sung cho Swagger

Đọc SQL aliases và Map.put/Map.of trong service, không suy diễn từ `additionalProperties`. Tất cả ví dụ `<UUID>`, `<ISO8601>` là placeholder shape. Trường nullable giữ null; không đổi null thành0 hoặc mảngrỗng nếu có ý nghĩa khác. SQL raw rows dùng snake_case, typed DTO thườngcamelCase.

## OrderView — OrderWorkflowService.view

Áp dụng POST orders, GET detail, mutateitems, cancel, shipmentship/deliver. ticket/shipment **là array**, không object/null. Nhiều DB constraint giới hạn tốiđa1 nhưng response vẫn array.

```json
{
  "id":"<UUID>","orderId":"<UUID>","userId":"<UUID>",
  "status":"pending","shippingAddress":"<địa chỉ khách nhập>",
  "total":0,"totalAmount":0,"paidAt":null,"expiresAt":"<ISO8601>",
  "createdAt":"<ISO8601>","updatedAt":"<ISO8601>",
  "items":[{"id":"<UUID>","productId":"<UUID>","variantId":"<UUID>","sku":"<SKU>","productName":"<snapshot>","variantName":"<snapshot>","size":null,"capacityLiter":null,"unitPrice":0,"quantity":1,"subtotal":0}],
  "ticket":[],"shipment":[]
}
```

unitPrice/subtotal/total BigDecimal→number; size/capacity nullable; statuscorelowercase; time fields nullableISO8601 theoJDBCvalue. History không embedded ở view; GET history array rows id/order_id/from_status/to_status/changed_by/reason/created_at. `mine` trả array `{id,status,total,shippingAddress,paidAt,createdAt}` (không items/payment/ticket metadata). Phải GET detail khi mởrow.

Không có `payment`, `refund`, order.code, recipientPhone/name, note, shippingFee, paymentMethod hoặc statusHistory trong OrderView; các field tươngtự DTO legacy/mocks không được frontend tự điền thành sự thật. Backendgap payment/refund customer summary.

## Checkout và callback — PaymentService

Checkout trả `{orderId:string,status:"awaiting_payment",paymentId:string,amount:number,paymentUrl:string,expiresAt:string}`. Cachedresponse nguyênlầnđầu, không lateststatus. Callback `{acknowledged:true}` không chứa Order; chỉ gateway/mock backend gọi, frontendreloadorder.

Demo GET payment rawrow: id/order_id/amount/status/provider/transaction_ref/paid_at/expires_at/created_at; POSTcomplete cũng `{acknowledged:true}`. Demo routes chỉ profile demo và owner.

## Ticket — ApprovalTicketService

List trả rawrowarray `{id,order_id,status,review_round,reason,created_at,updated_at}`. Detail/action thêm `history:[{id,ticket_id,action,actor_id,reason,created_at}]`. UUIDstrings; reasonnullable; CREATED actor NULL hệ thống. Không reviewerName/customerName/profileembedded. Frontend lookup authorizedcustomercontext hoặc hiển thịactorIDshort; không giả tên nhân viên. Action resubmit resultRETURNED→PENDING tănground. Customer lấy ticket ID từ Order Vi ew.

## Shipment — FulfillmentService/OrderView

Row `{id,order_id,carrier,tracking_number,status,created_at,delivered_at}`. No assignee/scheduled_at/installed_at/acceptance. Ship/deliver trả Order Vi ew, assignmentPOST trả `{assigned:true}`. Histories shipment DB có nhưng **không GET shipment history riêng**; Order history không thay cho chi tiết job.

RefundGETstaff trả rawrows `{id,payment_id,order_id,amount,status,reason,provider_ref,created_at,completed_at}`; POSTcomplete `{completed:true}`. StatusPENDING/COMPLETED uppercase. No customerrefundAPI/providerETA.

## Variant stock adjustment

`VariantInventoryService.adjust` trả `{id,product_id,stock_quantity}` với stock integer. Productlegacyadjust trả ProductResponse. Không assume rawstockreply có stockQuantity camelCase. PUTproductexistingvariant có thể đặt absoluteqty, còn endpoint stock patch là delta.

## Email admin — OutboxService

GETemails trả `{content:[{id,template,reference_id,recipient,status,attempts,last_error,next_attempt_at,created_at,sent_at}],page:0,size:20,totalElements:0}`. Payload snapshot/claim token không được list trả. POSTresend `{queued:true}`; business200 không có `emailSent` đảm bảo. Customer không có quyền đọc email admin.

## DeviceWorkflowService

- Register `{deviceId:<UUID>,serialNumber:<string>}`.
- Activate `{activated:true}`; không claim online đã confirmed.
- Mydevices array `{id,serial_number,name,status,door_status,lock_status,weight_kg,package_detected,last_seen_at,activated_at}`; không productId/capability/variant ởprojectionnày.
- Command POST mới `{commandId:<UUID>,status:"PENDING"}`. **Idempotent reuse trả raw existing row với `id`, không luôn `commandId`**. Adaptertemporary `commandId = response.commandId ?? response.id`; cần backend thống nhất DTO.
- CommandGET `{id,status,attempts,last_error,ack_at}`; ACK status không đồng nghĩa physicaltelemetry. Do notmap statusSENT thành “đã mở”.
- Packages rawrows `{id,device_id,weight_kg,detected_at,collected_at,status}`; Readings `{id,device_id,weight_kg,distance_cm,door_status,payload,received_at}`.

Sensor readings dùng `received_at`; GET readings sắp xếp theo trường này. payloadjsonb đọc ra DB repre sent ation tùydriver; dùng field typed không parse payload để control UI.

## Notifications — PushNotificationService

TokenPOST `{id:<UUID>}`; remove/read/preference controllervoid→HTTP200 không body (không `res.json()` vôđiềukiện). Listrow notification gồm id/user_id/device_id/type/title/body/is_read/created_at. List array không total metadata. PreferencesPACKAGE_DETECTED only. Tokenotherowner403, neverdisplaytoken.

## ConcurrentDashboardService

`{date:"yyyy-MM-dd",revenueToday:number|null,orderCountByStatus:object|null,top5Variants:array|null,lowStockVariants:array|null,partial:boolean,failedParts:string[],elapsedMs:long}`. Counts đủ6 core UPPERCASE. Toprows `{variantId,productId,name,variantName,sku,quantitySold}`; name có thể NULL legacy item no snapshot. Lowstock `{variantId,productId,name,sku,stock}`. Arrayrỗng là không có data, null là lỗi/timeout; không gộp hai trạng thái.

## Reports

Definition `{code,name,params:[{name,dataType,required,maxDays}]}`. POST export trả bytesPDF/XLSX, Content-Dispositionfilenamecode_date_date. `INVALID_REPORT_PARAMS` có code**string**,message,errorslistparam/reason,timestampUTC+7; source không có `expected` formatfieldmặc dùD4vídụghi. Gross paid/refunded/net thể hiện trong file, không public data JSON endpoint.

## Pagination legacy

Pagedwrappers từ PaginationUtil: `content,currentPage,totalElements,totalPages,pageSize,numberOfElements,isFirst,isLast,hasNext,hasPrevious`. Types contentArray,longcounts,intpaging,boolflags. Corearraylists page0/size20/max100 không wrapper. Legacy0/10 chưa uniformlyvalidatepage/size, input âm có thể500; frontendclampvalidrange như ng backend gapstillreport.

## Error envelope và timestamp

Normal AppException: `{code:409,message:"INSUFFICIENT_STOCK: ...",timestamp:"<local datetime>"}`; data null bị Json Include omit. Beanvalidation `{code:400,message:"Dữ liệu đầu vào không hợp lệ",data:{"items[0].quantity":"..."},timestamp:"..."}`. timestamp normal LocalDateTime không offset, khác reportOffsetDateTimeUTC+7: đừngconvertnaive như UTC. Source GlobalExceptionHandler/ApiResponse.

ResponseheaderX-Trace-Id hiện không được CORS exposed headers nên cross-originJS có thể không đọc được; Content-Disposition cũng không exposed. Bổ sung backend config trước khiUI đọc file name/trace; download fallback file name tự dựng from request ed range hợp lệ.

Dashboard có thêm `demo:boolean,mode:parallel|sequential`. Xem [REQ05_DASHBOARD.md](../../../backend/docs/REQ05_DASHBOARD.md).
