# 11 — API integration matrix và adapter strategy

## Screen → action → API

| Screen/action | API thật hoặc trạng thái | Request | Response/use | Error handling |
|---|---|---|---|---|
| Catalogload | GET `/api/products` | Guest,omit stale token | ProductResponse[],filter active,variants | Networkemptystate riêng, no mockfallbackproduction |
| Sizechange | GET `/api/products/{id}/variants` | productUUID | VariantResponse[], finalPrice/stockQuantity/size/capacity/isActive | Null size unknown; disabled inactive/outstock |
| Login | POST `/api/auth/login` | `{email,password}` | FlatLoginResponseidentity/accessToken/refreshToken |401/429/503; noexpectdata.user |
| Refresh/logout | POST auth refresh-token/logout | `{refreshToken}` / Bearer | FlatRefresh / ApiResponse<String> | Single flight refresh thenretry; logout clearslocal andrevokesprovider |
| Create draft | POST `/api/orders` | Bearer,`{shippingAddress:string,items:[{variantId,quantity}]}` | OrderView201snapshots+orderId |400fields/409stock; timeout unknown noautoPOSTretry |
| Add/qty/remove | POST items/PATCH items variant/DELETE items variant | VariantUUID/quantity integer | OrderView |409state/stockreload; outofscopeprice/userIdnot sent |
| Checkout | POST `orders/{id}/checkout` | Bearer+stablekey header,nobody | Storedcheckoutresponse | Retry same key,thenGETdetail; paymentURLdemoJSONnotgatewaypage |
| Result refresh | GET `orders/{id}` + history | ownerBearer | status/paidAt/ticket/shipment | Querysuccessignored;pollabort;failed/expiredspecificreasonmayneedhistory |
| MyOrders/detail | GETmy-orders?page/size; GET detail/history | ownerBearer | Array summary / OrderView / rawhistory | Adapter per response, no globalunwrapdata |
| Ticketdetail | GET `tickets/{ticketId}` | IDfromOrderView.ticket[0] | Rawticketrow+history |403/409reload; noGETticketsforcustomer |
| Explain | POSTtickets/{id}/resubmit | `{reason}`≤2000 | Ticketdetail |OnlyRETURNED;noSKUedit; preserveexplanationerror |
| Reviewer | GETtickets/list/detail; POST approve/return/reject | RoleBearer;reasonforreturn/reject | Ticketdetail |Conflict409invalidate order+ticketcache |
| Staff serial/ship | POST orders/{id}/devices; shipment/ship | `{orderItemId,deviceId}` / carrier,tracking | assigned true / OrderView |No installationmeaning; verifiedSKU/qty409 |
| Installationtrack/MyJobs | PROPOSED [contract](contracts/PROPOSED-API.md) | Assigned/owner job auth | PlannedJob | Featureflagoffuntilbackend; nofakepollAPI |
| Activate | GETmy-devices + POSTactivate | ownerdeviceUUID | activated true |Noownerclaimbypasser;409not delivered |
| Control | POSTcommands,GET command | command/requestKeyUUID | newcommandId orrepeatid; status |PENDING/SENT≠physical success;503/409/429 |
| Package/readings | GETpackages/readings?page/size | ownerBearer | Rawrowarrayssnake_case |weightnullable, timestampsreceived_at; stale label |
| Notifications | GETlist/PATCH read/PUTpreferences | Bearer;enabled boolean | rawrows/void |Handleemptybody200; nores.jsonforvoid |
| AdminInventory | PATCH products/{p}/variants/{v}/stock | delta int | rawstock_quantity |409negative/400delta; refetchcatalog/order available |
| Adminusers | GETpaged/details; PATCHlock/role;POST staff | TypedDTOdictionary | UserProfile/Customer360 |403role; actualrecoverylinknotOTP |
| Admin warranty | GET claims/paged/lookup; PATCH assign/status/notes | staff onlyDTOs | ClaimResponse/WarrantyLookup | Customerblocked; missing serial404no fake warranty |
| AdminCMS/config | ActualContent/Settingscontrollers | TypedDTOdictionary | DTOs/Maps |No publicCMSfallback; testisRealSent distinguishesrenderonly |
| Report | GETParamSet; POST export | format/params typed | Binarybytes |400all params;503font; filenamefallbackCORS |
| Dashboard | GET admin/dashboard?date | YYYY-MM-DD | Map4parts/partial/failedParts |200partialdrawavailable;503retrybackoff |

## Không khớp với frontend hiện tại

