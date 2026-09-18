import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ArrowRight } from 'lucide-react';
import { Product } from '../../types/product';
import { useCart } from '../../context/CartContext';
import { Badge } from '../ui/Badge';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="product-card">
      <Link to={`/products/${product.id}`} className="product-card-img-wrap">
        <img
          src={product.images[0] || '/products/smartbox-std-front.svg'}
          alt={product.name}
          className="product-card-img"
        />
      </Link>

      <div className="product-card-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span className="product-card-sku">{product.sku}</span>
          {product.inStock ? (
            <Badge variant="emerald">Còn hàng ({product.stockQuantity})</Badge>
          ) : (
            <Badge variant="rose">Tạm hết</Badge>
          )}
        </div>

        <Link to={`/products/${product.id}`}>
          <h3 className="product-card-title">{product.name}</h3>
        </Link>

        <p className="product-card-desc">{product.subtitle}</p>

        {/* Feature tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
          {product.tags.slice(0, 4).map((tag, idx) => {
            const isCam = tag.toLowerCase().includes('cam');
            const isNoCam = tag.toLowerCase().includes('không camera');
            return (
              <span
                key={idx}
                className={`badge ${isCam ? 'badge-blue' : isNoCam ? 'badge-gray' : 'badge-gray'}`}
                style={{
                  fontSize: '11px',
                  fontWeight: isCam ? 700 : 500,
                  borderColor: isCam ? 'var(--primary)' : undefined
                }}
              >
                {tag}
              </span>
            );
          })}
        </div>

        <div className="product-card-footer">
          <div>
            <span className="product-price">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className="product-price-original">{formatPrice(product.originalPrice)}</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => addToCart(product, 1)}
              className="btn btn-secondary btn-sm"
              title="Thêm vào giỏ"
              disabled={!product.inStock}
            >
              <ShoppingCart size={15} />
            </button>
            <Link to={`/products/${product.id}`} className="btn btn-primary btn-sm">
              Chi tiết <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
