import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight, ArrowRight, ArrowDown, Box, ShieldCheck, Wifi, Lock, Unlock, Smartphone, Bell, Package, Check, Play, Rotate3D, Menu, X, Cpu, Layers, Cloud, Weight, ChevronRight } from 'lucide-react';
import type { SmartBoxCanvasProps } from './three/SmartBoxCanvas';
import type { BoxModel, BoxSize } from './types';
import { catalog, sizes, capacities } from './catalog';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getRoleDefaultPath } from '../../types/database';
import './premium.css';

gsap.registerPlugin(ScrollTrigger);
const SmartBoxCanvas = lazy(() => import('./three/SmartBoxCanvas').then(module => ({ default: module.SmartBoxCanvas })));
const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + 'đ';
const steps = ['Nhân viên giao hàng đến', 'Xác nhận quyền truy cập', 'SmartBox mở khóa', 'Đặt kiện hàng vào hộp', 'SmartBox tự động khóa', 'Bạn nhận được thông báo'];
const layers = [
  { id: 'outer-shell', title: 'Chỉn chu từ ngoài vào trong.', text: 'Lớp vỏ bảo vệ và cơ cấu cửa được tích hợp gọn gàng, giúp bảo quản kiện hàng an toàn.', icon: Layers },
  { id: 'electronic-lock', title: 'An toàn ngay từ thiết kế.', text: 'Kiểm soát truy cập bằng khóa điện tử. Mở từ xa và khóa lại an toàn ngay trên ứng dụng SmartBox.', icon: Lock },
  { id: 'controller', title: 'Bộ não của mỗi lần nhận hàng.', text: 'Bộ điều khiển kết nối thiết bị với ứng dụng, đồng bộ trạng thái và lịch sử hoạt động.', icon: Cpu },
  { id: 'loadcell', title: 'Biết ngay khi hàng đến.', text: 'Cảm biến loadcell trên bản Pro phát hiện thay đổi khối lượng khi kiện hàng được đặt vào hộp.', icon: Weight },
  { id: 'hx711', title: 'Tín hiệu nhỏ. Đo lường chính xác.', text: 'Mô-đun HX711 24-bit khuếch đại tín hiệu từ cảm biến khối lượng, hỗ trợ đo lường chính xác.', icon: Wifi },
];

interface Props { onNavigateTab: (tab: string) => void; onOpenOrderModal: (model: BoxModel, size: BoxSize) => void; onExecuteWarrantyLookup: (serial: string) => void }

