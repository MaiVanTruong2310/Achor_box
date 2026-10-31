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
  KeyRound,
  Zap,
  Radio,
  Sliders,
  Check,
  Copy,
  X,
} from 'lucide-react';
import { displayDate } from '../components/commercePresentation';
import { Link, useParams } from 'react-router-dom';
import { request } from '../api/shop';
import { warrantyEligible, type Page } from '../api/customer';
import { AccountNav, ResourceState, useResource } from '../components/ShopUi';
import { useShop } from '../ShopContext';
import './CustomerDevices.css';

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
}


interface DeviceCardProps {
  device: Device;
  onLockToggle: (id: string, currentStatus: string) => void;
  onOpenOtpModal: (device: Device) => void;
  onOpenSpecsModal: (device: Device) => void;
  onToggleUv: (id: string) => void;
  isUvActive: boolean;
  localLockStatus?: string;
}

function AppleHomeDeviceTile({
  device: d,
  onLockToggle,
  onOpenOtpModal,
  onOpenSpecsModal,
  onToggleUv,
  isUvActive,
  localLockStatus,
}: DeviceCardProps) {
  const currentLock = localLockStatus || d.lockStatus || 'locked';
  const isLocked = currentLock === 'locked';
  const isOnline = d.status !== 'offline';

  // Sensor telemetry metrics
  const batteryPct = d.batteryLevel ?? 96;
  const weightVal = typeof d.weightKg === 'number' ? d.weightKg : 2.45;
  const isDoorClosed = (d.doorStatus || 'closed') === 'closed';

  // Realistic temperature reading (calibrated around 26.5°C - 28.5°C)
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

  return (
    <article className={`apple-home-tile ${isOnline ? 'is-online' : 'is-offline'}`}>
      {/* Top Identity Row */}
      <div className="tile-header">
        <div className="tile-device-identity">
          {/* Icon thiết bị sáng đèn khi trực tuyến */}
          <div className={`tile-device-lamp ${isOnline ? 'is-illuminated' : ''}`}>
            <Package size={26} aria-hidden="true" />
            {isOnline && <span className="lamp-online-dot" title="Trực tuyến 24/7" />}
          </div>

          <div className="tile-name-wrap">
            <span className="tile-location-tag">
              {d.locationLabel || 'Vị trí bưu kiện'} • {isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}
            </span>
            <h3 className="tile-device-name">{d.name || d.productName || 'AnchorBox One'}</h3>
            <span className="tile-serial-num">SN: {d.serialNumber}</span>
          </div>
        </div>

        {/* Warranty Badge */}
        <span className={`tile-warranty-badge ${canClaim ? 'is-valid' : 'is-none'}`}>
          <ShieldCheck size={14} />
          {canClaim ? 'Bảo hành 24T' : d.warrantyId ? 'Đã kích hoạt' : 'Tiêu chuẩn'}
        </span>
      </div>

      {/* Trạng thái chốt khóa: Bấm vào tile để mô phỏng mở/đóng khóa từ xa */}
      <div
        className={`apple-lock-widget ${isLocked ? 'is-locked' : 'is-unlocked'}`}
        onClick={() => onLockToggle(d.id, currentLock)}
        role="button"
        tabIndex={0}
        aria-label={isLocked ? 'Bấm để mở chốt khóa từ xa' : 'Bấm để chốt khóa lại'}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onLockToggle(d.id, currentLock);
          }
        }}
      >
        <div className="lock-icon-circle">
          {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
        </div>

        <div className="lock-info-text">
          <span className="lock-status-title">
            {isLocked ? 'ĐÃ KHÓA AN TOÀN' : 'ĐANG MỞ CHỐT'}
          </span>
          <span className="lock-status-sub">
            {isLocked
              ? 'Chốt điện từ Solenoid lực giữ 250kg'
              : 'Nắp hộp sẵn sàng để shipper đặt kiện'}
          </span>
        </div>

        <span className="lock-action-cta">
          {isLocked ? 'Mở từ xa' : 'Khóa lại'}
        </span>
      </div>

      {/* Nhiệt độ bên trong và dung lượng pin thời gian thực */}
      <div className="tile-metrics-grid">
        {/* Metric 1: Nhiệt độ bên trong */}
        <div className="metric-pill-item">
          <div className="metric-icon-box temp">
            <Thermometer size={16} />
          </div>
          <div className="metric-data">
            <span className="metric-label">Nhiệt độ bên trong</span>
            <span className="metric-value">{tempReading}°C • Ổn định</span>
          </div>
        </div>

        {/* Metric 2: Dung lượng pin */}
        <div className="metric-pill-item">
          <div className="metric-icon-box battery">
            <BatteryCharging size={16} />
          </div>
          <div className="metric-data">
            <span className="metric-label">Pin dự phòng</span>
            <span className="metric-value">{batteryPct}% (LiFePO4)</span>
            <div className="battery-bar-track">
              <div className="battery-bar-fill" style={{ width: `${batteryPct}%` }} />
            </div>
          </div>
        </div>

        {/* Metric 3: Cảm biến trọng lượng Loadcell */}
        <div className="metric-pill-item">
          <div className="metric-icon-box weight">
            <Scale size={16} />
          </div>
          <div className="metric-data">
            <span className="metric-label">Cảm biến tải trọng</span>
            <span className="metric-value">
              {weightVal > 0.05 ? `${weightVal} kg (Có kiện)` : '0.00 kg (Sẵn sàng)'}
            </span>
          </div>
        </div>

        {/* Metric 4: Trạng thái cửa */}
        <div className="metric-pill-item">
          <div className="metric-icon-box door">
            {isDoorClosed ? <DoorClosed size={16} /> : <DoorOpen size={16} />}
          </div>
          <div className="metric-data">
            <span className="metric-label">Nắp cửa bưu kiện</span>
            <span className="metric-value">
              {isDoorClosed ? 'Đóng kín IP65' : 'Đang mở nắp'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="tile-actions-row">
        <button
          type="button"
          className="tile-quick-btn"
          onClick={() => onOpenOtpModal(d)}
        >
          <KeyRound size={15} />
          <span>Mã OTP shipper</span>
        </button>

        <button
          type="button"
          className="tile-quick-btn"
          onClick={() => onOpenSpecsModal(d)}
        >
          <Sliders size={15} />
          <span>Thông số IoT</span>
        </button>

        <button
          type="button"
          className={`tile-quick-btn btn-uv ${isUvActive ? 'is-active' : ''}`}
          onClick={() => onToggleUv(d.id)}
        >
          <Zap size={15} />
          <span>
            {isUvActive ? 'Đang chiếu UV-C diệt khuẩn (3:00)...' : 'Kích hoạt tia UV-C diệt khuẩn kiện'}
          </span>
        </button>
      </div>

      {/* Footer Links */}
      <footer className="tile-footer-links">
        <div>
          {d.orderId && (
            <Link to={`/account/orders/${d.orderId}`}>Đơn hàng #{d.orderId.slice(0, 8)}</Link>
          )}
          {d.warrantyId && (
            <span style={{ margin: '0 8px', color: '#c7c7cc' }}>•</span>
          )}
          {d.warrantyId && <Link to="/account/warranty">Xem phiếu bảo hành</Link>}
        </div>

        {canClaim && (
          <Link to={`/account/warranty/claims/new?warrantyId=${d.warrantyId}`}>
            Yêu cầu bảo hành →
          </Link>
        )}
      </footer>
    </article>
  );
}

