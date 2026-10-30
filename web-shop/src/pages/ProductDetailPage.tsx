import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  ShoppingCart,
  Zap,
  Check,
  Plus,
  Minus,
  Star,
  Lock,
  Cpu,
  Wifi,
  Eye,
  Layers
} from 'lucide-react';
import { shop, money, type CatalogProduct, type Variant } from '../api/shop';
import { availableVariant } from '../api/catalog';
import { useCatalog } from '../CatalogContext';
import { useShop } from '../ShopContext';
import { useResource, ResourceState } from '../components/ShopUi';
import { AppleProductViewer } from '../components/AppleProductViewer';
import '../apple-home.css';
import './product-detail.css';

// Fallback high-quality AnchorBox catalog definitions (resilient when backend is offline or for named slugs)
const FALLBACK_PRODUCTS: Record<string, CatalogProduct> = {
  'anchorbox-base': {
    id: 'anchorbox-base',
    name: 'AnchorBox Base',
    sku: 'ABX-BASE-STD',
    price: 2490000,
    categoryName: 'Hộp nhận bưu kiện thông minh',
    description: 'Thiết kế nhỏ gọn tối giản cho căn hộ và nhà phố. Tích hợp khóa chốt điện tử Solenoid mã hóa AES-256, tạo mã OTP 1 lần cho shipper và điều khiển từ xa qua ứng dụng di động.',
    images: ['/products/smartbox-compact-front.svg', '/products/smartbox-std-inside.svg', '/products/smartbox-std-diagram.svg'],
    isActive: true,
    variants: [
      { id: 'v-base-45', productId: 'anchorbox-base', sku: 'ABX-BASE-45L', variantName: 'AnchorBox Base 45L', size: null, capacityLiter: 45, finalPrice: 2490000, stockQuantity: 28, isActive: true, widthCm: 45, heightCm: 85, depthCm: 38, weightKg: 16.5, maxLoadKg: 40, hasWeightSensor: false, warrantyMonths: 24 },
      { id: 'v-base-75', productId: 'anchorbox-base', sku: 'ABX-BASE-75L', variantName: 'AnchorBox Base 75L', size: null, capacityLiter: 75, finalPrice: 3290000, stockQuantity: 15, isActive: true, widthCm: 50, heightCm: 98, depthCm: 45, weightKg: 19.5, maxLoadKg: 50, hasWeightSensor: false, warrantyMonths: 24 }
    ]
  },
  'anchorbox-pro': {
    id: 'anchorbox-pro',
    name: 'AnchorBox Pro',
    sku: 'ABX-PRO-AI',
    price: 3890000,
    categoryName: 'Hộp nhận bưu kiện thông minh AI',
    description: 'Phiên bản Flagship đột phá tích hợp Camera AI góc siêu rộng 155°, cảm biến cân nặng đa điểm chống tráo hàng và hệ thống đèn LED UV-C tự động khử khuẩn bề mặt bưu phẩm.',
    images: ['/products/smartbox-std-front.svg', '/products/smartbox-std-inside.svg', '/products/smartbox-std-diagram.svg'],
    isActive: true,
    variants: [
      { id: 'v-pro-45', productId: 'anchorbox-pro', sku: 'ABX-PRO-45L', variantName: 'AnchorBox Pro 45L', size: null, capacityLiter: 45, finalPrice: 3890000, stockQuantity: 19, isActive: true, widthCm: 45, heightCm: 85, depthCm: 38, weightKg: 17.5, maxLoadKg: 40, hasWeightSensor: true, warrantyMonths: 24 },
      { id: 'v-pro-75', productId: 'anchorbox-pro', sku: 'ABX-PRO-75L', variantName: 'AnchorBox Pro 75L', size: null, capacityLiter: 75, finalPrice: 4690000, stockQuantity: 34, isActive: true, widthCm: 50, heightCm: 98, depthCm: 45, weightKg: 21.0, maxLoadKg: 60, hasWeightSensor: true, warrantyMonths: 24 },
      { id: 'v-pro-110', productId: 'anchorbox-pro', sku: 'ABX-PRO-110L', variantName: 'AnchorBox Pro 110L Max', size: null, capacityLiter: 110, finalPrice: 5490000, stockQuantity: 11, isActive: true, widthCm: 58, heightCm: 112, depthCm: 50, weightKg: 25.5, maxLoadKg: 80, hasWeightSensor: true, warrantyMonths: 24 }
    ]
  },
  'anchorbox-solar': {
    id: 'anchorbox-solar',
    name: 'AnchorBox Solar Max',
    sku: 'ABX-SOLAR-MAX',
    price: 4990000,
    categoryName: 'Hộp nhận bưu kiện năng lượng mặt trời',
    description: 'Trang bị tấm pin năng lượng mặt trời Monocrystalline trên nóc mái, tự nạp năng lượng ngoài trời liên tục 45 ngày không cần cắm điện. Tương thích chuẩn Matter và Apple HomeKit.',
    images: ['/products/smartbox-promax-front.svg', '/products/smartbox-std-inside.svg', '/products/smartbox-std-diagram.svg'],
    isActive: true,
    variants: [
      { id: 'v-solar-75', productId: 'anchorbox-solar', sku: 'ABX-SOLAR-75L', variantName: 'AnchorBox Solar 75L', size: null, capacityLiter: 75, finalPrice: 4990000, stockQuantity: 18, isActive: true, widthCm: 50, heightCm: 98, depthCm: 45, weightKg: 23.0, maxLoadKg: 60, hasWeightSensor: true, warrantyMonths: 36 },
      { id: 'v-solar-110', productId: 'anchorbox-solar', sku: 'ABX-SOLAR-110L', variantName: 'AnchorBox Solar 110L Extreme', size: null, capacityLiter: 110, finalPrice: 5790000, stockQuantity: 8, isActive: true, widthCm: 58, heightCm: 112, depthCm: 50, weightKg: 27.5, maxLoadKg: 80, hasWeightSensor: true, warrantyMonths: 36 }
    ]
  }
};

