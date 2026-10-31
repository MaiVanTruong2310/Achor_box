import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ShieldCheck,
  Lock,
  Unlock,
  Video,
  Sun,
  Scale,
  KeyRound,
  ChevronRight,
  UserCheck,
  Scan,
  Wifi,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Zap,
  ShoppingBag,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useCatalog } from '../CatalogContext';
import { money } from '../api/shop';
import { AppleProductViewer } from '../components/AppleProductViewer';
import { Faq, Journey } from './ShopPublic';
import { AppEcosystem } from '../components/AppEcosystem';
import '../apple-home.css';

type CategoryKey = 'parcels' | 'security' | 'climate' | 'camera' | 'solar';
type SimMode = 'idle' | 'delivery' | 'tamper' | 'remote_open';

// Video nền thực tế phù hợp chính xác với nghiệp vụ tủ thông minh SmartBox / AnchorBox
const SMARTBOX_VIDEO_SCENES: Record<CategoryKey, { src: string; title: string }> = {
  parcels: {
    src: '/videos/smartbox-delivery.mp4',
    title: 'Shipper giao kiện hàng tận cửa'
  },
  security: {
    src: '/videos/smartbox-keypad.mp4',
    title: 'Bấm mã số chốt khóa điện tử'
  },
  climate: {
    src: '/videos/smartbox-lockers.mp4',
    title: 'Khoang tủ bưu phẩm tự động'
  },
  camera: {
    src: '/videos/delivery-hero.mp4',
    title: 'Bưu kiện an toàn trước hiên nhà'
  },
  solar: {
    src: '/videos/smartbox-delivery.mp4',
    title: 'Giao nhận tự động 24/7'
  }
};

