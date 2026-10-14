import React, { useEffect, useState } from 'react';
import { productApi } from '../api/productApi';
import { Product } from '../types/product';
import { ProductCard } from '../components/product/ProductCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Search, Sparkles } from 'lucide-react';
import { PageHeroHeader } from '../components/layout/PageHeroHeader';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('default');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true); setError('');
      try {
        const data = await productApi.getProducts({
          category: selectedCategory,
          search: searchTerm
        });

        // Sorting
        let sorted = [...data];
        if (sortBy === 'price-asc') {
          sorted.sort((a, b) => a.price - b.price);
        } else if (sortBy === 'price-desc') {
          sorted.sort((a, b) => b.price - a.price);
        } else if (sortBy === 'name') {
          sorted.sort((a, b) => a.name.localeCompare(b.name));
        }

        setProducts(sorted);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không tải được danh mục sản phẩm.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [selectedCategory, searchTerm, sortBy]);

  return (
    <>
      {error && <p role="alert" className="container form-error">{error}</p>}
      <PageHeroHeader
        badge="Thế hệ Anchor Box 2026 chính hãng"
        badgeIcon={<Sparkles size={13} />}
        title="Danh mục Thiết bị &amp; Phụ kiện"
        subtitle="Khám phá các phiên bản Hộp nhận hàng thông minh Anchor Box tích hợp Camera AI, cân điện tử và cơ chế khóa tự động bảo vệ bưu phẩm an toàn 24/7."
        breadcrumbs={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Sản phẩm' }
        ]}
        highlights={[
          '4 Phiên bản phù hợp mọi nhu cầu',
          'Camera AI góc rộng Full HD',
          'Cân điện tử đối soát khối lượng',
          'Miễn phí lắp đặt toàn quốc'
        ]}
      />
      <div className="section" style={{ paddingTop: '32px' }}>
        <div className="container">
          {/* Filter & Search Bar */}
          <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            marginBottom: '32px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`btn btn-sm ${selectedCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setSelectedCategory('box')}
              className={`btn btn-sm ${selectedCategory === 'box' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Hộp thông minh (Anchor Box)
            </button>
            <button
              onClick={() => setSelectedCategory('accessory')}
              className={`btn btn-sm ${selectedCategory === 'accessory' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Phụ kiện chính hãng
            </button>
          </div>

          {/* Search & Sort */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: '1', justifyContent: 'flex-end', minWidth: '280px' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1', maxWidth: '300px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
              <input
                type="text"
                placeholder="Tìm theo tên hoặc SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '36px', height: '38px' }}
              />
            </div>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-select"
              style={{ width: 'auto', height: '38px', minWidth: '150px' }}
            >
              <option value="default">Sắp xếp: Mặc định</option>
              <option value="price-asc">Giá: Thấp đến cao</option>
              <option value="price-desc">Giá: Cao đến thấp</option>
              <option value="name">Tên sản phẩm</option>
            </select>
          </div>
        </div>

        {/* Products List */}
        {loading ? (
          <LoadingSpinner message="Đang tải danh sách sản phẩm..." />
        ) : products.length === 0 ? (
          <EmptyState
            title="Không tìm thấy sản phẩm"
            description="Không có thiết bị hoặc phụ kiện nào phù hợp với từ khóa tìm kiếm."
            actionText="Xem tất cả sản phẩm"
            onActionClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
            }}
          />
        ) : (
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  </>
);
};
