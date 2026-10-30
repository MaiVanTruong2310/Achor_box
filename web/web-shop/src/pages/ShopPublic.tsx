import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { shop, money, type CatalogProduct } from '../api/shop';
import { useCatalog } from '../CatalogContext';
import { availableVariant, canBuy, modelOf } from '../api/catalog';
import { useShop } from '../ShopContext';
import { ErrorNotice, useResource, ResourceState } from '../components/ShopUi';
import { ProductViewer } from '../components/MarketingMotion';
import { PhoneConcept } from './ShopStories';
import { EditionStory, HeroDetails, TechnologyStory } from '../components/ProductStory';
import './compare-apple.css';
export const Viewer = ProductViewer;
const productLabel = (product: CatalogProduct) => product.name?.trim() || product.sku || 'Sản phẩm chưa có tên';
export function Home() {
    return <>
  <section className="hero container"><div className="hero-glow" aria-hidden="true" /><div className="hero-copy"><p className="eyebrow">TỦ GIAO NHẬN BƯU KIỆN TỰ ĐỘNG. ANCHORBOX.</p><h1>Một nơi an tâm.<br />Cho mỗi<br />{' '}<em>bưu kiện.</em></h1><p className="lead">Khám phá hộp nhận hàng thông minh.<br />Từ khóa điện tử đến kết nối IoT.</p><div className="actions"><a className="button" href="#choose">Khám phá phiên bản ↗</a><Link to="/#how">Cách hoạt động ↓</Link></div><HeroDetails /></div><Viewer /><a className="scroll-cue" href="#technology"><span aria-hidden="true">↓</span> MỘT TRẢI NGHIỆM KẾT NỐI</a></section>
  <LockStory />
  <section id="technology" className="container section tech-showcase"><div className="technology-heading"><div><p className="eyebrow">CÁCH ANCHORBOX HOẠT ĐỘNG</p><h2>Điều khiển khóa<br />qua kết nối IoT.</h2></div><p className="lead">Lệnh được gửi qua MQTT tới ESP32. Thiết bị phản hồi để bạn kiểm tra trạng thái cửa và khóa.</p></div><TechnologyStory /></section>
  <section id="choose" className="container section"><div className="section-heading"><p className="eyebrow">TÌM PHIÊN BẢN CỦA BẠN</p><h2>Cùng một ý tưởng.<br />Hai trải nghiệm.</h2><p className="muted">Chọn dòng sản phẩm và dung tích phù hợp với nhu cầu của bạn.</p></div><EditionStory /><HomeConfigurator /><Catalog embedded/><Link className="text-link" to="/compare">So sánh Base / Pro ↗</Link></section>
  <section id="how" className="container section"><p className="eyebrow">TỪ LỰA CHỌN ĐẾN SỬ DỤNG</p><h2>Được giao. Được lắp.<br />Được kiểm tra.</h2><Journey /><Link className="text-link" to="/how-it-works">Tìm hiểu quy trình ↗</Link></section>
  <section id="app" className="container section split app-story"><PhoneConcept /><div><p className="eyebrow">MỘT HỆ SINH THÁI KẾT NỐI</p><h2>AnchorBox.<br />Trong tầm tay.</h2><p className="lead">Theo dõi thiết bị, điều khiển khóa và nhận thông báo bưu kiện.</p><p className="muted">Ứng dụng đang chuẩn bị. Hình bên cạnh là concept thiết kế.</p><Link className="button secondary" to="/account/orders">Mở tài khoản trên website</Link><Link className="text-link" to="/app">Tìm hiểu ứng dụng ↗</Link></div></section><section id="faq" className="container section"><Faq embedded/></section>
    </>;
}
function LockStory() {
    const [active, setActive] = useState(false);
    const [step, setStep] = useState(0);
    useEffect(() => {
      const section = document.getElementById('lock-story'); if (!section) return;
      const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting) setActive(true); }, { threshold: 0.3 });
      observer.observe(section); return () => observer.disconnect();
    }, []);
    const stages = [['Gửi lệnh', 'Yêu cầu được gửi qua MQTT tới thiết bị. Đây chưa phải kết quả thao tác vật lý.'], ['Nhận ACK', 'Thiết bị phản hồi theo commandId. Giao diện theo dõi ACK hoặc lỗi / hết thời gian.'], ['Đối chiếu trạng thái', 'Dữ liệu cửa / khóa mới được đối chiếu với phản hồi lệnh để biết trạng thái thực tế.']];
    return <section id="lock-story" className="container section split lock-story"><div><p className="eyebrow">TRẠNG THÁI RÕ RÀNG</p><h2>Một thao tác.<br />Một chuỗi phản hồi.</h2><div className="story-tabs" role="group" aria-label="Khám phá quá trình điều khiển">{stages.map(([title], index) => <button key={title} aria-pressed={step === index} onClick={() => setStep(index)}>{String(index + 1).padStart(2, '0')} · {title}</button>)}</div><p key={step} className="transition-copy lead">{stages[step][1]}</p><p className="muted">Sơ đồ nguyên lý và mô hình khóa minh họa. Không phải phép thử phần cứng hoặc lệnh điều khiển thật.</p></div><Viewer scene={active ? 'lock' : 'front'} /></section>;
}
function HomeConfigurator() {
  const catalog = useCatalog(); const { add } = useShop();
  const [productId, setProductId] = useState(''), [variantId, setVariantId] = useState(''), [message, setMessage] = useState('');
  const boxes = catalog.data?.filter(p => modelOf(p));
  const product = boxes?.find(p => p.id === productId) || boxes?.find(p => modelOf(p) === 'BASE') || boxes?.[0];
  const selected = availableVariant(product, variantId);
  const model = product && modelOf(product) === 'PRO' ? 'pro' : 'base';
  const variants = product?.variants?.filter(v => v.isActive) || [];
  if (!product) return <ResourceState {...catalog}/>;
  return <div className="selection-panel" id="configuration"><div className="configuration"><p className="eyebrow">CẤU HÌNH ANCHORBOX CỦA BẠN</p><ResourceState {...catalog}/>
    {boxes?.length ? <><fieldset><legend>1. Chọn phiên bản</legend><div className="model-segments">{boxes.map(p => <label key={p.id}><input type="radio" name="model" checked={product?.id === p.id} onChange={() => { setProductId(p.id); setVariantId(''); setMessage(''); }}/><span>{productLabel(p)}</span></label>)}</div></fieldset>
    <fieldset><legend>2. Chọn dung tích</legend><div className="size-segments">{variants.map(v => <label key={v.id}><input type="radio" name="capacity" checked={selected?.id === v.id} onChange={() => { setVariantId(v.id); setMessage(''); }}/><span><b>{v.size || v.variantName}</b>{v.capacityLiter == null ? v.variantName : `${v.capacityLiter} L`}{v.stockQuantity < 1 && ' · Hết hàng'}</span></label>)}</div></fieldset>
    <div className="selected-summary" aria-live="polite"><strong>{product?.name}{selected && ` · ${selected.size || selected.variantName}`}</strong><span>{selected?.sku}</span><span className="price">{money(selected?.finalPrice)}</span><span>{selected ? selected.stockQuantity > 0 ? `Còn ${selected.stockQuantity} sản phẩm` : 'Tạm hết hàng' : 'Chưa có cấu hình bán hàng'}</span></div>
    <button className="button" disabled={!canBuy(selected)} onClick={() => { if (product && selected && canBuy(selected)) { add(selected, product.name, 1); setMessage('Đã thêm vào giỏ hàng.'); } }}>Thêm vào giỏ hàng ↗</button>
    {message && <p role="status">{message} <Link to="/cart">Xem giỏ hàng →</Link></p>}
    {product && <Link className="text-link" to={`/products/${product.id}`}>Thông số và chi tiết →</Link>}</> : !catalog.loading && !catalog.error && <p className="notice">Danh mục AnchorBox đang được cập nhật. <Link to="/products">Xem danh mục</Link></p>}
  </div><div className="configuration-features"><span className="feature-count">{product?.name || 'ANCHORBOX'}{selected?.capacityLiter != null && ` · ${selected.capacityLiter} L`}</span><div className="concept-viewer"><Viewer model={model} capacity={selected?.capacityLiter ?? undefined}/></div><div key={selected?.id || model} className="transition-copy"><h3>{model === 'pro' ? 'Theo dõi thêm trọng lượng bưu kiện.' : 'Nhận hàng và quản lý từ xa.'}</h3><p>{product?.description}</p><ul><li>Khóa điện tử và kết nối IoT</li><li>Theo dõi trạng thái cửa, khóa và bưu kiện</li>{selected?.hasWeightSensor && <li>Cảm biến trọng lượng loadcell / HX711</li>}{selected?.warrantyMonths != null && <li>Bảo hành {selected.warrantyMonths} tháng từ nghiệm thu</li>}</ul><p className="muted small">Mô hình minh họa phiên bản đang chọn. Dung tích và giá lấy từ cấu hình sản phẩm.</p></div></div></div>;
}
function ProductVisual({ product, gallery = false }: { product: CatalogProduct; gallery?: boolean }) {
    const [index, setIndex] = useState(0);
    const [failed, setFailed] = useState(false);
    const images = product.images || [];
    useEffect(() => { setIndex(0); setFailed(false); }, [product.id, images.join('|')]);
    return <div>{images[index] && !failed
      ? <img key={images[index]} className="catalog-image transition-image" src={images[index]} alt={product.name} loading="lazy" onError={() => setFailed(true)}/>
      : <div className="product-placeholder"><span aria-hidden="true">⌑</span><small>{failed ? 'Không thể tải ảnh sản phẩm' : 'Chưa có ảnh sản phẩm'}</small>{failed && <button type="button" onClick={() => setFailed(false)}>Tải lại ảnh</button>}</div>}
      {gallery && images.length > 1 && <div className="actions" role="group" aria-label="Ảnh sản phẩm">{images.map((_, i) => <button type="button" key={i} aria-pressed={index === i} onClick={() => { setIndex(i); setFailed(false); }}>Ảnh {i + 1}</button>)}</div>}
    </div>;
}
export function Catalog({ embedded = false }: { embedded?: boolean }) {
    const resource = useCatalog(); const categories = useResource(shop.categories, 'catalog-categories');
    const [searchParams] = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') || ''), [category, setCategory] = useState(searchParams.get('category') || ''), [size, setSize] = useState(''), [sort, setSort] = useState('name'), [stock, setStock] = useState(false), [page, setPage] = useState(0);
    const sizes = [...new Set(resource.data?.flatMap(p => p.variants?.flatMap(v => v.isActive && v.size ? [v.size] : []) || []))];
    const price = (p: CatalogProduct) => { const values = p.variants?.filter(v => v.isActive && v.finalPrice != null && Number.isFinite(v.finalPrice)).map(v => v.finalPrice!) || []; return values.length ? Math.min(...values) : Infinity; };
    const rows = (resource.data || []).filter(p => [p.name, p.sku, p.description, ...(p.variants?.map(v => v.sku) || [])].join(' ').toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')) && (!category || p.categoryId === category) && (!size || p.variants?.some(v => v.isActive && v.size === size)) && (!stock || p.variants?.some(canBuy))).sort((a,b) => sort === 'price-up' ? price(a)-price(b) : sort === 'price-down' ? (price(a) === Infinity ? 1 : price(b) === Infinity ? -1 : price(b)-price(a)) : sort === 'newest' ? Date.parse(b.createdAt || '1970-01-01')-Date.parse(a.createdAt || '1970-01-01') : productLabel(a).localeCompare(productLabel(b), 'vi'));
    useEffect(() => { setQuery(searchParams.get('q') || ''); setCategory(searchParams.get('category') || ''); }, [searchParams]);
    useEffect(() => setPage(0), [query, category, size, sort, stock]);
    const totalPages = Math.ceil(rows.length / 12); const current = Math.min(page, Math.max(0,totalPages-1)); const visible = rows.slice(current*12, current*12+12);
    return <section className={embedded ? 'catalog-block' : 'container section'}>{!embedded && <><p className="eyebrow">ANCHORBOX COLLECTION</p><h1>Chọn sản phẩm phù hợp.</h1><p className="lead">Danh mục, giá và tồn kho được cập nhật từ hệ thống bán hàng.</p></>}<div className="catalog-toolbar"><label>Tìm sản phẩm<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Tên hoặc mã SKU"/></label><label>Danh mục<select value={category} onChange={e => setCategory(e.target.value)}><option value="">Tất cả danh mục</option>{categories.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Kích cỡ<select value={size} onChange={e => setSize(e.target.value)}><option value="">Tất cả kích cỡ</option>{sizes.map(s => <option key={s}>{s}</option>)}</select></label><label>Sắp xếp<select value={sort} onChange={e => setSort(e.target.value)}><option value="name">Tên A–Z</option><option value="price-up">Giá tăng dần</option><option value="price-down">Giá giảm dần</option><option value="newest">Mới nhất</option></select></label></div><label className="inline"><input type="checkbox" checked={stock} onChange={e => setStock(e.target.checked)}/>Chỉ sản phẩm còn hàng</label><ResourceState {...resource}/>{categories.error && <ErrorNotice error={categories.error} retry={categories.retry}/>}<p role="status">{!resource.loading && !resource.error && `${rows.length} sản phẩm`}</p><div className="product-grid">{visible.map(product => <Link className="product-card" key={product.id} to={`/products/${product.id}`}><ProductVisual product={product}/><p className="eyebrow">{product.categoryName || 'AnchorBox'}</p><h3>{productLabel(product)}</h3><p className="price">{price(product) === Infinity ? 'Chưa có cấu hình bán' : `Từ ${money(price(product))}`}</p><span className="badge">{product.variants?.some(canBuy) ? 'Còn hàng' : product.variants?.some(v => v.isActive) ? 'Hết hàng' : 'Chưa có SKU khả dụng'}</span><p className="catalog-description">{product.description}</p><span className="text-link">Xem cấu hình →</span></Link>)}</div>{!resource.loading && !resource.error && !rows.length && <div className="panel"><h2>{resource.data?.length ? 'Không có kết quả phù hợp.' : 'Danh mục đang được cập nhật.'}</h2><p>{resource.data?.length ? 'Thử đổi từ khóa hoặc bỏ bớt bộ lọc.' : 'Sản phẩm sẽ hiển thị khi được cập nhật trong hệ thống.'}</p><button onClick={() => { setQuery(''); setCategory(''); setSize(''); setStock(false); resource.retry(); }}>Tải lại danh mục</button></div>}{totalPages > 1 && <nav className="actions" aria-label="Phân trang sản phẩm"><button disabled={current === 0} onClick={() => setPage(current-1)}>Trang trước</button><span>Trang {current+1} / {totalPages}</span><button disabled={current+1 >= totalPages} onClick={() => setPage(current+1)}>Trang tiếp</button></nav>}</section>;
}
export { ProductDetailPage as ProductDetail } from './ProductDetailPage';
export function Compare({ compact = false }: { compact?: boolean }) {
    const resource = useCatalog();
    const catalog = resource.data || [];

    // Match real products from catalog or fallback to accurate specs
    const baseProd = catalog.find(p => p.sku?.includes('BASE') || p.name.toLowerCase().includes('base') || modelOf(p) === 'BASE') || catalog[0];
    const proProd = catalog.find(p => p.sku?.includes('PRO') || p.name.toLowerCase().includes('pro') || modelOf(p) === 'PRO') || catalog[1];
    const solarProd = catalog.find(p => p.sku?.includes('SOLAR') || p.name.toLowerCase().includes('solar') || p.name.toLowerCase().includes('grand')) || catalog[2];

    const basePrice = baseProd?.variants?.find(v => v.isActive)?.finalPrice ?? 4990000;
    const proPrice = proProd?.variants?.find(v => v.isActive)?.finalPrice ?? 7890000;
    const solarPrice = solarProd?.variants?.find(v => v.isActive)?.finalPrice ?? 12500000;

    return (
        <section className={`apple-compare-page ${compact ? 'compact' : 'container'}`}>
            <div className="apple-compare-hero">
                <p className="apple-compare-eyebrow">So Sánh Các Dòng Sản Phẩm</p>
                <h1>Tìm phiên bản AnchorBox phù hợp với bạn.</h1>
                <p className="lead">
                    So sánh chi tiết thông số kỹ thuật, cảm biến tải trọng, dung tích và nguồn năng lượng giữa 3 phiên bản Base, Pro và Solar.
                </p>
            </div>

            <ResourceState {...resource} />

            <div className="apple-compare-matrix-wrap">
                <table className="apple-compare-matrix">
                    <thead>
                        <tr className="apple-compare-models-row">
                            <th className="apple-col-feature-title">
                                <span style={{ fontSize: '0.82rem', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Phiên bản
                                </span>
                            </th>

                            {/* MODEL 1: BASE */}
                            <th className="apple-col-model">
                                <div className="apple-model-image-wrap">
                                    <img
                                        src={baseProd?.images?.[0] || '/banners/achor-box-banner-wide-1.webp'}
                                        alt="AnchorBox Base"
                                        className="apple-model-image"
                                    />
                                </div>
                                <h3 className="apple-model-name">AnchorBox Base</h3>
                                <p className="apple-model-tagline">Thiết yếu &amp; Bền bỉ</p>
                                <p className="apple-model-price">Từ {money(basePrice)}</p>
                                <Link
                                    to={baseProd ? `/products/${baseProd.id}` : '/products'}
                                    className="apple-model-cta secondary"
                                >
                                    Khám phá Base →
                                </Link>
                            </th>

                            {/* MODEL 2: PRO (HIGHLIGHTED) */}
                            <th className="apple-col-model is-highlighted">
                                <span className="apple-popular-badge">Phổ biến nhất</span>
                                <div className="apple-model-image-wrap">
                                    <img
                                        src={proProd?.images?.[0] || '/banners/achor-box-banner-wide-2.webp'}
                                        alt="AnchorBox Pro"
                                        className="apple-model-image"
                                    />
                                </div>
                                <h3 className="apple-model-name">AnchorBox Pro</h3>
                                <p className="apple-model-tagline">Cảm biến cân &amp; IoT cao cấp</p>
                                <p className="apple-model-price">Từ {money(proPrice)}</p>
                                <Link
                                    to={proProd ? `/products/${proProd.id}` : '/products'}
                                    className="apple-model-cta primary"
                                >
                                    Khám phá Pro →
                                </Link>
                            </th>

                            {/* MODEL 3: SOLAR */}
                            <th className="apple-col-model">
                                <div className="apple-model-image-wrap">
                                    <img
                                        src={solarProd?.images?.[0] || '/banners/achor-box-banner-wide-3.webp'}
                                        alt="AnchorBox Solar"
                                        className="apple-model-image"
                                    />
                                </div>
                                <h3 className="apple-model-name">AnchorBox Solar</h3>
                                <p className="apple-model-tagline">Năng lượng mặt trời độc lập</p>
                                <p className="apple-model-price">Từ {money(solarPrice)}</p>
                                <Link
                                    to={solarProd ? `/products/${solarProd.id}` : '/products'}
                                    className="apple-model-cta secondary"
                                >
                                    Khám phá Solar →
                                </Link>
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {/* NHÓM 1: DUNG TÍCH & KÍCH THƯỚC */}
                        <tr className="apple-compare-category-header">
                            <td colSpan={4}>Kích Thước &amp; Dung Tích Chứa</td>
                        </tr>
                        <tr className="apple-compare-row">
                            <td className="feature-label">Dung tích khoang chứa</td>
                            <td className="feature-val"><strong>45 L</strong> (Size S)</td>
                            <td className="feature-val is-highlighted"><strong>85 L</strong> (Size M)</td>
                            <td className="feature-val"><strong>150 L</strong> (Size L)</td>
                        </tr>
                        <tr className="apple-compare-row">
                            <td className="feature-label">Sức chứa bưu kiện ước tính</td>
                            <td className="feature-val">3–5 kiện hàng vừa &amp; nhỏ</td>
                            <td className="feature-val is-highlighted">6–10 kiện hàng lớn</td>
                            <td className="feature-val">12–15 kiện hoặc vali cỡ vừa</td>
                        </tr>
                        <tr className="apple-compare-row">
                            <td className="feature-label">Phù hợp không gian</td>
                            <td className="feature-val">Căn hộ, Chung cư, Cửa hẹp</td>
                            <td className="feature-val is-highlighted">Nhà phố, Biệt thự liền kề</td>
                            <td className="feature-val">Biệt thự sân vườn, Kho nhận</td>
                        </tr>
                        <tr className="apple-compare-row">
                            <td className="feature-label">Trọng lượng khung tủ</td>
                            <td className="feature-val">18 kg</td>
                            <td className="feature-val is-highlighted">28 kg</td>
                            <td className="feature-val">42 kg</td>
                        </tr>

                        {/* NHÓM 2: HỆ THỐNG AN NINH & KHÓA */}
                        <tr className="apple-compare-category-header">
                            <td colSpan={4}>Hệ Thống An Ninh &amp; Khóa Bảo Vệ</td>
                        </tr>
                        <tr className="apple-compare-row">
                            <td className="feature-label">Khóa điện từ Solenoid lực giữ</td>
                            <td className="feature-val">Khóa đơn 150 kg</td>
                            <td className="feature-val is-highlighted">Khóa kép 250 kg</td>
                            <td className="feature-val">Khóa đa điểm 400 kg</td>
                        </tr>
                        <tr className="apple-compare-row">
                            <td className="feature-label">Cảm biến cân tải trọng bưu kiện</td>
                            <td className="feature-val"><span className="apple-dash-icon">—</span></td>
                            <td className="feature-val is-highlighted">
                                <span className="apple-check-icon">✓</span>
                                <div style={{ fontSize: '0.8rem', color: '#0071e3', fontWeight: 600, marginTop: 2 }}>Loadcell HX711 (±10g)</div>
                            </td>
                            <td className="feature-val">
                                <span className="apple-check-icon">✓</span>
                                <div style={{ fontSize: '0.8rem', color: '#0071e3', fontWeight: 600, marginTop: 2 }}>Loadcell Kép (±10g)</div>
                            </td>
                        </tr>
                        <tr className="apple-compare-row">
                            <td className="feature-label">Bàn phím mã số cảm ứng &amp; NFC</td>
                            <td className="feature-val">Tùy chọn phụ kiện gắn thêm</td>
                            <td className="feature-val is-highlighted"><span className="apple-check-icon">✓</span> Tích hợp sẵn</td>
                            <td className="feature-val"><span className="apple-check-icon">✓</span> Tích hợp sẵn</td>
                        </tr>
                        <tr className="apple-compare-row">
                            <td className="feature-label">Cảnh báo chống cạy phá &amp; Rung lắc</td>
                            <td className="feature-val"><span className="apple-dash-icon">—</span></td>
                            <td className="feature-val is-highlighted"><span className="apple-check-icon">✓</span> Cảnh báo qua App</td>
                            <td className="feature-val"><span className="apple-check-icon">✓</span> Còi báo động 105dB + App</td>
                        </tr>
                        <tr className="apple-compare-row">
                            <td className="feature-label">Chìa cơ khí khẩn cấp chống kẹt</td>
                            <td className="feature-val"><span className="apple-check-icon">✓</span> 2 chìa vi tính</td>
                            <td className="feature-val is-highlighted"><span className="apple-check-icon">✓</span> 2 chìa vi tính</td>
                            <td className="feature-val"><span className="apple-check-icon">✓</span> 2 chìa vi tính</td>
                        </tr>

                        {/* NHÓM 3: KẾT NỐI IOT & ĐIỀU KHIỂN */}
                        <tr className="apple-compare-category-header">
                            <td colSpan={4}>Trí Tuệ IoT &amp; Kết Nối Đám Mây</td>
                        </tr>
                        <tr className="apple-compare-row">
                            <td className="feature-label">Vi điều khiển trung tâm</td>
                            <td className="feature-val">ESP32 Dual-Core (Wi-Fi + BLE)</td>
                            <td className="feature-val is-highlighted">ESP32-S3 AI IoT Cloud</td>
                            <td className="feature-val">ESP32-S3 + Module 4G LTE</td>
                        </tr>
                        <tr className="apple-compare-row">
                            <td className="feature-label">Đóng / Mở từ xa qua Web &amp; App</td>
                            <td className="feature-val"><span className="apple-check-icon">✓</span></td>
                            <td className="feature-val is-highlighted"><span className="apple-check-icon">✓</span></td>
                            <td className="feature-val"><span className="apple-check-icon">✓</span></td>
                        </tr>
                        <tr className="apple-compare-row">
                            <td className="feature-label">Tự động cập nhật Firmware OTA</td>
                            <td className="feature-val"><span className="apple-check-icon">✓</span></td>
                            <td className="feature-val is-highlighted"><span className="apple-check-icon">✓</span></td>
                            <td className="feature-val"><span className="apple-check-icon">✓</span></td>
                        </tr>
                        <tr className="apple-compare-row">
                            <td className="feature-label">Lịch sử giao nhận &amp; Trọng lượng</td>
                            <td className="feature-val">Lưu trữ 30 ngày</td>
                            <td className="feature-val is-highlighted">Lưu trữ 1 năm</td>
                            <td className="feature-val">Lưu trữ trọn đời</td>
                        </tr>

                        {/* NHÓM 4: NĂNG LƯỢNG & ĐỘ BỀN */}
                        <tr className="apple-compare-category-header">
                            <td colSpan={4}>Năng Lượng &amp; Kháng Thời Tiết</td>
                        </tr>
                        <tr className="apple-compare-row">
                            <td className="feature-label">Nguồn cấp vận hành</td>
                            <td className="feature-val">Adapter 220V + Pin dự phòng 7 ngày</td>
                            <td className="feature-val is-highlighted">Adapter 220V + Pin dự phòng 30 ngày</td>
                            <td className="feature-val">Tấm pin Solar 20W + Pin 60 ngày</td>
                        </tr>
                        <tr className="apple-compare-row">
                            <td className="feature-label">Khả năng hoạt động ngoài trời</td>
                            <td className="feature-val">IP54 (Chống mưa hắt)</td>
                            <td className="feature-val is-highlighted">IP55 (Kháng bụi &amp; tia nước áp lực)</td>
                            <td className="feature-val">IP65 (Kháng thời tiết khắc nghiệt)</td>
                        </tr>
                        <tr className="apple-compare-row">
                            <td className="feature-label">Chất liệu khung vỏ thép</td>
                            <td className="feature-val">Thép mạ kẽm sơn tĩnh điện 1.2mm</td>
                            <td className="feature-val is-highlighted">Thép mạ kẽm sơn tĩnh điện 1.5mm</td>
                            <td className="feature-val">Thép cường lực sơn chống UV 2.0mm</td>
                        </tr>

                        {/* NHÓM 5: CHÍNH SÁCH BẢO HÀNH */}
                        <tr className="apple-compare-category-header">
                            <td colSpan={4}>Bảo Hành &amp; Dịch Vụ</td>
                        </tr>
                        <tr className="apple-compare-row">
                            <td className="feature-label">Thời hạn bảo hành chính hãng</td>
                            <td className="feature-val">12 tháng</td>
                            <td className="feature-val is-highlighted"><strong>24 tháng chính hãng</strong></td>
                            <td className="feature-val"><strong>36 tháng cao cấp</strong></td>
                        </tr>
                        <tr className="apple-compare-row">
                            <td className="feature-label">Cam kết 1 đổi 1 lỗi nhà sản xuất</td>
                            <td className="feature-val">Trong 30 ngày đầu</td>
                            <td className="feature-val is-highlighted">Trong 30 ngày đầu</td>
                            <td className="feature-val">Trong 60 ngày đầu</td>
                        </tr>
                        <tr className="apple-compare-row">
                            <td className="feature-label">Dịch vụ giao hàng &amp; Lắp đặt</td>
                            <td className="feature-val">Miễn phí toàn quốc</td>
                            <td className="feature-val is-highlighted">Miễn phí tận nơi + Hướng dẫn kỹ thuật</td>
                            <td className="feature-val">Giao lắp tận nơi ưu tiên trong 24h</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <p className="apple-compare-footnote">
                * Các thông số kỹ thuật được kiểm nghiệm trong điều kiện tiêu chuẩn của phòng thử nghiệm AnchorBox. Giá bán thực tế có thể thay đổi tùy thuộc vào cấu hình phụ kiện kèm theo và chương trình ưu đãi hiện hành.
            </p>
        </section>
    );
}
export function Journey() { return <><ol className="journey">{[['01', 'Lựa chọn', 'Chọn dòng sản phẩm và SKU khả dụng.'], ['02', 'Xét duyệt & thanh toán', 'Chờ duyệt sản phẩm, xác nhận nếu duyệt một phần rồi thanh toán.'], ['03', 'Giao & lắp đặt', 'Theo dõi lịch và trạng thái giao, lắp đặt trong đơn hàng.'], ['04', 'Nghiệm thu & kích hoạt', 'Nghiệm thu được ghi nhận từ máy chủ trước khi cấp bảo hành.']].map(([n, title, body]) => <li key={n}><span>{n}</span><h3>{title}</h3><p>{body}</p></li>)}</ol><p className="notice">Theo dõi tiến trình trong tài khoản. Giao hàng, lắp đặt và nghiệm thu có trạng thái riêng.</p></>; }
export { TechnologyPage as Technology } from './TechnologyPage';
const faqs = [['Base và Pro khác nhau thế nào?', 'Tính năng phụ thuộc cấu hình đang bán. Xem bảng so sánh và thông số của phiên bản bạn chọn để kiểm tra cảm biến, dung tích và bảo hành.'], ['AnchorBox có những dung tích nào?', 'Thiết kế gồm S 45 L, M 85 L và L 150 L. Danh mục chỉ cho phép mua SKU có dữ liệu và tồn kho thực tế.'], ['Giao hàng có đồng nghĩa đã nghiệm thu?', 'Trạng thái giao hàng và nghiệm thu lắp đặt được theo dõi riêng. Bạn có thể xem trạng thái nghiệm thu trong chi tiết đơn hàng.'], ['Có thể tải ứng dụng chưa?', 'Ứng dụng đang chuẩn bị; liên kết tải sẽ được bổ sung khi có bản phát hành chính thức.']];
export function Faq({ embedded = false }: {
    embedded?: boolean;
}) { const [search, setSearch] = useState(''); const [category, setCategory] = useState(''); return <div className={embedded ? '' : 'container section'}><p className="eyebrow">RÕ RÀNG TỪ ĐẦU</p>{embedded ? <h2>Câu hỏi thường gặp.</h2> : <h1>Câu hỏi thường gặp.</h1>}<label>Tìm câu hỏi<input type="search" value={search} onChange={e => setSearch(e.target.value)}/></label><label>Chủ đề<select value={category} onChange={e => setCategory(e.target.value)}><option value="">Tất cả</option>{['Sản phẩm', 'Giao & lắp', 'Ứng dụng'].map(c => <option key={c}>{c}</option>)}</select></label>{faqs.filter((row, index) => (!category || ['Sản phẩm', 'Sản phẩm', 'Giao & lắp', 'Ứng dụng'][index] === category) && row.join(' ').toLowerCase().includes(search.toLowerCase())).map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>; }
