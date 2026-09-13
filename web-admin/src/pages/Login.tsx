import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Package, Lock, Mail, ShieldAlert, Sun, Moon, Cpu, Wifi, Activity } from 'lucide-react';
import { getRoleDefaultPath } from '../types/database';

export const Login: React.FC = () => {
  const { login, error: authError, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    const res = await login(email, password);
    if (res.success && res.role) {
      navigate(getRoleDefaultPath(res.role));
    } else if (res.success) {
      navigate('/dashboard');
    }
  };

  const displayError = localError || authError;

  return (
    <div style={{
      minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-app)', color: 'var(--text-primary)', fontFamily: 'var(--font-main)',
      position: 'relative', overflow: 'hidden', padding: '24px'
    }}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '850px', height: '650px', borderRadius: '50%',
        background: theme === 'dark'
          ? 'radial-gradient(ellipse at center, rgba(37, 99, 235, 0.18) 0%, rgba(99, 102, 241, 0.12) 40%, rgba(14, 165, 233, 0.05) 70%, transparent 85%)'
          : 'radial-gradient(ellipse at center, rgba(191, 219, 254, 0.55) 0%, rgba(224, 231, 255, 0.4) 40%, rgba(240, 249, 255, 0.2) 70%, transparent 85%)',
        filter: 'blur(70px)', pointerEvents: 'none', zIndex: 1
      }} />

      <div style={{ position: 'absolute', top: '24px', right: '28px', zIndex: 20 }}>
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px',
            borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)',
            color: 'var(--text-primary)', cursor: 'pointer', boxShadow: 'var(--shadow-card)',
            backdropFilter: 'blur(12px)', transition: 'all 0.3s ease'
          }}
        >
          {theme === 'dark' ? <Sun size={18} color="#fbbf24" /> : <Moon size={18} color="#2563eb" />}
        </button>
      </div>

      <div style={{
        width: '100%', maxWidth: '1100px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '48px', alignItems: 'center', position: 'relative', zIndex: 10
      }}>

        {/* CỘT TRÁI: THIẾT KẾ TINH GỌN, SANG TRỌNG */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)'
            }}>
              <Package size={22} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>SmartBox Hub</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>IoT Delivery & Warranty System</div>
            </div>
          </div>

          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.2, color: 'var(--text-primary)', margin: '0 0 10px 0' }}>
              Cổng Quản Trị &{' '}
              <span style={{ background: 'linear-gradient(90deg, #0ea5e9 0%, #2563eb 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Vận Hành Thiết Bị
              </span>
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Giám sát phần cứng IoT, quản lý đơn hàng và xử lý bảo hành tập trung.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '4px' }}>
            <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <Cpu size={20} color="#10b981" style={{ margin: '0 auto 6px auto' }} />
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>ESP32 S3</div>
              <div style={{ fontSize: '0.6875rem', color: '#10b981', fontWeight: 600 }}>ONLINE</div>
            </div>

            <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <Wifi size={20} color="#2563eb" style={{ margin: '0 auto 6px auto' }} />
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>MQTT TLS</div>
              <div style={{ fontSize: '0.6875rem', color: '#2563eb', fontWeight: 600 }}>ACTIVE</div>
            </div>

            <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <Activity size={20} color="#0ea5e9" style={{ margin: '0 auto 6px auto' }} />
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Loadcell HX711</div>
              <div style={{ fontSize: '0.6875rem', color: '#0ea5e9', fontWeight: 600 }}>READY</div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: FORM CHÍNH */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{
            width: '100%', maxWidth: '440px', borderRadius: '16px', background: 'var(--bg-card)',
            border: '1px solid var(--border-glass)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '36px 32px'
          }}>
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>Đăng nhập</h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>Nhập thông tin xác thực để truy cập cổng điều hành.</p>
            </div>

            {displayError && (
              <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'var(--accent-rose-soft)', border: '1px solid rgba(244, 63, 94, 0.3)', color: 'var(--accent-rose-text)', fontSize: '0.78125rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                <span>{displayError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }} htmlFor="email">Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="email" type="email" placeholder="admin@smartbox.vn"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '11px 14px 11px 38px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: theme === 'dark' ? 'rgba(18, 27, 48, 0.8)' : '#f9fafb', color: 'var(--text-primary)', fontSize: '0.84375rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }} htmlFor="password">Mật khẩu</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="password" type="password" placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', padding: '11px 14px 11px 38px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: theme === 'dark' ? 'rgba(18, 27, 48, 0.8)' : '#f9fafb', color: 'var(--text-primary)', fontSize: '0.84375rem', outline: 'none' }}
                  />
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                style={{ width: '100%', padding: '11px', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#ffffff', fontSize: '0.84375rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)', marginTop: '8px' }}
              >
                {loading ? 'Đang xác thực...' : 'Đăng nhập Hệ thống'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};