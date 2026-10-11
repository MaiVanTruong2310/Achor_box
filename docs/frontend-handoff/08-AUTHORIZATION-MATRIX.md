# 08 — Authorization matrix

Nguồn: `JwtAuthenticationFilter.publicPath/authorize`, `CurrentActor.Actor`, từng service.requireRoles/requireOwner. Đây là quyền thực tế, khác menu frontend và glo ba lSwaggerBearer. `technician` không tự nhiên có quyền delivery job (chưa có code).

| Chức năng/API group | Guest | Customer | Product manager | Support | Technician | Accountant | Super |
|---|---|---|---|---|---|---|---|
| Public GET products/categories/variants | Có | Có | Có | Có | Có | Có | Có |
| Productpaged/readprotected | — | — | Có | Có | — | Có | Có |
| ProductCRUD/stock variant | — | — | Có | — | — | — | Có |
| Ownordercreate/items/checkout/mine | — | Own | Own | Own | Own | Own | Own |
| All orders/paged/detail/history | — | Own detail/history | Không all/detail staff | Có | Không all/detail staff | Có read | Có |
| Cancel order | — | Ownpending/awaiting | — | StaffbeforeSHIP | — | — | StaffbeforeSHIP |
| Ticketlist | — | — | — | Có | — | Có read | Có |
| Ticketdetail | — | Own | — | Có | — | Có | Có |
| Approve/Return/Reject | — | — | — | Có | — | — | Có |
| Resubmit | — | Own RETURNED | Own RETURNED | Own RETURNED | Own RETURNED | Own RETURNED | Own RETURNED |
| Shipmentship/deliver/tracking | — | — | — | Có | — | — | Có |
| Serial assign order | — | — | — | Có | Có (không job-scoped hiện tại) | — | Có |
| Refund list/complete | — | — | — | — | — | Có | Có |
| Email admin/resend | — | — | — | Có | — | — | Có |
| Device list/all/events/status | — | — | — | — | Có | — | Có |
| Register device | — | — | — | — | Có | — | Có |
| Ownactivation/commands/readings/packages | — | Own | Own | Own | Own | Own | Own |
| Ownnotifications/tokens/preferences | — | Own | Own | Own | Own | Own | Own |
| Warranty lookup/list | — | — | — | Có | Có broad read | — | Có |
| Warranty assign | — | — | — | Có | — | — | Có |
| Warranty status/notes | — | — | — | Có | Assigned claim only | — | Có |
| User list/360/lock/recovery | — | — | — | Có,lockcustomeronly | — | — | Có |
| Staffcreation/rolechange | — | — | — | — | — | — | Có |
| Content/CMS/reviews/FAQ | — | — | Có | — | — | — | Có |
| PromotionGET | — | — | Có | Có | — | Có | Có |
| Pro motion mutation/validatePOST | — | — | Có | — | — | — | Có |
| Settings | — | — | — | — | — | — | Có |
| Dashboard/reports | — | — | — | — | — | Có | Có |
| Audit read/write | — | — | — | — | — | Read | Read/write |
| Delivery Installation | — | PLANNED owntracking | — | PLANNED assign | PLANNED assigned only | — | PLANNEDmanage |

Owner APIs không limit role customer vìserverdùngprincipalrequireOwner. Nhưng `detail`/ticketdetail phân staff rolec ứng: product_manager/technician có thể tự createorder như ng detail bị403 mặc dùown, vìactor.staff=true → allowed roles kiểm tra; đây là **gap khi nhân viên cũng mua hàng**. Frontend MVPcommerce dànhcustomer; không đánh dấu staff purchases full lifecycle đã support.

## Session và UI guards

Login/refresh public; privatepaths requireSupabaseaccess, profileUUID roleoneofsix và not locked. RoleDB là truth, không client claims role. PublicGET nếu gửi Bearer sai vẫn401 do filter xác minh; catalog GET guest có thể omit staleBearer, đừngresettoànapp vìpublicfetch. OPTIONSpublicCORS. CallbackpublicHMAC independentBearer. Logoutbearer và provider revocation, log annotation audit không thực sự ghi trongAuthService.

Customer403 cross owner giữ data unavailable không fallbackDB/mock. Hiddenmenu không authorization. Khirolechange/lock,sau request tiếp role DB áp dụng; sessionmemoryUIrefetchidentity nếu API self profile thiếu không dựng role new. Avoidtoken gửi đến paymentURL external ngoài origin allowlist.

Refresh single-flight 1 lần sau401; concurrentrequests không tạo refresh storm. Retry GETokay; checkout retry giữ key; noautoPOreview/refund/create nếu unknown outcome. Authentication503 provider unavailable hiểnthịtạmgiánđoạn, không kết luận bad password. Filter invalid exception có thể chuyển401 cho lỗi ngoài AppException; logtrace backend phải check.

## Quyền cần bổ sung cho installation

Dùng technician assigned job guard, không cấp GET all orders/users hoặc ticket approve. Staff job projection riêng chỉ contact/address/items cần thiết. Assigned technician có scoped installation command quyền server thay owner-only control hiện có; khôngmượn token customer. Assign/reassign super/support; customerreadownjoblimited; acceptance technicianattestation + serverevidencecheck. Backendgaplisted[17](17-BACKEND-GAP-ANALYSIS.md).
