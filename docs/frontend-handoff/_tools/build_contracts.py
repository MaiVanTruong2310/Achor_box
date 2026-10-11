"""Source/OpenAPI inventory; read-only for application code. Python stdlib only."""
import re,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'docs/frontend-handoff'
JAVA=ROOT/'backend/src/main/java/com/smartbox/backend'

def balanced(s,start,op='(',cl=')'):
    depth=0;quoted=False;escaped=False
    for i in range(start,len(s)):
        c=s[i]
        if escaped:escaped=False;continue
        if c=='\\' and quoted:escaped=True;continue
        if c=='"':quoted=not quoted;continue
        if quoted:continue
        if c==op:depth+=1
        if c==cl:
            depth-=1
            if depth==0:return i
    raise ValueError('Unbalanced source')

def methods(s):
    result={}
    for m in re.finditer(r'\b(?:public|private|protected)\s+(?:static\s+)?([\w<>,.?\[\] ]+?)\s+(\w+)\s*\(',s):
        start=s.index('(',m.start());end=balanced(s,start);b=s.find('{',end)
        if b<0:continue
        endbody=balanced(s,b,'{','}')
        result.setdefault(m.group(2),[]).append({'return':m.group(1),'params':s[start+1:end],'body':s[b+1:endbody],'line':s[:m.start()].count('\n')+1,'start':m.start(),'end':endbody})
    return result

service_sources={p.stem:(p, p.read_text(encoding='utf-8-sig')) for p in (JAVA/'service').glob('*.java')}
service_methods={name:methods(s) for name,(p,s) in service_sources.items()}
inventory=[]
for p in (JAVA/'controller').glob('*.java'):
    s=p.read_text(encoding='utf-8-sig');prefix=s[:s.find('public class')]
    base=re.search(r'@RequestMapping\("([^"]+)"\)',prefix);base=base.group(1) if base else ''
    mm=methods(s)
    bindings=dict((field,clazz) for clazz,field in re.findall(r'private final (\w+) (\w+);',s))
    for mapping in re.finditer(r'@(Get|Post|Put|Patch|Delete)Mapping\b',s):
        nextmethod=[v for vals in mm.values() for v in vals if v['start']>mapping.start()]
        if not nextmethod:raise ValueError(p.name)
        item=min(nextmethod,key=lambda v:v['start']);name=next(k for k,v in mm.items() if item in v)
        between=s[mapping.end():item['start']]
        match=re.match(r'\s*\(\s*"([^"]*)"',between);path=base+(match.group(1) if match else '')
        calls=[];errors=[];effects=[]
        for field,fn in re.findall(r'(\w+)\.(\w+)\(',item['body']):
            clazz=bindings.get(field)
            if not clazz or clazz not in service_sources:continue
            sp,ss=service_sources[clazz];calls.append(f'{sp.relative_to(ROOT).as_posix()}::{fn}')
            candidates=service_methods[clazz].get(fn,[])
            for candidate in candidates:
                errors+=re.findall(r'new (\w+Exception)\((?:\d+,\s*)?"([^"\n]+)',candidate['body'])
                effects+=re.findall(r'(?:INSERT INTO|UPDATE|DELETE FROM)\s+public\.(\w+)',candidate['body'])
        inventory.append({'method':mapping.group(1).upper(),'path':path,'controller':p.stem,'handler':name,'source':p.relative_to(ROOT).as_posix(),'line':s[:mapping.start()].count('\n')+1,'signature':item['params'],'return':item['return'],'body':item['body'],'calls':calls,'errors':errors,'effects':sorted(set(effects)),'valid':('@Valid' in item['params']),'demo':('@Profile("demo")' in s)})

