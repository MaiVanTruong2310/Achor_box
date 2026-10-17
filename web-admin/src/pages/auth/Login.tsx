import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Moon,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Radio,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getRoleDefaultPath } from '../../types/database';
import { clearAllAuthTokens } from '../../services/supabase';
import './login.css';

const accountRoles = [
  'Quản trị viên (Super Admin)',
  'Quản lý sản phẩm & Kho (PO)',
  'Kỹ thuật viên (Technician)',
];

export const Login: React.FC = () => {
  const { login, error: authError, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [forgotNotice, setForgotNotice] = useState(false);

  const isExpired = searchParams.get('expired') === 'true' || (location.state as { expired?: boolean } | null)?.expired === true;

  useEffect(() => {
    if (isExpired) void clearAllAuthTokens();
  }, [isExpired]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setLocalError(null);
    setForgotNotice(false);

    if (!email.trim() || !password) {
      setLocalError('Vui lòng nhập đầy đủ email và mật khẩu của bạn.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        navigate(result.role ? getRoleDefaultPath(result.role) : '/403', { replace: true });
      } else {
        setLocalError(result.error || 'Email hoặc mật khẩu không chính xác. Vui lòng thử lại.');
      }
    } catch {
      setLocalError('Chưa thể kết nối tới máy chủ. Vui lòng kiểm tra mạng và thử lại sau ít phút.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setForgotNotice(true);
  };

  const displayError = localError || authError;
  const busy = submitting;

  return (
    <div className={`sb-auth-root sb-theme-${theme}`}>
      {/* ===================== CỘT BÊN TRÁI: THƯƠNG HIỆU & GIỚI THIỆU ===================== */}
      <section className="sb-brand-col" aria-label="Giới thiệu SmartBox">
        <div className="sb-brand-glow-orb sb-glow-1" aria-hidden="true" />
        <div className="sb-brand-glow-orb sb-glow-2" aria-hidden="true" />
        <div className="sb-brand-grid-pattern" aria-hidden="true" />

        <div className="sb-brand-inner">
          {/* Logo & Pill Badge */}
          <div className="sb-brand-top">
            <Link to="/" className="sb-brand-logo" aria-label="SmartBox Trang chủ">
              <svg
                className="sb-cube-icon"
                width="34"
                height="34"
                viewBox="0 0 36 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="cubeTop" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#0284C7" />
                  </linearGradient>
                  <linearGradient id="cubeLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1E40AF" />
                    <stop offset="100%" stopColor="#0F172A" />
                  </linearGradient>
                  <linearGradient id="cubeRight" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2563EB" />
                    <stop offset="100%" stopColor="#1E3A8A" />
                  </linearGradient>
                </defs>
                <path d="M18 3L32 10.5L18 18L4 10.5L18 3Z" fill="url(#cubeTop)" />
                <path d="M4 10.5L18 18V33L4 25.5V10.5Z" fill="url(#cubeLeft)" />
                <path d="M18 18L32 10.5V25.5L18 33V18Z" fill="url(#cubeRight)" />
                <circle cx="18" cy="18" r="3" fill="#FFFFFF" fillOpacity="0.9" />
              </svg>
              <span className="sb-logo-text">
                Smart<span>Box</span>
              </span>
              <span className="sb-logo-reg">®</span>
            </Link>

            <div className="sb-account-pill">
              <span className="sb-pulse-dot" aria-hidden="true" />
              <span>TÀI KHOẢN SMARTBOX</span>
            </div>
          </div>

          {/* Tiêu đề & Giới thiệu */}
          <div className="sb-brand-hero">
            <h1 className="sb-hero-heading">
              Một kết nối.
              <br />
              <span className="sb-highlight-gradient">Cho mọi vai trò.</span>
            </h1>
            <p className="sb-hero-description">
              Dù bạn sử dụng SmartBox tại nhà hay đồng hành cùng đội ngũ, mọi trải nghiệm đều bắt đầu từ tài khoản của bạn.
            </p>
          </div>

          {/* Widget trực quan SmartBox Status Card & Floating Badge */}
          <div className="sb-brand-widget-area">
            <div className="sb-iot-card">
              <div className="sb-iot-card-header">
                <div className="sb-iot-device-meta">
                  <div className="sb-iot-cube-tag">
                    <Radio size={16} className="sb-text-cyan" />
                  </div>
                  <div>
                    <div className="sb-iot-device-title">Smart Delivery Box</div>
                    <div className="sb-iot-device-serial">Model Safe-X85 • Serial #SBX-2026-HN</div>
                  </div>
                </div>
                <div className="sb-iot-online-pill">
                  <span className="sb-live-indicator" />
                  <span>SẴN SÀNG</span>
                </div>
              </div>

              <div className="sb-iot-telemetry-grid">
                <div className="sb-telemetry-cell">
                  <span className="sb-tel-label">Khóa điện tử</span>
                  <div className="sb-tel-val sb-tel-safe">
                    <LockKeyhole size={14} />
                    <span>Đã khóa an toàn</span>
                  </div>
                </div>
                <div className="sb-telemetry-cell">
                  <span className="sb-tel-label">Cảm biến tải trọng</span>
                  <div className="sb-tel-val">
                    <span>0.00 kg</span>
                    <span className="sb-tel-unit">(Trống)</span>
                  </div>
                </div>
                <div className="sb-telemetry-cell">
                  <span className="sb-tel-label">Bảo mật hệ thống</span>
                  <div className="sb-tel-val sb-text-cyan">
                    <span>SSL / TLS 1.3</span>
                  </div>
                </div>
              </div>

              <div className="sb-iot-card-footer">
                <div className="sb-otp-row">
                  <span className="sb-otp-label">Mã mở nhận hàng:</span>
                  <span className="sb-otp-code">8 4 9 2</span>
                </div>
                <div className="sb-iot-ping">Trạng thái: Hoạt động</div>
              </div>
            </div>

            {/* Floating Badge */}
            <div className="sb-floating-badge">
              <div className="sb-floating-icon-wrap">
                <ShieldCheck size={22} className="sb-floating-icon" />
              </div>
              <div className="sb-floating-text">
                <div className="sb-floating-line1">Nhận hàng an tâm.</div>
                <div className="sb-floating-line2">Kết nối mỗi ngày.</div>
              </div>
            </div>
          </div>

          {/* Danh sách 6 vai trò */}
          <div className="sb-roles-wrapper">
            <div className="sb-roles-title">DÀNH CHO BẠN VÀ ĐỘI NGŨ SMARTBOX</div>
            <div className="sb-roles-grid">
              {accountRoles.map(role => (
                <div key={role} className="sb-role-tag">
                  <span className="sb-role-check">
                    <Check size={12} strokeWidth={2.5} />
                  </span>
                  <span>{role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== CỘT BÊN PHẢI: FORM ĐĂNG NHẬP ===================== */}
      <section className="sb-form-col" aria-label="Khu vực đăng nhập">
        {/* Lớp nền ambient & lưới kết nối không gian giữa 2 cột */}
        <div className="sb-form-glow-orb" aria-hidden="true" />
        <div className="sb-form-grid-pattern" aria-hidden="true" />

        {/* Nút điều hướng "← Về trang chủ" & Theme Toggle ở góc trên cùng bên phải */}
        <div className="sb-form-top-actions">
          <Link to="/" className="sb-nav-back-link" aria-label="Quay về trang chủ SmartBox">
            <ArrowLeft size={16} />
            <span>Về trang chủ</span>
          </Link>
          <button
            className="sb-theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>

        {/* Card Đăng nhập chính */}
        <div className="sb-login-card-container">
          <div className="sb-login-card" role="region" aria-labelledby="login-heading">
            {/* Dải gradient định vị thương hiệu tinh tế ở đỉnh Card */}
            <div className="sb-card-top-accent" aria-hidden="true" />

            {/* Phần đầu Card */}
            <div className="sb-card-header">
              <div className="sb-lock-badge" aria-hidden="true">
                <LockKeyhole size={22} strokeWidth={2} />
              </div>
              <div className="sb-welcome-badge">
                <span className="sb-welcome-dot" aria-hidden="true" />
                <span>CHÀO MỪNG BẠN TRỞ LẠI</span>
              </div>
              <h2 id="login-heading" className="sb-login-title">
                Đăng nhập Quản Trị
              </h2>
              <p className="sb-login-subtitle">Cổng quản trị Retail OS dành riêng cho cán bộ nhân viên.</p>
            </div>

            {/* Thông báo phiên hết hạn */}
            {isExpired && (
              <div className="sb-status-banner sb-banner-warning" role="status">
                <Clock size={18} className="sb-banner-icon" />
                <p>Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục làm việc.</p>
              </div>
            )}

            {/* Thông báo lỗi */}
            {displayError && (
              <div className="sb-status-banner sb-banner-error" id="login-error" role="alert">
                <ShieldAlert size={18} className="sb-banner-icon" />
                <p>{displayError}</p>
              </div>
            )}

            {/* Thông báo Quên mật khẩu */}
            {forgotNotice && (
              <div className="sb-status-banner sb-banner-info" role="status">
                <Sparkles size={18} className="sb-banner-icon" />
                <p>
                  Để bảo mật tài khoản doanh nghiệp, vui lòng liên hệ <strong>Quản trị viên</strong> hoặc hotline{' '}
                  <a href="tel:19006868" style={{ color: 'inherit', fontWeight: 600 }}>1900 6868</a> để được cấp lại mật khẩu.
                </p>
              </div>
            )}

            {/* Form Đăng nhập */}
            <form onSubmit={handleSubmit} className="sb-form" aria-busy={busy} noValidate>
              {/* Trường Email / Username */}
              <div className="sb-form-field">
                <label htmlFor="email" className="sb-field-label">
                  Email hoặc Tên đăng nhập
                </label>
                <div className="sb-field-control">
                  <span className="sb-field-icon" aria-hidden="true">
                    <Mail size={18} />
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="text"
                    autoComplete="username"
                    placeholder="admin@smartbox.vn hoặc username"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="sb-input"
                    aria-describedby={displayError ? 'login-error' : undefined}
                  />
                </div>
              </div>

              {/* Trường Mật khẩu */}
              <div className="sb-form-field">
                <div className="sb-field-header">
                  <label htmlFor="password" className="sb-field-label">
                    Mật khẩu
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="sb-forgot-password-btn"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="sb-field-control">
                  <span className="sb-field-icon" aria-hidden="true">
                    <LockKeyhole size={18} />
                  </span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Nhập mật khẩu"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="sb-input"
                    aria-describedby={displayError ? 'login-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="sb-toggle-password"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    aria-pressed={showPassword}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Checkbox Ghi nhớ đăng nhập */}
              <div className="sb-remember-row">
                <label className="sb-checkbox-container">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="sb-checkbox-native"
                  />
                  <span className="sb-checkbox-box" aria-hidden="true">
                    <Check size={12} strokeWidth={3} className="sb-checkbox-check" />
                  </span>
                  <span className="sb-checkbox-text">Ghi nhớ đăng nhập</span>
                </label>
              </div>

              {/* Nút Đăng nhập */}
              <button
                type="submit"
                className="sb-btn-submit"
                disabled={busy}
              >
                <span>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</span>
                <ArrowRight size={18} className="sb-submit-arrow" />
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};
