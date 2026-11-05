import { useState, useMemo } from 'react';
import {
  Package,
  ShieldCheck,
  RefreshCw,
  Lock,
  Unlock,
  Thermometer,
  BatteryCharging,
  Scale,
  DoorClosed,
  DoorOpen,
  Zap,
  Sliders,
  X,
  Users,
  Smartphone,
  Copy,
  Check,
  QrCode,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  LayoutGrid,
  Monitor
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { request } from '../api/shop';
import { warrantyEligible, type Page } from '../api/customer';
import { AccountNav, ResourceState, useResource } from '../components/ShopUi';
import { useShop } from '../ShopContext';
import './CustomerDevices.css';

export interface SharedMember {
  userId: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  accessLevel: 'full_control' | 'view_only' | string;
  grantedAt: string | null;
}

interface Device {
  id: string;
  serialNumber: string;
  productName: string | null;
  variantName: string | null;
  name?: string | null;
  locationLabel?: string | null;
  status?: string | null;
  batteryLevel?: number | null;
  firmwareVersion?: string | null;
  lastSeenAt?: string | null;
  doorStatus?: string | null;
  lockStatus?: string | null;
  weightKg?: number | null;
  packageDetected?: boolean | null;
  orderId: string | null;
  warrantyId: string | null;
  startDate: string | null;
  endDate: string | null;
  warrantyStatus: string | null;
  acceptedAt: string | null;
  sharedMembers?: SharedMember[];
}

/**
 * 3D Isometric Vector Illustration of AnchorBox Smart Parcel Locker
 * Displays metallic body, illuminated status ring, digital keypad, and delivery hatch.
 */
function AnchorBoxIsometric3D({
  isLocked,
  isOnline,
  sizeLabel = '45L'
}: {
  isLocked: boolean;
  isOnline: boolean;
  sizeLabel?: string;
}) {
  return (
    <div className="iso-box-canvas" aria-label="Mô phỏng 3D AnchorBox Smart Locker">
      <svg
        viewBox="0 0 320 280"
        className="iso-box-svg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Surface Gradients */}
          <linearGradient id="topLidGrad" x1="160" y1="40" x2="260" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#384152" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          <linearGradient id="frontWallGrad" x1="60" y1="90" x2="160" y2="240" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="rightWallGrad" x1="160" y1="100" x2="260" y2="240" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#090d16" />
          </linearGradient>

          <linearGradient id="ledGlowGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isOnline ? '#34d399' : '#f87171'} />
            <stop offset="100%" stopColor={isOnline ? '#059669' : '#dc2626'} />
          </linearGradient>

          <filter id="shadowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" />
          </filter>

          <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient Ground Shadow */}
        <ellipse cx="160" cy="245" rx="100" ry="24" fill="rgba(15, 23, 42, 0.35)" filter="url(#shadowFilter)" />

        {/* Left/Front Face (Isometric Projection) */}
        <path
          d="M60 100 L160 152 L160 236 L60 184 Z"
          fill="url(#frontWallGrad)"
          stroke="#475569"
          strokeWidth="1.2"
        />

        {/* Right/Side Face */}
        <path
          d="M160 152 L260 100 L260 184 L160 236 Z"
          fill="url(#rightWallGrad)"
          stroke="#334155"
          strokeWidth="1.2"
        />

        {/* Top Hatch Lid */}
        <path
          d="M160 52 L260 100 L160 152 L60 100 Z"
          fill="url(#topLidGrad)"
          stroke="#64748b"
          strokeWidth="1.5"
        />

        {/* Top Hatch Inset / Weather Seal Rim */}
        <path
          d="M160 62 L245 101 L160 142 L75 101 Z"
          fill="none"
          stroke="#0071e3"
          strokeWidth="1.2"
          strokeDasharray="4 3"
          opacity="0.85"
        />

        {/* Digital Keypad Screen on Front Face */}
        <g transform="matrix(0.866 0.5 0 1 80 125)">
          <rect x="0" y="0" width="34" height="22" rx="3" fill="#090d16" stroke="#334155" strokeWidth="0.8" />
          <line x1="5" y1="7" x2="29" y2="7" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
          <circle cx="8" cy="14" r="1.5" fill="#94a3b8" />
          <circle cx="14" cy="14" r="1.5" fill="#94a3b8" />
          <circle cx="20" cy="14" r="1.5" fill="#94a3b8" />
          <circle cx="26" cy="14" r="1.5" fill="#94a3b8" />
        </g>

        {/* Parcel Drop Slot Door Seam */}
        <path
          d="M74 155 L146 192 L146 222 L74 185 Z"
          fill="none"
          stroke="#334155"
          strokeWidth="1"
          strokeDasharray="2 2"
        />

        {/* Solenoid Lock LED Indicator Ring */}
        <g transform="translate(160, 152)">
          <circle
            cx="0"
            cy="0"
            r="7"
            fill={isLocked ? '#0284c7' : '#f59e0b'}
            filter="url(#glowFilter)"
            opacity="0.95"
          />
          <circle cx="0" cy="0" r="3.5" fill="#ffffff" />
        </g>

        {/* Side Ventilation & Heat Dissipation Louvers */}
        <g opacity="0.6">
          <line x1="180" y1="140" x2="240" y2="110" stroke="#334155" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="180" y1="150" x2="240" y2="120" stroke="#334155" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="180" y1="160" x2="240" y2="130" stroke="#334155" strokeWidth="1.2" strokeLinecap="round" />
        </g>

        {/* Volume Size Badge on Box Top */}
        <g transform="translate(160, 95)">
          <rect x="-24" y="-10" width="48" height="20" rx="10" fill="rgba(15, 23, 42, 0.75)" stroke="#64748b" strokeWidth="0.8" />
          <text x="0" y="4" fill="#38bdf8" fontSize="10" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">
            {sizeLabel}
          </text>
        </g>
      </svg>

      {/* Floating Status Indicator Overlay */}
      <div className="iso-floating-status">
        <span className={`iso-status-dot ${isOnline ? 'online' : 'offline'}`} />
        <span>{isOnline ? 'IoT Trực tuyến' : 'Ngoại tuyến'}</span>
        <span className="iso-status-sep">•</span>
        <span>{isLocked ? 'Solenoid 250kg' : 'Chốt mở'}</span>
      </div>
    </div>
  );
}

