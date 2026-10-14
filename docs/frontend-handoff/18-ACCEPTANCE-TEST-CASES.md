# 18 — Acceptance test cases

**Cập nhật DeliveryInstallation:** phần giao/lắp đặt PLANNED trong snapshot này đã được triển khai. Xem [cập nhật và hợp đồng hiện tại](DELIVERY-INSTALLATION-IMPLEMENTED.md).

Đây là bộ test bàn giao, không báo đã chạy tất cả. “Source test” chỉ là bằng chứng test tồn tại và kết quả lịch sử nếu cóXML; các case frontend/newjob/provider/hardware vẫn phải chạy ở phase tương ứng. Dữ liệu test do team tạo riêng, không copy khách/sản phẩm/giá từ requirements. Shared setup: ít nhất2customer, từng role nội bộ, SKU active/inactive có stock, serial chưabán/đãbán, orderworkflow2/legacy1; credential riêng không ghi vào artifact.

| ID / module / trạng thái | Setup → thao tác | Kết quả mong đợi / evidence |
|---|---|---|
| AT01 Auth / source test | Guest đọc private order rồi publiccatalog | Private401/public200; token invalid không trởthànhguest; SecurityTests |
| AT02 Auth / source test | Customer gọiadminwrite; token role giả hoặc profile locked |403/401; role từDB, nofallbackSupabase; SecurityTests |
| AT03 Auth / cầnFE/provider | Loginresponseflat; expired token nhiềurequests; refreshfail | Mapping id entity đúng; single flight; logoutclearcache; nofakeJWT |
| AT04 RBAC / cầnFE | Technician/customer vào route admin không quyền | Navẩn + server403; dữ liệu cũ không lộ; không chuyển fallbackDB |
| AT05 Catalog / cầnFE | SelectBase/Pro/SML với API variants thiếu field | UUID/price/kho đúng; nullablecapacityunknown; no fake price/dimensions |
| AT06 Catalog / source rule+cầnFE | Inactive/outstockSKU được POSTdraft |400PRODUCT_INACTIVE/409INSUFFICIENT_STOCK; UIrefreshstock |
| AT07 Inventory / source test | Staff delta khiến stock âm hoặc vượtlimit |409/400; stock ledger/counter nhấtquán; manualVariantAdjustment... |
| AT08 Draft / source test | Duplicate variant cùng request, qty tổng1–99 | Một row, summedquantity, snapshot, total; createDuplicatesMerge... |
| AT09 Draft / source test | qty0/100 hoặc merged>99 |400; transaction rollback không reserved stock/historydangling |
| AT10 Concurrency / source test | Hai order đồng thời tranhstock cuối | Chỉ qty hợp lệ thành công, loser409, stock không âm; concurrentInventory... |
| AT11 Snapshot / source test | Draft đã reserve; thaycatalogprice rồiaddsamevariant | Giá first snapshot giữ nguyên; server quantity/subtotal đúng |
| AT12 Expiry / source test | Draftexpired, worker chạy nhiều lần | Cancel/releaseexactlyonce; client timer không mutation; draftExpiry... |
| AT13 Ownership / cầnFE+source | CustomerA đọc/edit/cancelOrderB |403không data; ownercacheclearslogout |
| AT14 Create timeout / cầnFE / gap | Servercreate thành công như ng response mất | UIunknownoutcome/myordersreconcile; không autoPOST lại; idempotencycreategap |
| AT15 Checkout / source test | Cùng order/key hai lần/concurrent | Same payment/snapshot response24h; một payment active; checkoutIdempotency... |
| AT16 Checkout / source test | Missing key, keyforotherorder, empty pending |400/409; nofinancialmutation; amountMismatch... |
| AT17 Callback / source test | Wrongsignature/order/amount |401/400; order payment history/kho không đổi |
| AT18 Callback / source test | Valid success repeated |paidAt/ticket/history/outbox chỉ tạo một lần; terminalACK200 |
| AT19 Rollback / source test | Injectfailure sau order paid trước commit | Toàn bộ payment/order/ticket/history/outbox rollback; paidTransaction... |
| AT20 Payment expiry / source test | FAILED/timeout rồicancelrepeat | Cancel/releaseonce; no duplicate ledger; failedPayment... |
| AT21 Latecallback / source test | SUCCESS sau cancel/expiry | Order cancelled, payment refund_required, refundPENDING; không reopen |
| AT22 PaymentUI / cầnFE | URL?success=true như ng order awaiting/unknown | Không success giả; GET order/pollbounded; demo URL JSON không gateway production |
| AT23 Ticket / source test | Hai admin review cùng PENDING | Một final decision, contender409TICKET_ALREADY_REVIEWED; concurrentTicketReview... |
| AT24 Return/resubmit / source test | Returnwithreason; owner resubmit | RETURNED→PENDING round+1, history/reason; order paid, itemfrozen |
| AT25 Paid items / source rule+cầnFE | PATCHqty/price saupaid |409ORDER_NOT_EDITABLE; no paidSKUeditUI |
| AT26 Reject/refund / source test | Rejectpaidticketreason; accountantcomplete | Cancel/release/refund pending; completedrefidem; tiền provider chưa được chứng minh chuyển |
| AT27 Ticketowner / cầnFE | CustomerGETticketsall hoặc other detail |403; ownticketfromOrderViewarray; staffscopeexplicit |
| AT28 Review form / cầnFE | Empty reason/2001chars; networkunknown |400fieldpreserve; GETreconcile, không autoreplaydecision |
| AT29 Deviceownership / source test+cầnFE | Wrongowneractivate/command/readings |403; unsold/not completed409; deliveryLinksSerial... |
| AT30 Command / source test+cần hardware | PENDING→SENT→ACK với commandId/topicmatch | Không physical success trước telemetry; wrongdeviceACKignored; mqttTelemetry... |
| AT31 Commandfailure / source test+cầnFE | MQTT disabled/offline/rateover20/timeout |503/409/429; timeout không success; keyreuseidadapter; no action replaynewkey |
| AT32 Base/Pro / source test+cần hardware | Base payload weight; Propackageedge repeated | Base weight không tạo đọc giả; packageonceperedge; Pro real weight cần calib ra tion |
| AT33 Notifications / cầnFE/provider | Readvoid200; optedoutPACKAGE_DETECTED | Không res.jsonthrow; preferenceảnhhưởngrecordvàpush; FCMrealE2Echưa chạy |
| AT34 Freshness / cần hardware | Device online trước đó như ngtelemetry stale | UIlastSeen/stale; không nghiệm thu từ trạng thái manual online |
| AT35 Email / source test | SMTPfail5 lần; adminresendFAILED | Ordercommitted, outboxFAILED rồiqueued; no emailSent giả; outboxRetries... |
| AT36 Email concurrency / source test | Concurrent worker claim; lease/resendrules | Một claim owner, backoff; external delivery at-least-once; concurrentOutbox... |
| AT37 Warranty / cầnFE/provider | Missing serial, customer route, technicianotherclaim |404/403, không dummy warranty; staff lookup không public |
| AT38 Users / cần provider | Staffcreate12charpassword, lockself, rolechange, recovery | Provider+DB compensation; selfguard409; OTP verify503 hiện có, không giả reset |
| AT39 CMS/settings / cầnFE | API empty array, published filter, simulatedtestsend | Không fallback fixtures; noadminCMSguest; isRealSentfalse hiểnthịpreview |
| AT40 Jobcreate / PLANNED | Confirmed/APPROVED; assign active technician | Một job ASSIGNED/order, schedule/history/outboxes; duplicate409 |
| AT41 Job scope / PLANNED | TechnicianA xem/cập nhật jobB; customerotherorder |403; MyJobs chỉ assigned; không contact/serialleak |
| AT42 Job stages / PLANNED | Start→confirmdelivery→confirminstall | ASSIGNED→IN_PROGRESS→DELIVERED→INSTALLED; order chưa COMPLETED |
| AT43 Serial / PLANNED | WrongSKU/owner duplicate/count thiếu |409; exactperitemsserialcounts, no partialsilentcompletion |
| AT44 Connection / PLANNED | Publishsucceeded như ng no ACK/no actual status | Acceptancefail, không complete; readablediagnostics/retry |
| AT45 Lockcheck / PLANNED | ValidACK nhưng telemetrylock khôngkhớp/stale/otherdevice | Server reject evidence, UIcannotcheckboxpass |
| AT46 Procheck / PLANNED | Pro weight missing/invalid, Basewithoutweight | Profail; BaseN/A; không nhập0để pass sensor |
| AT47 Acceptance / PLANNED | Everyserialpass + customerattestation | AtomicjobCOMPLETED/order completed/history/outbox; duplicate key repeat không do uble event |
| AT48 Fail/reassign / PLANNED | Anyworkingstagefailreason; adminreschedule | FAILEDretainsphysicalstage; same job attempt/version+1; oldevidenceinvalidated/historyretained |
| AT49 Race/bypass / PLANNED | Acceptance concurrent reassign; oldshipmentdeliver gọi trực tiếp | Stale409/guardblocked; không order completed trước acceptance |
| AT50 Hero / cần preview+FE | Desktop/tablet/mobile/zoom200% | Fullscreenliềnnền, không có product card/frame/border; CTA/chữ không che khóa |
| AT51 Viewer / cần preview+asset | Drag, front/back/side/top, +/-/reset | Camera/geometry đổi thật; minh họa label; không static ảnh giả360 |
| AT52 Fallback / cần preview+FE | DisableWebGL/contextlost/assetfail | Poster/diagram+reason; control unavailable rõ; mua không blockedby3D |
| AT53 Reduced motion / cần preview+FE | OSreducedmotion và keyboard only | Auto/float/parallaxoff; tất cả control focus able; touchscrollnormal |
| AT54 Size/assets / cầnFE+asset | S/M/Lchange, unknown physical dimension | Capacity/UUIDcorrect; correctasset/crossfade; không fake CSS physical scale |
| AT55 App/content / cầnFE+approvedcontent | Nostore/screenshots, noapprovedwarranty/SLA | Concept/comingsoon rõ; nofakelink/24months/IP65/AIclaim |
| AT56 Report / source test+cầnFE | Invalidmultipletypedparams/date92days |400INVALID_REPORT_PARAMS allreasons; inlineerrors, noexpectedfieldassumption |
| AT57 Reporttimezone / Postgres source test | PaidaroundVNmidnight/cancel/refund date | Inclusive/exclusiveboundaries, zerodays, metricsgross/netexplain; PGtestneedednotH2proof |
| AT58 Export / source test+cầnFE | PDF/XLSXsuccess; font503/errorJSON | NumericcellsXLSX; correctMIME; error not file; filenameCORSfallback |
| AT59 Dashboard / source test+cầnFE | Oneparttimeout, allqueuebusy | Partial200nullpart, availablepartsrender; fullbusy503; MDCtracepropagate |
| AT60 Quality / cầnFE/production | Slowmobile/keyboard/contrast/XSS/no external fallback | Performancebudgets15, WCAGAA12, noPII/secrets, clearerrortrace; no fake empty/zero |

## Cách ghi kết quả

Mỗi run ghi environment/commit/schema/flags, case ID, inputfixtureID riêng, expected/actual, HTTP status và response đã redact, pass/fail/blocker, screenshot khi là UI; không log JWT/SMTP/password/HMAC/tokenFCM. Jobcases chưa có code phải BLOCKED/NOTRUN, không PASS từ prototype. Hardwarecases phải có firmware/broker/topic/evidence thời gian, không thay bằng unit test Java. Provider recovery/payments/FCM cần externalE2Eriêng.

Existingtestsource: `backend/src/test/java/com/smartbox/backend/CommerceIntegrationTests.java`, `PostgresCommerceIntegrationTests.java`, `DashboardAndEmailTests.java`, `SecurityTests.java`, `BackendApplicationTests.java` (tên file thực tế xemvalidation). Bảng này không tự chạy lại hay sửa test trong nhiệm vụ tài liệu.
