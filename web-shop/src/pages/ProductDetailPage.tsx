import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productApi } from '../api/productApi';
import { Product } from '../types/product';
import { useCart } from '../context/CartContext';
import { ProductGallery } from '../components/product/ProductGallery';
import { TechnicalSpecsTable } from '../components/product/TechnicalSpecsTable';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { ShoppingCart, Check, ShieldCheck, Truck, Plus, Minus, ArrowLeft } from 'lucide-react';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'specs' | 'features' | 'includes'>('specs');
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await productApi.getProductById(id);
        setProduct(data);
      } catch (err) {
        console.error('Failed to load product detail', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Đang tải thông tin sản phẩm..." minHeight="400px" />;
  }

  if (!product) {
    return (
      <div className="section">
        <div className="container">
          <EmptyState
            title="Không tìm thấy sản phẩm"
            description="Sản phẩm bạn đang tìm không tồn tại hoặc đã ngừng kinh doanh."
            actionText="Quay lại danh mục sản phẩm"
            actionLink="/products"
          />
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleAddToCart = () => {
    addToCart(product, quantity);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    navigate('/cart');
  };

  return (
    <div className="section" style={{ paddingTop: '28px' }}>
      <div className="container">
        {/* Breadcrumb / Back button */}
        <div style={{ marginBottom: '20px' }}>
          <Link
            to="/products"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13.5px',
              color: 'var(--text-muted)',
              fontWeight: 500
            }}
          >
            <ArrowLeft size={15} /> Quay lại danh mục sản phẩm
          </Link>
        </div>

        {/* Top Product Overview Section */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.1fr',
            gap: '40px',
            marginBottom: '48px'
          }}
          className="product-detail-grid"
        >
          {/* Left: Product Image Gallery */}
          <div>
            <ProductGallery images={product.images} productName={product.name} />
          </div>

          {/* Right: Technical specs summary, pricing & buy action */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                SKU: {product.sku}
              </span>
              {product.inStock ? (
                <Badge variant="emerald">Còn hàng sẵn ({product.stockQuantity})</Badge>
              ) : (
                <Badge variant="rose">Tạm hết hàng</Badge>
              )}
              {product.warrantyMonths > 0 && <Badge variant="blue">Bảo hành {product.warrantyMonths} tháng</Badge>}
            </div>

            <h1
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: 'var(--text-main)',
                lineHeight: 1.3,
                marginBottom: '12px'
              }}
            >
              {product.name}
            </h1>

            <p style={{ fontSize: '14.5px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
              {product.subtitle}
            </p>

            {/* Price Box */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'baseline',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '26px', fontWeight: 800, color: 'var(--primary)' }}>
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
                <span style={{ fontSize: '15px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                  {formatPrice(product.originalPrice)}
                </span>
              )}
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                (Đã bao gồm VAT)
              </span>
            </div>

            {/* Dimensions and Load Capacity highlight */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '24px'
              }}
            >
              <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Kích thước</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                  {product.dimensions.width > 0 && product.dimensions.depth > 0 && product.dimensions.height > 0 ? `${product.dimensions.width} x ${product.dimensions.depth} x ${product.dimensions.height} cm` : 'Chưa đủ thông tin'}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tải trọng tối đa</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                  {product.dimensions.maxLoadWeight > 0 ? `${product.dimensions.maxLoadWeight} kg` : 'N/A'}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Trọng lượng hộp</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                  {product.dimensions.weight > 0 ? `${product.dimensions.weight} kg` : 'Chưa có thông tin'}
                </div>
              </div>
            </div>

            {/* Quantity Stepper & Buttons */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  border: '1px solid var(--border-dark)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface)'
                }}
              >
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}
                >
                  <Minus size={14} />
                </button>
                <span style={{ minWidth: '36px', textAlign: 'center', fontWeight: 700, fontSize: '14px' }}>
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(product.stockQuantity, q + 1))}
                  style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}
                >
                  <Plus size={14} />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className="btn btn-secondary btn-lg"
                style={{ flex: 1 }}
              >
                <ShoppingCart size={17} /> Thêm vào giỏ
              </button>

              <button
                onClick={handleBuyNow}
                disabled={!product.inStock}
                className="btn btn-primary btn-lg"
                style={{ flex: 1 }}
              >
                Mua ngay
              </button>
            </div>

            {/* Trust Assurances */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={16} style={{ color: 'var(--success)' }} />
                <span>Sản phẩm kiểm tra chất lượng kỹ lưỡng trước khi đóng gói</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={16} style={{ color: 'var(--primary)' }} />
                <span>Giao hàng toàn quốc — Thanh toán khi nhận hàng (COD)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} style={{ color: 'var(--primary)' }} />
                <span>Bảo hành chính hãng điện tử — Hỗ trợ kỹ thuật chu đáo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Tabs: Specs, Detailed Description & Box Includes */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '28px' }}>
          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '24px' }}>
            <button
              onClick={() => setActiveTab('specs')}
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: activeTab === 'specs' ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'specs' ? '2px solid var(--primary)' : 'none',
                paddingBottom: '8px'
              }}
            >
              Thông số kỹ thuật
            </button>
            <button
              onClick={() => setActiveTab('features')}
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: activeTab === 'features' ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'features' ? '2px solid var(--primary)' : 'none',
                paddingBottom: '8px'
              }}
            >
              Tính năng &amp; Cơ chế vận hành
            </button>
            <button
              onClick={() => setActiveTab('includes')}
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: activeTab === 'includes' ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'includes' ? '2px solid var(--primary)' : 'none',
                paddingBottom: '8px'
              }}
            >
              Bộ sản phẩm gồm những gì
            </button>
          </div>

          {/* Tab 1: Specs */}
          {activeTab === 'specs' && (
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Bảng thông số chi tiết của <strong>{product.name}</strong>:
              </p>
              <TechnicalSpecsTable specs={product.specs} />
            </div>
          )}

          {/* Tab 2: Features */}
          {activeTab === 'features' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ fontSize: '14.5px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {product.description}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginTop: '12px' }}>
                {product.features.map((feat, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: 'var(--bg-surface-secondary)',
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', fontSize: '14.5px' }}>
                      {feat.title}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {feat.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Includes */}
          {activeTab === 'includes' && (
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Quy cách đóng gói hoàn chỉnh khi giao hàng tới khách hàng:
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {product.boxIncludes.map((item, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-main)' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={13} />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .product-detail-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
      `}</style>
    </div>
  );
};
