# 03 — Business flows và nhánh ngoại lệ

## Mục lục

A. Mua hàng; B. Checkout/payment; C. Ticket; D. Shipment hiện tại; E. Delivery Installation mục tiêu; F. Device/package; G. Recovery/report.

## A. Chọn cấu hình → Order pending (IMPLEMENTED)

Guest GET products → lọc active, chọn product → GET variants → chọn variant UUID có active/stock. Giá UI đọc finalPrice trong VariantResponse, không tự đặt nguồn giá mới. S/M/L dựa metadata, null hiển thị “Chưa có thông tin”; không parse tên để làm thông số thật. Giỏ local chỉ là intention; chưa giữ kho.

Customer login → POST `/api/orders` `{shippingAddress:"<địa chỉ>",items:[{variantId:"<UUID>",quantity:1}]}` có Bearer. Backend profile.email bắt buộc, merge duplicate, khóa variants, giá đầu snapshot, guard stock, tạo history pending, draft expiry30min. HTTP201 trả OrderView. Frontend lưu orderId, server items/total/expiresAt thay local arithmetic; draft clock dùng server expiry. Không thu giá/userId/role/paymentMethod/coupon từ UI vào request thật.

POST item cộng qty; PATCH quantity đặt qty đích; DELETE item hoàn stock; mọi mutation chỉ pending unexpired workflow2. 409 insufficient stock/state → giữ UI selection, tải lại order/catalog, không nói “đã thêm”. 400qty limit → focus field. Concurrent requests serialize, UI vẫn khóa submit để tránh tạo nhiều order vì create **không có key**. Create timeout: chưa có reconciliation key; không tự POST lại, hiển thị “Chưa xác nhận” và tải my-orders. Cần backend clientRequestId tương lai.

## B. Checkout → payment result (IMPLEMENTED mock, gateway thật MISSING)

```mermaid
sequenceDiagram
  participant UI as Customer UI
  participant API as PaymentService
  participant DB as PostgreSQL
  participant GW as Mock/Gateway
  participant JOB as Expiry scheduler
  UI->>API: POST checkout + stable Idempotency-Key
  API->>DB: Lock key → owned order, pending/unexpired
  API->>DB: payment pending + awaiting_payment + history + stored response
  API-->>UI: orderId/paymentId/amount/paymentUrl/expiresAt
  UI->>GW: Demo JSON page; future hosted gateway
  GW->>API: callback HMAC (SUCCESS/FAILED)
  alt Valid SUCCESS before expiry
    API->>DB: paid + paid_at + ticket/history + outbox atomic
  else FAILED or expired
    API->>DB: cancelled + failed/expired + stock release
  else Late SUCCESS after cancelled
    API->>DB: refund_required + refund PENDING; cancelled giữ nguyên
  end
  JOB->>API: expire(orderId), khóa cùng order trước payment
  UI->>API: GET order detail (poll/read source of truth)
  API-->>UI: current status/paidAt/ticket/shipment
```

UI tạo một UUID key cho lần checkout, giữ qua retry/tab-return cho cùng order; không sinh key mới khi timeout. Retry cùng key nhận response snapshot cũ có thể status awaiting_payment dù order đã paid/cancelled: sau response luôn GET detail. Thời gian hiển thị countdown là gợi ý; backend quyết định expiry, scheduler60s có độ trễ. Ngay expiry disable pay, GET lại; không tự PATCH cancelled.

Demo complete endpoint chỉ profile demo, chủ đơn dùng Bearer; không gửi HMACsecret ra client. paymentUrl là JSON GET endpoint, chưa payment HTML. Không mở redirect URL vào UI production rồi đánh dấu “cổng thật”. Result page phân biệt: pending/chờ callback; paid/thanh toán đã ghi nhận; cancelled/chưa biết failed hay expired từ order alone; late-refund/chưa customer refund endpoint. Query `?success=true` không có giá trị quyết định. Poll đề xuất 2s/5s/backoff, 60–120s rồi manual refresh; abort khi hidden/unmount, không gọi callback từ result screen.

Callback sai chữ ký401, sai amount/order400 không mutation; terminal success duplicateACK200 không history/outbox thêm. Checkout order nonpending thường `ORDER_NOT_EDITABLE`409 từ helper, không luôn `ORDER_NOT_CHECKOUTABLE` như D4. Cancelled checkout lại phải tạo order mới và reservekho lại; không tự khôi phục payment.

## C. PO Ticket (IMPLEMENTED)

