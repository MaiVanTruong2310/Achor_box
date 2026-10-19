import React, { useEffect, useState, useRef, Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  ShieldCheck,
  Users,
  KeyRound,
  Mail,
  FileBarChart,
  Settings,
  LogOut,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  ChevronDown,
  User,
  Ticket,
  Edit3,
  Globe,
  Truck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { AdminNotificationsProvider, useAdminNotifications, noticeStatusLabel } from '../contexts/AdminNotificationsContext';
import { navigation, roleNavigation, roleLabels, tabs } from '../navigation';
import { getRoleDefaultPath } from '../types/database';
import { UserProfileModal } from './UserProfileModal';
import { NotificationPopover } from './NotificationPopover';
import './admin-workspace.css';

const icons = {
  dashboard: LayoutDashboard,
  products: Package,
  coupons: Ticket,
  orders: ShoppingBag,
  delivery: Truck,
  warranty: ShieldCheck,
  users: Users,
  permissions: KeyRound,
  email: Mail,
  reports: FileBarChart,
  settings: Settings,
  content: Globe
};

export const WorkspaceTabs: React.FC<{ group: string }> = ({ group }) => {
  const { profile } = useAuth();
  const groupTabs = tabs[group]?.filter((tab) => profile && tab.roles.includes(profile.role)) || [];
  if (groupTabs.length <= 1) return null;
  return (
    <nav className="workspace-tabs" aria-label="Chức năng trong nhóm">
      {groupTabs.map((tab) => (
        <NavLink key={tab.path} to={tab.path} end>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
};

export const WorkspaceGroup: React.FC<{ group: string }> = ({ group }) => (
  <>
    <WorkspaceTabs group={group} />
    <Suspense fallback={<PageSkeleton />}>
      <Outlet />
    </Suspense>
  </>
);

export const PageSkeleton: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '4px 0' }} role="status" aria-label="Đang tải dữ liệu trang">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <div style={{ width: 220, height: 28, borderRadius: 6, background: 'var(--border-subtle)', opacity: 0.6 }} />
      <div style={{ width: 120, height: 34, borderRadius: 8, background: 'var(--border-subtle)', opacity: 0.6 }} />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ height: 104, borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ width: '50%', height: 14, borderRadius: 4, background: 'var(--border-subtle)', opacity: 0.7 }} />
          <div style={{ width: '70%', height: 24, borderRadius: 6, background: 'var(--border-subtle)', opacity: 0.5 }} />
        </div>
      ))}
    </div>
    <div style={{ height: 320, borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: 24 }}>
      <div style={{ width: '30%', height: 18, borderRadius: 4, background: 'var(--border-subtle)', marginBottom: 20, opacity: 0.7 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ height: 36, borderRadius: 6, background: 'var(--border-subtle)', opacity: 0.4 }} />
        ))}
      </div>
    </div>
  </div>
);

