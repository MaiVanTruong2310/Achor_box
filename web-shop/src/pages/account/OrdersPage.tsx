import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PAYMENT_LABELS } from '../../api/paymentApi';
import { orderApi, OrderPage } from '../../api/orderApi';
import { ORDER_STATUS_LABELS, DELIVERY_LABELS } from '../../types/order';
export const OrdersPage: React.FC = () => {
  const [page, setPage] = useState(0); const [data, setData] = useState<OrderPage | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { let active = true; setBusy(true); setError(''); void orderApi.getMyOrders(page).then(d => { if (active) setData(d); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setBusy(false); }); return () => { active = false; }; }, [page]);
  return <section><h2>Đơn hàng của tôi</h2>{error && <p role="alert" className="form-error">{error}</p>}{busy && <p>Đang tải…</p>}{data?.content.length === 0 && !busy && <p>Chưa có đơn hàng.</p>}
    {data?.content.map(order => <article key={order.id} style={{ padding: 20, marginBottom: 16, border: '1px solid var(--border-color)' }}><Link to={`/account/orders/${order.id}`}>{order.code}</Link><p>{ORDER_STATUS_LABELS[order.status]?.label || order.status} · {Number(order.total).toLocaleString('vi-VN')} đ</p><p>{order.payment ? `${PAYMENT_LABELS[order.payment.status] || order.payment.status}${order.payment.isSimulated ? ' (giả lập)' : ''}` : 'Chưa checkout'}</p><p>{order.shippingAddress.address}</p><p>{order.status === 'CANCELLED' ? 'Đơn đã hủy' : order.deliveryInstallation ? DELIVERY_LABELS[order.deliveryInstallation.status] || order.deliveryInstallation.status : 'Chưa phân công giao/lắp đặt'}</p></article>)}
    {data && <nav><button className="btn btn-secondary" disabled={busy || page === 0} onClick={() => setPage(page - 1)}>Trước</button> <span>Trang {page + 1} · {data.totalElements} đơn</span> <button className="btn btn-secondary" disabled={busy || page + 1 >= data.totalPages} onClick={() => setPage(page + 1)}>Sau</button></nav>}
  </section>;
};
