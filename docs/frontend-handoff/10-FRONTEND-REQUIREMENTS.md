# 10 — Frontend screen requirements

**Cập nhật DeliveryInstallation:** phần giao/lắp đặt PLANNED trong snapshot này đã được triển khai. Xem [cập nhật và hợp đồng hiện tại](DELIVERY-INSTALLATION-IMPLEMENTED.md).

## Quy ước chung

Mỗi màn hình có initial/loading/success/empty/error, 401/403, offline/timeouts và mobile. Formdirty preserve sau error; mutationpendingdisable chính nút liên quan, không freeze toàn site. Màn hình PLANNED thiết kếđược như ng production feature flag off, không mock làm nguồn dữ liệu đúng. Cácroute dưới đây là **route UI đề xuất**, không backendAPI. CTA/chọnthiếtbị sử dụng API thật ở[11](11-FRONTEND-API-INTEGRATION.md).

## Public site

| Screen/route | Nội dung/components/actions | Data/source/status | Ngoại lệ/acceptance |
|---|---|---|---|
| Landing `/` | Fullscreenhero,Base/Pro story,360°,3sizes,howitworks,appCTA | Publiccatalogreal; editorial+assetplaceholderexplicit | Canvas fallback,reduced motion,nohero productcard; buydisableuntilSKUavailable |
| Listing `/products` | Twofamilycards,filtermodel/size locallyallloaded,availablebadges | GET products + variants; IMPLEMENTED | Inactivefilterclienttemporary; nofake stock/category/spec |
| Detail `/products/:id` | Largegallery/viewer,size45/85/150,SKU,finalPrice,availableqty,description,stickybuy | FindIDfromcatalog; GET variants; noGETproductdetail | NoID404UI; stockchanged409; capability/dimensions missing clear |
| Comparison `/compare` | Base/Pro tablecommon/differentfeatures; sizecomparison | Promptfeatureseditorial; no APIcomparisonneeded | LoadcellsupportedPro knownbusiness not inferred fromunverifiedDBname; noIP65/batteryfake |
| Technology `/technology` | Lock/ESP32/MQTT,Proloadcell,shortexplaineddiagrams | D1/D2source; verifiedclaims only | Explodedrenderillustrativelabeled, not actualpartscertification |
| App `/app` | Phone placeholder+features status map,downloadCTA | FlutterNOTVERIFIED; no storeURL | CTA“Đang chuẩn bị” if nostore; screenshotsrealrequired |
| Howitworks `/how-it-works` | Purchase→review→staff delivery+install→activation→parcelstory | Flowsspec,installationPLANNED | Distinguishcommercialvsparcel; no carrierworkflow |
| About `/about` | Projectscope/prototype/teamprovidedpubliccontent | Curatededitorial | Do not publishdocstudentcontactPIIautomatically |
| Blog `/blog`, `/:slug` | Article list/filter/content | PublicCMS API MISSING | Featureoff/editorialstaticapprovedcontent; notcalladminendpointguest |
| FAQ `/faq` | Accordion/searchcategories | PublicAPI MISSING; curatedapprovedcopyalternative | No warranty24m/IP65claims from mock |
| Contact `/contact` | Contactinfo/subject/message form | ContactsubmitAPI MISSING | Staticverifiedcontacts only; formdisabledorverifiedmailto, not success local only |

## Customer

