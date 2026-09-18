import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { CartItemRow } from '../components/cart/CartItemRow';
import { OrderSummary } from '../components/cart/OrderSummary';
import { EmptyState } from '../components/ui/EmptyState';
import { ShoppingBag, ArrowRight, ArrowLeft, Trash2 } from 'lucide-react';

export const CartPage: React.FC = () => {
  const { items, itemCount, subtotal, clearCart } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="section">
        <div className="container">
          <EmptyState
            title="Giỏ hàng của bạn đang trống"
            description="Bạn chưa thêm sản phẩm hoặc phụ kiện Anchor Box nào vào giỏ hàng."
            actionText="Khám phá danh mục sản phẩm"
            actionLink="/products"
            icon={<ShoppingBag size={30} />}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 className="section-title">Giỏ hàng của bạn</h1>
            <p className="section-subtitle">
              Hiện có {itemCount} sản phẩm trong giỏ hàng.
            </p>
          </div>

          <button
            onClick={clearCart}
            className="btn btn-secondary btn-sm"
            style={{ color: 'var(--danger-text)' }}
          >
            <Trash2 size={14} /> Xóa toàn bộ giỏ
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 0.8fr',
            gap: '32px',
            alignItems: 'start'
          }}
          className="cart-layout-grid"
        >
          {/* Left: Cart items list */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {items.map((item) => (
                <CartItemRow key={item.productId} item={item} />
              ))}
            </div>

            <div style={{ marginTop: '20px' }}>
              <Link
                to="/products"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13.5px',
                  color: 'var(--primary)',
                  fontWeight: 600
                }}
              >
                <ArrowLeft size={14} /> Tiếp tục chọn thêm sản phẩm
              </Link>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div>
            <OrderSummary
              subtotal={subtotal}
              itemCount={itemCount}
              shippingFee={0}
              actionButton={
                <button
                  onClick={() => navigate('/checkout')}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                >
                  Tiến hành đặt hàng <ArrowRight size={16} />
                </button>
              }
            />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .cart-layout-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
