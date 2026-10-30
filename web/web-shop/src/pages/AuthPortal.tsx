import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useShop } from '../ShopContext';
import { shop, ApiError } from '../api/shop';
import { customer } from '../api/customer';
import { phonePattern } from '../api/validation';
import {
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Package,
  AlertCircle,
  Loader2,
  Check,
  Bell,
  KeyRound,
} from 'lucide-react';
import './auth-portal.css';

interface AuthPortalProps {
  initialMode?: 'login' | 'register';
}

export function AuthPortal({ initialMode }: AuthPortalProps) {
  const { user } = useShop();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  // Determine active mode from route or prop
  const routeMode = location.pathname.includes('register') ? 'register' : 'login';
  const [activeMode, setActiveMode] = useState<'login' | 'register'>(initialMode || routeMode);

  // Sync state if user clicks browser back/forward
  useEffect(() => {
    const current = location.pathname.includes('register') ? 'register' : 'login';
    setActiveMode(current);
  }, [location.pathname]);

  // Handle safe returnTo redirect on successful login
  const candidate = params.get('returnTo') || '/account';
  const returnTo = /^\/(?:cart|checkout(?:\/[^/?#]+)?|payment\/result|payments\/vnpay\/return|demo-payment\/[^/?#]+|account(?:\/[^?#]*)?)(?:\?[^#]*)?$/.test(candidate) && !candidate.includes('\\')
    ? candidate
    : '/account';

  useEffect(() => {
    if (user) {
      navigate(returnTo, { replace: true });
    }
  }, [user, navigate, returnTo]);

  // Mode switcher with clean URL update without resetting scroll
  const switchMode = (target: 'login' | 'register') => {
    setActiveMode(target);
    const targetUrl = target === 'register' ? '/register' : '/login';
    if (location.pathname !== targetUrl) {
      navigate(targetUrl + location.search, { replace: true, preventScrollReset: true });
    }
  };

  // ----------------------------------------------------
  // LOGIN FORM STATE & HANDLERS
  // ----------------------------------------------------
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginCooldown, setLoginCooldown] = useState(0);

  useEffect(() => {
    if (!loginCooldown) return;
    const timer = setTimeout(() => setLoginCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [loginCooldown]);

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loginBusy || loginCooldown) return;

    const emailTrimmed = loginEmail.trim();
    if (!emailTrimmed) {
      setLoginError('Vui lòng nhập địa chỉ email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setLoginError('Địa chỉ email không đúng định dạng.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Vui lòng nhập mật khẩu.');
      return;
    }

    setLoginBusy(true);
    setLoginError(null);

    try {
      await shop.login(emailTrimmed, loginPassword);
    } catch (reason) {
      const err = reason as Error;
      if (err instanceof ApiError && err.status === 429) {
        setLoginCooldown(60);
        setLoginError('Bạn đã thử đăng nhập quá nhiều lần. Vui lòng chờ 60 giây.');
      } else {
        setLoginError(err.message || 'Email hoặc mật khẩu không chính xác. Vui lòng thử lại.');
      }
    } finally {
      setLoginBusy(false);
    }
  };

  // ----------------------------------------------------
  // REGISTER FORM STATE & HANDLERS
  // ----------------------------------------------------
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmation, setRegConfirmation] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [registerBusy, setRegisterBusy] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccessMsg, setRegisterSuccessMsg] = useState<string | null>(null);

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (registerBusy) return;

    const nameTrimmed = regName.trim();
    if (!nameTrimmed) {
      setRegisterError('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (nameTrimmed.length > 200) {
      setRegisterError('Họ và tên tối đa 200 ký tự.');
      return;
    }

    const emailTrimmed = regEmail.trim();
    if (!emailTrimmed) {
      setRegisterError('Vui lòng nhập địa chỉ email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed) || emailTrimmed.length > 254) {
      setRegisterError('Địa chỉ email không đúng định dạng.');
      return;
    }

    const phoneTrimmed = regPhone.trim();
    if (phoneTrimmed && !/^\+?[0-9 ()-]{8,30}$/.test(phoneTrimmed)) {
      setRegisterError('Số điện thoại không đúng định dạng (8-30 ký tự số).');
      return;
    }

    if (!regPassword) {
      setRegisterError('Vui lòng nhập mật khẩu.');
      return;
    }
    if (regPassword.length < 8) {
      setRegisterError('Mật khẩu cần có tối thiểu 8 ký tự.');
      return;
    }
    if (regPassword.length > 72) {
      setRegisterError('Mật khẩu tối đa 72 ký tự.');
      return;
    }

    if (regPassword !== regConfirmation) {
      setRegisterError('Hai mật khẩu chưa trùng khớp. Vui lòng kiểm tra lại.');
      return;
    }

    if (!agreeTerms) {
      setRegisterError('Vui lòng đồng ý với Điều khoản sử dụng và Chính sách bảo mật.');
      return;
    }

    setRegisterBusy(true);
    setRegisterError(null);

    try {
      const result = await customer.register({
        fullName: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        password: regPassword,
      });

      setRegisterSuccessMsg(result.message || 'Đăng ký tài khoản thành công! Đang chuyển sang đăng nhập...');

      // Pre-populate email in login form
      setLoginEmail(regEmail.trim());

      // Transition to login form after 1.5s
      setTimeout(() => {
        switchMode('login');
        setRegisterSuccessMsg(null);
      }, 1500);
    } catch (reason) {
      const err = reason as Error;
      setRegisterError(err.message || 'Chưa thể đăng ký tài khoản. Vui lòng thử lại.');
    } finally {
      setRegisterBusy(false);
    }
  };

  return (
    <div className="auth-portal-page">
      {/* Ambient floating light orbs (Hòa mình vào nền) */}
      <div className="auth-ambient-canvas" aria-hidden="true">
        <div className="auth-ambient-orb-1" />
        <div className="auth-ambient-orb-2" />
      </div>

      {/* Top Navigation - ONLY "← Về trang chủ" (Removed "Bảo mật mã hóa TLS 1.3" as requested) */}
      <div className="auth-top-nav">
        <Link to="/" className="auth-back-link" title="Quay lại trang chủ AnchorBox">
          <ArrowLeft size={14} />
          <span>Về trang chủ</span>
        </Link>
      </div>

      {/* Main Dual Sliding Container */}
      <div className={`auth-card-container ${activeMode === 'register' ? 'is-register-mode' : ''}`}>
        
        {/* Mobile Segmented Switch Tabs */}
        <div className="auth-mobile-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'login'}
            className={`auth-mobile-tab ${activeMode === 'login' ? 'is-active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'register'}
            className={`auth-mobile-tab ${activeMode === 'register' ? 'is-active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Tạo AnchorBox ID
          </button>
        </div>

        {/* ====================================================
            1. SIGN IN FORM PANEL (LEFT HALF IN DESKTOP)
            ==================================================== */}
        <div className="auth-form-container sign-in-container">
          <div className="auth-form-inner">
            <div className="auth-form-header">
              <span className="auth-eyebrow-tag">AnchorBox ID</span>
              <h2>Đăng nhập</h2>
              <p>Quản lý hộp nhận hàng, theo dõi đơn giao và quản lý bưu kiện của bạn.</p>
            </div>

            {loginError && (
              <div className="auth-alert error" role="alert">
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{loginError}</span>
              </div>
            )}

            {registerSuccessMsg && activeMode === 'login' && (
              <div className="auth-alert success" role="status">
                <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{registerSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="auth-actual-form" noValidate>
              <div className="auth-input-group">
                <label className="auth-input-label" htmlFor="login-email">
                  Địa chỉ Email
                </label>
                <div className="auth-input-wrapper">
                  <Mail className="auth-input-icon" size={17} />
                  <input
                    id="login-email"
                    type="email"
                    className="auth-input"
                    placeholder="VD: hung.nguyen@gmail.com"
                    autoComplete="username"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label" htmlFor="login-password">
                  Mật khẩu
                </label>
                <div className="auth-input-wrapper">
                  <Lock className="auth-input-icon" size={17} />
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    aria-label={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    onClick={() => setShowLoginPassword(prev => !prev)}
                  >
                    {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="auth-helper-row">
                <label className="auth-remember-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
                <Link to="/forgot-password" className="auth-forgot-link">
                  Quên mật khẩu?
                </Link>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loginBusy || loginCooldown > 0}
              >
                {loginBusy ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Đang đăng nhập…</span>
                  </>
                ) : loginCooldown > 0 ? (
                  <span>Thử lại sau {loginCooldown} giây</span>
                ) : (
                  <>
                    <span>Đăng nhập</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>

              <div className="auth-switch-mobile-prompt">
                Chưa có tài khoản AnchorBox?{' '}
                <button type="button" onClick={() => switchMode('register')}>
                  Tạo AnchorBox ID
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ====================================================
            2. SIGN UP (REGISTER) FORM PANEL
            ==================================================== */}
        <div className="auth-form-container sign-up-container">
          <div className="auth-form-inner">
            <div className="auth-form-header">
              <h2>Tạo AnchorBox ID</h2>
              <p>Một tài khoản duy nhất cho mọi thiết bị bưu kiện, tra cứu đơn và kích hoạt bảo hành.</p>
            </div>

            {registerError && (
              <div className="auth-alert error" role="alert">
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{registerError}</span>
              </div>
            )}

            {registerSuccessMsg && (
              <div className="auth-alert success" role="alert">
                <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{registerSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="auth-actual-form" noValidate>
              <div className="auth-input-group">
                <label className="auth-input-label" htmlFor="reg-name">
                  Họ và tên
                </label>
                <div className="auth-input-wrapper">
                  <User className="auth-input-icon" size={17} />
                  <input
                    id="reg-name"
                    name="name"
                    type="text"
                    className="auth-input"
                    placeholder="VD: Nguyễn Văn Hùng"
                    autoComplete="name"
                    required
                    maxLength={200}
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                  />
                </div>
              </div>

              <div className="auth-grid-2">
                <div className="auth-input-group">
                  <label className="auth-input-label" htmlFor="reg-email">
                    Địa chỉ Email
                  </label>
                  <div className="auth-input-wrapper">
                    <Mail className="auth-input-icon" size={17} />
                    <input
                      id="reg-email"
                      name="email"
                      type="email"
                      className="auth-input"
                      placeholder="name@example.com"
                      autoComplete="email"
                      required
                      maxLength={254}
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label className="auth-input-label" htmlFor="reg-phone">
                    Số điện thoại
                  </label>
                  <div className="auth-input-wrapper">
                    <Phone className="auth-input-icon" size={17} />
                    <input
                      id="reg-phone"
                      name="phone"
                      type="tel"
                      pattern={phonePattern}
                      className="auth-input"
                      placeholder="0912 345 678"
                      autoComplete="tel"
                      maxLength={30}
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="auth-grid-2">
                <div className="auth-input-group">
                  <label className="auth-input-label" htmlFor="reg-password">
                    Mật khẩu
                  </label>
                  <div className="auth-input-wrapper">
                    <Lock className="auth-input-icon" size={17} />
                    <input
                      id="reg-password"
                      name="password"
                      type={showRegPassword ? 'text' : 'password'}
                      className="auth-input"
                      placeholder="Tối thiểu 8 ký tự"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={72}
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      aria-label={showRegPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      onClick={() => setShowRegPassword(prev => !prev)}
                    >
                      {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="auth-input-group">
                  <label className="auth-input-label" htmlFor="reg-confirm">
                    Xác nhận mật khẩu
                  </label>
                  <div className="auth-input-wrapper">
                    <ShieldCheck className="auth-input-icon" size={17} />
                    <input
                      id="reg-confirm"
                      name="confirmation"
                      type={showRegPassword ? 'text' : 'password'}
                      className="auth-input"
                      placeholder="Nhập lại mật khẩu"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={72}
                      value={regConfirmation}
                      onChange={e => setRegConfirmation(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="auth-terms-note">
                <label className="auth-terms-label">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={e => setAgreeTerms(e.target.checked)}
                  />
                  <span>
                    Tôi đồng ý với <strong>Điều khoản sử dụng</strong> và <strong>Chính sách quyền riêng tư</strong> của AnchorBox.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={registerBusy}
              >
                {registerBusy ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Đang tạo tài khoản…</span>
                  </>
                ) : (
                  <>
                    <span>Tạo AnchorBox ID</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>

              <div className="auth-switch-mobile-prompt">
                Đã có AnchorBox ID?{' '}
                <button type="button" onClick={() => switchMode('login')}>
                  Đăng nhập
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ====================================================
            3. SMOOTH SLIDING OVERLAY CONTAINER (APPLE SPACE BLACK)
            ==================================================== */}
        <div className="auth-overlay-container">
          <div className="auth-overlay">
            
            {/* Left Panel (Visible when viewing Register slide) */}
            <div className="auth-overlay-panel auth-overlay-left">
              <div className="overlay-hero-icon">
                <Package size={26} strokeWidth={1.8} color="#ffffff" />
              </div>
              <h3>Đã có AnchorBox ID?</h3>
              <p className="overlay-desc">
                Đăng nhập để điều khiển hộp nhận hàng từ xa, tạo mã mở hộp cho người giao hàng và tra cứu bảo hành.
              </p>

              <div className="overlay-features">
                <div className="overlay-feature-item">
                  <Check size={16} />
                  <span>Mở chốt khóa điện từ Solenoid 250kg từ xa</span>
                </div>
                <div className="overlay-feature-item">
                  <Check size={16} />
                  <span>Cung cấp mã OTP dùng 1 lần cho shipper</span>
                </div>
                <div className="overlay-feature-item">
                  <Check size={16} />
                  <span>Tra cứu bảo hành 24 tháng chính hãng</span>
                </div>
              </div>

              <button
                type="button"
                className="auth-ghost-btn"
                onClick={() => switchMode('login')}
              >
                <span>Đăng nhập</span>
                <ArrowRight size={15} />
              </button>
            </div>

            {/* Right Panel (Visible when viewing Login slide) */}
            <div className="auth-overlay-panel auth-overlay-right">
              <div className="overlay-hero-icon">
                <ShieldCheck size={26} strokeWidth={1.8} color="#ffffff" />
              </div>
              <h3>Tạo AnchorBox ID mới</h3>
              <p className="overlay-desc">
                Đăng ký tài khoản để kích hoạt bảo hành thiết bị, nhận thông báo bưu kiện và phân quyền mở hộp cho gia đình.
              </p>

              <div className="overlay-features">
                <div className="overlay-feature-item">
                  <Bell size={16} />
                  <span>Thông báo tức thì khi shipper đặt kiện vào hộp</span>
                </div>
                <div className="overlay-feature-item">
                  <ShieldCheck size={16} />
                  <span>Cảm biến tải trọng Loadcell & Chống nước IP65</span>
                </div>
                <div className="overlay-feature-item">
                  <KeyRound size={16} />
                  <span>Mã hóa bảo mật TLS 1.3 & Khóa Solenoid an toàn</span>
                </div>
              </div>

              <button
                type="button"
                className="auth-ghost-btn"
                onClick={() => switchMode('register')}
              >
                <span>Tạo tài khoản</span>
                <ArrowRight size={15} />
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

export default AuthPortal;
