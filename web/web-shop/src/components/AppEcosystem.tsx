import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Lock,
  Unlock,
  KeyRound,
  Scale,
  BellRing,
  Wifi,
  BatteryCharging,
  Users,
  CheckCircle2,
  ArrowRight,
  Package
} from 'lucide-react';
import './app-ecosystem.css';

export function AppEcosystem() {
  const [activeTab, setActiveTab] = useState<'unlock' | 'sensor' | 'history'>('unlock');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('842 195');

  const handleToggleLock = () => {
    setIsUnlocked(prev => !prev);
  };

  const handleGenerateNewOtp = () => {
    const randomCode = Math.floor(100000 + Math.random() * 900000);
    const formatted = `${String(randomCode).slice(0, 3)} ${String(randomCode).slice(3)}`;
    setGeneratedOtp(formatted);
  };

  return (
    <section className="container section app-ecosystem-section" id="mobile-app">
      <div className="store-section-head">
        <div>
          <p className="eyebrow">ỨNG DỤNG ĐIỀU KHIỂN TRÊN SMARTPHONE</p>
          <h2>Hộp nhận hàng tại nhà.<br/>Kiểm soát toàn diện trong lòng bàn tay.</h2>
          <p className="lead">
            Đặt mua hộp trên website, sau khi kỹ thuật viên lắp đặt xong, bạn kết nối ngay với <strong>Ứng dụng di động AnchorBox</strong> trên smartphone để mở khóa từ xa, tạo mã OTP cho shipper và nhận thông báo bưu kiện 24/7.
          </p>
        </div>
        <Link className="text-link" to="/app">
          Tìm hiểu chuyên sâu về App <ArrowRight size={18} />
        </Link>
      </div>

      <div className="app-ecosystem-grid">
        {/* CỘT TRÁI: DANH SÁCH TÍNH NĂNG NỔI BẬT */}
        <div className="app-features-col">
          <div className="app-feature-card">
            <div className="app-feature-icon">
              <KeyRound size={24} />
            </div>
            <div>
              <h3>Mở khóa từ xa & Tạo OTP 1 lần cho Shipper</h3>
              <p>
                Dù bạn đang ở cơ quan hay đi du lịch, chỉ cần 1 chạm trên app để mở tủ cho shipper, hoặc cấp mã số PIN một lần (hiệu lực 15 phút) để shipper tự thao tác trên bàn phím số của hộp.
              </p>
            </div>
          </div>

          <div className="app-feature-card">
            <div className="app-feature-icon">
              <Scale size={24} />
            </div>
            <div>
              <h3>Cảm biến trọng lượng & Báo nhận hàng tức thì</h3>
              <p>
                Cảm biến loadcell bên trong đáy hộp tự động phát hiện và đo chính xác khối lượng bưu kiện, gửi ngay thông báo đẩy (Push Notification) đến điện thoại: <em>"Đã nhận kiện hàng 1.25kg an toàn"</em>.
              </p>
            </div>
          </div>

          <div className="app-feature-card">
            <div className="app-feature-icon">
              <BellRing size={24} />
            </div>
            <div>
              <h3>Giám sát trạng thái & Cảnh báo an ninh 24/7</h3>
              <p>
                Theo dõi tình trạng đóng/mở cửa, % dung lượng pin dự phòng, trạng thái kết nối WiFi/4G và lịch sử ra vào bưu kiện theo từng giây.
              </p>
            </div>
          </div>

          <div className="app-feature-card">
            <div className="app-feature-icon">
              <Users size={24} />
            </div>
            <div>
              <h3>Chia sẻ quyền quản lý cho cả gia đình</h3>
              <p>
                Dễ dàng cấp quyền mở hộp cho bố mẹ, vợ chồng hoặc con cái thông qua số điện thoại, cùng quản lý các bưu kiện gửi về nhà.
              </p>
            </div>
          </div>

          <div className="app-badges-row">
            <div className="app-badge-box">
              <span className="badge-subtitle">TẢI TRÊN</span>
              <span className="badge-title">App Store (iOS)</span>
            </div>
            <div className="app-badge-box">
              <span className="badge-subtitle">TẢI TRÊN</span>
              <span className="badge-title">Google Play (Android)</span>
            </div>
            <span className="app-badge-note">
              <CheckCircle2 size={16} /> Đồng bộ tự động sau khi nghiệm thu lắp đặt
            </span>
          </div>
        </div>

        {/* CỘT PHẢI: MÔ PHỎNG MÀN HÌNH ĐIỆN THOẠI TƯƠNG TÁC */}
        <div className="app-mockup-wrapper">
          <div className="phone-device-mockup">
            <div className="phone-notch">
              <div className="phone-speaker" />
              <div className="phone-lens" />
            </div>

            <div className="phone-header-bar">
              <span>9:41</span>
              <div className="phone-status-icons">
                <Wifi size={13} />
                <BatteryCharging size={13} />
              </div>
            </div>

            <div className="phone-app-topbar">
              <div className="phone-app-brand">
                <span className="phone-app-logo">A</span>
                <strong>AnchorBox App</strong>
              </div>
              <span className="phone-status-pill">
                <span className="status-dot" /> Online
              </span>
            </div>

            {/* TAB CHUYỂN ĐỔI GIAO DIỆN TRONG PHONE */}
            <div className="phone-tabs-bar">
              <button
                type="button"
                className={activeTab === 'unlock' ? 'active' : ''}
                onClick={() => setActiveTab('unlock')}
              >
                Mở khóa & OTP
              </button>
              <button
                type="button"
                className={activeTab === 'sensor' ? 'active' : ''}
                onClick={() => setActiveTab('sensor')}
              >
                Cảm biến bưu kiện
              </button>
              <button
                type="button"
                className={activeTab === 'history' ? 'active' : ''}
                onClick={() => setActiveTab('history')}
              >
                Nhật ký
              </button>
            </div>

            {/* MÀN HÌNH NỘI DUNG ỨNG DỤNG */}
            <div className="phone-screen-content">
              {activeTab === 'unlock' && (
                <div className="screen-tab-panel animate-fade">
                  <div className="box-status-card">
                    <small>HỘP NHẬN HÀNG CỔNG CHÍNH</small>
                    <h4>SmartBox Pro (150L)</h4>
                    <div className="lock-control-circle">
                      <div className={`lock-ring ${isUnlocked ? 'unlocked' : 'locked'}`}>
                        {isUnlocked ? <Unlock size={38} /> : <Lock size={38} />}
                      </div>
                      <span className="lock-state-text">
                        {isUnlocked ? 'Đang MỞ KHÓA' : 'Đang KHÓA AN TOÀN'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`btn-interactive-unlock ${isUnlocked ? 'btn-lock' : 'btn-unlock'}`}
                      onClick={handleToggleLock}
                    >
                      {isUnlocked ? 'Bấm để Khóa hộp lại' : 'Chạm để Mở khóa từ xa'}
                    </button>
                  </div>

                  <div className="otp-generator-card">
                    <div className="otp-card-head">
                      <span>MÃ OTP 1 LẦN CHO SHIPPER</span>
                      <button type="button" onClick={handleGenerateNewOtp} className="btn-refresh-otp">
                        Đổi mã
                      </button>
                    </div>
                    <div className="otp-code-display">{generatedOtp}</div>
                    <small>Hiệu lực trong 15 phút. Shipper bấm mã này trên bàn phím để mở tủ.</small>
                  </div>
                </div>
              )}

              {activeTab === 'sensor' && (
                <div className="screen-tab-panel animate-fade">
                  <div className="sensor-highlight-box">
                    <div className="sensor-icon-bubble">
                      <Scale size={28} />
                    </div>
                    <span className="sensor-label">TRỌNG LƯỢNG TRONG HỘP</span>
                    <strong className="sensor-big-metric">1.25 <span className="unit">kg</span></strong>
                    <div className="sensor-badge-detected">
                      <Package size={14} /> Có bưu kiện trong tủ
                    </div>
                  </div>

                  <div className="sensor-metrics-grid">
                    <div className="metric-tile">
                      <small>Trạng thái cửa</small>
                      <strong>Đóng kín</strong>
                      <span>Cảm biến từ trường</span>
                    </div>
                    <div className="metric-tile">
                      <small>Khoảng cách bưu kiện</small>
                      <strong>8.4 cm</strong>
                      <span>Cảm biến siêu âm</span>
                    </div>
                    <div className="metric-tile">
                      <small>Mức pin dự phòng</small>
                      <strong className="text-emerald">95%</strong>
                      <span>Hoạt động 35 ngày</span>
                    </div>
                    <div className="metric-tile">
                      <small>Nhiệt độ bên trong</small>
                      <strong>26.5 °C</strong>
                      <span>Thông thoáng, khô ráo</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="screen-tab-panel animate-fade">
                  <div className="history-list">
                    <div className="history-item">
                      <div className="history-dot green" />
                      <div>
                        <strong>Đã nhận hàng thành công</strong>
                        <p>Shipper GHN đã mở tủ bằng mã OTP 1 lần. Kiện hàng 1.25kg.</p>
                        <small>Hôm nay, 10:15 AM</small>
                      </div>
                    </div>
                    <div className="history-item">
                      <div className="history-dot blue" />
                      <div>
                        <strong>Mở khóa từ xa thành công</strong>
                        <p>Chủ nhà mở khóa qua AnchorBox App cho shipper Viettel Post.</p>
                        <small>Hôm qua, 15:40 PM</small>
                      </div>
                    </div>
                    <div className="history-item">
                      <div className="history-dot amber" />
                      <div>
                        <strong>Lấy hàng ra khỏi tủ</strong>
                        <p>Cửa mở và kiện hàng đã được chủ nhà lấy vào nhà.</p>
                        <small>18/10/2026, 18:20 PM</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="phone-bottom-notch" />
          </div>
        </div>
      </div>
    </section>
  );
}