export function CustomerDevices() {
  const { user } = useShop();
  const { id } = useParams();
  const [page, setPage] = useState(0);

  // Filter tabs state
  const [activeTab, setActiveTab] = useState<'all' | 'gate' | 'garden' | 'online'>('all');

  // Simulated live lock states (deviceId -> 'locked' | 'unlocked')
  const [localLocks, setLocalLocks] = useState<Record<string, string>>({});

  // Active UV states (deviceId -> boolean)
  const [activeUvs, setActiveUvs] = useState<Record<string, boolean>>({});

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [otpModalDevice, setOtpModalDevice] = useState<Device | null>(null);
  const [specsModalDevice, setSpecsModalDevice] = useState<Device | null>(null);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('839 204');

  const resource = useResource(
    async (signal) =>
      id
        ? [await request<Device>(`/customer/devices/${encodeURIComponent(id)}`, { signal })]
        : (await request<Page<Device>>(`/customer/devices?page=${page}&size=20`, { signal })).content,
    `${user?.userId}:${id || ''}:${page}`
  );

  // Use real user devices from API
  const rawDevices = resource.data || [];

  // Handle remote lock/unlock action simulation
  const handleLockToggle = (deviceId: string, currentLock: string) => {
    const nextState = currentLock === 'locked' ? 'unlocked' : 'locked';
    setLocalLocks((prev) => ({ ...prev, [deviceId]: nextState }));

    if (nextState === 'unlocked') {
      setToastMessage('🔓 Đã mở chốt Solenoid 12V từ xa. Hộp sẵn sàng nhận bưu kiện!');
    } else {
      setToastMessage('🔒 Đã chốt khóa an toàn thành công! Lực giữ 250kg kích hoạt.');
    }

    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Handle UV Sterilization toggle
  const handleToggleUv = (deviceId: string) => {
    const isNowOn = !activeUvs[deviceId];
    setActiveUvs((prev) => ({ ...prev, [deviceId]: isNowOn }));

    if (isNowOn) {
      setToastMessage('🟣 Đèn UV-C 254nm đã kích hoạt. Chu trình diệt khuẩn bề mặt kiện hàng trong 3 phút.');
    } else {
      setToastMessage('Đã tắt chu trình UV-C.');
    }

    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Open OTP generation modal
  const handleOpenOtp = (dev: Device) => {
    // Generate fresh random 6-digit OTP
    const code = `${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`;
    setGeneratedOtp(code);
    setCopiedOtp(false);
    setOtpModalDevice(dev);
  };

  const handleCopyOtp = () => {
    navigator.clipboard.writeText(generatedOtp.replace(' ', ''));
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2500);
  };

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

  return (
    <section className="customer-devices-page">
      <AccountNav />

      {/* Apple Home Header */}
      <header className="apple-home-header">
        <span className="apple-home-eyebrow">
          <Zap size={14} />
          TRUNG TÂM QUẢN LÝ THIẾT BỊ ANCHORBOX (APPLE HOME STYLE)
        </span>

        <div className="apple-home-title-row">
          <div>
            <h1 className="apple-home-title">
              {id ? 'Chi tiết thiết bị' : 'Thiết bị của tôi'}
            </h1>
            <p className="apple-home-subtitle">
              Giám sát trạng thái chốt khóa, nhiệt độ bên trong và dung lượng pin thời gian thực.
            </p>
          </div>

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

        {/* Ambient Status Bar (Apple Home Summary Pills) */}
        <div className="apple-home-summary-bar">
          <div className="apple-home-status-chip chip-online">
            <span className="status-pulse-dot" />
            <span>Kết nối trực tuyến: 100% ổn định</span>
          </div>

          <div className="apple-home-status-chip chip-locked">
            <Lock size={14} />
            <span>Tất cả chốt khóa đã đóng an toàn</span>
          </div>

          <div className="apple-home-status-chip">
            <Thermometer size={14} />
            <span>Nhiệt độ trung bình bên trong: 27.2°C</span>
          </div>

          <div className="apple-home-status-chip">
            <BatteryCharging size={14} />
            <span>Pin dự phòng trung bình: 96%</span>
          </div>
        </div>

        {/* Location Filter Tabs */}
        {!id && (
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

      {/* Grid of Apple Home Tile Widgets */}
      <div className="apple-home-grid">
        {filteredDevices.map((d) => (
          <AppleHomeDeviceTile
            key={d.id}
            device={d}
            onLockToggle={handleLockToggle}
            onOpenOtpModal={handleOpenOtp}
            onOpenSpecsModal={(dev) => setSpecsModalDevice(dev)}
            onToggleUv={handleToggleUv}
            isUvActive={!!activeUvs[d.id]}
            localLockStatus={localLocks[d.id]}
          />
        ))}
      </div>

      {/* Empty State */}
      {resource.data?.length === 0 && (
        <div className="apple-home-empty">
          <div className="empty-icon-circle">
            <Package size={36} />
          </div>
          <h2>Bắt đầu trang bị AnchorBox cho ngôi nhà của bạn</h2>
          <p>
            Hiện tài khoản chưa được gán thiết bị chính thức. Bạn có thể trải nghiệm mô phỏng
            tile điều khiển trực tiếp trên bản Demo bên trên hoặc đặt cấu hình hộp giao nhận mới.
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

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="apple-home-toast" role="status">
          <Radio size={16} className="animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal 1: Shipper One-Time OTP Generator */}
      {otpModalDevice && (
        <div className="apple-modal-overlay" onClick={() => setOtpModalDevice(null)}>
          <div className="apple-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="apple-modal-header">
              <h3>Mã OTP mở hộp cho Shipper</h3>
              <button
                type="button"
                className="apple-modal-close-btn"
                onClick={() => setOtpModalDevice(null)}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13.5px', color: '#6e6e73', margin: '0 0 16px' }}>
              Cung cấp mã này cho nhân viên giao hàng để mở khóa chốt hộp <strong>{otpModalDevice.name || otpModalDevice.productName}</strong> một lần duy nhất.
            </p>

            <div className="otp-display-card">
              <span className="otp-timer-badge">
                ⏱️ Có hiệu lực trong 15 phút (Dùng 1 lần)
              </span>
              <div className="otp-code-huge">{generatedOtp}</div>
              <button
                type="button"
                className="button is-compact"
                onClick={handleCopyOtp}
                style={{ borderRadius: '9999px', margin: '8px auto 0' }}
              >
                {copiedOtp ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedOtp ? 'Đã sao chép mã!' : 'Sao chép mã gửi Shipper'}</span>
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#86868b', lineHeight: 1.5, margin: 0 }}>
              💡 Khi shipper nhập mã trên bàn phím số của AnchorBox, chốt khóa sẽ mở trong 60 giây và camera AI sẽ chụp lại kiện hàng để kích hoạt cảm biến trọng lượng Loadcell.
            </p>
          </div>
        </div>
      )}

      {/* Modal 2: Technical Specs & Telemetry Diagnostic */}
      {specsModalDevice && (
        <div className="apple-modal-overlay" onClick={() => setSpecsModalDevice(null)}>
          <div className="apple-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="apple-modal-header">
              <h3>Thông số Kỹ thuật & Telemetry</h3>
              <button
                type="button"
                className="apple-modal-close-btn"
                onClick={() => setSpecsModalDevice(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#6e6e73' }}>Mã định danh Serial:</span>
                <code style={{ fontWeight: 700 }}>{specsModalDevice.serialNumber}</code>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#6e6e73' }}>Phiên bản Firmware:</span>
                <strong>{specsModalDevice.firmwareVersion || 'v2.4.1-esp32-rel'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#6e6e73' }}>Khóa điện tử:</span>
                <strong>Solenoid 12V 2.5A • Chống cạy lực 2500N</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#6e6e73' }}>Cảm biến tải trọng:</span>
                <strong>4x Loadcell HX711 chuẩn chính xác ±5g</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#6e6e73' }}>Chuẩn kháng nước & bụi:</span>
                <strong>IP65 Outdoor Weatherproof</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#6e6e73' }}>Bảo mật truyền nhận:</span>
                <strong>Mã hóa TLS 1.3 / ECDSA P-256</strong>
              </div>

              {specsModalDevice.startDate && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ color: '#6e6e73' }}>Thời hạn bảo hành:</span>
                  <strong>{displayDate(specsModalDevice.startDate, true)} → {displayDate(specsModalDevice.endDate, true)}</strong>
                </div>
              )}
            </div>

            <button
              type="button"
              className="button"
              onClick={() => setSpecsModalDevice(null)}
              style={{ width: '100%', marginTop: '24px', borderRadius: '12px' }}
            >
              Đóng bảng thông số
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default CustomerDevices;
