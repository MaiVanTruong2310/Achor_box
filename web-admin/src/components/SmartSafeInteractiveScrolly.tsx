import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Wifi,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Sparkles,
  Smartphone,
  Key,
  Shield,
  Volume2,
  VolumeX,
  RefreshCw,
  Eye,
  Layers,
  ArrowRight,
  Maximize2,
  Sliders,
  Scale,
  Star,
  Award,
  Truck,
  Check,
  X,
  QrCode,
  Radio
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface SmartSafeInteractiveScrollyProps {
  onOrderClick?: () => void;
  onWarrantyClick?: () => void;
}

export const SmartSafeInteractiveScrolly: React.FC<SmartSafeInteractiveScrollyProps> = ({
  onOrderClick,
  onWarrantyClick
}) => {
  const { theme } = useTheme();

  // Active section tracking: 0=Overview, 1=Hardware, 2=Step 1, 3=Step 2, 4=Step 3, 5=Step 4, 6=Step 5, 7=Simulator, 8=Comparison
  const [activeStage, setActiveStage] = useState<number>(0);

  // Active Hotspot
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);

  // View mode
  const [renderMode, setRenderMode] = useState<'acrylic' | 'studio'>('acrylic');

  // Simulator states
  const [lcdLine1, setLcdLine1] = useState<string>('SYSTEM RELOAD:');
  const [lcdLine2, setLcdLine2] = useState<string>('ACCESS GRANTED');
  const [pinInput, setPinInput] = useState<string>('');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [boxWeight, setBoxWeight] = useState<number>(0.0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastAction, setLastAction] = useState<string>('Hệ thống sẵn sàng đón nhận thao tác.');
  const [isSimulatingSolenoid, setIsSimulatingSolenoid] = useState<boolean>(false);
  const [isSimulatingWifi, setIsSimulatingWifi] = useState<boolean>(false);

  // Web Audio API sound feedback
  const playBeep = (freq = 900, type: OscillatorType = 'sine', duration = 0.08) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio might be suppressed by browser autoplay
    }
  };

  const playSuccessChime = () => {
    playBeep(650, 'sine', 0.06);
    setTimeout(() => playBeep(880, 'sine', 0.08), 70);
    setTimeout(() => playBeep(1175, 'sine', 0.15), 150);
  };

  const playLockChime = () => {
    playBeep(420, 'square', 0.1);
    setTimeout(() => playBeep(280, 'square', 0.15), 110);
  };

  // Section Refs
  const introRef = useRef<HTMLDivElement>(null);
  const hardwareRef = useRef<HTMLDivElement>(null);
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);
  const step5Ref = useRef<HTMLDivElement>(null);
  const sandboxRef = useRef<HTMLDivElement>(null);
  const comparisonRef = useRef<HTMLDivElement>(null);

  // Scroll spy
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + window.innerHeight * 0.4;

      const sections = [
        { stage: 0, el: introRef.current },
        { stage: 1, el: hardwareRef.current },
        { stage: 2, el: step1Ref.current },
        { stage: 3, el: step2Ref.current },
        { stage: 4, el: step3Ref.current },
        { stage: 5, el: step4Ref.current },
        { stage: 6, el: step5Ref.current },
        { stage: 7, el: sandboxRef.current },
        { stage: 8, el: comparisonRef.current }
      ];

      for (let i = sections.length - 1; i >= 0; i--) {
        const item = sections[i];
        if (item.el && item.el.offsetTop <= scrollPos) {
          setActiveStage(item.stage);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Dynamic 3D Box transformation depending on active stage
  const getBoxTransform = () => {
    switch (activeStage) {
      case 0: // Intro / Hero
        return 'perspective(1200px) rotateX(10deg) rotateY(-8deg) scale(1.0)';
      case 1: // Hardware Dissection
        return 'perspective(1200px) rotateX(5deg) rotateY(-22deg) scale(1.08)';
      case 2: // Step 1: Booting / Power
        return 'perspective(1200px) rotateX(16deg) rotateY(-6deg) scale(1.03)';
      case 3: // Step 2: WiFi
        return 'perspective(1200px) rotateX(6deg) rotateY(-18deg) scale(1.06)';
      case 4: // Step 3: Keypad PIN
        return 'perspective(1200px) rotateX(0deg) rotateY(-26deg) scale(1.16)';
      case 5: // Step 4: Scale LoadCell
        return 'perspective(1200px) rotateX(16deg) rotateY(-12deg) scale(1.04)';
      case 6: // Step 5: Lock & Siren
        return 'perspective(1200px) rotateX(8deg) rotateY(-12deg) scale(1.0)';
      case 7: // Live Sandbox
        return 'perspective(1200px) rotateX(0deg) rotateY(-15deg) scale(1.08)';
      case 8: // Comparison
        return 'perspective(1200px) rotateX(10deg) rotateY(-10deg) scale(0.98)';
      default:
        return 'perspective(1200px) rotateX(10deg) rotateY(-10deg) scale(1.0)';
    }
  };

  // Keypad simulation actions
  const handleKeypadPress = (key: string) => {
    playBeep(800 + Math.random() * 100, 'triangle', 0.05);

    if (key === '*') {
      playLockChime();
      setIsLocked(true);
      setPinInput('');
      setLcdLine1('KHOA THU CONG:');
      setLcdLine2('DA SAP CHOT !');
      setLastAction('Bấm [*]: Khóa khẩn cấp tức thì. Chốt Solenoid đóng lại!');
      return;
    }

    if (key === '#') {
      if (pinInput === '1234') {
        playSuccessChime();
        setIsLocked(false);
        setIsSimulatingSolenoid(true);
        setTimeout(() => setIsSimulatingSolenoid(false), 1200);
        setLcdLine1('SYSTEM RELOAD:');
        setLcdLine2('ACCESS GRANTED');
        setLastAction('Nhập [1234#]: Mở khóa thành công! Nắp hộp mở.');
      } else if (pinInput === 'ABCD') {
        playBeep(1000, 'sine', 0.1);
        setLcdLine1('MA SERIAL HOP:');
        setLcdLine2('DBX-98C377AD9D60');
        setLastAction('Phím tắt [A-B-C-D-#]: Hiển thị mã số Serial phần cứng.');
      } else if (pinInput === 'AD') {
        playBeep(1000, 'sine', 0.1);
        setLcdLine1('WIFI: Anchor_IoT');
        setLcdLine2('IP: 192.168.1.88');
        setLastAction('Phím tắt [A-D-#]: Kiểm tra kết nối mạng Wi-Fi và địa chỉ IP.');
      } else if (pinInput === 'DCBA') {
        playBeep(1000, 'sine', 0.1);
        setLcdLine1('CHỦ SỞ HỮU:');
        setLcdLine2('UID: USR_77928');
        setLastAction('Phím tắt [D-C-B-A-#]: Hiển thị User ID liên kết với hộp.');
      } else {
        playBeep(300, 'sawtooth', 0.2);
        setLcdLine1('SAI MAT KHAU:');
        setLcdLine2('VUI LONG THU LAI');
        setLastAction(`Mã "${pinInput}#" không chính xác! Hãy thử mật khẩu mẫu 1234#.`);
      }
      setPinInput('');
      return;
    }

    const nextPin = (pinInput + key).slice(0, 8);
    setPinInput(nextPin);
    setLcdLine1('NHAP MAT KHAU:');
    setLcdLine2(nextPin.padEnd(8, '_'));
  };

  const handleRemoteUnlock = () => {
    setIsSimulatingWifi(true);
    playBeep(700, 'sine', 0.05);
    setTimeout(() => {
      setIsSimulatingWifi(false);
      setIsLocked(false);
      setIsSimulatingSolenoid(true);
      playSuccessChime();
      setLcdLine1('LENH TU APP:');
      setLcdLine2('REMOTE UNLOCKED!');
      setLastAction('Đã gửi lệnh MQTT qua App -> Hộp mở khóa tức thời!');
      setTimeout(() => setIsSimulatingSolenoid(false), 1200);
    }, 400);
  };

  const handleSimulatePackageDeposit = () => {
    playBeep(520, 'sine', 0.08);
    const mockWeight = Number((1.2 + Math.random() * 3.5).toFixed(2));
    setBoxWeight(mockWeight);
    setIsLocked(true);
    setLcdLine1('BUU PHAM MOI:');
    setLcdLine2(`CAN: ${mockWeight} KG`);
    setLastAction(`Bàn cân LoadCell HX711 phát hiện kiện hàng mới: ${mockWeight} kg!`);
    playLockChime();
  };

  // Hotspots definitions
  const HOTSPOTS = [
    {
      id: 'lcd',
      name: 'Màn Hình LCD 1602 (I2C)',
      top: '44%',
      left: '64%',
      desc: 'Màn hình quang cơ 16 ký tự x 2 dòng, đèn nền vàng xanh sắc nét. Hiển thị thông báo trạng thái "ACCESS GRANTED", số serial, IP mạng và hướng dẫn cho shipper.',
      tag: 'Hiển thị thời gian thực',
      image: '/smart_safe_lcd.png'
    },
    {
      id: 'keypad',
      name: 'Bàn Phím Ma Trận Số 4x4',
      top: '60%',
      left: '70%',
      desc: 'Bàn phím cơ ma trận chống nước IP54 kết nối qua bộ giải mã I2C PCF8574. Shipper chỉ cần nhấn mã đơn hàng 1234# hoặc phím * để khóa hộp khẩn cấp.',
      tag: 'Nhập mã PIN / Phím tắt',
      image: '/smart_safe_keypad.png'
    },
    {
      id: 'mcu',
      name: 'Bo Mạch Vi Xử Lý & LED Báo Hiệu',
      top: '64%',
      left: '38%',
      desc: 'Bo mạch điều khiển tích hợp MCU 32-bit tốc độ cao, giao thức bảo mật MQTT kết nối máy chủ đám mây, cụm LED đa màu báo trạng thái kết nối Wi-Fi và nguồn điện.',
      tag: 'Bộ não điều khiển IoT',
      image: '/smart_safe_board.png'
    },
    {
      id: 'acrylic',
      name: 'Thùng Mica Acrylic Nguyên Khối 5mm',
      top: '20%',
      left: '50%',
      desc: 'Chế tác từ tấm Acrylic đúc cao cấp dày 5mm, độ trong suốt quang học 98%, chống trầy xước, chịu lực va đập cao và logo SMART SAFE khắc laser tinh xảo trên đỉnh.',
      tag: 'Độ bền vượt trội',
      image: '/smart_safe_cutout.png'
    },
    {
      id: 'power',
      name: 'Cổng Cấp Nguồn DC 12V 2A & Kích Pin Dự Phòng',
      top: '84%',
      left: '46%',
      desc: 'Cổng cắm nguồn trực tiếp 12V 2A đảm bảo thiết bị hoạt động 24/7. Hỗ trợ cổng kích nguồn khẩn cấp qua pin dự phòng khi nhà bị mất điện lưới.',
      tag: 'Nguồn điện liên tục',
      image: '/smart_safe_cropped.png'
    }
  ];

  const NAV_STEPS = [
    { stage: 0, label: 'Giới Thiệu', ref: introRef },
    { stage: 1, label: 'Cấu Tạo 3D', ref: hardwareRef },
    { stage: 2, label: 'B1: Khởi Động', ref: step1Ref },
    { stage: 3, label: 'B2: Kết Nối', ref: step2Ref },
    { stage: 4, label: 'B3: Shipper Giao', ref: step3Ref },
    { stage: 5, label: 'B4: Cân Hàng', ref: step4Ref },
    { stage: 6, label: 'B5: Khóa An Ninh', ref: step5Ref },
    { stage: 7, label: 'Bàn Phím Ảo', ref: sandboxRef },
    { stage: 8, label: 'So Sánh', ref: comparisonRef }
  ];

  return (
    <div style={{ width: '100%', boxSizing: 'border-box', position: 'relative' }}>
      {/* Interactive Sticky Top Progress Bar */}
      <div
        style={{
          position: 'sticky',
          top: '64px',
          zIndex: 35,
          background: theme === 'dark' ? 'rgba(10, 15, 30, 0.88)' : 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '8px 12px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          overflowX: 'auto'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2563eb', padding: '3px 8px', borderRadius: '6px', background: 'rgba(37,99,235,0.1)' }}>
            CHUYỂN MỤC NHANH:
          </span>
          {NAV_STEPS.map((step) => {
            const isCurrent = activeStage === step.stage;
            return (
              <button
                key={step.stage}
                type="button"
                onClick={() => scrollTo(step.ref)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: isCurrent ? '1px solid #2563eb' : '1px solid transparent',
                  background: isCurrent ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                  color: isCurrent ? '#2563eb' : 'var(--text-secondary)',
                  fontSize: '0.72rem',
                  fontWeight: isCurrent ? 800 : 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {step.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {onOrderClick && (
            <button
              type="button"
              onClick={onOrderClick}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Đặt Mua Ngay
            </button>
          )}
        </div>
      </div>

      {/* Main Unified 2-Column Responsive Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 420px) 1fr',
          gap: '32px',
          alignItems: 'start',
          position: 'relative'
        }}
        className="smart-safe-scrolly-grid"
      >
        {/* =================================================================== */}
        {/* LEFT COLUMN: FIXED 3D SMART SAFE VISUALIZER (STICKS NATURALLY) */}
        {/* =================================================================== */}
        <div style={{ position: 'sticky', top: '120px', zIndex: 30 }}>
          <div
            style={{
              borderRadius: '24px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              padding: '16px',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {/* Safe Header Status Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: isLocked ? '#ef4444' : '#10b981',
                    boxShadow: isLocked ? '0 0 10px #ef4444' : '0 0 10px #10b981'
                  }}
                />
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {isLocked ? 'CHỐT ĐIỆN TỬ: ĐÃ KHÓA' : 'CHỐT ĐIỆN TỬ: ĐÃ MỞ'}
                </span>
              </div>

              {/* View mode toggle */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setRenderMode('acrylic')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: renderMode === 'acrylic' ? '#2563eb' : 'var(--bg-surface)',
                    color: renderMode === 'acrylic' ? '#ffffff' : 'var(--text-muted)',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Tách Nền
                </button>
                <button
                  type="button"
                  onClick={() => setRenderMode('studio')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: renderMode === 'studio' ? '#2563eb' : 'var(--bg-surface)',
                    color: renderMode === 'studio' ? '#ffffff' : 'var(--text-muted)',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Studio
                </button>
              </div>
            </div>

            {/* 3D Box Stage */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1 / 1.05',
                borderRadius: '20px',
                background:
                  theme === 'dark'
                    ? 'radial-gradient(circle at center, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.95) 75%)'
                    : 'radial-gradient(circle at center, rgba(241, 245, 249, 0.9) 0%, rgba(226, 232, 240, 0.95) 75%)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              {/* Neon Ambient Pedestal */}
              <div
                className="scrolly-pedestal"
                style={{
                  position: 'absolute',
                  bottom: '12%',
                  width: '220px',
                  height: '44px',
                  borderRadius: '50%',
                  background: isLocked
                    ? 'radial-gradient(ellipse at center, rgba(239, 68, 68, 0.5) 0%, transparent 80%)'
                    : 'radial-gradient(ellipse at center, rgba(14, 165, 233, 0.6) 0%, transparent 80%)',
                  filter: 'blur(12px)',
                  pointerEvents: 'none'
                }}
              />

              {/* Wifi Waves Indicator */}
              {(isSimulatingWifi || activeStage === 3) && (
                <div
                  style={{
                    position: 'absolute',
                    top: '55%',
                    left: '42%',
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    border: '2px solid #38bdf8',
                    animation: 'wifiWaves 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                    pointerEvents: 'none',
                    zIndex: 4
                  }}
                />
              )}

              {/* Solenoid Unlock Flash */}
              {isSimulatingSolenoid && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'radial-gradient(circle at 65% 55%, rgba(16, 185, 129, 0.35) 0%, transparent 70%)',
                    pointerEvents: 'none',
                    zIndex: 6,
                    animation: 'fadeIn 0.2s ease'
                  }}
                />
              )}

              {/* Box Image */}
              <div
                style={{
                  position: 'relative',
                  width: '85%',
                  height: '85%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: getBoxTransform(),
                  transition: 'transform 0.75s cubic-bezier(0.16, 1, 0.3, 1)',
                  zIndex: 3
                }}
                className={activeStage === 0 ? 'scrolly-float-safe' : ''}
              >
                <img
                  src={renderMode === 'acrylic' ? '/smart_safe_cutout.png' : '/smart_safe_cropped.png'}
                  alt="Smart Safe Box 3D"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    filter:
                      theme === 'dark'
                        ? 'drop-shadow(0 15px 30px rgba(0,0,0,0.6))'
                        : 'drop-shadow(0 15px 25px rgba(37,99,235,0.2))',
                    userSelect: 'none'
                  }}
                />

                {/* Hotspot Pins */}
                {activeStage === 1 &&
                  HOTSPOTS.map((spot) => (
                    <div
                      key={spot.id}
                      onClick={() => setSelectedHotspot(spot.id)}
                      style={{
                        position: 'absolute',
                        top: spot.top,
                        left: spot.left,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10,
                        cursor: 'pointer'
                      }}
                      title={spot.name}
                    >
                      <div
                        className="hotspot-beacon"
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: selectedHotspot === spot.id ? '#10b981' : '#2563eb',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 0 14px rgba(37, 99, 235, 0.8)',
                          border: '2px solid #ffffff'
                        }}
                      >
                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ffffff' }} />
                      </div>
                    </div>
                  ))}
              </div>

              {/* Hotspot Floating Detail Popup Card */}
              {selectedHotspot && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    right: '10px',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    background: theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.96)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid #2563eb',
                    boxShadow: '0 12px 28px rgba(0,0,0,0.3)',
                    zIndex: 20
                  }}
                >
                  {(() => {
                    const spot = HOTSPOTS.find((h) => h.id === selectedHotspot);
                    if (!spot) return null;
                    return (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(37,99,235,0.15)', color: '#2563eb' }}>
                            {spot.tag}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedHotspot(null)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                          >
                            ✕ Đóng
                          </button>
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '3px' }}>
                          {spot.name}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                          {spot.desc}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Quick Live Interactive Action Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '14px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                gap: '8px'
              }}
            >
              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Cân Nặng:</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 900, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                  {boxWeight.toFixed(2)} KG
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleRemoteUnlock}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  title="Mở khóa tức thì"
                >
                  <Unlock size={13} />
                  <span>Mở Khóa</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleKeypadPress('*')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  title="Khóa tức thì"
                >
                  <Lock size={13} />
                  <span>Khóa [*]</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* RIGHT COLUMN: SCROLLING STORY & MARKETING SECTIONS */}
        {/* =================================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '56px', minWidth: 0 }}>
          {/* ================================================================= */}
          {/* 1. HERO STORY CARD */}
          {/* ================================================================= */}
          <div
            ref={introRef}
            style={{
              padding: '32px',
              borderRadius: '24px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px',
                borderRadius: '16px',
                background: 'rgba(37, 99, 235, 0.1)',
                color: '#2563eb',
                fontSize: '0.75rem',
                fontWeight: 800,
                marginBottom: '14px'
              }}
            >
              <Sparkles size={14} />
              <span>HỘP NHẬN HÀNG THÔNG MINH IOT THẾ HỆ MỚI 2026</span>
            </div>

            <h1
              style={{
                fontSize: '2.2rem',
                fontWeight: 900,
                lineHeight: 1.2,
                color: 'var(--text-primary)',
                margin: '0 0 14px 0'
              }}
            >
              An Tâm Nhận Hàng Khi Vắng Nhà Với{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Anchor Box Acrylic
              </span>
            </h1>

            <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 20px 0' }}>
              Giải pháp loại bỏ 100% nỗi lo mất cắp kiện hàng, bưu phẩm bị ướt mưa hoặc shipper giao hàng lúc bạn đang ở công ty. Thùng Mica Acrylic quang học 5mm trong suốt nhìn thấu bo mạch, khóa điện từ Solenoid chống trộm và điều khiển từ xa tức thì qua App di động.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
              {onOrderClick && (
                <button
                  type="button"
                  onClick={onOrderClick}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Đặt Mua Ngay</span>
                  <ArrowRight size={16} />
                </button>
              )}

              <button
                type="button"
                onClick={() => scrollTo(hardwareRef)}
                style={{
                  padding: '12px 20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Eye size={16} color="#2563eb" />
                <span>Xem Bóc Tách Linh Kiện</span>
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-subtle)'
              }}
            >
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2563eb' }}>0.5 Giây</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tốc độ giật chốt khóa</div>
              </div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0ea5e9' }}>Mica 5mm</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Acrylic đúc chịu lực</div>
              </div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981' }}>24-Bit</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cân tải trọng HX711</div>
              </div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#8b5cf6' }}>12 Tháng</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Bảo hành chính hãng</div>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* 2. CẤU TẠO PHẦN CỨNG & BÓC TÁCH LINH KIỆN */}
          {/* ================================================================= */}
          <div ref={hardwareRef} style={{ scrollMarginTop: '130px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '12px',
                background: 'rgba(37, 99, 235, 0.1)',
                color: '#2563eb',
                fontSize: '0.72rem',
                fontWeight: 800,
                marginBottom: '8px'
              }}
            >
              <Layers size={13} />
              <span>CẤU TRÚC VẬT LÝ NGUYÊN BẢN</span>
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
              Khám Phá Linh Kiện Vi Điện Tử Bên Trong Hộp
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 18px 0' }}>
              Bấm vào từng bộ phận bên dưới để phóng to chi tiết và kích hoạt điểm chỉ điểm (Hotspot Pin) trên mô hình 3D bên trái.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
              {/* Card 1: LCD */}
              <div
                onClick={() => setSelectedHotspot('lcd')}
                style={{
                  padding: '12px',
                  borderRadius: '14px',
                  background: 'var(--bg-card)',
                  border: selectedHotspot === 'lcd' ? '2px solid #2563eb' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ height: '95px', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px', background: '#090d16' }}>
                  <img src="/smart_safe_lcd.png" alt="LCD" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--text-primary)' }}>Màn Hình LCD 1602</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Hiển thị chữ vàng xanh 16x2</div>
              </div>

              {/* Card 2: Keypad */}
              <div
                onClick={() => setSelectedHotspot('keypad')}
                style={{
                  padding: '12px',
                  borderRadius: '14px',
                  background: 'var(--bg-card)',
                  border: selectedHotspot === 'keypad' ? '2px solid #2563eb' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ height: '95px', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px', background: '#090d16' }}>
                  <img src="/smart_safe_keypad.png" alt="Keypad" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--text-primary)' }}>Bàn Phím Số 4x4</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>16 phím nảy êm ái</div>
              </div>

              {/* Card 3: Board */}
              <div
                onClick={() => setSelectedHotspot('mcu')}
                style={{
                  padding: '12px',
                  borderRadius: '14px',
                  background: 'var(--bg-card)',
                  border: selectedHotspot === 'mcu' ? '2px solid #2563eb' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ height: '95px', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px', background: '#090d16' }}>
                  <img src="/smart_safe_board.png" alt="MCU" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--text-primary)' }}>Bo Mạch Chủ & LED</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Đèn tín hiệu đa màu</div>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* 3. BƯỚC 1: KHỞI ĐỘNG CẤP NGUỒN */}
          {/* ================================================================= */}
          <div
            ref={step1Ref}
            style={{
              scrollMarginTop: '130px',
              padding: '24px',
              borderRadius: '20px',
              background: activeStage === 2 ? 'var(--bg-card)' : 'var(--bg-surface)',
              border: activeStage === 2 ? '2px solid #2563eb' : '1px solid var(--border-subtle)',
              boxShadow: activeStage === 2 ? '0 10px 28px rgba(37, 99, 235, 0.15)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#2563eb', color: '#ffffff', fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                1
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>Bước Khởi Động</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>
                  Cắm Nguồn Adapter 12V 2A & Khởi Động Thiết Bị
                </h3>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
              Cắm Adapter vào cổng DC phía sau hộp. Còi Buzzer sẽ kêu bíp ngắn, dải đèn LED kiểm tra nguồn sáng lên, và màn hình LCD 1602 lập tức sáng lên dòng chữ chào đón:
            </p>

            <div className="lcd-1602-screen" style={{ padding: '10px 16px', borderRadius: '8px', fontSize: '0.84375rem', marginBottom: '10px' }}>
              <div>SYSTEM RELOAD:</div>
              <div>ACCESS GRANTED</div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ✓ Hỗ trợ cổng kích nguồn 12V khẩn cấp bằng pin sạc dự phòng khi mất điện lưới.
            </div>
          </div>

          {/* ================================================================= */}
          {/* 4. BƯỚC 2: KẾT NỐI APP & WI-FI */}
          {/* ================================================================= */}
          <div
            ref={step2Ref}
            style={{
              scrollMarginTop: '130px',
              padding: '24px',
              borderRadius: '20px',
              background: activeStage === 3 ? 'var(--bg-card)' : 'var(--bg-surface)',
              border: activeStage === 3 ? '2px solid #0ea5e9' : '1px solid var(--border-subtle)',
              boxShadow: activeStage === 3 ? '0 10px 28px rgba(14, 165, 233, 0.15)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#0ea5e9', color: '#ffffff', fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                2
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0ea5e9', textTransform: 'uppercase' }}>Ghép Nối Đám Mây</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>
                  Kết Nối Ứng Dụng Di Động & Đồng Bộ Serial
                </h3>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
              Mở app di động trên điện thoại, quét mã QR dán trên thân hộp hoặc nhập mã Serial. Bấm tổ hợp phím <strong>A-B-C-D-#</strong> để hộp hiển thị số Serial kiểm tra:
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mã Serial Mẫu:</div>
                <div style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#2563eb' }}>
                  DBX-98C377AD9D60
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleKeypadPress('ABCD#')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Bấm A-B-C-D-#
              </button>
            </div>
          </div>

          {/* ================================================================= */}
          {/* 5. BƯỚC 3: SHIPPER GIAO HÀNG & MÃ OTP */}
          {/* ================================================================= */}
          <div
            ref={step3Ref}
            style={{
              scrollMarginTop: '130px',
              padding: '24px',
              borderRadius: '20px',
              background: activeStage === 4 ? 'var(--bg-card)' : 'var(--bg-surface)',
              border: activeStage === 4 ? '2px solid #10b981' : '1px solid var(--border-subtle)',
              boxShadow: activeStage === 4 ? '0 10px 28px rgba(16, 185, 129, 0.15)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#10b981', color: '#ffffff', fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                3
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>Giao Nhận Tự Động</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>
                  Shipper Bấm Mã PIN 1234# Mở Nắp Hộp
                </h3>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
              Shipper bấm mã PIN đơn hàng (ví dụ <strong>1234#</strong>). Chốt điện Solenoid rút về trong 1 giây, nắp tự động bật mở. Shipper đặt kiện hàng vào và hạ nắp lại.
            </p>

            <button
              type="button"
              onClick={() => {
                setPinInput('1234');
                handleKeypadPress('#');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#10b981',
                color: '#ffffff',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <span>Thử nghiệm bấm [1234#]</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* ================================================================= */}
          {/* 6. BƯỚC 4: CÂN TRỌNG LƯỢNG & MỞ KHÓA TỪ XA */}
          {/* ================================================================= */}
          <div
            ref={step4Ref}
            style={{
              scrollMarginTop: '130px',
              padding: '24px',
              borderRadius: '20px',
              background: activeStage === 5 ? 'var(--bg-card)' : 'var(--bg-surface)',
              border: activeStage === 5 ? '2px solid #f59e0b' : '1px solid var(--border-subtle)',
              boxShadow: activeStage === 5 ? '0 10px 28px rgba(245, 158, 11, 0.15)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f59e0b', color: '#ffffff', fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                4
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>Cân Tải Trọng Chống Tráo Hàng</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>
                  Cảm Biến 24-Bit HX711 Cân Bưu Phẩm Tức Thì
                </h3>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 14px 0' }}>
              Bàn cân LoadCell dưới đáy hộp lập tức đo khối lượng kiện hàng và bắn thông báo số kg về máy bạn. Bạn cũng có thể mở nắp từ xa khi shipper gọi điện.
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleSimulatePackageDeposit}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#f59e0b',
                  color: '#ffffff',
                  fontSize: '0.78125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Scale size={15} />
                <span>Mô phỏng bỏ hàng vào cân</span>
              </button>

              <button
                type="button"
                onClick={handleRemoteUnlock}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: '0.78125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Smartphone size={15} color="#2563eb" />
                <span>Mở Từ Xa (Remote)</span>
              </button>
            </div>
          </div>

          {/* ================================================================= */}
          {/* 7. BƯỚC 5: KHÓA AN TOÀN & BẢO VỆ CHỐNG CẠY */}
          {/* ================================================================= */}
          <div
            ref={step5Ref}
            style={{
              scrollMarginTop: '130px',
              padding: '24px',
              borderRadius: '20px',
              background: activeStage === 6 ? 'var(--bg-card)' : 'var(--bg-surface)',
              border: activeStage === 6 ? '2px solid #ef4444' : '1px solid var(--border-subtle)',
              boxShadow: activeStage === 6 ? '0 10px 28px rgba(239, 68, 68, 0.15)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ef4444', color: '#ffffff', fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                5
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>An Ninh Kép</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>
                  Khóa Nhanh Phím [*] & Cảm Biến Cửa Từ Chống Cạy Phá
                </h3>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 14px 0' }}>
              Chỉ cần bấm phím <strong>*</strong> để khóa hộp tức thì. Cảm biến từ MC-38 giám sát nắp đậy 24/7, kích hoạt còi báo động nếu phát hiện hành vi cạy phá trái phép.
            </p>

            <button
              type="button"
              onClick={() => handleKeypadPress('*')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '0.78125rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Lock size={15} />
              <span>Bấm [*] Thử Khóa Hộp</span>
            </button>
          </div>

          {/* ================================================================= */}
          {/* 8. BÀN THỬ NGHIỆM PHẦN CỨNG ẢO (LIVE SIMULATOR) */}
          {/* ================================================================= */}
          <div
            ref={sandboxRef}
            style={{
              scrollMarginTop: '130px',
              padding: '28px',
              borderRadius: '24px',
              background: 'var(--bg-card)',
              border: '2px solid #2563eb',
              boxShadow: '0 16px 40px -10px rgba(37, 99, 235, 0.25)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>Bàn Thử Nghiệm Tương Tác</span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>
                  Trải Nghiệm Bàn Phím 4x4 & Màn Hình LCD Ảo
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  color: soundEnabled ? '#10b981' : 'var(--text-muted)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                <span>{soundEnabled ? 'Âm thanh: BẬT' : 'Âm thanh: TẮT'}</span>
              </button>
            </div>

            {/* LCD Screen Display */}
            <div className="lcd-1602-screen" style={{ padding: '14px 18px', borderRadius: '10px', marginBottom: '14px', fontSize: '1rem', lineHeight: 1.5 }}>
              <div>{lcdLine1}</div>
              <div>{lcdLine2}</div>
            </div>

            {/* Status log */}
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '16px', fontFamily: 'var(--font-mono)' }}>
              ▶ {lastAction}
            </div>

            {/* Keypad Matrix Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', maxWidth: '320px', margin: '0 auto 18px auto' }}>
              {[
                { k: '1', color: '#1e293b' },
                { k: '2', color: '#1e293b' },
                { k: '3', color: '#1e293b' },
                { k: 'A', color: '#dc2626' },
                { k: '4', color: '#1e293b' },
                { k: '5', color: '#1e293b' },
                { k: '6', color: '#1e293b' },
                { k: 'B', color: '#dc2626' },
                { k: '7', color: '#1e293b' },
                { k: '8', color: '#1e293b' },
                { k: '9', color: '#1e293b' },
                { k: 'C', color: '#dc2626' },
                { k: '*', color: '#eab308' },
                { k: '0', color: '#1e293b' },
                { k: '#', color: '#16a34a' },
                { k: 'D', color: '#dc2626' }
              ].map((btn) => (
                <button
                  key={btn.k}
                  type="button"
                  className="keypad-btn"
                  onClick={() => handleKeypadPress(btn.k)}
                  style={{
                    height: '48px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: btn.color,
                    color: '#ffffff',
                    fontSize: '1.15rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  {btn.k}
                </button>
              ))}
            </div>

            {/* Quick Trigger Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Phím tắt:</span>
              <button
                type="button"
                onClick={() => { setPinInput('1234'); handleKeypadPress('#'); }}
                style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: '#10b981', cursor: 'pointer' }}
              >
                1234# (Mở nắp)
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('*')}
                style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: '#ef4444', cursor: 'pointer' }}
              >
                * (Khóa)
              </button>
              <button
                type="button"
                onClick={() => { setPinInput('ABCD'); handleKeypadPress('#'); }}
                style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: '#2563eb', cursor: 'pointer' }}
              >
                ABCD# (Serial)
              </button>
              <button
                type="button"
                onClick={() => { setPinInput('AD'); handleKeypadPress('#'); }}
                style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: '#0ea5e9', cursor: 'pointer' }}
              >
                AD# (WiFi IP)
              </button>
            </div>
          </div>

          {/* ================================================================= */}
          {/* 9. BẢNG SO SÁNH CÔNG NGHỆ VƯỢT TRỘI */}
          {/* ================================================================= */}
          <div ref={comparisonRef} style={{ scrollMarginTop: '130px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '12px',
                background: 'rgba(37, 99, 235, 0.1)',
                color: '#2563eb',
                fontSize: '0.72rem',
                fontWeight: 800,
                marginBottom: '8px'
              }}
            >
              <Shield size={13} />
              <span>SO SÁNH CÔNG NGHỆ</span>
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
              Tại Sao Anchor Box Vượt Trội So Với Hộp Thường?
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
              Bảo vệ toàn diện bưu phẩm của bạn trong kỷ nguyên thương mại điện tử 4.0.
            </p>

            <div
              style={{
                background: 'var(--bg-card)',
                borderRadius: '18px',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.6fr 1fr 1.2fr',
                  padding: '14px 18px',
                  background: theme === 'dark' ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc',
                  borderBottom: '1px solid var(--border-subtle)',
                  fontWeight: 800,
                  fontSize: '0.8125rem'
                }}
              >
                <div>Tính Năng</div>
                <div style={{ color: 'var(--text-muted)' }}>Hộp Thường</div>
                <div style={{ color: '#2563eb' }}>Anchor Box IoT</div>
              </div>

              {[
                {
                  f: 'Mở khóa cho shipper',
                  t: 'Chìa cơ / Nắp hở',
                  a: 'Mã PIN OTP + App từ xa'
                },
                {
                  f: 'Cân chống tráo hàng',
                  t: 'Không có',
                  a: 'LoadCell 24-bit HX711'
                },
                {
                  f: 'Cảnh báo cạy phá',
                  t: 'Không có',
                  a: 'Cảm biến MC-38 + Còi hú'
                },
                {
                  f: 'Chất liệu thân hộp',
                  t: 'Tôn dễ rỉ / Nhựa giòn',
                  a: 'Mica Acrylic đúc 5mm'
                },
                {
                  f: 'Nhật ký bưu kiện',
                  t: 'Không thể tra cứu',
                  a: 'Lưu Cloud + Serial QR'
                }
              ].map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.6fr 1fr 1.2fr',
                    padding: '12px 18px',
                    borderBottom: i < 4 ? '1px solid var(--border-subtle)' : 'none',
                    fontSize: '0.78125rem',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.f}</div>
                  <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <X size={13} color="#ef4444" /> <span>{row.t}</span>
                  </div>
                  <div style={{ color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={14} color="#10b981" /> <span>{row.a}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ================================================================= */}
          {/* 10. CAM KẾT & CTA CUỐI TRANG */}
          {/* ================================================================= */}
          <div
            style={{
              padding: '28px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(14, 165, 233, 0.08))',
              border: '1px solid rgba(37, 99, 235, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px'
            }}
          >
            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#2563eb', marginBottom: '4px' }}>
                ƯU ĐÃI THÁNG 9/2026
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                Sẵn Sàng Đặt Mua Hộp Anchor Box?
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                Tặng kèm trọn bộ: Adapter 12V 2A + Chìa khóa cơ + Pin kích nguồn + Miễn phí vận chuyển toàn quốc.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {onOrderClick && (
                <button
                  type="button"
                  onClick={onOrderClick}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)'
                  }}
                >
                  Đặt Mua Ngay
                </button>
              )}

              {onWarrantyClick && (
                <button
                  type="button"
                  onClick={onWarrantyClick}
                  style={{
                    padding: '12px 18px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <QrCode size={15} color="#2563eb" />
                  <span>Tra Cứu QR</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartSafeInteractiveScrolly;
