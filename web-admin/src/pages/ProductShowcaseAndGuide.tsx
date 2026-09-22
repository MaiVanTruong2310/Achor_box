import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  QrCode,
  Package,
  Cpu,
  Wifi,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Download,
  Share2,
  Printer,
  Copy,
  Check,
  Zap,
  Layers,
  HelpCircle,
  Eye,
  RefreshCw,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  FileText,
  Smartphone,
  Key,
  Flame,
  Shield,
  ThumbsUp,
  X
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { warrantiesService, WarrantyLookupResult } from '../services/api';
import { SmartSafeInteractiveScrolly } from '../components/SmartSafeInteractiveScrolly';
import { PremiumLanding } from '../components/landing/PremiumLanding';
import { catalog, getVariantPrice } from '../components/landing/catalog';

interface ProductShowcaseAndGuideProps {
  initialTab?: 'warranty' | 'products' | 'guide' | 'keypad' | 'mobile' | 'faqs';
  standalone?: boolean;
}

export const ProductShowcaseAndGuide: React.FC<ProductShowcaseAndGuideProps> = ({
  initialTab,
  standalone = false
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const isWarrantyRoute = location.pathname.includes('warranty');

  // Tab State
  const [activeTab, setActiveTab] = useState<'warranty' | 'products' | 'guide' | 'keypad' | 'mobile' | 'faqs'>(() => {
    if (isWarrantyRoute) return 'warranty';
    const tabParam = searchParams.get('tab');
    if (tabParam && ['warranty', 'products', 'guide', 'keypad', 'mobile', 'faqs'].includes(tabParam)) {
      return tabParam as any;
    }
    if (location.pathname.includes('guide')) return 'guide';
    return initialTab || 'products';
  });

  useEffect(() => {
    if (location.pathname.includes('warranty')) {
      setActiveTab('warranty');
    } else if (location.pathname.includes('guide')) {
      const tab = searchParams.get('tab');
      if (tab && ['guide', 'keypad', 'mobile', 'faqs'].includes(tab)) {
        setActiveTab(tab as any);
      } else {
        setActiveTab('guide');
      }
    } else if (location.pathname === '/' || location.pathname.includes('showcase')) {
      setActiveTab('products');
    }
  }, [location.pathname, searchParams]);

  // =========================================================================
  // 1. WARRANTY LOOKUP STATES
  // =========================================================================
  const [serialInput, setSerialInput] = useState<string>(() => {
    return searchParams.get('serial') || '';
  });
  const [searching, setSearching] = useState<boolean>(false);
  const [warrantyResult, setWarrantyResult] = useState<WarrantyLookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState<boolean>(false);

  // Quick Demo Serials
  const DEMO_SERIALS = ['DBX-98C377AD9D60', 'BOX_001', 'DBX-E831CD14F220'];

  const executeLookup = async (serial: string) => {
    if (!serial || !serial.trim()) {
      setLookupError('Vui lòng nhập mã số Serial của hộp hoặc quét mã QR.');
      setWarrantyResult(null);
      return;
    }
    setSearching(true);
    setLookupError(null);
    try {
      const result = await warrantiesService.lookupWarranty(serial);
      setWarrantyResult(result);
      setSearchParams({ serial: serial.trim().toUpperCase(), tab: 'warranty' });
    } catch (err: any) {
      setLookupError('Không thể tra cứu thông tin. Vui lòng kiểm tra lại mã Serial.');
      setWarrantyResult(null);
    } finally {
      setSearching(false);
    }
  };

  // Auto trigger lookup if serial param exists in URL on mount
  useEffect(() => {
    const serialFromUrl = searchParams.get('serial');
    if (serialFromUrl) {
      setSerialInput(serialFromUrl);
      executeLookup(serialFromUrl);
      setActiveTab('warranty');
    }
  }, []);

  const handleCopySerial = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // =========================================================================
  // 2. PRODUCT CONFIGURATOR STATES
  // =========================================================================
  const [selectedModel, setSelectedModel] = useState<'base' | 'pro'>('pro');
  const [selectedSize, setSelectedSize] = useState<'S' | 'M' | 'L'>('M');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [orderForm, setOrderForm] = useState({
    name: '',
    phone: '',
    address: '',
    notes: ''
  });
  const [orderSuccess, setOrderSuccess] = useState<boolean>(false);

  // Price calculations
  const totalPrice = getVariantPrice(selectedModel, selectedSize);

  const SIZES_INFO = {
    S: {
      label: 'Size S (Nhỏ gọn)',
      capacity: '45 Lít',
      dimensions: '35 × 30 × 45 cm',
      maxWeight: '10 kg',
      fitFor: 'Căn hộ chung cư, thư từ, thuốc men, phụ kiện & bưu phẩm nhỏ.',
      badge: 'Tiết kiệm không gian'
    },
    M: {
      label: 'Size M (Tiêu chuẩn)',
      capacity: '85 Lít',
      dimensions: '45 × 40 × 60 cm',
      maxWeight: '25 kg',
      fitFor: 'Hầu hết các hộ gia đình; chứa hộp giày, bưu kiện quần áo, sách vở & hàng online.',
      badge: 'Bán chạy nhất (Khuyên dùng)'
    },
    L: {
      label: 'Size L (Dung tích lớn)',
      capacity: '150 Lít',
      dimensions: '55 × 50 × 80 cm',
      maxWeight: '45 kg',
      fitFor: 'Nhà phố, biệt thự, văn phòng; chứa thùng sữa, đồ gia dụng, kiện hàng cồng kềnh.',
      badge: 'Sức chứa tối đa'
    }
  };

  // =========================================================================
  // 3. FAQ ACCORDION STATES
  // =========================================================================
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const FAQS = [
    {
      q: 'Hộp có hoạt động được khi nhà bị mất điện không?',
      a: 'Hộp sử dụng nguồn Adapter 12V 2A thông dụng. Khi mất điện lưới, hộp có 2 cơ chế dự phòng: 1) Chìa khóa cơ khẩn cấp chống kẹt đi kèm sản phẩm; 2) Cổng kích nguồn 12V khẩn cấp bên dưới hộp (sử dụng sạc dự phòng 12V hoặc ắc quy mini để kích mở nắp ngay lập tức).'
    },
    {
      q: 'Hộp có bị thấm nước khi đặt ngoài trời mưa lớn không?',
      a: 'Hộp được sản xuất bằng thép cán nguội dày 1.5mm sơn tĩnh điện ngoài trời công nghệ AkzoNobel chống rỉ sét, nắp trên có gờ thoát nước nghiêng và gioăng cao su chữ D khép kín đạt chuẩn kháng nước/bụi IP54. Bạn hoàn toàn an tâm khi lắp đặt trước cổng nhà.'
    },
    {
      q: 'Làm sao để shipper biết mật khẩu mở hộp khi tôi vắng nhà?',
      a: 'Bạn có thể: 1) Cài đặt mã PIN cố định hoặc ghi chú mã PIN vào phần địa chỉ giao hàng trên Shopee/Lazada (ví dụ: "Nhập mã 1234# vào hộp nhận hàng trước cửa"); 2) Tạo mã OTP dùng 1 lần (One-Time PIN) trên Ứng dụng di động gửi cho shipper; 3) Bấm nút "MỞ KHÓA TỪ XA" trên điện thoại khi shipper gọi điện.'
    },
    {
      q: 'Dòng SmartBox Pro khác gì so với dòng SmartBox Base?',
      a: 'SmartBox Pro được trang bị thêm Bàn cân điện tử LoadCell HX711 24-bit đặt dưới đáy hộp. Ngay khi shipper bỏ gói hàng vào và đóng nắp, cân sẽ tự động đo trọng lượng và gửi thông báo số kg chính xác về điện thoại của bạn, giúp bạn đối chiếu xem kiện hàng có bị đánh tráo hay rỗng ruột hay không.'
    },
    {
      q: 'Chính sách bảo hành và đổi trả của Anchor Box như thế nào?',
      a: 'Toàn bộ sản phẩm Anchor Box được bảo hành điện tử chính hãng 12 tháng theo mã số Serial trên thân hộp. Trong 30 ngày đầu nếu phát sinh lỗi kỹ thuật từ nhà sản xuất, khách hàng được đổi mới 1-1 tận nhà hoàn toàn miễn phí.'
    }
  ];

  return (
    <div
      style={{
        minHeight: standalone ? '100vh' : 'auto',
        width: '100%',
        background: standalone && activeTab === 'products' ? '#06080f' : (standalone ? 'var(--bg-app)' : 'transparent'),
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-main)',
        paddingBottom: standalone && activeTab !== 'products' ? '80px' : '0',
        transition: 'background 0.3s ease'
      }}
    >
      {/* ===================================================================== */}
      {/* TOP NAVIGATION HEADER (Hiển thị KHI TRUY CẬP ĐỘC LẬP / CÔNG KHAI) */}
      {/* ===================================================================== */}
      {standalone && activeTab !== 'products' && (
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            background: theme === 'dark' ? 'rgba(10, 15, 30, 0.85)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '12px 24px'
          }}
        >
          <div
            style={{
              maxWidth: '1240px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}
          >
            {/* Brand Logo & Name */}
            <div
              onClick={() => {
                setActiveTab('products');
                navigate('/');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer'
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  padding: '3px',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}
              >
                <img src="/Logo.png" alt="Anchor Box" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  ANCHOR BOX
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Hộp Nhận Hàng Thông Minh IoT
                </div>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--bg-card)',
                padding: '4px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)'
              }}
              className="guide-desktop-nav"
            >
              <button
                onClick={() => {
                  setActiveTab('products');
                  if (standalone) navigate('/');
                  else setSearchParams({ tab: 'products' });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: (activeTab as string) === 'products' ? '#2563eb' : 'transparent',
                  color: (activeTab as string) === 'products' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Package size={16} />
                <span>Trang Chủ SmartBox</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('guide');
                  if (standalone) navigate('/guide');
                  else setSearchParams({ tab: 'guide' });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'guide' ? '#2563eb' : 'transparent',
                  color: activeTab === 'guide' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <FileText size={16} />
                <span>Cẩm Nang 5 Bước</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('keypad');
                  if (standalone) navigate('/guide?tab=keypad');
                  else setSearchParams({ tab: 'keypad' });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'keypad' ? '#2563eb' : 'transparent',
                  color: activeTab === 'keypad' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Key size={16} />
                <span>Phím Tắt 4x4</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('warranty');
                  if (standalone) navigate('/warranty');
                  else navigate('/admin/warranty');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'warranty' ? '#2563eb' : 'transparent',
                  color: activeTab === 'warranty' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <QrCode size={16} />
                <span>Tra Cứu Bảo Hành (QR)</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('faqs');
                  if (standalone) navigate('/guide?tab=faqs');
                  else setSearchParams({ tab: 'faqs' });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'faqs' ? '#2563eb' : 'transparent',
                  color: activeTab === 'faqs' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <HelpCircle size={16} />
                <span>Hỏi Đáp FAQs</span>
              </button>
            </nav>

            {/* Right Action: Theme Toggle & Admin Access */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={toggleTheme}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
                title="Chuyển chế độ sáng/tối"
              >
                {theme === 'dark' ? <Sun size={18} color="#fbbf24" /> : <Moon size={18} color="#2563eb" />}
              </button>

              <button
                onClick={() => {
                  if (user) {
                    navigate('/dashboard');
                  } else {
                    navigate('/login');
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: '1px solid #2563eb',
                  background: 'rgba(37, 99, 235, 0.1)',
                  color: '#2563eb',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {user ? (
                  <>
                    <Shield size={14} />
                    <span>Trang Quản Trị</span>
                  </>
                ) : (
                  <>
                    <span>Đăng Nhập Quản Trị</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* ===================================================================== */}
      {/* HERO BANNER (Chỉ hiển thị khi người ngoài truy cập các tab tra cứu/sản phẩm) */}
      {/* ===================================================================== */}
      {standalone && activeTab !== 'guide' && activeTab !== 'products' && (
        <section
          style={{
            position: 'relative',
            padding: '48px 24px 32px 24px',
            textAlign: 'center',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '0%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '800px',
              height: '400px',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse at center, rgba(37, 99, 235, 0.15) 0%, rgba(14, 165, 233, 0.08) 50%, transparent 80%)',
              filter: 'blur(80px)',
              pointerEvents: 'none',
              zIndex: 1
            }}
          />

          <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '20px',
                background: 'rgba(37, 99, 235, 0.12)',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                color: '#3b82f6',
                fontSize: '0.8125rem',
                fontWeight: 700,
                marginBottom: '16px'
              }}
            >
              <Sparkles size={15} />
              <span>HỆ THỐNG GIAO NHẬN THÔNG MINH ANCHOR BOX 2026</span>
            </div>

            <h1
              style={{
                fontSize: '2.6rem',
                fontWeight: 900,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                margin: '0 0 16px 0',
                color: 'var(--text-primary)'
              }}
            >
              An Tâm Nhận Bưu Phẩm Khi Vắng Nhà Với{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg, #0ea5e9 0%, #2563eb 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Anchor Box IoT
              </span>
            </h1>

            <p
              style={{
                fontSize: '1.05rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                margin: '0 auto 28px auto',
                maxWidth: '680px'
              }}
            >
              Tự động mở khóa cho shipper qua mã OTP bàn phím hoặc điều khiển từ xa bằng ứng dụng di động.
              Cảm biến tải trọng kiểm tra cân nặng bưu phẩm tức thời, chống cạy phá và bảo hành chính hãng 12 tháng.
            </p>
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* ADMIN PAGE HEADER (Hiển thị CHUẨN GIAO DIỆN ADMIN khi ở trong Dashboard) */}
      {/* ===================================================================== */}
      {!standalone && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {isWarrantyRoute ? 'Tra Cứu Bảo Hành Điện Tử (QR Code)' : 'Trợ giúp — Cẩm nang sử dụng'}
              </h1>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
                ANCHOR BOX
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              {isWarrantyRoute
                ? 'Nhập số Serial hoặc quét mã QR trên thân hộp vật lý để kiểm tra bảo hành và thông số máy.'
                : 'Hướng dẫn vận hành SmartBox, tra cứu phím tắt và giải đáp các câu hỏi thường gặp.'}
            </p>
          </div>

          {/* Sub Navigation Pills for Guide mode */}
          {!isWarrantyRoute && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--bg-card)',
                padding: '4px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('guide')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'guide' ? '#2563eb' : 'transparent',
                  color: activeTab === 'guide' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <FileText size={15} />
                <span>Cẩm Nang 5 Bước</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('keypad')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'keypad' ? '#2563eb' : 'transparent',
                  color: activeTab === 'keypad' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Key size={15} />
                <span>Phím Tắt 4x4</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('faqs')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === 'faqs' ? '#2563eb' : 'transparent',
                  color: activeTab === 'faqs' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <HelpCircle size={15} />
                <span>Hỏi Đáp FAQs</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Container */}
      <main style={{ maxWidth: standalone && activeTab !== 'products' ? '1240px' : '100%', margin: standalone && activeTab !== 'products' ? '0 auto' : '0', padding: standalone && activeTab !== 'products' ? '0 24px' : '0', position: 'relative', zIndex: 2 }}>

        {/* =================================================================== */}
        {/* TAB 1: TRA CỨU BẢO HÀNH THEO SERIAL (QR CODE LOOKUP) */}
        {/* =================================================================== */}
        {activeTab === 'warranty' && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Search Box Card */}
            <div
              style={{
                background: 'var(--bg-card)',
                borderRadius: '20px',
                border: '1px solid var(--border-subtle)',
                padding: '36px 32px',
                boxShadow: 'var(--shadow-card)',
                maxWidth: '780px',
                margin: '0 auto',
                width: '100%'
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px auto'
                  }}
                >
                  <ShieldCheck size={26} strokeWidth={2.2} />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                  Tra Cứu Bảo Hành Điện Tử
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Nhập mã Serial dán trên thân hộp hoặc quét mã QR bằng camera để kiểm tra thời hạn và thông số phần cứng.
                </p>
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  executeLookup(serialInput);
                }}
                style={{ display: 'flex', gap: '10px', alignItems: 'center' }}
              >
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search
                    size={18}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="text"
                    placeholder="Nhập mã Serial (Ví dụ: DBX-98C377AD9D60 hoặc BOX_001)..."
                    value={serialInput}
                    onChange={(e) => setSerialInput(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '14px 14px 14px 44px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle)',
                      background: theme === 'dark' ? 'rgba(18, 27, 48, 0.8)' : '#f9fafb',
                      color: 'var(--text-primary)',
                      fontSize: '0.9375rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      outline: 'none',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                    }}
                  />
                  {serialInput && (
                    <button
                      type="button"
                      onClick={() => setSerialInput('')}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 4
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={searching}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '14px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {searching ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Đang kiểm tra...</span>
                    </>
                  ) : (
                    <>
                      <Search size={16} />
                      <span>Tra cứu</span>
                    </>
                  )}
                </button>
              </form>

              {/* Quick Sample Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Mã mẫu có sẵn:</span>
                {DEMO_SERIALS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSerialInput(s);
                      executeLookup(s);
                    }}
                    style={{
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {lookupError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#ef4444',
                    fontSize: '0.8125rem',
                    marginTop: '16px'
                  }}
                >
                  <AlertTriangle size={18} />
                  <span>{lookupError}</span>
                </div>
              )}
            </div>

            {/* WARRANTY CERTIFICATE CARD (If Found) */}
            {warrantyResult && (
              <div
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: '24px',
                  border: warrantyResult.isValid ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(239, 68, 68, 0.35)',
                  boxShadow: '0 20px 40px -15px rgba(0,0,0,0.2)',
                  overflow: 'hidden',
                  maxWidth: '860px',
                  margin: '0 auto',
                  width: '100%',
                  animation: 'fadeIn 0.3s ease'
                }}
              >
                {/* Certificate Header Banner */}
                <div
                  style={{
                    padding: '24px 32px',
                    background: warrantyResult.isValid
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(37, 99, 235, 0.08) 100%)'
                      : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(245, 158, 11, 0.08) 100%)',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        background: warrantyResult.isValid ? '#10b981' : '#ef4444',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: warrantyResult.isValid
                          ? '0 8px 20px rgba(16, 185, 129, 0.4)'
                          : '0 8px 20px rgba(239, 68, 68, 0.4)'
                      }}
                    >
                      {warrantyResult.isValid ? <ShieldCheck size={28} strokeWidth={2.4} /> : <AlertTriangle size={28} />}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.6875rem',
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            background: warrantyResult.isValid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: warrantyResult.isValid ? '#10b981' : '#ef4444'
                          }}
                        >
                          {warrantyResult.isValid ? 'CHÍNH HÃNG HỢP LỆ' : 'HẾT HẠN'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Hạn đến: {warrantyResult.endDate}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '4px 0 0 0', color: 'var(--text-primary)' }}>
                        {warrantyResult.productName}
                      </h3>
                    </div>
                  </div>

                  {/* Serial badge with copy */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Serial:</span>
                    <span style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#2563eb' }}>
                      {warrantyResult.serialNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopySerial(warrantyResult.serialNumber)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                      title="Sao chép Serial"
                    >
                      {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                {/* Certificate Body Grid */}
                <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
                  {/* Left Column: Warranty Timeline & Customer Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} color="#2563eb" />
                      <span>Thời Hạn & Hiệu Lực Bảo Hành</span>
                    </div>

                    {/* Remaining Days Counter */}
                    <div
                      style={{
                        padding: '16px',
                        borderRadius: '14px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Thời gian bảo hành còn lại:</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: warrantyResult.isValid ? '#10b981' : '#ef4444' }}>
                          {warrantyResult.remainingDays} Ngày
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Từ ngày: {warrantyResult.startDate}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Đến ngày: {warrantyResult.endDate}</div>
                      </div>
                    </div>

                    {/* Masked Owner Info */}
                    <div
                      style={{
                        padding: '16px',
                        borderRadius: '14px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Thông Tin Đăng Ký Sở Hữu (Bảo Mật)
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Khách hàng:</span>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{warrantyResult.ownerNameMasked}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Số điện thoại:</span>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{warrantyResult.ownerPhoneMasked}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Khu vực:</span>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{warrantyResult.locationLabel}</span>
                      </div>
                    </div>

                    {/* Warranty Rights */}
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                        Quyền Lợi Bảo Hành Chính Hãng:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {warrantyResult.features.map((f, i) => (
                          <li key={i} style={{ fontSize: '0.78125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Right Column: Hardware Specs & Action Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Cpu size={16} color="#0ea5e9" />
                      <span>Cấu Hình Phần Cứng Đã Kiểm Nghiệm</span>
                    </div>

                    <div
                      style={{
                        padding: '16px',
                        borderRadius: '14px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      {warrantyResult.hardwareSpecs.map((spec, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.78125rem',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          <CheckCircle2 size={14} color="#10b981" style={{ flexShrink: 0 }} />
                          <span>{spec}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action Call to Action */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
                      <button
                        type="button"
                        onClick={() => {
                          alert(`Đã tiếp nhận yêu cầu hỗ trợ cho Serial: ${warrantyResult.serialNumber}. Đội ngũ kỹ thuật Anchor Box sẽ liên hệ số điện thoại ${warrantyResult.ownerPhoneMasked} trong vòng 15 phút!`);
                        }}
                        style={{
                          width: '100%',
                          padding: '13px',
                          borderRadius: '12px',
                          border: 'none',
                          background: '#10b981',
                          color: '#ffffff',
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        <Phone size={16} />
                        <span>Yêu Cầu Hỗ Trợ Kỹ Thuật / Sửa Chữa</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('guide')}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '12px',
                          border: '1px solid var(--border-subtle)',
                          background: 'transparent',
                          color: 'var(--text-primary)',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        <FileText size={15} />
                        <span>Xem Cẩm Nang Sử Dụng Thiết Bị</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* =================================================================== */}
        {/* TAB 2: DÒNG SẢN PHẨM & TÍNH GIÁ (PRODUCT CONFIGURATOR) */}
        {/* =================================================================== */}
        {activeTab === 'products' && (
          standalone ? (
            <PremiumLanding
              onNavigateTab={(tab) => {
                setActiveTab(tab as any);
                if (tab === 'products') navigate('/');
                else if (tab === 'guide') navigate('/guide');
                else if (tab === 'keypad') navigate('/guide?tab=keypad');
                else if (tab === 'warranty') navigate('/warranty');
              }}
              onOpenOrderModal={(model, size) => {
                setOrderSuccess(false);
                setSelectedModel(model);
                setSelectedSize(size);
                setIsOrderModalOpen(true);
              }}
              onExecuteWarrantyLookup={(serial) => {
                setSerialInput(serial);
                executeLookup(serial);
                setActiveTab('warranty');
                navigate(`/warranty?serial=${encodeURIComponent(serial.trim().toUpperCase())}`);
              }}
            />
          ) : (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Interactive 3D Guide Feature Callout Banner */}
            <div
              style={{
                maxWidth: '960px',
                margin: '0 auto',
                width: '100%',
                padding: '20px 24px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(14, 165, 233, 0.08) 100%)',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '14px',
                    background: '#0f172a',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)'
                  }}
                >
                  <img
                    src="/smart_safe_cutout.png"
                    alt="Smart Safe 3D"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#2563eb', color: '#ffffff' }}>
                      MỚI 2026
                    </span>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Trải Nghiệm Scrollytelling 3D & Bàn Thử Nghiệm Ảo
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    Xem mô hình hộp Acrylic chuyển động theo cuộn chuột, bóc tách vi mạch & thử bấm mã PIN trên bàn phím ảo.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('guide');
                  if (standalone) navigate('/guide');
                  else setSearchParams({ tab: 'guide' });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)'
                }}
              >
                <span>Xem Ngay</span>
                <ArrowRight size={15} />
              </button>
            </div>

            {/* Model Selector Bar (Base vs Pro) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '20px',
                maxWidth: '960px',
                margin: '0 auto',
                width: '100%'
              }}
            >
              {/* Option 1: Base */}
              <div
                onClick={() => setSelectedModel('base')}
                style={{
                  padding: '24px',
                  borderRadius: '18px',
                  background: selectedModel === 'base' ? 'var(--bg-card)' : 'var(--bg-surface)',
                  border: selectedModel === 'base' ? '2px solid #2563eb' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: selectedModel === 'base' ? '0 12px 28px rgba(37, 99, 235, 0.2)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Dòng tiêu chuẩn</span>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>
                      Anchor Box Base
                    </h3>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2563eb' }}>
                    1.890.000 đ
                  </div>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 14px 0' }}>
                  Hộp khóa chốt điện tử Solenoid + Servo tự động, bàn phím ma trận số và điều khiển mở khóa từ xa qua App.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78125rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                    <Check size={14} color="#10b981" /> <span>Chốt điện Solenoid + Động cơ Servo 90°</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                    <Check size={14} color="#10b981" /> <span>Cảm biến cửa từ MC-38 chống cạy phá</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                    <Check size={14} color="#10b981" /> <span>Bàn phím cơ 4x4 nhập OTP cho shipper</span>
                  </div>
                </div>
              </div>

              {/* Option 2: Pro */}
              <div
                onClick={() => setSelectedModel('pro')}
                style={{
                  padding: '24px',
                  borderRadius: '18px',
                  background: selectedModel === 'pro' ? 'var(--bg-card)' : 'var(--bg-surface)',
                  border: selectedModel === 'pro' ? '2px solid #0ea5e9' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: selectedModel === 'pro' ? '0 12px 28px rgba(14, 165, 233, 0.2)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '20px',
                    padding: '2px 10px',
                    borderRadius: '20px',
                    background: 'linear-gradient(90deg, #0ea5e9, #2563eb)',
                    color: '#ffffff',
                    fontSize: '0.6875rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em'
                  }}
                >
                  BÁN CHẠY NHẤT ★
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#0ea5e9', fontWeight: 700, textTransform: 'uppercase' }}>Bản Cao Cấp Đầy Đủ</span>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>
                      Anchor Box Pro IoT
                    </h3>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0ea5e9' }}>
                    2.590.000 đ
                  </div>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 14px 0' }}>
                  Bao gồm toàn bộ tính năng Base + Tích hợp Bàn Cân LoadCell HX711 24-bit phát hiện hàng & chống tráo bưu phẩm.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78125rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                    <Check size={14} color="#10b981" /> <span>Đầy đủ tính năng dòng Base</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0ea5e9', fontWeight: 700 }}>
                    <Check size={14} color="#0ea5e9" /> <span>Cảm biến cân nặng LoadCell HX711 24-bit</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                    <Check size={14} color="#10b981" /> <span>Thông báo trọng lượng bưu phẩm về App</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Size Variant Selector */}
            <div
              style={{
                background: 'var(--bg-card)',
                borderRadius: '24px',
                border: '1px solid var(--border-subtle)',
                padding: '32px',
                boxShadow: 'var(--shadow-card)',
                maxWidth: '960px',
                margin: '0 auto',
                width: '100%'
              }}
            >
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                  Chọn Kích Thước Hộp Phù Hợp (Size S, M, L)
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Tùy chỉnh dung tích lọt lòng theo nhu cầu nhận hàng của gia đình hoặc văn phòng bạn.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                {(['S', 'M', 'L'] as const).map((s) => {
                  const info = SIZES_INFO[s];
                  const isSelected = selectedSize === s;
                  const delta = s === 'S' ? 0 : s === 'M' ? 300000 : 700000;

                  return (
                    <div
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      style={{
                        padding: '20px',
                        borderRadius: '16px',
                        background: isSelected ? 'var(--bg-card)' : 'var(--bg-surface)',
                        border: isSelected ? '2px solid #2563eb' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 8px 20px rgba(37, 99, 235, 0.15)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {info.label}
                        </span>
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: isSelected ? '#2563eb' : 'var(--border-subtle)',
                            color: isSelected ? '#ffffff' : 'var(--text-muted)'
                          }}
                        >
                          {info.capacity}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', color: '#2563eb', fontWeight: 700, marginBottom: '6px' }}>
                        {delta > 0 ? `+ ${delta.toLocaleString('vi-VN')} đ` : 'Giá chuẩn'}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        <strong>Kích thước:</strong> {info.dimensions}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        <strong>Tải trọng:</strong> {info.maxWeight}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {info.fitFor}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Configuration Summary & Order CTA */}
              <div
                style={{
                  padding: '20px 24px',
                  borderRadius: '16px',
                  background: theme === 'dark' ? 'rgba(30, 41, 59, 0.7)' : '#f1f5f9',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Cấu hình đang chọn:</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {selectedModel === 'pro' ? 'Anchor Box Pro IoT (Bản Cao Cấp)' : 'Anchor Box Base (Bản Tiêu Chuẩn)'} — {SIZES_INFO[selectedSize].label}
                  </div>
                  <div style={{ fontSize: '0.78125rem', color: '#10b981', fontWeight: 600 }}>
                    ✓ Sẵn hàng tại kho • Miễn phí vận chuyển toàn quốc • Bảo hành 12 tháng
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tổng thanh toán:</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#2563eb' }}>
                      {totalPrice.toLocaleString('vi-VN')} đ
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOrderModalOpen(true)}
                    style={{
                      padding: '14px 28px',
                      borderRadius: '12px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      color: '#ffffff',
                      fontSize: '0.9375rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 6px 18px rgba(37, 99, 235, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>Đặt Mua Ngay</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </section>
          )
        )}

        {/* =================================================================== */}
        {/* TAB 3: CẨM NANG HƯỚNG DẪN SỬ DỤNG ĐỘNG & SCROLLYTELLING HỘP 3D */}
        {/* =================================================================== */}
        {activeTab === 'guide' && (
          <SmartSafeInteractiveScrolly
            onOrderClick={() => setIsOrderModalOpen(true)}
            onWarrantyClick={() => setActiveTab('warranty')}
          />
        )}

        {/* =================================================================== */}
        {/* TAB 4: BẢNG PHÍM TẮT 4X4 (HARDWARE KEYPAD CHEAT SHEET) */}
        {/* =================================================================== */}
        {activeTab === 'keypad' && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: 'rgba(37, 99, 235, 0.1)',
                  color: '#2563eb',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  marginBottom: '10px'
                }}
              >
                <Key size={15} />
                <span>BÀN PHÍM KIM LOẠI MA TRẬN 4X4 I2C PCF8574</span>
              </div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                Bảng Tra Cứu Phím Tắt Phần Cứng
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                Các tổ hợp phím được lập trình sẵn trong Firmware ESP32 để tra cứu nhanh thông số hộp trên màn hình LCD.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {/* Shortcut 1: Instant Lock */}
              <div
                style={{
                  padding: '24px',
                  borderRadius: '18px',
                  background: 'var(--bg-card)',
                  border: '2px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>
                    Khóa Khẩn Cấp
                  </span>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: '#ef4444',
                      color: '#ffffff',
                      fontSize: '1.4rem',
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    *
                  </div>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Khóa Thủ Công Lập Tức
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Bấm phím <strong>*</strong> bất kỳ lúc nào để giật chốt Solenoid và quay Servo khóa hộp ngay lập tức mà không cần nhập mật khẩu hay bấm phím #.
                </p>
              </div>

              {/* Shortcut 2: Unlock with PIN */}
              <div
                style={{
                  padding: '24px',
                  borderRadius: '18px',
                  background: 'var(--bg-card)',
                  border: '2px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>
                    Mở Khóa Tiêu Chuẩn
                  </span>
                  <div
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: '#10b981',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    [Mã PIN] + #
                  </div>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Xác Nhận Mật Khẩu / OTP
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Nhập mã số PIN (ví dụ: <code style={{ color: '#10b981' }}>1234</code>) rồi nhấn phím <strong>#</strong> để gửi tín hiệu mở chốt khóa nắp.
                </p>
              </div>

              {/* Shortcut 3: Show Serial Number */}
              <div
                style={{
                  padding: '24px',
                  borderRadius: '18px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>
                    Tra Cứu Mã Hộp
                  </span>
                  <div
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: 'var(--bg-surface)',
                      color: '#2563eb',
                      fontSize: '0.8125rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    A-B-C-D-#
                  </div>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Xem Mã Số Serial Thiết Bị
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Bấm lần lượt các phím <strong>A -&gt; B -&gt; C -&gt; D -&gt; #</strong>: Màn hình LCD sẽ hiển thị số Serial của hộp (ví dụ <code style={{ color: '#2563eb' }}>DBX-98C377AD9D60</code>) trong 10 giây để liên kết App.
                </p>
              </div>

              {/* Shortcut 4: Show WiFi & IP */}
              <div
                style={{
                  padding: '24px',
                  borderRadius: '18px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0ea5e9', textTransform: 'uppercase' }}>
                    Kiểm Tra Mạng
                  </span>
                  <div
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: 'var(--bg-surface)',
                      color: '#0ea5e9',
                      fontSize: '0.8125rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    A-D-#
                  </div>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Xem Tên Wi-Fi & Địa Chỉ IP
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Bấm lần lượt <strong>A -&gt; D -&gt; #</strong>: Màn hình LCD hiển thị tên mạng Wi-Fi và địa chỉ IP nội bộ của mạch ESP32 để kỹ thuật viên kiểm tra kết nối.
                </p>
              </div>

              {/* Shortcut 5: Show Owner User ID */}
              <div
                style={{
                  padding: '24px',
                  borderRadius: '18px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase' }}>
                    Chủ Sở Hữu
                  </span>
                  <div
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: 'var(--bg-surface)',
                      color: '#8b5cf6',
                      fontSize: '0.8125rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    D-C-B-A-#
                  </div>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Xem User ID Đã Liên Kết
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Bấm lần lượt <strong>D -&gt; C -&gt; B -&gt; A -&gt; #</strong>: Màn hình LCD sẽ cuộn hiển thị mã định danh tài khoản chủ nhân đã ghép nối với hộp trên máy chủ.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* =================================================================== */}
        {/* TAB 5: CÂU HỎI THƯỜNG GẶP (FAQS) */}
        {/* =================================================================== */}
        {activeTab === 'faqs' && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '820px', margin: '0 auto', width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                Câu Hỏi Thường Gặp (FAQs)
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                Giải đáp nhanh các thắc mắc về lắp đặt, bảo mật, thời tiết và bảo hành thiết bị Anchor Box.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {FAQS.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-card)',
                      borderRadius: '16px',
                      border: '1px solid var(--border-subtle)',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      style={{
                        width: '100%',
                        padding: '18px 24px',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        gap: '16px'
                      }}
                    >
                      <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {faq.q}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </span>
                    </button>

                    {isOpen && (
                      <div
                        style={{
                          padding: '0 24px 20px 24px',
                          fontSize: '0.84375rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.6,
                          borderTop: '1px solid var(--border-subtle)'
                        }}
                      >
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </main>

      {/* ===================================================================== */}
      {/* CUSTOMER FOOTER (Hiển thị ở chân trang độc lập B2C) */}
      {/* ===================================================================== */}
      {standalone && activeTab !== 'products' && (
        <footer
          style={{
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            padding: '48px 24px 32px 24px',
            marginTop: '80px',
            position: 'relative',
            zIndex: 2
          }}
        >
          <div
            style={{
              maxWidth: '1240px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '32px',
              marginBottom: '32px'
            }}
          >
            {/* Col 1: Brand Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(37,99,235,0.2)'
                  }}
                >
                  <img src="/Logo.png" alt="Anchor Box" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    ANCHOR BOX
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Hệ Thống Hộp Nhận Hàng IoT 2026
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                Giải pháp giao nhận hàng thông minh chống trộm cắp và bảo quản bưu phẩm tự động thời kỳ thương mại điện tử 4.0.
              </p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Đồ án tốt nghiệp Khoa CNTT - Học Viện Ngân Hàng
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px 0' }}>
                Khám Phá & Sản Phẩm
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                <li>
                  <span style={{ cursor: 'pointer' }} onClick={() => { setActiveTab('products'); navigate('/'); }}>
                    Anchor Box Base (Bản tiêu chuẩn)
                  </span>
                </li>
                <li>
                  <span style={{ cursor: 'pointer' }} onClick={() => { setActiveTab('products'); navigate('/'); }}>
                    Anchor Box Pro (Màn hình LCD + Bàn phím)
                  </span>
                </li>
                <li>
                  <span style={{ cursor: 'pointer' }} onClick={() => { setActiveTab('guide'); navigate('/guide'); }}>
                    Cẩm nang hướng dẫn sử dụng 5 bước
                  </span>
                </li>
                <li>
                  <span style={{ cursor: 'pointer' }} onClick={() => { setActiveTab('keypad'); navigate('/guide?tab=keypad'); }}>
                    Bảng tra phím tắt Keypad 4x4
                  </span>
                </li>
              </ul>
            </div>

            {/* Col 3: Warranty & Support */}
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px 0' }}>
                Bảo Hành & Tra Cứu QR
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                <li>
                  <span style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 600 }} onClick={() => { setActiveTab('warranty'); navigate('/warranty'); }}>
                    🔍 Tra cứu Serial bảo hành hộp
                  </span>
                </li>
                <li>Chính sách bảo hành 12 tháng chính hãng</li>
                <li>Hỗ trợ kiểm định cân tải trọng & chốt khóa</li>
                <li>Cập nhật firmware OTA định kỳ qua WiFi</li>
              </ul>
            </div>

            {/* Col 4: Contact & Hotlines */}
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px 0' }}>
                Hỗ Trợ Khách Hàng
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={15} color="#2563eb" />
                  <span>Hotline: 1900 8866 (8h00 - 20h00)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={15} color="#2563eb" />
                  <span>support@anchorbox.vn</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={15} color="#2563eb" />
                  <span>12 Chùa Bộc, Đống Đa, Hà Nội</span>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              maxWidth: '1240px',
              margin: '0 auto',
              paddingTop: '20px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}
          >
            <div>© 2026 ANCHOR BOX. Bản quyền thuộc về Nhóm Nghiên Cứu Đồ Án Tốt Nghiệp HVNH.</div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <span style={{ cursor: 'pointer' }} onClick={() => { setActiveTab('faqs'); navigate('/guide?tab=faqs'); }}>Điều khoản sử dụng</span>
              <span style={{ cursor: 'pointer' }} onClick={() => { setActiveTab('warranty'); navigate('/warranty'); }}>Chính sách bảo hành</span>
              <span style={{ cursor: 'pointer' }} onClick={() => navigate('/login')}>Cổng Quản Trị Nội Bộ</span>
            </div>
          </div>
        </footer>
      )}

      {/* ===================================================================== */}
      {/* ORDER MODAL */}
      {/* ===================================================================== */}
      {isOrderModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setIsOrderModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Xem trước lựa chọn SmartBox"
            style={{
              background: 'var(--bg-card)',
              borderRadius: '24px',
              border: '1px solid var(--border-subtle)',
              padding: '32px',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '90dvh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                  Lựa chọn SmartBox của bạn
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {catalog[selectedModel].name} — {SIZES_INFO[selectedSize].label}
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng bản xem trước"
                onClick={() => setIsOrderModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {orderSuccess ? (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto'
                  }}
                >
                  <CheckCircle2 size={32} />
                </div>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                  Đã hoàn tất bản xem trước
                </h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                  Đây là bản xem trước. Thông tin chưa được gửi và chưa có đơn hàng nào được tạo.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsOrderModalOpen(false);
                    setOrderSuccess(false);
                  }}
                  style={{
                    padding: '12px 28px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Đóng
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!orderForm.name || !orderForm.phone || !orderForm.address) {
                    alert('Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ nhận hàng.');
                    return;
                  }
                  setOrderSuccess(true);
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Giá tham khảo · bản xem trước:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2563eb' }}>
                    {totalPrice.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Họ và tên người nhận *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn An"
                    value={orderForm.name}
                    onChange={(e) => setOrderForm({ ...orderForm, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84375rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Số điện thoại liên hệ *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Ví dụ: 0987654321"
                    value={orderForm.phone}
                    onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84375rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Địa chỉ giao hàng chi tiết *</label>
                  <input
                    type="text"
                    required
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/TP"
                    value={orderForm.address}
                    onChange={(e) => setOrderForm({ ...orderForm, address: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84375rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Ghi chú đơn hàng (Tùy chọn)</label>
                  <textarea
                    rows={2}
                    placeholder="Yêu cầu giao giờ hành chính, hướng dẫn lắp đặt..."
                    value={orderForm.notes}
                    onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84375rem',
                      outline: 'none',
                      resize: 'none'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                    marginTop: '8px'
                  }}
                >
                  Xem Trước Lựa Chọn
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductShowcaseAndGuide;
