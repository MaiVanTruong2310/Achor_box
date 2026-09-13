import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Lock,
  Unlock,
  ShieldAlert,
  CheckCircle,
  CheckCircle2,
  Cpu,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Eye,
  X,
  Copy,
  Check,
  ShoppingBag,
  Box,
  Wrench,
  Clock,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ArrowRight,
  Shield,
  Send,
  Sparkles,
  ExternalLink,
  BatteryCharging,
  Info
} from 'lucide-react';
import { Profile, Customer360Details, Order, Device, WarrantyClaim } from '../types/database';
import { usersService, ordersService, devicesService, warrantiesService } from '../services/api';

interface ExtendedProfile extends Profile {
  owned_devices?: string[];
  total_orders?: number;
  active_tickets?: number;
}

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<ExtendedProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modal 1: Hồ Sơ Khách Hàng 360°
  const [selectedUserFor360, setSelectedUserFor360] = useState<ExtendedProfile | null>(null);
  const [customer360Data, setCustomer360Data] = useState<Customer360Details | null>(null);
  const [loading360, setLoading360] = useState<boolean>(false);
  const [active360Tab, setActive360Tab] = useState<'orders' | 'devices' | 'warranties'>('orders');

  // Modal 2: Khóa / Mở Khóa Tài Khoản
  const [lockTargetUser, setLockTargetUser] = useState<ExtendedProfile | null>(null);
  const [lockReason, setLockReason] = useState<string>('Nghi vấn gian lận đơn hàng / bùng hàng');
  const [customLockReason, setCustomLockReason] = useState<string>('');
  const [isLockSubmitting, setIsLockSubmitting] = useState<boolean>(false);

  // Modal 3: Reset Mật Khẩu Hotline qua OTP Email
  const [resetTargetUser, setResetTargetUser] = useState<ExtendedProfile | null>(null);
  const [otpStep, setOtpStep] = useState<'request' | 'verify' | 'success'>('request');
  const [otpInput, setOtpInput] = useState<string>('');
  const [otpCountdown, setOtpCountdown] = useState<number>(0);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [otpErrorMessage, setOtpErrorMessage] = useState<string>('');
  const [previewOtpCode, setPreviewOtpCode] = useState<string>('');
  const [passwordMode, setPasswordMode] = useState<'default' | 'custom'>('default');
  const [customPassword, setCustomPassword] = useState<string>('');
  const [finalNewPassword, setFinalNewPassword] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Load all users
  const loadUsers = async () => {
    setLoading(true);
    try {
      const [data, allOrders, allDevices] = await Promise.all([
        usersService.getUsers(),
        ordersService.getOrders().catch(() => []),
        devicesService.getDevices().catch(() => [])
      ]);

      // Enrich users with order and device counts
      const enriched: ExtendedProfile[] = data.map((u) => {
        const userOrders = allOrders.filter((o) => o.user_id === u.id);
        const userDevices = allDevices.filter((d) => d.owner_id === u.id);
        return {
          ...u,
          total_orders: userOrders.length,
          owned_devices: userDevices.map((d) => d.serial_number || d.name || 'BOX-IoT')
        };
      });

      setUsers(enriched);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Countdown timer for OTP
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  // -------------------------------------------------------------
  // SMART SEARCH: Prioritize Phone Number
  // -------------------------------------------------------------
  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return users.filter((u) => {
      // Role Filter
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;

      // Status Filter
      if (statusFilter === 'active' && u.is_locked) return false;
      if (statusFilter === 'locked' && !u.is_locked) return false;

      if (!term) return true;

      // Clean digits from search input to check phone match
      const isDigitSearch = /^[\d+]+$/.test(term);
      if (isDigitSearch) {
        // High priority phone match
        const cleanPhone = (u.phone || '').replace(/[\s.-]/g, '');
        if (cleanPhone.includes(term.replace(/[\s.-]/g, ''))) return true;
      }

      // Check email
      if (u.email && u.email.toLowerCase().includes(term)) return true;

      // Check full name
      if (u.full_name && u.full_name.toLowerCase().includes(term)) return true;

      // Check phone (general)
      if (u.phone && u.phone.toLowerCase().includes(term)) return true;

      // Check default address
      if (u.default_address && u.default_address.toLowerCase().includes(term)) return true;

      // Check device serials
      if (u.owned_devices && u.owned_devices.some((d) => d.toLowerCase().includes(term))) return true;

      return false;
    });
  }, [users, searchTerm, statusFilter, roleFilter]);

  // -------------------------------------------------------------
  // MODAL 1: Open Customer 360° View
  // -------------------------------------------------------------
  const handleOpenCustomer360 = async (user: ExtendedProfile) => {
    setSelectedUserFor360(user);
    setActive360Tab('orders');
    setLoading360(true);
    try {
      const details = await usersService.getUser360Details(user.id);
      setCustomer360Data(details);
    } catch (err) {
      console.error('Error fetching 360 details:', err);
    } finally {
      setLoading360(false);
    }
  };

  // -------------------------------------------------------------
  // MODAL 2: Lock / Unlock User
  // -------------------------------------------------------------
  const handleOpenLockModal = (user: ExtendedProfile) => {
    setLockTargetUser(user);
    setLockReason('Nghi vấn gian lận đơn hàng / bùng hàng');
    setCustomLockReason('');
  };

  const handleConfirmToggleLock = async () => {
    if (!lockTargetUser) return;
    setIsLockSubmitting(true);
    const nextLock = !lockTargetUser.is_locked;
    const finalReason = lockReason === 'Khác' ? customLockReason : lockReason;

    try {
      await usersService.toggleUserLock(lockTargetUser.id, lockTargetUser.is_locked, finalReason);
      setUsers(users.map((u) => (u.id === lockTargetUser.id ? { ...u, is_locked: nextLock } : u)));
      setLockTargetUser(null);
    } catch (err) {
      alert('Có lỗi xảy ra khi cập nhật trạng thái khóa: ' + err);
    } finally {
      setIsLockSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // MODAL 3: Reset Password via Hotline OTP
  // -------------------------------------------------------------
  const handleOpenResetOtpModal = (user: ExtendedProfile) => {
    setResetTargetUser(user);
    setOtpStep('request');
    setOtpInput('');
    setOtpErrorMessage('');
    setPreviewOtpCode('');
    setPasswordMode('default');
    setCustomPassword('');
    setFinalNewPassword('');
    setIsCopied(false);
  };

  const handleSendOtp = async () => {
    if (!resetTargetUser) return;
    setIsSendingOtp(true);
    setOtpErrorMessage('');
    try {
      const res = await usersService.sendResetPasswordOtp(resetTargetUser.id);
      if (res.success) {
        setOtpStep('verify');
        setOtpCountdown(60);
        if (res.previewOtp) {
          setPreviewOtpCode(res.previewOtp);
        }
      } else {
        setOtpErrorMessage(res.message || 'Không thể gửi mã OTP.');
      }
    } catch (err: any) {
      setOtpErrorMessage(err.message || 'Lỗi khi gửi mã OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtpAndReset = async () => {
    if (!resetTargetUser) return;
    if (!otpInput.trim() || otpInput.trim().length !== 6) {
      setOtpErrorMessage('Vui lòng nhập đủ 6 chữ số mã OTP.');
      return;
    }

    const newPass = passwordMode === 'custom' && customPassword.trim() 
      ? customPassword.trim() 
      : 'SmartBox@123456';

    setIsSendingOtp(true);
    setOtpErrorMessage('');
    try {
      const res = await usersService.verifyOtpAndResetPassword(resetTargetUser.id, otpInput.trim(), newPass);
      if (res.success) {
        setFinalNewPassword(res.updatedPassword || newPass);
        setOtpStep('success');
      } else {
        setOtpErrorMessage(res.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.');
      }
    } catch (err: any) {
      setOtpErrorMessage(err.message || 'Xác thực OTP thất bại.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(finalNewPassword);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleReset2FA = (userId: string) => {
    setUsers(users.map((u) => (u.id === userId ? { ...u, is_2fa_enabled: !u.is_2fa_enabled } : u)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header & Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 6px 18px rgba(2, 132, 199, 0.3)'
              }}
            >
              <Users size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Quản Lý Khách Hàng & Hồ Sơ 360°
                </h2>
                <span className="badge badge-success" style={{ fontSize: '0.72rem', padding: '3px 9px', borderRadius: '12px' }}>
                  <Sparkles size={11} /> Hotline OTP Support
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: '3px 0 0 0' }}>
                Tra cứu ưu tiên Số Điện Thoại, hồ sơ thiết bị IoT sở hữu, lịch sử mua hàng và hỗ trợ cấp lại mật khẩu qua Hotline.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadUsers}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', borderRadius: '9999px' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* 2. KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '16px 20px', borderRadius: '14px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Tổng Khách Hàng / Hồ Sơ
          </div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {users.length} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>tài khoản</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {users.filter((u) => u.role === 'customer').length} khách hàng cá nhân
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderRadius: '14px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Hoạt Động Bình Thường
          </div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '4px' }}>
            {users.filter((u) => !u.is_locked).length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', marginTop: '2px' }}>
            Sẵn sàng mở tủ & đặt đơn
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderRadius: '14px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Tài Khoản Đang Bị Khóa
          </div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--accent-rose)', marginTop: '4px' }}>
            {users.filter((u) => u.is_locked).length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', marginTop: '2px' }}>
            Vi phạm hoặc nghi vấn gian lận
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderRadius: '14px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Bảo Mật Hai Lớp (2FA)
          </div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--accent-sky)', marginTop: '4px' }}>
            {users.filter((u) => u.is_2fa_enabled).length}{' '}
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ {users.length}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Xác thực OTP qua App
          </div>
        </div>
      </div>

      {/* 3. Search Bar & Status Filters */}
      <div
        className="card"
        style={{
          padding: '14px 20px',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '320px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '440px' }}>
            <Search
              size={18}
              color="var(--accent-primary)"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              className="input-field"
              style={{
                paddingLeft: '38px',
                margin: 0,
                borderRadius: '10px',
                fontSize: '0.85rem',
                border: '1px solid var(--border-glass)'
              }}
              placeholder="Nhập Số Điện Thoại (Ưu tiên), Email hoặc Tên khách..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input-field"
            style={{ margin: 0, width: 'auto', borderRadius: '10px', fontSize: '0.8125rem' }}
          >
            <option value="all">Tất cả vai trò</option>
            <option value="customer">Khách hàng</option>
            <option value="super_admin">Super Admin</option>
            <option value="technician">Kỹ thuật viên</option>
            <option value="accountant">Kế toán</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'all', label: `Tất cả (${users.length})` },
            { id: 'active', label: `Hoạt động (${users.filter((u) => !u.is_locked).length})` },
            { id: 'locked', label: `Đang khóa (${users.filter((u) => u.is_locked).length})` }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`btn ${statusFilter === st.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.8125rem', borderRadius: '8px' }}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Users Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '14px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>KHÁCH HÀNG / EMAIL</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary)' }}>
                    <Phone size={14} /> SỐ ĐIỆN THOẠI (CHÍNH)
                  </span>
                </th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>THIẾT BỊ SỞ HỮU</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>ĐƠN HÀNG</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>TRẠNG THÁI</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, textAlign: 'right' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Không tìm thấy khách hàng nào phù hợp với từ khóa "{searchTerm}"
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.15s'
                    }}
                  >
                    {/* User info */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                          alt={u.full_name || 'User'}
                          style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)', flexShrink: 0 }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{u.full_name || 'Chưa cập nhật tên'}</span>
                            {u.role !== 'customer' && (
                              <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-primary)', fontSize: '0.68rem' }}>
                                {u.role}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Mail size={12} />
                            <span>{u.email || (u.phone ? `${u.phone}@smartbox.vn` : 'user@smartbox.vn')}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Phone (highlighted) */}
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                          background: 'rgba(59, 130, 246, 0.08)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                          fontSize: '0.85rem'
                        }}
                      >
                        {u.phone || 'Chưa có SĐT'}
                      </span>
                    </td>

                    {/* Owned devices */}
                    <td style={{ padding: '14px 18px' }}>
                      {u.owned_devices && u.owned_devices.length > 0 ? (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {u.owned_devices.slice(0, 2).map((d) => (
                            <span
                              key={d}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: 'rgba(37, 99, 235, 0.12)',
                                color: 'var(--accent-primary)',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.72rem',
                                fontWeight: 600
                              }}
                            >
                              <Cpu size={12} />
                              {d}
                            </span>
                          ))}
                          {u.owned_devices.length > 2 && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                              +{u.owned_devices.length - 2} hộp
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Chưa ghép nối</span>
                      )}
                    </td>

                    {/* Total orders */}
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8125rem' }}>
                        {u.total_orders || 0} đơn hàng
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 18px' }}>
                      {u.is_locked ? (
                        <span className="badge badge-locked" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', fontSize: '0.72rem' }}>
                          <Lock size={12} />
                          Đang bị khóa
                        </span>
                      ) : (
                        <span className="badge badge-online" style={{ fontSize: '0.72rem' }}>
                          <span className="badge-dot" />
                          Hoạt động
                        </span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {/* 1. Hồ sơ 360° */}
                        <button
                          className="btn btn-secondary"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            borderRadius: '8px'
                          }}
                          title="Xem chi tiết hồ sơ 360° (Đơn hàng, Thiết bị, Bảo hành)"
                          onClick={() => handleOpenCustomer360(u)}
                        >
                          <Eye size={13} color="var(--accent-primary)" />
                          <span>Hồ Sơ 360°</span>
                        </button>

                        {/* 2. Reset Mật Khẩu qua Hotline OTP */}
                        <button
                          className="btn btn-secondary"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            borderRadius: '8px',
                            color: 'var(--accent-amber)',
                            borderColor: 'rgba(245, 158, 11, 0.25)'
                          }}
                          title="Hỗ trợ reset mật khẩu qua Hotline (xác thực mã OTP gửi về Email)"
                          onClick={() => handleOpenResetOtpModal(u)}
                        >
                          <KeyRound size={13} />
                          <span>Reset Pass</span>
                        </button>

                        {/* 3. Khóa / Mở Khóa */}
                        <button
                          className={`btn ${u.is_locked ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            borderRadius: '8px',
                            color: u.is_locked ? '#fff' : 'var(--accent-rose)'
                          }}
                          title={u.is_locked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                          onClick={() => handleOpenLockModal(u)}
                        >
                          {u.is_locked ? <Unlock size={13} /> : <Lock size={13} />}
                          <span>{u.is_locked ? 'Mở Khóa' : 'Khóa'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: HỒ SƠ KHÁCH HÀNG 360° VIEW
          ========================================================================= */}
      {selectedUserFor360 && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <img
                  src={selectedUserFor360.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'}
                  alt=""
                  style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-glass)' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {selectedUserFor360.full_name || 'Khách Hàng'}
                    </h3>
                    {selectedUserFor360.is_locked ? (
                      <span className="badge badge-locked" style={{ fontSize: '0.7rem' }}>
                        <Lock size={11} /> Đang bị khóa
                      </span>
                    ) : (
                      <span className="badge badge-online" style={{ fontSize: '0.7rem' }}>
                        <span className="badge-dot" /> Hoạt động
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      <Phone size={13} /> {selectedUserFor360.phone || 'Chưa cập nhật SĐT'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Mail size={13} /> {selectedUserFor360.email || 'khachhang@smartbox.vn'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} /> {selectedUserFor360.default_address || 'Việt Nam'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                className="btn btn-secondary"
                style={{ padding: '6px', borderRadius: '50%' }}
                onClick={() => setSelectedUserFor360(null)}
              >
                <X size={16} />
              </button>
            </div>

            {/* 360 Tabs Navigation */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px', marginBottom: '16px' }}>
              <button
                onClick={() => setActive360Tab('orders')}
                className={`btn ${active360Tab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', borderRadius: '8px' }}
              >
                <ShoppingBag size={14} />
                <span>Đơn Hàng Đã Mua ({customer360Data?.orders?.length || 0})</span>
              </button>

              <button
                onClick={() => setActive360Tab('devices')}
                className={`btn ${active360Tab === 'devices' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', borderRadius: '8px' }}
              >
                <Box size={14} />
                <span>Thiết Bị Đang Sở Hữu ({customer360Data?.devices?.length || 0})</span>
              </button>

              <button
                onClick={() => setActive360Tab('warranties')}
                className={`btn ${active360Tab === 'warranties' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', borderRadius: '8px' }}
              >
                <Wrench size={14} />
                <span>Lịch Sử Bảo Hành ({customer360Data?.warranty_claims?.length || 0})</span>
              </button>
            </div>

            {/* Tab Contents */}
            {loading360 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="spin" style={{ marginBottom: '8px' }} />
                <div>Đang tải dữ liệu hồ sơ 360°...</div>
              </div>
            ) : (
              <div>
                {/* TAB 1: ORDERS */}
                {active360Tab === 'orders' && (
                  <div>
                    {!customer360Data?.orders || customer360Data.orders.length === 0 ? (
                      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Khách hàng chưa phát sinh đơn hàng nào trên hệ thống.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {customer360Data.orders.map((ord) => (
                          <div
                            key={ord.id}
                            style={{
                              padding: '12px 16px',
                              borderRadius: '10px',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-subtle)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '10px'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                                  Mã đơn: #{ord.id.slice(0, 8).toUpperCase()}
                                </span>
                                <span
                                  className={`badge ${
                                    ord.status === 'completed'
                                      ? 'badge-success'
                                      : ord.status === 'shipping'
                                      ? 'badge-online'
                                      : 'badge-secondary'
                                  }`}
                                  style={{ fontSize: '0.7rem' }}
                                >
                                  {ord.status}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Ngày đặt: {new Date(ord.created_at).toLocaleDateString('vi-VN')} • Vận đơn: {ord.tracking_number || 'Chưa gắn mã'}
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                                {(ord.total || 0).toLocaleString('vi-VN')} ₫
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                {ord.shipping_address || 'Giao tại nhà'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: DEVICES */}
                {active360Tab === 'devices' && (
                  <div>
                    {!customer360Data?.devices || customer360Data.devices.length === 0 ? (
                      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Khách hàng chưa đăng ký hoặc ghép nối hộp SmartBox nào.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                        {customer360Data.devices.map((dev) => (
                          <div
                            key={dev.id}
                            style={{
                              padding: '14px',
                              borderRadius: '12px',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-subtle)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                                  {dev.name || 'Hộp SmartBox IoT'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                                  {dev.serial_number}
                                </div>
                              </div>
                              <span className={dev.status === 'online' ? 'badge badge-online' : 'badge badge-offline'} style={{ fontSize: '0.7rem' }}>
                                {dev.status}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <MapPin size={12} />
                              <span>{dev.location_label || 'Vị trí gia đình'}</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <BatteryCharging size={13} color="var(--accent-emerald)" />
                                {dev.battery_level ?? 90}% Pin
                              </span>
                              <span>FW: {dev.firmware_version || 'v1.2.0'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: WARRANTIES */}
                {active360Tab === 'warranties' && (
                  <div>
                    {!customer360Data?.warranty_claims || customer360Data.warranty_claims.length === 0 ? (
                      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Khách hàng chưa có lịch sử khiếu nại hoặc sửa chữa bảo hành nào.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {customer360Data.warranty_claims.map((claim) => (
                          <div
                            key={claim.id}
                            style={{
                              padding: '12px 16px',
                              borderRadius: '10px',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-subtle)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                                Phiếu #{claim.id.slice(0, 8).toUpperCase()}
                              </span>
                              <span
                                className={`badge ${
                                  claim.status === 'resolved'
                                    ? 'badge-success'
                                    : claim.status === 'in_progress'
                                    ? 'badge-online'
                                    : 'badge-secondary'
                                }`}
                                style={{ fontSize: '0.7rem' }}
                              >
                                {claim.status === 'resolved' ? 'Đã nghiệm thu' : claim.status === 'in_progress' ? 'Đang sửa chữa' : 'Mới tiếp nhận'}
                              </span>
                            </div>

                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                              {claim.description}
                            </p>

                            {claim.internal_notes && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: '4px' }}>
                                Kỹ thuật ghi chú: {claim.internal_notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedUserFor360(null)}>
                Đóng hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: KHÓA / MỞ KHÓA TÀI KHOẢN (LOCK CONFIRMATION)
          ========================================================================= */}
      {lockTargetUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: lockTargetUser.is_locked ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                  {lockTargetUser.is_locked ? <Unlock size={18} /> : <Lock size={18} />}
                  <span>{lockTargetUser.is_locked ? 'Mở Khóa Tài Khoản' : 'Khóa Tài Khoản Khách Hàng'}</span>
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  {lockTargetUser.is_locked
                    ? 'Cho phép người dùng đăng nhập và vận hành lại các thiết bị SmartBox.'
                    : 'Tạm khóa nick ngăn chặn giao dịch và mở tủ nếu phát hiện vi phạm hoặc nghi vấn gian lận.'}
                </p>
              </div>
              <button className="btn btn-secondary" style={{ padding: '6px', borderRadius: '50%' }} onClick={() => setLockTargetUser(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)', marginBottom: '14px' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                {lockTargetUser.full_name || 'Khách Hàng'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                SĐT: {lockTargetUser.phone || 'Chưa có SĐT'} • Email: {lockTargetUser.email || 'user@smartbox.vn'}
              </div>
            </div>

            {!lockTargetUser.is_locked && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Lý Do Khóa Tài Khoản *</label>
                <select
                  className="input-field"
                  style={{ margin: 0, borderRadius: '8px', fontSize: '0.8125rem' }}
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                >
                  <option value="Nghi vấn gian lận đơn hàng / bùng hàng">Nghi vấn gian lận đơn hàng / bùng hàng</option>
                  <option value="Nhập sai mã PIN OTP quá nhiều lần tại trạm">Nhập sai mã PIN OTP quá nhiều lần tại trạm</option>
                  <option value="Khách hàng yêu cầu tạm khóa bảo vệ nick qua Hotline">Khách hàng yêu cầu tạm khóa bảo vệ nick qua Hotline</option>
                  <option value="Vi phạm điều khoản vận hành hộp SmartBox">Vi phạm điều khoản vận hành hộp SmartBox</option>
                  <option value="Khác">Lý do khác (Nhập chi tiết bên dưới)</option>
                </select>

                {lockReason === 'Khác' && (
                  <textarea
                    rows={2}
                    className="input-field"
                    style={{ margin: 0, borderRadius: '8px', fontSize: '0.8125rem' }}
                    placeholder="Nhập lý do cụ thể..."
                    value={customLockReason}
                    onChange={(e) => setCustomLockReason(e.target.value)}
                  />
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setLockTargetUser(null)}>
                Hủy bỏ
              </button>
              <button
                type="button"
                className={`btn ${lockTargetUser.is_locked ? 'btn-primary' : ''}`}
                style={{
                  borderRadius: '9999px',
                  padding: '7px 20px',
                  background: !lockTargetUser.is_locked ? 'var(--accent-rose)' : undefined,
                  borderColor: !lockTargetUser.is_locked ? 'var(--accent-rose)' : undefined,
                  color: '#fff'
                }}
                disabled={isLockSubmitting}
                onClick={handleConfirmToggleLock}
              >
                {isLockSubmitting ? (
                  <span>Đang xử lý...</span>
                ) : lockTargetUser.is_locked ? (
                  <span>Xác Nhận Mở Khóa</span>
                ) : (
                  <span>Xác Nhận Khóa Nick</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: RESET MẬT KHẨU QUA HOTLINE VỚI MÃ XÁC THỰC OTP EMAIL
          ========================================================================= */}
      {resetTargetUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px', borderRadius: '16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--accent-amber)' }}>
                  <KeyRound size={20} />
                  <span>Cấp Lại Mật Khẩu Khách Hàng (Hotline)</span>
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Xác thực chính chủ bằng mã OTP gửi về Email trước khi đổi mật khẩu để chống ấn nhầm.
                </p>
              </div>
              <button className="btn btn-secondary" style={{ padding: '6px', borderRadius: '50%' }} onClick={() => setResetTargetUser(null)}>
                <X size={16} />
              </button>
            </div>

            {/* User Target Card */}
            <div
              style={{
                background: 'var(--bg-surface)',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                  {resetTargetUser.full_name || 'Khách Hàng'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  SĐT: <strong style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>{resetTargetUser.phone}</strong>
                </div>
              </div>
              <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.12)', color: 'var(--accent-amber)', fontSize: '0.72rem' }}>
                <Shield size={11} /> Hotline Mode
              </span>
            </div>

            {/* Error banner if any */}
            {otpErrorMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(244, 63, 94, 0.12)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: '#fb7185',
                  fontSize: '0.78rem',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span>{otpErrorMessage}</span>
              </div>
            )}

            {/* ---------------- STAGE 1: GỬI OTP ---------------- */}
            {otpStep === 'request' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Hệ thống sẽ gửi mã OTP xác thực 6 chữ số tới Email liên kết của khách hàng:
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-glass)',
                      marginTop: '6px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Mail size={14} color="var(--accent-sky)" />
                    <span>{resetTargetUser.email || (resetTargetUser.phone ? `${resetTargetUser.phone}@smartbox.vn` : 'khachhang@smartbox.vn')}</span>
                  </div>
                </div>

                <div style={{ background: 'rgba(14, 165, 233, 0.08)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--accent-sky)' }}>
                  💡 <strong>Miễn phí 100%:</strong> Khách hàng sẽ nhận được thư điện tử chứa mã số ngay lập tức để đọc cho nhân viên tổng đài.
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setResetTargetUser(null)}>
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ borderRadius: '9999px', padding: '7px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    disabled={isSendingOtp}
                    onClick={handleSendOtp}
                  >
                    <Send size={14} />
                    <span>{isSendingOtp ? 'Đang gửi mã...' : 'Gửi Mã Xác Thực OTP'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- STAGE 2: NHẬP OTP TỪ KHÁCH ---------------- */}
            {otpStep === 'verify' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {previewOtpCode && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.78rem', color: '#10b981' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                      <CheckCircle size={14} />
                      <span>Đã phát mã OTP tới Email khách hàng:</span>
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Mã xác thực mẫu hỗ trợ kiểm thử/demo: <strong style={{ color: '#10b981', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>{previewOtpCode}</strong>
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                    Nhập Mã OTP Khách Hàng Đọc (6 Số) *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    placeholder="Ví dụ: 849201"
                    className="input-field"
                    style={{
                      margin: 0,
                      borderRadius: '10px',
                      fontSize: '1.25rem',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '6px',
                      textAlign: 'center',
                      fontWeight: 800,
                      borderColor: 'var(--accent-amber)'
                    }}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>Mã có hiệu lực trong 5 phút</span>
                    {otpCountdown > 0 ? (
                      <span>Gửi lại sau ({otpCountdown}s)</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                      >
                        Gửi lại mã OTP
                      </button>
                    )}
                  </div>
                </div>

                {/* Password mode options */}
                <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Mật Khẩu Sau Khi Reset:
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="pwdMode"
                        checked={passwordMode === 'default'}
                        onChange={() => setPasswordMode('default')}
                      />
                      <span>Đặt về mật khẩu mặc định an toàn: <strong style={{ color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>SmartBox@123456</strong></span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="pwdMode"
                        checked={passwordMode === 'custom'}
                        onChange={() => setPasswordMode('custom')}
                      />
                      <span>Nhập mật khẩu khách hàng mong muốn</span>
                    </label>

                    {passwordMode === 'custom' && (
                      <input
                        type="text"
                        className="input-field"
                        style={{ margin: '4px 0 0 0', borderRadius: '8px', fontSize: '0.8rem' }}
                        placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)..."
                        value={customPassword}
                        onChange={(e) => setCustomPassword(e.target.value)}
                      />
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setResetTargetUser(null)}>
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ borderRadius: '9999px', padding: '7px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    disabled={isSendingOtp || otpInput.length !== 6}
                    onClick={handleVerifyOtpAndReset}
                  >
                    <CheckCircle2 size={15} />
                    <span>{isSendingOtp ? 'Đang xác thực...' : 'Xác Nhận Đổi Mật Khẩu'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- STAGE 3: THÀNH CÔNG ---------------- */}
            {otpStep === 'success' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center', padding: '10px 0' }}>
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#10b981',
                    margin: '0 auto'
                  }}
                >
                  <CheckCircle2 size={32} />
                </div>

                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Đã Reset Mật Khẩu Thành Công!
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                    Vui lòng đọc mật khẩu mới cho khách hàng hoặc gửi qua SMS / Zalo.
                  </p>
                </div>

                <div
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>MẬT KHẨU MỚI:</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)', marginTop: '2px' }}>
                      {finalNewPassword}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="btn btn-secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.75rem',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      color: isCopied ? '#10b981' : undefined
                    }}
                  >
                    {isCopied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{isCopied ? 'Đã sao chép!' : 'Sao chép'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ borderRadius: '9999px', padding: '8px 24px', margin: '0 auto' }}
                  onClick={() => setResetTargetUser(null)}
                >
                  Hoàn tất & Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default UsersPage;