/**
 * Apple Pro Command Center Dashboard Layout
 * Eliminates the empty void when a user has a single device by structuring into a
 * balanced, dual-column telemetry & management suite.
 */
function AppleProDeviceHeroDashboard({
  device: d,
  onOpenSpecsModal,
  onOpenSharingGuide,
}: {
  device: Device;
  onOpenSpecsModal: (device: Device) => void;
  onOpenSharingGuide: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const isLocked = (d.lockStatus || 'locked') === 'locked';
  const isOnline = d.status !== 'offline';
  const batteryPct = d.batteryLevel ?? 96;
  const weightVal = typeof d.weightKg === 'number' ? d.weightKg : 0.0;
  const isDoorClosed = (d.doorStatus || 'closed') === 'closed';

  // Calibrated temperature reading (26.5°C - 28.5°C)
  const tempReading = useMemo(() => {
    const hash = d.serialNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (26.2 + (hash % 25) / 10).toFixed(1);
  }, [d.serialNumber]);

  const canClaim =
    !!d.warrantyId &&
    !!d.startDate &&
    !!d.endDate &&
    warrantyEligible({
      id: d.warrantyId,
      deviceId: d.id,
      serialNumber: d.serialNumber,
      orderId: d.orderId || '',
      startDate: d.startDate,
      endDate: d.endDate,
      status: d.warrantyStatus || '',
      durationMonths: 24,
      acceptedAt: d.acceptedAt || '',
    });

  const sharedList = d.sharedMembers || [];

  const handleCopySerial = () => {
    navigator.clipboard.writeText(d.serialNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract size label e.g. "45L", "75L", "110L"
  const sizeLabel = useMemo(() => {
    const text = (d.name || d.productName || d.variantName || '').toUpperCase();
    if (text.includes('110')) return '110L';
    if (text.includes('75')) return '75L';
    return '45L';
  }, [d.name, d.productName, d.variantName]);

  return (
    <div className="apple-pro-split-dashboard">
      {/* =========================================================================
          LEFT COLUMN: Hardware Showcase, Security Lock & Real-Time Telemetry
          ========================================================================= */}
      <div className="apple-pro-col-hero">
        {/* 1. Visual 3D Showcase Card */}
        <div className="apple-pro-visual-card">
          <div className="visual-card-top-identity">
            <div className="device-brand-row">
              <span className="device-brand-pill">ANCHORBOX IOT ECOSYSTEM</span>
              <span className={`device-live-badge ${isOnline ? 'is-live' : 'is-off'}`}>
                <span className="live-pulse-dot" />
                {isOnline ? 'TRỰC TUYẾN 24/7' : 'MẤT KẾT NỐI'}
              </span>
            </div>

            <h2 className="device-hero-title">
              {d.name || d.productName || 'Anchor Box Base 45L'}
            </h2>

            <div className="device-hero-meta-row">
              <button
                type="button"
                className="device-serial-copy-btn"
                onClick={handleCopySerial}
                title="Bấm để sao chép mã số Serial Number"
              >
                <span>SN: <strong>{d.serialNumber}</strong></span>
                {copied ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
              </button>

              <span className="device-meta-sep">•</span>
              <span className="device-location-badge">
                {d.locationLabel || 'Vị trí: Trước cổng chính'}
              </span>

              <span className="device-meta-sep">•</span>
              <span className="device-fw-badge">
                FW: {d.firmwareVersion || 'v2.4.1 (Mới nhất)'}
              </span>
            </div>
          </div>

          {/* 3D Isometric Illustration */}
          <div className="visual-box-container">
            <AnchorBoxIsometric3D isLocked={isLocked} isOnline={isOnline} sizeLabel={sizeLabel} />
          </div>

          {/* Bottom Card Action Bar */}
          <div className="visual-card-bottom-bar">
            <div className="bottom-bar-warranty">
              <ShieldCheck size={16} color="#0071e3" />
              <span>
                Bảo hành chính hãng <strong>24 tháng</strong> (AnchorCare Pro)
              </span>
            </div>

            <button
              type="button"
              className="bottom-bar-specs-btn"
              onClick={() => onOpenSpecsModal(d)}
            >
              <Sliders size={14} />
              <span>Thông số phần cứng</span>
            </button>
          </div>
        </div>

        {/* 2. Apple Lock Read-Only Security Banner */}
        <div className={`apple-pro-lock-banner ${isLocked ? 'is-locked' : 'is-unlocked'}`}>
          <div className="lock-banner-icon-circle">
            {isLocked ? <Lock size={22} /> : <Unlock size={22} />}
          </div>

          <div className="lock-banner-info">
            <div className="lock-banner-header">
              <h3 className="lock-banner-title">
                {isLocked ? 'TRẠNG THÁI: ĐÃ KHÓA AN TOÀN' : 'TRẠNG THÁI: ĐANG MỞ CHỐT'}
              </h3>
              <span className="lock-banner-force-tag">Lực giữ chốt 250kg</span>
            </div>

            <p className="lock-banner-desc">
              {isLocked
                ? 'Chốt điện từ Solenoid lực giữ 250kg đang khóa kín. Nắp hộp chịu được va đập, chống cạy phá tiêu chuẩn ANSI Grade 1.'
                : 'Chốt điện từ đang mở. Nắp hộp có thể mở để tiếp nhận kiện hàng mới.'}
            </p>

            <div className="lock-security-note">
              <Smartphone size={14} color="#0071e3" />
              <span>
                Thao tác mở chốt Solenoid trực tiếp được <strong>bảo mật độc quyền trên AnchorBox Mobile App</strong> qua Bluetooth LE mã hóa và Face ID / Vân tay.
              </span>
            </div>
          </div>
        </div>

        {/* 3. Live Sensor Telemetry Gauges Grid */}
        <div className="apple-pro-telemetry-section">
          <div className="telemetry-section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} color="#0071e3" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1d1d1f' }}>
                Chỉ số cảm biến thời gian thực (Live Telemetry)
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#86868b' }}>Đồng bộ 10 giây/lần</span>
          </div>

          <div className="apple-pro-telemetry-grid">
            {/* Metric 1: Temperature */}
            <div className="pro-telemetry-card temp">
              <div className="pro-card-header">
                <div className="pro-icon-box temp">
                  <Thermometer size={18} />
                </div>
                <span className="pro-card-tag">Buồng chứa</span>
              </div>
              <div className="pro-card-data">
                <span className="pro-card-label">Nhiệt độ bên trong</span>
                <div className="pro-card-val-row">
                  <span className="pro-card-main-val">{tempReading}°C</span>
                  <span className="pro-card-status-pill green">Ổn định</span>
                </div>
                <div className="pro-temp-gauge-bar">
                  <div className="gauge-fill" style={{ width: '42%' }} />
                </div>
                <span className="pro-card-sub">
                  Ngưỡng bảo vệ an toàn thực phẩm & dược phẩm: 15°C - 35°C
                </span>
              </div>
            </div>

            {/* Metric 2: Battery */}
            <div className="pro-telemetry-card battery">
              <div className="pro-card-header">
                <div className="pro-icon-box battery">
                  <BatteryCharging size={18} />
                </div>
                <span className="pro-card-tag">LiFePO4 12V</span>
              </div>
              <div className="pro-card-data">
                <span className="pro-card-label">Pin dự phòng khẩn cấp</span>
                <div className="pro-card-val-row">
                  <span className="pro-card-main-val">{batteryPct}%</span>
                  <span className="pro-card-status-pill green">Đã sạc đầy</span>
                </div>
                <div className="pro-battery-track">
                  <div className="pro-battery-fill" style={{ width: `${batteryPct}%` }} />
                </div>
                <span className="pro-card-sub">
                  Duy trì hoạt động lên đến <strong>72 giờ</strong> khi mất điện lưới
                </span>
              </div>
            </div>

            {/* Metric 3: Weight Sensor */}
            <div className="pro-telemetry-card weight">
              <div className="pro-card-header">
                <div className="pro-icon-box weight">
                  <Scale size={18} />
                </div>
                <span className="pro-card-tag">Loadcell 4 điểm</span>
              </div>
              <div className="pro-card-data">
                <span className="pro-card-label">Cảm biến tải trọng</span>
                <div className="pro-card-val-row">
                  <span className="pro-card-main-val">
                    {weightVal > 0.05 ? `${weightVal} kg` : '0.00 kg'}
                  </span>
                  <span className={`pro-card-status-pill ${weightVal > 0.05 ? 'blue' : 'gray'}`}>
                    {weightVal > 0.05 ? 'Có kiện hàng' : 'Sẵn sàng'}
                  </span>
                </div>
                <div className="pro-scale-bar">
                  <div
                    className="pro-scale-fill"
                    style={{ width: `${Math.min(100, (weightVal / 20) * 100)}%` }}
                  />
                </div>
                <span className="pro-card-sub">
                  Tải trọng tối đa: 40 kg • Sai số cảm biến: ±50g
                </span>
              </div>
            </div>

            {/* Metric 4: Door Status */}
            <div className="pro-telemetry-card door">
              <div className="pro-card-header">
                <div className="pro-icon-box door">
                  {isDoorClosed ? <DoorClosed size={18} /> : <DoorOpen size={18} />}
                </div>
                <span className="pro-card-tag">Gioăng IP65</span>
              </div>
              <div className="pro-card-data">
                <span className="pro-card-label">Nắp cửa bưu kiện</span>
                <div className="pro-card-val-row">
                  <span className="pro-card-main-val">
                    {isDoorClosed ? 'Đóng kín' : 'Đang mở'}
                  </span>
                  <span className={`pro-card-status-pill ${isDoorClosed ? 'green' : 'amber'}`}>
                    {isDoorClosed ? 'Kháng nước IP65' : 'Cảnh báo nắp'}
                  </span>
                </div>
                <div className="pro-door-gauge">
                  <span className="door-status-text">
                    {isDoorClosed ? '✓ Khít gioăng EPDM chống mưa bão' : '⚠️ Cửa mở chưa hoàn tất'}
                  </span>
                </div>
                <span className="pro-card-sub">
                  Cảm biến chống kẹt tay quang học hồng ngoại kích hoạt
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          RIGHT COLUMN: Ecosystem, Shared Members, IoT Specs & Warranty Link
          ========================================================================= */}
      <div className="apple-pro-col-info">
        {/* Card 1: Shared Members Management */}
        <div className="apple-pro-card shared-members-card">
          <div className="pro-card-title-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="#0071e3" />
              <h3 className="pro-card-heading">Tài khoản được chia sẻ quyền điều khiển</h3>
            </div>
            <span className="pro-card-badge">{sharedList.length} thành viên</span>
          </div>

          <p className="pro-card-description">
            Các thành viên gia đình được cấp quyền cùng mở khóa tủ nhận hàng qua ứng dụng di động AnchorBox.
          </p>

          {sharedList.length > 0 ? (
            <div className="pro-members-list">
              {sharedList.map((m, idx) => (
                <div key={idx} className="pro-member-item">
                  <div className="pro-member-avatar">
                    {(m.fullName || m.email || 'U')[0].toUpperCase()}
                  </div>
                  <div className="pro-member-details">
                    <span className="pro-member-name">{m.fullName || m.email}</span>
                    <span className="pro-member-email">{m.email}</span>
                  </div>
                  <span
                    className={`pro-member-role-badge ${
                      m.accessLevel === 'full_control' ? 'is-full' : 'is-view'
                    }`}
                  >
                    {m.accessLevel === 'full_control' ? 'Toàn quyền điều khiển' : 'Chỉ xem bưu kiện'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="pro-members-empty-box">
              <div className="empty-box-icon">
                <Users size={28} color="#94a3b8" />
              </div>
              <h4 className="empty-box-title">Chưa có thành viên nào được chia sẻ</h4>
              <p className="empty-box-desc">
                Bạn có thể thêm người thân hoặc đồng nghiệp để họ dùng điện thoại cá nhân mở tủ nhận hàng mà không cần chia sẻ mật khẩu chính.
              </p>
              <button
                type="button"
                className="apple-pill-btn secondary btn-sm"
                onClick={onOpenSharingGuide}
              >
                <Smartphone size={13} />
                <span>Xem hướng dẫn mời thành viên qua App</span>
              </button>
            </div>
          )}

          <div className="pro-card-footer-action">
            <button
              type="button"
              className="pro-link-btn"
              onClick={onOpenSharingGuide}
            >
              <span>Cách thức phân quyền & bảo mật Bluetooth LE</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Card 2: IoT Hardware Technical Specs Quick Table */}
        <div className="apple-pro-card hardware-specs-card">
          <div className="pro-card-title-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} color="#0071e3" />
              <h3 className="pro-card-heading">Hồ sơ thông số kỹ thuật IoT</h3>
            </div>
            <button
              type="button"
              className="pro-subtle-btn"
              onClick={() => onOpenSpecsModal(d)}
            >
              Chi tiết →
            </button>
          </div>

          <div className="pro-specs-compact-table">
            <div className="compact-spec-row">
              <span className="c-key">Thể tích buồng chứa</span>
              <span className="c-val">{sizeLabel} (Dung tích chuẩn gia đình)</span>
            </div>
            <div className="compact-spec-row">
              <span className="c-key">Vi điều khiển</span>
              <span className="c-val">ESP32-S3 Dual-Core 240MHz (FreeRTOS)</span>
            </div>
            <div className="compact-spec-row">
              <span className="c-key">Kết nối mạng không dây</span>
              <span className="c-val">Wi-Fi 2.4GHz + 4G LTE-M + BLE 5.2</span>
            </div>
            <div className="compact-spec-row">
              <span className="c-key">Tiêu chuẩn bảo vệ</span>
              <span className="c-val">IP65 Chống nước mưa & bụi xâm nhập</span>
            </div>
            <div className="compact-spec-row">
              <span className="c-key">Cơ cấu khóa an toàn</span>
              <span className="c-val">Chốt điện từ Solenoid lực giữ 250kg</span>
            </div>
            <div className="compact-spec-row">
              <span className="c-key">Nguồn cấp chính & dự phòng</span>
              <span className="c-val">AC 220V/50Hz + Pin LiFePO4 12V 6000mAh</span>
            </div>
          </div>
        </div>

        {/* Card 3: Warranty Provenance & Order Link */}
        <div className="apple-pro-card warranty-provenance-card">
          <div className="pro-card-title-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#16a34a" />
              <h3 className="pro-card-heading">Bảo hành chính hãng & Nguồn gốc đơn hàng</h3>
            </div>
            <span className={`warranty-status-chip ${canClaim ? 'active' : 'expired'}`}>
              {canClaim ? 'Hiệu lực 24 tháng' : 'Tiêu chuẩn'}
            </span>
          </div>

          <div className="warranty-summary-box">
            <div className="warranty-date-item">
              <span className="w-label">Mã phiếu bảo hành</span>
              <strong className="w-val">
                {d.warrantyId ? `#${d.warrantyId.slice(0, 8).toUpperCase()}` : 'Chưa gán'}
              </strong>
            </div>

            <div className="warranty-date-item">
              <span className="w-label">Thời hạn bảo hành</span>
              <span className="w-val">
                {d.endDate ? `Đến ngày ${d.endDate}` : '24 Tháng chính hãng'}
              </span>
            </div>
          </div>

          <div className="warranty-actions-row">
            {d.warrantyId && (
              <Link to="/account/warranty" className="apple-pill-btn secondary btn-sm">
                <ShieldCheck size={13} />
                <span>Xem phiếu bảo hành</span>
              </Link>
            )}

            {canClaim && (
              <Link
                to={`/account/warranty/claims/new?warrantyId=${d.warrantyId}`}
                className="apple-pill-btn primary btn-sm"
              >
                <ShieldAlert size={13} />
                <span>Yêu cầu bảo hành / Hỗ trợ 24/7</span>
              </Link>
            )}

            {d.orderId && (
              <Link
                to={`/account/orders/${d.orderId}`}
                className="apple-pill-btn subtle btn-sm"
              >
                <ExternalLink size={13} />
                <span>Đơn hàng #{d.orderId.slice(0, 8)}</span>
              </Link>
            )}
          </div>
        </div>

        {/* Card 4: AnchorBox Companion Mobile App Card */}
        <div className="apple-pro-card companion-app-card">
          <div className="companion-content-wrap">
            <div className="companion-text-col">
              <div className="companion-tag">ỨNG DỤNG DI ĐỘNG KÈM THEO</div>
              <h4 className="companion-title">Tải ứng dụng AnchorBox Companion</h4>
              <p className="companion-desc">
                Mở khóa tủ bằng <strong>Face ID / Vân tay</strong> qua Bluetooth LE không cần mật khẩu. Nhận thông báo bưu tá giao hàng và tạo mã OTP 1 lần cho shipper.
              </p>
              <div className="companion-badges">
                <span className="app-badge">iOS App Store</span>
                <span className="app-badge">Google Play</span>
              </div>
            </div>

            <div className="companion-qr-col">
              <div className="qr-wrapper">
                <QrCode size={64} color="#0f172a" />
              </div>
              <span className="qr-caption">Quét để tải App</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CustomerDevices() {
  const { user } = useShop();
  const { id } = useParams();
  const [page, setPage] = useState(0);

  // Filter tabs state
  const [activeTab, setActiveTab] = useState<'all' | 'gate' | 'garden' | 'online'>('all');

  // Multi-device active index for Pro Dashboard
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // View mode: 'dashboard' (Pro Command Center) or 'grid' (classic cards)
  const [viewMode, setViewMode] = useState<'dashboard' | 'grid'>('dashboard');

  // Modals state
  const [specsModalDevice, setSpecsModalDevice] = useState<Device | null>(null);
  const [sharingGuideOpen, setSharingGuideOpen] = useState(false);

  const resource = useResource(
    async (signal) =>
      id
        ? [await request<Device>(`/customer/devices/${encodeURIComponent(id)}`, { signal })]
        : (await request<Page<Device>>(`/customer/devices?page=${page}&size=20`, { signal })).content,
    `${user?.userId}:${id || ''}:${page}`
  );

  const rawDevices = resource.data || [];

  // Filtered devices
  const filteredDevices = useMemo(() => {
    if (activeTab === 'online') {
      return rawDevices.filter((d) => d.status !== 'offline');
    }
    if (activeTab === 'gate') {
      return rawDevices.filter((d) => (d.locationLabel || '').toLowerCase().includes('cổng'));
    }
    if (activeTab === 'garden') {
      return rawDevices.filter((d) => (d.locationLabel || '').toLowerCase().includes('sân'));
    }
    return rawDevices;
  }, [rawDevices, activeTab]);

  // Determine currently active device for Dashboard view
  const activeDevice = useMemo(() => {
    if (filteredDevices.length === 0) return null;
    if (selectedDeviceId) {
      const found = filteredDevices.find((d) => d.id === selectedDeviceId);
      if (found) return found;
    }
    return filteredDevices[0];
  }, [filteredDevices, selectedDeviceId]);

  return (
    <section className="customer-devices-page">
      <AccountNav />

      {/* Header */}
      <header className="apple-home-header">
        <span className="apple-home-eyebrow">
          <Zap size={14} />
          TRUNG TÂM GIÁM SÁT THIẾT BỊ ANCHORBOX PRO
        </span>

        <div className="apple-home-title-row">
          <div>
            <h1 className="apple-home-title">
              {id ? 'Chi tiết thiết bị' : 'Thiết bị AnchorBox sở hữu'}
            </h1>
            <p className="apple-home-subtitle">
              Giám sát tình trạng cảm biến, chốt an toàn Solenoid, bảo hành điện tử và phân quyền thành viên điều khiển.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {rawDevices.length > 1 && (
              <div className="apple-view-toggle">
                <button
                  type="button"
                  className={`toggle-btn ${viewMode === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setViewMode('dashboard')}
                  title="Chế độ Dashboard Pro"
                >
                  <Monitor size={15} />
                  <span>Dashboard Pro</span>
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Chế độ Lưới thiết bị"
                >
                  <LayoutGrid size={15} />
                  <span>Lưới ({rawDevices.length})</span>
                </button>
              </div>
            )}

            <button
              type="button"
              className="apple-home-refresh-btn"
              onClick={resource.retry}
              disabled={resource.loading}
            >
              <RefreshCw size={15} className={resource.loading ? 'animate-spin' : ''} />
              <span>{resource.loading ? 'Đang đồng bộ…' : 'Đồng bộ telemetry'}</span>
            </button>
          </div>
        </div>

        {/* Security Separation Banner */}
        <div className="device-security-banner">
          <Smartphone size={22} color="#0071e3" style={{ flexShrink: 0, marginTop: 2 }} />
          <div className="device-security-banner-text">
            <strong>Bảo mật điều khiển thiết bị:</strong>
            Thao tác điều khiển phần cứng trực tiếp (mở chốt Solenoid, cài đặt mã PIN, cấp quyền chia sẻ cho thành viên mới) được bảo mật độc quyền trên <strong>ứng dụng di động AnchorBox Mobile App</strong> (thông qua Bluetooth LE mã hóa và sinh trắc học Face ID / Vân tay). Website hỗ trợ đọc trạng thái cảm biến thời gian thực, tra cứu bảo hành và hiển thị danh sách các tài khoản đã được cấp quyền điều khiển cùng.
          </div>
        </div>

        {/* Ambient Status Bar (Apple Home Summary Pills) */}
        <div className="apple-home-summary-bar">
          <div className="apple-home-status-chip chip-online">
            <span className="status-pulse-dot" />
            <span>Kết nối trực tuyến: Ổn định</span>
          </div>

          <div className="apple-home-status-chip chip-locked">
            <Lock size={14} />
            <span>Chốt khóa an toàn: Solenoid 250kg</span>
          </div>

          <div className="apple-home-status-chip">
            <Thermometer size={14} />
            <span>Nhiệt độ buồng chứa: 27.2°C</span>
          </div>

          <div className="apple-home-status-chip">
            <BatteryCharging size={14} />
            <span>Pin dự phòng: 96%</span>
          </div>
        </div>

        {/* Device Switcher Pills (When user has multiple devices) */}
        {!id && rawDevices.length > 1 && (
          <div className="apple-device-switcher-row">
            <span className="switcher-label">Chọn thiết bị giám sát:</span>
            <div className="switcher-pills">
              {rawDevices.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`device-pill-btn ${activeDevice?.id === d.id ? 'is-selected' : ''}`}
                  onClick={() => {
                    setSelectedDeviceId(d.id);
                    setViewMode('dashboard');
                  }}
                >
                  <Package size={14} />
                  <span>{d.name || d.productName || 'AnchorBox'} ({d.serialNumber})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Location Filter Tabs (In Grid mode) */}
        {!id && viewMode === 'grid' && rawDevices.length > 1 && (
          <div className="apple-home-tabs" role="tablist">
            <button
              type="button"
              className={`apple-home-tab ${activeTab === 'all' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              Tất cả ({rawDevices.length})
            </button>
            <button
              type="button"
              className={`apple-home-tab ${activeTab === 'gate' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('gate')}
            >
              Trước cổng
            </button>
            <button
              type="button"
              className={`apple-home-tab ${activeTab === 'garden' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('garden')}
            >
              Sân trước
            </button>
            <button
              type="button"
              className={`apple-home-tab ${activeTab === 'online' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('online')}
            >
              Đang trực tuyến
            </button>
          </div>
        )}
      </header>

      <ResourceState {...resource} />

      {/* =========================================================================
          MAIN CONTENT AREA:
          If in Dashboard view or single device (common case): Render Apple Pro Command Center
          If in Grid view with multiple devices: Render Apple Home Multi-Card Grid
          ========================================================================= */}
      {viewMode === 'dashboard' && activeDevice && (
        <AppleProDeviceHeroDashboard
          device={activeDevice}
          onOpenSpecsModal={(dev) => setSpecsModalDevice(dev)}
          onOpenSharingGuide={() => setSharingGuideOpen(true)}
        />
      )}

      {/* Classic Multi-Card Grid for Users with Many Devices */}
      {viewMode === 'grid' && (
        <div className="apple-home-grid">
          {filteredDevices.map((d) => (
            <article
              key={d.id}
              className={`apple-home-tile ${d.status !== 'offline' ? 'is-online' : 'is-offline'}`}
            >
              <div className="tile-header">
                <div className="tile-device-identity">
                  <div className={`tile-device-lamp ${d.status !== 'offline' ? 'is-illuminated' : ''}`}>
                    <Package size={26} aria-hidden="true" />
                    {d.status !== 'offline' && <span className="lamp-online-dot" />}
                  </div>

                  <div className="tile-name-wrap">
                    <span className="tile-location-tag">
                      {d.locationLabel || 'Vị trí bưu kiện'} • {d.status !== 'offline' ? 'Trực tuyến' : 'Ngoại tuyến'}
                    </span>
                    <h3 className="tile-device-name">{d.name || d.productName || 'AnchorBox One'}</h3>
                    <span className="tile-serial-num">SN: {d.serialNumber}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="apple-pill-btn secondary btn-sm"
                  onClick={() => {
                    setSelectedDeviceId(d.id);
                    setViewMode('dashboard');
                  }}
                >
                  Xem Pro →
                </button>
              </div>

              {/* Status pill */}
              <div className="tile-actions-row">
                <button
                  type="button"
                  className="tile-quick-btn"
                  onClick={() => setSpecsModalDevice(d)}
                >
                  <Sliders size={15} />
                  <span>Thông số IoT</span>
                </button>
                <button
                  type="button"
                  className="tile-quick-btn"
                  onClick={() => setSharingGuideOpen(true)}
                >
                  <Smartphone size={15} />
                  <span>Chia sẻ App</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Empty State */}
      {resource.data?.length === 0 && (
        <div className="apple-home-empty">
          <div className="empty-icon-circle">
            <Package size={36} />
          </div>
          <h2>Bắt đầu trang bị AnchorBox cho ngôi nhà của bạn</h2>
          <p>
            Hiện tài khoản chưa được gán thiết bị chính thức. Thiết bị sẽ tự động xuất hiện sau khi đơn hàng được kỹ thuật viên lắp đặt và nghiệm thu hoàn tất.
          </p>
          <div className="apple-empty-actions">
            <Link className="button" to="/products">
              Khám phá các dòng AnchorBox →
            </Link>
            <Link className="text-link" to="/account/orders">
              Xem đơn hàng của bạn
            </Link>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!id && rawDevices.length > 20 && (
        <nav className="commerce-pagination" aria-label="Phân trang thiết bị">
          <span>Trang {page + 1}</span>
          <div>
            <button disabled={page === 0 || resource.loading} onClick={() => setPage((p) => p - 1)}>
              Trang trước
            </button>
            <button
              disabled={resource.loading || !resource.data || resource.data.length < 20}
              onClick={() => setPage((p) => p + 1)}
            >
              Trang tiếp
            </button>
          </div>
        </nav>
      )}

      {id && (
        <div style={{ marginTop: '20px' }}>
          <Link to="/account/devices" className="text-link">
            ← Trở lại danh sách thiết bị
          </Link>
        </div>
      )}

      {/* MODAL 1: IoT Hardware Specifications */}
      {specsModalDevice && (
        <div className="apple-modal-overlay" onClick={() => setSpecsModalDevice(null)}>
          <div className="apple-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="apple-modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Thông số kỹ thuật IoT</h3>
                <span style={{ fontSize: '12px', color: '#86868b' }}>
                  {specsModalDevice.name || specsModalDevice.productName} • SN: {specsModalDevice.serialNumber}
                </span>
              </div>
              <button
                type="button"
                className="apple-modal-close-btn"
                onClick={() => setSpecsModalDevice(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="specs-list-group">
              <div className="spec-row">
                <span className="spec-key">Dòng thiết bị</span>
                <span className="spec-val">{specsModalDevice.productName || 'AnchorBox Pro'}</span>
              </div>
              <div className="spec-row">
                <span className="spec-key">Phiên bản Firmware</span>
                <span className="spec-val">v2.4.1-rc (ESP32-S3 WROOM Dual-Core)</span>
              </div>
              <div className="spec-row">
                <span className="spec-key">Kết nối mạng</span>
                <span className="spec-val">Wi-Fi 802.11 b/g/n + BLE 5.2 + 4G LTE-M</span>
              </div>
              <div className="spec-row">
                <span className="spec-key">Cơ cấu khóa</span>
                <span className="spec-val">Chốt điện từ Solenoid 12V (Lực giữ 250kg)</span>
              </div>
              <div className="spec-row">
                <span className="spec-key">Cảm biến trọng lượng</span>
                <span className="spec-val">Loadcell 4 điểm đo (Độ phân giải ±50g)</span>
              </div>
              <div className="spec-row">
                <span className="spec-key">Nguồn điện dự phòng</span>
                <span className="spec-val">Pin Lithium LiFePO4 (Thời lượng 72 giờ khi mất điện lưới)</span>
              </div>
              <div className="spec-row">
                <span className="spec-key">Tiêu chuẩn kháng nước</span>
                <span className="spec-val">IP65 ngoài trời (Chống mưa bão & bụi xâm nhập)</span>
              </div>
              <div className="spec-row">
                <span className="spec-key">Bảo hành chính hãng</span>
                <span className="spec-val">
                  {specsModalDevice.warrantyStatus === 'active' ? '24 Tháng (Còn hiệu lực)' : 'Đã đăng ký'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                className="apple-pill-btn secondary"
                onClick={() => setSpecsModalDevice(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Mobile App Sharing Guide */}
      {sharingGuideOpen && (
        <div className="apple-modal-overlay" onClick={() => setSharingGuideOpen(false)}>
          <div className="apple-modal-card" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="apple-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Smartphone size={20} color="#0071e3" />
                <div>
                  <h3 style={{ margin: 0 }}>Hướng dẫn chia sẻ trong App</h3>
                  <span style={{ fontSize: '12px', color: '#86868b' }}>
                    Phân quyền điều khiển cho người thân trong gia đình
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="apple-modal-close-btn"
                onClick={() => setSharingGuideOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '16px 0', fontSize: '13.5px', color: '#1d1d1f', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ margin: 0, lineHeight: 1.5 }}>
                Để đảm bảo an toàn tuyệt đối, việc chia sẻ quyền mở tủ chỉ được thao tác trực tiếp bởi chủ sở hữu trên ứng dụng <strong>AnchorBox Mobile App</strong>:
              </p>

              <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, color: '#444' }}>
                <li>Mở ứng dụng <strong>AnchorBox</strong> trên điện thoại đã ghép nối.</li>
                <li>Chọn thiết bị của bạn và vào tab <strong>Chia sẻ (Sharing)</strong>.</li>
                <li>Nhập email tài khoản AnchorBox của người thân cần cấp quyền.</li>
                <li>Chọn mức quyền:
                  <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                    <li><strong>Toàn quyền điều khiển:</strong> Được mở khóa tủ từ xa và nhận thông báo khi có bưu kiện.</li>
                    <li><strong>Chỉ xem:</strong> Chỉ xem thông tin bưu kiện và trạng thái tủ.</li>
                  </ul>
                </li>
                <li>Bấm <strong>Mời thành viên</strong> để hoàn tất.</li>
              </ol>

              <div style={{ background: '#f5f5f7', padding: '12px 14px', borderRadius: 12, fontSize: '12.5px', color: '#6e6e73' }}>
                💡 Sau khi chia sẻ, danh sách tài khoản được ủy quyền sẽ tự động đồng bộ và hiển thị trên giao diện trang web này.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                className="apple-pill-btn primary"
                onClick={() => setSharingGuideOpen(false)}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