`web-shop/src/api/client.ts`: useMock mặcđịnhtrue; authApi mockpasswordaccepts≥6 và mock JWT, APIrealexpectsusernested như ng backend flat. register POST auth/register và profile PUT auth/me **không tồn tại**. orderApi realcalls không Bearer. CheckoutPage gửi shippingAddress object/itemsclientprices/paymentMethodCODorBANK_TRANSFER, backend nhận plain string/variantId+qty và provider mock. UIclearscart/navigateordersuccesssaudraftcreate chưa payment; phải tách “đã tạo đơn nháp” khỏi“đã thanh toán”. Những mocks chứa sample từ other-ecommerce không được copy vào assets/content/backend.

`web-admin/src/services/api.ts`: HTTP timeout4s, mọi error→null rồi có fallback Supabase/local mock. Ví dụ productstockupdate, orderstatusupdate, userrolechange fallback ghi DB trực tiếp có thể by pass RBAC/state/inventory. Xóa fallbackwriteởphaseintegration, preserveHTTPerrors. Khi `options.headers` có trong fetch spread sau default headers có thể overwrite mergedAuthorization: normalize headers bằng Headers construct trước fetch. `res.json()` on204 gâyexception; usecontent-type/body-aware. Empty[] backend success không được bị replaced default fixtures.

## Client architecture đề xuất (không sửa code trong nhiệm vụ này)

- Tách wireDTOs theo endpoint từ dictionary/Mapshapes và ViewModel có mapper cam elcase/UIenumlabel. UUIDbrandedstring; tiền VND lấy number server, formatIntlNumberFormatvi-VN, không dùng formatted currency string để tính.
- Requestmanager addsBearer access onlyAPIorigin, JSONheaderswhenbody; response unwraptheoendpointkind (`dto`,`map`,`array`,`page`,`void`,`blob`). Không automatic `body.data ?? body` vìflatDTOcóthểfielddata riêng.
- Error adapter `{httpStatus,rawCode,rawMessage,fieldErrors,reportErrors,traceId?,retryAfter?}`. Numericcodeenvelope≠tokenprefix. MapVietnamesehumanmessageseparate; unknownmessagekeeptrace không render HTML. CORS chưa expose trace/Retry-After/Content-Disposition nên fallback cool do wn60s/download file name và backend gap.
- Refresh single flight; tokenpersistencechọnSupabaseSDKsessionhoặcauthstorechốtRLS, nohardcodedJWT/cookieassumptions. Noquerytokenstrings. URLreturnTowhitelistsameoriginlocalpaths, reject external.
- Cachekeys `products`, `variants(productId)`, `order(id)`,`order-history(id)`,`ticket(id)`,`my-orders(user,page)`,`device(id)`,`command(id)`,adminqueries. Invalidate after mutation mình cần, không refresh fullsite. Ownercachesmustclearlogout/rolechange.
- CheckoutkeyserializedsessionStorageperorderattempt; preventdoubleclick; failednetworkcallretry**samekey**; afterGETrefreshsource. Review/refund/versionfutureunknownoutcomereload, noauto replay destructiveactions.
- Poll payment2s→5s/limit120s; command1s≤15s; device5–15svisibilityaware. TheseareFrontendPROPOSEDpolicies, backendnoWebsocket/SSE. Stoponunmount/pagehidden, AbortControlleravoidstalesetState. Clientabort không rollback server.
- DrafttimerderivedexpiresAt/server response; jobs disabled backend ảnh hưởngexpiryautorelease; noheartbeatfixfromclient. Warn“thời gian có thể thay đổi” nhưng chỉhiểnthịvalidtimestamp.

## Binary và partial

Exportuseblob, MIMEPDF/XLSX, revokeObjectURLafterdownload. ErrorresponseJSONparsedbeforeblobdependingstatus. Content-Dispositionfilename hợp lệ, chưa exposed headers nên fallback code/from/to của request. Dashboardnullshowpartretry, emptyarrayshow0rows, value0show0; partialbannerlistfailedParts. Keyboard focus error-summary/formfieldonfailure, announcebusyviaaria-live.

## Integration gates

No frontend source edit đã thực hiện. NewSDKregister/profile address/jobAPIsfeatureoff; marketing3Dassetsstaticfallbacklabeled; productioncheckout gateway missing flag, no button“SUCCESS”outside demo. Map everyuseractiontoexistingoperationorPROPOSED label; stateunit tests in[18](18-ACCEPTANCE-TEST-CASES.md).