interface AccessoryItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  variantName: string;
  image: string;
  price: number;
  originalPrice: number;
  description: string;
}

const ACCESSORY_RECOMMENDATIONS: AccessoryItem[] = [
  {
    id: 'acc-mount',
    productId: 'prod-acc-mount',
    sku: 'SBX-ACC-MOUNT',
    name: 'Chân đế cố định ngoài trời AnchorMount',
    variantName: 'Thép mạ kẽm chống ẩm 15cm',
    image: '/products/accessory-mount.svg',
    price: 290000,
    originalPrice: 350000,
    description: 'Nâng cao đáy hộp 15cm chống ngập úng, kèm bu-lông nở bắt sàn bê tông.',
  },
  {
    id: 'acc-keypad',
    productId: 'prod-acc-keypad',
    sku: 'SBX-ACC-KEYPAD',
    name: 'Bàn phím mã số cảm ứng & Thẻ từ NFC',
    variantName: 'Phụ kiện mở khóa Pro',
    image: '/products/accessory-keypad.svg',
    price: 390000,
    originalPrice: 450000,
    description: 'Nhập mã trực tiếp trên tủ hoặc quẹt thẻ từ NFC cho người nhà.',
  },
  {
    id: 'acc-camera',
    productId: 'prod-acc-camera',
    sku: 'SBX-ACC-CAM',
    name: 'Camera an ninh mini AI góc rộng 2K',
    variantName: 'Gắn nóc khoang tủ chống nước',
    image: '/products/accessory-camera.svg',
    price: 550000,
    originalPrice: 650000,
    description: 'Tự động chụp ảnh bưu kiện khi nắp mở, lưu trữ đám mây bảo mật.',
  },
];

