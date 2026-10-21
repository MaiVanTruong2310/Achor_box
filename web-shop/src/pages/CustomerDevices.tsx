import { useState } from 'react';
import { Package, ShieldCheck, RefreshCw } from 'lucide-react';
import { displayDate } from '../components/commercePresentation';
import { Link, useParams } from 'react-router-dom';
import { request } from '../api/shop';
import { warrantyEligible, type Page } from '../api/customer';
import { AccountNav, ResourceState, useResource } from '../components/ShopUi';
import { useShop } from '../ShopContext';
interface Device { id: string; serialNumber: string; productName: string | null; variantName: string | null; orderId: string | null; warrantyId: string | null; startDate: string | null; endDate: string | null; warrantyStatus: string | null; acceptedAt: string | null }
function DeviceCard({ device: d }: { device: Device }) {
  const canClaim = !!d.warrantyId && !!d.startDate && !!d.endDate && warrantyEligible({ id: d.warrantyId, deviceId: d.id, serialNumber: d.serialNumber, orderId: d.orderId || '', startDate: d.startDate, endDate: d.endDate, status: d.warrantyStatus || '', durationMonths: 0, acceptedAt: d.acceptedAt || '' });
  return <article className="panel customer-device-card">
    <header className="customer-device-heading"><span className="customer-device-icon"><Package size={24} aria-hidden="true"/></span><div><p className="eyebrow">THIẾT BỊ CỦA BẠN</p><h2>{d.productName || 'AnchorBox'}</h2><p className="customer-device-variant">{d.variantName}</p></div><span className={`commerce-badge is-${canClaim ? 'positive' : 'neutral'}`}><ShieldCheck size={14} aria-hidden="true"/>{canClaim ? 'Bảo hành còn hiệu lực' : d.warrantyStatus === 'void' ? 'Bảo hành đã vô hiệu' : d.warrantyId ? 'Có phiếu bảo hành' : 'Chưa cấp bảo hành'}</span></header>
    <dl className="customer-device-facts"><div><dt>Số serial</dt><dd><code>{d.serialNumber}</code></dd></div><div><dt>Thời hạn bảo hành</dt><dd>{d.warrantyId ? `${displayDate(d.startDate,true)} → ${displayDate(d.endDate,true)}` : 'Chưa có phiếu bảo hành. Vui lòng liên hệ hỗ trợ để kiểm tra nghiệm thu.'}</dd></div></dl>
    <footer className="customer-device-actions"><div><Link to={`/account/devices/${d.id}`}>Chi tiết thiết bị →</Link>{d.orderId && <Link to={`/account/orders/${d.orderId}`}>Xem đơn hàng</Link>}{d.warrantyId && <Link to="/account/warranty">Xem bảo hành</Link>}</div>{canClaim && <Link className="button" to={`/account/warranty/claims/new?warrantyId=${d.warrantyId}`}>Yêu cầu bảo hành</Link>}</footer>
  </article>;
}
export function CustomerDevices() {
  const { user }=useShop(); const { id }=useParams(); const [page,setPage]=useState(0);
  const resource=useResource(async signal => id ? [await request<Device>(`/customer/devices/${encodeURIComponent(id)}`,{signal})] : (await request<Page<Device>>(`/customer/devices?page=${page}&size=20`,{signal})).content,`${user?.userId}:${id || ''}:${page}`);
  return <section className="container section commerce-workspace customer-devices"><AccountNav/><header className="orders-heading"><div><p className="eyebrow">ĐỒNG HÀNH CÙNG ANCHORBOX</p><h1>{id ? 'Chi tiết thiết bị' : 'Thiết bị của tôi'}</h1><p>Tra cứu serial, đơn hàng và bảo hành của thiết bị được bàn giao cho bạn.</p></div><button className="commerce-refresh" onClick={resource.retry} disabled={resource.loading}><RefreshCw size={16} aria-hidden="true"/>{resource.loading ? 'Đang cập nhật…' : 'Cập nhật'}</button></header><ResourceState {...resource}/><div className="customer-device-list">{resource.data?.map(d=><DeviceCard key={d.id} device={d}/>)}</div>{resource.data?.length===0 && <div className="panel"><h2>Chưa có thiết bị được liên kết</h2><p>Nếu đơn đã nghiệm thu, vui lòng liên hệ bên bán để kiểm tra serial và bàn giao thiết bị.</p><Link className="button" to="/account/orders">Xem đơn hàng</Link><Link className="text-link" to="/contact">Liên hệ hỗ trợ →</Link></div>}{!id && <nav className="commerce-pagination" aria-label="Phân trang thiết bị"><span>Trang {page+1}{resource.data ? ` · ${resource.data.length} thiết bị trên trang` : ''}</span><div><button disabled={page===0 || resource.loading} onClick={()=>setPage(p=>p-1)}>Trang trước</button><button disabled={resource.loading || !resource.data || resource.data.length<20} onClick={()=>setPage(p=>p+1)}>Trang tiếp</button></div></nav>}{id && <Link to="/account/devices">← Tất cả thiết bị</Link>}</section>;
}
