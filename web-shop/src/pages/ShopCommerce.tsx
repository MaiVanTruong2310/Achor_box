import { CommerceStatus as Status, EventTimeline, EmptyState, RefreshButton } from '../components/CommerceUi';
import { displayDate as date } from '../components/commercePresentation';
import { OrderNavigation, OrderProgress } from '../components/OrderNavigation';
import { hasPendingOrder, markPendingOrder, clearPendingOrder } from '../api/orderRecovery';
import { phonePattern } from '../api/validation';
import { commerce, checkoutAction, canSubmitQuote } from '../api/commerce';
import { ApprovalDecision } from '../components/ApprovalDecision';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, money, shop, type OrderView } from '../api/shop';
import { useShop } from '../ShopContext';
import { AccountNav, ErrorNotice, ResourceState, useResource } from '../components/ShopUi';
import { customer, jobLabels, type CustomerOrder } from '../api/customer';
import { DraftEditor } from '../components/DraftEditor';
import { paymentApi, paymentDestination } from '../api/payment';
import { QuantityStepper } from '../components/QuantityStepper';
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
    return <section className="container section form-page"><p className="eyebrow">CHÀO MỪNG TRỞ LẠI</p><h1>Đăng nhập.</h1><form onSubmit={submit} aria-busy={busy}><ErrorNotice error={error} focus /><label>Email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)}/></label><label>Mật khẩu<input type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)}/></label><label className="inline"><input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)}/>Hiện mật khẩu</label><button className="button" disabled={busy || cooldown > 0}>{busy ? 'Đang đăng nhập…' : cooldown ? `Thử lại sau ${cooldown} giây` : 'Đăng nhập →'}</button><p className="muted">Tạo tài khoản mới hoặc khôi phục mật khẩu qua email.</p><Link to="/register">Tạo tài khoản</Link><Link className="text-link" to="/forgot-password">Quên mật khẩu?</Link></form></section>;
}
export function Cart() {
    const { lines, quantity, user, clear } = useShop();
    const [address, setAddress] = useState('');
    const [addressId, setAddressId] = useState('');
    const [recipient, setRecipient] = useState('');
    const [phone, setPhone] = useState('');
    const [note, setNote] = useState('');
    const addresses = useResource(signal => user ? customer.addresses(signal) : Promise.resolve([]), user?.userId || 'guest');
    const [error, setError] = useState<Error>();
    const [busy, setBusy] = useState(false);
    const [unknown, setUnknown] = useState(() => !!user && hasPendingOrder(user.userId));
    useEffect(() => { const update = () => setUnknown(!!user && hasPendingOrder(user.userId)); update(); window.addEventListener('storage', update); return () => window.removeEventListener('storage', update); }, [user?.userId]);
    const navigate = useNavigate();
    const lock = useRef(false);
    const [coupon, setCoupon] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState('');
    const items = lines.map(line => ({ variantId: line.variant.id, quantity: line.quantity }));
    const pricing = useResource(signal => items.length ? commerce.pricing(items, appliedCoupon, signal) : Promise.resolve(null), JSON.stringify([items, appliedCoupon]));
    const quoteReady = !pricing.loading && !pricing.error && canSubmitQuote(pricing.data, appliedCoupon);
    async function submit(e: FormEvent) {
        e.preventDefault();
        if (lock.current || unknown || !quoteReady || !user || user.role !== 'customer' || hasPendingOrder(user.userId))
            return;
        lock.current = true;
        setBusy(true);
        setError(undefined);
        let createSent = false;
        try {
            // Revalidate every SKU before reserving stock. Never send local prices to the server.
            for (const line of lines) {
                const variants = await shop.variants(line.variant.productId);
                const variant = variants.find(v => v.id === line.variant.id);
                if (!variant?.isActive || variant.stockQuantity < line.quantity)
                    throw new ApiError(409, `${line.productName}: phiên bản không còn đủ hàng. Vui lòng chọn lại cấu hình.`);
                if (variant.finalPrice == null || variant.finalPrice !== pricing.data?.itemDetails.find(item => item.variantId === line.variant.id)?.unitPrice)
                    throw new ApiError(409, `${line.productName}: giá đã thay đổi. Vui lòng cập nhật bảng giá rồi thử lại.`);
            }
            const quote = await commerce.pricing(items, appliedCoupon);
            if (!canSubmitQuote(quote, appliedCoupon)) throw new ApiError(409, 'Giỏ hàng hoặc mã giảm giá không còn hợp lệ. Vui lòng kiểm tra lại.');
            if (quote.finalTotal !== pricing.data?.finalTotal) { pricing.retry(); throw new ApiError(409, 'Giá đã thay đổi. Kiểm tra bảng giá mới rồi gửi lại.'); }
            markPendingOrder(user.userId);
            createSent = true;
            const order = await customer.createOrder(addressId ? { addressId } : { shippingDetails: { label: 'Địa chỉ đơn hàng', recipientName: recipient.trim(), phone: phone.trim(), addressLine: address.trim(), installationNote: note.trim(), isDefault: false } }, items, appliedCoupon || undefined);
            if (!order.id && !order.orderId) throw new ApiError(502, 'Chưa nhận được mã đơn. Hãy kiểm tra lịch sử đơn trước khi thử lại.');
            clearPendingOrder(user.userId);
            clear();
            navigate(`/account/orders/${order.orderId || order.id}`);
        }
        catch (reason) {
            setError(reason as Error);
            if (!createSent) pricing.retry();
            if (createSent) {
                if (reason instanceof ApiError && reason.status >= 400 && reason.status < 500) clearPendingOrder(user.userId);
                else setUnknown(true);
            }
        }
        finally {
            lock.current = false;
            setBusy(false);
        }
    }
    return <section className="container section commerce-workspace"><p className="eyebrow">LỰA CHỌN CỦA BẠN</p><h1>Giỏ hàng.</h1><p className="muted">Giỏ hàng chưa giữ kho. Giá dưới đây là ước tính; bảng tổng tiền được tính lại bởi máy chủ.</p>{!lines.length ? <div className="notice">Giỏ hàng đang trống. <Link to="/products">Khám phá sản phẩm →</Link></div> : <form className="split" onSubmit={submit}><div>{lines.map(line => <article className="panel cart-row" key={line.variant.id}><h3>{line.productName}</h3><p>{line.variant.variantName} · {line.variant.sku}</p><p>{money(pricing.data?.itemDetails.find(item => item.variantId === line.variant.id)?.unitPrice ?? line.variant.finalPrice)}</p><QuantityStepper disabled={busy} value={line.quantity} max={line.variant.stockQuantity} onChange={value => quantity(line.variant.id, value)} /><button disabled={busy} type="button" onClick={() => quantity(line.variant.id, 0)}>Xóa lựa chọn</button></article>)}</div><div className="panel"><h2>Xác nhận đơn hàng.</h2><ResourceState {...pricing}/><label>Mã giảm giá<input value={coupon} disabled={busy} maxLength={100} onChange={e => setCoupon(e.target.value)}/></label><button type="button" disabled={busy || pricing.loading} onClick={() => setAppliedCoupon(coupon.trim())}>Áp dụng mã</button>{appliedCoupon && <button type="button" disabled={busy} onClick={() => { setAppliedCoupon(''); setCoupon(''); }}>Bỏ mã</button>}{pricing.data && !pricing.error && <><p>Tạm tính: {money(pricing.data.subtotal)}</p><p>Giảm giá: {money(pricing.data.discountAmount)}</p><p>Giao hàng & lắp đặt: {money(pricing.data.shippingFee)}</p><p role="status">{pricing.data.voucherMessage}</p><p className="price">{money(pricing.data.finalTotal)}</p>{pricing.data.itemDetails.filter(item => !item.inStock).map(item => <p className="notice danger" key={item.variantId}>{item.productName}: không đủ hàng.</p>)}</>}<ResourceState {...addresses}/>{user && <label>Địa chỉ đã lưu<select disabled={busy} value={addressId} onChange={e => setAddressId(e.target.value)}><option value="">Nhập địa chỉ cho đơn này</option>{addresses.data?.map(item => <option value={item.id} key={item.id}>{item.label} · {item.addressLine}</option>)}</select></label>}{!addressId && <><label>Người nhận<input required maxLength={200} autoComplete="name" disabled={busy} value={recipient} onChange={e => setRecipient(e.target.value)}/></label><label>Số điện thoại<input required type="tel" pattern={phonePattern} maxLength={30} autoComplete="tel" disabled={busy} value={phone} onChange={e => setPhone(e.target.value)}/></label><label>Địa chỉ giao hàng (bắt buộc)<textarea maxLength={2000} required value={address} disabled={busy} onChange={e => setAddress(e.target.value)} placeholder="Địa chỉ đầy đủ để giao thiết bị"/></label><label>Ghi chú lắp đặt<textarea maxLength={2000} disabled={busy} value={note} onChange={e => setNote(e.target.value)}/></label></>}<ErrorNotice error={error} focus />{unknown && <p className="notice">Chưa xác định được đơn đã tạo hay chưa. <Link to="/account/orders">Kiểm tra đơn hàng của tôi</Link> trước khi tạo tiếp. <button type="button" disabled={busy} onClick={() => { if (user && window.confirm('Bạn đã kiểm tra lịch sử và xác nhận đơn này chưa được tạo? Nếu chưa chắc chắn, hãy liên hệ hỗ trợ trước khi gửi lại.')) { clearPendingOrder(user.userId); setUnknown(false); setError(undefined); pricing.retry(); } }}>Tôi đã đối chiếu, cho phép gửi lại</button></p>}{user ? <button className="button" disabled={busy || unknown || !quoteReady || user.role !== 'customer' || (!addressId && (!address.trim() || !recipient.trim() || !phone.trim()))}>{busy ? 'Đang kiểm tra và tạo đơn…' : 'Gửi đơn để xét duyệt →'}</button> : <Link className="button" to="/login?returnTo=/cart">Đăng nhập để tạo đơn →</Link>}<p className="muted">Bạn chỉ thanh toán sau khi đơn đã được duyệt.</p></div></form>}</section>;
}
export function Snapshot({order}:{order:OrderView}) {
 const address=order.shippingAddressSnapshot;
 return <div className="panel commerce-snapshot"><div className="commerce-section-title"><h2>Thông tin đơn hàng</h2><Status value={order.status}/></div><div className="commerce-address"><div><span className="order-caption">NGƯỜI NHẬN</span><strong>{address?.recipientName || 'Chưa cập nhật người nhận'}</strong><span>{address?.phone || 'Chưa cập nhật số điện thoại'}</span></div><div><span className="order-caption">ĐỊA CHỈ GIAO HÀNG</span><p>{address?.addressLine || order.shippingAddress || 'Chưa cập nhật địa chỉ'}</p>{address?.installationNote && <p className="muted">Ghi chú: {address.installationNote}</p>}</div></div><p className="muted commerce-order-date">Ngày đặt: {date(order.createdAt)}{order.expiresAt && ['pending','awaiting_payment','customer_decision_pending'].includes(order.status) && <> · Hạn xử lý: {date(order.expiresAt)}</>}</p><div className="table-scroll"><table><caption>Sản phẩm trong đơn</caption><thead><tr><th>Sản phẩm / cấu hình</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>{order.items?.map(item=><tr key={item.id}><td><strong>{item.productName}</strong><small>{item.variantName} · {item.sku}</small></td><td>{item.quantity}</td><td>{money(item.unitPrice)}</td><td><strong>{money(item.subtotal)}</strong></td></tr>)}</tbody></table></div><dl className="commerce-totals"><div><dt>Tạm tính</dt><dd>{money(order.subtotal ?? order.total)}</dd></div>{!!order.discountAmount&&<div><dt>Giảm giá {order.voucherCode || ''}</dt><dd>−{money(order.discountAmount)}</dd></div>}<div className="commerce-total"><dt>Tổng đơn hàng</dt><dd>{money(order.total)}</dd></div></dl></div>;
}
export function Checkout() {
    const { orderId = '' } = useParams(); const { user } = useShop(); const navigate = useNavigate();
    const resource = useResource(signal => customer.order(orderId, signal), `${user?.userId}:${orderId}`);
    const mode = useResource(paymentApi.mode, 'payment-mode');
    const [error, setError] = useState<Error>(); const [busy, setBusy] = useState(false); const [terms, setTerms] = useState(false); const lock = useRef(false);
    const action = resource.data ? checkoutAction(resource.data) : 'blocked';
    const canPay = action !== 'blocked' && !resource.loading && !resource.error && !mode.error && !!mode.data && (mode.data.provider === 'vnpay' || mode.data.demoActionsEnabled);
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
    return <section className="container section commerce-workspace"><OrderNavigation id={orderId} title="Thanh toán đơn hàng"/><ResourceState {...resource}/><RefreshButton busy={resource.loading || busy} onClick={resource.retry} label="Cập nhật trạng thái"/>{resource.data && <div className="commerce-two-column"><Snapshot order={resource.data}/><div className="panel commerce-checkout"><h2>Phương thức thanh toán</h2>{resource.data.payment && <PaymentSummary order={resource.data}/>}<ResourceState {...mode}/>{mode.data && <p className="notice">{mode.data.provider === 'mock' ? 'Thanh toán mô phỏng cho đồ án. Không thu tiền thật.' : 'Thanh toán qua VNPay Sandbox. Đây là môi trường kiểm thử.'} Giá và số lượng được xác nhận từ đơn hàng trên máy chủ.</p>}<ErrorNotice error={error} focus/>{resource.data.status === 'pending' && <p className="notice">Đơn đang chờ xét duyệt. Thanh toán sẽ mở khi đơn được duyệt.</p>}<ApprovalDecision order={resource.data} reload={resource.retry}/>{action !== 'blocked' && <><label className="inline"><input type="checkbox" checked={terms} disabled={busy} onChange={e => setTerms(e.target.checked)}/>Tôi đã kiểm tra sản phẩm, địa chỉ và hiểu đây là thanh toán kiểm thử.</label><button className="button" disabled={busy || !terms || !canPay} onClick={pay}>{busy ? 'Đang mở phiên thanh toán…' : action === 'resume' ? 'Tiếp tục phiên thanh toán' : 'Bắt đầu thanh toán'}</button></>}{action !== 'blocked' && !canPay && !mode.loading && <p className="notice">Máy chủ chưa sẵn sàng cho thanh toán. Hãy thử tải lại trạng thái.</p>}<Link className="text-link" to={`/payment/result?orderId=${orderId}`}>Kiểm tra trạng thái thanh toán →</Link><Link className="text-link" to={`/account/orders/${orderId}`}>Xem đơn hàng →</Link></div></div>}</section>;
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
    return <section className="container section commerce-workspace"><OrderNavigation id={orderId} title="Kết quả thanh toán"/>{!orderId ? <p className="notice">Chưa có mã đơn hàng. <Link to="/account/orders">Chọn đơn hàng của bạn</Link>.</p> : <><ErrorNotice error={error} focus />{order && <div className="commerce-two-column"><Snapshot order={order}/><PaymentSummary order={order}/></div>}<p role="status">{order?.payment?.status === 'success' && ['paid', 'confirmed', 'completed'].includes(order.status) ? 'Máy chủ xác nhận đơn đã được thanh toán.' : order?.status === 'cancelled' ? 'Đơn đã hủy. Thông tin thanh toán và hoàn tiền được hiển thị theo dữ liệu máy chủ.' : ended ? 'Chưa xác định được kết quả thanh toán. Bạn có thể kiểm tra lại.' : 'Đang kiểm tra trạng thái đơn hàng…'} </p><button onClick={() => setVersion(v => v + 1)}>Kiểm tra lại</button><Link className="text-link" to={`/account/orders/${orderId}`}>Xem đơn hàng →</Link></>}</section>;
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
      <div className="orders-heading"><div><p className="eyebrow">TÀI KHOẢN CỦA BẠN</p><h1>Đơn hàng của tôi</h1><p className="muted">Theo dõi tiến trình, kiểm tra thanh toán và xem chứng từ.</p></div><button disabled={resource.loading} onClick={() => { if (page !== 0) setPage(0); else resource.retry(); }}>Cập nhật danh sách</button></div>
      <ResourceState {...resource}/>
      <div className="orders-list">{rows.map(order => <article className="customer-order-card" key={order.id}><header><div><span className="order-caption">MÃ ĐƠN HÀNG</span><Link to={'/account/orders/' + order.id} className="order-code">{order.id}</Link><small>Đặt ngày {date(order.createdAt)}</small></div><Status value={order.status}/></header><div className="order-card-content"><div><strong>{order.items?.[0]?.productName || 'Sản phẩm trong đơn hàng'}</strong><p>{order.items?.length ? order.items.reduce((total, item) => total + item.quantity, 0) + ' sản phẩm · ' + order.items.length + ' dòng hàng' : 'Xem chi tiết để kiểm tra cấu hình và số lượng.'}</p></div><div className="order-card-total"><small>Tổng đơn hàng</small><strong>{money(order.total)}</strong></div></div><footer><Link className="text-link" to={'/account/orders/' + order.id + '/invoice'}>Xem / In chứng từ</Link><div>{order.status === 'awaiting_payment' && <Link className="button secondary" to={'/checkout/' + order.id}>Thanh toán</Link>}<Link className="button" to={'/account/orders/' + order.id}>Xem chi tiết →</Link></div></footer></article>)}</div>
      {resource.data?.totalElements === 0 && page === 0 && <div className="panel"><h2>Bạn chưa có đơn hàng</h2><p>Đơn hàng sẽ xuất hiện tại đây sau khi bạn gửi yêu cầu mua hàng.</p><Link className="button" to="/products">Khám phá sản phẩm</Link></div>}
      {resource.data && page + 1 < resource.data.totalPages && <button disabled={resource.loading} onClick={() => setPage(p => p + 1)}>Tải thêm đơn hàng</button>}
    </section>;
}
function PaymentSummary({order}:{order:CustomerOrder}) {
 const payment=order.payment;
 return <section className="panel commerce-payment-summary"><h2>Thanh toán</h2>{payment ? <><div className="commerce-section-title"><span>{payment.isSimulated?'Thanh toán mô phỏng':payment.provider==='vnpay'?'VNPAY Sandbox':payment.provider}</span><Status value={payment.status} context="payment"/></div><strong className="commerce-amount">{money(payment.amount)}</strong><p className="muted">{payment.paidAt ? 'Ghi nhận: '+date(payment.paidAt) : 'Chưa có thời điểm ghi nhận thanh toán'}</p>{payment.refund&&<div className="commerce-refund"><h3>Thông tin hoàn tiền</h3><Status value={payment.refund.status} context="payment"/><p>{money(payment.refund.amount)}</p>{payment.refund.completedAt&&<small>{date(payment.refund.completedAt)}</small>}</div>}</>:<p className="muted">Chưa có phiên thanh toán cho đơn hàng này.</p>}{order.paidAt&&<Link className="text-link" to={`/account/orders/${order.id}/invoice`}>Xem chứng từ →</Link>}</section>;
}
export function OrderDetail() {
    const { id = '' } = useParams();
    const { user } = useShop();
    const resource = useResource(async signal => { const detail = await customer.order(id, signal); const core = await shop.order(id, signal); return { ...detail, ticket: core.ticket }; }, `${user?.userId}:${id}`);
    const history = useResource(signal => customer.timeline(id, signal), `${user?.userId}:${id}`);
    const order = resource.data;
    const reload = () => { resource.retry(); history.retry(); };
    return <section className="container section order-workspace commerce-workspace"><OrderNavigation id={id} title="Chi tiết đơn hàng"/><ResourceState {...resource}/>{order && <>
      <OrderProgress order={order}/>
      <div className="order-detail-grid"><div className="order-main-column"><section className="order-block"><div className="order-block-heading"><h2>Sản phẩm & thông tin nhận hàng</h2><button disabled={resource.loading} onClick={reload}>Cập nhật</button></div><Snapshot order={order}/></section>
      <ApprovalDecision order={order} reload={reload}/>
      {order.status === 'pending' && <details className="order-edit-section"><summary>Chỉnh sửa hoặc hủy đơn chưa thanh toán</summary><p className="muted">Khả năng chỉnh sửa phụ thuộc trạng thái xét duyệt hiện tại.</p><DraftEditor order={order} reload={reload}/></details>}
      {order.status !== 'pending' && <DraftEditor order={order} reload={reload}/>}
      <section className="order-block"><ResourceState {...history}/>{history.data && <EventTimeline events={history.data.events} title="Các mốc của đơn hàng"/>}</section></div>
      <aside className="order-side-column"><PaymentSummary order={order}/><section className="order-block"><h2>Xét duyệt sản phẩm</h2>{order.ticket?.length ? order.ticket.map(ticket => <div key={ticket.id}><Status value={ticket.status}/><p className="muted">Kết quả được cập nhật bởi bên bán.</p></div>) : <p className="muted">Chưa có phiếu xét duyệt.</p>}<Link className="text-link" to={'/account/orders/' + id + '/ticket'}>Chi tiết xét duyệt →</Link></section>
      <section className="order-block"><h2>Giao hàng & lắp đặt</h2><p>{order.deliveryInstallation ? jobLabels[order.deliveryInstallation.status] || order.deliveryInstallation.status : 'Chưa có lịch giao và lắp đặt.'}</p><Link className="text-link" to={'/account/orders/' + id + '/installation'}>Theo dõi tiến trình →</Link></section>
      <section className="order-help-box"><h3>Cần hỗ trợ đơn hàng?</h3><p>Cung cấp mã đơn khi liên hệ để được kiểm tra thông tin.</p><Link to="/contact">Trung tâm hỗ trợ →</Link></section></aside></div>
    </>}</section>;
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
    return <section className="container section commerce-workspace"><OrderNavigation id={id} title="Xét duyệt sản phẩm"/><ResourceState {...resource}/>{resource.data && <><Status value={resource.data.order.status}/>{resource.data.ticket ? <div className="panel"><Status value={resource.data.ticket.status}/><p>Vòng xét duyệt: {resource.data.ticket.review_round ?? 'Chưa có dữ liệu'}</p>{resource.data.ticket.reason && <p className="notice">{resource.data.ticket.reason}</p>}<p role="status">{message}</p><ErrorNotice error={error} focus />{resource.data.ticket.status === 'RETURNED' && <form onSubmit={submit}><label>Giải trình (bắt buộc, tối đa 2.000 ký tự)<textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={2000} required/></label><p>{reason.length}/2000</p><button className="button" disabled={busy || !reason.trim()}>{busy ? 'Đang gửi…' : 'Gửi giải trình'}</button><p className="muted">Giải trình của bạn sẽ được gửi đến bên bán để xét duyệt lại.</p></form>}<EventTimeline events={resource.data.ticket.history || []} title="Lịch sử xét duyệt"/></div> : <EmptyState title="Chưa có phiếu xét duyệt">Kết quả sẽ xuất hiện khi bên bán tiếp nhận đơn hàng.</EmptyState>}</>}</section>;
}
export function CheckoutRedirect() { const { user } = useShop(); return <section className="container section commerce-workspace"><h1>Chọn đơn đã được duyệt để thanh toán.</h1><Link className="button" to={user ? '/account/orders' : '/login?returnTo=/account/orders'}>Xem đơn hàng →</Link><Link className="text-link" to="/cart">Tạo đơn từ giỏ hàng →</Link></section>; }
