import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowLeft, Home, LogOut, Sun, Moon, ShieldAlert } from 'lucide-react';

export const Forbidden403: React.FC = () => {
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      background: 'var(--bg-app)',
      color: 'var(--text-primary)',
      overflow: 'hidden',
      fontFamily: 'var(--font-main)'
    }}>
      {/* Background Ambient Glows */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        right: '15%',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(239, 68, 68, 0.12) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        left: '10%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />

      {/* Top Header Bar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 28px',
        borderBottom: '1px dashed var(--border-subtle)',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Back Button matching reference image */}
        <button
          onClick={handleGoBack}
          className="btn-ghost"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-glass)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            transition: 'all 0.18s ease'
          }}
          title="Quay lại"
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </button>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={toggleTheme}
            className="btn-ghost"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-glass)',
              background: 'var(--bg-surface)',
              cursor: 'pointer',
              color: 'var(--text-primary)'
            }}
            title={theme === 'dark' ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
          >
            {theme === 'dark' ? <Sun size={17} color="#fbbf24" /> : <Moon size={17} color="#2563eb" />}
          </button>

          {profile && (
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-glass)',
                background: 'var(--bg-surface)',
                color: 'var(--accent-rose-text)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              <LogOut size={14} />
              <span>Đổi tài khoản</span>
            </button>
          )}
        </div>
      </header>

      {/* Center 403 Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 10
      }}>
        {/* 3D Robot 403 Illustration */}
        <div style={{
          position: 'relative',
          maxWidth: '360px',
          width: '100%',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <img
            src="/robot_403.jpg"
            alt="403 Access Denied Robot"
            style={{
              width: '100%',
              maxWidth: '340px',
              height: 'auto',
              borderRadius: '6px',
              boxShadow: 'var(--shadow-card)',
              objectFit: 'cover'
            }}
          />
        </div>

        {/* Title & Subtitle matching reference */}
        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          marginBottom: '8px'
        }}>
          Access Denied
        </h1>
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
          maxWidth: '420px',
          lineHeight: '1.5',
          marginBottom: '26px'
        }}>
          You have no permission to visit this page
        </p>

        {/* Action Buttons with Glassmorphism & Crisp Corners (4px) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={handleGoBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: '4px',
              border: '1px solid var(--border-glass)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.18s ease'
            }}
          >
            <ArrowLeft size={15} />
            <span>Quay lại trang trước</span>
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 20px',
              borderRadius: '4px',
              border: 'none',
              background: 'var(--accent-primary)',
              color: '#ffffff',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              transition: 'all 0.18s ease'
            }}
          >
            <Home size={15} />
            <span>Về Bảng Điều Khiển</span>
          </button>
        </div>
      </main>
    </div>
  );
};
