"""Replace dynamic Map examples with source-reviewed response keys."""
import ast,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'docs/frontend-handoff'
raw=json.loads((OUT/'contracts/openapi-runtime.raw.json').read_text(encoding='utf-8'))
namespace={'schemas':raw['components']['schemas']}
tree=ast.parse((OUT/'_tools/build_contracts.py').read_text(encoding='utf-8'))
for node in tree.body:
    if isinstance(node,ast.FunctionDef)and node.name in ['resolve','example']:
        exec(compile(ast.Module(body=[node],type_ignores=[]),'<example>','exec'),namespace)
dto=lambda name:namespace['example']({'$ref':'#/components/schemas/'+name})
uid='<UUID>';time='<ISO8601 timestamp>'
def row(keys):return {k:uid if k=='id'or k.endswith('_id')else time if k.endswith('_at')else '<string>'for k in keys.split()}
order={'id':uid,'orderId':uid,'userId':uid,'status':'pending','shippingAddress':'<địa chỉ do khách nhập>','total':0,'totalAmount':0,'paidAt':None,'expiresAt':time,'createdAt':time,'updatedAt':time,'items':[{'id':uid,'productId':uid,'variantId':uid,'sku':'<SKU>','productName':'<snapshot>','variantName':'<snapshot>','size':None,'capacityLiter':None,'unitPrice':0,'quantity':1,'subtotal':0}],'ticket':[],'shipment':[]}
ticket=row('id order_id status review_round reason created_at updated_at');ticket.update(status='PENDING',review_round=1,reason=None)
history=row('id ticket_id action actor_id reason created_at');history.update(action='<action từ history>',actor_id=None,reason=None)
detail={**ticket,'history':[history]}
command={'id':uid,'status':'<PENDING|SENT|ACKNOWLEDGED|FAILED|TIMED_OUT|LEGACY>','attempts':0,'last_error':None,'ack_at':None}
email=row('id template reference_id recipient status attempts last_error next_attempt_at created_at sent_at');email.update(recipient='<email>',attempts=0,status='PENDING',last_error=None,sent_at=None)
refund=row('id payment_id order_id amount status reason provider_ref created_at completed_at');refund.update(amount=0,status='PENDING',provider_ref=None,completed_at=None)
payment=row('id order_id amount status provider transaction_ref paid_at expires_at created_at');payment.update(amount=0,status='pending',provider='mock',transaction_ref=None,paid_at=None)
mydevice=row('id serial_number name status door_status lock_status weight_kg package_detected last_seen_at activated_at');mydevice.update(status='<health>',door_status=None,lock_status=None,weight_kg=None,package_detected=None,last_seen_at=None,activated_at=None)
package=row('id device_id weight_kg detected_at collected_at status');package.update(weight_kg=None,collected_at=None,status='DELIVERED')
reading=row('id device_id weight_kg distance_cm door_status payload received_at');reading.update(weight_kg=None,distance_cm=None,door_status=None,payload='<JSONB representation; cần xác minh serializer PostgreSQL>')
notification=row('id user_id device_id type title body is_read created_at');notification.update(type='PACKAGE_DETECTED',is_read=False,body=None)
paged_dtos={'AuditLogController':'AuditLogResponse','ContentController':None,'DeviceController':'DeviceResponse','OrderController':'OrderResponse','ProductController':'ProductResponse','PromotionController':'PromotionResponse','UserController':'UserProfileResponse','WarrantyController':'ClaimResponse'}
def shape(e):
    h=e['handler'];c=e['controller'];p=e['path'];m=e['method']
    if p.endswith('/paged'):
        name=paged_dtos[c]
        if c=='ContentController':name='ArticleResponse'if'articles'in p else'ProductReviewResponse'
        assert name in namespace['schemas'],name
        return {'content':[dto(name)],'currentPage':0,'totalElements':1,'totalPages':1,'pageSize':10,'numberOfElements':1,'isFirst':True,'isLast':True,'hasNext':False,'hasPrevious':False}
    if c=='CommerceController':
        if h in ['create','detail','cancel','add','quantity','remove','ship','deliver']:return order
        if h=='mine':return [{'id':uid,'status':'<order status>','total':0,'shippingAddress':'<address text>','paidAt':None,'createdAt':time}]
        if h=='checkout':return {'orderId':uid,'status':'awaiting_payment','paymentId':uid,'amount':0,'paymentUrl':'<URL do server trả>','expiresAt':time}
        if h=='assign':return {'assigned':True}
        if h=='history':return [row('id order_id from_status to_status changed_by reason created_at')]
        if h=='callback':return {'acknowledged':True}
        if h=='tickets':return [ticket]
        if h in ['ticket','approve','returnTicket','resubmit','reject']:return detail
        if h=='emails':return {'content':[email],'page':0,'size':20,'totalElements':1}
        if h=='resend':return {'queued':True}
        if h=='refunds':return [refund]
        if h=='refund':return {'completed':True}
    if c=='DeviceWorkflowController':
        if h=='mine':return [mydevice]
        if h=='register':return {'deviceId':uid,'serialNumber':'<serial>'}
        if h=='activate':return {'activated':True}
        if h=='command':return {'commandId':uid,'status':'PENDING'}if m=='POST'else command
        if h=='packages':return [package]
        if h=='readings':return [reading]
    if c=='MockPaymentController':return payment if m=='GET'else {'acknowledged':True}
    if c=='NotificationController':return [notification]if h=='list'else {'id':uid}
    if c=='ProductController'and h=='adjustVariant':return {'id':uid,'product_id':uid,'stock_quantity':0}
    if c=='ContentController'and m=='DELETE':
        message=re.search(r'"message",\s*"([^"]+)"',e['body']);return {'success':True,'message':message.group(1)}
    if c=='RevenueReportController':return {'code':'RPT_REVENUE_DAILY','name':'<tên report từ metadata>','params':[{'name':'<param name>','dataType':'<DATE|UUID|LONG|DECIMAL>','required':True,'maxDays':None}]}
    if c=='ConcurrentDashboardController':return {'date':'<yyyy-MM-dd>','revenueToday':None,'orderCountByStatus':None,'top5Products':None,'lowStockProducts':None,'partial':True,'failedParts':['<failed part name>'],'elapsedMs':0}
    raise ValueError((c,h))
