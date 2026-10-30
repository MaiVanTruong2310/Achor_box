import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  SlidersHorizontal,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Package,
  ArrowRight,
} from 'lucide-react';
import { useCatalog } from '../CatalogContext';
import { shop, money, type CatalogProduct } from '../api/shop';
import { useResource, ResourceState, ErrorNotice } from '../components/ShopUi';
import './product-catalog.css';

const FILTER_STORAGE_KEY = 'anchorbox_catalog_filter_v2';

const PRICE_PRESETS = [
  { id: 'all', label: 'Tất cả mức giá' },
  { id: 'under-5m', label: 'Dưới 5.000.000 đ', min: 0, max: 5000000 },
  { id: '5m-10m', label: '5.000.000 đ – 10.000.000 đ', min: 5000000, max: 10000000 },
  { id: '10m-20m', label: '10.000.000 đ – 20.000.000 đ', min: 10000000, max: 20000000 },
  { id: 'above-20m', label: 'Trên 20.000.000 đ', min: 20000000, max: Infinity },
] as const;

const CAPACITY_PRESETS = [
  { id: 'all', label: 'Tất cả dung tích' },
  { id: 'under-50l', label: 'Dưới 50 L (Nhỏ - S)', min: 0, max: 50 },
  { id: '50l-100l', label: '50 L – 100 L (Vừa - M)', min: 50, max: 100 },
  { id: 'above-100l', label: 'Trên 100 L (Lớn - L / XL)', min: 100, max: Infinity },
] as const;

interface CachedFilterState {
  query: string;
  category: string;
  pricePreset: string;
  customMin: string;
  customMax: string;
  capacityPreset: string;
  sizes: string[];
  hasSensor: boolean;
  inStockOnly: boolean;
  sort: string;
  page: number;
}

