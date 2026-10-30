import type { Notification } from '../api/shop';
export interface ActivityNotification extends Notification { type?:string; device_id?:string }
export type ActivityCategory='orders'|'delivery'|'warranty'|'other';
export function activityInfo(item:ActivityNotification){
 const text=`${item.type || ''} ${item.title} ${item.body}`;
 const category:ActivityCategory=/WARRANTY|CLAIM|bảo hành|\[claim:/i.test(text)?'warranty':/TASK_|DELIVERY|INSTALLATION|giao hàng|giao lắp|lắp đặt|thi công|\[job:/i.test(text)?'delivery':/ORDER|PAYMENT|REFUND|đơn hàng|thanh toán|hoàn tiền/i.test(text)?'orders':'other';
 const important=category!=='other'||/PACKAGE_DETECTED|DEVICE_OFFLINE|SECURITY|bưu kiện mới|mất kết nối|cảnh báo/i.test(text);
 const urgent=/FAIL|TIMEOUT|CANCEL|REFUND_REQUIRED|thất bại|đã hủy|hết hạn thanh toán|quá hạn/i.test(text);
 const action=/PENDING|ASSIGNED|UPCOMING|ACTION_REQUIRED|chờ duyệt|cần xác nhận|cần bổ sung/i.test(text);
 const uuid='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
 const orderId=item.body.match(new RegExp('đơn hàng\\s*#('+uuid+')','i'))?.[1];
 const reference=item.body.match(/#([\w-]+)|\[(?:job|claim):([\w-]+)\]/)?.slice(1).find(Boolean)||item.device_id;
 const href=category==='warranty'?'/account/warranty':category==='orders'?(orderId?`/account/orders/${orderId}`:'/account/orders'):category==='delivery'?'/account/orders':item.device_id?`/account/devices/${encodeURIComponent(item.device_id)}`:'/account/devices';
 return {category,important,urgent,action,reference,href};
}
export function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (isNaN(diffSec)) return '';
  if (diffSec < 60) return 'Vừa xong';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)} ngày trước`;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
export function groupActivities(items:ActivityNotification[]){
 const groups:{item:ActivityNotification;ids:string[];unreadIds:string[];info:ReturnType<typeof activityInfo>}[]=[];
 const seen=new Set<string>();
 for(const item of [...items].sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at))){
  if(seen.has(item.id))continue;seen.add(item.id);
  const info=activityInfo(item);
  const duplicate=groups.find(g=>g.item.type===item.type&&g.item.title===item.title&&g.item.body===item.body&&g.item.device_id===item.device_id&&Math.abs(Date.parse(g.item.created_at)-Date.parse(item.created_at))<=300000);
  if(duplicate){duplicate.ids.push(item.id);if(!item.is_read)duplicate.unreadIds.push(item.id);}else groups.push({item,info,ids:[item.id],unreadIds:item.is_read?[]:[item.id]});
 }
 return groups.sort((a,b)=>Number(!!b.unreadIds.length)-Number(!!a.unreadIds.length)||Number(b.info.urgent)-Number(a.info.urgent)||Number(b.info.action)-Number(a.info.action)||Date.parse(b.item.created_at)-Date.parse(a.item.created_at));
}