inventory=json.loads((OUT/'contracts/source-inventory.json').read_text(encoding='utf-8'))
doc=(OUT/'06-API-CONTRACTS.md').read_text(encoding='utf-8');sections=re.split(r'(?=^### API-\d+)',doc,flags=re.M);examples={}
for i,e in enumerate(inventory,1):
    if 'Map'not in e['return']:continue
    example=shape(e);examples[e['method']+' '+e['path']]=example
    sections[i]=re.sub(r'(Schema Springdoc:\n\n)```json\n[\s\S]*?```',lambda m:m.group(1)+'Ví dụ shape bổ sung từ SQL/Map source; mọi giá trị là placeholder, không phải dữ liệu kinh doanh:\n```json\n'+json.dumps(example,ensure_ascii=False,indent=2)+'\n```',sections[i],count=1)
    sections[i]=sections[i].replace('không coi dynamic-key trong ví dụ là tên field thật.','keys ở ví dụ đã đối chiếu SQL/Map; null và giá trị placeholder không chứng minh trạng thái live.')
    if e['controller']=='DeviceWorkflowController'and e['handler']=='command'and e['method']=='POST':sections[i]+='\n**Response biến thể khi dùng lại requestKey:** raw row có `id`, không luôn có `commandId`; xem Map contract và adapter trong11.\n'
(OUT/'06-API-CONTRACTS.md').write_text(''.join(sections),encoding='utf-8')
(OUT/'contracts/response-shapes.json').write_text(json.dumps({'status':'Source-reviewed shapes; placeholders only; not live business data','operations':examples},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'mapResponseExamples':len(examples)}))
