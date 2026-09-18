import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderApi } from '../api/orderApi';
import { OrderSummary } from '../components/cart/OrderSummary';
import { ArrowLeft, Banknote } from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { items, itemCount, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.fullName || 'Nguyễn Văn An');
  const [phone, setPhone] = useState(user?.phone || '0912345678');
  const [email, setEmail] = useState(user?.email || 'an.nguyen@example.com');
  const [address, setAddress] = useState(user?.address || 'Số 12 Chùa Bộc, Quang Trung, Đống Đa, Hà Nội');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER'>('COD');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Vui lòng nhập họ và tên người nhận';
    if (!phone.trim()) {
      errs.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9]{10,11}$/.test(phone.replace(/\s+/g, ''))) {
      errs.phone = 'Số điện thoại không hợp lệ (10-11 số)';
    }
    if (!address.trim()) errs.address = 'Vui lòng nhập địa chỉ nhận hàng chi tiết';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
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
        paymentMethod,
        note
      });

      clearCart();
      navigate(`/order-success/${order.id}`, { state: { order } });
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
                      onChange={(e) => setFullName(e.target.value)}
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
                      onChange={(e) => setPhone(e.target.value)}
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
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Địa chỉ nhận hàng chi tiết *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
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
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px'
                }}
              >
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '18px' }}>
                  2. Phương thức thanh toán
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Option: COD */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      border: paymentMethod === 'COD' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: paymentMethod === 'COD' ? 'var(--primary-light)' : 'var(--bg-surface)',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                    />
                    <Banknote size={20} style={{ color: 'var(--primary)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px' }}>
                        Thanh toán khi nhận hàng (COD)
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        Kiểm tra thiết bị đầy đủ và thanh toán trực tiếp cho nhân viên giao hàng.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
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
                    disabled={submitting}
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%' }}
                  >
                    {submitting ? 'Đang xử lý đơn...' : 'Đặt hàng ngay'}
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