def access(e):
    p=e['path'];m=e['method'];c=e['controller'];h=e['handler']
    if (m=='POST' and p in ['/api/auth/login','/api/auth/refresh-token','/api/payments/callback']) or (m=='GET' and (p in ['/api/products','/api/products/categories'] or re.fullmatch(r'/api/products/\{id\}/variants',p))):return 'Public; callback cần HMAC, không cần Bearer' if 'callback' in p else 'Public'
    if c=='AuthController':return 'Bearer; mọi role hợp lệ, tài khoản chưa khóa'
    if c=='UserController':return 'super_admin' if h in ['createStaffUser','updateRole'] else 'super_admin/support_agent; support chỉ khóa customer'
    if c=='ProductController':return 'super_admin/product_manager/support_agent/accountant' if m=='GET' else 'super_admin/product_manager'
    if c in ['DashboardController','ConcurrentDashboardController','RevenueReportController']:return 'super_admin/accountant'
    if c=='AuditLogController':return 'super_admin/accountant' if m=='GET' else 'super_admin'
    if c=='ContentController':return 'super_admin/product_manager'
    if c=='SettingsController':return 'super_admin'
    if c=='PromotionController':return 'super_admin/product_manager/support_agent/accountant' if m=='GET' else 'super_admin/product_manager'
    if c=='WarrantyController':return 'super_admin/support_agent' if h=='assignTechnician' else 'super_admin/support_agent/technician; mutation technician chỉ claim được giao'
    if c=='DeviceController':return 'super_admin/technician'
    if c=='OrderController':return 'super_admin/support_agent/accountant' if m=='GET' else 'super_admin/support_agent'
    if c=='MockPaymentController':return 'Bearer + chủ đơn; chỉ profile demo'
    if c=='NotificationController':return 'Bearer + dữ liệu principal'
    if c=='DeviceWorkflowController':return 'super_admin/technician' if h=='register' else 'Bearer + owner thiết bị'
    if c=='CommerceController':
        if h in ['create','mine','add','quantity','remove','checkout','resubmit']:return 'Bearer + chủ đơn (create/mine theo principal)'
        if h in ['detail','history','ticket']:return 'Chủ đơn hoặc super_admin/support_agent/accountant'
        if h=='tickets':return 'super_admin/support_agent/accountant'
        if h in ['approve','returnTicket','reject','ship','deliver']:return 'super_admin/support_agent'
        if h=='cancel':return 'Chủ đơn trước paid; super_admin/support_agent trước shipment SHIPPED'
        if h=='assign':return 'super_admin/support_agent/technician'
        if h in ['refunds','refund']:return 'super_admin/accountant'
        if h in ['emails','resend']:return 'super_admin/support_agent'
    raise ValueError(('Missing access mapping',e))

