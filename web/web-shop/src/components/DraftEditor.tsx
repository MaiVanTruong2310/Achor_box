import { useState } from 'react';
import { ApiError, request, shop, type OrderView, type Variant } from '../api/shop';
import { ErrorNotice, ResourceState, useResource } from './ShopUi';
export function DraftEditor({ order, reload }: {
    order: OrderView;
    reload: () => void;
}) {
    const [busy, setBusy] = useState('');
    const [error, setError] = useState<Error>();
    const [locked, setLocked] = useState(false);
    const [cancel, setCancel] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [productId, setProductId] = useState('');
    const [variantId, setVariantId] = useState('');
    const [addQuantity, setAddQuantity] = useState(1);
    const catalog = useResource(shop.products, `draft-catalog:${order.id}`);
    const variants = useResource<Variant[]>(signal => productId ? shop.variants(productId, signal) : Promise.resolve([]), productId);
    const expired = !!order.expiresAt && Date.parse(order.expiresAt) <= Date.now();
    async function mutate(key: string, path: string, method: string, body?: object) { if (busy || locked || (expired && key !== 'cancel'))
        return; setBusy(key); setError(undefined); try {
        await request(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
        setCancel(false);
        reload();
    }
    catch (reason) {
        setError(reason as Error);
        if (reason instanceof ApiError && reason.message.includes('LEGACY_ORDER_REVIEW_REQUIRED'))
            setLocked(true);
        if (reason instanceof ApiError && (reason.status === 0 || reason.status >= 500)) setLocked(true);
        reload();
    }
    finally {
        setBusy('');
    } }
    if (!['pending', 'awaiting_payment'].includes(order.status))
        return null;
    return <div className="panel"><h2>Quản lý đơn nháp.</h2><ErrorNotice error={error}/>{locked && <p className="notice">Đơn theo quy trình cũ chỉ hỗ trợ xem. Vui lòng liên hệ bộ phận hỗ trợ.</p>}{expired && <p className="notice">Đã qua thời hạn dự kiến. Hãy cập nhật trạng thái; máy chủ quyết định thời điểm hết hạn.</p>}{order.status === 'pending' && !locked && order.ticket?.[0]?.status === 'PENDING' && (order.ticket?.[0]?.review_round ?? 1) <= 1 && <><p className="muted">Thay đổi số lượng sẽ điều chỉnh kho và tổng tiền tại máy chủ.</p>{order.items?.map(item => { const value = quantities[item.variantId] ?? item.quantity; return <div className="data-row" key={item.id}><label>{item.productName} · {item.sku}<input disabled={!!busy || expired} type="number" min={1} max={99} value={value} onChange={e => setQuantities(current => ({ ...current, [item.variantId]: Number(e.target.value) }))}/></label><button disabled={!!busy || expired || !Number.isInteger(value) || value < 1 || value > 99} onClick={() => mutate(item.variantId, `/orders/${order.id}/items/${item.variantId}`, 'PATCH', { quantity: value })}>Cập nhật số lượng</button><button disabled={!!busy || expired} onClick={() => mutate(item.variantId, `/orders/${order.id}/items/${item.variantId}`, 'DELETE')}>Xóa sản phẩm</button></div>; })}<ResourceState {...catalog}/><label>Thêm sản phẩm<select value={productId} onChange={e => { setProductId(e.target.value); setVariantId(''); }}><option value="">Chọn sản phẩm</option>{catalog.data?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>{productId && <><ResourceState {...variants}/><label>SKU<select value={variantId} onChange={e => setVariantId(e.target.value)}><option value="">Chọn SKU khả dụng</option>{variants.data?.filter(v => v.isActive && v.stockQuantity > 0).map(v => <option key={v.id} value={v.id}>{v.variantName} · {v.sku}</option>)}</select></label><label>Số lượng bổ sung<input type="number" min={1} max={99} value={addQuantity} onChange={e => setAddQuantity(Number(e.target.value))}/></label><button disabled={!!busy || expired || !variantId || !Number.isInteger(addQuantity) || addQuantity < 1 || addQuantity > 99} onClick={() => mutate('add', `/orders/${order.id}/items`, 'POST', { variantId, quantity: addQuantity })}>Thêm SKU vào đơn nháp</button></>}</>}{busy && <p role="status">Đang cập nhật…</p>}<button disabled={!!busy || locked} onClick={() => setCancel(true)}>Hủy đơn chưa thanh toán</button>{cancel && <div className="notice"><h3>Xác nhận hủy đơn?</h3><p>Máy chủ sẽ hủy đơn và giải phóng phần kho đã giữ. Đơn đã thanh toán cần được xử lý bởi bộ phận hỗ trợ.</p><label>Lý do hủy<textarea maxLength={2000} value={cancelReason} onChange={e => setCancelReason(e.target.value)}/></label><button disabled={!!busy} onClick={() => mutate('cancel', `/orders/${order.id}/cancel`, 'POST', { reason: cancelReason.trim() || 'Khách hàng yêu cầu hủy đơn' })}>Xác nhận hủy</button><button disabled={!!busy} onClick={() => setCancel(false)}>Giữ đơn</button></div>}</div>;
}
