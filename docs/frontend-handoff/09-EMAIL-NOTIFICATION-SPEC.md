# 09 — Email/notifications specification

## Mục lục

Events; transactional delivery; UI behavior; FCM; configuration. Source OutboxService/EmailOutboxWorker/ApprovalTicketService/PaymentService/FulfillmentService/MqttDeviceService.

| Event | Template | Recipient | Trigger/service/API | UI response/status |
|---|---|---|---|---|
| Payment SUCCESS valid | ORDER_PAID | profile.email customer | callback tx paid+ticket+history+outbox | Đã thanh toán, không chờ SMTP; IMPLEMENTED |
| Ticket created | Không email riêng | Customer nhận ORDER_PAID, staff chưa subscribe email | Ticketcreation trong callback | Không show “đã gửi nhân viên”; PARTIAL yêu cầu event mapping |
| Approve | ORDER_CONFIRMED | Customer | ApprovalTicketService.act APPROVE | Confirmed/chờ giao; IMPLEMENTED |
| Return | TICKET_RETURNED | Customer | RETURNeventUUID | Reason/form resubmit; IMPLEMENTED |
| Resubmit | TICKET_RESUBMITTED | Customer (không reviewer) | RESUBMITeventUUID | Đã tiếp nhận giải trình; staff đọc queue; IMPLEMENTED |
| Reject | TICKET_REJECTED | Customer | REJECTeventUUID+refund request | Đã từ chối/chờ đối soát hoàn; IMPLEMENTED |
| Cancel/timeout/draftexpiry | ORDER_CANCELLED | Customer | cancel/expire/FAILED; cancelled:order key | Đãhủy, không paid mail; IMPLEMENTED |
| Refund completed | ORDER_REFUNDED | Customer | completeRefund + providerRef | Đã ghi đối soát hoàn, không ETA giả; IMPLEMENTED recording |
| Shipment SHIPPED | ORDER_SHIPPED | Customer | FulfillmentService.ship | Đang giao; IMPLEMENTEDlegacy |
| Shipment DELIVERED | ORDER_DELIVERED | Customer | delivered completed tx | Đã giao (chưa installationacceptance); IMPLEMENTEDlegacy |
| Jobassignment | DELIVERY_ASSIGNMENT (đề xuất) | Assigned staff | proposedcreate/reassign | Taskcreated; PLANNED no code |
| Appointmentscheduled/changed | INSTALLATION_SCHEDULED (đề xuất) | Customer | proposed job assign/reassign | Lịchdựkiến, khách không bắt buộc chấp nhận email; PLANNED |
| Physicalhandover | DEVICE_DELIVERED (đề xuất) | Customer nếuhữuích | proposedconfirm-delivery | Đãbàngiao,chưa nghiệm thu; PLANNED |
| Installationacceptance | INSTALLATION_COMPLETED (đề xuất) | Customer | job acceptance+Order completed tx | Hướng dẫn activate, PLANNED |
| Job failed | INSTALLATION_ACTION_REQUIRED (đề xuất) | Support/admin, customer projection phùhợp | proposedfail | Trì hoãn/chờ xử lý,không lộ ghi chú nội bộ; PLANNED |
| Packagedetected | FCM title “Bạn có bưu kiện mới” | Ownerpushtokens | sensor false→true,preferencesenabled | In app notification bưu kiện, không order; IMPLEMENTEDadapter |

## Transactional outbox và retry thực tế

enqueue MANDATORY phải cùng business transaction; snapshotscustomer/order/items/time/reason; event key unique tránh callback dup và vòng ticket trùng. Invalid email lưu FAILED lý do EMAIL_RECIPIENT_MISSING, không SMTP trong payment tx. Worker10s,max50orderID, claimSKIPLOCKED/lease1800s, SMTP timeout config5s. Success→SENT/sent_at; error attempts+1,backoff60s×2^(attempts−1),max5→FAILED;demo5s. ResendstaffFAILEDonlyreset0+PENDING. Leasengăn thườngworker gửi đồng thời, như ng crash sau SMTP accept trước sent có thể duplicate — at-least-once, không cam kết exactly once SMTP.

Template ThymeleafHTMLorder-notification dùng th:text escapenames/reason, sốtiềnViệt/timeUTC+7, item table và link SHOP_URL/account/orders/{orderId}. Email total server snapshot, không lấy frontend totals. Một template chung nhận title theo event; title Không chứng minh Thymeleaf body mapping của Settings DB template.

BackendApi trả business success nếu SMTP offline; UI không báo đặt/thanh toán thất bại do outbox PENDING/FAILED. Customer không API email status; copy “Thông tin đơn hàng được cập nhật tại đây” và “Email sẽ được gửi khi xử lý xong”, không “đãgửi” nếu chỉ business success. Admin failed mail row status/attempts/error/nextretry và resend disabled nếu SENT/PENDING; khiqueuedrefetchlist.

## Legacy template settings

SettingsService.message_templates CRUD/test-send là hệ khác: DBpattern{{...}}, đồng bộ SMTP test thông qua EmailService, mô phỏng return success=true/isRealSent=false. **Không**chỉ nh ORDER_PAID DB template rồi mong outbox Thymeleaf đổi. Không dùngOTPresetlegacytemplateđểtuyênbốhotlineOTPđãhoạtđộng; UserService recoverylinkviaprovider và verify503.

## FCM và preferences

PACKAGE_DETECTED preferencesfalse hiện chặn notification record và push. Notifications data→pushoutbox cùng sensor transaction; FCM HTTPv1 dùng service account file backend, claim/retry5/per-token sent dedup. No token validation/device push delivery đã xác minh thực. False→truecase nhận một bưu kiện; nókhácshipment/order delivery. Không choReactmarketing bundle chứa service account/Brokercredential/paymentHMAC.

Cấu hình chính: SMARTBOX_JOBS_ENABLED,MAIL_ENABLED,MAIL_SENDER_ADDRESS/NAME,SPRING_MAIL_*,SMTP_AUTH/STARTTLS,SHOP_URL; MQTT_*,FCM_ENABLED/PROJECT_ID/CREDENTIALS_FILE. Environment example là hướng dẫn sẵn backend, file.env không autoload. RealSMTP/FCM/broker/firmware NOT VERIFIED trong nhiệm vụ tài liệu.
