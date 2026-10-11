# Proposed API Contract — CHƯA TRIỂN KHAI

Các endpoint dưới đây chưa tồn tại trong114operations đã audit. Nghiệp vụ giao+lắp là **PLANNED**; paths/DTO/error codes là **PROPOSED**, cần backend chốt. Không gọi từ frontend production và không đưa vào danh sách IMPLEMENTED.

## Delivery Installation

Tận dụng role `technician`: một nhân viên nội bộ thực hiện cả giao và lắp. Một job/order; chỉ tạo sau TicketAPPROVED và Orderconfirmed. Technician chỉ xem/cập nhật job được giao; super_admin/support_agent điều phối. Customer chỉ nhận projection của job thuộc đơn mình, không có ghi chú nội bộ/bằng chứng nhạy cảm.

Shared contract: Bearer token thật, profile chưa khóa; JSON body; IDs UUID; timestamps ISO8601 có offset; notes/reasons tối đa2.000ký tự. Mutations dùng `Idempotency-Key` UUID; job tồn tại dùng `If-Match: <version>`. Cùng key/payload trả kết quả đã lưu; khác payload409. Version/assignment kiểm tra trong transaction, history/outbox cùng transaction. GET có thể gọi lại; networktimeout cần GET để xác minh, không replay với key mới. Page0/size20, size1–100; PageJob `{content,page,size,totalElements,totalPages}`. Sort dự kiến scheduledAt rồiid, cần chốt khi implement.

Job DTO: `{id,orderId,assignedTo,status,scheduledAt,startedAt,deliveredAt,installedAt,completedAt,installationNote,failureReason,version,attempt,devices[],history[]}`. Staff projection có contact/address tối thiểu; customer projection chỉ lịch hẹn/tiến độ/thông báo phù hợp. Device entry: `{orderItemId,deviceId,serialNumber,productName,variantName,hasWeightSensor,checks[]}`. Check: `{type,result,observedAt,commandId?,readingId?,reason?}`; capability và kết quả từ server. Không nhận client `pass:true` làm bằng chứng.

| Method/path PROPOSED | Auth / request | Preconditions / side effects | Response / lỗi đề xuất / screen |
|---|---|---|---|
| POST `/api/orders/{id}/delivery-installation` | super/support; `{assignedTo:UUID,scheduledAt:ISO8601,installationNote?:string}` | TicketAPPROVED, orderconfirmed; technician hoạt động, chưa khóa; chưa cójob; tạoASSIGNED/history/emailassignment+appointment |201Job;400assignee/time;409JOB_ALREADY_EXISTS/ORDER_NOT_CONFIRMED; AdminPlanning |
| GET `/api/delivery-installations/my-jobs` | technician; page,size,status? | SQL filterassigned_to=principal |200PageJob;400filters/403; MyJobs mobile |
| GET `/api/delivery-installations` | super/support; page,size,status?,assignee? | Danh sách điều phối; không cho technician đọc tất cả |200PageJob;400/403; AdminPlanning |
| GET `/api/delivery-installations/{id}` | assigned technician, super/support hoặc customer chủ đơn | Assignment/orderowner; customer projection riêng |200Job;403/404; StaffJobDetail / CustomerTracking |
| POST `/{id}/start` | assigned technician; emptybody, key/version | ASSIGNED→IN_PROGRESS; startedAt server, history |200Job;409INVALID_JOB_TRANSITION/STALE_JOB_VERSION |
| POST `/{id}/confirm-delivery` | assigned technician; `{note?:string}` | IN_PROGRESS→DELIVERED; giao vật lý, chưa hoàn thànhOrder |200Job;409state; StaffJobDetail |
| POST `/{id}/devices` | assigned technician; `{orderItemId:UUID,deviceId:UUID,serialNumber:string}` | IN_PROGRESS/DELIVERED; đúng product/variant/count, chưa thuộc khách khác; gắnsaleitem/owner theo policy xác minh |200Job;409DEVICE_ALREADY_ASSIGNED/DEVICE_VARIANT_MISMATCH; StaffSerial |
| POST `/{id}/checks/lock` | assigned technician; `{deviceId:UUID,action:LOCK hoặc UNLOCK,requestKey:UUID}` | Device thuộcjob, MQTTconfigured; installation service cóscope riêng trướcactivation; durablecommand |202`{commandId,status}`;503brokerconfig/409offline; StaffChecks |
| GET `/{id}/checks` | assigned technician/super/support | Tínhcheck từ sale/owner/serial, ACK vàtelemetry đúngdevice; Pro thêmweight evidence |200Check[] pending/pass/fail+reason; StaffChecks |
| POST `/{id}/confirm-installation` | assigned technician; `{installationNote:string}` | DELIVERED, đủserial/owner, cấu hình kết nối được quan sát; INSTALLED/history |200Job;409INSTALLATION_EVIDENCE_INCOMPLETE |
| POST `/{id}/acceptance` | assigned technician; `{customerAccepted:boolean,note?:string,lockCommandIds:UUID[]}` | INSTALLED; revalidate mọi serial/check; attestation audit; atomicjobCOMPLETED+ordercompleted+history+outbox |200Job;409ACCEPTANCE_CHECKS_FAILED/STALE_JOB_VERSION; StaffAcceptance |
| POST `/{id}/fail` | assigned technician; `{failureReason:string}` nonblank | Stage chưa terminal→FAILED; giữ handover/installationhistory; không tự trảkho/hủyOrder |200Job;400reason/409state |
| POST `/{id}/reassign` | super/support; `{assignedTo:UUID,scheduledAt:ISO8601,reason:string}` | FAILED hoặcASSIGNED theo policy; cùngjob, attempt/version+1; giữhistory, vô hiệuchecks cũ |200JobASSIGNED;409stale/400assignee; AdminPlanning |

