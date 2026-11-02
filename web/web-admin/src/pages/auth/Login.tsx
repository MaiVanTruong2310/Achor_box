import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getRoleDefaultPath } from '../../types/database';
import { clearAllAuthTokens } from '../../services/supabase';
import { BrandMark } from '../../components/brand/BrandMark';
import './login.css';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Login: React.FC = () => {
  const { login, error: authError } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const isExpired = searchParams.get('expired') === 'true' || (location.state as { expired?: boolean } | null)?.expired === true;

  useEffect(() => {
    if (isExpired) void clearAllAuthTokens();
  }, [isExpired]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) return setError('Nhập email và mật khẩu.');
    if (!EMAIL.test(cleanEmail)) return setError('Email không đúng định dạng.');

    setError(null);
    setSubmitting(true);
    try {
      const result = await login(cleanEmail, password);
      if (result.success) navigate(result.role ? getRoleDefaultPath(result.role) : '/403', { replace: true });
      else setError(result.error || 'Email hoặc mật khẩu không đúng.');
    } catch {
      setError('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const message = error || authError;

  return (
    <div className="login-page">
      <button
        type="button"
        className="login-theme"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <main className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="brand-tile" aria-hidden="true"><BrandMark size={18} /></span>
          <span>Anchor Box</span>
        </div>
        <h1 id="login-title">Đăng nhập quản trị</h1>
        <p className="login-sub">Dành cho quản trị viên, quản lý kho và kỹ thuật viên.</p>

        {isExpired && <p className="login-note" role="status">Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.</p>}
        {message && <p className="login-note is-error" id="login-error" role="alert">{message}</p>}

        <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
          <label className="login-field">
            <span>Email</span>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              aria-invalid={!!message}
              aria-describedby={message ? 'login-error' : undefined}
            />
          </label>

          <label className="login-field">
            <span className="login-field-head">
              Mật khẩu
              <button type="button" className="login-link" onClick={() => setShowHelp((v) => !v)} aria-expanded={showHelp}>
                Quên mật khẩu?
              </button>
            </span>
            <span className="login-password">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                aria-invalid={!!message}
                aria-describedby={message ? 'login-error' : undefined}
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>

          {showHelp && (
            <p className="login-help">Tài khoản nhân viên do quản trị viên cấp. Liên hệ quản trị viên để đặt lại mật khẩu.</p>
          )}

          <button type="submit" className="login-submit" disabled={submitting}>
            {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
      </main>
    </div>
  );
};
