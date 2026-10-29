import { useRef, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { customer } from '../api/customer';
import { ResourceState, useResource } from './ShopUi';
import { orderSlipHtml } from './orderSlipHtml';
export function OrderSlip({id,userId}:{id:string;userId?:string}) {
 const resource=useResource(signal=>customer.order(id,signal),`${userId}:${id}`);
 const frame=useRef<HTMLIFrameElement>(null); const [readyHtml,setReadyHtml]=useState(''); const [printError,setPrintError]=useState('');
 const [saving,setSaving]=useState(false); const savingRef=useRef(false);
 const html=resource.data ? orderSlipHtml(resource.data) : '';
 async function savePdf(){if(savingRef.current)return;savingRef.current=true;setSaving(true);setPrintError('');try{const {downloadDocumentPdf}=await import('./downloadDocumentPdf');await downloadDocumentPdf(html,`AnchorBox-don-hang-${id}`);}catch{setPrintError('Không tải được PDF. Vui lòng thử lại.');}finally{savingRef.current=false;setSaving(false);}}
 return <section className="order-slip-section"><ResourceState {...resource}/>{resource.data&&<><div className="panel commerce-document-header"><FileText size={26}/><div><h2>Phiếu thông tin đơn hàng</h2><p className="muted">Bản tra cứu từ dữ liệu đơn hàng hiện tại.</p></div><button className="button" disabled={saving||!html||readyHtml!==html||resource.loading||!!resource.error} onClick={savePdf}><Download size={17}/>{saving?'Đang tạo PDF…':'Lưu PDF'}</button></div><p className="muted">Tải phiếu đơn hàng dưới dạng PDF về máy. Trạng thái thanh toán được lấy từ máy chủ.</p>{printError&&<p role="alert" className="notice danger">{printError}</p>}<iframe key={`${userId}:${id}`} ref={frame} title="Phiếu thông tin đơn hàng" sandbox="allow-same-origin" srcDoc={html} onLoad={()=>setReadyHtml(html)} className="invoice-preview"/></>}</section>;
}