Shorthand `/{id}` dùng prefix `/api/delivery-installations`. Các tên lỗi là đề xuất, chưa là backend error token. UUID/body là placeholder cấu trúc, không dữ liệu demo.

### Acceptance gate

Mỗi serial đúng item/SKU đã xuất bán, không thuộc khách khác, owner khớp khách mua; topic/backendconnection và telemetry mới; LOCK/UNLOCK test cần commandId đúngdevice, ACKSUCCESS và trạng thái khóa/cửa thực tế tương ứng. Pro thêm reading trọng lượng hữu hạn từ sensor thật và phép kiểm tra hiệu chuẩn/biến động theo policy kỹ thuật. Base không yêu cầu cân. PublishMQTT thành công chưa đủpass.

Freshness≤90s và commandtimeout10s là **đề xuất**, cần chốt acceptancewindow/correlation/calibration. Không dùng clientonline/weight0 để pass. Reassign giữ handover/install trong history/timestamps, không giả thiết thiết bị đã giao quay vềkho; attempt mới phải kiểm tra lại, không dùng ACK phiên cũ. Race reassign/acceptance chặn bằng version và khóa nhất quán order→job→serial→command.

Phải thay gate `FulfillmentService.delivered`, chặn shipment cũ bypass nghiệm thu. Sale/owner có thể liên kết sau giao được xác minh, activation sau acceptance. Biên bản/photo/chữ ký/customerOTP/upload chưa chốt, không tuyên bố đã cóAPI.

## Customer prerequisites — PROPOSED

| Endpoint | Contract / quyền | Gap hiện tại |
|---|---|---|
| POST `/api/auth/register` | public `{email,password,fullName,phone?}`; Supabase signup + serverprofile customer | Shop gọi route chưa có; cần verifyemail/provisioning/RLS. SDKsignup là phương án khác chưa xác minh |
| GET/PATCH `/api/profile/me` | owner; patchwhitelist `{fullName,phone,defaultAddress}` | Không dùng adminusers thay selfservice |
| GET/POST/PATCH/DELETE `/api/addresses` | owner; recipient/phone/address/default, giới hạn số địa chỉ | Hiện chỉ defaultAddress text |
| GET `/api/orders/{id}/payment-summary` | owner hoặc staff được phép; payment/refundstatus/amount/provider/updatedAt, không secret | OrderView thiếu phân biệtfailed/expired/late-refund |
| POST `/api/orders` thêmclientRequestId | Unique(user,clientRequestId), samepayloadretry | Createhiện không idempotency, timeout có thể duplicate draft |
| GET `/api/public/articles`, `/faqs`, `/banners`, `/reviews` | Public published/active/approved projection, HTMLsanitized | AdminCMS hiện staff-only |
| GET `/api/public/products/{id}` | Active-only; variants/features/hasWeightSensor/dimensions/assets | Hiện list+variants, thiếu detail/capabilityDTO |
| GET `/api/warranty/my-warranties`; POST `/api/warranty/claims` | Owner; solddevice/warrantyeligible; description/file refs khi cóuploadcontract | Existing`/api/warranties` staff-only; thiếu autoissue/customerclaim |

Namespaces singular/plural là thiết kế chưa chốt, không route thực. Không hardcode warranty24tháng hoặc giá/địa chỉ từmock. Admin proposals: category/paymentmethod/warrantypolicyCRUD; ordersearch/filter; restrictedtechnicianlookup; scopewarrantyassignedread; jobemailtemplates; unifiedcommandDTO/errorcodes; CORSexposeX-Trace-Id/Content-Disposition/Retry-After. Mọi implementbackend thuộc nhiệm vụ riêng.
