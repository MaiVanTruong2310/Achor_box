# 07 — Business rules/validation

## Đọc bảng

Các token lỗi là literal đầu `message`, không `errorCode` field. `@Valid` errors thường code400 + message chung + data field errors; helpers mới có tokens. `PLANNED/PROPOSED` không có implementation/test hiện tại. Sourcefile ở `backend/src/main/java/com/smartbox/backend/service/` trừ ghi riêng; API chi tiết[06](06-API-CONTRACTS.md), cases[18](18-ACCEPTANCE-TEST-CASES.md).

| Rule ID/tên | Điều kiện/hợp lệ | Không hợp lệ → lỗi/HTTP thật | Backend implementation/source | Frontend behavior | Test case/bằng chứng |
|---|---|---|---|---|---|
| BR01 Id entity | Supabase access + profile UUID/role/không khóa | Missing/sai token→401; invalid role403; lockedACCOUNT_LOCKED401 | JwtAuthenticationFilter; SupabaseAuthGateway.id entity | Refresh một lần, không fallback mock/DB | SecurityTests.privateGetRequiresToken/roleIsLoadedFromDatabaseAndLockedAccountDenied |
| BR02 Scope owner | Actor.id=order/device.user/owner | Cross owner403, message tiếngViệt không machine code | CurrentActor.requireOwner; owned | 403page, không đoándataowner | Commerce tests amount/ownership; delivery test |
| BR03 Product active | p.is_active & v.is_active | PRODUCT_INACTIVE400 | OrderWorkflowService.addLocked/setQuantity | Disablebuy inactive; nếu409/400 refresh | createDuplicatesMergeAndValidationRollback |
| BR04 Quantity input | @Min1 @Max99 trong Item/Quantity, @Valid | 400 data field errors; service helper QUANTITY_LIMIT_EXCEEDED400 | CommerceRequests; quantity | Fieldhint, integerstep1 | validation rollback test |
| BR05 Quantitymerge | Merged qty≤99, one row/SKU | QUANTITY_LIMIT_EXCEEDED400 | create/addLocked + uk_order_item_variant | Không thêm duplicate row; render serverqty | createDuplicatesMergeAndValidationRollback |
| BR06 Createitems/address | NotEmpty max100entries; shippingAddress@NotBlank max2000; email profile có | 400field errors/EMAIL_REQUIRED | CommerceRequests.CreateOrder; create | Requiredaddresstext; preserveinputerrors | ordercreation integration |
| BR07 Stockreserve | guarded stock_quantity+delta≥0 | INSUFFICIENT_STOCK409; tx rollback | moveStock; ck_variant_stock | Refreshavailableqty; không optimistic paid | concurrentInventoryCannotOversell |
| BR08 Stock delta | Patch variant delta nonnull/nonzero±100000; admin roles | INVALID_STOCK_DELTA400; INSUFFICIENT_STOCK_OR_LIMIT409 | VariantInventoryService.adjust | Signed delta confirm; stock row fromreply | manualVariantAdjustmentHasLedgerAndCannotConsumeReservedStock |
| BR09 Editable | workflow2, pending và expiry future | LEGACY_ORDER_REVIEW_REQUIRED409; ORDER_NOT_EDITABLE409 | requireNewWorkflow/editable | Hideedit sau checkout; legacy readonly | mergesDuplicateItemsKeepsFirstPriceAndRollsBackInsufficientStock |
| BR10 Snapshot | First unitprice=product.price+price_delta≥0; subsequent add giữ giá | INVALID_PRICE400 nếu giá âm | addLocked | Render snapshot order, không repricelocal | snapshot integration |
| BR11 Subtotal/total | subtotal=unitPrice×qty; total=SUM | Client total không được dùng | recalculate/view | Serverreply truth; nofeesdiscount tự sinh | stock/merge integration |
| BR12 Release | cancelled/failed/expired, releaseflagfalse | Duplicate release không mutation | release/inventory_released | Do nottrừ/hoàn local kho | draftExpiryRestoresStockExactlyOnce |
| BR13 Checkout key | presentnonblank≤128,24hsameorder | IDEMPOTENCY_KEY_REQUIRED400/INVALID_IDEMPOTENCY_KEY400/IDEMPOTENCY_KEY_REUSED409 | PaymentService.checkout | Keepkeyonretry, unique per attempt | checkoutIdempotencyCallbackSignatureAndTicketOutboxExactlyOnce |
| BR14 Checkoutstate | ownedpendingunexpired, items/nonzerototal | ORDER_NOT_EDITABLE409 helper; ORDER_NOT_CHECKOUTABLE409 empty/nonpositive | checkout/editable | Refetchaftercachedreply; cancelled new order | amountMismatchAndMissingKeyCannotMutate |
| BR15 HMAC | configuredsecret≥32; normalized amount; signatureconstanttime compare | PAYMENT_NOT_CONFIGURED503/INVALID_SIGNATURE401 | sign/callback | Neversecretinbrowser, notcallcallback | checkout signature integration |
| BR16 Payment amount | payment.order_id match callback, amountmatchpayment&order | PAYMENT_ORDER_MISMATCH400/AMOUNT_MISMATCH400 | callback | Resultqueryignore; customercheckorder | amountMismatchAndMissingKeyCannotMutate |
| BR17 Callback duplicate | success/refund_required/refunded terminal | Duplicate valid callbackACK200 withoutnewhistory | callback | Pollstoponsourceconfirmed | callback duplication test |
| BR18 Latepayment | SUCCESS expired/cancelled | Orderstayscancelled, payment refund_required, refundPENDING | callback/requestRefund | No “đãhồi phục đơn”; refundsnotexposedcustomer gap | expiredPaymentLateSuccessRequiresRefund |
| BR19 Payment expiry | draft30m/payment15m, demo1m; scheduler60swhenenabled | Cancel + history + release; delayup60s | OrderExpiryJob/expire | Countdownhint thenreadstate, không PATCH | concurrentCallbackAndTimeoutLeaveConsistentStockAndRefund |
| BR20 Stateauthority | Sixcoretransitionsonly | INVALID_ORDER_TRANSITION, HTTP409 | OrderStateMachine.requireTransition | Actions theo endpoint, no arbitrarystatusdropdown | coreworkflow integration |
| BR21 Ticketreview | super/support; order paid/ticketPENDING | TICKET_ALREADY_REVIEWED409 / TICKET_ORDER_NOT_PAID409; role403 | ApprovalTicketService.act | Disabledecisionafterfinal; 409reload | concurrentTicketReviewHasOnlyOneFinalDecision |
| BR22 Ticketreason | Return/Reject/Resubmit nonblank, controllermax2000 | Validation400/TICKET_REASON_REQUIRED400 | CommerceRequests.Reason/requireReason | reasontextarea+counter focus | ticketReturnResubmitRejectAndRefund |
| BR23 Resubmit | owner andRETURNED; paiditemimmutable | INVALID_TICKET_TRANSITION409; owner403 | actRESUBMIT | Explanationtextonly; noSKU/qtyedit | ticketReturnResubmitRejectAndRefund |
| BR24 Paid cancel | Staff before SHIPPED; own unpaid allowed | PAID_ORDER_REQUIRES_STAFF_CANCELLATION409/ORDER_ALREADY_SHIPPED409 | OrderWorkflowService.cancel | CustomerrequestCSKH afterpaid | failedPaymentAndRepeatedCancelReleaseOnce |
| BR25 Refund | Staff accountant/super; providerRefmax200 nonblank; samecompletedrefrepeat | REFUND_REFERENCE_MISMATCH409/DB unique409 | completeRefund/CommerceRequests | Manualreconcile only, notwiretransfer | ticket reject/refund integration |
| BR26 Tickettransaction | Paid/order history/ticket/outbox cùng tx | Forcedfailure rollback tấtcả; generic500 | PaymentServicecallback.failAfterPaid | Failednetworkrequest chưa assumesuccess; reload | paidTransactionRollbackAlsoRollsBackTicketHistoryAndOutbox |
| BR27 Email lease/retry | ClaimPENDINGdue,max50,token lease,5attempts | FailedSMTP không đổi Order; FAILED after5 | OutboxService; EmailOutboxWorker | Businesssuccess independentmail | outboxRetriesFiveTimesAndAdminResend; DashboardAndEmailTests.smtpFailure... |
| BR28 Emailresend | OnlyFAILED staff support/super | EMAIL_NOT_RESENDABLE409 | OutboxService.resend | DisabledunlessFAILED; queued≠sent | concurrentOutboxClaimAndResendRules |
| BR29 Deviceassignment | confirmed; sameSKU/product; qtycap; serialunsold | ORDER_NOT_CONFIRMED/DEVICE_ALREADY_SOLD/DEVICE_PRODUCT_MISMATCH/DEVICE_VARIANT_MISMATCH/ITEM_DEVICE_LIMIT409 | FulfillmentService.assign | ItemUUIDnotproductID; scanserialresolvegap | deliveryLinksSerialOwnerAndCommandTimesOutWithoutBroker |
| BR30 Delivery legacy | SHIPPED and exactserialcount | SHIPMENT_NOT_SHIPPED/DEVICE_SERIAL_ASSIGNMENT_INCOMPLETE409 | FulfillmentService.delivered | Markphysicallydelivered only, installation missing | delivery integration |
| BR31 Activation | own device+solditem+order completed | DEVICE_SALE_NOT_LINKED/DEVICE_NOT_DELIVERED409,owner403 | DeviceWorkflowService.activate | Do notselfclaimarbitraryserial | delivery integration |
| BR32 Command | Own, MQTT enabled,activated,online; TAREcapability | MQTT_NOT_CONFIGURED503/DEVICE_NOT_ACTIVATED409/DEVICE_OFFLINE409/WEIGHT_SENSOR_NOT_SUPPORTED400 | command | ActionwaitACK; BasehideTAREuntilcapabilityknown | MQTT/delivery integration |
| BR33 Command key/rate | Samekey/commandreuse;≤20/min | COMMAND_KEY_REUSED409/DEVICE_COMMAND_RATE_LIMITED429 | command | Preservekeyforretry; showcooldown | delivery commandreuse test |
| BR34 ACK truth | topic/device/commandSENT/nonexpiredmatch | InvalidACKmessage rejection/log; no publicHTTPerror | MqttDeviceService.message | Readack andtelemetry; don'tassumepublishsuccess | mqttTelemetryCreatesOnePackageAndAckMustMatchDevice |
| BR35 Package | Sensor false→true createsonce,Pro weight only | Badnumber/JSONtopic rejected worker; noUIHTTPstatus | MqttDeviceService | Separateparcelfeed,nullableweight | same MQTT integration |
| BR36 Reports | DATE/UUID/DECIMAL typed params,from≤to,range≤metadata92,customerexists | INVALID_REPORT_PARAMS400 + reasonslist | RevenueReportService.data | Render all field errors, file download binary | reportCollectsValidationErrorsAndExportsNumericXlsx |
| BR37 UTC+7 | paid_at startinclusive/endexclusive nextday;core paid/confirmed/completed | Wrongday isimplementationbug notHTTPerror | SQLreport_definition; data | ZonedVietnamlabels,includezero | reportUsesVietnamMidnightAndIncludesZeroDays onPostgres |
| BR38 Dashboard | Fourtasksboundedexecutor,timeout1500ms | Partnullpartial200; DASHBOARD_BUSY503 fullqueue | ConcurrentDashboardService | Perpartloading/error, nevernull→0 | DashboardAndEmailTests timeout/MDC/overload |
| BR39 Staffcreation | super; role internal,initialpwd12–128,provideradminconfigured | INVALID_STAFF_ROLE/INITIAL_PASSWORD_REQUIRED400,EMAIL_ALREADY_EXISTS409/AUTH_ADMIN_NOT_CONFIGURED503 | UserService.createStaffUser | No customer role field inpublicform | NOT VERIFIED providerE2E |
| BR40 Lock/role | Superselflock/rolechangeblocked; support customer only | CANNOT_LOCK_OWN_ACCOUNT/CANNOT_CHANGE_OWN_ROLE409; SUPPORT_CAN_ONLY_LOCK_CUSTOMERS403 | toggleLock/updateRole | Confirmationreason; nooverridefallbackDB | Manual acceptance pending |
| BR41 Warrantyeligibility | Device+warranty row real,status active&date valid | Missing serial/warranty404; INVALID_CLAIM_STATUS/INVALID_TECHNICIAN400 | WarrantyService | No inventedwarranty/phone/duration | NOT VERIFIED customercreate API missing |
| BR42 Warranty assigned | Technician only mutation assigned claim; assign super/support | CLAIM_NOT_ASSIGNED_TO_TECHNICIAN403 | authorizeClaim/assignTechnician | Scope edit buttons; allclaimlistbroadgap | Acceptance pending |
| BR43 Profile/register/address | Backendselfservicecontract chưa có | 404route, no inventedmachinecode | MISSING | Feature flag disabled/explicitSDKchoice | Proposed API tests |
| BR44 Jobassignment | Order confirmed/approved, onejob,technician active | Proposed409JOB_ALREADY_EXISTS/ORDER_NOT_CONFIRMED | PLANNED delivery_installations | Admin schedule+assignee | Proposed acceptanceAT40–45 |
| BR45 Job scope | Assigned actor onlyprogress | Proposed403JOB_NOT_ASSIGNED | PLANNED job service | ResponsiveMyJobs, no all orders | Proposed crossjob test |
| BR46 Job acceptance | Everyserial/currentowner/MQTTfresh/lockACK+status/Pro weight/customerattestation | Proposed409ACCEPTANCE_CHECKS_FAILED | PLANNED; sourcelegacydeliverdoesnotcheck | Blockcompleteuntilallpass | Proposed acceptance test |
| BR47 Job retry | FAILED reason; reassign same job/version+attempt/history | Proposed409STALE_JOB_VERSION/INVALID_JOB_TRANSITION | PLANNED | Retainfailurehistory, noevidenceoldreuse | Proposed concurrent reassign test |

## Mismatch phải biết

BR20/21/23 đã đối chiếu literal trong OrderStateMachine.requireTransition và ApprovalTicketService.act. Token nằm trong message, không phải field errorCode độc lập. Những lỗi đề xuất được ghi rõ PROPOSED.

MutableProductcatalogmetadata/price không đổi Order Snapshot; PUT product canupdateabsolutevariantstock như ng ledger không bao đầyđủmovementngoàinewendpoint. Requirementsregister/profile address/newjobbusiness không thể Frontend “implement” chỉ bằng local Sto ra ge.