export function ProductDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { add } = useShop();
  const catalog = useCatalog();

  // Mode Switch: Studio Photography vs Interactive 3D 360° Stage
  const [displayMode, setDisplayMode] = useState<'studio' | '3d'>('studio');

  // Selected variant & quantity
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');

  // Apple Configuration Selector States (Pills bo tròn với micro-animations)
  const [selectedCapacity, setSelectedCapacity] = useState<number>(75);
  const [selectedColor, setSelectedColor] = useState<{ id: string; name: string; hex: string }>({
    id: 'space-gray',
    name: 'Xám Không Gian (Space Gray)',
    hex: '#4b4846'
  });
  const [selectedSensorPack, setSelectedSensorPack] = useState<{ id: string; name: string; addPrice: number }>({
    id: 'smart',
    name: 'Nâng cao (Cảm biến cân nặng đa điểm ±5g)',
    addPrice: 590000
  });

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

  // Interactive Gallery & Zoom State
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomCoords, setZoomCoords] = useState({ x: 50, y: 50 });
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxScale, setLightboxScale] = useState(1);
  const zoomContainerRef = useRef<HTMLDivElement>(null);

  // Recommendations / Frequently bought together
  const [checkedAccessories, setCheckedAccessories] = useState<Record<string, boolean>>({
    'acc-mount': true,
    'acc-keypad': false,
    'acc-camera': false,
  });

  // Reset when ID changes
  useEffect(() => {
    setSelectedVariantId('');
    setQuantity(1);
    setMessage('');
    setActiveImageIndex(0);
    setIsLightboxOpen(false);
    setLightboxScale(1);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [id]);

  // Load product resource with fallback resilience
  const resource = useResource(async signal => {
    try {
      const p = await shop.product(id, signal);
      if (p && p.isActive) return [p];
    } catch {
      // Fallback below
    }

    // Match fallback product by slug or default to AnchorBox Pro
    const fallback = FALLBACK_PRODUCTS[id] || (id.includes('base') ? FALLBACK_PRODUCTS['anchorbox-base'] : id.includes('solar') ? FALLBACK_PRODUCTS['anchorbox-solar'] : FALLBACK_PRODUCTS['anchorbox-pro']);
    return [fallback];
  }, `product-detail-${id}`);

  const product = resource.data?.find(p => p.id === id) || resource.data?.[0];
  const variant = availableVariant(product, selectedVariantId) || product?.variants?.[0];

  // Sync capacity from variant if available
  useEffect(() => {
    if (variant?.capacityLiter) {
      setSelectedCapacity(variant.capacityLiter);
    }
  }, [variant?.capacityLiter]);

  // Build image list: variant images or product images, fallback with standard vector SVGs
  const galleryImages = useMemo(() => {
    const images: { src: string; label: string }[] = [];
    if (variant?.images?.length) {
      variant.images.forEach((src, i) => images.push({ src, label: `Góc chụp ${i + 1}` }));
    } else if (product?.images?.length) {
      product.images.forEach((src, i) => images.push({ src, label: `Ảnh sản phẩm ${i + 1}` }));
    }

    if (images.length === 0) {
      images.push({ src: '/products/smartbox-std-front.svg', label: 'Góc diện mạo trước' });
      images.push({ src: '/products/smartbox-std-inside.svg', label: 'Khoang chứa bên trong' });
      images.push({ src: '/products/smartbox-std-diagram.svg', label: 'Bản vẽ kỹ thuật' });
    } else if (images.length === 1) {
      images.push({ src: '/products/smartbox-std-inside.svg', label: 'Khoang chứa bên trong' });
      images.push({ src: '/products/smartbox-std-diagram.svg', label: 'Bản vẽ kỹ thuật' });
    }
    return images;
  }, [product, variant]);

  const currentImage = galleryImages[activeImageIndex] || galleryImages[0] || { src: '', label: '' };

  // Calculate dynamic configured price
  const configuredPrice = useMemo(() => {
    const base = variant?.finalPrice || product?.price || 3890000;
    return base + selectedSensorPack.addPrice;
  }, [variant?.finalPrice, product?.price, selectedSensorPack.addPrice]);

  // Similar products from catalog
  const similarProducts = useMemo(() => {
    if (!catalog.data) return [];
    return catalog.data
      .filter(p => p.id !== product?.id && p.isActive)
      .slice(0, 3);
  }, [catalog.data, product?.id]);

  // Handle Zoom lens movement
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomContainerRef.current) return;
    const rect = zoomContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomCoords({ x, y });
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      if (e.key === 'Escape') setIsLightboxOpen(false);
      if (e.key === 'ArrowRight') setActiveImageIndex(prev => (prev + 1) % galleryImages.length);
      if (e.key === 'ArrowLeft') setActiveImageIndex(prev => (prev - 1 + galleryImages.length) % galleryImages.length);
      if (e.key === '+') setLightboxScale(s => Math.min(s + 0.5, 3.5));
      if (e.key === '-') setLightboxScale(s => Math.max(s - 0.5, 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, galleryImages.length]);

  // Add single variant to cart
  const handleAddToCart = () => {
    if (!variant || !product) return;
    const customVariant: Variant = {
      ...variant,
      variantName: `${variant.variantName || product.name} · ${selectedCapacity}L · ${selectedColor.name} · ${selectedSensorPack.name}`,
      finalPrice: configuredPrice
    };
    add(customVariant, product.name, quantity);
    setMessage(`Đã thêm ${quantity} × ${product.name} (${selectedCapacity}L, ${selectedColor.name}) vào giỏ hàng.`);
  };

  // Buy now (add to cart and redirect)
  const handleBuyNow = () => {
    if (!variant || !product) return;
    const customVariant: Variant = {
      ...variant,
      variantName: `${variant.variantName || product.name} · ${selectedCapacity}L · ${selectedColor.name} · ${selectedSensorPack.name}`,
      finalPrice: configuredPrice
    };
    add(customVariant, product.name, quantity);
    navigate('/cart');
  };

  // Color options
  const colorOptions = [
    { id: 'space-gray', name: 'Xám Không Gian (Space Gray)', hex: '#4b4846' },
    { id: 'obsidian-black', name: 'Đen Huyền Bí (Obsidian Black)', hex: '#1d1d1f' },
    { id: 'titanium-silver', name: 'Bạc Titan (Titanium Silver)', hex: '#d1d1d6' },
    { id: 'polar-white', name: 'Trắng Tinh Khiết (Polar White)', hex: '#f5f5f7' }
  ];

  // Sensor package options
  const sensorPackOptions = [
    { id: 'basic', name: 'Cơ bản (Khóa Solenoid + OTP)', addPrice: 0, tag: 'TIÊU CHUẨN' },
    { id: 'smart', name: 'Nâng cao (Cân đa điểm ±5g)', addPrice: 590000, tag: 'KHUYÊN DÙNG' },
    { id: 'promax', name: 'Pro Max AI (Camera 1080p + UV-C + Cân)', addPrice: 1390000, tag: 'TOÀN DIỆN' }
  ];

  // Capacity options
  const capacityOptions = [
    { liters: 45, label: '45L Tiêu chuẩn', sub: 'Nhỏ gọn cho căn hộ & nhà phố' },
    { liters: 75, label: '75L Bán chạy nhất', sub: 'Kích thước tối ưu cho gia đình' },
    { liters: 110, label: '110L Cực đại', sub: 'Chứa bưu kiện lớn cho biệt thự' }
  ];

  return (
    <div className="product-detail-page apple-product-detail-root">
      
      {/* Top Apple Minimalist Breadcrumb Bar */}
      <div className="detail-breadcrumb-bar">
        <div className="apple-detail-container">
          <nav className="detail-breadcrumb" aria-label="Đường dẫn trang">
            <Link to="/">Trang chủ</Link>
            <span className="sep">/</span>
            <Link to="/#collection">Sản phẩm AnchorBox</Link>
            <span className="sep">/</span>
            <span className="current">{product ? product.name : 'Chi tiết thiết bị'}</span>
          </nav>
        </div>
      </div>

      <div className="apple-detail-container">
        <ResourceState {...resource} />

        {product && (
          <>
            {/* ====================================================
                1. TOP PRODUCT SHOWCASE & CONFIGURATOR GRID
                ==================================================== */}
            <div className="detail-hero-grid" style={{ alignItems: 'start', marginTop: '24px' }}>
              
              {/* LEFT COLUMN: Frameless Edge-to-Edge Studio Gallery & 3D Stage */}
              <div className="detail-gallery-column">
                
                {/* Switcher: 📸 Ảnh Studio vs 🔄 Trình diễn 3D 360° & Hotspots */}
                <div className="apple-gallery-mode-switch">
                  <button
                    type="button"
                    className={`apple-mode-switch-btn ${displayMode === 'studio' ? 'is-active' : ''}`}
                    onClick={() => setDisplayMode('studio')}
                  >
                    <Eye size={15} />
                    <span>Ảnh chụp Studio</span>
                  </button>
                  <button
                    type="button"
                    className={`apple-mode-switch-btn ${displayMode === '3d' ? 'is-active' : ''}`}
                    onClick={() => setDisplayMode('3d')}
                  >
                    <Layers size={15} />
                    <span>Trình diễn 3D 360° & Điểm chạm</span>
                  </button>
                </div>

                {displayMode === 'studio' ? (
                  <div className="gallery-sticky-wrapper">
                    {/* Edge-to-Edge Frameless Studio Lighting Showcase */}
                    <div
                      ref={zoomContainerRef}
                      className={`apple-gallery-showcase ${isZooming ? 'is-zooming' : ''}`}
                      onMouseEnter={() => setIsZooming(true)}
                      onMouseLeave={() => setIsZooming(false)}
                      onMouseMove={handleMouseMove}
                      onClick={() => setIsLightboxOpen(true)}
                      role="button"
                      tabIndex={0}
                      aria-label="Click để xem ảnh toàn màn hình"
                    >
                      <img
                        src={currentImage.src}
                        alt={product.name}
                        className="apple-gallery-img"
                        style={{
                          transformOrigin: `${zoomCoords.x}% ${zoomCoords.y}%`,
                          transform: isZooming ? 'scale(2.1)' : 'scale(1)',
                        }}
                        loading="eager"
                        onError={e => {
                          (e.target as HTMLImageElement).src = '/products/smartbox-std-front.svg';
                        }}
                      />

                      {/* Floating Apple Badges on Image */}
                      <div className="gallery-floating-tags">
                        <span className="tag-brand">ANCHORBOX CHÍNH HÃNG</span>
                        <span className="tag-sensor">ÁNH SÁNG STUDIO CHUẨN XÁC</span>
                      </div>

                      {/* Fullscreen Button */}
                      <button
                        type="button"
                        className="gallery-zoom-button"
                        onClick={e => {
                          e.stopPropagation();
                          setIsLightboxOpen(true);
                        }}
                        title="Xem toàn màn hình"
                        aria-label="Phóng to ảnh"
                      >
                        <Maximize2 size={16} />
                        <span>Phóng to</span>
                      </button>

                      {!isZooming && (
                        <div className="gallery-zoom-cue">
                          <ZoomIn size={14} />
                          <span>Di chuột để soi chi tiết</span>
                        </div>
                      )}
                    </div>

                    {/* Floating Thumbnail Capsules */}
                    {galleryImages.length > 1 && (
                      <div className="apple-gallery-thumb-bar" role="tablist" aria-label="Góc chụp ảnh">
                        {galleryImages.map((img, idx) => (
                          <button
                            key={idx}
                            type="button"
                            role="tab"
                            aria-selected={activeImageIndex === idx}
                            className={`apple-gallery-thumb-pill ${activeImageIndex === idx ? 'is-active' : ''}`}
                            onClick={() => {
                              setActiveImageIndex(idx);
                              setIsZooming(false);
                            }}
                          >
                            <img
                              src={img.src}
                              alt={img.label}
                              onError={e => {
                                (e.target as HTMLImageElement).src = '/products/smartbox-std-front.svg';
                              }}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* 3D 360° Luxury Pedestal Showcase with Interactive Hotspots */
                  <AppleProductViewer
                    model={product.id.includes('solar') ? 'solar' : product.id.includes('base') ? 'base' : 'pro'}
                    capacity={selectedCapacity}
                    showHotspots={true}
                  />
                )}

                {/* Assurance Trust Grid beneath Image */}
                <div className="gallery-compact-desc-card" style={{ marginTop: '20px' }}>
                  <div className="compact-assurance-grid">
                    <div className="assurance-item">
                      <Truck size={17} className="item-icon" />
                      <div>
                        <strong>Giao & Khảo sát tận nơi</strong>
                        <p>Kỹ thuật viên chuyên nghiệp lắp đặt an toàn</p>
                      </div>
                    </div>
                    <div className="assurance-item">
                      <ShieldCheck size={17} className="item-icon" />
                      <div>
                        <strong>Bảo hành 24 tháng</strong>
                        <p>Đổi mới linh kiện chính hãng tại nhà</p>
                      </div>
                    </div>
                    <div className="assurance-item">
                      <RotateCcw size={17} className="item-icon" />
                      <div>
                        <strong>30 ngày đổi trả</strong>
                        <p>Nếu có lỗi kỹ thuật từ nhà sản xuất</p>
                      </div>
                    </div>
                    <div className="assurance-item">
                      <CheckCircle2 size={17} className="item-icon" />
                      <div>
                        <strong>Đồng kiểm bưu kiện</strong>
                        <p>Thử nghiệm khóa mở nắp trước khi thanh toán</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: Apple Style Configurator & Purchase Actions */}
              <div className="detail-buy-column">
                <div className="product-summary-block">
                  
                  {/* Category Chip & Rating */}
                  <div className="product-meta-top">
                    <span className="category-pill">{product.categoryName || 'Thiết bị nhận hàng thông minh'}</span>
                    <div className="rating-pill">
                      <div className="stars" aria-hidden="true">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} size={14} fill="#eab308" color="#eab308" />
                        ))}
                      </div>
                      <span className="rating-text">5.0 (32 đánh giá chính hãng)</span>
                    </div>
                  </div>

                  <h1 className="product-title">{product.name}</h1>
                  <p style={{ color: '#6e6e73', fontSize: '15px', lineHeight: 1.5, margin: '0 0 20px' }}>
                    {product.description}
                  </p>

                  {/* Configured Price Display */}
                  <div className="product-price-section" style={{ marginBottom: '28px' }}>
                    <div className="price-main-row">
                      <span className="current-price">{money(configuredPrice)}</span>
                      <span className="reference-price">{money(Math.round(configuredPrice * 1.15))}</span>
                      <span className="saving-badge">TIẾT KIỆM 15%</span>
                    </div>
                    <p className="vat-notice">Giá đã bao gồm thuế VAT & Miễn phí vận chuyển toàn quốc</p>
                  </div>

                  {/* ====================================================
                      CONFIGURATION SELECTOR (PILLS BO TRÒN VỚI MICRO-ANIMATIONS)
                      ==================================================== */}
                  
                  {/* DIMENSION 1: DUNG TÍCH (CAPACITY) */}
                  <div className="apple-config-group">
                    <div className="apple-config-label-row">
                      <span className="apple-config-title">1. Chọn Dung tích khoang chứa:</span>
                      <span className="apple-config-value-badge">{selectedCapacity} Lít</span>
                    </div>
                    <div className="apple-config-pills-grid" role="radiogroup" aria-label="Dung tích khoang">
                      {capacityOptions.map(cap => {
                        const isSelected = selectedCapacity === cap.liters;
                        return (
                          <button
                            key={cap.liters}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            className={`apple-config-pill ${isSelected ? 'is-active' : ''}`}
                            onClick={() => {
                              setSelectedCapacity(cap.liters);
                              // Sync variant matching capacity if available
                              const matched = product.variants?.find(v => v.capacityLiter === cap.liters);
                              if (matched) setSelectedVariantId(matched.id);
                            }}
                          >
                            <span>{cap.label}</span>
                            {isSelected && <Check size={14} color="#0071e3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* DIMENSION 2: MÀU SẮC (FINISH / COLORS) */}
                  <div className="apple-config-group">
                    <div className="apple-config-label-row">
                      <span className="apple-config-title">2. Chọn Màu sắc kim loại:</span>
                      <span className="apple-config-value-badge">{selectedColor.name}</span>
                    </div>
                    <div className="apple-config-pills-grid" role="radiogroup" aria-label="Màu sắc hoàn thiện">
                      {colorOptions.map(color => {
                        const isSelected = selectedColor.id === color.id;
                        return (
                          <button
                            key={color.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            className={`apple-config-pill ${isSelected ? 'is-active' : ''}`}
                            onClick={() => setSelectedColor(color)}
                          >
                            <span
                              className="apple-color-swatch-circle"
                              style={{ background: color.hex }}
                            />
                            <span>{color.name.split(' ')[0]} {color.name.split(' ')[1]}</span>
                            {isSelected && <Check size={14} color="#0071e3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* DIMENSION 3: GÓI CẢM BIẾN & CÔNG NGHỆ */}
                  <div className="apple-config-group">
                    <div className="apple-config-label-row">
                      <span className="apple-config-title">3. Chọn Gói Cảm biến & Công nghệ:</span>
                      <span className="apple-config-value-badge">
                        {selectedSensorPack.addPrice > 0 ? `+${money(selectedSensorPack.addPrice)}` : 'Đã bao gồm'}
                      </span>
                    </div>
                    <div className="apple-config-pills-grid" role="radiogroup" aria-label="Gói công nghệ">
                      {sensorPackOptions.map(pack => {
                        const isSelected = selectedSensorPack.id === pack.id;
                        return (
                          <button
                            key={pack.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            className={`apple-config-pill ${isSelected ? 'is-active' : ''}`}
                            onClick={() => setSelectedSensorPack(pack)}
                          >
                            <Cpu size={14} color={isSelected ? '#0071e3' : '#a1a1a6'} />
                            <span>{pack.name}</span>
                            {isSelected && <Check size={14} color="#0071e3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stock Status Bar */}
                  <div className="stock-status-bar" style={{ margin: '20px 0' }}>
                    <div className="in-stock-alert">
                      <span className="stock-dot pulse" />
                      <span>
                        Sản phẩm chính hãng sẵn sàng giao — <strong>Giao hàng hỏa tốc trong 24 giờ</strong>
                      </span>
                    </div>
                  </div>

                  {/* Quantity & Apple Purchase Actions */}
                  <div className="purchase-action-container">
                    <div className="quantity-selection-row" style={{ marginBottom: '16px' }}>
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
                          max={99}
                          value={quantity}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) setQuantity(Math.max(1, Math.min(val, 99)));
                          }}
                          className="qty-input"
                          aria-label="Số lượng muốn mua"
                        />
                        <button
                          type="button"
                          className="step-btn"
                          disabled={quantity >= 99}
                          onClick={() => setQuantity(q => q + 1)}
                          aria-label="Tăng số lượng"
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Apple Style Action Buttons */}
                    <div className="action-button-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <button
                        type="button"
                        id="product-buy"
                        className="apple-btn-buy"
                        style={{ padding: '14px 20px', fontSize: '15px' }}
                        onClick={handleAddToCart}
                      >
                        <ShoppingCart size={17} />
                        <span>Thêm vào giỏ hàng</span>
                      </button>

                      <button
                        type="button"
                        className="apple-btn-primary"
                        style={{ justifyContent: 'center', padding: '14px 20px', fontSize: '15px' }}
                        onClick={handleBuyNow}
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

                  {/* Security Trust Micro Bar */}
                  <div className="detail-security-bar" style={{ marginTop: '20px' }}>
                    <div className="sec-item">
                      <Lock size={15} />
                      <span>Thanh toán mã hóa bảo mật</span>
                    </div>
                    <div className="sec-item">
                      <Wifi size={15} />
                      <span>Kết nối ứng dụng iOS & Android trọn đời</span>
                    </div>
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
                <h2>Thông số kỹ thuật toàn diện</h2>
              </div>

              <div className="apple-flat-accordion" role="region" aria-label="Bảng thông số kỹ thuật accordion">
                
                {/* Accordion 1: Kích thước & Thiết kế khoang chứa */}
                <div className={`apple-accordion-item ${openAccordions.dimensions ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    className="apple-accordion-trigger"
                    onClick={() => toggleAccordion('dimensions')}
                    aria-expanded={openAccordions.dimensions}
                  >
                    <span className="apple-accordion-title">Kích thước & Thiết kế khoang chứa</span>
                    <span className="apple-accordion-icon">
                      <ChevronDown size={17} />
                    </span>
                  </button>
                  {openAccordions.dimensions && (
                    <div className="apple-accordion-body">
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Dung tích khoang thực tế</span>
                        <span className="apple-spec-val">{selectedCapacity} Lít (Cấu hình đang chọn)</span>
                      </div>
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Kích thước phủ bì (R × C × S)</span>
                        <span className="apple-spec-val">
                          {selectedCapacity === 45
                            ? '45 × 85 × 38 cm'
                            : selectedCapacity === 110
                            ? '58 × 112 × 50 cm'
                            : '50 × 98 × 45 cm'}
                        </span>
                      </div>
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Khối lượng tịnh vỏ hộp</span>
                        <span className="apple-spec-val">{selectedCapacity === 45 ? '16.5 kg' : selectedCapacity === 110 ? '25.5 kg' : '20.0 kg'}</span>
                      </div>
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Tải trọng chứa bưu phẩm</span>
                        <span className="apple-spec-val">Lên tới 60 kg (Gia cường thanh giằng thép chịu lực)</span>
                      </div>
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Lớp đệm đáy khoang</span>
                        <span className="apple-spec-val">Đệm cao su EVA dày 8mm giảm chấn chống trầy xước bưu phẩm</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Accordion 2: Hệ thống Khóa & Cơ chế Bảo mật */}
                <div className={`apple-accordion-item ${openAccordions.security ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    className="apple-accordion-trigger"
                    onClick={() => toggleAccordion('security')}
                    aria-expanded={openAccordions.security}
                  >
                    <span className="apple-accordion-title">Hệ thống Khóa & Cơ chế Bảo mật</span>
                    <span className="apple-accordion-icon">
                      <ChevronDown size={17} />
                    </span>
                  </button>
                  {openAccordions.security && (
                    <div className="apple-accordion-body">
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Ngàm khóa cơ điện</span>
                        <span className="apple-spec-val">Khóa Solenoid hợp kim chịu lực kéo va đập 250kg</span>
                      </div>
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Chuẩn mã hóa vi xử lý</span>
                        <span className="apple-spec-val">256-bit AES tiêu chuẩn ngân hàng chống sao chép</span>
                      </div>
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Phương thức mở khóa</span>
                        <span className="apple-spec-val">Mã OTP 1 lần shipper, Mở từ xa qua App, Chìa cơ khẩn cấp</span>
                      </div>
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Cảnh báo chống cạy phá</span>
                        <span className="apple-spec-val">Còi báo động 90dB & Tự động đẩy thông báo khẩn về điện thoại</span>
                      </div>
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Trợ lực pít-tông nâng hạ</span>
                        <span className="apple-spec-val">Pít-tông thủy lực kép nâng mở êm ái chống kẹp tay</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Accordion 3: Cảm biến IoT & Trí tuệ nhân tạo (AI) */}
                <div className={`apple-accordion-item ${openAccordions.sensors ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    className="apple-accordion-trigger"
                    onClick={() => toggleAccordion('sensors')}
                    aria-expanded={openAccordions.sensors}
                  >
                    <span className="apple-accordion-title">Cảm biến IoT & Trí tuệ nhân tạo (AI)</span>
                    <span className="apple-accordion-icon">
                      <ChevronDown size={17} />
                    </span>
                  </button>
                  {openAccordions.sensors && (
                    <div className="apple-accordion-body">
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Cảm biến trọng lượng</span>
                        <span className="apple-spec-val">4 điểm Load-cell HX711 chuẩn xác ±5g chống tráo ruột</span>
                      </div>
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Camera nhận diện AI</span>
                        <span className="apple-spec-val">Full HD 1080p góc rộng 155° HDR, Night Vision hồng ngoại</span>
                      </div>
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Cảm biến tiệm cận người</span>
                        <span className="apple-spec-val">PIR góc quét 120° phát hiện chuyển động trong bán kính 2m</span>
                      </div>
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Khử trùng vi khuẩn UV-C</span>
                        <span className="apple-spec-val">Đèn LED UV-C 254nm tự động kích hoạt khử trùng 3 phút</span>
                      </div>
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Quạt đối lưu vi khí hậu</span>
                        <span className="apple-spec-val">Tự kích hoạt khi độ ẩm khoang vượt 65% RH chống ẩm mốc</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Accordion 4: Năng lượng & Kết nối không dây */}
                <div className={`apple-accordion-item ${openAccordions.connectivity ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    className="apple-accordion-trigger"
                    onClick={() => toggleAccordion('connectivity')}
                    aria-expanded={openAccordions.connectivity}
                  >
                    <span className="apple-accordion-title">Năng lượng & Kết nối không dây</span>
                    <span className="apple-accordion-icon">
                      <ChevronDown size={17} />
                    </span>
                  </button>
                  {openAccordions.connectivity && (
                    <div className="apple-accordion-body">
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Pin dự phòng tích hợp</span>
                        <span className="apple-spec-val">Pin sạc Lithium 10.000mAh duy trì vận hành 45 ngày</span>
                      </div>
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Tấm pin năng lượng mặt trời</span>
                        <span className="apple-spec-val">Monocrystalline 15W tích hợp trên nóc mái tự sạc liên tục</span>
                      </div>
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Chuẩn nhà thông minh</span>
                        <span className="apple-spec-val">Matter Certified & Mạng lưới Thread thế hệ mới</span>
                      </div>
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Kết nối không dây</span>
                        <span className="apple-spec-val">Wi-Fi 6 (2.4GHz / 5GHz) & Bluetooth 5.3 Low Energy</span>
                      </div>
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Tương thích ứng dụng</span>
                        <span className="apple-spec-val">Apple HomeKit (Apple Home), Google Home, AnchorBox App</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Accordion 5: Độ bền vật liệu & Chính sách bảo hành */}
                <div className={`apple-accordion-item ${openAccordions.durability ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    className="apple-accordion-trigger"
                    onClick={() => toggleAccordion('durability')}
                    aria-expanded={openAccordions.durability}
                  >
                    <span className="apple-accordion-title">Độ bền vật liệu & Chính sách bảo hành</span>
                    <span className="apple-accordion-icon">
                      <ChevronDown size={17} />
                    </span>
                  </button>
                  {openAccordions.durability && (
                    <div className="apple-accordion-body">
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Vật liệu cấu thành</span>
                        <span className="apple-spec-val">Thép tấm mạ kẽm cường độ cao dày 1.5mm chống va đập</span>
                      </div>
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Xử lý bề mặt</span>
                        <span className="apple-spec-val">Sơn tĩnh điện AkzoNobel 3 lớp kháng tia cực tím UV và mưa muối</span>
                      </div>
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Chuẩn kháng thời tiết</span>
                        <span className="apple-spec-val">IP65 Outdoor (Kháng bụi tuyệt đối & chịu mưa bão trực tiếp)</span>
                      </div>
                      <div className="apple-spec-row">
                        <span className="apple-spec-key">Thời hạn bảo hành</span>
                        <span className="apple-spec-val">24 tháng chính hãng · Đổi mới linh kiện tại nhà</span>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </section>

            {/* ====================================================
                3. FREQUENTLY BOUGHT TOGETHER COMBO RECOMMENDATIONS
                ==================================================== */}
            <section className="recommendation-bundle-section" style={{ marginTop: '72px' }}>
              <div className="bundle-heading">
                <div className="bundle-badge">
                  <Zap size={16} />
                  <span>COMBO TIẾT KIỆM CHÍNH HÃNG</span>
                </div>
                <h2>Thường được mua cùng</h2>
                <p className="bundle-sub">
                  Trang bị thêm phụ kiện chính hãng để tối ưu khả năng bảo vệ bưu kiện và tiện nghi mở khóa ngoài trời.
                </p>
              </div>

              <div className="bundle-card-container">
                <div className="bundle-items-flow">
                  {/* Main Product */}
                  <div className="bundle-item-card is-main">
                    <div className="bundle-item-checkbox">
                      <input type="checkbox" checked disabled readOnly aria-label="Sản phẩm chính" />
                    </div>
                    <div className="bundle-img-wrap">
                      <img
                        src={currentImage.src}
                        alt={product.name}
                        onError={e => {
                          (e.target as HTMLImageElement).src = '/products/smartbox-std-front.svg';
                        }}
                      />
                    </div>
                    <div className="bundle-info">
                      <span className="bundle-badge-main">Thiết bị chính</span>
                      <h4>{product.name} ({selectedCapacity}L)</h4>
                      <span className="bundle-price">{money(configuredPrice)}</span>
                    </div>
                  </div>

                  <span className="bundle-plus-sign" aria-hidden="true">+</span>

                  {/* Recommended Accessories */}
                  {ACCESSORY_RECOMMENDATIONS.map(acc => (
                    <div
                      key={acc.id}
                      className={`bundle-item-card ${checkedAccessories[acc.id] ? 'is-checked' : ''}`}
                      onClick={() =>
                        setCheckedAccessories(prev => ({
                          ...prev,
                          [acc.id]: !prev[acc.id]
                        }))
                      }
                    >
                      <div className="bundle-item-checkbox">
                        <input
                          type="checkbox"
                          checked={!!checkedAccessories[acc.id]}
                          onChange={() => {}}
                          aria-label={acc.name}
                        />
                      </div>
                      <div className="bundle-img-wrap">
                        <img src={acc.image} alt={acc.name} />
                      </div>
                      <div className="bundle-info">
                        <h4>{acc.name}</h4>
                        <span className="bundle-variant-tag">{acc.variantName}</span>
                        <div className="bundle-prices-row">
                          <span className="bundle-price">{money(acc.price)}</span>
                          <span className="bundle-orig-price">{money(acc.originalPrice)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

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
                          <img
                            src={itemImg}
                            alt={item.name}
                            loading="lazy"
                            onError={e => {
                              (e.target as HTMLImageElement).src = '/products/smartbox-std-front.svg';
                            }}
                          />
                          <span className="card-cat-badge">{item.categoryName || 'AnchorBox'}</span>
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

      {/* FULLSCREEN LIGHTBOX MODAL WITH ZOOM CONTROLS */}
      {isLightboxOpen && (
        <div
          className="lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh phóng to"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="lightbox-modal" onClick={e => e.stopPropagation()}>
            <div className="lightbox-toolbar">
              <span className="lightbox-counter">
                {activeImageIndex + 1} / {galleryImages.length} — {currentImage.label}
              </span>

              <div className="lightbox-actions">
                <button
                  type="button"
                  className="tb-btn"
                  title="Phóng to (+)"
                  onClick={() => setLightboxScale(s => Math.min(s + 0.5, 3.5))}
                >
                  <ZoomIn size={20} />
                </button>
                <button
                  type="button"
                  className="tb-btn"
                  title="Thu nhỏ (-)"
                  disabled={lightboxScale <= 1}
                  onClick={() => setLightboxScale(s => Math.max(s - 0.5, 1))}
                >
                  <ZoomOut size={20} />
                </button>
                <button
                  type="button"
                  className="tb-btn"
                  title="Đặt lại tỉ lệ (100%)"
                  onClick={() => setLightboxScale(1)}
                >
                  100%
                </button>
                <button
                  type="button"
                  className="tb-btn close-btn"
                  title="Đóng cửa sổ (ESC)"
                  onClick={() => setIsLightboxOpen(false)}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            <div className="lightbox-viewport">
              {galleryImages.length > 1 && (
                <button
                  type="button"
                  className="lightbox-nav-btn prev"
                  title="Ảnh trước"
                  onClick={() => {
                    setActiveImageIndex(prev => (prev - 1 + galleryImages.length) % galleryImages.length);
                    setLightboxScale(1);
                  }}
                >
                  <ChevronLeft size={28} />
                </button>
              )}

              <div className="lightbox-image-container">
                <img
                  src={currentImage.src}
                  alt={currentImage.label}
                  className="lightbox-img"
                  style={{ transform: `scale(${lightboxScale})` }}
                  onError={e => {
                    (e.target as HTMLImageElement).src = '/products/smartbox-std-front.svg';
                  }}
                />
              </div>

              {galleryImages.length > 1 && (
                <button
                  type="button"
                  className="lightbox-nav-btn next"
                  title="Ảnh kế tiếp"
                  onClick={() => {
                    setActiveImageIndex(prev => (prev + 1) % galleryImages.length);
                    setLightboxScale(1);
                  }}
                >
                  <ChevronRight size={28} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductDetailPage;
