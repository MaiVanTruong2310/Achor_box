"""Refine documentation only; preserve source hashes and runtime evidence."""
import ast, json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'docs/frontend-handoff'

def replace(file, changes):
    p=OUT/file;s=p.read_text(encoding='utf-8')
    for a,b in changes.items():s=s.replace(a,b)
    p.write_text(s,encoding='utf-8')

replace('07-BUSINESS-RULES.md',{
 'INVALID_ORDER_TRANSITION409 (xem exact state-machine literal)':'INVALID_ORDER_TRANSITION, HTTP409',
 'TICKET_NOT_PENDING409/ORDER_NOT_PAID409':'TICKET_ALREADY_REVIEWED409 / TICKET_ORDER_NOT_PAID409',
 'TICKET_NOT_RETURNED409':'INVALID_TICKET_TRANSITION409',
 'BR20/21/23 mã literal cụ thể phải đọc source: inventoryđãtríchtấtcảerrors trongvalidation/source-evidence.json. Không coi tên minh họa trongtestcase là stableAPIcode nếu sourcekhác; frontend dựaHTTP+servermessage trước khi backend chuẩn hóa. Nhữngerrors đềxuất luôn labeledProposed.':'BR20/21/23 đã đối chiếu literal trong OrderStateMachine.requireTransition và ApprovalTicketService.act. Token nằm trong message, không phải field errorCode độc lập. Những lỗi đề xuất được ghi rõ PROPOSED.'
})
replace('09-EMAIL-NOTIFICATION-SPEC.md',{'ไม่lộinternalnotes':'không lộ ghi chú nội bộ','hòan':'hoàn'})
replace('18-ACCEPTANCE-TEST-CASES.md',{'但':' nhưng ','SmartboxBackendApplicationTests.java':'BackendApplicationTests.java','noproduccard':'không có product card'})
replace('contracts/MAP-RESPONSES.md',{
 'door_status,payload,created_at}` — kiểm tra tên timestamp migration003 bên dưới.':'door_status,payload,received_at}`.',
 'Sensor readings migration003 thực tế dùng `received_at`, projection GETreadings `SELECT * ... ORDER BY received_at`; **timestamp response là `received_at`, không created_at**.':'Sensor readings dùng `received_at`; GET readings sắp xếp theo trường này.'
})
replace('preview/index.html',{'Cho mỗi<br><span>':'Cho mỗi<br> <span>'})