notes={
'create':'OrderWorkflowService: shippingAddress string, email profile bắt buộc; items variantId 1–99, tối đa 100 entries; merge trùng rồi reserve kho. Không có recipientName/phone riêng, shipping fee/coupon/COD.',
'add':'Chỉ workflow_version=2, pending và chưa hết draft; cộng qty, giữ snapshot lần đầu; khóa order và SKU, guard stock.',
'quantity':'Chỉ pending chưa hết hạn; quantity là số lượng đích, không phải delta. Giảm qty trả kho, tăng qty kiểm tra active và stock.',
'remove':'Chỉ pending chưa hết hạn; hoàn đúng qty đã giữ rồi xóa row và tính lại total.',
'checkout':'Idempotency-Key bắt buộc <=128 ký tự, response lưu 24h; cùng key/order trả nguyên response. Order pending unexpired, items không rỗng và total>0; provider mock. Không re-checkout cancelled: tạo order mới.',
'callback':'HMAC-SHA256 xác minh trước mutation; khóa order→payment; amount/order match; duplicate success ACK; expired/cancelled SUCCESS tạo refund_required, không hồi sinh order. Không phải API frontend xác nhận paid.',
'cancel':'Legacy workflow 1 bị chặn; cancelled lặp trả view; customer paid/confirmed bị chặn; shipment không PREPARING bị chặn. Paid cancellation tạo refund; hoàn kho một lần.',
'approve':'Ticket PENDING, order paid; update APPROVED + order confirmed + shipment PREPARING trong transaction; audit/history/outbox. Chưa phân công kỹ thuật viên.',
'returnTicket':'Ticket PENDING/order paid; reason bắt buộc. Ticket RETURNED nhưng order vẫn paid, items bất biến.',
'resubmit':'Chủ đơn, ticket RETURNED/order paid; reason bắt buộc; ticket PENDING, review_round tăng. Chỉ text reason, chưa có attachments.',
'reject':'Ticket PENDING/order paid; reason bắt buộc; REJECTED, order cancelled, refund PENDING, stock restore, outbox.',
'ship':'Order confirmed, shipment PREPARING; ghi carrier/tracking, SHIPPED và email. Đây là shipment cũ, không tương đương công việc delivery_installations.',
'deliver':'Shipment SHIPPED, số devices gắn order item phải bằng quantity; hoàn thành shipment và order, owner được gắn lúc này. Chưa kiểm tra lắp đặt/ACK/nghiệm thu, vì vậy PARTIAL so với nghiệp vụ mới.',
'assign':'Order confirmed, serial chưa bán, đúng product và variant; không vượt quantity. Gắn sold_order_item_id nhưng chưa owner trước deliver.',
'refund':'super_admin/accountant đối soát providerRef; cùng refund/ref lặp idempotent; không chuyển tiền thật. Email khách sau COMPLETED.',
'resend':'Chỉ email FAILED; reset attempts=0 rồi PENDING, không gửi SMTP trong request.',
'activate':'Owner, sold_order_item_id có order completed. activated_at COALESCE nên lặp an toàn. Chưa chờ nghiệm thu installation.',
'command':'Owner; MQTT enabled, activated và online; TARE cần has_weight_sensor. Key request UUID idempotent cùng command; max20/min/device. Trả PENDING không phải đã mở khóa. GET command trả ACK/timeout.',
'register':'Chỉ nhân viên; tạo device mới từ variant thật và topic prefix cấu hình; serial/topic unique theo DB. Không đăng ký account khách.',
}
screen={'AuthController':'Login/Session','ProductController':'Catalog/ProductDetail/AdminProducts','OrderController':'AdminOrders','CommerceController':'Cart/Checkout/MyOrders/Ticket/AdminReview/Shipment/Emails','DeviceController':'AdminDevices','DeviceWorkflowController':'MyDevices/DeviceDetail','NotificationController':'NotificationCenter','PromotionController':'AdminPromotions (không nối checkout)','UserController':'AdminUsers/Customer360','WarrantyController':'AdminWarranty (không customer)','SettingsController':'AdminSettings','ContentController':'AdminCMS (không public CMS)','AuditLogController':'AdminAudit','RevenueReportController':'AdminReports','DashboardController':'AdminDashboard legacy','ConcurrentDashboardController':'AdminDashboard','MockPaymentController':'DemoPayment (không production)'}
raw=json.loads((OUT/'contracts/openapi-runtime.raw.json').read_text(encoding='utf-8-sig'))
schemas=raw.get('components',{}).get('schemas',{})
def clean(x):
    if isinstance(x,dict):return {k:clean(v) for k,v in x.items() if k not in ['example','examples']}
    if isinstance(x,list):return [clean(v) for v in x]
    return x
api=clean(raw);api['servers']=[{'url':'http://localhost:8080','description':'Dev; URL deployment phải cấu hình riêng'}]
api['info']['description']='Live Springdoc đối chiếu source 10/10/2026; x-source/x-access là chú giải audit. Không phải chứng nhận E2E mọi endpoint. Demo paths chỉ profile demo.'

def typ(s):
    if '$ref' in s:return s['$ref'].split('/')[-1]
    if s.get('type')=='array':return 'array<'+typ(s.get('items',{}))+'>'
    return s.get('type','object')+('('+s['format']+')' if s.get('format') else '')
def constraints(s):return ', '.join(f'{k}={v}' for k,v in s.items() if k in ['minimum','maximum','minLength','maxLength','pattern','minItems','maxItems','enum','default']) or 'Không khai báo trong schema; xem service/rules'
def resolve(s):return schemas.get(s.get('$ref','').split('/')[-1],s)
def fields(s):
    s=resolve(s);required=s.get('required',[])
    return '\n'.join(f'| `{k}` | {typ(v)} | {"Có" if k in required else "Không khai báo @NotNull trong schema"} | {constraints(v)} |' for k,v in s.get('properties',{}).items())
def example(s,depth=0):
    if depth>3:return '<nested>'
    s=resolve(s)
    if s.get('type')=='array':return [example(s.get('items',{}),depth+1)]
    if s.get('properties'):return {k:example(v,depth+1) for k,v in s['properties'].items()}
    if s.get('format')=='uuid':return '<UUID>'
    if s.get('format')=='date':return '<yyyy-MM-dd>'
    if s.get('format')=='date-time':return '<ISO-8601 timestamp>'
    if s.get('type') in ['number','integer']:return 1
    if s.get('type')=='boolean':return True
    if s.get('type')=='object':return {'<dynamic-key>':'Xem MAP-RESPONSES.md; không suy diễn schema này'}
    return '<'+s.get('type','value')+'>'