| Screen/route | Fields/data/actions | Backendfit | States/guard |
|---|---|---|---|
| Register `/register` | fullName/email/password/confirmation/phone | MISSING backend register; SDKoptionnotverified | No successwithfakeJWT; verificationneedsproviderdecision |
| Login `/login` | email/password,showpwd,returnTo | AuthControllerloginflatresponse | 401field/form error;429cooldown60s;503provider;returnTowhitelistsameroutes |
| Recovery `/forgot-password`,`/reset-password` | email/newpwd flow | CustomerproviderflowPLANNED; adminsendrecoveryexists | No hotlineOTPpreview; routefeatureflaguntilrealproviderreturnURL |
| Profile `/account/profile` | fullName/email/phone/defaultaddress | Loginidentitypartial; selfGET/PATCHMISSING | Emailimmutableuntilproviderchangeflow; do notGETadminusers |
| Addresses `/account/addresses` | recipient/phone/address/default | AddressbookMISSING | HideaddaddressbuttonuntilAPI; checkout plain address only |
| Cart `/cart` | chosenvariantID,quantity,priceestimate | Local intent + pendingdraftAPI | Do notreserveonlanding; showexpiryaftercreate;max99; stale price refresh |
| Checkout `/checkout/:orderId` | snapshot items,total,addresstext,terms,PayCTA | create+checkoutIMPLEMENTEDmock | Keypreserve; disableCOD/bank/coupon/fee untilbackendintegrates; no client total input |
| Payment `/payment/result` | pending/paid/cancelled/unknown states | GET detail poll; payment/refundsummarygap | Querysuccessignored; pendingaftertimeoutnotfalsefailure; nofakepaymentcomplete |
| MyOrders `/account/orders` | status,date,total,pagination | my-orders array0/20 | List no status filter server; emptyvsfailed; loadmoreuntilpage<len20 |
| OrderDetail `/account/orders/:id` | snapshot items,address,history,ticketarray,shipment array | detail+historyIMPLEMENTED | Sensitiveguard403; legacy read-only; clickticketIDactualarray |
| Ticket `/account/orders/:id/ticket` | status/reason/history/round | GETticketdetail | No all-ticketlist forcustomer; APPROVEDwithcancelledorderdisplayboth |
| Explain sameTicket | textarea reason≤2000,submit | POSTresubmitIMPLEMENTED | OnlyRETURNED; keeptext409; noattachmentsuploadAPI |
| DeliveryTracking `/account/orders/:id/installation` | schedule/status/employeeprogress/acceptance | PLANNED new job | UntilAPI showshipment“Đã giao”, installation “Chưa có dữ liệu”; nevercompletedinstallationfromshipment |
| MyDevices `/account/devices` | serial/status/lastSeen/activationCTA | my-devices/activate | Owner only;healthunknownifstale; no manualownerclaimserial |
| DeviceDetail `/:id` | commandACK/status/readings/packages | IMPLEMENTEDownerAPI | Scope owner;MQTT503;TAREcapabilityunknownhide; no marketingperfclaim |
| Warranty `/account/warranty`, `/claims/new` | eligible devices/description/photos | CustomerAPI MISSING | UIplannedlocked, noadminwarrantylookupguest |
| Notifications `/account/notifications` | list/unread/read/preferences | IMPLEMENTED | POSTtokenonlyFCMprepared; readvoidreply; optoutmaystoprecord too |

## Admin và staff responsive

| Screen | Components/actions | API/current restrictions |
|---|---|---|
| Dashboard | 4widgets+date+partialbanner+failedpartretry | Newadmindashboard; legacyextendedKPIseparate; accountant/super |
| Products/Inventory | CRUDvariantIDs, active/size/capacity/base price/delta/stockdeltas | Productmanager/super; no same product delete physicalFK |
| Orders | Pagedtable/statusbadge/detail/history; contextualactions | Read support/accountant/super; noarbitrarypaidstatusPATCH; search/status filters planned server |
| PO Review | Paid order/ticketdetail/reason/round; Approve/Return/Reject | Support/super; confirmreviewaction;409reloadreviewerconflict |
| InstallationPlanning | Order confirmed,technician/schedule,onejob,assignmenthistory | PLANNED; no logisticsmap/GPS |
| MyJobs mobile | Cardsdate/address/minimalcontact/status/nextaction | PLANNED assigned technician; noallorderlistaccess |
| JobDetail mobile | Verticalstepper,callcustomer,nativeQRcameraoptional/manualserial,checks/errors,acceptance form | PLANNEDscopedAPI/evidence; cameradeniedfallbackmanual; cannotcheckboxhardwarepasslocally |
| Refunds | PENDING queue/amount/reason/providerRef/completeconfirmation | Accountant/super; recordingonly, not“hoàn qua API provider” |
| Emails | FAILED filter,rowattempts/error,nexttime,resend | Support/super; queued≠sent |
| Users/360 | Pagedusers/profile/orders/devices/warranty,lockreason,roles/staffcreation | Supportrestrictions; selflockblocked; no globalOTPcodepreview |
| Warranty | Claims/technicianassignment/internalnotes/status | Support/super; technicianmutatesownassignedclaim; customerUIomitinternalnotes |
| Devices | Allhealth/events; registrationlink; statusmaintenance | Technician/super; manualonline not telemetrytruth |
| CMS | Articles/banner/reviews/FAQCRUD/publish | Productmanager/super; allpublicAPIgaps documented |
| Reports | ParamSetdrivenfilters/binaryPDF/XLSXdownload | Accountant/super; collectallerrors; exposeheadersgapfallbackfilename |
| Settings/Audit | Templates/currentconfigread; audit actor/time/action | Super config; accountant audit read; settings template≠outbox |

Tablemobile≤768 chuyển row card hoặc xscroll có headers/titles; payment/checkoutnohorizontaloverflow. Actions min44px, numericqtykeyboard, readableerrorinline. Photo/fileupload chỉ khi API chốt; đừnguploadpublicbucketclientbypassauthorization. Acceptance cases [18](18-ACCEPTANCE-TEST-CASES.md).