export function PremiumLanding({ onNavigateTab, onOpenOrderModal }: Props) {
  const { profile } = useAuth();
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [model, setModel] = useState<BoxModel>('pro');
  const [size, setSize] = useState<BoxSize>('S');
  const [menu, setMenu] = useState(false);
  const [angle, setAngle] = useState<'hero-grand' | 'front' | 'top'>('hero-grand');
  const [heroView, setHeroView] = useState<'photo' | 'model'>('model');
  const [layer, setLayer] = useState(0);
  const [step, setStep] = useState(0);
  const [screen, setScreen] = useState('Tổng quan');
  const [locked, setLocked] = useState(true);
  const [events, setEvents] = useState(['14:32 · Đã phát hiện kiện hàng', '14:31 · SmartBox đã khóa', '14:30 · Đã cấp quyền giao hàng']);
  const [storeMessage, setStoreMessage] = useState('');
  const chosen = catalog[model];
  const sizeIndex = sizes.indexOf(size);

  useEffect(() => {
    if (reduced) return;
    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.sb-reveal').forEach(element => {
        gsap.fromTo(element, { y: 35, opacity: 0 }, { y: 0, opacity: 1, duration: .9, ease: 'power2.out', scrollTrigger: { trigger: element, start: 'top 92%', once: true } });
      });
      gsap.to('.sb-hero-object', { y: 70, scale: 1.07, ease: 'none', scrollTrigger: { trigger: '.sb-hero', start: 'top top', end: 'bottom top', scrub: 1 } });
    }, root);
    return () => context.revert();
  }, [reduced]);

  function toggleLock() {
    setLocked(!locked);
    setEvents(previous => [`Vừa xong · SmartBox ${locked ? 'đã mở khóa' : 'đã khóa'}`, ...previous].slice(0, 5));
  }
  const jump = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' }); setMenu(false); };

  return <div className="sb" ref={root}>
    <a href="#sb-products" className="sb-skip">Chuyển đến sản phẩm</a>
    <header className="sb-nav">
      <a href="#" className="sb-brand" aria-label="Trang chủ SmartBox"><Box size={27} strokeWidth={1.5} />SmartBox<span>®</span></a>
      <nav className={menu ? 'is-open' : ''} aria-label="Điều hướng chính">
        {[["Sản phẩm", "sb-products"], ["Công nghệ", "sb-technology"], ["Ứng dụng", "sb-app"], ["Cách hoạt động", "sb-how"]].map(([label, id]) => <a key={id} href={`#${id}`} onClick={() => setMenu(false)}>{label}</a>)}
      </nav>
      <div className="sb-nav-actions">
        <Link className="sb-login-link" to={profile ? getRoleDefaultPath(profile.role) : '/login'}>{profile ? 'Vào tài khoản' : 'Đăng nhập'} <ArrowUpRight size={14} /></Link>
        <button className="sb-button sb-nav-cta" onClick={() => jump('sb-configure')}>Chọn SmartBox <ArrowUpRight size={15} /></button>
      </div>
      <button className="sb-menu" aria-label="Mở hoặc đóng menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button>
    </header>

    <section className={`sb-hero sb-hero-${heroView}`}>
      <div className="sb-orbit" aria-hidden="true" />
      <div className="sb-hero-copy">
        <motion.div initial={reduced ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .9 }}>
          <div className="sb-eyebrow"><span className="sb-dot" /> HỆ THỐNG NHẬN HÀNG THÔNG MINH</div>
          <h1>Không chỉ là hộp.<br />Nhận hàng<br /><span>thông minh hơn.</span></h1>
          <p>Hàng đã về nhà. An toàn, trọn vẹn.<br />Ngay cả khi bạn đang ở nơi khác.</p>
          <div className="sb-actions"><button className="sb-button" onClick={() => jump('sb-products')}>Khám phá SmartBox <ArrowUpRight size={17} /></button><button className="sb-text-button" onClick={() => jump('sb-how')}><span className="sb-play"><Play size={12} fill="currentColor" /></span>Xem cách hoạt động</button></div>
          <div className="sb-hero-note"><span />Hai phiên bản Base & Pro <i /> Cho cuộc sống mỗi ngày</div>
        </motion.div>
      </div>
      <motion.div className="sb-hero-object" initial={reduced ? false : { opacity: 0, y: 35 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.5, delay: .15 }}>
        {heroView === 'photo' ? <div className="sb-studio-photo">
          <img src="/smartbox-studio-v1.png" alt="Hộp SmartBox vỏ mica trong suốt, màn hình LCD và bàn phím số — ảnh sản phẩm được chỉnh ánh sáng studio" fetchPriority="high" decoding="async" />
        </div> : <ProductVisual cameraPreset={angle} mode="hero" enableAutoRotate={angle === 'hero-grand'} cameraFov={49} initialRotation={[0, -.22, 0]} />}
      </motion.div>
      <div className="sb-product-label"><span className="sb-dot" /> SMARTBOX <span className="sb-label-line" /><small>{heroView === 'photo' ? 'Nhìn thấu từng chi tiết.' : 'Mô hình minh họa 3D.'}</small></div>
      <div className="sb-delivery"><span className="sb-delivery-icon"><Package size={19} /></span><div><strong>Đã nhận kiện hàng</strong><span>Hàng đã về nhà, an toàn trong hộp.</span></div><span className="sb-delivery-time">Vừa xong</span></div>
      <div className="sb-hero-bottom"><a href="#sb-story"><ArrowDown size={15} /> CUỘN ĐỂ KHÁM PHÁ</a><div className="sb-hero-view-switch" aria-label="Chế độ xem sản phẩm"><button aria-pressed={heroView === 'photo'} onClick={() => setHeroView('photo')}>Ảnh sản phẩm</button><button aria-pressed={heroView === 'model'} onClick={() => setHeroView('model')}><Rotate3D size={15} /> Khám phá 3D</button></div>{heroView === 'model' ? <div className="sb-views"><span>KÉO ĐỂ XOAY</span>{(['hero-grand', 'front', 'top'] as const).map((view, i) => <button key={view} aria-label={`Góc nhìn ${['phối cảnh', 'mặt trước', 'từ trên'][i]}`} aria-pressed={angle === view} className={angle === view ? 'active' : ''} onClick={() => setAngle(view)} />)}</div> : <span>PHIÊN BẢN MICA · CHI TIẾT THẬT</span>}</div>
    </section>

    <div className="sb-benefits">{[[ShieldCheck, 'An toàn từ thiết kế'], [Wifi, 'Luôn kết nối'], [Smartphone, 'Bạn nắm quyền kiểm soát'], [Package, 'Sẵn sàng đón mọi kiện hàng']].map(([Icon, text]: any) => <div key={text}><Icon size={19} strokeWidth={1.5} />{text}</div>)}</div>

    <section id="sb-story" className="sb-section sb-story sb-reveal"><div className="sb-eyebrow">BẠN CỨ ĐI. HÀNG CỨ ĐẾN.</div><h2>Không phải lúc nào bạn cũng ở nhà.<br /><span>Nhưng vẫn có thể an tâm.</span></h2><p>Không còn kiện hàng để ngoài cửa. Không còn bỏ lỡ giao hàng.<br />Khóa điện tử, điều khiển IoT và ứng dụng di động<br className="sb-desktop" /> cùng mang đến trải nghiệm nhận hàng nhẹ nhàng hơn.</p><div className="sb-story-bottom"><span>Từ nỗi lo trước cửa</span><span className="sb-story-track" /><ShieldCheck size={22} /><strong>Đến mỗi lần nhận hàng an tâm.</strong></div></section>

    <section id="sb-products" className="sb-section sb-products"><div className="sb-section-heading sb-reveal"><div><div className="sb-eyebrow">ĐÓN HÀNG THEO CÁCH MỚI</div><h2>Hai lựa chọn thông minh.<br /><span>Thêm một điều bớt lo.</span></h2></div><p>Thiết kế chỉn chu.<br />An tâm mỗi ngày.</p></div>
      <div className="sb-product-pair">{(['base', 'pro'] as const).map((key, i) => <article className={`sb-product sb-reveal ${key}`} key={key}><div className="sb-product-top"><span>0{i + 1} / {key.toUpperCase()}</span>{key === 'pro' && <span className="sb-pill">THÊM KHẢ NĂNG CẢM NHẬN</span>}</div><div className="sb-product-render"><ProductVisual mode="compact" modelType={key} enableAutoRotate={false} initialRotation={[0, -.25, 0]} cameraFov={40} /></div><h3>{catalog[key].label}</h3><h4>{catalog[key].tagline}</h4><p>{catalog[key].description}</p><div className="sb-product-price"><span>Từ {money(catalog[key].prices[0])}</span><button aria-label={`Khám phá ${catalog[key].label}`} onClick={() => { setModel(key); jump('sb-configure'); }}><ArrowUpRight size={22} /></button></div></article>)}</div>
      <div className="sb-comparison sb-reveal"><h3>Vững vàng từ bản tiêu chuẩn. Thông minh hơn với Pro.</h3><div className="sb-compare-row"><span>Tính năng đi kèm</span><strong>Base</strong><strong>Pro</strong></div>{['Khóa điện tử & điều khiển từ xa', 'Trạng thái cửa, lịch sử & thông báo', 'Cảm biến khối lượng & phát hiện kiện hàng'].map((feature, i) => <div className="sb-compare-row" key={feature}><span>{feature}</span><span>{i < 2 ? <Check size={17} /> : '—'}</span><Check size={17} /></div>)}</div>
    </section>

    <section id="sb-configure" className="sb-section sb-configure"><div className="sb-configure-visual"><div className="sb-eyebrow">VỪA VẶN VỚI NHU CẦU MỖI NGÀY</div><ProductVisual mode="variant" sizeVariant={size} modelType={model} enableAutoRotate={false} initialRotation={[0, -.3, 0]} cameraFov={46} /><div className="sb-capacity"><strong>{capacities[sizeIndex]}<span>L</span></strong><span>THÊM KHÔNG GIAN ĐÓN KIỆN HÀNG</span></div></div><div className="sb-configure-options sb-reveal"><div className="sb-eyebrow">CHỌN THEO CÁCH CỦA BẠN</div><h2>Nhà của bạn.<br />SmartBox của bạn.</h2><p>Chọn kích thước phù hợp với nhu cầu nhận hàng.</p><div className="sb-segment">{(['base', 'pro'] as const).map(key => <button key={key} className={model === key ? 'active' : ''} aria-pressed={model === key} onClick={() => setModel(key)}>{catalog[key].label}</button>)}</div><label>01 <span>Chọn dung tích</span></label><div className="sb-size-options">{sizes.map((value, i) => <button key={value} className={size === value ? 'active' : ''} aria-pressed={size === value} onClick={() => setSize(value)}><strong>{value}</strong><span>{capacities[i]} lít</span></button>)}</div><p className="sb-sku">BOX-{model.toUpperCase()}-{size} · {['Cho những món đồ hằng ngày', 'Rộng hơn cho kiện hàng lớn', 'Cho nhu cầu nhận hàng thường xuyên'][sizeIndex]}</p><ul>{chosen.features.map(feature => <li key={feature}><Check size={15} />{feature}</li>)}</ul><div className="sb-purchase"><div aria-live="polite"><small>{chosen.name} · Cỡ {size}</small><strong>{money(chosen.prices[sizeIndex])}</strong></div><button className="sb-button" onClick={() => onOpenOrderModal(model, size)}>Chọn phiên bản này <ArrowUpRight size={17} /></button></div></div></section>

    <section id="sb-technology" className="sb-section sb-tech"><div className="sb-section-heading sb-reveal"><div><div className="sb-eyebrow">MỖI LINH KIỆN, MỘT VAI TRÒ</div><h2>Tinh tế bên ngoài.<br /><span>Thông minh bên trong.</span></h2></div><span className="sb-pill">BÊN TRONG SMARTBOX PRO</span></div><div className="sb-tech-layout"><div className="sb-tech-visual"><ProductVisual mode="exploded" explodedProgress={layer === 0 ? .2 : .9} activeLayerId={layers[layer].id} enableAutoRotate={false} cameraFov={43} /><span className="sb-technical-caption">KHÁM PHÁ LINH KIỆN / SMARTBOX PRO</span></div><div className="sb-layer-list">{layers.map((item, i) => <button key={item.id} aria-expanded={layer === i} className={layer === i ? 'active' : ''} onClick={() => setLayer(i)}><span className="sb-layer-number">0{i + 1}</span><div><h3>{item.title}</h3>{layer === i && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{item.text}</motion.p>}</div><item.icon size={20} /></button>)}</div></div></section>

    <section id="sb-app" className="sb-section sb-app"><div className="sb-app-copy sb-reveal"><div className="sb-eyebrow">CẢ THỀM NHÀ, TRONG TÚI BẠN.</div><h2>Dù không ở nhà.<br /><span>Vẫn luôn chủ động.</span></h2><p>Quản lý mọi SmartBox ngay trên điện thoại. Mở hộp để nhận hàng, kiểm tra trạng thái rồi tiếp tục ngày của bạn.</p><div className="sb-app-tabs">{[['Tổng quan', Smartphone, 'Nắm tình hình chỉ trong một chạm.', 'Theo dõi kết nối, khóa và kiện hàng tức thì.'], ['Lịch sử', Layers, 'Mọi hoạt động đều được ghi lại.', 'Lịch sử nhận hàng và thao tác rõ ràng, dễ xem.'], ['Thông báo', Bell, 'Tin vui đến ngay lập tức.', 'Biết ngay khi kiện hàng đã được nhận an toàn.']].map(([label, Icon, title, description]: any) => <button key={label} onClick={() => setScreen(label)} className={screen === label ? 'active' : ''} aria-pressed={screen === label}><Icon size={21} /><span><strong>{title}</strong><small>{description}</small></span><ChevronRight size={17} /></button>)}</div><span className="sb-demo-note">TRẢI NGHIỆM THỬ · CHẠM ĐỂ ĐIỀU KHIỂN</span></div><div className="sb-phone-stage"><div className="sb-phone"><div className="sb-phone-status">9:41 <span>▮▮▮  ▰</span></div><div className="sb-phone-island" /><div className="sb-phone-heading"><Box size={21} /><strong>SmartBox</strong><Bell size={18} /></div><div className="sb-phone-greeting">Chào bạn, Minh</div><h3>{screen === 'Tổng quan' ? 'An tâm thêm một chút.' : screen}</h3><div className="sb-phone-device"><span><span className="sb-dot" /> Trực tuyến</span><img className="sb-phone-product-photo" src="/smartbox-studio-v1.png" alt="SmartBox Nhà mình" loading="lazy" /><strong>SmartBox Nhà mình</strong><small>Trước cửa nhà · Pro</small></div><div className="sb-phone-screen" aria-live="polite">{screen === 'Tổng quan' ? <><div className="sb-phone-metrics"><div><Lock size={17} /><small>Trạng thái khóa</small><strong>{locked ? 'Đã khóa' : 'Đã mở'}</strong></div><div><Package size={17} /><small>Kiện hàng</small><strong>Đã nhận <em>2,4 kg</em></strong></div></div><button className="sb-phone-unlock" onClick={toggleLock}>{locked ? <Unlock size={16} /> : <Lock size={16} />}{locked ? 'Mở khóa SmartBox' : 'Khóa SmartBox'}</button><div className="sb-phone-event"><Check size={15} /><div>Đã giao kiện hàng<small>Hôm nay lúc 14:32</small></div></div></> : screen === 'Lịch sử' ? <div className="sb-phone-history">{events.map((event, i) => <div key={`${event}-${i}`}><span />{event}</div>)}</div> : <div className="sb-phone-notification"><Bell size={23} /><strong>Phát hiện kiện hàng</strong><p>Một kiện hàng nặng 2,4 kg vừa được đặt vào hộp.</p><small>Hôm nay · 14:32</small></div>}</div><div className="sb-phone-nav">{[['Tổng quan', Box], ['Lịch sử', Layers], ['Thông báo', Bell]].map(([name, Icon]: any) => <button key={name} aria-label={name} className={screen === name ? 'active' : ''} onClick={() => setScreen(name)}><Icon size={19} /><small>{name}</small></button>)}</div><div className="sb-home-indicator" /></div><div className="sb-floating-message"><span className="sb-delivery-icon"><ShieldCheck size={20} /></span><div><strong>Nhận hàng, chẳng phiền lòng.</strong><small>Kiện hàng đã an toàn ở nhà.</small></div></div></div></section>

    <section className="sb-section sb-ecosystem sb-reveal"><div className="sb-eyebrow">MỘT HỆ SINH THÁI KẾT NỐI</div><h2>Mỗi phần đều tốt.<br /><span>Kết hợp càng hoàn hảo.</span></h2><p>Phần cứng và phần mềm, đồng bộ trong một hệ thống.</p><div className="sb-system">{[[Box, 'SmartBox', 'Thiết bị an toàn'], [Smartphone, 'Ứng dụng của bạn', 'Điều khiển dễ dàng'], [Cloud, 'Nền tảng đám mây', 'Luôn đồng bộ'], [Bell, 'Thông báo', 'Cập nhật kịp thời']].map(([Icon, title, description]: any) => <div key={title}><span><Icon size={30} strokeWidth={1.3} /></span><strong>{title}</strong><small>{description}</small></div>)}</div></section>

    <section id="sb-how" className="sb-section sb-how"><div className="sb-section-heading sb-reveal"><div><div className="sb-eyebrow">TỪ GIAO HÀNG ĐẾN AN TÂM</div><h2>Nhận hàng liền mạch.<br /><span>Chỉ sáu bước đơn giản.</span></h2></div><p>Để SmartBox lo phần còn lại.</p></div><div className="sb-step-scene"><div className="sb-step-box"><Package size={62} strokeWidth={.8} /><span>{String(step + 1).padStart(2, '0')} / 06</span></div><div><span className="sb-eyebrow">SMARTBOX HOẠT ĐỘNG THẾ NÀO</span><h3 key={step}>{steps[step]}.</h3><p>{['Kiện hàng đến đúng địa chỉ. Bạn có thể đang ở bất cứ đâu.', 'Cấp quyền mở hộp từ xa qua ứng dụng SmartBox.', 'Khóa điện tử mở để nhân viên giao hàng đặt kiện hàng vào.', 'Kiện hàng được đặt vào hộp. Bản Pro nhận biết thay đổi khối lượng.', 'Kiện hàng được giữ an toàn cho đến khi bạn về lấy.', 'Thông báo tức thì cho bạn biết kiện hàng đã về nhà.'][step]}</p><button className="sb-text-button" onClick={() => setStep((step + 1) % steps.length)}>{step === 5 ? 'Xem lại quy trình' : 'Bước tiếp theo'} <ArrowRight size={17} /></button></div></div><div className="sb-steps">{steps.map((title, i) => <button key={title} className={step === i ? 'active' : ''} aria-pressed={step === i} onClick={() => setStep(i)}><span>0{i + 1}</span><strong>{title}</strong></button>)}</div></section>

    <section id="sb-download" className="sb-section sb-download sb-reveal"><div><div className="sb-eyebrow">ỨNG DỤNG SMARTBOX</div><h2>SmartBox<br /><span>luôn bên bạn.</span></h2><p>Kết nối với ngôi nhà chỉ bằng một chạm.</p><div className="sb-store-buttons"><button onClick={() => setStoreMessage('Ứng dụng SmartBox cho iOS chưa được phát hành công khai. Bạn có thể trải nghiệm bản xem thử phía trên.')}><Smartphone size={24} /><span><small>SẮP CÓ TRÊN</small>App Store</span></button><button onClick={() => setStoreMessage('Ứng dụng SmartBox cho Android chưa được phát hành công khai. Bạn có thể trải nghiệm bản xem thử phía trên.')}><Play size={24} /><span><small>SẮP CÓ TRÊN</small>Google Play</span></button></div><p className="sb-store-message" role="status">{storeMessage || 'iOS & Android · Sắp công bố thời điểm phát hành'}</p></div><div className="sb-download-mark"><Box size={84} strokeWidth={.8} /><span>SmartBox</span><small>KẾT NỐI CUỘC SỐNG MỖI NGÀY.</small></div></section>

    <section className="sb-section sb-final sb-reveal"><span className="sb-eyebrow">CHÀO ĐÓN CÁCH NHẬN HÀNG THÔNG MINH HƠN</span><h2>Bạn cứ tận hưởng.<br /><span>Để SmartBox nhận hàng.</span></h2><p>Chọn SmartBox phù hợp với ngôi nhà của bạn.<br />Quản lý mọi lần nhận hàng ngay trên điện thoại.</p><div className="sb-actions"><button className="sb-button" onClick={() => jump('sb-configure')}>Chọn SmartBox của bạn <ArrowUpRight size={17} /></button><button className="sb-text-button" onClick={() => jump('sb-app')}>Khám phá ứng dụng <ArrowRight size={17} /></button></div></section>

    <footer className="sb-footer"><div className="sb-footer-main"><div><a className="sb-brand" href="#"><Box size={26} />SmartBox<span>®</span></a><p>Nhận hàng thông minh hơn.<br />Tự do tận hưởng nhiều hơn.</p></div><div><strong>Khám phá</strong><a href="#sb-products">Sản phẩm</a><a href="#sb-technology">Công nghệ</a><a href="#sb-app">Ứng dụng SmartBox</a></div><div><strong>Hỗ trợ bạn</strong><button onClick={() => onNavigateTab('guide')}>Hướng dẫn sử dụng <ArrowUpRight size={12} /></button><button onClick={() => onNavigateTab('warranty')}>Bảo hành & hỗ trợ <ArrowUpRight size={12} /></button><a href="/login">Đăng nhập <ArrowUpRight size={12} /></a></div><div className="sb-footer-signoff"><span className="sb-dot" /> KẾT NỐI CUỘC SỐNG MỖI NGÀY.</div></div><div className="sb-footer-bottom"><span>© {new Date().getFullYear()} SmartBox. Bảo lưu mọi quyền.</span><span>Kết nối tinh tế. Đơn giản là SmartBox.</span><a href="#">Về đầu trang ↑</a></div></footer>
  </div>;
}

function ProductVisual(props: SmartBoxCanvasProps) {
  return <InteractiveBox {...props} hasPackage={false} />;
}

function InteractiveBox(props: SmartBoxCanvasProps) {
  const [supported, setSupported] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    try { const canvas = document.createElement('canvas'); const context = canvas.getContext('webgl2'); setSupported(!!context); context?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { setSupported(false); }
  }, []);
  const fallback = <img className="sb-product-fallback" src="/smartbox-studio-v1.png" alt="Hộp nhận hàng thông minh SmartBox an toàn và kết nối" />;
  return supported ? <Suspense fallback={fallback}><SmartBoxCanvas {...props} reducedMotion={!!reduced} /></Suspense> : fallback;
}