runtime={(m.upper(),p) for p,v in raw['paths'].items() for m in v if m in ['get','post','put','patch','delete']}
source={(e['method'],e['path']) for e in inventory}
if runtime!=source:raise ValueError({'runtime_only':list(runtime-source),'source_only':list(source-runtime)})
for e in inventory:
    e['access']=access(e)
    e['status']='PARTIAL' if (e['controller']=='CommerceController' and e['handler']=='deliver') or e['handler'] in ['verifyResetPassword','sendResetOtp','testSendTemplate'] else 'IMPLEMENTED'
    e['notes']=notes.get(e['handler'],'') if e['controller'] in ['CommerceController','DeviceWorkflowController'] else ''
    if e['controller']=='MockPaymentController':e['notes']='Chỉ profile demo; chính owner gọi mock result. detail SQL row không phải Payment result từ gateway thật.'
    if e['controller']=='PromotionController':e['notes']='CRUD/validate hiện có; customer bị RBAC chặn cả POST validate; checkout không sử dụng coupon. Date parsing legacy có fallback, không coi là validation chặt.'
    if e['controller']=='WarrantyController':e['notes']='Staff-only; lookup không phải public API. Technician mutation chỉ claim được giao; chưa có customer create claim/warranty issuance khi bán.'
    if e['controller']=='SettingsController':e['notes']='Template DB legacy không nối Thymeleaf outbox. test-send có thể success=true trong simulation: phải xét isRealSent. Không có CRUD shipping/payment/category ở controller này.'
    if e['controller']=='ProductController':e['notes']='Public list vẫn có thể chứa inactive; lọc isActive/variant.isActive. ProductResponse chưa expose hasWeightSensor. SKU stock dùng variant, không product.stockQuantity; update cần ID variant cũ, delete soft deactivate.'
    if e['controller']=='ContentController':e['notes']='Admin-only, không dùng cho Blog/FAQ public; phần lớn DTO không @Valid, enum/body sanitation cần kiểm tra riêng. Không chạy HTML không tin cậy.'
    op=api['paths'][e['path']][e['method'].lower()];op['x-source']=e['source']+':'+str(e['line']);op['x-access']=e['access'];op['x-implementation-status']=e['status']
    if e['access'].startswith('Public'):op['security']=[]
