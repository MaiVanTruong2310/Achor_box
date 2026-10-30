import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X, Package, ChevronRight, Loader2, ArrowUpRight } from 'lucide-react';
import { useCatalog } from '../CatalogContext';
import { money, type CatalogProduct } from '../api/shop';

interface StoreSearchProps {
  categories?: { id: string; name: string }[];
  initialCategory?: string;
  initialQuery?: string;
  topOffset?: number;
  onClose?: () => void;
}

// Helper to normalize Vietnamese accents for flexible search matching
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return <span>{text}</span>;
  const normalizedQuery = normalizeText(query);
  const normalizedText = normalizeText(text);
  const index = normalizedText.indexOf(normalizedQuery);
  if (index === -1) return <span>{text}</span>;

  const start = text.slice(0, index);
  const matched = text.slice(index, index + query.length);
  const end = text.slice(index + query.length);
  return (
    <span>
      {start}
      <mark className="search-highlight">{matched}</mark>
      {end}
    </span>
  );
}

function getProductMinPrice(product: CatalogProduct): number | null {
  const values = product.variants
    ?.filter(v => v.isActive && v.finalPrice != null && Number.isFinite(v.finalPrice))
    .map(v => v.finalPrice!) || [];
  if (values.length) return Math.min(...values);
  if (product.price != null && Number.isFinite(product.price)) return product.price;
  return null;
}

