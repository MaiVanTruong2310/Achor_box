# 17 — Backend gaps và rủi ro tích hợp

**Cập nhật DeliveryInstallation:** phần giao/lắp đặt PLANNED trong snapshot này đã được triển khai. Xem [cập nhật và hợp đồng hiện tại](DELIVERY-INSTALLATION-IMPLEMENTED.md).

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
