import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderApi } from '../api/orderApi';
import { CustomerAddress, customerApi } from '../api/customerApi';
import { usePaymentMode } from '../context/PaymentModeContext';
import {redirectToPayment} from '../api/paymentApi';
import { OrderSummary } from '../components/cart/OrderSummary';
import { ArrowLeft } from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { items, itemCount, subtotal, clearCart } = useCart();
  const { user, isLoading } = useAuth();
  const { mode, error: paymentModeError } = usePaymentMode();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const email = user?.email || '';
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressId, setAddressId] = useState('');
  const [addressError, setAddressError] = useState('');
  const choose = (id: string, rows = addresses) => { setAddressId(id); const a = rows.find(x => x.id === id); if (a) { setFullName(a.recipientName); setPhone(a.phone); setAddress(a.addressLine); setNote(a.installationNote || ''); } };
  useEffect(() => { if (user) { setFullName(user.fullName || ''); setPhone(user.phone || ''); } if (user) void customerApi.addresses().then(rows => { setAddresses(rows); const a = rows.find(x => x.isDefault); if (a) choose(a.id, rows); }).catch(e => setAddressError(e.message)); }, [user?.id]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <p>Đang kiểm tra phiên đăng nhập…</p>;
  if (!user) return <Navigate to="/login" state={{ from: { pathname: '/checkout' } }} replace />;
  if (items.length === 0) return <Navigate to="/cart" replace />;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Vui lòng nhập họ và tên người nhận';
    if (!phone.trim()) {
      errs.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^\+?[0-9 ()-]{8,30}$/.test(phone)) {
      errs.phone = 'Số điện thoại không hợp lệ';
    }
    if (!address.trim()) errs.address = 'Vui lòng nhập địa chỉ nhận hàng chi tiết';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mode || submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      const order = await orderApi.createOrder({
        items,
        shippingAddress: {
          fullName,
          phone,
          email,
          address,
          note
        },
        addressId: addressId || undefined,
        paymentMethod: mode.provider==='vnpay'?'VNPAY':'BANK_TRANSFER',
        note
      });

      try { const checkout=await orderApi.checkout(order.id); clearCart(); if(!redirectToPayment(checkout))navigate(`/account/orders/${order.id}`); }
      catch (error) { navigate(`/account/orders/${order.id}`, { state: { error: error instanceof Error ? error.message : 'Đơn đã tạo, chưa xác nhận được checkout. Hãy kiểm tra trạng thái trước khi thử lại.' } }); }
    } catch (err: any) {
      alert(err.message || 'Có lỗi xảy ra khi tạo đơn hàng');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="section" style={{ paddingTop: '28px' }}>
      <div className="container">
        {/* Back link */}
        <div style={{ marginBottom: '20px' }}>
          <Link
            to="/cart"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13.5px',
              color: 'var(--text-muted)',
              fontWeight: 500
            }}
          >
            <ArrowLeft size={15} /> Quay lại giỏ hàng
          </Link>
        </div>

        <h1 className="section-title" style={{ marginBottom: '28px' }}>
          Thông tin đặt hàng &amp; Giao nhận
        </h1>

        {addressError && <p role="alert" className="form-error">{addressError}</p>}
        {paymentModeError && <p role="alert" className="form-error">{paymentModeError}</p>}
        <p><Link to="/account/addresses">Quản lý sổ địa chỉ</Link></p>
        <label>Địa chỉ giao và lắp đặt<select className="form-input" value={addressId} disabled={submitting} onChange={e => choose(e.target.value)}><option value="">Nhập địa chỉ khác cho đơn này</option>{addresses.map(a => <option key={a.id} value={a.id}>{a.label} · {a.addressLine}</option>)}</select></label>
        <form onSubmit={handleSubmitOrder}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 0.8fr',
              gap: '32px',
              alignItems: 'start'
            }}
            className="checkout-grid"
          >
            {/* Left: Customer Info & Payment Method */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Shipping Details */}
              <div
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px'
                }}
              >
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '18px' }}>
                  1. Địa chỉ giao nhận thiết bị
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="form-two-col">
                  <div className="form-group">
                    <label className="form-label">Họ và tên người nhận *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={fullName}
                      disabled={!!addressId || submitting} onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyễn Văn An"
                    />
                    {errors.fullName && <div className="form-error">{errors.fullName}</div>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Số điện thoại liên hệ *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={phone}
                      disabled={!!addressId || submitting} onChange={(e) => setPhone(e.target.value)}
                      placeholder="0912 345 678"
                    />
                    {errors.phone && <div className="form-error">{errors.phone}</div>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Địa chỉ Email (nhận thông tin đơn hàng &amp; bảo hành)</label>
                  <input
                    type="email"
                    className="form-input"
                    value={email}
                    disabled
                    placeholder="email@example.com"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Địa chỉ nhận hàng chi tiết *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={address}
                    disabled={!!addressId || submitting} onChange={(e) => setAddress(e.target.value)}
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành"
                  />
                  {errors.address && <div className="form-error">{errors.address}</div>}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ghi chú giao hàng (tùy chọn)</label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    value={note}
                    disabled={!!addressId || submitting} onChange={(e) => setNote(e.target.value)}
                    placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
                  />
                </div>
              </div>

              <p>Đơn sẽ chuyển sang chờ thanh toán. Tiến độ giao và lắp đặt hiển thị sau khi thanh toán được xác nhận và đơn được phê duyệt.</p>
            </div>

            {/* Right: Order Review & Submit */}
            <div>
              <OrderSummary
                subtotal={subtotal}
                itemCount={itemCount}
                shippingFee={0}
                actionButton={
                  <button
                    type="submit"
                    disabled={submitting || !mode}
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%' }}
                  >
                    {submitting ? 'Đang xử lý đơn...' : mode?.provider==='vnpay'?'Thanh toán VNPAY Sandbox':'Đặt hàng ngay'}
                  </button>
                }
              />
            </div>
          </div>
        </form>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .checkout-grid {
            grid-template-columns: 1fr !important;
          }
          .form-two-col {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