Paid transaction tạo một PENDING ticket. Customer đọc ticket array trong orderView → GET `/api/tickets/{ticketId}` để history, không GET ticketlist staff. Support/super review:

- APPROVE khi PENDING và order paid → ticketAPPROVED, order confirmed, shipmentPREPARING, email ORDER_CONFIRMED. Frontend remove decisionbuttons, hiển thị phê duyệt và chờ phân công (job API chưa có).
- RETURN reason required → ticketRETURNED, order vẫn paid. Customer thấy reason, form text≤2000, POST resubmit `{reason}` → PENDING round+1. Không sửa quantity/SKU/price hoặc attachments chưa hỗ trợ.
- REJECTreason → ticketREJECTED/order cancelled/refundPENDING/stockrelease, emailTICKET_REJECTED. Không hiển thị “tiền đã về” trước refundCOMPLETED.
- Concurrent approve/reject chỉ một finaldecision; UI409reloadtickethistory. Return/resubmit event key theo eventUUID để vòng sau vẫn gửi email.

## D. Shipment hiện hữu (PARTIAL so với mục tiêu mới)

After approve, staff POST order/devices gắn deviceId vào orderItemId đủ qty, đúng product+variant, không owner/đã sold. POST shipment/ship `{carrier,trackingNumber}` PREPARING→SHIPPED. POST shipment/deliver yêu cầu đủ serial, SHIPPED→DELIVERED và order completed, owner attach. Lặp deliver terminal an toàn. Chưa job assignment, scheduled time, acceptance, actor assigned-only hoặc kiểm tra hoạt động. Không quảng cáo đã lắp đặt từ status này.

## E. Giao và lắp đặt một nhân viên (PLANNED bắt buộc)

Admin/super/support chọn technician active chưa locked và schedule → một job/order ASSIGNED. Assigned technician xem “Việc của tôi”, nhận IN_PROGRESS, bàn giao DELIVERED; quét/nhập serial từng item, setupIoT, INSTALLED; thu evidence thực trạng thái/ACK khóa/cảm biến Pro + customer acceptance → COMPLETED → order completed. Không nhân viên độc lập shipper/installer; không carrierintegration/GPS/routing.

FAILED ghi lý do ở bất kỳ nonterminal stage; order vẫn confirmed, **không tự hoàn kho** khi thiết bị đã bàn giao. Admin reassign/reschedule cùng job tăngversion/attempt, giữ history. Invalid evidence nếu đổi serial/assignee hoặc dữ liệu quá hạn. Backend verify deviceonlinefresh, topicbinding/owner/saleitem, lockack matchcommand+device, Pro weightfinite&sensorready. “PublishMQTT accepted” không passcheck. Người không assigned403; stale version409; thiếu evidence409 (các errorcodes đề xuất). Xem [PROPOSED API](contracts/PROPOSED-API.md); chưa gọi các endpoint này.

## F. Sau bán: activation → bưu kiện

Owner GET mydevices, POST activate sau order completed; backend không có activationcode/scanserial tự nhận owner. LOCK/UNLOCK command requestKey → PENDING/SENT → ACKNOWLEDGED/FAILED/TIMED_OUT. Hiển thị trạng thái cửa từ telemetry, không chỉ ACK; timeout là chưa xác nhận, không tự mở lại. Base không choTARE, Pro cần capability được server kiểm tra. Device owner khác403.

Sensor false→true creates deliverypackageDELIVERED, notification/packagepush; repeatedtrue không tạo thêm; false→COLLECTED. Đây là nhận bưu kiện của chủ hộp, không order mua. Trọng lượng từPro nếu capability enabled, không diễn giải0/null Base là có số đo. Existing notification preferences PACKAGE_DETECTEDfalse chặn notification và push; UIshow thời gian đo,lastSeen không “real time” khi chỉ polling.

## G. Recovery và reporting

Adminsend-reset-otp thực tế yêu cầu Supabase recoverylink, không OTP; verify endpoint luôn503. Customer register/selfprofile/address chưa backendcontract. Không hardcodeOTP trongUI hoặc nói reset đã xong.

Accountant GETParamSet→form theo metadata→POSTexportPDF/XLSX→binary download. Invalid params trả cả list, map mỗi field, preservedinput; thiếu font503; ngày inclusivefrom/to UTC+7,0days. Dashboardpartfailednull hiển thị “Chưa tải được” cùng retry, không convert null→0. Grosscash/refunded/net khác eligible order revenue; canceledpaid/refund không gọi doanhthu ròng tùyý.
