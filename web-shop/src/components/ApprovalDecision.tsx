import { useRef, useState } from 'react';
import { commerce } from '../api/commerce';
import { ApiError, type OrderView } from '../api/shop';
import { ErrorNotice } from './ShopUi';
import { CommerceStatus as Status } from './CommerceUi';
export function ApprovalDecision({ order, reload }: { order: OrderView; reload: () => void }) {
  const lock = useRef(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<Error>(); const [choice, setChoice] = useState<boolean>(); const [unknown, setUnknown] = useState(false);
  async function decide() {
    if (lock.current || choice === undefined || unknown) return;
    lock.current = true; setBusy(true); setError(undefined);
    try { await commerce.decision(order.id, choice); setChoice(undefined); reload(); }
    catch (reason) { setError(reason as Error); if (reason instanceof ApiError && (reason.status === 0 || reason.status >= 500)) setUnknown(true); reload(); }
    finally { lock.current = false; setBusy(false); }
  }
  if (!['pending', 'customer_decision_pending'].includes(order.status) && !order.itemApprovals?.length) return null;
  return <div className="panel"><h2>Kết quả xét duyệt</h2>{order.status === 'pending' && <p>Đơn đã được gửi. Bạn sẽ thanh toán sau khi sản phẩm được duyệt.</p>}{order.itemApprovals?.map(item => <div className="data-row" key={item.id}><div><strong>{item.productName}</strong><p>{item.sku}</p>{item.reason && <p>{item.reason}</p>}</div><Status value={item.status}/></div>)}{order.status === 'customer_decision_pending' && <><p className="notice">Một số sản phẩm không được duyệt. Bạn có thể tiếp tục với các sản phẩm được duyệt hoặc hủy toàn bộ đơn. Tổng tiền mới sẽ do máy chủ tính lại sau khi xác nhận.</p><ErrorNotice error={error} focus/>{unknown ? <p role="status">Chưa xác định kết quả. Hãy cập nhật đơn trước khi thao tác tiếp.</p> : <><div className="actions"><button disabled={busy} onClick={() => setChoice(true)}>Mua các sản phẩm được duyệt</button><button disabled={busy} onClick={() => setChoice(false)}>Hủy toàn bộ đơn</button></div>{choice !== undefined && <div className="notice"><p>{choice ? 'Xác nhận loại bỏ các dòng bị từ chối và tiếp tục đơn?' : 'Xác nhận hủy toàn bộ đơn hàng?'}</p><button disabled={busy} onClick={decide}>{busy ? 'Đang gửi…' : 'Xác nhận lựa chọn'}</button><button disabled={busy} onClick={() => setChoice(undefined)}>Quay lại</button></div>}</>}<button disabled={busy} onClick={reload}>Cập nhật kết quả từ máy chủ</button></>}</div>;
}