export function ProductCatalogPage() {
  const resource = useCatalog();
  const categories = useResource(shop.categories, 'catalog-categories');
  const [searchParams, setSearchParams] = useSearchParams();

  // Load initial filter state from URL or sessionStorage cache
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [pricePreset, setPricePreset] = useState('all');
  const [customMin, setCustomMin] = useState('');
  const [customMax, setCustomMax] = useState('');
  const [appliedCustomMin, setAppliedCustomMin] = useState<number | null>(null);
  const [appliedCustomMax, setAppliedCustomMax] = useState<number | null>(null);
  const [capacityPreset, setCapacityPreset] = useState('all');
  const [sizes, setSizes] = useState<string[]>([]);
  const [hasSensor, setHasSensor] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState('featured');
  const [page, setPage] = useState(0);
  const pageSize = 12;

  // 1. Initial State Restoration (URL takes priority, then sessionStorage cache)
  useEffect(() => {
    let restored: Partial<CachedFilterState> = {};
    const cachedStr = sessionStorage.getItem(FILTER_STORAGE_KEY);
    if (cachedStr) {
      try {
        restored = JSON.parse(cachedStr);
      } catch {
        // ignore cache parse error
      }
    }

    const urlCategory = searchParams.get('category');
    const urlQuery = searchParams.get('q');
    const urlSort = searchParams.get('sort');
    const urlPage = searchParams.get('page');
    const urlPrice = searchParams.get('price');

    if (urlCategory !== null) restored.category = urlCategory;
    if (urlQuery !== null) restored.query = urlQuery;
    if (urlSort !== null) restored.sort = urlSort;
    if (urlPage !== null) restored.page = parseInt(urlPage, 10) || 0;
    if (urlPrice !== null) restored.pricePreset = urlPrice;

    if (restored.query !== undefined) setQuery(restored.query);
    if (restored.category !== undefined) setCategory(restored.category);
    if (restored.pricePreset !== undefined) setPricePreset(restored.pricePreset);
    if (restored.customMin !== undefined) setCustomMin(restored.customMin);
    if (restored.customMax !== undefined) setCustomMax(restored.customMax);
    if (restored.customMin && !isNaN(Number(restored.customMin))) setAppliedCustomMin(Number(restored.customMin));
    if (restored.customMax && !isNaN(Number(restored.customMax))) setAppliedCustomMax(Number(restored.customMax));
    if (restored.capacityPreset !== undefined) setCapacityPreset(restored.capacityPreset);
    if (restored.sizes !== undefined) setSizes(restored.sizes);
    if (restored.hasSensor !== undefined) setHasSensor(restored.hasSensor);
    if (restored.inStockOnly !== undefined) setInStockOnly(restored.inStockOnly);
    if (restored.sort !== undefined) setSort(restored.sort);
    if (restored.page !== undefined) setPage(restored.page);

    setInitialLoaded(true);
  }, []);

  // 2. Cache & Sync to URL whenever filters change
  useEffect(() => {
    if (!initialLoaded) return;

    const state: CachedFilterState = {
      query,
      category,
      pricePreset,
      customMin,
      customMax,
      capacityPreset,
      sizes,
      hasSensor,
      inStockOnly,
      sort,
      page,
    };

    sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(state));

    // Sync essential filters to searchParams
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (query) params.set('q', query);
    if (sort !== 'featured') params.set('sort', sort);
    if (page > 0) params.set('page', String(page));
    if (pricePreset !== 'all') params.set('price', pricePreset);

    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [
    initialLoaded,
    query,
    category,
    pricePreset,
    customMin,
    customMax,
    capacityPreset,
    sizes,
    hasSensor,
    inStockOnly,
    sort,
    page,
    setSearchParams,
  ]);

  // Extract all available sizes from all active variants in catalog
  const availableSizes = useMemo(() => {
    const list =
      resource.data?.flatMap(
        p =>
          p.variants
            ?.filter(v => v.isActive)
            .map(v => v.size || v.variantName)
            .filter((x): x is string => !!x && x.trim().length > 0) || []
      ) || [];
    return [...new Set(list)].sort();
  }, [resource.data]);

  // Price helper for a product
  const getProductMinPrice = (p: CatalogProduct): number => {
    const prices = p.variants
      ?.filter((v): v is typeof v & { finalPrice: number } => v.isActive && v.finalPrice != null && Number.isFinite(v.finalPrice))
      .map(v => v.finalPrice) || [];
    return prices.length ? Math.min(...prices) : (p.price != null && Number.isFinite(p.price) ? p.price : Infinity);
  };

  const hasPurchasableVariant = (p: CatalogProduct): boolean => {
    return p.variants?.some(v => v.isActive && v.stockQuantity > 0) ?? false;
  };

  // Filter & Sort calculation
  const filteredProducts = useMemo(() => {
    const items = resource.data || [];
    const q = query.trim().toLocaleLowerCase('vi');

    return items
      .filter(p => {
        // Keyword Search
        if (q) {
          const haystack = [
            p.name,
            p.sku,
            p.description,
            p.categoryName,
            ...(p.variants?.map(v => `${v.sku} ${v.variantName || ''} ${v.size || ''}`) || []),
          ]
            .join(' ')
            .toLocaleLowerCase('vi');
          if (!haystack.includes(q)) return false;
        }

        // Category Filter
        if (category && p.categoryId !== category) {
          return false;
        }

        // Price Filter
        const pMin = getProductMinPrice(p);
        if (pricePreset !== 'all') {
          if (pricePreset === 'custom') {
            if (appliedCustomMin !== null && pMin < appliedCustomMin) return false;
            if (appliedCustomMax !== null && pMin > appliedCustomMax) return false;
          } else {
            const foundPreset = PRICE_PRESETS.find(item => item.id === pricePreset);
            if (foundPreset && 'min' in foundPreset) {
              if (pMin < foundPreset.min || pMin > foundPreset.max) return false;
            }
          }
        }

        // Capacity Filter
        if (capacityPreset !== 'all') {
          const foundCap = CAPACITY_PRESETS.find(item => item.id === capacityPreset);
          if (foundCap && 'min' in foundCap) {
            const hasCap = p.variants?.some(
              v =>
                v.isActive &&
                v.capacityLiter != null &&
                v.capacityLiter >= foundCap.min &&
                v.capacityLiter <= foundCap.max
            );
            if (!hasCap) return false;
          }
        }

        // Sizes Filter
        if (sizes.length > 0) {
          const matchesSize = p.variants?.some(
            v => v.isActive && v.size && sizes.includes(v.size)
          );
          if (!matchesSize) return false;
        }

        // Sensor Filter
        if (hasSensor) {
          const hasWeight = p.variants?.some(v => v.isActive && v.hasWeightSensor === true);
          if (!hasWeight) return false;
        }

        // In Stock Filter
        if (inStockOnly) {
          if (!hasPurchasableVariant(p)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sort === 'price-asc') return getProductMinPrice(a) - getProductMinPrice(b);
        if (sort === 'price-desc') {
          const pa = getProductMinPrice(a);
          const pb = getProductMinPrice(b);
          return (pb === Infinity ? -1 : pb) - (pa === Infinity ? -1 : pa);
        }
        if (sort === 'newest') {
          return (
            Date.parse(b.createdAt || '1970-01-01') -
            Date.parse(a.createdAt || '1970-01-01')
          );
        }
        if (sort === 'name-asc') {
          return a.name.localeCompare(b.name, 'vi');
        }
        // Default: featured (in-stock first, then name)
        return Number(hasPurchasableVariant(b)) - Number(hasPurchasableVariant(a));
      });
  }, [
    resource.data,
    query,
    category,
    pricePreset,
    appliedCustomMin,
    appliedCustomMax,
    capacityPreset,
    sizes,
    hasSensor,
    inStockOnly,
    sort,
  ]);

  // Reset page to 0 when filters change (except during initial load)
  function handleFilterChange(callback: () => void) {
    callback();
    setPage(0);
  }

  function handleSizeToggle(s: string) {
    handleFilterChange(() => {
      setSizes(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]));
    });
  }

  function applyCustomPrice() {
    handleFilterChange(() => {
      setPricePreset('custom');
      setAppliedCustomMin(customMin.trim() ? Number(customMin) : null);
      setAppliedCustomMax(customMax.trim() ? Number(customMax) : null);
    });
  }

  function resetAllFilters() {
    setQuery('');
    setCategory('');
    setPricePreset('all');
    setCustomMin('');
    setCustomMax('');
    setAppliedCustomMin(null);
    setAppliedCustomMax(null);
    setCapacityPreset('all');
    setSizes([]);
    setHasSensor(false);
    setInStockOnly(false);
    setSort('featured');
    setPage(0);
  }

  const isFilterActive =
    !!query ||
    !!category ||
    pricePreset !== 'all' ||
    capacityPreset !== 'all' ||
    sizes.length > 0 ||
    hasSensor ||
    inStockOnly;

  // Pagination calculation
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const currentPage = Math.max(0, Math.min(page, totalPages - 1));
  const visibleProducts = filteredProducts.slice(
    currentPage * pageSize,
    currentPage * pageSize + pageSize
  );

  function goToPage(p: number) {
    const target = Math.max(0, Math.min(p, totalPages - 1));
    setPage(target);
    const topEl = document.getElementById('catalog-top');
    if (topEl) {
      topEl.scrollIntoView({ behavior: 'smooth' });
    }
  }

  const currentCategoryName =
    categories.data?.find(c => c.id === category)?.name || 'Tất cả sản phẩm';

  return (
    <div className="catalog-page" id="catalog-top">
      {/* Breadcrumb Navigation */}
      <div className="catalog-breadcrumb-bar">
        <div className="container">
          <nav className="catalog-breadcrumb-nav" aria-label="Đường dẫn trang">
            <Link to="/">Trang chủ</Link>
            <span className="catalog-breadcrumb-separator">/</span>
            <Link to="/products" onClick={resetAllFilters}>
              Sản phẩm
            </Link>
            {category && (
              <>
                <span className="catalog-breadcrumb-separator">/</span>
                <span className="catalog-breadcrumb-current">{currentCategoryName}</span>
              </>
            )}
          </nav>
        </div>
      </div>

      <div className="container">
        {/* Page Heading */}
        <div className="catalog-heading-wrap">
          <p className="eyebrow">HỘP NHẬN HÀNG THÔNG MINH ANCHORBOX</p>
          <h1>{category ? currentCategoryName : 'Tất cả sản phẩm AnchorBox'}</h1>
          <p className="lead">
            Lựa chọn cấu hình hộp nhận hàng thông minh phù hợp cho ngôi nhà và nhu cầu nhận bưu
            kiện của bạn.
          </p>
        </div>

        {/* Mobile Filter Toggle */}
        <div className="catalog-mobile-filter-bar">
          <button
            type="button"
            className="catalog-mobile-filter-btn"
            onClick={() => setMobileFilterOpen(v => !v)}
          >
            <SlidersHorizontal size={15} />
            Bộ lọc tìm kiếm {isFilterActive ? '(Đang bật)' : ''}
          </button>
          <span className="catalog-result-count">
            <strong>{filteredProducts.length}</strong> sản phẩm
          </span>
        </div>

        {/* 2-Column Layout */}
        <div className="catalog-layout">
          {/* ================================================================
              COLUMN 1: SIDEBAR FACET FILTERS (SEPARATE CARDS, FLOWS DOWN NATURALLY)
              ================================================================ */}
          <aside className={`catalog-sidebar ${mobileFilterOpen ? 'is-open-mobile' : ''}`}>
            {/* Card 1: Categories with Filter Header */}
            <div className="catalog-facet-card">
              <div className="catalog-sidebar-head">
                <h2 className="catalog-sidebar-title">
                  <SlidersHorizontal size={14} />
                  Bộ lọc tìm kiếm
                </h2>
                {isFilterActive && (
                  <button
                    type="button"
                    className="catalog-reset-btn"
                    onClick={resetAllFilters}
                    title="Đặt lại tất cả bộ lọc"
                  >
                    <RotateCcw size={11} style={{ display: 'inline', marginRight: 3 }} />
                    Đặt lại
                  </button>
                )}
              </div>

              <h3 className="catalog-facet-title">Danh mục</h3>
              <div className="catalog-options-list">
                <label className={`catalog-radio-label ${category === '' ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="category"
                    checked={category === ''}
                    onChange={() => handleFilterChange(() => setCategory(''))}
                  />
                  <span>Tất cả</span>
                  <span className="catalog-facet-count">{resource.data?.length || 0}</span>
                </label>
                {categories.data?.map(c => {
                  const count =
                    resource.data?.filter(p => p.categoryId === c.id).length || 0;
                  return (
                    <label
                      key={c.id}
                      className={`catalog-radio-label ${category === c.id ? 'is-active' : ''}`}
                    >
                      <input
                        type="radio"
                        name="category"
                        checked={category === c.id}
                        onChange={() => handleFilterChange(() => setCategory(c.id))}
                      />
                      <span>{c.name}</span>
                      <span className="catalog-facet-count">{count}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Card 2: Price Range */}
            <div className="catalog-facet-card">
              <h3 className="catalog-facet-title">Khoảng giá</h3>
              <div className="catalog-options-list">
                {PRICE_PRESETS.map(preset => (
                  <label
                    key={preset.id}
                    className={`catalog-radio-label ${pricePreset === preset.id ? 'is-active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="pricePreset"
                      checked={pricePreset === preset.id}
                      onChange={() =>
                        handleFilterChange(() => {
                          setPricePreset(preset.id);
                          setAppliedCustomMin(null);
                          setAppliedCustomMax(null);
                        })
                      }
                    />
                    <span>{preset.label}</span>
                  </label>
                ))}
              </div>

              {/* Custom price range */}
              <div className="catalog-price-custom">
                <div className="catalog-price-inputs">
                  <input
                    type="number"
                    min="0"
                    step="500000"
                    placeholder="Từ (đ)"
                    className="catalog-price-input"
                    value={customMin}
                    onChange={e => setCustomMin(e.target.value)}
                  />
                  <span className="catalog-price-dash">–</span>
                  <input
                    type="number"
                    min="0"
                    step="500000"
                    placeholder="Đến (đ)"
                    className="catalog-price-input"
                    value={customMax}
                    onChange={e => setCustomMax(e.target.value)}
                  />
                  <button
                    type="button"
                    className="catalog-price-apply-btn"
                    onClick={applyCustomPrice}
                  >
                    Lọc
                  </button>
                </div>
              </div>
            </div>

            {/* Card 3: Capacity */}
            <div className="catalog-facet-card">
              <h3 className="catalog-facet-title">Dung tích hộp</h3>
              <div className="catalog-pill-grid">
                {CAPACITY_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`catalog-facet-pill ${capacityPreset === preset.id ? 'is-active' : ''}`}
                    onClick={() =>
                      handleFilterChange(() => setCapacityPreset(preset.id))
                    }
                  >
                    {preset.id === 'all'
                      ? 'Tất cả'
                      : preset.id === 'under-50l'
                      ? '< 50 L'
                      : preset.id === '50l-100l'
                      ? '50 – 100 L'
                      : '> 100 L'}
                  </button>
                ))}
              </div>
            </div>

            {/* Card 4: Sizes */}
            {availableSizes.length > 0 && (
              <div className="catalog-facet-card">
                <h3 className="catalog-facet-title">Kích cỡ SKU</h3>
                <div className="catalog-size-grid">
                  {availableSizes.map(s => (
                    <button
                      key={s}
                      type="button"
                      className={`catalog-size-pill ${sizes.includes(s) ? 'is-active' : ''}`}
                      onClick={() => handleSizeToggle(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Card 5: Features & Availability */}
            <div className="catalog-facet-card">
              <h3 className="catalog-facet-title">Tính năng</h3>
              <div className="catalog-options-list" style={{ marginBottom: 6 }}>
                <label className={`catalog-checkbox-label ${hasSensor ? 'is-active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={hasSensor}
                    onChange={e =>
                      handleFilterChange(() => setHasSensor(e.target.checked))
                    }
                  />
                  <span>Cảm biến cân</span>
                </label>
              </div>

              <label className="catalog-toggle-row">
                <span>Chỉ hiện còn hàng</span>
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={e =>
                    handleFilterChange(() => setInStockOnly(e.target.checked))
                  }
                />
                <span className="catalog-toggle-switch" aria-hidden="true" />
              </label>
            </div>
          </aside>

          {/* ================================================================
              COLUMN 2: PRODUCT LISTING & PAGINATION
              ================================================================ */}
          <main className="catalog-main">
            {/* Topbar: Search on top of products + Count + Sort on 1 single row */}
            <div className="catalog-topbar">
              <div className="catalog-top-search">
                <Search size={16} className="catalog-top-search-icon" />
                <input
                  type="search"
                  value={query}
                  onChange={e => handleFilterChange(() => setQuery(e.target.value))}
                  placeholder="Tìm theo tên sản phẩm, mã SKU, mô tả…"
                  aria-label="Tìm kiếm sản phẩm"
                />
                {query && (
                  <button
                    type="button"
                    className="catalog-top-search-clear"
                    onClick={() => handleFilterChange(() => setQuery(''))}
                    aria-label="Xóa từ khóa tìm kiếm"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="catalog-topbar-controls">
                <div className="catalog-result-count">
                  Hiển thị <strong>{visibleProducts.length}</strong> /{' '}
                  <strong>{filteredProducts.length}</strong> sản phẩm
                </div>
                <div className="catalog-sort-group">
                  <span className="catalog-sort-label">Sắp xếp:</span>
                  <select
                    className="catalog-sort-select"
                    value={sort}
                    onChange={e => setSort(e.target.value)}
                    aria-label="Sắp xếp sản phẩm"
                  >
                    <option value="featured">Phổ biến nhất</option>
                    <option value="price-asc">Giá: Thấp đến Cao</option>
                    <option value="price-desc">Giá: Cao đến Thấp</option>
                    <option value="newest">Mới nhất</option>
                    <option value="name-asc">Tên: A → Z</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Active Filter Chips */}
            {isFilterActive && (
              <div className="catalog-active-chips" role="region" aria-label="Bộ lọc đang áp dụng">
                {query && (
                  <span className="catalog-chip">
                    Từ khóa: &quot;{query}&quot;
                    <button
                      type="button"
                      className="catalog-chip-remove"
                      onClick={() => handleFilterChange(() => setQuery(''))}
                      aria-label="Xóa từ khóa"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {category && (
                  <span className="catalog-chip">
                    {currentCategoryName}
                    <button
                      type="button"
                      className="catalog-chip-remove"
                      onClick={() => handleFilterChange(() => setCategory(''))}
                      aria-label="Xóa danh mục"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {pricePreset !== 'all' && (
                  <span className="catalog-chip">
                    Giá:{' '}
                    {pricePreset === 'custom'
                      ? `${appliedCustomMin ? money(appliedCustomMin) : '0'} – ${
                          appliedCustomMax ? money(appliedCustomMax) : '∞'
                        }`
                      : PRICE_PRESETS.find(p => p.id === pricePreset)?.label}
                    <button
                      type="button"
                      className="catalog-chip-remove"
                      onClick={() =>
                        handleFilterChange(() => {
                          setPricePreset('all');
                          setAppliedCustomMin(null);
                          setAppliedCustomMax(null);
                        })
                      }
                      aria-label="Xóa lọc giá"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {capacityPreset !== 'all' && (
                  <span className="catalog-chip">
                    Dung tích: {CAPACITY_PRESETS.find(p => p.id === capacityPreset)?.label}
                    <button
                      type="button"
                      className="catalog-chip-remove"
                      onClick={() => handleFilterChange(() => setCapacityPreset('all'))}
                      aria-label="Xóa lọc dung tích"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {sizes.map(s => (
                  <span key={s} className="catalog-chip">
                    Kích cỡ: {s}
                    <button
                      type="button"
                      className="catalog-chip-remove"
                      onClick={() => handleSizeToggle(s)}
                      aria-label={`Xóa cỡ ${s}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {hasSensor && (
                  <span className="catalog-chip">
                    Có cảm biến cân
                    <button
                      type="button"
                      className="catalog-chip-remove"
                      onClick={() => handleFilterChange(() => setHasSensor(false))}
                      aria-label="Xóa lọc cảm biến"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {inStockOnly && (
                  <span className="catalog-chip">
                    Chỉ còn hàng
                    <button
                      type="button"
                      className="catalog-chip-remove"
                      onClick={() => handleFilterChange(() => setInStockOnly(false))}
                      aria-label="Xóa lọc tồn kho"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  className="catalog-clear-all-chips"
                  onClick={resetAllFilters}
                >
                  Xóa tất cả bộ lọc
                </button>
              </div>
            )}

            {/* Data Resource State / Loading / Error */}
            <ResourceState {...resource} />
            {categories.error && (
              <ErrorNotice error={categories.error} retry={categories.retry} />
            )}

            {/* Empty State */}
            {!resource.loading && !resource.error && !filteredProducts.length && (
              <div className="catalog-empty-state">
                <div className="catalog-empty-icon">
                  <Search size={28} />
                </div>
                <h3>Không tìm thấy sản phẩm phù hợp</h3>
                <p>
                  Thử bỏ bớt điều kiện lọc hoặc nhập từ khóa tìm kiếm khác để khám phá các dòng
                  sản phẩm của AnchorBox.
                </p>
                <button
                  type="button"
                  className="catalog-empty-btn"
                  onClick={resetAllFilters}
                >
                  Xóa bộ lọc & Xem tất cả sản phẩm
                </button>
              </div>
            )}

            {/* Product Cards Grid */}
            {!resource.loading && visibleProducts.length > 0 && (
              <div className="catalog-product-grid">
                {visibleProducts.map(product => {
                  const minP = getProductMinPrice(product);
                  const inStock = hasPurchasableVariant(product);
                  const firstImage = product.images?.[0];

                  // Capacity & Spec highlights
                  const capacities = [
                    ...new Set(
                      product.variants
                        ?.filter(v => v.isActive && v.capacityLiter != null)
                        .map(v => `${v.capacityLiter}L`) || []
                    ),
                  ];
                  const hasLoadcell = product.variants?.some(
                    v => v.isActive && v.hasWeightSensor
                  );

                  return (
                    <Link
                      key={product.id}
                      to={`/products/${product.id}`}
                      className="catalog-card"
                    >
                      <div className="catalog-card-image-wrap">
                        {firstImage ? (
                          <img
                            src={firstImage}
                            alt={product.name}
                            className="catalog-card-image"
                            loading="lazy"
                          />
                        ) : (
                          <div className="catalog-card-placeholder">
                            <Package size={34} strokeWidth={1.5} />
                            <span>AnchorBox</span>
                          </div>
                        )}
                        <span
                          className={`catalog-card-badge ${
                            inStock ? 'in-stock' : 'out-of-stock'
                          }`}
                        >
                          {inStock ? 'Còn hàng' : 'Hết hàng'}
                        </span>
                      </div>

                      <div className="catalog-card-body">
                        <span className="catalog-card-category">
                          {product.categoryName || 'AnchorBox'}
                        </span>
                        <h3 className="catalog-card-title">{product.name}</h3>

                        {/* Specs row */}
                        <div className="catalog-card-specs">
                          {capacities.length > 0 && (
                            <span className="catalog-card-spec-item">
                              {capacities.join(' · ')}
                            </span>
                          )}
                          {hasLoadcell && (
                            <span className="catalog-card-spec-item">Cảm biến cân</span>
                          )}
                          {product.sku && (
                            <span className="catalog-card-spec-item">#{product.sku}</span>
                          )}
                        </div>

                        {product.description && (
                          <p className="catalog-card-desc">{product.description}</p>
                        )}

                        <div className="catalog-card-foot">
                          <div className="catalog-card-price">
                            <small>Giá từ</small>
                            {minP === Infinity ? 'Liên hệ' : money(minP)}
                          </div>
                          <span className="catalog-card-action">
                            Xem cấu hình <ArrowRight size={13} />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </main>
        </div>

        {/* Pagination Controls - Placed at the very bottom across the full container width */}
        {filteredProducts.length > 0 && (
          <div className="catalog-pagination-wrapper">
            <nav className="catalog-pagination" aria-label="Phân trang danh mục sản phẩm">
              <button
                type="button"
                className="catalog-page-btn"
                disabled={currentPage === 0}
                onClick={() => goToPage(currentPage - 1)}
                aria-label="Trang trước"
              >
                <ChevronLeft size={16} />
                <span>Trước</span>
              </button>

              <div className="catalog-page-numbers">
                {Array.from({ length: totalPages }, (_, i) => {
                  if (
                    totalPages <= 7 ||
                    i === 0 ||
                    i === totalPages - 1 ||
                    Math.abs(i - currentPage) <= 1
                  ) {
                    return (
                      <button
                        key={i}
                        type="button"
                        className={`catalog-page-btn ${i === currentPage ? 'is-active' : ''}`}
                        onClick={() => goToPage(i)}
                        aria-current={i === currentPage ? 'page' : undefined}
                      >
                        {i + 1}
                      </button>
                    );
                  }
                  if (
                    (i === 1 && currentPage > 2) ||
                    (i === totalPages - 2 && currentPage < totalPages - 3)
                  ) {
                    return (
                      <span key={i} className="catalog-page-dots">
                        …
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              <button
                type="button"
                className="catalog-page-btn"
                disabled={currentPage + 1 >= totalPages}
                onClick={() => goToPage(currentPage + 1)}
                aria-label="Trang tiếp"
              >
                <span>Sau</span>
                <ChevronRight size={16} />
              </button>
            </nav>

            <div className="catalog-pagination-summary">
              Hiển thị {filteredProducts.length > 0 ? currentPage * pageSize + 1 : 0} –{' '}
              {Math.min((currentPage + 1) * pageSize, filteredProducts.length)} trên tổng số{' '}
              {filteredProducts.length} sản phẩm
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default ProductCatalogPage;