const Shell: React.FC = () => {
  const { profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobile, setMobile] = useState(false);
  const [compact, setCompact] = useState(() => localStorage.getItem('smartbox_nav_compact') === 'true');
  const [notices, setNotices] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalMode, setProfileModalMode] = useState<'view' | 'edit'>('view');
  const userMenuRef = useRef<HTMLDivElement>(null);

  const feed = useAdminNotifications();
  const visible = profile ? (roleNavigation[profile.role] || []) : [];
  const current = visible.find((item) => location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path + '/')));

  useEffect(() => {
    setMobile(false);
    setNotices(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [profile?.avatar_url]);

  const userInitial = (profile?.full_name || profile?.email || 'A').charAt(0).toUpperCase();

  return (
    <div className={`admin-workspace ${compact ? 'compact' : ''}`}>
      {mobile && <button className="workspace-scrim" aria-label="Đóng menu" onClick={() => setMobile(false)} />}
      <aside className={`workspace-sidebar ${mobile ? 'open' : ''}`} aria-label="Menu quản trị">
        <NavLink to={profile ? getRoleDefaultPath(profile.role) : '/login'} className="workspace-brand">
          <img src="/Logo.png" alt="Anchor Box" />
          <div className="workspace-brand-info">
            <strong>Anchor Box</strong>
            <span className="workspace-brand-badge">Retail OS</span>
          </div>
        </NavLink>

        <nav>
          {visible.map((item) => {
            const Icon = icons[item.icon as keyof typeof icons] || LayoutDashboard;
            const isOrder = item.path.includes('/orders') || item.path.includes('/approvals') || item.path.includes('/delivery');
            const badgeCount = isOrder ? feed.pendingOrdersCount : 0;
            return (
              <NavLink key={item.path} to={item.path} title={compact ? item.label : undefined}>
                <Icon size={19} />
                <span>{item.label}</span>
                {badgeCount > 0 && (
                  <span className="workspace-nav-badge" title={`${badgeCount} đơn hàng cần xử lý`}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="workspace-sidebar-footer">
          <button
            onClick={() => {
              setCompact((value) => {
                localStorage.setItem('smartbox_nav_compact', String(!value));
                return !value;
              });
            }}
          >
            {compact ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            <span>Thu gọn menu</span>
          </button>
          <button onClick={() => void logout()}>
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="workspace-body">
        <header className="workspace-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="icon-button mobile-menu" aria-label="Mở menu" onClick={() => setMobile(true)}>
              <Menu size={20} />
            </button>
            <div className="workspace-crumb">
              <span>Anchor Box</span>
              <ChevronRight size={14} />
              <strong>{current?.label || 'Tổng quan'}</strong>
            </div>
          </div>

          <div className="workspace-tools">
            <div className="fpt-live-pill">
              <span className="live-dot" />
              <span>Hệ thống trực tuyến</span>
            </div>

            <button
              className="icon-button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="notice-anchor">
              <button
                className="icon-button"
                aria-label={`Thông báo (${feed.unread} chưa đọc)`}
                onClick={() => setNotices((v) => !v)}
              >
                <Bell size={18} />
                {feed.unread > 0 && (
                  <b className="notice-badge">{feed.unread > 99 ? '99+' : feed.unread}</b>
                )}
              </button>

              {notices && (
                <NotificationPopover onClose={() => setNotices(false)} />
              )}
            </div>

            <div className="workspace-user-menu-wrapper" ref={userMenuRef}>
              <button
                type="button"
                className={`workspace-user-chip ${userMenuOpen ? 'active' : ''}`}
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label="Tùy chọn tài khoản"
              >
                <div className="workspace-user-avatar">
                  {profile?.avatar_url && !avatarError ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name || 'Avatar'}
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                </div>
                <div className="workspace-user-details">
                  <span>{profile?.full_name || profile?.email}</span>
                  <small>{profile ? roleLabels[profile.role] : ''}</small>
                </div>
                <ChevronDown size={14} className={`user-chip-chevron ${userMenuOpen ? 'open' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="workspace-user-dropdown" role="menu">
                  <div className="user-dropdown-header">
                    <div className="user-dropdown-avatar">
                      {profile?.avatar_url && !avatarError ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name || 'Avatar'}
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        <span>{userInitial}</span>
                      )}
                    </div>
                    <div className="user-dropdown-meta">
                      <strong>{profile?.full_name || 'Người dùng hệ thống'}</strong>
                      <span className="user-dropdown-email">{profile?.email || '—'}</span>
                      <span className="user-dropdown-badge">{profile ? roleLabels[profile.role] : ''}</span>
                    </div>
                  </div>

                  <div className="user-dropdown-actions">
                    <button
                      type="button"
                      className="user-dropdown-item"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setProfileModalMode('view');
                        setShowProfileModal(true);
                      }}
                    >
                      <User size={15} />
                      <span>Xem thông tin</span>
                    </button>

                    <button
                      type="button"
                      className="user-dropdown-item"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setProfileModalMode('edit');
                        setShowProfileModal(true);
                      }}
                    >
                      <Edit3 size={15} />
                      <span>Chỉnh sửa thông tin</span>
                    </button>

                    <div className="user-dropdown-divider" />

                    <button
                      type="button"
                      className="user-dropdown-item danger"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        void logout();
                      }}
                    >
                      <LogOut size={15} />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="workspace-content">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <div className="workspace-toasts" aria-live="polite">
        {feed.fresh.map((event) => (
          <NavLink key={event.id} to={event.link}>
            <Bell size={18} style={{ color: 'var(--fpt-orange)', flexShrink: 0 }} />
            <div>
              <strong>{event.title}</strong>
              <small>{event.referenceId.slice(0, 8)} · {noticeStatusLabel(event)}</small>
            </div>
          </NavLink>
        ))}
      </div>

      <UserProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profile={profile}
        onLogout={() => void logout()}
        initialMode={profileModalMode}
      />
    </div>
  );
};

export const AdminLayout: React.FC = () => (
  <AdminNotificationsProvider>
    <Shell />
  </AdminNotificationsProvider>
);
