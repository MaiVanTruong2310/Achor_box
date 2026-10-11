"""Write reviewed handoff prose; application files are never touched."""
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]
documents={
'contracts/PROPOSED-API.md':'''# Proposed API Contract — CHƯA TRIỂN KHAI

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
''',
'17-BACKEND-GAP-ANALYSIS.md':'''# 17 — Backend gaps và rủi ro tích hợp

Snapshot10/10/2026. Có code không đồng nghĩa provider/hardware production đã kiểm chứng. Nhiệm vụ này chỉ phân tích; không sửa ứng dụng. API mới ở [Proposed Contract](contracts/PROPOSED-API.md).

| ID / ưu tiên | Bằng chứng hiện trạng | Tác động frontend / cần hoàn thiện | Trạng thái / gate |
|---|---|---|---|
| GAP01 P0 | FulfillmentService.delivered hoàn thànhOrder sau giao đủserial; không kiểm tra lắp/khóa/cân | Thêm mộtjob/order và acceptance server; chặn route cũ bypass | PLANNED; AT40–49 |
| GAP02 P0 | assign cho technician nhưng không kiểm tra job được giao | Scope theo assignment; projection tối thiểu, crossjob403 | PARTIAL |
| GAP03 P0 | Không entity/API/schedule/history/version/evidence cho deliveryinstallation | Tracking/MyJobs featureflagoff tới khi backend sẵn sàng | MISSING/PROPOSED |
| GAP04 P0 | PaymentService.checkout luôn dùng mock; paymentURL trảJSON/demo cầnBearer | Gateway thật, callback/reconcile/refund cần implement và test | PARTIAL; productionpayment blocked |
| GAP05 P0 | Secret kiểm tra trong sign/callback, chưa kiểm tra khi checkout | Có thể tạoawaiting_payment rồicallback503; cần failfast readiness | PARTIAL |
| GAP06 P0 | POSTorder chưa có key/clientRequestId | Timeout có thể duplicate drafts và giữkho hai lần; thêm idempotency | PARTIAL |
| GAP07 P0 | Jobs mặc định tắt, expiry worker cần flags | FEtimer không giải phóngkho; cấu hình/monitoring vận hành | CodeIMPLEMENTED, opsNOTVERIFIED |
| GAP08 P0 | Shop mockdefault; authmapper sai; order khôngBearer; CheckoutPage dùng payload cũ/success sau draft | Sửa frontend ở task riêng theo11; không giả đã thanh toán | FRONTEND MISMATCH |
| GAP09 P0 | Admin api.ts fallback ghiSupabase sauHTTPerror; headers/void handling chưa đúng | Bỏ DB/mockfallbackwrite, giữ HTTPerrors, mapper riêng | FRONTEND MISMATCH |
| GAP10 P1 | OrderView thiếu payment/refundsummary | Resultpage không đoánfailed/expired/refunded; thêm owner-safe summary | MISSING |
| GAP11 P1 | Chưa register/selfprofile/addressbook/customerrecovery API | Chốt SDK+RLS hoặc backend routes, không dùng adminAPI bù | MISSING |
| GAP12 P1 | ProductResponse/my-devices thiếu capability/features/dimensions | Không suy TARE/weight từname; typed capability DTO perSKU/device | PARTIAL |
| GAP13 P1 | Publiccatalog có inactive; no productdetail; legacyPUTstock chưa đầy đủledger | Active projection, giữvariantUUID, tập trung stockmovement | PARTIAL |
| GAP14 P1 | CommandPOST mới cócommandId, reuse cóid; legacy nullweight códefault0 | Adapter tạm; typed nullableDTO, không fakeweightBase | PARTIAL |
| GAP15 P1 | Activation cầnordercompleted; ownercommand cầnactivated | Jobcommand cần permission riêng trướcactivation, không bypassowner API | PLANNED |
| GAP16 P1 | ACK primitive cóguards; broker/firmware chưaE2E | Gate cần ACK+telemetry cùngdevice, freshness, Procalibration | PrimitiveIMPLEMENTED; hardwareNOTVERIFIED |
| GAP17 P1 | Không SSE/WebSocket; manualhealthPATCH khác telemetry | Poll cóvisibility; serverhealth/freshness rõ | PARTIAL |
| GAP18 P1 | Outbox lease/retry; externalSMTP/FCM at-least-once | Không hứa exactly-once gửimail; monitoring/providerdedup | IMPLEMENTED; providerNOTVERIFIED |
| GAP19 P1 | Jobemails chưa có; Settings templates tách Thymeleaf; test-send cósimulation | Assignment/schedule/acceptance templates; labelpreview≠sent | MISSING/PARTIAL |
| GAP20 P1 | CMS hiện staff-only | Public published/active/sanitized projection hoặc approvedstaticcopy | MISSING |
| GAP21 P1 | Warranty chưaownerclaim/autoissue/policyCRUD; deviceFK khôngunique | Chốt thời hạn/issuedate/cardinality; không warranty24months giả | MISSING/PARTIAL |
| GAP22 P1 | Technician warrantyread rộng, mutationassigned-only | Review readscope và contactprojection | PARTIAL |
| GAP23 P1 | Staffprovision/recovery cóadapter, chưaproviderE2E; verifyreset503 | Chốt recoveryURL/providerflow; không hotlineOTP giả | PARTIAL/NOTVERIFIED |
| GAP24 P1 | CORS chưaexpose trace/download/retry headers | ExposeX-Trace-Id/Content-Disposition/Retry-After; FEfallback filename/cooldown | MISSINGconfig |
| GAP25 P2 | LegacyDTO thiếu@Valid, paginationâm có thể500, errorsmixed | Chuẩn hóa validation/errorcodes; không hứa mọiinputbad đều400 | PARTIAL |
| GAP26 P2 | Corearraylists thiếutotal/statusfilters; DTOorderslegacy kháccore | Per-response adapter; loadmore, serversearch nếu cần | PARTIAL |
| GAP27 P1 | Dailyrevenue lọccorestatus/paidAt; gross/refund là dòngtiền riêng; minAmount không áp dụnggross/refund | Chốt metric/filter scope và timestampdimension; ghi rõ trong reportUI | PARTIALsemantics |
| GAP28 P2 | Dashboardtimeout khôngcancel mọiJDBC; topnamesnulllegacy; KPIcũ khác | Renderpartial/null riêng, querytimeout/metricdefinition | IMPLEMENTED/opsrisk |
| GAP29 P1 | db.sql cólegacy; workflowversionguard, migrationsmanual | Không tựbackfillpaid/kho lịch sử; dryrun/reconcile ởtask riêng | TargetDBNOTVERIFIED |
| GAP30 P1 | Chưa readinessendpoint; credentialSMTP/FCM/MQTT/payment riêng | Opsprobes/config; không frontendsecret | NOTVERIFIEDenvironment |
| GAP31 P2 | ManualauditDTO cóactorinput; legacyhistory chưa phủmọiwrite | Review serveractortrust/auditcoverage/redaction | PARTIAL |
| GAP32 P1 | Chưa xác minh GLB/realviews/Flutterbuild/store | Viewerillustration/posterfallback, marketingclaimsreview | NOTVERIFIEDassets |

## Backend tối thiểu cho giao+lắp

Dùng technician hiện hữu và assignedjob permission. Migrationdelivery_installations uniqueorder_id, version/attempt/history; deviceevidence có commandId/readingtimestamps. Assignment sauAPPROVED/confirmed; sixjobstatuses theo04; FAILED cầnreason, reassign cùngjob giữphysicalhistory và kiểm tra lại. Customer chỉownorder, technician chỉassigned, super/support điều phối.

DELIVERED hoặcINSTALLED không hoàn thànhOrder. Acceptance transaction phải xác minh mọi serial/SKU/saleitem/owner/onlinefresh/ACK+telemetry/Proweight/customerattestation, rồi ghijobCOMPLETED+ordercompleted+history+outbox. Race reassign/cancel/ownership được khóa và versionguard; route shipment cũ không bypass. Photo/signature/customerOTP/upload chưa chốt, không tuyên bố implementation.

## Readiness

Core draft/reservation/paymentmock/PO/outbox có code và test source. Websiteproduction và giao+lắp mới còn blockers trên. 114routesSwagger chỉ xác nhận metadata. [Validation](validation/REPORT.md) phân biệt startup/runtime, testsource cũ và những integration/hardware chưa chạy.
'''
}
for name,body in documents.items():(OUT/name).write_text(body,encoding='utf-8')
print('Reviewed proposed contracts and gap analysis written.')