export function StoreHome() {
  const catalog = useCatalog();

  // Filter active products from backend if available
  const products = catalog.data?.filter(p => p.isActive) || [];

  // Interactive Apple Category Pills State
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('parcels');

  // Video Background & Playback State (Gắn với nghiệp vụ tủ Smartbox)
  const currentVideo = SMARTBOX_VIDEO_SCENES[activeCategory] || SMARTBOX_VIDEO_SCENES.parcels;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  // Tự động reload và phát mượt mà khi đổi kịch bản Smartbox
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      if (isVideoPlaying) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [currentVideo.src]);

  const toggleVideoPlay = () => {
    if (!videoRef.current) return;
    if (isVideoPlaying) {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsVideoPlaying(true);
    }
  };

  const toggleVideoMute = () => {
    if (!videoRef.current) return;
    const next = !isMuted;
    videoRef.current.muted = next;
    setIsMuted(next);
  };

  // Interactive Remote Lock Widget State
  const [isLocked, setIsLocked] = useState(true);

  // Interactive Smart Delivery Flowchart Step
  const [activeDeliveryStep, setActiveDeliveryStep] = useState<number>(1);

  // Interactive Live Hardware Simulator State (Điểm nhấn thuyết trình Đồ án Tốt nghiệp)
  const [simMode, setSimMode] = useState<SimMode>('idle');
  const [simWeight, setSimWeight] = useState<number>(1450);
  const [simDoorOpen, setSimDoorOpen] = useState<boolean>(false);
  const [simUvcActive, setSimUvcActive] = useState<boolean>(false);
  const [simAlarmActive, setSimAlarmActive] = useState<boolean>(false);
  const [simLog, setSimLog] = useState<string>('Hệ thống AnchorBox sẵn sàng ở trạng thái chờ nhận hàng.');

  const runSimulation = (mode: SimMode) => {
    setSimMode(mode);
    if (mode === 'delivery') {
      setSimDoorOpen(true);
      setSimAlarmActive(false);
      setSimLog('Shipper nhập mã OTP 1 lần [582914]. Ngàm khóa mở êm ái...');
      setTimeout(() => {
        setSimWeight(prev => prev + 850);
        setSimDoorOpen(false);
        setSimUvcActive(true);
        setSimLog('Bưu kiện Shopee (+850g) đã vào khoang. Cửa đóng chốt an toàn. Đèn UV-C diệt khuẩn kích hoạt 180s. Đã gửi thông báo kèm ảnh tới Smartphone!');
      }, 1500);
    } else if (mode === 'tamper') {
      setSimDoorOpen(false);
      setSimAlarmActive(true);
      setSimUvcActive(false);
      setSimLog('CẢNH BÁO: Phát hiện rung lắc cạy nắp bạo lực! Ngàm thép khóa cứng chịu lực 250kg. Còi hú 90dB kích hoạt. Thông báo khẩn cấp gửi tới gia chủ!');
    } else if (mode === 'remote_open') {
      setSimAlarmActive(false);
      setSimDoorOpen(true);
      setSimLog('Gia chủ gửi lệnh mở khóa từ xa qua Wi-Fi / MQTT. Khóa điện tử nhả chốt, nắp khoang mở nhẹ nhàng.');
    } else {
      setSimDoorOpen(false);
      setSimAlarmActive(false);
      setSimUvcActive(false);
      setSimWeight(1450);
      setSimLog('Đã khôi phục trạng thái cảm biến ban đầu: Khóa an toàn, Cân đo 1.450g, Pin 98%.');
    }
  };

  // Telemetry metadata mapping for each category pill
  const telemetryData: Record<CategoryKey, {
    eyebrow: string;
    title: string;
    value: string;
    desc: string;
    badgeColor: string;
    glowClass: string;
    dotClass: string;
  }> = {
    parcels: {
      eyebrow: 'BẢO VỆ ĐƠN HÀNG KHI VẮNG NHÀ',
      title: '2 kiện bưu phẩm đã nhận an toàn',
      value: '1.45 kg · Đã diệt khuẩn UV-C',
      desc: 'Shipper Shopee (+850g) và GHTK (+600g) đã tự bấm mã bỏ hàng vào hộp. Hệ thống tự khóa chốt và kích hoạt đèn UV-C khử trùng 3 phút.',
      badgeColor: 'rgba(48, 209, 88, 0.18)',
      glowClass: 'glow-parcels',
      dotClass: 'green'
    },
    security: {
      eyebrow: 'CHỐT KHÓA AN TOÀN TUYỆT ĐỐI',
      title: isLocked ? 'Ngàm thép hợp kim đã chốt khóa' : 'Nắp khoang đang mở để bỏ hàng',
      value: isLocked ? 'Chống cạy phá 250kg · Còi hú 90dB' : 'Trạng thái: Đang mở',
      desc: 'Ngàm solenoid điện tử chịu lực kéo 250kg tự động chốt ngàm 1 chiều khi shipper đóng nắp. Có chìa cơ khẩn cấp và còi hú báo động khi bị cạy phá.',
      badgeColor: 'rgba(255, 159, 10, 0.18)',
      glowClass: 'glow-security',
      dotClass: 'amber'
    },
    climate: {
      eyebrow: 'CẢM BIẾN CÂN NẶNG CHỐNG TRÁO HÀNG',
      title: 'Đo tải trọng tức thì 1.450 gram',
      value: 'Cảm biến Loadcell ±5g chuẩn xác',
      desc: 'Tự động cân và đối chiếu khối lượng ngay khi bưu kiện được đặt vào khoang. Loại bỏ 100% rủi ro bị tráo hàng, rỗng ruột hay giao thiếu đồ.',
      badgeColor: 'rgba(191, 90, 242, 0.18)',
      glowClass: 'glow-climate',
      dotClass: 'purple'
    },
    camera: {
      eyebrow: 'CAMERA AI GHI HÌNH BẰNG CHỨNG',
      title: 'Live Stream 1080p · Lưu video giao nhận',
      value: 'Góc siêu rộng 155° ban đêm sắc nét',
      desc: 'Tự động phát hiện bưu tá đến gần, quét mã vận đơn đơn hàng và gửi thẳng thông báo kèm ảnh chụp xác nhận về điện thoại của bạn.',
      badgeColor: 'rgba(41, 151, 255, 0.18)',
      glowClass: 'glow-camera',
      dotClass: 'blue'
    },
    solar: {
      eyebrow: 'NĂNG LƯỢNG MẶT TRỜI ĐỘC LẬP',
      title: 'Tự nạp điện ngoài trời · Tiết kiệm tối đa',
      value: 'Pin lưu điện 45 ngày liên tục',
      desc: 'Tấm pin Solar Monocrystalline trên nóc hộp tự sạc dưới ánh sáng ban ngày. Lắp đặt thoải mái tại cổng nhà, sân vườn mà không cần kéo dây điện.',
      badgeColor: 'rgba(48, 209, 88, 0.18)',
      glowClass: 'glow-solar',
      dotClass: 'green'
    }
  };

  const currentTelemetry = telemetryData[activeCategory];

  // Smart Delivery Automated Flowchart Steps
  const deliverySteps = [
    {
      num: 1,
      title: 'Shipper tiếp cận',
      desc: 'Cảm biến tiệm cận phát hiện bưu tá trong bán kính 2 mét',
      icon: <UserCheck size={20} />
    },
    {
      num: 2,
      title: 'Camera AI quét',
      desc: 'Nhận diện đồng phục bưu tá & quét mã vận đơn bưu kiện',
      icon: <Scan size={20} />
    },
    {
      num: 3,
      title: 'Cung cấp OTP 1 chạm',
      desc: 'Mã OTP ngẫu nhiên 6 số gửi tức thì hoặc mở từ xa qua App',
      icon: <KeyRound size={20} />
    },
    {
      num: 4,
      title: 'Khóa mở nắp êm',
      desc: 'Ngàm solenoid nhả chốt, trợ lực pít-tông mở nắp nhẹ nhàng',
      icon: <Unlock size={20} />
    },
    {
      num: 5,
      title: 'Cân xác nhận hàng',
      desc: 'Cảm biến tải trọng đa điểm cân đo khối lượng kiện hàng',
      icon: <Scale size={20} />
    },
    {
      num: 6,
      title: 'Khóa đóng & UV-C',
      desc: 'Khóa chốt ngàm an toàn và bật đèn LED UV-C diệt khuẩn 3 phút',
      icon: <ShieldCheck size={20} />
    }
  ];

  // Core Apple Accessories Store Product Definitions
  const coreProducts = [
    {
      id: products[0]?.id || 'anchorbox-base',
      name: 'AnchorBox Base',
      tag: 'DÀNH CHO CHUNG CƯ & NHÀ PHỐ',
      badge: 'TIẾT KIỆM NHẤT',
      price: products[0]?.price || 2490000,
      description: 'Giải pháp nhận hàng tự động cơ bản cho gia đình: Mở khóa bằng bàn phím số OTP, báo nhận hàng qua app và vỏ thép chống nước IP54.',
      image: products[0]?.images?.[0] || '/products/smartbox-compact-front.svg',
      swatches: ['#5e5e60', '#e5e5ea'],
      specs: [
        'Dung tích 45L (chứa vừa 3-4 kiện hàng tiêu chuẩn)',
        'Khóa ngàm điện tử Solenoid + Bàn phím số OTP',
        'Kết nối Wi-Fi & Mở khóa từ xa qua smartphone',
        'Thép mạ kẽm sơn tĩnh điện chống rỉ sét ngoài trời'
      ]
    },
    {
      id: products[1]?.id || 'anchorbox-pro',
      name: 'AnchorBox Pro',
      tag: 'PHIÊN BẢN BÁN CHẠY NHẤT',
      badge: 'ĐƯỢC ƯA CHUỘNG NHẤT',
      price: products[1]?.price || 3890000,
      description: 'Trang bị trọn bộ công nghệ đột phá: Camera AI 1080p nhận diện shipper, Cân chống tráo hàng và Đèn UV-C khử trùng bưu kiện.',
      image: products[1]?.images?.[0] || '/products/smartbox-std-front.svg',
      swatches: ['#1d1d1f', '#8e8e93'],
      specs: [
        'Dung tích lớn 75L (chứa vừa bưu kiện cồng kềnh)',
        'Camera AI 1080p nhận diện shipper & quét mã vận đơn',
        'Cảm biến cân nặng đa điểm ±5g chống tráo hàng',
        'Đèn LED UV-C tự động khử trùng bưu kiện 3 phút'
      ]
    },
    {
      id: products[2]?.id || 'anchorbox-solar',
      name: 'AnchorBox Solar',
      tag: 'NĂNG LƯỢNG MẶT TRỜI ĐỘC LẬP',
      badge: 'CAO CẤP NHẤT',
      price: products[2]?.price || 4990000,
      description: 'Tích hợp tấm pin năng lượng mặt trời trên nóc, lắp đặt ngoài trời không cần cắm điện. Dung tích cực đại cho biệt thự và nhà phố.',
      image: products[2]?.images?.[0] || '/products/smartbox-promax-front.svg',
      swatches: ['#1e293b', '#0f172a'],
      specs: [
        'Dung tích cực đại 110L cho biệt thự & nhà vườn',
        'Tấm pin mặt trời Monocrystalline + Pin tích điện 45 ngày',
        'Chống chịu thời tiết khắc nghiệt chuẩn kháng nước IP65',
        'Đầy đủ Camera AI, Cân chống tráo và Khử khuẩn UV-C'
      ]
    }
  ];

  return (
    <div className="store-home apple-theme-root">
      
      {/* ====================================================
          CINEMATIC PR TOP TICKER ANNOUNCEMENT
          ==================================================== */}
      <div className="apple-pr-topbar">
        <div className="apple-pr-topbar-inner">
          <span className="apple-pr-live-pill">
            <span className="live-pulse" />
            <span>DATN 2026 KEYNOTE REVEAL</span>
          </span>
          <span className="apple-pr-topbar-text">
            AnchorBox — Giải pháp Tủ Nhận Bưu Kiện Tự Động Đầu Tiên Đạt Chuẩn Chống Cạy Phá 250kg & Khử Khuẩn UV-C Ngoài Trời.
          </span>
          <a href="#simulator" className="apple-pr-topbar-link">
            <span>Trải nghiệm mô phỏng</span>
            <ChevronRight size={13} />
          </a>
        </div>
      </div>

      {/* ====================================================
          1. APPLE HOME HERO SECTION (CINEMATIC PR SHOWCASE)
          ==================================================== */}
      <section className={`apple-home-hero ${currentTelemetry.glowClass}`}>
        
        {/* Apple Cinematic Video Background Layer */}
        <div className="apple-hero-video-wrap" aria-hidden="true">
          <video
            key={currentVideo.src}
            ref={videoRef}
            className="apple-hero-bg-video"
            autoPlay
            loop
            muted={isMuted}
            playsInline
            poster="/banners/achor-box-banner-wide-1.webp"
          >
            <source src={currentVideo.src} type="video/mp4" />
          </video>
          <div className="apple-hero-video-overlay" />
          <div className="apple-hero-ambient-lights" />
        </div>

        {/* Floating Apple Glass Video Controller Badge */}
        <div className="apple-hero-playback-control">
          <div className="apple-hero-scene-badge">
            <span className="apple-pill-dot green" />
            <span>{currentVideo.title}</span>
          </div>
          <button
            type="button"
            onClick={toggleVideoPlay}
            className="apple-hero-control-btn"
            title={isVideoPlaying ? 'Tạm dừng video nền' : 'Phát video nền'}
            aria-label="Điều khiển video nền"
          >
            {isVideoPlaying ? <Pause size={12} /> : <Play size={12} />}
            <span>{isVideoPlaying ? 'Live Motion' : 'Paused'}</span>
          </button>
          <button
            type="button"
            onClick={toggleVideoMute}
            className="apple-hero-control-btn"
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            aria-label="Bật/Tắt âm thanh"
          >
            {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>
        </div>

        <div className="apple-hero-container">
          
          <div className="apple-hero-eyebrow">
            <span className={`apple-pill-dot ${currentTelemetry.dotClass}`} />
            <span>AnchorBox · Tủ Giao Nhận Bưu Kiện Tự Động Chống Trộm 24/7</span>
          </div>

          <h1 className="apple-hero-headline">
            Vắng nhà thảnh thơi.<br />
            Bưu kiện giao tới vẫn an toàn tuyệt đối.
          </h1>

          <p className="apple-hero-sub">
            Giải pháp nhận hàng tự động 100% ngoài trời cho tín đồ mua sắm online: Không lo lỡ hẹn shipper, không ngại phiền hàng xóm. Shipper tự bấm mã bỏ hàng, ngàm thép tự khóa chốt, cân xác thực chống tráo và đèn UV-C khử trùng bưu phẩm ngay tức thì.
          </p>

          <div className="apple-actions-row">
            <a href="#collection" className="apple-btn-primary">
              <span>Xem bảng giá & Mua ngay</span>
              <ArrowUpRight size={17} />
            </a>
            <a href="#simulator" className="apple-btn-secondary" style={{ backdropFilter: 'blur(20px)' }}>
              <Play size={15} style={{ fill: 'currentColor' }} />
              <span>Chạy thử nghiệm mô phỏng</span>
            </a>
            <Link to="/compare" className="apple-btn-link-inline">
              <span>So sánh 3 phiên bản</span>
              <ChevronRight size={15} />
            </Link>
          </div>

          {/* Cinematic PR Highlights Strip (Key Specs that Sell) */}
          <div className="apple-hero-stats-strip">
            <div className="stats-strip-item">
              <strong>100%</strong>
              <span>Tự động nhận hàng</span>
            </div>
            <div className="stats-strip-divider" />
            <div className="stats-strip-item">
              <strong>250 kg</strong>
              <span>Lực chống cạy ngàm</span>
            </div>
            <div className="stats-strip-divider" />
            <div className="stats-strip-item">
              <strong>±5 gram</strong>
              <span>Cảm biến chống tráo</span>
            </div>
            <div className="stats-strip-divider" />
            <div className="stats-strip-item">
              <strong>45 Ngày</strong>
              <span>Pin tự nạp Solar</span>
            </div>
            <div className="stats-strip-divider" />
            <div className="stats-strip-item">
              <strong>IP65</strong>
              <span>Kháng nước bão ngoài trời</span>
            </div>
          </div>

          {/* Interactive Apple Category Pills Bar */}
          <div className="apple-categories-bar" role="tablist" aria-label="Bộ lọc tính năng bảo vệ bưu kiện">
            
            <button
              type="button"
              className={`apple-category-pill pill-parcels ${activeCategory === 'parcels' ? 'is-active' : ''}`}
              onClick={() => setActiveCategory('parcels')}
            >
              <span className="apple-pill-dot green" />
              <span>📦 Nhận hàng tự động: 2 kiện an toàn</span>
            </button>

            <button
              type="button"
              className={`apple-category-pill pill-security ${activeCategory === 'security' ? 'is-active' : ''}`}
              onClick={() => setActiveCategory('security')}
            >
              <span className="apple-pill-dot amber" />
              <span>🔒 Chốt an ninh: {isLocked ? 'Chống cạy phá 250kg' : 'Đang mở nắp'}</span>
            </button>

            <button
              type="button"
              className={`apple-category-pill pill-climate ${activeCategory === 'climate' ? 'is-active' : ''}`}
              onClick={() => setActiveCategory('climate')}
            >
              <span className="apple-pill-dot purple" />
              <span>⚖️ Cân chống tráo hàng: ±5g chuẩn xác</span>
            </button>

            <button
              type="button"
              className={`apple-category-pill pill-camera ${activeCategory === 'camera' ? 'is-active' : ''}`}
              onClick={() => setActiveCategory('camera')}
            >
              <span className="apple-pill-dot blue" />
              <span>📹 Camera AI: Ghi hình shipper 1080p</span>
            </button>

            <button
              type="button"
              className={`apple-category-pill pill-solar ${activeCategory === 'solar' ? 'is-active' : ''}`}
              onClick={() => setActiveCategory('solar')}
            >
              <span className="apple-pill-dot green" />
              <span>⚡ Pin tự sạc: 45 ngày ngoài trời</span>
            </button>

          </div>

          {/* Interactive Smart Box Stage (Apple Home UI Telemetry Showcase) */}
          <div className="apple-stage-card">
            
            {/* Left: Device Visual Frame with Dynamic Telemetry Overlay */}
            <div className="apple-stage-visual">
              
              {/* Dynamic Telemetry HUD overlay based on active category pill */}
              <div className="apple-stage-telemetry-hud" key={activeCategory}>
                <div className="apple-telemetry-header">
                  <span className={`apple-pill-dot ${currentTelemetry.dotClass}`} />
                  <span className="apple-telemetry-title">{currentTelemetry.eyebrow}</span>
                </div>
                <div className="apple-telemetry-value">{currentTelemetry.title}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#2997ff', marginBottom: '4px' }}>
                  {currentTelemetry.value}
                </div>
                <p className="apple-telemetry-desc">{currentTelemetry.desc}</p>
              </div>

              {/* Central Device Hero Render */}
              <div className="apple-stage-device-frame">
                <img
                  src="/banners/achor-box-banner-wide-1.webp"
                  alt="Thiết bị AnchorBox thông minh"
                  loading="eager"
                />
              </div>

            </div>

            {/* Right: Live Interactive IoT Tile Widgets */}
            <div className="apple-stage-tiles">
              
              {/* Tile 1: Remote Lock Toggle (Click to simulate IoT remote lock) */}
              <div
                className={`apple-tile-widget ${isLocked ? '' : 'is-active'}`}
                onClick={() => {
                  setIsLocked(prev => !prev);
                  setActiveCategory('security');
                }}
                title="Bấm để mô phỏng mở/chốt khóa từ xa"
              >
                <div
                  className="apple-tile-icon-wrap"
                  style={{ background: isLocked ? 'rgba(48, 209, 88, 0.2)' : 'rgba(255, 159, 10, 0.25)' }}
                >
                  {isLocked ? <Lock size={20} color="#30d158" /> : <Unlock size={20} color="#ff9f0a" />}
                </div>
                <div className="apple-tile-info">
                  <strong>Khóa chốt điện tử</strong>
                  <span>Cửa chính AnchorBox</span>
                  <div className="apple-tile-badge" style={{ color: isLocked ? '#30d158' : '#ff9f0a' }}>
                    <span className="apple-pill-dot" style={{ background: isLocked ? '#30d158' : '#ff9f0a' }} />
                    <span>{isLocked ? 'Đã khóa ngàm an toàn' : 'Đã nhả khóa (Bấm để chốt)'}</span>
                  </div>
                </div>
              </div>

              {/* Tile 2: Weight Sensor */}
              <div
                className={`apple-tile-widget ${activeCategory === 'parcels' ? 'is-active' : ''}`}
                onClick={() => setActiveCategory('parcels')}
              >
                <div className="apple-tile-icon-wrap" style={{ background: 'rgba(48, 209, 88, 0.2)' }}>
                  <Scale size={20} color="#30d158" />
                </div>
                <div className="apple-tile-info">
                  <strong>Cảm biến tải trọng đa điểm</strong>
                  <span>Sàn nhận hàng bên trong</span>
                  <div className="apple-tile-badge" style={{ color: '#30d158' }}>
                    <span className="apple-pill-dot green" />
                    <span>1.45 kg · 2 kiện bưu phẩm</span>
                  </div>
                </div>
              </div>

              {/* Tile 3: AI Camera */}
              <div
                className={`apple-tile-widget ${activeCategory === 'camera' ? 'is-active' : ''}`}
                onClick={() => setActiveCategory('camera')}
              >
                <div className="apple-tile-icon-wrap" style={{ background: 'rgba(41, 151, 255, 0.2)' }}>
                  <Video size={20} color="#2997ff" />
                </div>
                <div className="apple-tile-info">
                  <strong>Camera AI góc rộng 155°</strong>
                  <span>Ghi hình bằng chứng bưu tá</span>
                  <div className="apple-tile-badge" style={{ color: '#2997ff' }}>
                    <span className="apple-pill-dot blue" />
                    <span>Live 1080p · Sẵn sàng</span>
                  </div>
                </div>
              </div>

              {/* Tile 4: Solar & UV-C */}
              <div
                className={`apple-tile-widget ${activeCategory === 'solar' ? 'is-active' : ''}`}
                onClick={() => setActiveCategory('solar')}
              >
                <div className="apple-tile-icon-wrap" style={{ background: 'rgba(255, 159, 10, 0.2)' }}>
                  <Sun size={20} color="#ff9f0a" />
                </div>
                <div className="apple-tile-info">
                  <strong>Khử khuẩn UV-C & Pin Solar</strong>
                  <span>Tự động diệt khuẩn 3 phút</span>
                  <div className="apple-tile-badge" style={{ color: '#30d158' }}>
                    <span className="apple-pill-dot green" />
                    <span>98% Pin · Đã sẵn sàng</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ====================================================
          CINEMATIC PR FEATURE HIGHLIGHT 1: INTERACTIVE HARDWARE SIMULATOR
          (BÀN THỬ NGHIỆM ĐIỆN TỬ THỰC TẾ ẢO CHO THUYẾT TRÌNH DATN)
          ==================================================== */}
      <section className="apple-simulator-section" id="simulator">
        <div className="container">
          
          <div className="apple-section-header" style={{ maxWidth: '820px', margin: '0 auto 48px', textAlign: 'center' }}>
            <span className="apple-badge-sparkle">
              <Sparkles size={14} />
              <span>TRẢI NGHIỆM TƯƠNG TÁC THỰC TẾ ẢO</span>
            </span>
            <h2 className="apple-section-title-huge">
              Mô Phỏng Kịch Bản Vận Hành Thực Tế
            </h2>
            <p className="apple-section-subtitle">
              Bấm chọn một trong các tình huống dưới đây để kiểm tra phản hồi thời gian thực của các vi điều khiển, cảm biến tải trọng, chốt ngàm an toàn và hệ thống khử khuẩn UV-C trên AnchorBox.
            </p>
          </div>

          <div className="apple-sim-console">
            
            {/* Top Toolbar: Simulator Scenario Triggers */}
            <div className="sim-toolbar">
              <span className="sim-toolbar-title">CHỌN TÌNH HUỐNG KIỂM THỬ:</span>
              <div className="sim-btn-group">
                <button
                  type="button"
                  className={`sim-action-btn ${simMode === 'delivery' ? 'is-active' : ''}`}
                  onClick={() => runSimulation('delivery')}
                >
                  <span>📦 Giả lập Shipper thả đơn (+850g)</span>
                </button>
                <button
                  type="button"
                  className={`sim-action-btn ${simMode === 'tamper' ? 'is-active danger' : ''}`}
                  onClick={() => runSimulation('tamper')}
                >
                  <span>🚨 Giả lập Cạy nắp bạo lực (Hú còi 90dB)</span>
                </button>
                <button
                  type="button"
                  className={`sim-action-btn ${simMode === 'remote_open' ? 'is-active' : ''}`}
                  onClick={() => runSimulation('remote_open')}
                >
                  <span>📱 Giả lập Mở khóa từ xa qua App</span>
                </button>
                <button
                  type="button"
                  className="sim-action-btn reset"
                  onClick={() => runSimulation('idle')}
                  title="Đặt lại trạng thái ban đầu"
                >
                  <RotateCcw size={14} />
                  <span>Đặt lại</span>
                </button>
              </div>
            </div>

            {/* Main Console Grid: Left Telemetry Display, Right Sensor Gauges */}
            <div className="sim-dashboard-grid">
              
              {/* Box 1: Visual Hardware Cutaway Display */}
              <div className="sim-visual-card">
                <div className="sim-card-header">
                  <div className="sim-header-indicator">
                    <span className={`sim-dot ${simAlarmActive ? 'danger' : simDoorOpen ? 'amber' : 'green'}`} />
                    <span>TRẠNG THÁI HỘP: {simAlarmActive ? 'BÁO ĐỘNG KHẨN CẤP' : simDoorOpen ? 'KHOANG ĐANG MỞ' : 'AN TOÀN · ĐÃ KHÓA NGÀM'}</span>
                  </div>
                  <span className="sim-conn-pill">
                    <Wifi size={12} />
                    <span>MQTT Online</span>
                  </span>
                </div>

                <div className="sim-box-illustration">
                  <div className={`sim-box-frame ${simDoorOpen ? 'door-open' : ''} ${simAlarmActive ? 'is-alarm' : ''}`}>
                    <img
                      src="/banners/achor-box-banner-wide-1.webp"
                      alt="AnchorBox Hardware Render"
                      className="sim-box-img"
                    />
                    {simUvcActive && (
                      <div className="sim-uvc-beam">
                        <span className="uvc-glow-text">🟣 TIA CỰC TÍM UV-C 254nm ĐANG DIỆT KHUẨN</span>
                      </div>
                    )}
                    {simAlarmActive && (
                      <div className="sim-alarm-overlay">
                        <AlertTriangle size={32} />
                        <span>CÒI HÚ BÁO ĐỘNG 90dB ĐANG KÍCH HOẠT!</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Real-time Event Log Terminal */}
                <div className="sim-log-terminal">
                  <div className="log-term-bar">
                    <span className="term-dot red" />
                    <span className="term-dot yellow" />
                    <span className="term-dot green" />
                    <span className="term-title">telemetry-audit.log</span>
                  </div>
                  <div className="log-term-content">
                    <code>&gt; {simLog}</code>
                  </div>
                </div>
              </div>

              {/* Box 2: Real-time Multi-sensor Telemetry Gauges */}
              <div className="sim-sensors-card">
                
                {/* Metric 1: Precision Weight Sensor */}
                <div className="sim-sensor-row">
                  <div className="sensor-row-header">
                    <span className="sensor-row-title">
                      <Scale size={16} color="#30d158" />
                      <span>CẢM BIẾN TẢI TRỌNG (LOAD CELL)</span>
                    </span>
                    <span className="sensor-tag">±5g sai số</span>
                  </div>
                  <div className="sensor-big-metric">
                    <span className="metric-val">{simWeight.toLocaleString('vi-VN')}</span>
                    <span className="metric-unit">gram</span>
                  </div>
                  <div className="sensor-progress-bar">
                    <div
                      className="sensor-progress-fill"
                      style={{ width: `${Math.min(100, (simWeight / 5000) * 100)}%` }}
                    />
                  </div>
                  <div className="sensor-sub-info">
                    <span>Đã nhận diện: {simWeight >= 2300 ? '3 kiện bưu phẩm' : '2 kiện bưu phẩm'}</span>
                    <span style={{ color: '#30d158' }}>✓ Khớp đơn vận</span>
                  </div>
                </div>

                {/* Metric 2: Solenoid Lock Force Gauge */}
                <div className="sim-sensor-row">
                  <div className="sensor-row-header">
                    <span className="sensor-row-title">
                      <Lock size={16} color={simDoorOpen ? '#ff9f0a' : '#30d158'} />
                      <span>KHÓA NGÀM SOLENOID 12V</span>
                    </span>
                    <span className={`sensor-tag ${simDoorOpen ? 'amber' : 'green'}`}>
                      {simDoorOpen ? 'Nắp đang mở' : 'Khóa ngàm 250kg'}
                    </span>
                  </div>
                  <div className="sensor-dual-badge">
                    <div className="sub-badge-item">
                      <small>Lực cản ngàm</small>
                      <strong>2.500 Newton</strong>
                    </div>
                    <div className="sub-badge-item">
                      <small>Cơ chế chốt</small>
                      <strong>Khóa 1 chiều tự sập</strong>
                    </div>
                  </div>
                </div>

                {/* Metric 3: UV-C Germicidal & Solar Battery */}
                <div className="sim-sensor-row">
                  <div className="sensor-row-header">
                    <span className="sensor-row-title">
                      <Sun size={16} color="#ff9f0a" />
                      <span>NĂNG LƯỢNG MẶT TRỜI & PIN</span>
                    </span>
                    <span className="sensor-tag green">Pin 98% · 45 ngày</span>
                  </div>
                  <div className="sensor-dual-badge">
                    <div className="sub-badge-item">
                      <small>Quang phổ UV-C</small>
                      <strong style={{ color: simUvcActive ? '#bf5af2' : '#8e8e93' }}>
                        {simUvcActive ? 'Đang chiếu (254nm)' : 'Chế độ chờ'}
                      </strong>
                    </div>
                    <div className="sub-badge-item">
                      <small>Tấm pin Monocrystalline</small>
                      <strong style={{ color: '#ff9f0a' }}>Tự nạp ngoài trời</strong>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ====================================================
          2. APPLE BENTO GRID (SMART FEATURES)
          ==================================================== */}
      <section className="apple-bento-section">
        <div className="apple-section-header">
          <p className="eyebrow">LỢI ÍCH BẢO VỆ BƯU PHẨM VƯỢT TRỘI</p>
          <h2>4 Lý do AnchorBox là lựa chọn số 1 cho người hay mua online</h2>
          <p>
            Chấm dứt hoàn toàn tình trạng shipper gọi giục khi đang họp, nỗi sợ mất cắp bưu phẩm trước cửa nhà hay gói hàng ướt sũng dưới trời mưa bão.
          </p>
        </div>

        <div className="apple-bento-grid">
          
          {/* Bento Card 1 (Span 8): Mô hình Smart Delivery tự động hóa */}
          <div className="apple-bento-card bento-col-8">
            <div>
              <span className="apple-bento-tag">QUY TRÌNH GIAO NHẬN TỰ ĐỘNG 100%</span>
              <h3>Không cần có nhà — Shipper tự bỏ hàng, hộp tự khóa chốt</h3>
              <p>
                Trải nghiệm nhận hàng hoàn toàn tự động 100%. Shipper chỉ cần bấm OTP hoặc quét mã đơn, hộp tự mở nắp, nhận hàng, tự khóa ngàm an toàn và bật đèn UV-C diệt khuẩn. Bạn nhận ngay thông báo kèm ảnh trên điện thoại trong 1 giây.
              </p>
            </div>

            {/* Interactive Step-by-Step Delivery Timeline */}
            <div className="smart-delivery-timeline" role="region" aria-label="Quy trình giao hàng thông minh">
              {deliverySteps.map(step => (
                <div
                  key={step.num}
                  className={`smart-step-item ${activeDeliveryStep === step.num ? 'is-highlighted' : ''}`}
                  onClick={() => setActiveDeliveryStep(step.num)}
                  style={{ cursor: 'pointer' }}
                  title="Bấm để xem chi tiết bước này"
                >
                  <span className="smart-step-num">{step.num}</span>
                  <div className="smart-step-icon">{step.icon}</div>
                  <strong className="smart-step-label">{step.title}</strong>
                  <span className="smart-step-sub">{step.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bento Card 2 (Span 4): Cảm biến trọng lượng đa điểm chống tráo hàng */}
          <div className="apple-bento-card bento-col-4">
            <div>
              <span className="apple-bento-tag">CẢM BIẾN TẢI TRỌNG ĐA ĐIỂM</span>
              <h3>Bảo vệ từng gram đơn hàng. Chống tráo ruột & rỗng hàng.</h3>
              <p>
                4 cảm biến load-cell chuẩn xác ±5g dưới đáy khoang tự động cân bưu phẩm ngay khi shipper thả vào. Bạn phát hiện ngay nếu đơn hàng bị rút ruột hay giao thiếu trước khi khui hộp.
              </p>
            </div>

            <div className="weight-sensor-graphic">
              <div className="weight-display-dial">
                <span className="weight-digits">+1.450</span>
                <span className="weight-unit">gram</span>
              </div>

              <div className="weight-packages-list">
                <div className="weight-package-row">
                  <span>Shopee Express</span>
                  <strong>+850g · Quần áo</strong>
                </div>
                <div className="weight-package-row">
                  <span>Giao Hàng Tiết Kiệm</span>
                  <strong>+600g · Sách & Phụ kiện</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#30d158', fontSize: '11.5px', fontWeight: 600 }}>
                <CheckCircle2 size={15} />
                <span>Khối lượng xác thực trùng khớp đơn hàng</span>
              </div>
            </div>
          </div>

          {/* Bento Card 3 (Span 4): Khóa điện tử bảo mật chuẩn ngân hàng + chìa cơ khẩn cấp */}
          <div className="apple-bento-card bento-col-4">
            <div>
              <span className="apple-bento-tag">CHỐNG TRỘM BẠO LỰC CHUẨN AN NINH</span>
              <h3>Khung thép mạ kẽm kiên cố + Còi báo động 90dB</h3>
              <p>
                Thân vỏ kim loại dày dặn chịu lực va đập, ngàm khóa hợp kim thép chịu lực kéo 250kg kèm chìa cơ vật lý dự phòng. Còi hú 90dB tự động kích hoạt xua đuổi kẻ gian ngay khi phát hiện rung chấn cạy mở bất thường.
              </p>
            </div>

            <div className="bank-lock-graphic">
              <div className="lock-dual-layer">
                <div className="lock-badge-chip">
                  <ShieldCheck size={22} color="#2997ff" />
                  <strong>Khóa ngàm 250kg</strong>
                  <small>Tự chốt an toàn 1 chiều</small>
                </div>
                <div className="lock-badge-chip">
                  <KeyRound size={22} color="#ff9f0a" />
                  <strong>Chìa cơ khẩn cấp</strong>
                  <small>Dự phòng khi mất điện</small>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#ff9f0a', fontSize: '11.5px', fontWeight: 600 }}>
                <AlertTriangle size={15} />
                <span>Còi báo động 90dB tự kích hoạt khi có lực cạy nắp</span>
              </div>
            </div>
          </div>

          {/* Bento Card 4 (Span 8): Kết nối mượt mà cùng iPhone & Android */}
          <div className="apple-bento-card bento-col-8">
            <div>
              <span className="apple-bento-tag">THÔNG BÁO TỨC THÌ QUA SMARTPHONE</span>
              <h3>Kiểm soát toàn diện trên điện thoại iPhone & Android</h3>
              <p>
                Mỗi khi đơn hàng giao tới thành công, ứng dụng trên điện thoại lập tức rung báo kèm ảnh chụp và cân nặng kiện hàng. Dễ dàng mở tủ từ xa chỉ với 1 chạm qua Wi-Fi / 4G hoặc chia sẻ quyền nhận hàng cho mọi thành viên trong gia đình.
              </p>
            </div>

            <div className="connectivity-badges-row">
              <div className="protocol-chip">
                <Smartphone size={16} color="#30d158" />
                <span>Tương thích iOS & Android</span>
              </div>
              <div className="protocol-chip">
                <Zap size={16} color="#ff9f0a" />
                <span>Nhận thông báo &lt; 0.2s</span>
              </div>
              <div className="protocol-chip">
                <Wifi size={16} color="#2997ff" />
                <span>Wi-Fi & Bluetooth 5.0 LE</span>
              </div>
              <div className="protocol-chip">
                <Bell size={16} color="#bf5af2" />
                <span>Chuông báo & Ảnh chụp bằng chứng</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ====================================================
          3. APPLE ACCESSORIES STORE CATALOG (#f5f5f7 BACKGROUND)
          ==================================================== */}
      <section className="apple-store-section" id="collection">
        <div className="apple-store-header">
          <p className="eyebrow">BẢNG GIÁ & CÁC PHIÊN BẢN SẢN PHẨM</p>
          <h2>Chọn phiên bản AnchorBox phù hợp với bạn</h2>
          <p>
            Chế tác từ thép mạ kẽm cao cấp, sơn tĩnh điện ngoài trời bền bỉ 10 năm. Tặng gói khảo sát & lắp đặt tận nơi, bảo hành chính hãng đến 24 tháng.
          </p>
        </div>

        <div className="apple-products-grid">
          {coreProducts.map(product => {
            return (
              <div key={product.id} className="apple-product-card">
                
                {product.badge && (
                  <span className="apple-card-badge">{product.badge}</span>
                )}

                <div className="apple-card-media">
                  <img src={product.image} alt={product.name} loading="lazy" />
                </div>

                {/* Color finish swatches */}
                <div className="apple-card-swatches">
                  {product.swatches.map((color, idx) => (
                    <span
                      key={idx}
                      className="apple-swatch-dot"
                      style={{ background: color }}
                      title={`Tùy chọn màu sắc ${idx + 1}`}
                    />
                  ))}
                </div>

                <span className="apple-card-tag">{product.tag}</span>
                <h3 className="apple-card-title">{product.name}</h3>
                <p className="apple-card-desc">{product.description}</p>

                {/* Key hardware specs */}
                <div className="apple-card-specs">
                  {product.specs.map((spec, sIdx) => (
                    <div key={sIdx} className="apple-card-spec-item">
                      <CheckCircle2 size={14} />
                      <span>{spec}</span>
                    </div>
                  ))}
                </div>

                <div className="apple-card-price-row">
                  <div className="apple-card-price">
                    <small>Từ </small>
                    <span>{money(product.price)}</span>
                  </div>
                </div>

                {/* Apple Standard Action Buttons: "Mua ngay" & "Tìm hiểu thêm" */}
                <div className="apple-card-actions">
                  <Link to={`/products/${product.id}`} className="apple-btn-buy">
                    <ShoppingBag size={15} />
                    <span>Mua ngay</span>
                  </Link>
                  <Link to={`/products/${product.id}`} className="apple-btn-learn-more">
                    <span>Tìm hiểu thêm</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>

              </div>
            );
          })}
        </div>
      </section>

      {/* ====================================================
          4. INTERACTIVE 3D & TECHNOLOGY EXPLORATION
          ==================================================== */}
      <section className="apple-technology-section" id="technology">
        <div className="container store-discovery-inner">
          <div className="tech-specs-col">
            <p className="eyebrow">KẾT CẤU VẬT LÝ KIÊN CỐ · ĐẠT CHUẨN IP65</p>
            <h2 className="tech-specs-heading">
              Khung thép mạ kẽm.<br />Bất khả xâm phạm ngoài trời.
            </h2>
            <p className="tech-specs-lead">
              Trải nghiệm mô hình 3D 360 độ: Khám phá các góc cạnh khung thép chống cạy bạo lực, ngàm khóa solenoid chịu lực kéo 250kg và các cụm cảm biến được bảo vệ tối đa trước mọi thời tiết khắc nghiệt.
            </p>

            <div className="tech-hud-chips">
              <div className="tech-hud-chip">
                <ShieldCheck size={18} className="hud-icon cyan" />
                <div>
                  <strong>Khung thép mạ kẽm 1.5mm</strong>
                  <span>Sơn tĩnh điện kháng tia UV, chống gỉ sét 10 năm</span>
                </div>
              </div>
              <div className="tech-hud-chip">
                <Lock size={18} className="hud-icon emerald" />
                <div>
                  <strong>Khóa ngàm Solenoid 250kg</strong>
                  <span>Tự động chốt 1 chiều + Ổ khóa cơ dự phòng khẩn cấp</span>
                </div>
              </div>
              <div className="tech-hud-chip">
                <Sparkles size={18} className="hud-icon purple" />
                <div>
                  <strong>Đèn UV-C diệt khuẩn tự động</strong>
                  <span>Kích hoạt 3 phút khử trùng bao bì bưu phẩm ngay khi đóng nắp</span>
                </div>
              </div>
              <div className="tech-hud-chip">
                <Scale size={18} className="hud-icon amber" />
                <div>
                  <strong>Cảm biến tải trọng Load-Cell ±5g</strong>
                  <span>Xác thực khối lượng tức thời, chống tráo đổi ruột kiện hàng</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '28px' }}>
              <Link className="apple-btn-buy" to="/products/anchorbox-pro" style={{ display: 'inline-flex', padding: '12px 24px' }}>
                <span>Xem bảng thông số kỹ thuật chi tiết</span>
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
          <AppleProductViewer model="pro" capacity={75} showHotspots={true} />
        </div>
      </section>

      {/* ====================================================
          5. APP ECOSYSTEM SECTION
          ==================================================== */}
      <AppEcosystem />

      {/* ====================================================
          6. JOURNEY (HOW IT WORKS)
          ==================================================== */}
      <section className="apple-journey-section" id="how">
        <div className="container">
          <div className="apple-section-header" style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 48px' }}>
            <p className="eyebrow" style={{ color: '#2997ff', fontSize: '12.5px', fontWeight: 700, letterSpacing: '0.1em' }}>
              QUY TRÌNH TIỆN ÍCH KHÉP KÍN
            </p>
            <h2 style={{ fontSize: '42px', fontWeight: 750, letterSpacing: '-0.03em', background: 'linear-gradient(180deg, #ffffff 15%, rgba(255, 255, 255, 0.72) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 16px' }}>
              Từ lựa chọn đến nhận hàng hoàn toàn tự động.
            </h2>
            <p style={{ color: '#a1a1a6', fontSize: '17px', lineHeight: 1.6, margin: 0 }}>
              AnchorBox tối ưu toàn diện từ khâu khảo sát lắp đặt tại nhà, cấu hình thông minh đến quá trình giao nhận hàng ngày qua ứng dụng.
            </p>
          </div>
          <Journey />
          <div style={{ textAlign: 'center', marginTop: '36px' }}>
            <Link className="apple-btn-learn-more" to="/order-tracking" style={{ display: 'inline-flex', padding: '12px 24px', fontSize: '14px', borderRadius: '999px' }}>
              <span>Theo dõi tiến trình đơn hàng của bạn →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ====================================================
          7. FAQ / SUPPORT SECTION
          ==================================================== */}
      <section className="apple-faq-section" id="faq">
        <div className="container">
          <div className="store-help">
            <div className="faq-intro-col">
              <p className="eyebrow">HỖ TRỢ KHÁCH HÀNG 24/7</p>
              <h2 style={{ fontSize: '40px', fontWeight: 750, letterSpacing: '-0.03em', background: 'linear-gradient(180deg, #ffffff 15%, rgba(255, 255, 255, 0.72) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.2, margin: '0 0 20px' }}>
                Một vài điều<br />bạn muốn biết.
              </h2>
              <p style={{ color: '#a1a1a6', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
                Mọi thắc mắc về quy trình lắp đặt ngoài trời, khả năng chống nước IP65, nguồn điện và chính sách bảo hành chính hãng AnchorBox.
              </p>
              <Link className="apple-btn-buy" to="/contact" style={{ display: 'inline-flex', padding: '12px 22px' }}>
                <span>Liên hệ chuyên gia tư vấn →</span>
              </Link>
            </div>
            <div className="faq-content-col">
              <Faq embedded />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