inventory.sort(key=lambda e:(e['controller'],e['path'],e['method']))
(OUT/'contracts/source-inventory.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'contracts/openapi-audited.json').write_text(json.dumps(api,ensure_ascii=False,indent=2),encoding='utf-8')

catalog=['# 06 — API contracts thực tế và dự kiến','', '## Mục lục','', '- [Quy ước](#quy-ước)','- [Catalog mọi endpoint](#catalog-mọi-endpoint)','- [DTO dictionary](contracts/DTO-DICTIONARY.md)','- [Map responses chính xác](contracts/MAP-RESPONSES.md)','- [Proposed API Contract](contracts/PROPOSED-API.md)','', '## Quy ước','',f'Đã đối chiếu **{len(inventory)} operations** trong source với Springdoc runtime (profile demo, H2 trong RAM, workers tắt). H2 chỉ để xuất metadata, không kiểm chứng SQL business. OpenAPI thô có annotation lỗi thời về OTP/cache/payment; mô tả dưới đây ưu tiên code Service/Security. `{len(runtime)}` runtime/source routes khớp. Không gọi DB thật.','', 'Auth/role trong cột quyền là giao của filter và service, không chỉ global Swagger Bearer. Trừ public paths, luôn cần access token Supabase + profile role hợp lệ chưa khóa. X-Trace-Id tùy chọn; X-Trace-Id response được tạo bởi TraceFilter. API đa số trả DTO/Map trực tiếp, **không unwrap data chung**. Error envelope numeric code theo HTTP; token nghiệp vụ nằm trong message, không có errorCode riêng. Report params dùng code string ngoại lệ.','', 'Không có sort query mặc định ngoài cái khai báo dưới đây. UUID là string; BigDecimal ra JSON number; date/timestamp theo kiểu DTO. required từ OpenAPI không thay cho thực tế @Valid: bảng DTO ghi annotation, mục endpoint ghi có @Valid hay không. JSON ví dụ dùng placeholders, là minh họa shape, không copy dữ liệu requirements và không phải request gửi nguyên xi.','', 'Pagination legacy `/paged`: content/currentPage/pageSize/totalElements/totalPages/numberOfElements/isFirst/isLast/hasNext/hasPrevious. page=0,size=10 mặc định AppConstants; mới commerce/device/notification default0/20, max100, trả array, không metadata; emails trả content/page/size/totalElements.','', 'Shared error handling: 400 body/type/UUID/validation; 401 thiếu/sai token/locked; 403 sai role/owner; 404 missing row; 409 state/stock/constraint/lock; 429 auth/device rate limit; 503 auth provider/MQTT/font/dashboard config; 500 generic có traceId header. Các endpoint chưa có guard riêng có thể trả 500 khi input null; không mô tả mọi 400 như đã có.','', '## Catalog mọi endpoint','', '| ID | Method/path | Controller.handler | Trạng thái |','|---|---|---|---|']
for i,e in enumerate(inventory,1):e['id']=f'API-{i:03}';catalog.append(f'| {e["id"]} | `{e["method"]} {e["path"]}` | `{e["controller"]}.{e["handler"]}` | {e["status"]}{"; demo-only" if e["demo"] else ""} |')
for e in inventory:
    op=raw['paths'][e['path']][e['method'].lower()];params=op.get('parameters',[]);content=op.get('requestBody',{}).get('content',{});bs=next(iter(content.values()),{}).get('schema',{});responses=op.get('responses',{})
    success='201' if 'status(201)' in e['body'] else '204' if 'noContent' in e['body'] else '200'
    title=e['controller'].replace('Controller','')+' / '+e['handler']
    catalog += ['',f'### {e["id"]} — {e["method"]} `{e["path"]}`','',f'**Module/mục đích:** {op.get("summary",title)}. **Trạng thái:** {e["status"]}{" (profile demo)" if e["demo"] else ""}.','',f'**Quyền:** {e["access"]}. **Màn hình:** {screen[e["controller"]]}.','',f'**Source:** [{e["controller"]}.{e["handler"]}](../../{e["source"]}) dòng {e["line"]}; service: '+('; '.join('`'+c+'`' for c in e['calls']) or 'Xử lý trực tiếp ở controller')+'.','', '**Parameters/headers:**','', '| Tên | Vị trí | Kiểu | Required/default/constraint |','|---|---|---|---|']
    for p in params:catalog.append(f'| `{p["name"]}` | {p["in"]} | {typ(p.get("schema",{}))} | required={p.get("required",False)}; {constraints(p.get("schema",{}))} |')
    if not params:catalog.append('| — | — | — | Không có path/query/header khai báo thêm |')
    catalog += ['', '**Request body/validation:** '+(typ(bs) if bs else 'Không có body')+f'; controller @Valid = {e["valid"]}.']
    if bs and fields(bs):catalog += ['','| Field | Kiểu | Required | Constraint |','|---|---|---|---|',fields(bs)]
    if bs:catalog += ['','Ví dụ body **placeholder minh họa**, thay bằng dữ liệu hợp lệ:','```json',json.dumps(example(bs),ensure_ascii=False,indent=2),'```']
    catalog += ['', '**Preconditions/business:** '+(e['notes'] or 'Theo `'+', '.join(c.split('::')[-1] for c in e['calls'])+'`; DB FK/unique và guards thực tế áp dụng. Xem [Business Rules](07-BUSINESS-RULES.md) và DTO dictionary cho module.'),'', '**Side effects:** '+('Đọc; không mutation nghiệp vụ.' if e['method']=='GET' else ('Các bảng ghi trực tiếp tìm thấy trong service handler: '+', '.join(e['effects'])+'.' if e['effects'] else 'Service handler thay đổi entity/JPA hoặc gọi workflow/provider; xem source liên kết. Không tự suy diễn gửi email cho CRUD legacy.')),'', '**Idempotency:** '+('HTTP GET đọc có thể gọi lại.' if e['method']=='GET' else 'Checkout: cùng key/order 24h trả snapshot; callback: terminal ACK; command: requestKey; cancel/deliver/refund/activate có terminal guard. Với CRUD/toggle/create khác không có key: tránh auto retry mutation khi timeout, tải lại dữ liệu trước.'),'', '**Pagination/sorting:** '+('; '.join(p['name']+'='+str(p.get('schema',{}).get('default','tùy chọn')) for p in params if p['name'] in ['page','size','range','status','category','position','activeOnly','publishedOnly']) or 'Không có pagination/sort query trong handler; thứ tự theo service hoặc DB.'),'',f'**Success HTTP:** {success}; response signature `{e["return"]}`. Schema Springdoc:']
    good=responses.get(success) or responses.get('200') or next(iter(responses.values()),{})
    rc=good.get('content',{});rs=next(iter(rc.values()),{}).get('schema',{})
    catalog += ['','```json',json.dumps(example(rs),ensure_ascii=False,indent=2) if rs else '{"note":"Không có response body (void/204), hoặc file nhị phân đối với export"}','```']
    if rs and (typ(rs)=='object' or 'object' in typ(rs)):catalog += ['','Map schema cần đối chiếu [MAP-RESPONSES.md](contracts/MAP-RESPONSES.md); không coi dynamic-key trong ví dụ là tên field thật.']
    catalog += ['', '**Errors/UI:** shared 400/401/403/404/409/429/503/500 chỉ khi nhánh có code; request timeout không chứng minh mutation rollback. Dùng message + HTTP, show traceId; 401 refresh một lần single-flight, 403 không fallback Supabase, 409 reload state/stock; không thông báo success nếu bị reject.']
    if e['errors']:catalog += ['','Literals ngay trong handler: '+ '; '.join('`'+a+'`: `'+b+'`' for a,b in e['errors'])+'. Các helper/service được gọi có thêm lỗi như rules.']
    if e['handler']=='verifyResetPassword':catalog += ['','**PARTIAL:** service luôn ném 503 `AUTH_PROVIDER_RECOVERY_REQUIRED`; không có success thực thi mặc dù DTO/Swagger vẫn khai báo.']
    if e['controller']=='MockPaymentController':catalog += ['','**Demo:** không đưa flow tự chọn SUCCESS vào frontend production.']
(OUT/'06-API-CONTRACTS.md').write_text('\n'.join(catalog)+'\n',encoding='utf-8')

dictionary=['# DTO dictionary — schema hiện tại','', 'Không sao chép @Schema example có sẵn. Required/constraints là metadata; chỉ được controller có @Valid thực thi Bean Validation. Những field không required vẫn có thể cần business/DB, hoặc là response field optional/null. Xem endpoint tương ứng.','']
for name,s in sorted(schemas.items()):
    dictionary+=['## '+name,'','| Field | Kiểu | Required | Constraint |','|---|---|---|---|',fields(s) or 'Schema: `'+typ(s)+'`','']
(OUT/'contracts/DTO-DICTIONARY.md').write_text('\n'.join(dictionary),encoding='utf-8')
evidence=[]
for p in sorted(JAVA.rglob('*.java')):
    s=p.read_text(encoding='utf-8-sig');evidence.append({'file':p.relative_to(ROOT).as_posix(),'lines':len(s.splitlines()),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'methods':sorted(methods(s)),'errors':sorted(set(b for a,b in re.findall(r'new (\w+Exception)\((?:\d+,\s*)?"([^"\n]+)',s))),'queries':re.findall(r'@Query\("([^"\n]+)',s)})
(OUT/'validation/source-evidence.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2),encoding='utf-8')
baseline={str(p.relative_to(ROOT)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for tree in ['backend/src','web-shop/src','web-admin/src'] for p in (ROOT/tree).rglob('*') if p.is_file()}
if not (OUT/'validation/application-hashes.json').exists():
    (OUT/'validation/application-hashes.json').write_text(json.dumps(baseline,indent=2),encoding='utf-8')
(OUT/'validation/api-audit.json').write_text(json.dumps({'date':'2026-10-10','sourceOperations':len(source),'runtimeOperations':len(runtime),'differences':[],'runtime':'Spring Boot built jar, demo profile, isolated H2 memory, workers disabled','limitations':['No live PostgreSQL business calls in this documentation task','Swagger Map response incomplete; hand-reviewed shape supplement','Global Swagger security differs from actual public-path/RBAC filter']},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'operations':len(inventory),'schemas':len(schemas),'javaFilesRead':len(evidence)},ensure_ascii=False))
