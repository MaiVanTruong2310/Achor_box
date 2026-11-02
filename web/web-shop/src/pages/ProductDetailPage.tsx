import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ShieldCheck,
  Truck,
  CheckCircle2,
  ShoppingCart,
  Zap,
  Check,
  Plus,
  Minus,
  Lock,
} from 'lucide-react';
import { shop, money, type Variant, type WarrantyPlan } from '../api/shop';
import { availableVariant, canBuy } from '../api/catalog';
import { useCatalog } from '../CatalogContext';
import { useShop } from '../ShopContext';
import { useResource, ResourceState } from '../components/ShopUi';
import { BoxShowcase, BoxThumb } from '../components/BoxShowcase';
import './product-detail-dark.css';
import '../apple-home.css';
import './product-detail.css';


interface AccessoryItem {
  variant: Variant;
  name: string;
  image: string;
  price: number;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


export function ProductDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { add } = useShop();
  const catalog = useCatalog();

  // Selected variant & quantity
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');

  // Flat Minimalist Accordion Open State
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    dimensions: true,
    security: true,
    sensors: false,
    connectivity: false,
    durability: false
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Recommendations / Frequently bought together
  const [checkedAccessories, setCheckedAccessories] = useState<Record<string, boolean>>({});
  const [bundleMessage, setBundleMessage] = useState('');

