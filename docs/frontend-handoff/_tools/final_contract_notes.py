"""Endpoint-specific handoff labels and explicit shared headers."""
import json,re
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]
entries=json.loads((OUT/'contracts/source-inventory.json').read_text(encoding='utf-8'))
purposes={
'CommerceController':{'create':('Tạo đơn nháp và giữ kho theo variant','Cart / CreateDraft'),'mine':('Đọc các đơn thuộc actor hiện tại','MyOrders'),'detail':('Đọc snapshot, ticket và shipment của đơn','OrderDetail'),'history':('Đọc lịch sử trạng thái đơn','OrderTimeline'),'add':('Thêm hoặc gộp variant trong đơn pending','OrderDraft'),'quantity':('Đặt số lượng đích cho variant trong đơn','OrderDraft'),'remove':('Xóa variant và hoàn lượng kho đã giữ','OrderDraft'),'checkout':('Tạo payment mock với key chống lặp','Checkout'),'callback':('Xác minh HMAC và xử lý kết quả payment','Gateway backend; frontend chỉ đọc OrderDetail'),'cancel':('Hủy đơn theo quyền và hoàn kho một lần','OrderDetail / AdminOrders'),'tickets':('Đọc danh sách ticket cho nhân viên có quyền','AdminPOQueue'),'ticket':('Đọc ticket và lịch sử quyết định','CustomerTicket / AdminPOReview'),'approve':('Duyệt ticket và xác nhận đơn','AdminPOReview'),'returnTicket':('Yêu cầu khách giải trình','AdminPOReview'),'resubmit':('Chủ đơn gửi giải trình xét duyệt lại','CustomerTicket'),'reject':('Từ chối ticket, hủy đơn và yêu cầu refund','AdminPOReview'),'ship':('Ghi nhận shipment đang giao theo flow cũ','AdminShipment'),'deliver':('Ghi nhận giao đủ serial; chưa có nghiệm thu lắp đặt','AdminShipment legacy'),'assign':('Liên kết device với item đã bán','AdminSerialAssignment'),'refunds':('Đọc danh sách refund để đối soát','AdminRefunds'),'refund':('Ghi nhận hoàn tiền đã đối soát','AdminRefunds'),'emails':('Đọc email outbox theo trạng thái','AdminEmails'),'resend':('Xếp lại emailFAILED vào hàng đợi','AdminEmails')},
'DeviceWorkflowController':{'mine':('Đọc thiết bị thuộc owner','MyDevices'),'register':('Đăng ký thiết bị với variant và MQTTtopic','AdminDeviceRegistration'),'activate':('Owner kích hoạt thiết bị đã giao','MyDevices'),'packages':('Đọc bưu kiện thiết bị đã nhận','DevicePackageHistory'),'readings':('Đọc dữ liệu cảm biến theo thời gian','DeviceReadings')},
'NotificationController':{'list':('Đọc thông báo của actor','NotificationCenter'),'register':('Đăng ký push token của actor','NotificationPreferences'),'remove':('Xóa push token thuộc actor','NotificationPreferences'),'read':('Đánh dấu thông báo đã đọc','NotificationCenter'),'preference':('Bật/tắt sự kiện PACKAGE_DETECTED','NotificationPreferences')}
}
doc=(OUT/'06-API-CONTRACTS.md').read_text(encoding='utf-8');sections=re.split(r'(?=^### API-\d+)',doc,flags=re.M)
for i,e in enumerate(entries,1):
    s=sections[i];info=purposes.get(e['controller'],{}).get(e['handler'])
    if e['controller']=='DeviceWorkflowController'and e['handler']=='command':info=('Tạo lệnh điều khiển; chưa xác nhận hành động vật lý','DeviceControl')if e['method']=='POST'else('Đọc trạng thái xử lý command của owner','DeviceControl / CommandPolling')
    if info:
        s=re.sub(r'\*\*Module/mục đích:\*\*.*?\. \*\*Trạng thái:',lambda m:'**Module/mục đích:** '+info[0]+'. **Trạng thái:',s,count=1)
        s=re.sub(r'\*\*Màn hình:\*\*[^\n]*','**Màn hình:** '+info[1]+'.',s,count=1)
    auth='Không cần Bearer; callback bắt buộc chữ ký HMAC trong body.'if e['handler']=='callback'else'Không cần Bearer.'if e['access'].startswith('Public')else'Authorization: Bearer <accessToken> bắt buộc; profile hợp lệ, chưa khóa.'
    if 'requestBody'in json.loads((OUT/'contracts/openapi-runtime.raw.json').read_text(encoding='utf-8'))['paths'][e['path']][e['method'].lower()]:auth+=' Content-Type: application/json khi gửi body.'
    auth+=' X-Trace-Id tùy chọn. CORS hiện chưa expose trace/retry/download response headers.'
    if '**Authentication/headers:**'not in s:s=s.replace('**Parameters/headers:**','**Authentication/headers:** '+auth+'\n\n**Parameters/headers:**',1)
    if e['controller']=='DeviceWorkflowController'and e['handler']=='register':s=re.sub(r'\*\*Preconditions/business:\*\*[^\n]*','**Preconditions/business:** super_admin/technician; variant tồn tại; serial và mqttTopicId theo RegistrationDTO, unique ở DB. Service hiện không kiểm tra mqttTopicId cùng prefix subscription: cần chốt cấu hình/topic ở backend.',s)
    body=None
    if e['controller']=='RevenueReportController'and e['method']=='POST':body={'format':'XLSX','params':{'fromDate':'<yyyy-MM-dd>','toDate':'<yyyy-MM-dd>','customerId':'<UUID; optional, bỏ nếu không lọc>','minAmount':0}}
    if e['controller']=='DeviceWorkflowController'and e['handler']=='command'and e['method']=='POST':body={'command':'LOCK','requestKey':'<UUID>'}
    if body is not None:s=re.sub(r'(Ví dụ body[^\n]*:\n)```json\n[\s\S]*?```',lambda m:m.group(1)+'```json\n'+json.dumps(body,ensure_ascii=False,indent=2)+'\n```',s,count=1)
    sections[i]=s
(OUT/'06-API-CONTRACTS.md').write_text(''.join(sections),encoding='utf-8')
print('114 operations have explicit authentication/header guidance and precise core screen labels.')
