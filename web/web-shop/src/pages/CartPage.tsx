import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ChevronRight, Info, Minus, Plus, ShieldCheck, ShoppingBag, Tag, Trash2, Truck, X } from 'lucide-react';
import { ApiError, money, type CatalogProduct, type Variant } from '../api/shop';
import { commerce, canSubmitQuote } from '../api/commerce';
import { customer } from '../api/customer';
import { hasPendingOrder, markPendingOrder, clearPendingOrder } from '../api/orderRecovery';
import { phonePattern } from '../api/validation';
import { useShop, linePrice, type CartLine } from '../ShopContext';
import { useCatalog } from '../CatalogContext';
import { ErrorNotice, ResourceState, useResource } from '../components/ShopUi';
import { BoxThumb } from '../components/BoxShowcase';
import './cart-page.css';

type LineState = { line: CartLine; product?: CatalogProduct; live?: Variant; problem: string | null; maxQuantity: number };

const PHONE = /^\+?[0-9 ()-]{8,30}$/;
const isBox = (sku?: string | null) => /^ANCHORBOX/i.test(sku ?? '');

export function CartPage() {
  const { lines, quantity, user, clear, sync } = useShop();
  const catalog = useCatalog();
  const navigate = useNavigate();

  useEffect(() => {
    if (catalog.data) sync(catalog.data.flatMap(p => p.variants ?? []));
  }, [catalog.data, sync]);

  const states: LineState[] = useMemo(() => lines.map(line => {
    const product = catalog.data?.find(p => p.id === line.variant.productId);
    const live = product?.variants?.find(v => v.id === line.variant.id);
    let problem: string | null = null;
    if (catalog.data && (!product || !live || !live.isActive)) problem = 'Sản phẩm này không còn được bán.';
    else if (live && live.stockQuantity <= 0) problem = 'Phiên bản này đã hết hàng.';
    else if (live && live.stockQuantity < line.quantity) problem = `Chỉ còn ${live.stockQuantity} sản phẩm.`;
    return { line, product, live, problem, maxQuantity: Math.max(1, Math.min(99, live?.stockQuantity ?? line.variant.stockQuantity)) };
  }), [lines, catalog.data]);

  const blocked = states.filter(s => s.problem);
  const priced = states.filter(s => !s.problem);
  const items = priced.map(({ line }) => ({ variantId: line.variant.id, quantity: line.quantity, ...(line.warrantyPlan ? { warrantyPlanId: line.warrantyPlan.id } : {}) }));

  const [coupon, setCoupon] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const pricing = useResource(signal => (items.length ? commerce.pricing(items, appliedCoupon, signal) : Promise.resolve(null)), JSON.stringify([items, appliedCoupon]));
  const quote = pricing.data;
  const unitPrice = (line: CartLine) => quote?.itemDetails.find(i => i.variantId === line.variant.id)?.unitPrice ?? linePrice(line);
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const estimate = priced.reduce((sum, s) => sum + unitPrice(s.line) * s.line.quantity, 0);
  const couponRejected = !!appliedCoupon && !!quote && !quote.voucherApplied;

  const addresses = useResource(signal => (user?.role === 'customer' ? customer.addresses(signal) : Promise.resolve([])), `${user?.userId ?? 'guest'}:addresses`);
  const [addressId, setAddressId] = useState('');
  const [recipient, setRecipient] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const pickedDefault = useRef(false);
  useEffect(() => {
    if (pickedDefault.current || !addresses.data?.length) return;
    pickedDefault.current = true;
    setAddressId((addresses.data.find(a => a.isDefault) ?? addresses.data[0]).id);
  }, [addresses.data]);

  const [error, setError] = useState<Error>();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [unknown, setUnknown] = useState(() => !!user && hasPendingOrder(user.userId));
  useEffect(() => {
    const update = () => setUnknown(!!user && hasPendingOrder(user.userId));
    update();
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, [user]);

  const newAddress = !addressId;
  const addressReady = !newAddress || (recipient.trim() && PHONE.test(phone.trim()) && address.trim());
  const isCustomer = user?.role === 'customer';
  const canSubmit = isCustomer && !busy && !unknown && !blocked.length && !pricing.loading && !pricing.error && canSubmitQuote(quote, appliedCoupon) && !!addressReady;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || !user || !canSubmit) return;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    let sent = false;
    try {
      if (newAddress) {
        if (recipient.trim().length > 200) throw new ApiError(400, 'Tên người nhận tối đa 200 ký tự.');
        if (address.trim().length > 2000) throw new ApiError(400, 'Địa chỉ tối đa 2000 ký tự.');
      }
      const fresh = await commerce.pricing(items, appliedCoupon);
      if (!canSubmitQuote(fresh, appliedCoupon)) throw new ApiError(409, 'Giỏ hàng hoặc mã ưu đãi không còn hợp lệ. Vui lòng kiểm tra lại.');
      if (fresh.finalTotal !== quote?.finalTotal) {
        pricing.retry();
        throw new ApiError(409, 'Giá vừa thay đổi. Hãy xem lại tổng tiền mới rồi đặt lại.');
      }
      markPendingOrder(user.userId);
      sent = true;
      const order = await customer.createOrder(
        addressId ? { addressId } : { shippingDetails: { label: 'Địa chỉ đơn hàng', recipientName: recipient.trim(), phone: phone.trim(), addressLine: address.trim(), installationNote: note.trim(), isDefault: false } },
        items,
        appliedCoupon || undefined,
      );
      const id = order.orderId || order.id;
      if (!id) throw new ApiError(502, 'Chưa nhận được mã đơn. Hãy kiểm tra lịch sử đơn trước khi thử lại.');
      clearPendingOrder(user.userId);
      clear();
      navigate(`/account/orders/${id}`);
    } catch (reason) {
      setError(reason as Error);
      if (!sent) pricing.retry();
      else if (reason instanceof ApiError && reason.status >= 400 && reason.status < 500) clearPendingOrder(user.userId);
      else setUnknown(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const suggestions = (catalog.data ?? []).filter(p => p.isActive && !lines.some(l => l.variant.productId === p.id)).slice(0, 3);

  if (!lines.length) {
    return (
      <section className="ab-cart">
        <div className="ab-cart-wrap">
          <div className="ab-cart-empty">
            <span className="ab-cart-empty-icon"><ShoppingBag size={30} aria-hidden /></span>
            <h1>Giỏ hàng của bạn đang trống.</h1>
            <p>Chọn phiên bản Anchor Box phù hợp với ngôi nhà, rồi quay lại đây để đặt hàng.</p>
            <Link to="/products" className="ab-cart-btn is-primary">Xem sản phẩm</Link>
          </div>
          <Suggestions products={catalog.data?.filter(p => p.isActive).slice(0, 3) ?? []} />
        </div>
      </section>
    );
  }

  return (
    <section className="ab-cart">
      <form className="ab-cart-wrap" onSubmit={submit} noValidate>
        <header className="ab-cart-head">
          <h1>Giỏ hàng <span>({count} sản phẩm)</span></h1>
          <p>Tổng tạm tính <strong>{money(quote?.finalTotal ?? estimate)}</strong>. Đơn hàng được duyệt trước khi mở thanh toán VNPay.</p>
        </header>

        <div className="ab-cart-grid">
          <div className="ab-cart-main">
            <ul className="ab-cart-lines" aria-label="Sản phẩm trong giỏ">
              {states.map(({ line, live, problem, maxQuantity }) => {
                const variant = live ?? line.variant;
                const price = unitPrice(line);
                const unavailable = !!problem && (!live || !live.isActive || live.stockQuantity <= 0);
                return (
                  <li key={line.variant.id} className={`ab-cart-line ${problem ? 'has-problem' : ''}`}>
                    <Link to={`/products/${line.variant.productId}`} className="ab-cart-thumb" aria-label={`Xem ${line.productName}`}>
                      {isBox(variant.sku) ? <BoxThumb colorHex={variant.colorHex} capacity={variant.capacityLiter} /> : <img src={variant.images?.[0] || '/products/accessory-mount.svg'} alt="" />}
                    </Link>
                    <div className="ab-cart-info">
                      <Link to={`/products/${line.variant.productId}`} className="ab-cart-name">{line.productName}</Link>
                      <span className="ab-cart-meta">{[variant.capacityLiter ? `${variant.capacityLiter} L` : null, variant.colorName].filter(Boolean).join(' · ') || variant.variantName}</span>
                      <span className="ab-cart-meta">
                        <ShieldCheck size={13} aria-hidden />
                        {line.warrantyPlan ? `${line.warrantyPlan.name} (+${money(line.warrantyPlan.price)})` : `Bảo hành ${variant.warrantyMonths ?? 12} tháng`}
                      </span>
                      {problem && <span className="ab-cart-problem" role="alert"><AlertTriangle size={14} aria-hidden />{problem}</span>}
                    </div>
                    <div className="ab-cart-qty" aria-label="Số lượng">
                      <button type="button" onClick={() => quantity(line.variant.id, line.quantity - 1)} disabled={busy || unavailable || line.quantity <= 1} aria-label="Giảm số lượng"><Minus size={14} /></button>
                      <span aria-live="polite">{line.quantity}</span>
                      <button type="button" onClick={() => quantity(line.variant.id, line.quantity + 1)} disabled={busy || unavailable || line.quantity >= maxQuantity} aria-label="Tăng số lượng"><Plus size={14} /></button>
                    </div>
                    <div className="ab-cart-price">
                      <strong>{problem ? '—' : money(price * line.quantity)}</strong>
                      {line.quantity > 1 && !problem && <small>{money(price)} / sản phẩm</small>}
                      {problem && !unavailable && live && (
                        <button type="button" className="ab-cart-link" onClick={() => quantity(line.variant.id, live.stockQuantity)}>Giảm còn {live.stockQuantity}</button>
                      )}
                    </div>
                    <button type="button" className="ab-cart-remove" onClick={() => quantity(line.variant.id, 0)} disabled={busy} aria-label={`Xóa ${line.productName} khỏi giỏ`}>
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>

            {isCustomer && (
              <section className="ab-cart-card" aria-labelledby="cart-address-title">
                <h2 id="cart-address-title">Giao và lắp đặt tại</h2>
                <ResourceState {...addresses} />
                {!!addresses.data?.length && (
                  <div className="ab-cart-addresses" role="radiogroup" aria-label="Địa chỉ nhận hàng">
                    {addresses.data.map(item => (
                      <label key={item.id} className={`ab-cart-address ${addressId === item.id ? 'is-selected' : ''}`}>
                        <input type="radio" name="cart-address" checked={addressId === item.id} onChange={() => setAddressId(item.id)} disabled={busy} />
                        <span>
                          <strong>{item.label || 'Địa chỉ'}{item.isDefault && <em>Mặc định</em>}</strong>
                          <span>{item.recipientName} · {item.phone}</span>
                          <span>{item.addressLine}</span>
                        </span>
                      </label>
                    ))}
                    <label className={`ab-cart-address ${newAddress ? 'is-selected' : ''}`}>
                      <input type="radio" name="cart-address" checked={newAddress} onChange={() => setAddressId('')} disabled={busy} />
                      <span><strong>Địa chỉ khác</strong><span>Nhập người nhận và vị trí lắp đặt cho đơn này</span></span>
                    </label>
                  </div>
                )}
                {newAddress && !addresses.loading && (
                  <div className="ab-cart-fields">
                    <label><span>Người nhận</span><input value={recipient} onChange={e => setRecipient(e.target.value)} maxLength={200} autoComplete="name" placeholder="Nguyễn Văn A" disabled={busy} /></label>
                    <label><span>Số điện thoại</span><input value={phone} onChange={e => setPhone(e.target.value)} type="tel" pattern={phonePattern} maxLength={30} autoComplete="tel" placeholder="0912 345 678" disabled={busy} aria-invalid={!!phone.trim() && !PHONE.test(phone.trim())} /></label>
                    <label className="is-full"><span>Địa chỉ lắp đặt</span><textarea value={address} onChange={e => setAddress(e.target.value)} maxLength={2000} rows={2} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" disabled={busy} /></label>
                    <label className="is-full"><span>Ghi chú cho kỹ thuật viên (không bắt buộc)</span><textarea value={note} onChange={e => setNote(e.target.value)} maxLength={2000} rows={2} placeholder="Vị trí đặt hộp, giờ hẹn thuận tiện…" disabled={busy} /></label>
                  </div>
                )}
              </section>
            )}
          </div>

          <aside className="ab-cart-summary" aria-label="Tóm tắt đơn hàng">
            <h2>Tóm tắt</h2>
            <div className="ab-cart-coupon">
              <Tag size={15} aria-hidden />
              {appliedCoupon ? (
                <>
                  <span className={couponRejected ? 'is-rejected' : 'is-applied'}>{appliedCoupon}</span>
                  <button type="button" onClick={() => { setAppliedCoupon(''); setCoupon(''); }} disabled={busy} aria-label="Bỏ mã ưu đãi"><X size={14} /></button>
                </>
              ) : (
                <>
                  <input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (coupon.trim()) setAppliedCoupon(coupon.trim()); } }} placeholder="Mã ưu đãi" maxLength={100} disabled={busy || !items.length} aria-label="Mã ưu đãi" />
                  <button type="button" onClick={() => setAppliedCoupon(coupon.trim())} disabled={busy || !coupon.trim() || !items.length}>Áp dụng</button>
                </>
              )}
            </div>
            {quote?.voucherMessage && <p className={`ab-cart-note ${couponRejected ? 'is-error' : 'is-success'}`}>{quote.voucherMessage}</p>}

            <dl className="ab-cart-totals">
              <div><dt>Tạm tính</dt><dd>{money(quote?.subtotal ?? estimate)}</dd></div>
              {!!quote?.discountAmount && <div><dt>Ưu đãi</dt><dd className="is-discount">−{money(quote.discountAmount)}</dd></div>}
              <div><dt>Giao và lắp đặt</dt><dd>{!quote ? '—' : quote.shippingFee > 0 ? money(quote.shippingFee) : 'Miễn phí'}</dd></div>
              <div className="is-total"><dt>Tổng cộng</dt><dd>{money(quote?.finalTotal ?? estimate)}</dd></div>
            </dl>
            {pricing.loading && <p className="ab-cart-note">Đang tính giá…</p>}
            {pricing.error && <ErrorNotice error={pricing.error} retry={pricing.retry} />}
            {!!blocked.length && <p className="ab-cart-note is-error">Hãy xử lý {blocked.length} sản phẩm được đánh dấu trước khi đặt hàng.</p>}
            <ErrorNotice error={error} focus />

            {unknown && user && (
              <div className="ab-cart-note is-error">
                Chưa xác định được đơn vừa gửi đã tạo hay chưa. <Link to="/account/orders">Kiểm tra đơn hàng</Link> trước khi đặt lại.{' '}
                <button type="button" className="ab-cart-link" disabled={busy} onClick={() => {
                  if (window.confirm('Bạn đã kiểm tra lịch sử và chắc chắn đơn này chưa được tạo?')) {
                    clearPendingOrder(user.userId);
                    setUnknown(false);
                    setError(undefined);
                    pricing.retry();
                  }
                }}>Cho phép đặt lại</button>
              </div>
            )}

            {!user ? (
              <Link to="/login?returnTo=/cart" className="ab-cart-btn is-primary">Đăng nhập để đặt hàng <ArrowRight size={17} aria-hidden /></Link>
            ) : !isCustomer ? (
              <p className="ab-cart-note is-error">Tài khoản nhân viên không thể đặt hàng. Hãy dùng tài khoản khách hàng.</p>
            ) : (
              <button type="submit" className="ab-cart-btn is-primary" disabled={!canSubmit}>
                {busy ? 'Đang gửi đơn…' : 'Đặt hàng'} {!busy && <ArrowRight size={17} aria-hidden />}
              </button>
            )}
            {isCustomer && newAddress && !addressReady && <p className="ab-cart-note">Điền người nhận, số điện thoại và địa chỉ để đặt hàng.</p>}

            <ul className="ab-cart-perks">
              <li><Info size={15} aria-hidden />Đơn được duyệt trước, sau đó bạn thanh toán qua VNPay.</li>
              <li><Truck size={15} aria-hidden />Kỹ thuật viên giao, lắp đặt và chạy thử tại nhà.</li>
              <li><ShieldCheck size={15} aria-hidden />Bảo hành điện tử tính từ ngày nghiệm thu.</li>
            </ul>
          </aside>
        </div>

        <Suggestions products={suggestions} />
      </form>
    </section>
  );
}

function Suggestions({ products }: { products: CatalogProduct[] }) {
  if (!products.length) return null;
  return (
    <section className="ab-cart-more" aria-labelledby="cart-more-title">
      <h2 id="cart-more-title">Có thể bạn cũng cần</h2>
      <div className="ab-cart-more-grid">
        {products.map(product => {
          const variants = (product.variants ?? []).filter(v => v.isActive);
          const from = Math.min(...variants.map(v => v.finalPrice ?? product.price), product.price);
          const first = variants[0];
          const inStock = variants.some(v => v.stockQuantity > 0);
          return (
            <Link key={product.id} to={`/products/${product.sku?.toLowerCase() || product.id}`} className="ab-cart-more-card">
              <span className="ab-cart-more-thumb">
                {isBox(product.sku) ? <BoxThumb colorHex={first?.colorHex} capacity={first?.capacityLiter} /> : <img src={product.images?.[0] || '/products/accessory-mount.svg'} alt="" />}
              </span>
              <strong>{product.name}</strong>
              <span>{inStock ? `Từ ${money(from)}` : 'Sắp mở bán'}</span>
              <em>Xem cấu hình <ChevronRight size={14} aria-hidden /></em>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
