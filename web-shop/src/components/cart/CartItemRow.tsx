import React from 'react';
import { Trash2, Plus, Minus } from 'lucide-react';
import { OrderItem } from '../../types/order';
import { useCart } from '../../context/CartContext';
import { Link } from 'react-router-dom';

interface CartItemRowProps {
  item: OrderItem;
}

export const CartItemRow: React.FC<CartItemRowProps> = ({ item }) => {
  const { updateQuantity, removeFromCart } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const lineTotal = item.price * item.quantity;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '80px 1fr auto auto auto',
        gap: '16px',
        alignItems: 'center',
        padding: '16px 0',
        borderBottom: '1px solid var(--border-color)'
      }}
      className="cart-row-grid"
    >
      {/* Product Image */}
      <Link
        to={`/products/${item.productId}`}
        style={{
          width: '80px',
          height: '80px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-surface-secondary)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px'
        }}
      >
        <img
          src={item.image || '/products/smartbox-std-front.svg'}
          alt={item.name}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </Link>

      {/* Title & SKU */}
      <div>
        <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          {item.sku}
        </div>
        <Link
          to={`/products/${item.productId}`}
          style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}
        >
          {item.name}
        </Link>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Đơn giá: {formatPrice(item.price)}
        </div>
      </div>

      {/* Quantity Stepper */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-surface)',
          overflow: 'hidden'
        }}
      >
        <button
          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
          style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}
          title="Giảm số lượng"
        >
          <Minus size={13} />
        </button>
        <span
          style={{
            minWidth: '32px',
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--text-main)'
          }}
        >
          {item.quantity}
        </span>
        <button
          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
          style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}
          title="Tăng số lượng"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Line Total */}
      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)', minWidth: '100px', textAlign: 'right' }}>
        {formatPrice(lineTotal)}
      </div>

      {/* Remove Button */}
      <button
        onClick={() => removeFromCart(item.productId)}
        style={{
          color: 'var(--text-muted)',
          padding: '6px',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Xóa khỏi giỏ hàng"
      >
        <Trash2 size={16} />
      </button>

      <style>{`
        @media (max-width: 640px) {
          .cart-row-grid {
            grid-template-columns: 70px 1fr !important;
            gap: 12px !important;
          }
        }
      `}</style>
    </div>
  );
};
