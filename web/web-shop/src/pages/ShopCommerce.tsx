import { CommerceStatus as Status, EventTimeline, EmptyState, RefreshButton } from '../components/CommerceUi';
import { displayDate as date } from '../components/commercePresentation';
import { OrderNavigation, OrderProgress, orderStagePosition } from '../components/OrderNavigation';
import { checkoutAction } from '../api/commerce';
import { ApprovalDecision } from '../components/ApprovalDecision';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, money, shop, type OrderView } from '../api/shop';
import { useShop } from '../ShopContext';
import { AccountNav, ErrorNotice, ResourceState, useResource } from '../components/ShopUi';
import { customer, jobLabels, type CustomerOrder } from '../api/customer';
import { DraftEditor } from '../components/DraftEditor';
import { paymentApi, paymentDestination } from '../api/payment';
import { CreditCard, QrCode, Building2, Truck, Zap, ArrowLeft } from 'lucide-react';
import './cart-order-table.css';
export function Login() {
    const { user } = useShop();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [show, setShow] = useState(false);
    const [error, setError] = useState<Error>();
    const [busy, setBusy] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const candidate = params.get('returnTo') || '/account';
    const returnTo = /^\/(?:cart|checkout(?:\/[^/?#]+)?|payment\/result|payments\/vnpay\/return|demo-payment\/[^/?#]+|account(?:\/[^?#]*)?)(?:\?[^#]*)?$/.test(candidate) && !candidate.includes('\\') ? candidate : '/account';
    useEffect(() => { if (user)
        navigate(returnTo, { replace: true }); }, [user, navigate, returnTo]);
    useEffect(() => { if (!cooldown)
        return; const timer = setTimeout(() => setCooldown(c => c - 1), 1000); return () => clearTimeout(timer); }, [cooldown]);
    async function submit(e: FormEvent) { e.preventDefault(); if (busy || cooldown)
        return; setBusy(true); setError(undefined); try {
        await shop.login(email.trim(), password);
    }
    catch (reason) {
        const err = reason as Error;
        setError(err);
        if (err instanceof ApiError && err.status === 429)
            setCooldown(60);
    }
    finally {
        setBusy(false);
    } }
    return <section className="container section form-page"><p className="eyebrow">CHÀO MỪNG TRỞ LẠI</p><h1>Đăng nhập.</h1><form onSubmit={submit} aria-busy={busy}><ErrorNotice error={error} focus /><label>Email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)}/></label><label>Mật khẩu<input type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)}/></label><label className="inline"><input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)}/>Hiện mật khẩu</label><button className="button" disabled={busy || cooldown > 0}>{busy ? 'Đang đăng nhập…' : cooldown ? `Thử lại sau ${cooldown} giây` : 'Đăng nhập'}</button><p className="muted">Tạo tài khoản mới hoặc khôi phục mật khẩu qua email.</p><Link to="/register">Tạo tài khoản</Link><Link className="text-link" to="/forgot-password">Quên mật khẩu?</Link></form></section>;
}
export { CartPage as Cart } from './CartPage';
export function Snapshot({order}:{order:OrderView}) {
 const address=order.shippingAddressSnapshot;
 return <div className="panel commerce-snapshot"><div className="commerce-section-title"><h2>Thông tin đơn hàng</h2><Status value={order.status}/></div><div className="commerce-address"><div><span className="order-caption">Người nhận</span><strong>{address?.recipientName || 'Chưa cập nhật người nhận'}</strong><span>{address?.phone || 'Chưa cập nhật số điện thoại'}</span></div><div><span className="order-caption">Địa chỉ giao hàng</span><p>{address?.addressLine || order.shippingAddress || 'Chưa cập nhật địa chỉ'}</p>{address?.installationNote && <p className="muted">Ghi chú: {address.installationNote}</p>}</div></div><p className="muted commerce-order-date">Ngày đặt: {date(order.createdAt)}{order.expiresAt && ['pending','awaiting_payment','customer_decision_pending'].includes(order.status) && <> · Hạn xử lý: {date(order.expiresAt)}</>}</p><div className="table-scroll"><table><caption>Sản phẩm trong đơn</caption><thead><tr><th>Sản phẩm / cấu hình</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>{order.items?.map(item=><tr key={item.id}><td><strong>{item.productName}</strong><small>{item.variantName} · {item.sku}</small></td><td>{item.quantity}</td><td>{money(item.unitPrice)}</td><td><strong>{money(item.subtotal)}</strong></td></tr>)}</tbody></table></div><dl className="commerce-totals"><div><dt>Tạm tính</dt><dd>{money(order.subtotal ?? order.total)}</dd></div>{!!order.discountAmount&&<div><dt>Giảm giá {order.voucherCode || ''}</dt><dd>−{money(order.discountAmount)}</dd></div>}<div className="commerce-total"><dt>Tổng đơn hàng</dt><dd>{money(order.total)}</dd></div></dl></div>;
}
export function Checkout() {
    const { orderId = '' } = useParams(); const { user } = useShop(); const navigate = useNavigate();
    const resource = useResource(signal => customer.order(orderId, signal), `${user?.userId}:${orderId}`);
    const mode = useResource(paymentApi.mode, 'payment-mode');
    const [error, setError] = useState<Error>(); const [busy, setBusy] = useState(false); const [terms, setTerms] = useState(false); const lock = useRef(false);
    const [paymentMethod, setPaymentMethod] = useState<'vnpay' | 'vietqr' | 'cod' | 'mock'>('vnpay');
    const action = resource.data ? checkoutAction(resource.data) : 'blocked';
    const canPay = action !== 'blocked' && !resource.loading && !resource.error && !mode.error && !!mode.data && (mode.data.provider === 'vnpay' || mode.data.demoActionsEnabled);
    const canPayCurrentMethod = action !== 'blocked' && !resource.loading && !resource.error && (
        paymentMethod === 'vietqr' || 
        paymentMethod === 'cod' || 
        paymentMethod === 'mock' ||
        (paymentMethod === 'vnpay' && canPay)
    );

    async function pay() {
        if (lock.current || !canPay || !terms || !resource.data) return;
        lock.current = true; setBusy(true); setError(undefined);
        try {
            const storageKey = `smartbox_checkout:${user?.userId}:${orderId}`;
            let key = sessionStorage.getItem(storageKey);
            if (!key) { key = crypto.randomUUID(); sessionStorage.setItem(storageKey, key); }
            const value = action === 'resume' ? await paymentApi.session(orderId) : await paymentApi.checkout(orderId, key);
            const destination = paymentDestination(value);
            if (destination.startsWith('/')) navigate(destination); else window.location.assign(destination);
        } catch (reason) { setError(reason as Error); resource.retry(); }
        finally { setBusy(false); lock.current = false; }
    }

    async function handlePaymentSubmit() {
        if (lock.current || !terms || !resource.data) return;
        if (paymentMethod === 'vnpay') {
            await pay();
            return;
        }
        if (paymentMethod === 'mock') {
            if (canPay) {
                await pay();
            } else {
                navigate(`/payment/result?orderId=${orderId}`);
            }
            return;
        }
        if (paymentMethod === 'vietqr' || paymentMethod === 'cod') {
            setBusy(true);
            try {
                await new Promise(r => setTimeout(r, 600));
                navigate(`/payment/result?orderId=${orderId}`);
            } finally {
                setBusy(false);
            }
        }
    }

    return (
        <section className="container section commerce-workspace">
            <OrderNavigation id={orderId} title="Thanh toán đơn hàng" />
            <ResourceState {...resource} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <RefreshButton busy={resource.loading || busy} onClick={resource.retry} label="Cập nhật trạng thái" />
            </div>
            {resource.data && (
                <div className="apple-commerce-layout">
                    <div className="apple-commerce-main">
                        <Snapshot order={resource.data} />
                    </div>

                    <aside className="apple-commerce-sidebar">
                        <div className="apple-glass-summary">
                            {resource.data.payment ? <PaymentSummary order={resource.data} /> : <h3 className="apple-summary-title">Thanh toán</h3>}
                            {action === 'blocked' && <p className="muted" style={{ marginTop: 8 }}>Đơn hàng này không cần thanh toán thêm.</p>}

                            <ResourceState {...mode} />

                            <ErrorNotice error={error} focus />

                            {resource.data.status === 'pending' && (
                                <p className="notice" style={{ marginBottom: 16 }}>
                                    Đơn đang chờ xét duyệt cấu hình. Cổng thanh toán sẽ mở ngay khi đơn được duyệt.
                                </p>
                            )}

                            <ApprovalDecision order={resource.data} reload={resource.retry} />

                            {/* Khối chọn phương thức thanh toán */}
                            {action !== 'blocked' && <div className="payment-methods-selector" style={{ margin: '18px 0 16px' }}>
                                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: '0 0 10px 0' }}>
                                    Phương thức thanh toán
                                </h4>
                                <div className="payment-methods-group">
                                    {/* 1. Cổng VNPay */}
                                    <div 
                                        className={`payment-method-card ${paymentMethod === 'vnpay' ? 'active' : ''}`}
                                        onClick={() => setPaymentMethod('vnpay')}
                                    >
                                        <input 
                                            type="radio" 
                                            name="payment_method" 
                                            className="payment-method-radio" 
                                            checked={paymentMethod === 'vnpay'} 
                                            onChange={() => setPaymentMethod('vnpay')}
                                        />
                                        <div className="payment-method-icon">
                                            <CreditCard size={18} />
                                        </div>
                                        <div className="payment-method-info">
                                            <div className="payment-method-header">
                                                <span className="payment-method-title">VNPAY: QR, thẻ ATM, Visa</span>
                                                <span className="payment-method-badge badge-recommended">Khuyên dùng</span>
                                            </div>
                                            <p className="payment-method-desc">
                                                Quét mã VNPAY-QR hoặc dùng thẻ ATM, Visa qua cổng VNPay Sandbox bảo mật.
                                            </p>
                                        </div>
                                    </div>

                                    {/* 2. Chuyển khoản VietQR */}
                                    <div 
                                        className={`payment-method-card ${paymentMethod === 'vietqr' ? 'active' : ''}`}
                                        onClick={() => setPaymentMethod('vietqr')}
                                    >
                                        <input 
                                            type="radio" 
                                            name="payment_method" 
                                            className="payment-method-radio" 
                                            checked={paymentMethod === 'vietqr'} 
                                            onChange={() => setPaymentMethod('vietqr')}
                                        />
                                        <div className="payment-method-icon">
                                            <QrCode size={18} />
                                        </div>
                                        <div className="payment-method-info">
                                            <div className="payment-method-header">
                                                <span className="payment-method-title">Chuyển khoản VietQR</span>
                                                <span className="payment-method-badge badge-neutral">Mọi lúc</span>
                                            </div>
                                            <p className="payment-method-desc">
                                                Chuyển khoản nhanh liên ngân hàng với cú pháp tự động điền mã đơn hàng.
                                            </p>
                                        </div>
                                    </div>

                                    {/* 3. Thanh toán khi nhận hàng COD */}
                                    <div 
                                        className={`payment-method-card ${paymentMethod === 'cod' ? 'active' : ''}`}
                                        onClick={() => setPaymentMethod('cod')}
                                    >
                                        <input 
                                            type="radio" 
                                            name="payment_method" 
                                            className="payment-method-radio" 
                                            checked={paymentMethod === 'cod'} 
                                            onChange={() => setPaymentMethod('cod')}
                                        />
                                        <div className="payment-method-icon">
                                            <Truck size={18} />
                                        </div>
                                        <div className="payment-method-info">
                                            <div className="payment-method-header">
                                                <span className="payment-method-title">Trả khi nhận hàng (COD)</span>
                                                <span className="payment-method-badge badge-neutral">Nghiệm thu</span>
                                            </div>
                                            <p className="payment-method-desc">
                                                Thanh toán trực tiếp cho kỹ thuật viên sau khi lắp đặt và nghiệm thu tủ thành công.
                                            </p>
                                        </div>
                                    </div>

                                    {/* 4. Thanh toán mô phỏng Test */}
                                    <div 
                                        className={`payment-method-card ${paymentMethod === 'mock' ? 'active' : ''}`}
                                        onClick={() => setPaymentMethod('mock')}
                                    >
                                        <input 
                                            type="radio" 
                                            name="payment_method" 
                                            className="payment-method-radio" 
                                            checked={paymentMethod === 'mock'} 
                                            onChange={() => setPaymentMethod('mock')}
                                        />
                                        <div className="payment-method-icon">
                                            <Zap size={18} />
                                        </div>
                                        <div className="payment-method-info">
                                            <div className="payment-method-header">
                                                <span className="payment-method-title">Thanh toán mô phỏng</span>
                                                <span className="payment-method-badge badge-neutral">Thử nghiệm</span>
                                            </div>
                                            <p className="payment-method-desc">
                                                Mô phỏng thanh toán thành công tức thì phục vụ kiểm thử và báo cáo đồ án.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>}

                            {/* Chi tiết theo phương thức thanh toán */}
                            {action !== 'blocked' && paymentMethod === 'vietqr' && (
                                <div className="payment-details-box">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontWeight: 700, color: 'var(--ab-text)' }}>
                                        <Building2 size={16} />
                                        <span>Thông tin chuyển khoản</span>
                                    </div>
                                    <p>Ngân hàng: <strong>BIDV - CN Quang Trung, Hà Nội</strong></p>
                                    <p>Số tài khoản: <strong style={{ letterSpacing: '0.5px' }}>1240 0088 9966</strong></p>
                                    <p>Chủ tài khoản: <strong>CONG TY ANCHORBOX VIET NAM</strong></p>
                                    <p>Số tiền: <strong >{money(resource.data.total)}</strong></p>
                                    <p>Cú pháp: <strong>AB {(resource.data.id || orderId).substring(0, 8).toUpperCase()}</strong></p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--ab-text-3)', marginTop: 6 }}>
                                        Đơn hàng sẽ được tự động kích hoạt sau khi hệ thống ghi nhận chuyển khoản.
                                    </p>
                                </div>
                            )}

                            {action !== 'blocked' && paymentMethod === 'cod' && (
                                <div className="payment-details-box">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontWeight: 700, color: 'var(--ab-text)' }}>
                                        <Truck size={16} />
                                        <span>Trả khi nhận hàng và nghiệm thu</span>
                                    </div>
                                    <p>Quý khách sẽ thanh toán <strong>{money(resource.data.total)}</strong> trực tiếp bằng tiền mặt hoặc quẹt thẻ cho kỹ thuật viên sau khi hoàn tất lắp đặt tủ tại địa chỉ của bạn.</p>
                                </div>
                            )}

                            {action !== 'blocked' && (
                                <>
                                    <label className="apple-terms-pill">
                                        <input
                                            type="checkbox"
                                            checked={terms}
                                            disabled={busy}
                                            onChange={e => setTerms(e.target.checked)}
                                        />
                                        <span>Tôi đã kiểm tra sản phẩm, địa chỉ và đồng ý thanh toán.</span>
                                    </label>

                                    <button
                                        type="button"
                                        className="apple-primary-cta-btn"
                                        disabled={busy || !terms || !canPayCurrentMethod}
                                        onClick={handlePaymentSubmit}
                                    >
                                        {paymentMethod === 'vnpay' && <CreditCard size={18} />}
                                        {paymentMethod === 'vietqr' && <QrCode size={18} />}
                                        {paymentMethod === 'cod' && <Truck size={18} />}
                                        {paymentMethod === 'mock' && <Zap size={18} />}
                                        <span>
                                            {busy
                                                ? 'Đang xử lý…'
                                                : paymentMethod === 'vnpay'
                                                ? (action === 'resume' ? 'Tiếp tục thanh toán với VNPAY' : 'Thanh toán với VNPAY')
                                                : paymentMethod === 'vietqr'
                                                ? 'Tôi đã chuyển khoản'
                                                : paymentMethod === 'cod'
                                                ? 'Xác nhận đặt hàng, trả khi nhận'
                                                : 'Hoàn tất thanh toán mô phỏng'}
                                        </span>
                                    </button>
                                </>
                            )}

                            {action !== 'blocked' && paymentMethod === 'vnpay' && !canPay && !mode.loading && (
                                <p className="notice" style={{ marginTop: 14 }}>
                                    Máy chủ chưa sẵn sàng cho cổng VNPAY. Bạn có thể chọn phương thức <strong>Chuyển khoản VietQR</strong>, <strong>COD</strong> hoặc <strong>Thanh toán mô phỏng</strong> ở trên để tiếp tục.
                                </p>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '0.5px solid var(--ab-separator)' }}>
                                <Link className="text-link" to={`/payment/result?orderId=${orderId}`}>
                                    Kiểm tra trạng thái thanh toán
                                </Link>
                                <Link className="text-link" to={`/account/orders/${orderId}`}>
                                    Quay lại chi tiết đơn hàng
                                </Link>
                            </div>
                        </div>
                    </aside>
                </div>
            )}
        </section>
    );
}
export function PaymentResult() {
    const [params] = useSearchParams();
    const { id } = useParams();
    const orderId = params.get('orderId') || id || '';
    const { user } = useShop();
    const [version, setVersion] = useState(0);
    const [order, setOrder] = useState<CustomerOrder>();
    const [error, setError] = useState<Error>();
    const [ended, setEnded] = useState(false);
    useEffect(() => {
        if (!orderId)
            return;
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout>;
        const start = Date.now();
        setOrder(undefined);
        setError(undefined);
        setEnded(false);
        const poll = async () => { if (controller.signal.aborted)
            return; if (Date.now() - start > 120000) {
            setEnded(true);
            return;
        } if (document.hidden) {
            timer = setTimeout(poll, 5000);
            return;
        } try {
            const value = await customer.order(orderId, controller.signal);
            if (controller.signal.aborted)
                return;
            setOrder(value);
            setError(undefined);
            if (['paid', 'confirmed', 'completed', 'cancelled'].includes(value.status) || ['failed', 'expired', 'refund_required', 'refunded'].includes(value.payment?.status || '')) {
                setEnded(true);
                return;
            }
        }
        catch (reason) {
            if (controller.signal.aborted)
                return;
            setError(reason as Error);
            if (reason instanceof ApiError && [401, 403, 404].includes(reason.status)) {
                setOrder(undefined);
                setEnded(true);
                return;
            }
        } timer = setTimeout(poll, Date.now() - start < 20000 ? 2000 : 5000); };
        void poll();
        return () => { controller.abort(); clearTimeout(timer); };
    }, [orderId, user?.userId, version]);
    return <section className="container section commerce-workspace"><OrderNavigation id={orderId} title="Kết quả thanh toán"/>{!orderId ? <p className="notice">Chưa có mã đơn hàng. <Link to="/account/orders">Chọn đơn hàng của bạn</Link>.</p> : <><ErrorNotice error={error} focus />{order && <div className="commerce-two-column"><Snapshot order={order}/><PaymentSummary order={order}/></div>}<p role="status">{order?.payment?.status === 'success' && ['paid', 'confirmed', 'completed'].includes(order.status) ? 'Máy chủ xác nhận đơn đã được thanh toán.' : order?.status === 'cancelled' ? 'Đơn đã hủy. Thông tin thanh toán và hoàn tiền được hiển thị theo dữ liệu máy chủ.' : ended ? 'Chưa xác định được kết quả thanh toán. Bạn có thể kiểm tra lại.' : 'Đang kiểm tra trạng thái đơn hàng…'} </p><button onClick={() => setVersion(v => v + 1)}>Kiểm tra lại</button><Link className="text-link" to={`/account/orders/${orderId}`}>Xem đơn hàng</Link></>}</section>;
}
export function Orders() {
    const { user } = useShop();
    const [page, setPage] = useState(0);
    const [rows, setRows] = useState<OrderView[]>([]);
    const resource = useResource(signal => customer.orders(page, signal), `${user?.userId}:${page}`);
    useEffect(() => { if (resource.data)
        setRows(old => page === 0 ? resource.data!.content : [...old, ...resource.data!.content.filter(row => !old.some(x => x.id === row.id))]); }, [resource.data, page]);
    useEffect(() => { if (resource.error instanceof ApiError && [401, 403].includes(resource.error.status)) setRows([]); }, [resource.error]);
    return <section className="container section orders-page commerce-workspace"><AccountNav/>
      <div className="orders-heading"><div><p className="eyebrow">Tài khoản của bạn</p><h1>Đơn hàng của tôi</h1><p className="muted">Theo dõi tiến trình, kiểm tra thanh toán và xem chứng từ.</p></div><button disabled={resource.loading} onClick={() => { if (page !== 0) setPage(0); else resource.retry(); }}>Cập nhật danh sách</button></div>
      <ResourceState {...resource}/>
      <div className="orders-list">{rows.map(order => <article className="customer-order-card" key={order.id}><header><div><span className="order-caption">Mã đơn hàng</span><Link to={'/account/orders/' + order.id} className="order-code">{order.id}</Link><small>Đặt ngày {date(order.createdAt)}</small></div><Status value={order.status}/></header><div className="order-card-content"><div><strong>{order.items?.[0]?.productName || 'Sản phẩm trong đơn hàng'}</strong><p>{order.items?.length ? order.items.reduce((total, item) => total + item.quantity, 0) + ' sản phẩm · ' + order.items.length + ' dòng hàng' : 'Xem chi tiết để kiểm tra cấu hình và số lượng.'}</p></div><div className="order-card-total"><small>Tổng đơn hàng</small><strong>{money(order.total)}</strong></div></div><footer><Link className="text-link" to={'/account/orders/' + order.id + '/invoice'}>Xem / In chứng từ</Link><div>{order.status === 'awaiting_payment' && <Link className="button secondary" to={'/checkout/' + order.id}>Thanh toán</Link>}<Link className="button" to={'/account/orders/' + order.id}>Xem chi tiết</Link></div></footer></article>)}</div>
      {resource.data?.totalElements === 0 && page === 0 && <div className="panel"><h2>Bạn chưa có đơn hàng</h2><p>Đơn hàng sẽ xuất hiện tại đây sau khi bạn gửi yêu cầu mua hàng.</p><Link className="button" to="/products">Khám phá sản phẩm</Link></div>}
      {resource.data && page + 1 < resource.data.totalPages && <button disabled={resource.loading} onClick={() => setPage(p => p + 1)}>Tải thêm đơn hàng</button>}
    </section>;
}
function PaymentSummary({order}:{order:CustomerOrder}) {
 const payment=order.payment;
 return <section className="panel commerce-payment-summary"><h2>Thanh toán</h2>{payment ? <><div className="commerce-section-title"><span>{payment.isSimulated?'Thanh toán mô phỏng':payment.provider==='vnpay'?'VNPAY Sandbox':payment.provider}</span><Status value={payment.status} context="payment"/></div><strong className="commerce-amount">{money(payment.amount)}</strong><p className="muted">{payment.paidAt ? 'Ghi nhận: '+date(payment.paidAt) : 'Chưa có thời điểm ghi nhận thanh toán'}</p>{payment.refund&&<div className="commerce-refund"><h3>Thông tin hoàn tiền</h3><Status value={payment.refund.status} context="payment"/><p>{money(payment.refund.amount)}</p>{payment.refund.completedAt&&<small>{date(payment.refund.completedAt)}</small>}</div>}</>:<p className="muted">Chưa có phiên thanh toán cho đơn hàng này.</p>}{order.paidAt&&<Link className="text-link" to={`/account/orders/${order.id}/invoice`}>Xem chứng từ</Link>}</section>;
}
function OrderHeader({order}:{order:CustomerOrder}) {
    return <header className="order-compact-header"><Link className="order-back" to="/account/orders"><ArrowLeft size={16}/>Đơn hàng của tôi</Link><div className="order-compact-title"><h1>Chi tiết đơn hàng</h1><Status value={order.status}/></div><p className="order-reference">Mã đơn hàng <span>{order.id}</span> · Đặt ngày {date(order.createdAt)}</p></header>;
}
function DeliveryBlock({order,id}:{order:CustomerOrder;id:string}) {
    return <section className="order-block"><h2>Giao hàng và lắp đặt</h2><p>{order.deliveryInstallation ? jobLabels[order.deliveryInstallation.status] || order.deliveryInstallation.status : order.status === 'cancelled' ? 'Đơn đã hủy, không có lịch giao và lắp đặt.' : 'Chưa có lịch giao và lắp đặt.'}</p>{(order.deliveryInstallation || order.status !== 'cancelled') && <Link className="text-link" to={'/account/orders/' + id + '/installation'}>Theo dõi tiến trình</Link>}</section>;
}
export function OrderDetail() {
    const { id = '' } = useParams();
    const { user } = useShop();
    const resource = useResource(async signal => { const detail = await customer.order(id, signal); const core = await shop.order(id, signal); return { ...detail, ticket: core.ticket }; }, `${user?.userId}:${id}`);
    const history = useResource(signal => customer.timeline(id, signal), `${user?.userId}:${id}`);
    const order = resource.data;
    const [picked, setPicked] = useState<number | null>(null);
    const reload = () => { resource.retry(); history.retry(); };
    const terminal = !!order && ['completed', 'cancelled'].includes(order.status);
    const step = Math.min(picked ?? (order ? orderStagePosition(order.status) ?? 0 : 0), 3);
    const historyBlock = <details className="order-block order-history"><summary>Lịch sử đơn hàng</summary><ResourceState {...history}/>{history.data && <EventTimeline events={history.data.events} title="Các mốc của đơn hàng"/>}</details>;
    return <section className={'container section order-workspace commerce-workspace' + (terminal ? ' order-compact' : '')}>
      {!order && <OrderNavigation id={id} title="Chi tiết đơn hàng"/>}<ResourceState {...resource}/>
      {order && terminal && <>
        <OrderHeader order={order}/>
        <div className="order-compact-grid">
          <div className="order-main-column"><Snapshot order={order}/></div>
          <aside className="order-side-column">
            <PaymentSummary order={order}/>
            <DeliveryBlock order={order} id={id}/>
            <section className="order-block order-compact-actions"><h2>Chứng từ</h2><div><Link className="button" to={'/account/orders/' + id + '/invoice'}>Xem hóa đơn</Link>{order.status === 'completed' && <Link className="button secondary" to={'/account/warranty?orderId=' + encodeURIComponent(order.id)}>Tra cứu bảo hành</Link>}</div></section>
          </aside>
        </div>
        {historyBlock}
      </>}
      {order && !terminal && <>
        <OrderHeader order={order}/>
        <OrderProgress order={order} selected={step} onSelect={setPicked}/>
        <div className="order-step-panel">
          {step === 0 && <>
            <section className="order-block"><div className="order-block-heading"><h2>Sản phẩm và thông tin nhận hàng</h2><button disabled={resource.loading} onClick={reload}>Cập nhật</button></div><Snapshot order={order}/></section>
            {order.status === 'pending' ? <details className="order-edit-section"><summary>Chỉnh sửa hoặc hủy đơn chưa thanh toán</summary><p className="muted">Khả năng chỉnh sửa phụ thuộc trạng thái xét duyệt hiện tại.</p><DraftEditor order={order} reload={reload}/></details> : <DraftEditor order={order} reload={reload}/>}
          </>}
          {step === 1 && <>
            <ApprovalDecision order={order} reload={reload}/>
            <section className="order-block"><h2>Xét duyệt sản phẩm</h2>{order.ticket?.length ? order.ticket.map(ticket => <div key={ticket.id}><Status value={ticket.status}/><p className="muted">Kết quả được cập nhật bởi bên bán.</p></div>) : <p className="muted">Chưa có phiếu xét duyệt.</p>}<Link className="text-link" to={'/account/orders/' + id + '/ticket'}>Chi tiết xét duyệt</Link></section>
          </>}
          {step === 2 && <>
            <PaymentSummary order={order}/>
            {order.status === 'awaiting_payment' && <section className="order-block"><h2>Thanh toán đơn hàng</h2><p className="muted">Chọn phương thức và xác nhận ở bước thanh toán.</p><Link className="button" to={'/checkout/' + order.id}>Tiếp tục thanh toán</Link></section>}
          </>}
          {step === 3 && <DeliveryBlock order={order} id={id}/>}
        </div>
        {historyBlock}
        <section className="order-help-box"><h3>Cần hỗ trợ đơn hàng?</h3><p>Cung cấp mã đơn khi liên hệ để được kiểm tra thông tin.</p><Link to="/contact">Trung tâm hỗ trợ</Link></section>
      </>}
    </section>;
}
export function OrderTicket() {
    const { id = '' } = useParams();
    const { user } = useShop();
    const resource = useResource(async (signal) => { const order = await shop.order(id, signal); const ticket = order.ticket?.[0]; return { order, ticket: ticket ? await shop.ticket(ticket.id, signal) : null }; }, `${user?.userId}:${id}`);
    const [reason, setReason] = useState('');
    const [error, setError] = useState<Error>();
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    async function submit(e: FormEvent) { e.preventDefault(); if (busy || !resource.data?.ticket)
        return; setBusy(true); setError(undefined); try {
        await shop.resubmit(resource.data.ticket.id, reason.trim());
        setReason('');
        setMessage('Đã gửi giải trình để xét duyệt lại.');
        resource.retry();
    }
    catch (value) {
        setError(value as Error);
        if (value instanceof ApiError && value.status === 409)
            resource.retry();
    }
    finally {
        setBusy(false);
    } }
    return <section className="container section commerce-workspace"><OrderNavigation id={id} title="Xét duyệt sản phẩm"/><ResourceState {...resource}/>{resource.data && <>{resource.data.ticket ? <div className="panel"><div className="commerce-section-title"><h2>Kết quả xét duyệt</h2><Status value={resource.data.ticket.status}/></div><p className="muted">Vòng xét duyệt: {resource.data.ticket.review_round ?? 'Chưa có dữ liệu'}</p>{resource.data.ticket.reason && <p className="notice">{resource.data.ticket.reason}</p>}<p role="status">{message}</p><ErrorNotice error={error} focus />{resource.data.ticket.status === 'RETURNED' && <form onSubmit={submit}><label>Giải trình (bắt buộc, tối đa 2.000 ký tự)<textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={2000} required/></label><p>{reason.length}/2000</p><button className="button" disabled={busy || !reason.trim()}>{busy ? 'Đang gửi…' : 'Gửi giải trình'}</button><p className="muted">Giải trình của bạn sẽ được gửi đến bên bán để xét duyệt lại.</p></form>}<EventTimeline events={resource.data.ticket.history || []} title="Lịch sử xét duyệt"/></div> : <EmptyState title="Chưa có phiếu xét duyệt">Kết quả sẽ xuất hiện khi bên bán tiếp nhận đơn hàng.</EmptyState>}</>}</section>;
}
export function CheckoutRedirect() { const { user } = useShop(); return <section className="container section commerce-workspace"><h1>Chọn đơn đã được duyệt để thanh toán.</h1><Link className="button" to={user ? '/account/orders' : '/login?returnTo=/account/orders'}>Xem đơn hàng</Link><Link className="text-link" to="/cart">Tạo đơn từ giỏ hàng</Link></section>; }
