import { ConsultationCall } from './components/ConsultationCall';
import { consultationPhone } from './contact';
import { CustomerDevices } from './pages/CustomerDevices';
import { StoreHome } from './pages/StoreHome';
import { AccountHome } from './pages/AccountHome';
import { VnpayReturn } from './pages/VnpayReturn';
import { SalesInvoice } from './pages/SalesInvoice';
import { useEffect } from 'react';
import { StoreHeader } from './components/StoreHeader';
import { Link, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { ShopProvider } from './ShopContext';
import { CatalogProvider } from './CatalogContext';
import { Guard } from './components/ShopUi';
import { Catalog, Compare, Faq, Journey, ProductDetail, Technology } from './pages/ShopPublic';
import { Cart, Checkout, CheckoutRedirect, Login, OrderDetail, Orders, OrderTicket, PaymentResult } from './pages/ShopCommerce';
import { useMarketingMotion } from './components/MarketingMotion';
import { Contact, DemoPayment } from './pages/ShopPlanned';
import { Addresses, Profile, Recovery, Registration } from './pages/CustomerAccount';
import { InstallationTracking, Warranty } from './pages/CustomerWarranty';
import { AppStory, Blog } from './pages/ShopStories';
function Shell() {
    const location = useLocation();
    useMarketingMotion(location.pathname);
    useEffect(() => {
        const titles: Record<string, string> = { '/products': 'Sản phẩm', '/cart': 'Giỏ hàng', '/login': 'Đăng nhập', '/account': 'Tài khoản của tôi', '/account/orders': 'Đơn hàng của tôi', '/account/profile': 'Hồ sơ', '/account/addresses': 'Sổ địa chỉ', '/account/warranty': 'Bảo hành', '/contact': 'Hỗ trợ', '/compare': 'So sánh sản phẩm' };
        document.title = titles[location.pathname] ? titles[location.pathname] + ' | AnchorBox' : 'AnchorBox — Một nơi an tâm cho mỗi bưu kiện';
        const frame = requestAnimationFrame(() => {
            const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
            if (target) {
                target.classList.add('motion-visible');
                target.setAttribute('tabindex', '-1');
                target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
                target.focus({ preventScroll: true });
            } else window.scrollTo({ top: 0, behavior: 'instant' });
        });
        return () => cancelAnimationFrame(frame);
    }, [location.pathname, location.hash, location.key]);
    return <><a className="skip" href="#main">Đi đến nội dung</a><div className="store-topbar"><div className="container"><span>ANCHORBOX — HỘP NHẬN HÀNG THÔNG MINH</span><div className="store-topbar-links"><a href={consultationPhone.href} aria-label={`Gọi tư vấn ${consultationPhone.display}`}>Tư vấn: {consultationPhone.display}</a><Link to="/account/orders">Tra cứu đơn hàng →</Link></div></div></div><StoreHeader /><main id="main" tabIndex={-1}><Routes>
    <Route path="/" element={<StoreHome />}/><Route path="/products" element={<Catalog />}/><Route path="/products/:id" element={<ProductDetail />}/><Route path="/compare" element={<Compare />}/><Route path="/technology" element={<Technology />}/><Route path="/app" element={<AppStory />}/><Route path="/faq" element={<Faq />}/>
    <Route path="/how-it-works" element={<section className="container section"><p className="eyebrow">TỪ LỰA CHỌN ĐẾN SỬ DỤNG</p><h1>Một hành trình kết nối.</h1><Journey /><h2>Sau khi kích hoạt.</h2><p>Bạn theo dõi trạng thái thiết bị, gửi lệnh điều khiển và xem lịch sử bưu kiện trong tài khoản của mình.</p></section>}/>
    <Route path="/about" element={<section className="container section"><p className="eyebrow">VỀ ANCHORBOX</p><h1>Một nơi an tâm.<br />Cho mỗi bưu kiện.</h1><p className="lead">AnchorBox là dự án hộp nhận hàng thông minh, kết hợp khóa điện tử, kết nối IoT và quản lý thiết bị.</p><p className="muted">Mô hình 3D trên website là hình minh họa. Khả năng phần cứng thực tế cần được xác minh trên từng thiết bị.</p></section>}/>
    <Route path="/contact" element={<Contact />}/><Route path="/blog" element={<Blog />}/><Route path="/blog/:slug" element={<Blog />}/>
    <Route path="/login" element={<Login />}/><Route path="/register" element={<Registration />}/><Route path="/forgot-password" element={<Recovery />}/><Route path="/reset-password" element={<Recovery reset />}/>
    <Route path="/cart" element={<Cart />}/><Route path="/checkout" element={<CheckoutRedirect />}/><Route path="/checkout/:orderId" element={<Guard><Checkout /></Guard>}/><Route path="/payments/vnpay/return" element={<Guard><VnpayReturn /></Guard>}/><Route path="/payment/result" element={<Guard><PaymentResult /></Guard>}/><Route path="/order-success/:id" element={<Guard><PaymentResult /></Guard>}/>
    <Route path="/account" element={<Guard><AccountHome /></Guard>}/><Route path="/account/profile" element={<Guard><Profile /></Guard>}/><Route path="/account/orders" element={<Guard><Orders /></Guard>}/><Route path="/account/orders/:id" element={<Guard><OrderDetail /></Guard>}/><Route path="/account/orders/:id/invoice" element={<Guard><SalesInvoice /></Guard>}/><Route path="/account/orders/:id/ticket" element={<Guard><OrderTicket /></Guard>}/><Route path="/account/orders/:id/installation" element={<Guard><InstallationTracking /></Guard>}/>
    <Route path="/account/devices" element={<Guard><CustomerDevices /></Guard>}/><Route path="/account/devices/:id" element={<Guard><CustomerDevices /></Guard>}/><Route path="/account/notifications" element={<Guard><Navigate to="/account?notifications=open" replace/></Guard>}/>
    <Route path="/warranty" element={<Warranty />}/><Route path="/account/warranty" element={<Guard><Warranty /></Guard>}/><Route path="/account/warranties" element={<Guard><Warranty /></Guard>}/><Route path="/account/warranty/claims/new" element={<Guard><Warranty claim /></Guard>}/><Route path="/account/addresses" element={<Guard><Addresses /></Guard>}/><Route path="/demo-payment/:paymentId" element={<Guard><DemoPayment /></Guard>}/>
    <Route path="*" element={<section className="container section"><p className="eyebrow">404</p><h1>Không tìm thấy trang.</h1><Link className="button" to="/">Về trang chủ</Link></section>}/>
  </Routes></main><footer className="store-footer"><div className="container store-footer-grid"><div><Link className="brand" to="/">anchorbox.</Link><p>Một nơi dành cho bưu kiện.<br/>Một lựa chọn cho ngôi nhà của bạn.</p></div><div><h2>Khám phá</h2><Link to="/products">Tất cả sản phẩm</Link><Link to="/compare">So sánh cấu hình</Link><Link to="/technology">Công nghệ</Link></div><div><h2>Hỗ trợ mua hàng</h2><Link to="/how-it-works">Quy trình giao & lắp</Link><Link to="/faq">Câu hỏi thường gặp</Link><Link to="/contact">Liên hệ tư vấn</Link><a href={consultationPhone.href} aria-label={`Gọi tư vấn ${consultationPhone.display}`}>Tư vấn: {consultationPhone.display}</a></div><div><h2>Tài khoản của bạn</h2><Link to="/account">Thông tin tài khoản</Link><Link to="/account/orders">Theo dõi đơn hàng</Link><Link to="/account/warranty">Tra cứu bảo hành</Link></div></div><div className="container store-footer-bottom"><span>AnchorBox · Hộp nhận hàng thông minh</span><Link to="/about">Về AnchorBox ↗</Link></div></footer><ConsultationCall /></>;
}
export function App() { return <ShopProvider><CatalogProvider><Shell /></CatalogProvider></ShopProvider>; }
export default App;
