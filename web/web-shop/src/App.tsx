import { ConsultationCall } from './components/ConsultationCall';
import { consultationPhone } from './contact';
import { CustomerDevices } from './pages/CustomerDevices';
import { StoreHome } from './pages/StoreHome';
import { AccountHome } from './pages/AccountHome';
import { VnpayReturn } from './pages/VnpayReturn';
import { SalesInvoice } from './pages/SalesInvoice';
import { useEffect, useRef } from 'react';
import { StoreHeader } from './components/StoreHeader';
import { BrandLogo } from './components/brand/BrandMark';
import { Link, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { ShopProvider } from './ShopContext';
import { CatalogProvider } from './CatalogContext';
import { Guard } from './components/ShopUi';
import { Faq, ProductDetail, Technology } from './pages/ShopPublic';
import { ComparePage } from './pages/ComparePage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { Cart, Checkout, CheckoutRedirect, OrderDetail, OrderTicket, PaymentResult } from './pages/ShopCommerce';
import { useMarketingMotion } from './components/MarketingMotion';
import { Contact, DemoPayment } from './pages/ShopPlanned';
import { AuthRecovery } from './pages/AuthRecovery';
import { InstallationTracking, Warranty } from './pages/CustomerWarranty';
import { AppStory, Blog } from './pages/ShopStories';
import { OrderTracking } from './pages/OrderTracking';
import { ProductCatalogPage } from './pages/ProductCatalogPage';
import { AboutPage } from './pages/AboutPage';
import { AuthPortal } from './pages/AuthPortal';
function Shell() {
  const location = useLocation();
  useMarketingMotion(location.pathname);
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Hộp Nhận Hàng Thông Minh',
      '/products': 'Danh Mục Sản Phẩm Tủ Nhận Hàng & Phụ Kiện',
      '/cart': 'Giỏ Hàng Của Bạn',
      '/checkout': 'Thanh Toán Đơn Hàng An Toàn',
      '/login': 'Đăng Nhập Tài Khoản Khách Hàng',
      '/register': 'Đăng Ký Tài Khoản Mới',
      '/forgot-password': 'Khôi Phục Mật Khẩu',
      '/reset-password': 'Đặt Lại Mật Khẩu Mới',
      '/account': 'Trung Tâm Quản Lý Thiết Bị & Tài Khoản',
      '/account/devices': 'Quản Lý Thiết Bị Anchor Box',
      '/account/orders': 'Lịch Sử Đơn Hàng Của Tôi',
      '/account/profile': 'Hồ Sơ Cá Nhân',
      '/account/addresses': 'Sổ Địa Chỉ Giao Hàng',
      '/account/warranty': 'Bảo Hành Thiết Bị Của Tôi',
      '/warranty': 'Trung Tâm Bảo Hành & Chăm Sóc Khách Hàng',
      '/about': 'Về Anchor Box',
      '/contact': 'Tư Vấn Khảo Sát & Hỗ Trợ Kỹ Thuật',
      '/compare': 'So Sánh Anchor Box Base, Pro & Solar Max',
      '/order-tracking': 'Tra Cứu Tiến Độ Đơn Hàng Trực Tuyến',
      '/technology': 'Công Nghệ Phần Cứng & Kết Nối',
      '/how-it-works': 'Quy Trình Giao Hàng & Lắp Đặt',
      '/app': 'Ứng Dụng Anchor Box',
    };

    if (location.pathname.startsWith('/products/')) {
      const slug = location.pathname.replace('/products/', '');
      const slugTitles: Record<string, string> = {
        'anchorbox-base': 'Anchor Box Base',
        'anchorbox-pro': 'Anchor Box Pro',
        'anchorbox-solar': 'Anchor Box Solar Max',
      };
      document.title = (slugTitles[slug] || 'Chi Tiết Sản Phẩm') + ' | Anchor Box';
    } else {
      document.title = titles[location.pathname] ? `${titles[location.pathname]} | Anchor Box` : 'Anchor Box — Hộp nhận hàng thông minh';
    }
    const isAuthToggle =
      (prevPathRef.current === '/login' && location.pathname === '/register') ||
      (prevPathRef.current === '/register' && location.pathname === '/login');
    const pathChanged = prevPathRef.current !== location.pathname;
    prevPathRef.current = location.pathname;
    const frame = requestAnimationFrame(() => {
      const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
      if (target) {
        target.classList.add('motion-visible');
        target.setAttribute('tabindex', '-1');
        target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
        target.focus({ preventScroll: true });
      } else if (pathChanged && !isAuthToggle) {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);
  const bare = location.pathname === '/login' || location.pathname === '/register';
  return <><a className="skip" href="#main">Đi đến nội dung</a>
    {!bare && <StoreHeader />}<main id="main" tabIndex={-1}><Routes>
      <Route path="/" element={<StoreHome />} /><Route path="/products" element={<ProductCatalogPage />} /><Route path="/products/:id" element={<ProductDetail />} /><Route path="/compare" element={<ComparePage />} /><Route path="/technology" element={<Technology />} /><Route path="/app" element={<AppStory />} /><Route path="/faq" element={<Faq />} />
      <Route path="/order-tracking" element={<OrderTracking />} /><Route path="/tracking" element={<Navigate to="/order-tracking" replace />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<Contact />} /><Route path="/blog" element={<Blog />} /><Route path="/blog/:slug" element={<Blog />} />
      <Route path="/login" element={<AuthPortal initialMode="login" />} />
      <Route path="/register" element={<AuthPortal initialMode="register" />} />
      <Route path="/forgot-password" element={<AuthRecovery mode="forgot" />} />
      <Route path="/reset-password" element={<AuthRecovery mode="reset" />} />
      <Route path="/cart" element={<Cart />} /><Route path="/checkout" element={<CheckoutRedirect />} /><Route path="/checkout/:orderId" element={<Guard><Checkout /></Guard>} /><Route path="/payments/vnpay/return" element={<Guard><VnpayReturn /></Guard>} /><Route path="/payment/result" element={<Guard><PaymentResult /></Guard>} /><Route path="/order-success/:id" element={<Guard><PaymentResult /></Guard>} />
      <Route path="/account" element={<Guard><AccountHome /></Guard>} />
      <Route path="/account/profile" element={<Guard><AccountHome defaultTab="profile" /></Guard>} />
      <Route path="/account/orders" element={<Guard><AccountHome defaultTab="orders" /></Guard>} />
      <Route path="/account/orders/:id" element={<Guard><OrderDetail /></Guard>} />
      <Route path="/account/orders/:id/invoice" element={<Guard><SalesInvoice /></Guard>} />
      <Route path="/account/orders/:id/ticket" element={<Guard><OrderTicket /></Guard>} />
      <Route path="/account/orders/:id/installation" element={<Guard><InstallationTracking /></Guard>} />
      <Route path="/account/devices" element={<Guard><AccountHome defaultTab="devices" /></Guard>} />
      <Route path="/account/devices/:id" element={<Guard><CustomerDevices /></Guard>} />
      <Route path="/account/notifications" element={<Guard><Navigate to="/account?notifications=open" replace /></Guard>} />
      <Route path="/warranty" element={<Warranty />} />
      <Route path="/account/warranty" element={<Navigate to="/warranty" replace />} />
      <Route path="/account/warranties" element={<Navigate to="/warranty" replace />} />
      <Route path="/account/warranty/claims/new" element={<Guard><Warranty claim /></Guard>} />
      <Route path="/account/addresses" element={<Guard><AccountHome defaultTab="addresses" /></Guard>} />
      <Route path="/demo-payment/:paymentId" element={<Guard><DemoPayment /></Guard>} />
      <Route path="*" element={<section className="container section"><p className="eyebrow">404</p><h1>Không tìm thấy trang.</h1><Link className="button" to="/">Về trang chủ</Link></section>} />
    </Routes></main>{!bare && <footer className="store-footer"><div className="container store-footer-grid"><div><Link className="brand" to="/" aria-label="Anchor Box — trang chủ"><BrandLogo size={22} /></Link><p>Một nơi dành cho bưu kiện.<br />Một lựa chọn cho ngôi nhà của bạn.</p></div><div><h2>Khám phá</h2><Link to="/products">Tất cả sản phẩm</Link><Link to="/compare">So sánh cấu hình</Link><Link to="/technology">Công nghệ</Link></div><div><h2>Hỗ trợ mua hàng</h2><Link to="/how-it-works">Quy trình giao & lắp</Link><Link to="/faq">Câu hỏi thường gặp</Link><Link to="/contact">Liên hệ tư vấn</Link><a href={consultationPhone.href} aria-label={`Gọi tư vấn ${consultationPhone.display}`}>Tư vấn: {consultationPhone.display}</a></div><div><h2>Tài khoản của bạn</h2><Link to="/account">Thông tin tài khoản</Link><Link to="/order-tracking">Theo dõi đơn hàng</Link><Link to="/warranty">Tra cứu bảo hành</Link></div></div><div className="container store-footer-bottom"><span>Anchor Box · Hộp nhận hàng thông minh</span><Link to="/about">Về Anchor Box ↗</Link></div></footer>}{!bare && <ConsultationCall />}</>;
}
export function App() { return <ShopProvider><CatalogProvider><Shell /></CatalogProvider></ShopProvider>; }
export default App;