# Normalize only prose, never fenced code, inline identifiers, paths, or JSON.
vn='''và là có không chưa đã đang một mỗi hai ba bốn năm từ đến theo với cho của trong ngoài khi nếu thì phải chỉ cần được nên để vào ra lại sau trước trên dưới cùng còn khác riêng thật thực tế mới cũ mọi đúng sai hợp lệ lỗi quyền nguồn mã phần việc vụ nghiệp thống hệ thiết bị đơn hàng khách người nhân viên giao lắp đặt nghiệm thu kiểm tra xét duyệt khóa mở cửa cảm biến cân trọng lượng bưu kiện thanh toán giá kho số tiền lượng giữ hoàn hủy hạn nháp sửa đổi gộp tối đa thiểu đủ thiếu dư âm dương yêu cầu điều kiện sở hữu trạng thái thông tin dữ liệu nội dung giải trình lý do từ chối bổ sung cập nhật phản hồi thành công thất bại chờ xử lý duy nhất giả mô phỏng minh họa tĩnh động xoay trước sau bên đỉnh ảnh tài sản bố cục kích thước dung tích tỷ lệ ánh sáng tối màu chữ nền nút viền khung thẻ tiêu đề nhãn trang màn hình điền nhập đọc ghi gửi nhận lịch sử sự tham chiếu ràng buộc bằng chứng xác nhận kiểm chứng triển khai tích hợp liên kết đồng thời bảo đảm toàn bộ công cụ tắt bật môi trường tài liệu thông báo quản trị sử dụng hoạt động đo thời gian giây phút ngày giờ tháng địa chỉ điện thoại mật khẩu tài khoản cấp vai trò bảo hành phân tiếp truy cập tự ý ghi chú trùng lặp mục bảng chứng máy chủ xử lý song song trễ bao gồm chính thức giá trị chuẩn hóa cách trường hỗ trợ phạm vi kết quả kết nối bổ sung giải phóng đối soát trả lời phép dễ khó trước đó ngay hiện tại đoạn ngắt chủ sở lộ thay cần đánh dấu hợp đồng kỹ thuật hướng dẫn lời quảng cáo buộc chạy đáp ứng dừng tính hợp hạn đọc nhanh chậm đếm chứa lấy dùng gắn chịu tồn cấp phép riêng biệt quyết định ưu tiên chi tiết mạng tải chặn bằng từ khi vào ngoài đa tối một lần thực hiện mở rộng trường hợp quy tắc được tạo không có có thể dù vẫn vừa chủ đề đề xuất tên mẫu số cách nhau nhạy cảm gián đoạn độc lập tối thiểu trì hoãn phải chốt toàn diện thủ công trước tiên đáp ứng từng'''.split()
en='''source frontend backend sourcefile api http code field errors data row rows table body header response request server client dto map array page user customer owner staff role roles auth token secret callback order orders item items product products variant variants sku stock price snapshot payment paid failed success pending confirmed completed cancelled shipment shipped delivered installation installationacceptance acceptance job jobs same only all no do not from input output history reason status event template email outbox worker claim retry retries lease key uuid query params typed boolean string number int long decimal date time timestamp expired expiry active inactive public private core legacy new real fake static mock demo scope scoped permission assigned assign reassignment reassign schedule technician support super accountant admin audit settings config content faq review return reject approve resubmit readonly lookup filter sort list detail mutation actions transaction tx error guard guards direct delta signed null empty default object file download binary total numeric true false verify validation valid invalid max min limits limit profile register address reset recovery password one each per first last available unavailable enabled disabled read write metadata runtime evidence timeout unknown outcome poll polling stop visibility refresh single flight keyboard focus reduced motion false count tests test concurrent concurrency inventory requestkey idempotency final checkout gateway prototype canvas base pro weight sensor capabilities online offline signed before after beforeget alias aliases join proxy rollback commit amount missing afterpaid received created updated sent refund refunded notification notifications delivery device devices firmware broker claim claims future planned proposed labels label lower uppercase arrow classname service database db mapper placeholder placeholders example examples snapshot payload recipient foreign unique constraint physical dimensions size capacity feature features endpoints endpoint readmodel actor contact signed delta token snapshot template counter locale marketing identifier adapter headers normalized internal external render renderer geometry pass stage stages signal readonly eligible gross net refunded query queue executor atomic integer errors namespace format created delivered availability range types signature readonly message successful terminal form helper helpers guards bound values optional required paymenturl source truth dictionary stale cache rollback totals cancel previous mutation whitelist flags phones side effects bind operator selected background surface dark cyan popup button drawer dialog control controlflow frontendonly databaseonly'''.split()
vocab=set(vn+en+'''preview hardware locked version capability capabilities luôn xong convert normalize xóa chống mất cắp risk duplicate many sellable enum entity intent preflight dupe lên nhiệm backfill remote lưu chứa serial serials migration machine optimistic subsequent add local assumesuccess movement ledger bằng tự nhiên principal allowed dedicated purchases lifecycle locked stale omit provider revocation annotation authorization origin allowlist refresh storm tạm hiển luận exception scoped mail eta kiến bắt chấp acceptance vòng crash accept cam kết exactly once Việt chung title Thymeleaf body mapping settings thông qua hotline record service account file bundle sẵn autoload liên quan freeze feature flag route app nhận plain những samples fallback writes overwrite Headers construct replaced fixtures mapper formatted currency render HTML expose persistence SDK session auth store invalidate mình cần influence heartbeat exposed source edit failfast readiness serverassignment minimalprojection projection crossjob newjob technicianassignment frontendtracking mockbusiness providermock networktimeout unknown doublecreate autopost ops actual environment oldpayload aftercreate bindings before after paid command already activated preactivation canonical readings required duplicate possible dedup monitoring scheduled sanitize published automatic issue issuance cardinality broad policy PII return URL flow compensation cross origin header filters fields running name names metric dimension query cancellation transaction orderlink attempt retrybackoff failafter snapshot người biểu đồ rõ lúc hoặc từ chối trước đây phản quyền và một tên thời trang từ câu góc nét nhấn chuyển mượt nhạy khung sơ dựng cụ cú khả năng bao mở sổ khi bạn điều tìm tốt dòng thủ trước cam kết chính trực tiếp tự động quyết thụ lịch tính mới thuật nghìn phần thanh đường mạng chẳng hạn tất cả nghĩa nhiên tạm thật nháp sở nghiệm dấu vùng khắp đổi hoàn minh tiện phủ nền chữ kho dữ liệu toàn cục nhân viên công việc phiên bản như với thư mục thuộc nên mới khiến lại chưa'''.split())
raw=json.loads((OUT/'contracts/openapi-runtime.raw.json').read_text(encoding='utf-8'))
protected=set(raw['components']['schemas'])
for schema in raw['components']['schemas'].values():protected.update(schema.get('properties',{}))
protected.update(p.stem for p in (ROOT/'backend/src/main/java').rglob('*.java'))
protected.update(['Supabase','SupabaseSDK','FCM','MQTT','SMTP','OpenAPI','JDBC','JSON','HTML','CSS','DTO','JWT','UUID','RLS','API','GET','POST','PATCH','PUT','DELETE','ACK','minAmount','paidAt','isRealSent','requestKey','orderId','commandId','maxDays','IfMatch','clientRequestId','PageJob','MyJobs'])
vocab.update(w.lower() for w in protected)
changes={}
def split_word(m):
    word=m.group();lower=word.lower()
    if len(word)<6 or lower in vocab or word in protected:return word
    accented=any(ord(c)>127 for c in word)
    if not accented and (len(word)<8 or re.search('[a-z][A-Z]',word) or word.isupper()):return word
    # Prefer the fewest, longest known syllables/words. Unknown sequences remain unchanged.
    memo={len(word):(0,[])}
    def solve(pos):
        if pos in memo:return memo[pos]
        best=None
        for end in range(len(word),pos,-1):
            piece=lower[pos:end]
            known=piece in vocab
            if not known and (not accented or not re.fullmatch('[a-z]{2,}',piece)):continue
            rest=solve(end)
            if rest is None:continue
            unknown=rest[0]+(0 if known else len(piece))
            candidate=(unknown,[word[pos:end]]+rest[1])
            if best is None or (candidate[0],len(candidate[1]))<(best[0],len(best[1])):best=candidate
        memo[pos]=best;return best
    solution=solve(0);parts=solution[1] if solution else None
    if parts and len(parts)>1:
        fixed=' '.join(parts);changes[word]=fixed;return fixed
    return word
