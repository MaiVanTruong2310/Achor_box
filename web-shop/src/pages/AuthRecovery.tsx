import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { customer } from '../api/customer';
import {
  KeyRound,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';
import './auth-portal.css';

interface AuthRecoveryProps {
  mode?: 'forgot' | 'reset';
}

export function AuthRecovery({ mode = 'forgot' }: AuthRecoveryProps) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isReset = mode === 'reset';

  // Read token from URL params (if user clicked direct magic link)
  const [token] = useState(() => (isReset ? params.get('token_hash') || '' : ''));
  const urlEmail = params.get('email') || '';

  useEffect(() => {
    if (isReset && token) {
      const url = new URL(window.location.href);
      url.searchParams.delete('token_hash');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
  }, [isReset, token]);

  // Step state: 'request' (enter email) or 'verify' (enter OTP + new password)
  const [step, setStep] = useState<'request' | 'verify'>(isReset ? 'verify' : 'request');

  // Form states
  const [email, setEmail] = useState(() => urlEmail);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Password strength calculation (0 to 4)
  const strengthScore = (() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  })();

  const strengthText =
    strengthScore === 0
      ? ''
      : strengthScore <= 1
      ? 'Mật khẩu yếu (cần chữ hoa, số & ký tự đặc biệt)'
      : strengthScore <= 2
      ? 'Mật khẩu trung bình'
      : strengthScore === 3
      ? 'Mật khẩu an toàn'
      : 'Mật khẩu rất mạnh & bảo mật cao';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;

    setError(null);
    setSuccessMsg(null);

    // BƯỚC 1: YÊU CẦU GỬI MÃ OTP VỀ EMAIL
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (step === 'request') {
      const cleanEmail = email.trim();
      if (!cleanEmail) {
        setError('Vui lòng nhập địa chỉ email tài khoản của bạn.');
        return;
      }
      if (!emailRegex.test(cleanEmail) || cleanEmail.length > 254) {
        setError('Địa chỉ email không đúng định dạng hoặc vượt quá 254 ký tự.');
        return;
      }

      setBusy(true);
      try {
        const result = await customer.forgot(cleanEmail);
        setSuccessMsg(
          result.message ||
            `Đã gửi mã OTP 6 số tới email ${cleanEmail}. Vui lòng kiểm tra hộp thư đến (hoặc hòm thư rác / Spam).`
        );
        // Tự động chuyển sang bước nhập OTP và tạo mật khẩu mới
        setStep('verify');
      } catch (reason) {
        const err = reason as Error;
        setError(err.message || 'Có lỗi xảy ra trong quá trình gửi mã OTP. Vui lòng thử lại.');
      } finally {
        setBusy(false);
      }
      return;
    }

    // BƯỚC 2: XÁC MINH OTP / TOKEN VÀ CẬP NHẬT MẬT KHẨU MỚI
    if (password !== confirmation) {
      setError('Hai mật khẩu chưa trùng khớp. Vui lòng kiểm tra lại.');
      return;
    }
    if (password.length < 8 || password.length > 72) {
      setError('Mật khẩu mới phải có từ 8 đến 72 ký tự.');
      return;
    }

    if (!token) {
      const cleanEmail = email.trim();
      if (!cleanEmail || !emailRegex.test(cleanEmail)) {
        setError('Vui lòng nhập địa chỉ email hợp lệ.');
        return;
      }
      if (!otp.trim()) {
        setError('Vui lòng nhập mã OTP 6 chữ số đã được gửi tới email của bạn.');
        return;
      }
    }

    setBusy(true);
    try {
      if (token) {
        // Xác minh qua token_hash từ link trực tiếp
        await customer.reset({ tokenHash: token, newPassword: password });
      } else {
        // Xác minh qua email + mã OTP 6 số
        await customer.reset({ email: email.trim(), otp: otp.trim(), newPassword: password });
      }

      setSuccessMsg('Đã đặt lại mật khẩu thành công! Đang chuyển sang màn hình đăng nhập…');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (reason) {
      const err = reason as Error;
      setError(err.message || 'Mã OTP không chính xác hoặc đã hết hạn. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-recovery-page">
      {/* Ambient floating orbs (Hòa mình vào nền) */}
      <div className="auth-ambient-canvas" aria-hidden="true">
        <div className="auth-ambient-orb-1" />
        <div className="auth-ambient-orb-2" />
      </div>

      {/* Top back navigation */}
      <div className="auth-top-nav auth-recovery-top-nav">
        <Link to="/login" className="auth-back-link" title="Quay lại màn hình đăng nhập">
          <ArrowLeft size={14} />
          <span>Về đăng nhập</span>
        </Link>
      </div>

      {/* Apple Frosted Glass Card */}
      <div className="apple-auth-recovery-card">
        {/* Apple Emblem Icon */}
        <div className="auth-recovery-emblem-wrap">
          <div className="auth-recovery-emblem">
            {step === 'verify' ? <ShieldCheck size={26} strokeWidth={1.8} /> : <KeyRound size={26} strokeWidth={1.8} />}
          </div>
        </div>

        {/* Card Header */}
        <div className="auth-recovery-header">
          <h1>{step === 'verify' ? 'Xác thực OTP & Mật khẩu mới' : 'Khôi phục mật khẩu'}</h1>
          <p>
            {step === 'verify'
              ? 'Nhập mã OTP 6 số nhận từ email và tạo mật khẩu mới để bảo vệ tài khoản.'
              : 'Nhập địa chỉ email đã đăng ký. Hệ thống sẽ gửi mã OTP 6 số để bạn xác minh và đổi mật khẩu.'}
          </p>
        </div>

        {error && (
          <div className="auth-alert error" role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-alert success" role="status">
            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-recovery-form" noValidate>
          {step === 'request' ? (
            /* --- STEP 1: NHẬP EMAIL ĐỂ GỬI MÃ OTP --- */
            <div className="auth-input-group">
              <label className="auth-input-label" htmlFor="recovery-email">
                Địa chỉ Email tài khoản
              </label>
              <div className="auth-input-wrapper">
                <Mail className="auth-input-icon" size={17} />
                <input
                  id="recovery-email"
                  type="email"
                  className="auth-input"
                  placeholder="VD: name@example.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          ) : (
            /* --- STEP 2: NHẬP OTP VÀ MẬT KHẨU MỚI --- */
            <>
              {!token && (
                <>
                  <div className="auth-input-group">
                    <label className="auth-input-label" htmlFor="verify-email">
                      Email nhận mã
                    </label>
                    <div className="auth-input-wrapper">
                      <Mail className="auth-input-icon" size={17} />
                      <input
                        id="verify-email"
                        type="email"
                        className="auth-input"
                        placeholder="VD: name@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="auth-input-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="auth-input-label" htmlFor="recovery-otp">
                        Mã OTP xác thực (6 số)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setStep('request');
                          setError(null);
                          setSuccessMsg(null);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0284c7',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '0 0 4px',
                        }}
                      >
                        <RotateCcw size={12} />
                        <span>Gửi lại mã</span>
                      </button>
                    </div>
                    <div className="auth-input-wrapper">
                      <KeyRound className="auth-input-icon" size={17} />
                      <input
                        id="recovery-otp"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={8}
                        className="auth-input"
                        placeholder="Nhập 6 số trong email (VD: 123456)"
                        required
                        autoFocus
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\s+/g, ''))}
                        style={{ letterSpacing: '2px', fontWeight: 600 }}
                      />
                    </div>
                  </div>
                </>
              )}

              {token && (
                <div style={{ fontSize: '0.85rem', color: '#10b981', padding: '6px 12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={15} />
                  <span>Đã nhận diện mã xác thực từ liên kết email của bạn.</span>
                </div>
              )}

              <div className="auth-input-group">
                <label className="auth-input-label" htmlFor="new-password">
                  Mật khẩu mới
                </label>
                <div className="auth-input-wrapper">
                  <Lock className="auth-input-icon" size={17} />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="Tối thiểu 8 ký tự"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    onClick={() => setShowPassword((p) => !p)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="password-strength-wrap">
                  <div className="password-strength-bars">
                    <div className={`strength-bar ${strengthScore >= 1 ? (strengthScore <= 1 ? 'active-weak' : strengthScore <= 2 ? 'active-medium' : 'active-strong') : ''}`} />
                    <div className={`strength-bar ${strengthScore >= 2 ? (strengthScore <= 2 ? 'active-medium' : 'active-strong') : ''}`} />
                    <div className={`strength-bar ${strengthScore >= 3 ? 'active-strong' : ''}`} />
                    <div className={`strength-bar ${strengthScore >= 4 ? 'active-strong' : ''}`} />
                  </div>
                  <span className="strength-label">{strengthText}</span>
                </div>
              )}

              <div className="auth-input-group">
                <label className="auth-input-label" htmlFor="confirm-password">
                  Xác nhận mật khẩu mới
                </label>
                <div className="auth-input-wrapper">
                  <ShieldCheck className="auth-input-icon" size={17} />
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="Nhập lại mật khẩu mới"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <button type="submit" className="auth-submit-btn" disabled={busy} style={{ marginTop: '14px' }}>
            {busy ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>{step === 'verify' ? 'Đang xác thực & đổi mật khẩu…' : 'Đang gửi mã OTP…'}</span>
              </>
            ) : (
              <>
                <span>{step === 'verify' ? 'Xác nhận đổi mật khẩu' : 'Gửi mã OTP về email'}</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Footer links */}
        <div className="auth-recovery-footer">
          <Link to="/login" className="recovery-link">
            ← Về trang đăng nhập
          </Link>
          <Link to="/contact" className="recovery-link">
            Cần hỗ trợ?
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AuthRecovery;
