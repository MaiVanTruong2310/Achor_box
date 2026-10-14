import React from 'react';
import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Package, ShieldCheck, LogOut } from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export const AccountLayout: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return <LoadingSpinner message="Đang kiểm tra phiên đăng nhập..." minHeight="300px" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="section" style={{ paddingTop: '32px' }}>
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '260px 1fr',
            gap: '32px',
            alignItems: 'start'
          }}
          className="account-grid"
        >
          {/* Sidebar */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            {/* User Mini Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                paddingBottom: '16px',
                marginBottom: '10px',
                borderBottom: '1px solid var(--border-color)'
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '16px'
                }}
              >
                {user?.fullName ? user.fullName[0].toUpperCase() : 'U'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {user?.fullName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </div>
              </div>
            </div>

            {/* Nav links */}
            <NavLink to="/account/addresses" className="btn btn-secondary">Địa chỉ giao & lắp đặt</NavLink>
            <NavLink to="/account/password" className="btn btn-secondary">Đổi mật khẩu</NavLink>
            <NavLink
              to="/account"
              end
              className={({ isActive }) =>
                `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
              }
              style={{ justifyContent: 'flex-start', padding: '9px 12px', fontSize: '13.5px' }}
            >
              <User size={16} /> Thông tin cá nhân
            </NavLink>

            <NavLink
              to="/account/orders"
              className={({ isActive }) =>
                `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
              }
              style={{ justifyContent: 'flex-start', padding: '9px 12px', fontSize: '13.5px' }}
            >
              <Package size={16} /> Đơn hàng của tôi
            </NavLink>

            <NavLink
              to="/account/warranties"
              className={({ isActive }) =>
                `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
              }
              style={{ justifyContent: 'flex-start', padding: '9px 12px', fontSize: '13.5px' }}
            >
              <ShieldCheck size={16} /> Thiết bị &amp; Bảo hành
            </NavLink>

            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '8px', paddingTop: '8px' }}>
              <button
                onClick={handleLogout}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: '9px 12px',
                  fontSize: '13.5px',
                  color: 'var(--danger-text)'
                }}
              >
                <LogOut size={16} /> Đăng xuất
              </button>
            </div>
          </div>

          {/* Main Account View Content */}
          <div>
            <Outlet />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .account-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