export function StoreSearch({ categories: _categories = [], initialCategory = '', initialQuery = '', topOffset, onClose }: StoreSearchProps) {
  const navigate = useNavigate();
  const catalog = useCatalog();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with initial props & auto-focus input on mount
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      onClose?.();
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Suggested keywords generated directly from actual store products & accessories
  const suggestedKeywords = useMemo(() => {
    const products = catalog.data || [];
    const suggestions: { label: string; query: string; category?: string; badge?: string }[] = [];

    // 1. Live products in catalog
    products.forEach(p => {
      if (p.name && !suggestions.some(s => s.query.toLowerCase() === p.name.toLowerCase())) {
        suggestions.push({
          label: p.name,
          query: p.name,
          badge: p.categoryName || 'Tủ thông minh',
        });
      }
    });

    // 2. Core AnchorBox product lines and genuine store accessories
    const storeProducts = [
      { label: 'AnchorBox Pro', query: 'AnchorBox Pro', badge: 'Camera AI & Cảm biến tải trọng' },
      { label: 'AnchorBox Base', query: 'AnchorBox Base', badge: 'Dung tích 45L / 75L' },
      { label: 'AnchorBox Solar Max', query: 'AnchorBox Solar', badge: 'Tấm pin mặt trời tự sạc' },
      { label: 'Chân đế ngoài trời AnchorMount', query: 'Chân đế ngoài trời', badge: 'Thép chống ẩm 15cm' },
      { label: 'Camera an ninh mini AI 2K', query: 'Camera an ninh', badge: 'Gắn nóc khoang tủ 2K' },
      { label: 'Bàn phím mã số cảm ứng & Thẻ từ NFC', query: 'Bàn phím mã số', badge: 'Phụ kiện mở khóa Pro' },
      { label: 'Đèn UV-C khử trùng bưu kiện', query: 'UV-C', badge: 'Khử trùng tự động' },
    ];

    storeProducts.forEach(item => {
      if (!suggestions.some(s => s.query.toLowerCase() === item.query.toLowerCase()) && suggestions.length < 8) {
        suggestions.push(item);
      }
    });

    return suggestions.slice(0, 7);
  }, [catalog.data]);

  // Filter products in real time based on query and category
  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const normQuery = normalizeText(trimmed);
    const products = catalog.data || [];

    return products.filter(product => {
      // Category filter
      if (category && product.categoryId !== category && product.categorySlug !== category) {
        return false;
      }

      // Match name
      if (normalizeText(product.name || '').includes(normQuery)) return true;

      // Match SKU
      if (normalizeText(product.sku || '').includes(normQuery)) return true;

      // Match category name
      if (normalizeText(product.categoryName || '').includes(normQuery)) return true;

      // Match description
      if (normalizeText(product.description || '').includes(normQuery)) return true;

      // Match variants SKU or name
      if (product.variants?.some(v => 
        normalizeText(v.sku || '').includes(normQuery) || 
        normalizeText(v.variantName || '').includes(normQuery)
      )) {
        return true;
      }

      return false;
    });
  }, [query, category, catalog.data]);

  // Debounced search indicator
  useEffect(() => {
    if (query.trim()) {
      setIsSearching(true);
      const timer = setTimeout(() => setIsSearching(false), 120);
      return () => clearTimeout(timer);
    } else {
      setIsSearching(false);
    }
  }, [query]);

  function executeSearch(targetQuery: string, targetCategory: string) {
    onClose?.();
    const params = new URLSearchParams();
    if (targetQuery.trim()) params.set('q', targetQuery.trim());
    if (targetCategory) params.set('category', targetCategory);
    navigate(`/products${params.size ? `?${params}` : ''}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeIndex >= 0 && activeIndex < results.length) {
      const selected = results[activeIndex];
      onClose?.();
      navigate(`/products/${selected.id}`);
      return;
    }
    executeSearch(query, category);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      onClose?.();
      return;
    }

    if (results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    }
  }

  function clearQuery() {
    setQuery('');
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  return (
    <>
      {/* 1. Search Drawer Panel Placed Directly Below Header (zero layout shift) */}
      <div
        className="apple-search-subbar-drawer"
        ref={containerRef}
        style={topOffset != null ? { top: `${topOffset}px` } : undefined}
      >
        <div className="apple-search-subbar-header">
          <div className="apple-search-subbar-pill">
            {isSearching ? (
              <Loader2 size={16} className="search-spin apple-search-subbar-icon" />
            ) : (
              <Search size={16} strokeWidth={1.8} className="apple-search-subbar-icon" />
            )}

            <form className="apple-search-subbar-form" onSubmit={handleSubmit} role="search">
              <input
                ref={inputRef}
                type="search"
                className="apple-search-subbar-input"
                placeholder="Tìm kiếm tủ AnchorBox, phụ kiện, camera AI, mã SKU..."
                value={query}
                autoComplete="off"
                onChange={event => {
                  setQuery(event.target.value);
                  setActiveIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                maxLength={150}
              />
            </form>

            {query.trim().length > 0 && (
              <button
                type="button"
                className="apple-search-subbar-clear-btn"
                aria-label="Xóa từ khóa"
                onClick={clearQuery}
                title="Xóa từ khóa"
              >
                <X size={13} strokeWidth={2} />
              </button>
            )}

            <button
              type="button"
              className="apple-search-subbar-close-btn"
              onClick={onClose}
              aria-label="Đóng tìm kiếm"
            >
              Đóng
            </button>
          </div>
        </div>

        {/* 2. Drawer Body: Actual Store Product Chips OR Realtime Search Results */}
        <div className="apple-search-subbar-body" ref={dropdownRef} role="region" aria-label="Kết quả gợi ý tìm kiếm">
          {query.trim().length === 0 ? (
            /* Quick Popular Suggestions based on actual AnchorBox store products */
            <div className="apple-search-quick-panel">
              <span className="apple-search-quick-eyebrow">GỢI Ý TÌM KIẾM THEO SẢN PHẨM ANCHORBOX</span>
              <div className="apple-search-quick-chips">
                {suggestedKeywords.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="apple-search-product-chip"
                    onClick={() => executeSearch(item.query, '')}
                  >
                    <Search size={13} className="apple-chip-icon" />
                    <span className="apple-chip-text">{item.label}</span>
                    {item.badge && <span className="apple-chip-badge">({item.badge})</span>}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Realtime Matching Catalog Products */
            <div className="commerce-search-dropdown-list">
              <div className="apple-search-results-meta">
                <span>Sản phẩm gợi ý</span>
                <span>{results.length > 0 ? `Tìm thấy ${results.length} sản phẩm` : 'Không có kết quả'}</span>
              </div>

              {results.slice(0, 6).map((product, index) => {
                const minPrice = getProductMinPrice(product);
                const hasStock = product.variants?.some(v => v.isActive && v.stockQuantity > 0);
                const imageSrc = product.images?.[0];
                const isSelected = activeIndex === index;

                return (
                  <Link
                    key={product.id}
                    to={`/products/${product.id}`}
                    className={`search-result-item ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => {
                      onClose?.();
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <div className="search-result-thumb">
                      {imageSrc ? (
                        <img src={imageSrc} alt="" loading="lazy" />
                      ) : (
                        <Package size={22} className="search-result-fallback-icon" />
                      )}
                    </div>

                    <div className="search-result-info">
                      {product.categoryName && (
                        <span className="search-result-category">{product.categoryName}</span>
                      )}
                      <h4 className="search-result-title">
                        {highlightMatch(product.name, query)}
                      </h4>
                      {product.sku && (
                        <span className="search-result-sku">SKU: {product.sku}</span>
                      )}
                    </div>

                    <div className="search-result-meta">
                      <span className="search-result-price">
                        {minPrice != null ? (
                          <>
                            <small>Từ </small>
                            {money(minPrice)}
                          </>
                        ) : (
                          'Liên hệ'
                        )}
                      </span>
                      <span className={`search-result-stock ${hasStock ? 'in-stock' : 'out-of-stock'}`}>
                        {hasStock ? 'Còn hàng' : 'Hết hàng'}
                      </span>
                    </div>

                    <ChevronRight size={16} className="search-result-arrow" />
                  </Link>
                );
              })}

              {results.length === 0 && (
                <div className="search-result-empty">
                  <Package size={32} strokeWidth={1.5} />
                  <p>
                    Không tìm thấy sản phẩm phù hợp với <strong>"{query}"</strong>
                  </p>
                  <span>Thử tìm kiếm với tên sản phẩm khác hoặc duyệt danh mục của chúng tôi.</span>
                  <button
                    type="button"
                    className="search-view-all-btn"
                    onClick={() => {
                      onClose?.();
                      executeSearch('', '');
                    }}
                  >
                    Xem tất cả sản phẩm <ArrowUpRight size={15} />
                  </button>
                </div>
              )}

              {results.length > 0 && (
                <div className="commerce-search-dropdown-footer">
                  <button
                    type="button"
                    className="search-view-all-link"
                    onClick={() => executeSearch(query, category)}
                  >
                    Xem tất cả {results.length} kết quả cho "{query}" →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Apple Full-screen Dimmed Backdrop (below header) */}
      <div
        className="apple-nav-backdrop-dim"
        style={topOffset != null ? { top: `${topOffset}px` } : undefined}
        onClick={onClose}
        aria-hidden="true"
      />
    </>
  );
}