  // Reset when ID changes
  useEffect(() => {
    setSelectedVariantId('');
    setSelectedPlanId('');
    setQuantity(1);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [id]);

  const resource = useResource(async signal => {
    let targetId = id;
    if (!UUID_PATTERN.test(id)) {
      const list = catalog.data ?? await shop.products(signal);
      const matched = list.find(p => p.sku?.toLowerCase() === id.toLowerCase());
      if (!matched) return [];
      targetId = matched.id;
    }
    const p = await shop.product(targetId, signal);
    return p && p.isActive ? [p] : [];
  }, `product-detail-${id}`);

  const product = resource.data?.[0];
  const variants = useMemo(() => (product?.variants ?? []).filter(v => v.isActive).sort((a, b) => (a.capacityLiter ?? 0) - (b.capacityLiter ?? 0)), [product]);
  const variant = availableVariant(product, selectedVariantId);
  const plansResource = useResource(signal => shop.warrantyPlans(signal).catch(() => [] as WarrantyPlan[]), 'warranty-plans');
  const plans = plansResource.data ?? [];
  const plan = plans.find(p => p.id === selectedPlanId) ?? null;
  const capacities = useMemo(() => [...new Set(variants.map(v => v.capacityLiter).filter((c): c is number => c != null))], [variants]);
  const colorsForCapacity = useMemo(
    () => variants.filter(v => v.capacityLiter === variant?.capacityLiter && v.colorName),
    [variants, variant?.capacityLiter],
  );

  const pickVariant = (capacity: number | null | undefined, colorName: string | null | undefined) => {
    const sameCapacity = variants.filter(v => v.capacityLiter === capacity);
    const next = sameCapacity.find(v => v.colorName === colorName && v.stockQuantity > 0)
      ?? sameCapacity.find(v => v.colorName === colorName)
      ?? sameCapacity.find(v => v.stockQuantity > 0)
      ?? sameCapacity[0];
    if (next) setSelectedVariantId(next.id);
    setMessage('');
  };
  const purchasable = canBuy(variant);
  const maxQuantity = Math.max(1, Math.min(99, variant?.stockQuantity ?? 1));
  const notFound = !resource.loading && !resource.error && resource.data !== undefined && !product;

  useEffect(() => {
    setQuantity(q => Math.min(q, maxQuantity));
  }, [maxQuantity]);

  useEffect(() => {
    if (product?.name) document.title = `${product.name} | Anchor Box`;
  }, [product?.name]);

  const price = (variant?.finalPrice ?? product?.price ?? 0) + (plan?.price ?? 0);
  const totalWarrantyMonths = (variant?.warrantyMonths ?? 0) + (plan?.extraMonths ?? 0);

  const accessoryRecommendations: AccessoryItem[] = useMemo(() => {
    return (catalog.data ?? [])
      .filter(p => p.id !== product?.id && (p.categorySlug === 'phu-kien-tien-ich' || p.categorySlug === 'linh-kien-thay-the'))
      .flatMap(p => {
        const accVariant = availableVariant(p);
        return accVariant && canBuy(accVariant)
          ? [{ variant: accVariant, name: p.name, image: p.images?.[0] || '/products/accessory-mount.svg', price: accVariant.finalPrice ?? p.price }]
          : [];
      })
      .slice(0, 3);
  }, [catalog.data, product?.id]);

  const selectedAccessoriesList = useMemo(() => {
    return accessoryRecommendations.filter(acc => checkedAccessories[acc.variant.id]);
  }, [accessoryRecommendations, checkedAccessories]);

  const bundleTotalFinal = price + selectedAccessoriesList.reduce((sum, acc) => sum + acc.price, 0);
  const bundleItemCount = 1 + selectedAccessoriesList.length;

  const handleAddBundleToCart = () => {
    if (!product || !variant || !purchasable) return;
    add(variant, product.name, 1, plan);
    selectedAccessoriesList.forEach(acc => add(acc.variant, acc.name, 1));
    setBundleMessage(`Đã thêm ${bundleItemCount} sản phẩm vào giỏ hàng.`);
  };

  // Similar products from catalog
  const similarProducts = useMemo(() => {
    if (!catalog.data) return [];
    return catalog.data
      .filter(p => p.id !== product?.id && p.isActive)
      .slice(0, 3);
  }, [catalog.data, product?.id]);

  const handleAddToCart = () => {
    if (!variant || !product || !purchasable) return;
    add(variant, product.name, quantity, plan);
    setMessage(`Đã thêm ${quantity} × ${variant.variantName || product.name} vào giỏ hàng.`);
  };

  const handleBuyNow = () => {
    if (!variant || !product || !purchasable) return;
    add(variant, product.name, quantity, plan);
    navigate('/cart');
  };

  const specGroups = useMemo(() => {
    const sku = product?.sku?.toUpperCase() ?? '';
    const isSolar = sku.includes('SOLAR');
    const isPro = isSolar || sku.includes('PRO');
    const upcoming = 'Đang hoàn thiện, thông số công bố khi mở bán';
    const size = variant?.widthCm && variant.heightCm && variant.depthCm ? `${variant.widthCm} × ${variant.heightCm} × ${variant.depthCm} cm` : 'Đang cập nhật';
    const groups: { key: string; title: string; rows: [string, string][] }[] = [
      { key: 'dimensions', title: 'Kích thước và khoang chứa', rows: [
        ['Dung tích', variant?.capacityLiter ? `${variant.capacityLiter} lít` : 'Đang cập nhật'],
        ['Kích thước (R × C × S)', size],
        ['Khối lượng hộp', variant?.weightKg ? `${variant.weightKg} kg` : 'Đang cập nhật'],
        ['Tải trọng tối đa', variant?.maxLoadKg ? `${variant.maxLoadKg} kg` : 'Đang cập nhật'],
      ] },
      { key: 'security', title: 'Khóa và bảo mật', rows: [
        ['Cơ cấu khóa', 'Khóa kép: chốt điện 12 V và servo gài chốt'],
        ['Mở khóa', 'Mã PIN dùng một lần cho shipper, mở từ xa qua ứng dụng'],
        ['Xác thực mã', 'Kiểm tra trên đám mây, mã hết hạn là vô hiệu'],
        ['Chống dò mã', 'Sai 3 lần liên tiếp, khóa bàn phím 60 giây'],
        ['Tự khóa', 'Khóa lại 2 giây sau khi cửa đóng'],
      ] },
      { key: 'sensors', title: 'Cảm biến', rows: [
        ['Cân bưu kiện', 'Loadcell + HX711, nhận ra bưu kiện từ 50 g'],
        ['Cảm biến cửa', 'Công tắc từ MC-38'],
        ['Camera giám sát', isPro ? upcoming : 'Không có (có trên bản Pro và Solar Max)'],
      ] },
      { key: 'connectivity', title: 'Kết nối và nguồn điện', rows: [
        ['Vi điều khiển', 'ESP32-S3'],
        ['Kết nối', 'Wi-Fi 2,4 GHz, Bluetooth LE để cài Wi-Fi'],
        ['Giao diện tại hộp', 'Bàn phím 4×4, màn hình LCD 16×2, 3 đèn trạng thái và còi'],
        ['Nguồn', 'Adapter DC, đầu vào 9–24 V'],
        ['Pin dự phòng', isPro ? upcoming : 'Không có (có trên bản Pro và Solar Max)'],
        ...(isSolar ? [['Tấm pin mặt trời', upcoming] as [string, string]] : []),
      ] },
      { key: 'durability', title: 'Bảo hành', rows: [
        ['Thời hạn', totalWarrantyMonths ? `${totalWarrantyMonths} tháng kể từ ngày nghiệm thu lắp đặt${plan ? ` (gồm ${plan.name.toLowerCase()})` : ''}` : 'Theo phiếu bảo hành điện tử'],
        ['Hình thức', 'Phiếu bảo hành điện tử, tra cứu bằng số serial'],
      ] },
    ];
    return groups;
  }, [product?.sku, variant, plan, totalWarrantyMonths]);

  return (
    <div className="product-detail-page apple-product-detail-root">
      
      {/* Top Apple Minimalist Breadcrumb Bar */}
      <div className="detail-breadcrumb-bar">
        <div className="apple-detail-container">
          <nav className="detail-breadcrumb" aria-label="Đường dẫn trang">
            <Link to="/">Trang chủ</Link>
            <span className="sep">/</span>
            <Link to="/products">Sản phẩm</Link>
            <span className="sep">/</span>
            <span className="current">{product ? product.name : 'Chi tiết thiết bị'}</span>
          </nav>
        </div>
      </div>

      <div className="apple-detail-container">
        <ResourceState {...resource} />
        {notFound && (
          <div className="purchase-feedback-toast" role="status" style={{ marginTop: 24 }}>
            <div className="feedback-content">
              <span>Không tìm thấy sản phẩm “{id}” hoặc sản phẩm đã ngừng bán.</span>
              <Link to="/products" className="view-cart-link">Xem tất cả sản phẩm →</Link>
            </div>
          </div>
        )}

        {product && (
          <>
            {/* ====================================================
                1. TOP PRODUCT SHOWCASE & CONFIGURATOR GRID
                ==================================================== */}
            <div className="detail-hero-grid" style={{ alignItems: 'start', marginTop: '12px' }}>
              
              {/* LEFT COLUMN: Frameless Edge-to-Edge Studio Gallery & 3D Stage */}
              <div className="detail-gallery-column">
                <div className="gallery-sticky-sidebar">
                  <BoxShowcase
                    productName={product.name}
                    colorHex={variant?.colorHex}
                    colorName={variant?.colorName}
                    capacity={variant?.capacityLiter}
                  />

                  {/* Assurance Trust Grid beneath Image (INSIDE the sticky sidebar to avoid overlap) */}
                  <div className="gallery-compact-desc-card">
                    <div className="compact-assurance-grid">
                      <div className="assurance-item">
                        <Truck size={17} className="item-icon" />
                        <div>
                          <strong>Giao và lắp tận nơi</strong>
                          <p>Kỹ thuật viên lắp đặt và gắn serial vào đơn</p>
                        </div>
                      </div>
                      <div className="assurance-item">
                        <ShieldCheck size={17} className="item-icon" />
                        <div>
                          <strong>{totalWarrantyMonths ? `Bảo hành ${totalWarrantyMonths} tháng` : 'Bảo hành điện tử'}</strong>
                          <p>Tính từ ngày nghiệm thu, tra cứu bằng serial</p>
                        </div>
                      </div>
                      <div className="assurance-item">
                        <CheckCircle2 size={17} className="item-icon" />
                        <div>
                          <strong>Chạy thử trước bàn giao</strong>
                          <p>Kiểm tra khóa, mở khóa và cân ngay tại nhà</p>
                        </div>
                      </div>
                      <div className="assurance-item">
                        <Lock size={17} className="item-icon" />
                        <div>
                          <strong>Nghiệm thu minh bạch</strong>
                          <p>Bạn xác nhận nghiệm thu trong tài khoản</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Apple Style Configurator & Purchase Actions */}
              <div className="detail-buy-column">
                <div className="product-summary-block">
                  
                  <h1 className="product-title">{product.name}</h1>
                  <p className="pdp-description">
                    {product.description}
                  </p>

                  <div className="product-price-section">
                    <div className="price-main-row">
                      <span className="current-price">{money(price)}</span>
                    </div>
                    <p className="vat-notice">Giá đã gồm VAT. Phí giao và lắp đặt được tính ở bước thanh toán.</p>
                  </div>

                  {capacities.length > 0 && (
                    <div className="apple-config-group">
                      <div className="apple-config-label-row">
                        <span className="apple-config-title">Dung tích</span>
                        {variant?.capacityLiter && <span className="apple-config-value-badge">{variant.capacityLiter} lít</span>}
                      </div>
                      <div className="apple-config-pills-grid" role="radiogroup" aria-label="Dung tích">
                        {capacities.map(capacity => {
                          const isSelected = capacity === variant?.capacityLiter;
                          const options = variants.filter(v => v.capacityLiter === capacity);
                          const from = Math.min(...options.map(v => v.finalPrice ?? product.price));
                          const soldOut = options.every(v => v.stockQuantity <= 0);
                          return (
                            <button
                              key={capacity}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              className={`apple-config-pill ${isSelected ? 'is-active' : ''}`}
                              onClick={() => pickVariant(capacity, variant?.colorName)}
                            >
                              <span>{capacity} L</span>
                              <span className="pdp-pill-sub">{money(from)}{soldOut ? ' · Hết hàng' : ''}</span>
                              {isSelected && <Check size={14} color="#0071e3" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {colorsForCapacity.length > 0 && (
                    <div className="apple-config-group">
                      <div className="apple-config-label-row">
                        <span className="apple-config-title">Màu hộp</span>
                        {variant?.colorName && <span className="apple-config-value-badge">{variant.colorName}</span>}
                      </div>
                      <div className="pdp-swatches" role="radiogroup" aria-label="Màu hộp">
                        {colorsForCapacity.map(option => {
                          const isSelected = option.id === variant?.id;
                          const soldOut = option.stockQuantity <= 0;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              aria-label={`${option.colorName}${soldOut ? ', hết hàng' : ''}`}
                              title={`${option.colorName}${soldOut ? ' · Hết hàng' : ''}`}
                              className={`pdp-swatch ${isSelected ? 'is-active' : ''} ${soldOut ? 'is-sold-out' : ''}`}
                              onClick={() => pickVariant(option.capacityLiter, option.colorName)}
                            >
                              <span style={{ background: option.colorHex || '#d1d1d6' }} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {plans.length > 0 && (
                    <div className="apple-config-group">
                      <div className="apple-config-label-row">
                        <span className="apple-config-title">Gói bảo hành</span>
                        <span className="apple-config-value-badge">{totalWarrantyMonths} tháng</span>
                      </div>
                      <div className="pdp-plan-list" role="radiogroup" aria-label="Gói bảo hành">
                        {[null, ...plans].map(option => {
                          const isSelected = (option?.id ?? '') === selectedPlanId;
                          const months = (variant?.warrantyMonths ?? 0) + (option?.extraMonths ?? 0);
                          return (
                            <button
                              key={option?.id ?? 'standard'}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              className={`pdp-plan ${isSelected ? 'is-active' : ''}`}
                              onClick={() => { setSelectedPlanId(option?.id ?? ''); setMessage(''); }}
                            >
                              <span className="pdp-plan-name">{option ? option.name : 'Bảo hành tiêu chuẩn'}</span>
                              <span className="pdp-plan-months">Tổng {months} tháng</span>
                              <span className="pdp-plan-price">{option ? `+${money(option.price)}` : 'Đã bao gồm'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="stock-status-bar">
                    <div className="in-stock-alert">
                      <span className={`stock-dot ${purchasable ? 'pulse' : ''}`} style={purchasable ? undefined : { background: '#86868b' }} />
                      <span>
                        {purchasable
                          ? <>Còn hàng — <strong>{variant?.stockQuantity} sản phẩm</strong>. Giao và lắp đặt tận nhà.</>
                          : <>Phiên bản này chưa mở bán. <Link to="/contact">Liên hệ để được tư vấn và đặt trước</Link>.</>}
                      </span>
                    </div>
                  </div>

                  {/* Quantity & Apple Purchase Actions */}
                  <div className="purchase-action-container">
                    <div className="quantity-selection-row">
                      <span className="qty-label">Số lượng:</span>
                      <div className="custom-stepper">
                        <button
                          type="button"
                          className="step-btn"
                          disabled={quantity <= 1}
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                          aria-label="Giảm số lượng"
                        >
                          <Minus size={15} />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={maxQuantity}
                          value={quantity}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) setQuantity(Math.max(1, Math.min(val, maxQuantity)));
                          }}
                          className="qty-input"
                          aria-label="Số lượng muốn mua"
                        />
                        <button
                          type="button"
                          className="step-btn"
                          disabled={quantity >= maxQuantity}
                          onClick={() => setQuantity(q => Math.min(q + 1, maxQuantity))}
                          aria-label="Tăng số lượng"
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Apple Style Action Buttons */}
                    <div className="action-button-row">
                      <button
                        type="button"
                        id="product-buy"
                        className="apple-btn-buy"
                        style={{ padding: '10px 18px', fontSize: '13.5px' }}
                        onClick={handleAddToCart}
                        disabled={!purchasable}
                      >
                        <ShoppingCart size={17} />
                        <span>Thêm vào giỏ hàng</span>
                      </button>

                      <button
                        type="button"
                        className="apple-btn-primary"
                        style={{ justifyContent: 'center', padding: '10px 18px', fontSize: '13.5px' }}
                        onClick={handleBuyNow}
                        disabled={!purchasable}
                      >
                        <Zap size={17} />
                        <span>Mua ngay</span>
                      </button>
                    </div>

                    {message && (
                      <div className="purchase-feedback-toast" role="status" style={{ marginTop: '16px' }}>
                        <CheckCircle2 size={18} />
                        <div className="feedback-content">
                          <span>{message}</span>
                          <Link to="/cart" className="view-cart-link">
                            Đi tới giỏ hàng & thanh toán →
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </div>

            {/* ====================================================
                2. BẢNG THÔNG SỐ KỸ THUẬT TỐI GIẢN DẠNG ACCORDION PHẲNG
                ==================================================== */}
            <section className="apple-specs-accordion-section">
              <div className="apple-accordion-head">
                <p className="eyebrow">CHI TIẾT PHẦN CỨNG & CÔNG NGHỆ</p>
                <h2>Thông số kỹ thuật</h2>
              </div>

              <div className="apple-flat-accordion" role="region" aria-label="Bảng thông số kỹ thuật accordion">
                
                {specGroups.map(group => (
                  <div key={group.key} className={`apple-accordion-item ${openAccordions[group.key] ? 'is-open' : ''}`}>
                    <button
                      type="button"
                      className="apple-accordion-trigger"
                      onClick={() => toggleAccordion(group.key)}
                      aria-expanded={!!openAccordions[group.key]}
                    >
                      <span className="apple-accordion-title">{group.title}</span>
                      <span className="apple-accordion-icon">
                        <ChevronDown size={17} />
                      </span>
                    </button>
                    {openAccordions[group.key] && (
                      <div className="apple-accordion-body">
                        {group.rows.map(([key, value]) => (
                          <div key={key} className="apple-spec-row">
                            <span className="apple-spec-key">{key}</span>
                            <span className="apple-spec-val">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

              </div>
            </section>

            {/* ====================================================
                3. FREQUENTLY BOUGHT TOGETHER COMBO RECOMMENDATIONS
                ==================================================== */}
            {accessoryRecommendations.length > 0 && purchasable && variant && (
              <section className="recommendation-bundle-section" style={{ marginTop: '48px' }}>
                <div className="bundle-heading">
                  <h2>Thường được mua cùng</h2>
                  <p className="bundle-sub">Phụ kiện đang bán, giá theo danh mục hiện tại.</p>
                </div>

                <div className="bundle-card-container">
                  <div className="bundle-items-flow">
                    <div className="bundle-item-card is-main">
                      <div className="bundle-item-checkbox">
                        <input type="checkbox" checked disabled readOnly aria-label="Sản phẩm chính" />
                      </div>
                      <div className="bundle-img-wrap">
                        <img src={product.images?.[0] || '/products/smartbox-std-front.svg'} alt={product.name} />
                      </div>
                      <div className="bundle-info">
                        <span className="bundle-badge-main">Thiết bị chính</span>
                        <h4>{variant.variantName || product.name}</h4>
                        {plan && <span className="bundle-variant-tag">{plan.name}</span>}
                        <div className="bundle-prices-row">
                          <span className="bundle-price">{money(price)}</span>
                        </div>
                      </div>
                    </div>

                    {accessoryRecommendations.map(acc => {
                      const isChecked = !!checkedAccessories[acc.variant.id];
                      const toggle = () => setCheckedAccessories(prev => ({ ...prev, [acc.variant.id]: !prev[acc.variant.id] }));
                      return (
                        <label key={acc.variant.id} className={`bundle-item-card ${isChecked ? 'is-checked' : ''}`}>
                          <div className="bundle-item-checkbox">
                            <input type="checkbox" checked={isChecked} onChange={toggle} aria-label={acc.name} />
                          </div>
                          <div className="bundle-img-wrap">
                            <img src={acc.image} alt={acc.name} />
                          </div>
                          <div className="bundle-info">
                            <span className="bundle-badge-accessory">Phụ kiện</span>
                            <h4>{acc.name}</h4>
                            {acc.variant.variantName && <span className="bundle-variant-tag">{acc.variant.variantName}</span>}
                            <div className="bundle-prices-row">
                              <span className="bundle-price">{money(acc.price)}</span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <div className="bundle-checkout-card">
                    <div className="bundle-calc-header">
                      <h4>Tổng cộng</h4>
                      <span className="item-count">{bundleItemCount} sản phẩm</span>
                    </div>
                    <div className="bundle-calc-rows">
                      <div className="calc-row total-row">
                        <span>Tạm tính:</span>
                        <strong className="final-total">{money(bundleTotalFinal)}</strong>
                      </div>
                    </div>
                    <button type="button" className="btn-add-bundle" onClick={handleAddBundleToCart}>
                      <ShoppingCart size={16} />
                      <span>Thêm {bundleItemCount} sản phẩm vào giỏ</span>
                    </button>
                    {bundleMessage && (
                      <div className="bundle-added-toast" role="status">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={16} />
                          <strong>{bundleMessage}</strong>
                        </div>
                        <Link to="/cart">Đi tới giỏ hàng →</Link>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ====================================================
                4. SIMILAR PRODUCTS SECTION
                ==================================================== */}
            {similarProducts.length > 0 && (
              <section className="similar-products-section" style={{ marginTop: '72px' }}>
                <div className="section-title-row">
                  <div>
                    <span className="section-eyebrow">KHÁM PHÁ THÊM</span>
                    <h2>Sản phẩm tương tự bạn có thể thích</h2>
                  </div>
                  <Link to="/#collection" className="view-all-link">
                    Xem tất cả bộ sưu tập →
                  </Link>
                </div>

                <div className="similar-products-grid">
                  {similarProducts.map(item => {
                    const itemPrices = (item.variants || [])
                      .filter(v => v.isActive && v.finalPrice != null)
                      .map(v => v.finalPrice!);
                    const minPrice = itemPrices.length ? Math.min(...itemPrices) : item.price;
                    const itemImg = item.images?.[0] || '/products/smartbox-std-front.svg';

                    return (
                      <Link
                        key={item.id}
                        to={`/products/${item.id}`}
                        className="similar-product-card"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      >
                        <div className="card-thumb-wrap">
                          {/^ANCHORBOX/i.test(item.sku ?? '')
                            ? <BoxThumb colorHex={item.variants?.[0]?.colorHex} capacity={item.variants?.[0]?.capacityLiter} />
                            : <img src={itemImg} alt={item.name} loading="lazy" />}
                        </div>
                        <div className="card-body">
                          <h4 className="card-name">{item.name}</h4>
                          <p className="card-desc">
                            {item.description ? item.description.slice(0, 75) + '…' : 'Hộp nhận bưu kiện thông minh.'}
                          </p>
                          <div className="card-footer-price">
                            <span className="price-prefix">Từ</span>
                            <strong className="card-price">{money(minPrice)}</strong>
                          </div>
                          <span className="card-action-text">Xem chi tiết cấu hình →</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

          </>
        )}
      </div>


    </div>
  );
}

export default ProductDetailPage;
