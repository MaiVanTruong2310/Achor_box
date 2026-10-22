import { Link, NavLink } from 'react-router-dom';
import { Package, ClipboardCheck, CreditCard, Truck, ReceiptText, ArrowLeft, Check, CircleCheck } from 'lucide-react';
import { type OrderView } from '../api/shop';
const messages: Record<string,[string,string]> = {
 pending:['Đơn hàng đang được xét duyệt','Bên bán đang kiểm tra sản phẩm và khả năng cung ứng. Bạn chưa cần thanh toán ở bước này.'],
 customer_decision_pending:['Cần bạn xác nhận','Kiểm tra kết quả xét duyệt để quyết định tiếp tục hoặc hủy đơn.'],
 awaiting_payment:['Đơn đã được duyệt','Kiểm tra thông tin nhận hàng và tổng tiền trước khi thanh toán.'],
 paid:['Đã ghi nhận thanh toán','Lịch giao hàng và lắp đặt sẽ xuất hiện khi được phân công.'],
 confirmed:['Đơn hàng đã được xác nhận','Theo dõi lịch giao hàng và quá trình nghiệm thu trong tab Giao & lắp đặt.'],
 completed:['Đơn hàng đã hoàn tất','Tra cứu chứng từ và các phiếu bảo hành đã được cấp cho thiết bị của đơn này.'],
 cancelled:['Đơn hàng đã hủy','Thông tin thanh toán và hoàn tiền được cập nhật theo kết quả xử lý.']
};
export function OrderNavigation({id,title}:{id:string;title:string}) {
 const base='/account/orders/'+encodeURIComponent(id); const tabs=[{to:base,label:'Tổng quan',Icon:Package,end:true},{to:base+'/ticket',label:'Xét duyệt',Icon:ClipboardCheck},{to:'/checkout/'+encodeURIComponent(id),label:'Thanh toán',Icon:CreditCard},{to:base+'/installation',label:'Giao & lắp đặt',Icon:Truck},{to:base+'/invoice',label:'Chứng từ',Icon:ReceiptText}];
 return <header className="order-section-header"><Link className="order-back" to="/account/orders"><ArrowLeft size={16}/>Đơn hàng của tôi</Link><div className="commerce-page-title"><div><p className="eyebrow">TÀI KHOẢN / ĐƠN HÀNG</p><h1>{title}</h1></div><p className="order-reference">Mã đơn hàng<span>{id || 'Chưa có mã đơn'}</span></p></div><nav className="order-subnav" aria-label="Các phần của đơn hàng">{tabs.map(({to,label,Icon,end})=><NavLink key={to} end={end} to={to}><Icon size={17} aria-hidden="true"/>{label}</NavLink>)}</nav></header>;
}
export function OrderProgress({order}:{order:OrderView}) {
 const stages=[{label:'Đặt hàng',Icon:Package},{label:'Xét duyệt',Icon:ClipboardCheck},{label:'Thanh toán',Icon:CreditCard},{label:'Giao & lắp',Icon:Truck},{label:'Hoàn tất',Icon:CircleCheck}];
 const position=({pending:1,customer_decision_pending:1,awaiting_payment:2,paid:3,confirmed:3,processing:3,shipping:3,delivered:3,completed:4} as Record<string,number>)[order.status];
 const message=messages[order.status] || ['Đang cập nhật đơn hàng','Theo dõi các thông tin mới nhất trong lịch sử bên dưới.'];
 return <section className="order-progress-panel">{position!==undefined && <ol className="order-progress" aria-label="Tiến trình đơn hàng">{stages.map(({label,Icon},index)=>{const done=index<position||order.status==='completed';return <li key={label} className={done?'is-done':index===position?'is-current':''} aria-current={!done&&index===position?'step':undefined}><span>{done?<Check size={16}/>:<Icon size={17}/>}</span><strong>{label}</strong></li>})}</ol>}<div className="order-next-step"><div><h2>{message[0]}</h2><p>{message[1]}</p></div>{order.status==='awaiting_payment'&&<Link className="button" to={'/checkout/'+order.id}>Thanh toán</Link>}{order.status==='completed'&&<Link className="button secondary" to={'/account/warranty?orderId='+encodeURIComponent(order.id)}>Tra cứu bảo hành</Link>}</div></section>;
}
