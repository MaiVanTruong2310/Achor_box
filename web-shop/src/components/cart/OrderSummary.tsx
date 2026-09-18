import React from 'react';
import { ShieldCheck, Truck } from 'lucide-react';

interface OrderSummaryProps {
  subtotal: number;
  shippingFee?: number;
  itemCount: number;
  actionButton?: React.ReactNode;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  subtotal,
  shippingFee = 0,
  itemCount,
  actionButton
}) => {
  const total = subtotal + shippingFee;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px'
      }}
    >
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '18px' }}>
        Tóm tắt đơn hàng
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
          <span>Số lượng sản phẩm ({itemCount}):</span>
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{formatPrice(subtotal)}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Truck size={15} /> Phí vận chuyển:
          </span>
          <span style={{ fontWeight: 600, color: 'var(--success-text)' }}>
            {shippingFee === 0 ? 'Miễn phí' : formatPrice(shippingFee)}
          </span>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--border-color)',
            paddingTop: '14px',
            marginTop: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline'
          }}
        >
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>Tổng thanh toán:</span>
          <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>
            {formatPrice(total)}
          </span>
        </div>
      </div>

      {actionButton && <div style={{ marginBottom: '18px' }}>{actionButton}</div>}

      {/* Assurance badges */}
      <div
        style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontSize: '12.5px',
          color: 'var(--text-muted)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={15} style={{ color: 'var(--primary)' }} />
          <span>Bảo hành chính hãng 12-18 tháng</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Truck size={15} style={{ color: 'var(--primary)' }} />
          <span>Kiểm tra hàng trước khi thanh toán (COD)</span>
        </div>
      </div>
    </div>
  );
};