# Prose is edited manually; do not attempt language segmentation of identifiers.

# Expand each operation's source evidence through helper/service calls.
tree=ast.parse((OUT/'_tools/build_contracts.py').read_text(encoding='utf-8'))
namespace={'re':re}
for node in tree.body:
    if isinstance(node,ast.FunctionDef) and node.name in ['balanced','methods']:
        exec(compile(ast.Module(body=[node],type_ignores=[]),'<scanner>','exec'),namespace)
methods=namespace['methods']
sources={p.stem:(p,p.read_text(encoding='utf-8-sig')) for p in (ROOT/'backend/src/main/java').rglob('*.java')}
method_map={name:methods(s) for name,(_,s) in sources.items()}
bindings={name:dict((field,clazz) for clazz,field in re.findall(r'(?:private|protected)\s+(?:final\s+)?(\w+)\s+(\w+)\s*;',s)) for name,(_,s) in sources.items()}
statuses={'BadRequestException':400,'ConflictException':409,'UnauthorizedException':401,'ForbiddenException':403}
def evidence(e):
    visited=set();errors=set();tables=set();guards=[]
    def visit(clazz,fn,depth=0):
        if depth>6 or (clazz,fn) in visited:return
        visited.add((clazz,fn))
        candidates=method_map.get(clazz,{}).get(fn,[])
        if clazz=='DeviceWorkflowService' and fn=='command':
            candidates=[x for x in candidates if ('Control control' in x['params'])==(e['method']=='POST')]
        for method in candidates:
            body=method['body']
            for x in re.finditer(r'new\s+(\w+Exception)\((?:(\d+),\s*)?"([^"\n]+)',body):
                status=int(x.group(2)) if x.group(2) else statuses.get(x.group(1))
                if status:errors.add((status,x.group(3)))
            tables.update(re.findall(r'(?:INSERT INTO|UPDATE|DELETE FROM)\s+public\.(\w+)',body))
            for field,target in re.findall(r'(\w+)\.(\w+)\(',body):
                if field in bindings.get(clazz,{}):visit(bindings[clazz][field],target,depth+1)
            for helper in re.findall(r'(?<![.\w])([a-z]\w*)\(',body):
                if helper in method_map.get(clazz,{}):visit(clazz,helper,depth+1)
            for helper in re.findall(r'this::([a-z]\w*)',body):
                if helper in method_map.get(clazz,{}):visit(clazz,helper,depth+1)
    for call in e['calls']:
        file,fn=call.split('::');visit(Path(file).stem,fn)
    return sorted(errors),sorted(tables),sorted('::'.join(v) for v in visited)

