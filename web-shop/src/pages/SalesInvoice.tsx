import { OrderSlip } from '../components/OrderSlip';
import { ReceiptText, Download } from 'lucide-react';
import { displayDate as date } from '../components/commercePresentation';
import { OrderNavigation } from '../components/OrderNavigation';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiError } from '../api/shop';
import { paymentApi } from '../api/payment';
import { ErrorNotice, ResourceState, useResource } from '../components/ShopUi';
import { useShop } from '../ShopContext';

export function SalesInvoice() {
  const { id = '' } = useParams(); const { user } = useShop();
  const resource = useResource(async signal => { try { return await paymentApi.invoice(id, signal); } catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; } }, `${user?.userId}:${id}`);
  const [error, setError] = useState<Error>();
  useEffect(() => { setError(undefined); setReady(false); }, [id, user?.userId]);
  const invoice = resource.data;
  const frame = useRef<HTMLIFrameElement>(null); const [ready, setReady] = useState(false);
  const [saving,setSaving]=useState(false); const savingRef=useRef(false);
  async function download() { if(!invoice||savingRef.current)return;savingRef.current=true;setSaving(true);setError(undefined);try{const {downloadDocumentPdf}=await import('../components/downloadDocumentPdf');await downloadDocumentPdf(invoice.html,`AnchorBox-${invoice.invoiceNumber}`);}catch{setError(new Error('Không tải được PDF. Vui lòng thử lại.'));}finally{savingRef.current=false;setSaving(false);} }
  return <section className="container section commerce-workspace"><OrderNavigation id={id} title="Chứng từ đơn hàng"/><OrderSlip id={id} userId={user?.userId}/><ResourceState {...resource}/><ErrorNotice error={error} focus/>{invoice && <><div className="commerce-section-title"><h2>Hóa đơn do bên bán phát hành</h2></div><div className="panel commerce-document-header"><ReceiptText size={28} aria-hidden="true"/><div><h2>{invoice.invoiceNumber}</h2><p className="muted">Phát hành: {date(invoice.issuedAt)}</p></div></div><div className="document-toolbar"><button className="button" disabled={!ready||saving} onClick={download}><Download size={17}/>{saving?'Đang tạo PDF…':'Lưu PDF hóa đơn'}</button></div><iframe title={`Hóa đơn ${invoice.invoiceNumber}`} ref={frame} onLoad={() => setReady(true)} sandbox="allow-same-origin" srcDoc={invoice.html} className="invoice-preview"/></>}</section>;
}
