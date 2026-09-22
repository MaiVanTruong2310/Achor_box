import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Box, Check, Clock, Eye, EyeOff, LockKeyhole, Mail, Moon, ShieldCheck, ShieldAlert, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getRoleDefaultPath } from '../types/database';
import { clearAllAuthTokens } from '../services/supabase';
import './login.css';

const accountRoles = ['Khách hàng', 'Quản trị viên', 'Quản lý sản phẩm', 'Nhân viên hỗ trợ', 'Kỹ thuật viên', 'Kế toán'];

export const Login: React.FC = () => {
  const { login, error: authError, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const isExpired = searchParams.get('expired') === 'true' || (location.state as { expired?: boolean } | null)?.expired === true;
  useEffect(() => { if (isExpired) void clearAllAuthTokens(); }, [isExpired]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || loading) return;
    setLocalError(null);
    if (!email.trim() || !password) { setLocalError('Vui lòng nhập email và mật khẩu của bạn.'); return; }
    setSubmitting(true);
    try {
      const result = await login(email.trim(), password);
      if (result.success) navigate(result.role ? getRoleDefaultPath(result.role) : '/403', { replace: true });
      else setLocalError(result.error || 'Không thể đăng nhập. Vui lòng kiểm tra thông tin và thử lại.');
    } catch { setLocalError('Chưa thể kết nối. Vui lòng thử lại sau ít phút.'); }
    finally { setSubmitting(false); }
  };
  const displayError = localError || authError;
  const busy = loading || submitting;

  return <div className={`sb-auth sb-auth-${theme}`}>
    <header className="sb-auth-header">
      <Link to="/" className="sb-auth-brand" aria-label="Trang chủ SmartBox"><Box size={27} strokeWidth={1.5} />SmartBox<span>®</span></Link>
      <div className="sb-auth-header-actions"><Link to="/" className="sb-auth-back"><ArrowLeft size={15} /><span>Về trang chủ</span></Link><button className="sb-auth-theme" type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button></div>
    </header>
    <main className="sb-auth-main">
      <section className="sb-auth-story" aria-labelledby="account-title">
        <div className="sb-auth-eyebrow"><span /> TÀI KHOẢN SMARTBOX</div>
        <h1 id="account-title">Một kết nối.<br /><span>Cho mọi vai trò.</span></h1>
        <p>Dù bạn sử dụng SmartBox tại nhà hay đồng hành cùng đội ngũ, mọi trải nghiệm đều bắt đầu từ tài khoản của bạn.</p>
        <div className="sb-auth-product"><img src="/smartbox-studio-v1.png" alt="Hộp SmartBox mica trong suốt với màn hình LCD và bàn phím số" /><div className="sb-auth-product-caption"><ShieldCheck size={19} /><span>Nhận hàng an tâm.<br /><strong>Kết nối mỗi ngày.</strong></span></div></div>
        <div className="sb-auth-audience"><span>DÀNH CHO BẠN VÀ ĐỘI NGŨ SMARTBOX</span><ul>{accountRoles.map(role => <li key={role}><Check size={12} />{role}</li>)}</ul></div>
      </section>
      <section className="sb-auth-panel" aria-labelledby="login-title">
        <div className="sb-auth-panel-mark"><LockKeyhole size={23} strokeWidth={1.5} /></div>
        <div className="sb-auth-eyebrow">CHÀO MỪNG BẠN TRỞ LẠI</div>
        <h2 id="login-title">Đăng nhập SmartBox</h2>
        <p className="sb-auth-intro">Truy cập tài khoản và tiếp tục trải nghiệm của bạn.</p>
        {isExpired && <div className="sb-auth-notice" role="status"><Clock size={18} /><p>Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.</p></div>}
        {displayError && <div className="sb-auth-error" id="login-error" role="alert"><ShieldAlert size={18} /><p>{displayError}</p></div>}
        <form onSubmit={handleSubmit} className="sb-auth-form" aria-busy={busy}>
          <div className="sb-auth-field"><label htmlFor="email">Email</label><div className="sb-auth-input"><Mail size={17} /><input id="email" name="email" type="email" autoComplete="username" placeholder="Email tài khoản của bạn" required value={email} onChange={event => setEmail(event.target.value)} aria-describedby={displayError ? 'login-error' : undefined} /></div></div>
          <div className="sb-auth-field"><label htmlFor="password">Mật khẩu</label><div className="sb-auth-input"><LockKeyhole size={17} /><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Nhập mật khẩu" required value={password} onChange={event => setPassword(event.target.value)} aria-describedby={displayError ? 'login-error' : undefined} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
          <button className="sb-auth-submit" type="submit" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}<ArrowRight size={18} /></button>
        </form>
        <div className="sb-auth-routing"><ShieldCheck size={18} /><p>SmartBox tự đưa bạn đến trang phù hợp với vai trò và quyền truy cập của tài khoản.</p></div>
        <div className="sb-auth-public"><p>Bạn muốn tìm hiểu trước?</p><div><Link to="/guide"><BookOpen size={16} />Hướng dẫn sử dụng<ArrowRight size={14} /></Link><Link to="/warranty"><ShieldCheck size={16} />Tra cứu bảo hành<ArrowRight size={14} /></Link></div></div>
      </section>
    </main>
    <footer className="sb-auth-footer"><span>© {new Date().getFullYear()} SmartBox</span><span>Nhận hàng thông minh. An tâm mỗi ngày.</span></footer>
  </div>;
};
