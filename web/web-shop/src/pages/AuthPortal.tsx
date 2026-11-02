import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useShop } from '../ShopContext';
import { shop, ApiError } from '../api/shop';
import { customer } from '../api/customer';
import { BrandMark } from '../components/brand/BrandMark';
import { AuthCollage } from './auth/AuthCollage';
import './auth/auth-split.css';

type Mode = 'login' | 'register';
type Step = 'email' | 'details';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9 ()-]{8,30}$/;
const RETURN_PATTERN = /^\/(?:cart|checkout(?:\/[^/?#]+)?|payment\/result|payments\/vnpay\/return|demo-payment\/[^/?#]+|warranty|account(?:\/[^?#]*)?)(?:\?[^#]*)?$/;

const COPY: Record<Mode, { title: string; lead: string; submit: string }> = {
  login: { title: 'Chào mừng trở lại', lead: 'Đăng nhập để quản lý hộp nhận hàng, đơn hàng và bảo hành.', submit: 'Đăng nhập' },
  register: { title: 'Tạo tài khoản Anchor Box', lead: 'Một tài khoản cho thiết bị, đơn hàng và bảo hành của bạn.', submit: 'Tạo tài khoản' },
};

export function AuthPortal({ initialMode }: { initialMode?: Mode }) {
  const { user } = useShop();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const mode: Mode = location.pathname.includes('register') ? 'register' : initialMode ?? 'login';

  const candidate = params.get('returnTo') || '/account';
  const returnTo = RETURN_PATTERN.test(candidate) && !candidate.includes('\\') ? candidate : '/account';

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const nextStepRef = useRef<Step>('email');

  useEffect(() => {
    if (user) navigate(returnTo, { replace: true });
  }, [user, navigate, returnTo]);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, [step, mode]);

  useEffect(() => {
    setStep(nextStepRef.current);
    nextStepRef.current = 'email';
    setError(null);
    setPassword('');
    setConfirmation('');
  }, [mode]);

  function goTo(target: Mode, message: string | null = null, nextStep: Step = 'email') {
    setNotice(message);
    nextStepRef.current = nextStep;
    if (target !== mode) navigate(`/${target}${location.search}`, { replace: true, preventScrollReset: true });
  }

  function submitEmail(event: FormEvent) {
    event.preventDefault();
    const value = email.trim();
    if (!value) return setError('Vui lòng nhập địa chỉ email.');
    if (!EMAIL_PATTERN.test(value) || value.length > 254) return setError('Địa chỉ email không đúng định dạng.');
    setEmail(value);
    setError(null);
    setStep('details');
  }

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    if (busy || cooldown) return;
    if (!password) return setError('Vui lòng nhập mật khẩu.');
    setBusy(true);
    setError(null);
    try {
      await shop.login(email, password);
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 429) {
        setCooldown(60);
        setError('Bạn đã thử đăng nhập quá nhiều lần. Vui lòng chờ 60 giây.');
      } else {
        setError((reason as Error).message || 'Email hoặc mật khẩu không chính xác.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitRegister(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const name = fullName.trim();
    const phoneValue = phone.trim();
    if (!name) return setError('Vui lòng nhập họ và tên.');
    if (name.length > 200) return setError('Họ và tên tối đa 200 ký tự.');
    if (phoneValue && !PHONE_PATTERN.test(phoneValue)) return setError('Số điện thoại không đúng định dạng.');
    if (password.length < 8) return setError('Mật khẩu cần tối thiểu 8 ký tự.');
    if (password.length > 72) return setError('Mật khẩu tối đa 72 ký tự.');
    if (password !== confirmation) return setError('Hai mật khẩu chưa trùng khớp.');
    setBusy(true);
    setError(null);
    try {
      const result = await customer.register({ fullName: name, email, phone: phoneValue, password });
      setFullName('');
      setPhone('');
      goTo('login', result.message || 'Đã tạo tài khoản. Hãy đăng nhập để tiếp tục.', 'details');
    } catch (reason) {
      setError((reason as Error).message || 'Chưa thể tạo tài khoản. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }

  const copy = COPY[mode];
  const loginLocked = mode === 'login' && cooldown > 0;
  const passwordToggle = (
    <button type="button" className="auth-eye" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );

  return (
    <div className="auth-split">
      <section className="auth-pane">
        <Link to="/" className="auth-home" aria-label="Về trang chủ Anchor Box"><ArrowLeft size={16} /> Trang chủ</Link>

        <div className="auth-box">
          <Link to="/" className="auth-logo" aria-label="Anchor Box"><BrandMark size={40} /></Link>
          <h1>{copy.title}</h1>
          <p className="auth-lead">{copy.lead}</p>

          {notice && <p className="auth-msg is-success" role="status"><CheckCircle2 size={16} />{notice}</p>}
          {error && <p className="auth-msg is-error" role="alert"><AlertCircle size={16} />{error}</p>}

          {step === 'email' ? (
            <form className="auth-form" onSubmit={submitEmail} noValidate>
              <label className="auth-sr" htmlFor="auth-email">Địa chỉ email</label>
              <input
                ref={firstFieldRef}
                id="auth-email"
                className="auth-field"
                type="email"
                inputMode="email"
                autoComplete={mode === 'login' ? 'username' : 'email'}
                placeholder="Nhập địa chỉ email"
                value={email}
                maxLength={254}
                onChange={(event) => { setEmail(event.target.value); setError(null); }}
              />
              <button type="submit" className="auth-primary">Tiếp tục</button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={mode === 'login' ? submitLogin : submitRegister} noValidate>
              <div className="auth-chip">
                <span>{email}</span>
                <button type="button" onClick={() => { setStep('email'); setError(null); }} disabled={busy}>Đổi</button>
              </div>
              <input type="email" value={email} autoComplete="username" readOnly hidden />

              {mode === 'register' && (
                <>
                  <label className="auth-sr" htmlFor="auth-name">Họ và tên</label>
                  <input ref={firstFieldRef} id="auth-name" className="auth-field" autoComplete="name" placeholder="Họ và tên" maxLength={200} value={fullName} onChange={(event) => setFullName(event.target.value)} disabled={busy} />
                  <label className="auth-sr" htmlFor="auth-phone">Số điện thoại</label>
                  <input id="auth-phone" className="auth-field" type="tel" inputMode="tel" autoComplete="tel" placeholder="Số điện thoại (không bắt buộc)" maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} disabled={busy} />
                </>
              )}

              <label className="auth-sr" htmlFor="auth-password">Mật khẩu</label>
              <div className="auth-field-wrap">
                <input
                  ref={mode === 'login' ? firstFieldRef : undefined}
                  id="auth-password"
                  className="auth-field"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'login' ? 'Mật khẩu' : 'Mật khẩu (tối thiểu 8 ký tự)'}
                  maxLength={72}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={busy}
                />
                {passwordToggle}
              </div>

              {mode === 'register' && (
                <>
                  <label className="auth-sr" htmlFor="auth-confirm">Nhập lại mật khẩu</label>
                  <input id="auth-confirm" className="auth-field" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Nhập lại mật khẩu" maxLength={72} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy} />
                </>
              )}

              {mode === 'login' && <Link to="/forgot-password" className="auth-forgot">Quên mật khẩu?</Link>}

              <button type="submit" className="auth-primary" disabled={busy || loginLocked}>
                {busy ? <><Loader2 size={18} className="auth-spin" /> Đang xử lý…</> : loginLocked ? `Thử lại sau ${cooldown} giây` : copy.submit}
              </button>
            </form>
          )}

          <p className="auth-terms">
            Bằng việc tiếp tục, bạn đồng ý với <strong>Điều khoản sử dụng</strong> và <strong>Chính sách quyền riêng tư</strong> của Anchor Box.
          </p>

          <p className="auth-switch">
            {mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
            <button type="button" onClick={() => goTo(mode === 'login' ? 'register' : 'login')} disabled={busy}>
              {mode === 'login' ? 'Tạo tài khoản' : 'Đăng nhập'}
            </button>
          </p>
        </div>
      </section>

      <AuthCollage />
    </div>
  );
}

export default AuthPortal;