inventory=json.loads((OUT/'contracts/source-inventory.json').read_text(encoding='utf-8'))
doc=(OUT/'06-API-CONTRACTS.md').read_text(encoding='utf-8')
sections=re.split(r'(?=^### API-\d+)',doc,flags=re.MULTILINE)
for i,e in enumerate(inventory,1):
    section=re.split(r'\n\*\*(?:Lỗi business qua helper/service|Side effects qua helper/service)',sections[i])[0]
    errors,tables,visited=evidence(e);e['helperErrors']=[{'http':s,'messagePrefix':m}for s,m in errors];e['reachableMethods']=visited
    if e['method']=='GET':idem='Đọc; có thể gọi lại. Kết quả có thể thay đổi theo dữ liệu mới.'
    elif e['handler']=='checkout':idem='Cùng key/order trong 24 giờ trả response snapshot lần đầu. Key dùng lại cho order khác bị409. Retry mạng giữ cùng key, sau đó GET order để xác minh trạng thái mới.'
    elif e['handler']=='callback':idem='Callback hợp lệ terminal success/refund_required/refunded được ACK mà không tạo ticket/history/outbox trùng. Chữ ký và amount vẫn phải hợp lệ.'
    elif e['controller']=='DeviceWorkflowController' and e['method']=='POST' and e['handler']=='command':idem='requestKey UUID cùng command/device được dùng lại; khác command bị409. Response lần dùng lại có id thay commandId; xem Map contract.'
    elif e['handler'] in ['cancel','deliver','refund','activate']:idem='Có guard terminal trong service. Khi timeout đọc lại trạng thái trước retry; không suy diễn mọi tham số khác vẫn được chấp nhận. Xem literal lỗi và source bên dưới.'
    else:idem='Không có Idempotency-Key trong handler này. Không tự retry mutation khi timeout; đọc lại để xác định kết quả. Toggle/review/create có thể đổi trạng thái hoặc tạo trùng nếu replay.'
    section=re.sub(r'\*\*Idempotency:\*\*[^\n]*','**Idempotency:** '+idem,section)
    if e['controller']=='DeviceWorkflowController' and e['handler']=='command' and e['method']=='GET':
        section=re.sub(r'\*\*Preconditions/business:\*\*[^\n]*','**Preconditions/business:** Owner đúng thiết bị và commandId thuộc thiết bị. GET chỉ đọc, không yêu cầu MQTT bật/online/activated như POST command.',section)
    if errors:
        section+='\n**Lỗi business qua helper/service (source, không phải errorCode field):**\n\n| HTTP | Tiền tố message literal |\n|---|---|\n'+''.join(f'| {status} | `{message.replace("|"," / ")}` |\n'for status,message in errors)+'\nCác nhánh còn phụ thuộc điều kiện và role của endpoint; đây là literal trích từ code, không chứng minh đã gọi được mọi nhánh. Lỗi validation/auth/DB chung xem Quy ước và [07](07-BUSINESS-RULES.md).\n'
    if tables and e['method']!='GET':section+='\n**Side effects qua helper/service:** '+', '.join('`'+t+'`'for t in tables)+'. JPA/provider có thể có thêm tác động như mô tả module; SQL này được commit theo transaction service.\n'
    # Do not present a JSON body for a void operation, or bytes as a normal JSON array.
    if 'void>' in e['return'] or e['return']=='void':
        section=re.sub(r'(Schema Springdoc:\n\n)```json\n[\s\S]*?```',r'\1Không có body. Không gọi res.json() vô điều kiện.',section,count=1)
    if 'byte[]' in e['return']:
        section=re.sub(r'(Schema Springdoc:\n\n)```json\n[\s\S]*?```',r'\1Body nhị phân PDF/XLSX theo format, không phải JSON. Đọc Content-Type, xử lý error JSON trước blob. Content-Disposition hiện chưa được CORS expose.',section,count=1)
    sections[i]=section
(OUT/'06-API-CONTRACTS.md').write_text(''.join(sections),encoding='utf-8')
(OUT/'contracts/source-inventory.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'proseWordsNormalized':len(changes),'operationsEnriched':len(inventory)},ensure_ascii=False))
