import React, { useEffect, useRef, useState, useMemo } from 'react';
import { adminCatalogApi } from '../../services/adminCatalogApi';
import { adminRequest } from '../../services/adminRequest';
import { useAuth } from '../../contexts/AuthContext';
import { roleLabels } from '../../navigation';
import type { Profile, UserRole } from '../../types/database';
import { Pagination } from '../../components/Pagination';
import {
  ShieldCheck,
  UserPlus,
  Search,
  RefreshCw,
  Phone,
  Mail,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Shield,
  Box,
  Wrench,
  Calendar,
  Clock,
  IdCard,
  UserCheck
} from 'lucide-react';
import './staff-management.css';

interface StaffForm {
  fullName: string;
  email: string;
  phone: string;
  role: 'super_admin' | 'product_manager' | 'technician';
  initialPassword: string;
}

const emptyStaffForm: StaffForm = {
  fullName: '',
  email: '',
  phone: '',
  role: 'technician',
  initialPassword: '',
};

const staffRolesList: Array<'super_admin' | 'product_manager' | 'technician'> = [
  'super_admin',
  'product_manager',
  'technician'
];

export const AccountManagement: React.FC<{ permissions?: boolean }> = ({ permissions = true }) => {
  const { profile: currentAuthProfile } = useAuth();

  const [rawRows, setRawRows] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all_staff' | 'super_admin' | 'product_manager' | 'technician'>('all_staff');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);

  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Pending role changes by user id (only 3 staff roles allowed)
  const [pendingRoleChanges, setPendingRoleChanges] = useState<Record<string, UserRole>>({});

  // Modals
  const [openCreateStaff, setOpenCreateStaff] = useState(false);
  const [staffForm, setStaffForm] = useState<StaffForm>(emptyStaffForm);
  const [createStaffError, setCreateStaffError] = useState('');

  // Lock/Unlock Modal
  const [lockTarget, setLockTarget] = useState<Profile | null>(null);
  const [lockReason, setLockReason] = useState('Yêu cầu tạm dừng công tác / xem xét vi phạm');
  const [lockCustomReason, setLockCustomReason] = useState('');

  // Staff Profile Details Modal (Staff only info, NO orders/devices)
  const [staffDetail, setStaffDetail] = useState<Profile | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    // If specific staff role, pass to API. If 'all_staff', query with 'staff' role filter to exclude customers on backend.
    const apiRoleParam = roleFilter === 'all_staff' ? 'staff' : roleFilter;

    const timer = setTimeout(() => {
      adminCatalogApi
        .users(page, search, apiRoleParam, statusFilter)
        .then(data => {
          if (active) {
            setRawRows(data.content);
            setPages(data.totalPages);
            setTotal(data.totalElements);
          }
        })
        .catch(e => {
          if (active) {
            setError(e.message);
            setRawRows([]);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [page, search, roleFilter, statusFilter, revision]);

  useEffect(() => {
    setPage(0);
  }, [search, roleFilter, statusFilter]);

  const handleChangeRole = async (user: Profile) => {
    const targetRole = pendingRoleChanges[user.id];
    if (!targetRole || targetRole === 'customer') return;
    setBusy(user.id);
    setError('');
    setMessage('');
    try {
      await adminRequest(`/users/${user.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: targetRole }),
      });
      setPendingRoleChanges(c => {
        const next = { ...c };
        delete next[user.id];
        return next;
      });
      setRevision(r => r + 1);
      setMessage(`Đã cập nhật vai trò của ${user.full_name || user.email} thành ${roleLabels[targetRole]}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const handleOpenLock = (user: Profile) => {
    setLockTarget(user);
    setLockReason(user.is_locked ? 'Đã xác minh và hoàn tất kiểm tra' : 'Yêu cầu tạm dừng công tác / xem xét vi phạm');
    setLockCustomReason('');
  };

  const handleConfirmToggleLock = async () => {
    if (!lockTarget) return;
    const finalReason = lockReason === 'Khác' ? lockCustomReason.trim() : lockReason;
    if (!finalReason) {
      setError('Vui lòng nhập lý do thay đổi trạng thái tài khoản.');
      return;
    }
    setBusy(lockTarget.id);
    setError('');
    setMessage('');
    try {
      await adminRequest(`/users/${lockTarget.id}/toggle-lock`, {
        method: 'PATCH',
        body: JSON.stringify({ isLocked: !lockTarget.is_locked, reason: finalReason }),
      });
      setMessage(
        lockTarget.is_locked
          ? `Đã mở khóa tài khoản cho ${lockTarget.full_name || lockTarget.email}.`
          : `Đã khóa tài khoản của ${lockTarget.full_name || lockTarget.email}.`
      );
      setLockTarget(null);
      setRevision(r => r + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('create');
    setCreateStaffError('');
    try {
      await adminRequest('/users/staff', {
        method: 'POST',
        body: JSON.stringify(staffForm),
      });
      setStaffForm(emptyStaffForm);
      setOpenCreateStaff(false);
      setRevision(r => r + 1);
      setMessage('Đã cấp tài khoản nhân viên mới thành công.');
    } catch (e) {
      setCreateStaffError((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  // Staff KPI counts
  const countAdmin = useMemo(() => rawRows.filter(r => r.role === 'super_admin').length, [rawRows]);
  const countManager = useMemo(() => rawRows.filter(r => r.role === 'product_manager').length, [rawRows]);
  const countTechnician = useMemo(() => rawRows.filter(r => r.role === 'technician').length, [rawRows]);
  const countLocked = useMemo(() => rawRows.filter(r => r.is_locked).length, [rawRows]);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return <span className="fpt-badge fpt-badge-admin"><Shield size={12} /> Quản trị viên</span>;
      case 'product_manager':
        return <span className="fpt-badge fpt-badge-manager"><Box size={12} /> Quản lý Kho & SP</span>;
      case 'technician':
        return <span className="fpt-badge fpt-badge-tech"><Wrench size={12} /> Kỹ thuật viên</span>;
      default:
        return <span className="fpt-badge fpt-badge-customer">{role}</span>;
    }
  };

  const getRoleGradient = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)';
      case 'product_manager':
        return 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';
      case 'technician':
        return 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)';
      default:
        return 'linear-gradient(135deg, #64748b 0%, #475569 100%)';
    }
  };

  const getRoleScopeDescription = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'Toàn quyền cấu hình hệ thống, cấp tài khoản nhân viên, phân quyền và kiểm toán nhật ký.';
      case 'product_manager':
        return 'Quản lý danh mục, biến thể sản phẩm, định mức tồn kho, quản lý đơn hàng, phê duyệt PO và xuất báo cáo doanh thu.';
      case 'technician':
        return 'Tiếp nhận phân công giao hàng & lắp đặt tủ SmartBox, kiểm tra kỹ thuật tại hiện trường và xử lý yêu cầu bảo hành.';
      default:
        return 'Tài khoản người dùng thông thường.';
    }
  };

  return (
    <div className="staff-page-container">
      {/* 1. Header Ribbon */}
      <div className="staff-header-ribbon">
        <div className="staff-header-title-group">
          <div className="staff-header-icon">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="staff-header-title">Quản Lý Nhân Sự</h1>
            <p className="staff-header-desc">
              Quản lý danh sách cán bộ nhân viên nội bộ, cấp tài khoản và phân quyền cho 3 vị trí nghiệp vụ (Admin, Quản lý Kho & SP, Kỹ thuật viên).
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setStaffForm(emptyStaffForm);
              setCreateStaffError('');
              setOpenCreateStaff(true);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <UserPlus size={15} />
            <span>Cấp tài khoản nhân viên</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading}
            onClick={() => setRevision(r => r + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. Executive 4-Card KPI Grid */}
      <div className="staff-kpi-grid">
        <div className="staff-kpi-card">
          <div className="staff-kpi-bubble" style={{ background: 'rgba(124, 58, 237, 0.12)', color: '#8b5cf6' }}>
            <Shield size={20} />
          </div>
          <div className="staff-kpi-meta">
            <span className="staff-kpi-label">Quản trị viên (Admin)</span>
            <div className="staff-kpi-value" style={{ color: '#8b5cf6' }}>{countAdmin}</div>
            <span className="staff-kpi-sub">Toàn quyền hệ thống & nhân sự</span>
          </div>
        </div>

        <div className="staff-kpi-card">
          <div className="staff-kpi-bubble" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <Box size={20} />
          </div>
          <div className="staff-kpi-meta">
            <span className="staff-kpi-label">Quản lý Kho & SP (PO)</span>
            <div className="staff-kpi-value" style={{ color: '#3b82f6' }}>{countManager}</div>
            <span className="staff-kpi-sub">Quản lý sản phẩm, đơn hàng & phê duyệt</span>
          </div>
        </div>

        <div className="staff-kpi-card">
          <div className="staff-kpi-bubble" style={{ background: 'rgba(249, 115, 22, 0.12)', color: '#f97316' }}>
            <Wrench size={20} />
          </div>
          <div className="staff-kpi-meta">
            <span className="staff-kpi-label">Kỹ thuật viên</span>
            <div className="staff-kpi-value" style={{ color: '#f97316' }}>{countTechnician}</div>
            <span className="staff-kpi-sub">Giao hàng, lắp đặt tủ & bảo hành</span>
          </div>
        </div>

        <div className="staff-kpi-card">
          <div className="staff-kpi-bubble" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
            <Lock size={20} />
          </div>
          <div className="staff-kpi-meta">
            <span className="staff-kpi-label">Tài khoản bị khóa</span>
            <div className="staff-kpi-value" style={{ color: '#ef4444' }}>{countLocked}</div>
            <span className="staff-kpi-sub">Bị tạm ngừng đăng nhập hệ thống</span>
          </div>
        </div>
      </div>

      {/* 3. Alerts */}
      {message && (
        <div className="card" style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="card" style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Filter Toolbar */}
      <div className="staff-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
          <div className="staff-search-box">
            <Search size={15} className="staff-search-icon" />
            <input
              type="text"
              placeholder="Tìm tên nhân viên, email, số điện thoại…"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>

          <select
            className="staff-select-control"
            value={roleFilter}
            onChange={e => {
              setRoleFilter(e.target.value as any);
              setPage(0);
            }}
          >
            <option value="all_staff">Tất cả nhân sự</option>
            <option value="super_admin">Quản trị viên (Super Admin)</option>
            <option value="product_manager">Quản lý Kho & SP (PO)</option>
            <option value="technician">Kỹ thuật viên (Technician)</option>
          </select>

          <select
            className="staff-select-control"
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">Mọi trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Đang bị khóa</option>
          </select>
        </div>

        <div className="staff-count-pill">
          Hiển thị <strong>{rawRows.length}</strong> nhân sự
        </div>
      </div>

      {/* 5. Staff Table */}
      <div className="staff-table-card">
        {loading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: 0 }}>Đang tải danh sách nhân sự…</p>
          </div>
        ) : rawRows.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <ShieldCheck size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <h3 style={{ margin: '0 0 6px', fontSize: '1rem', color: 'var(--text-primary)' }}>Không có nhân viên phù hợp</h3>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Thử thay đổi bộ lọc tìm kiếm hoặc cấp tài khoản nhân viên mới.</p>
          </div>
        ) : (
          <table className="staff-table">
            <thead>
              <tr>
                <th>Nhân sự</th>
                <th>Thông tin liên hệ</th>
                <th>Vai trò & Phân quyền</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rawRows.map(user => {
                const initials = (user.full_name || user.email || 'NV')
                  .split(' ')
                  .filter(Boolean)
                  .map(w => w[0])
                  .slice(-2)
                  .join('')
                  .toUpperCase();

                const isSelf = user.id === currentAuthProfile?.id;
                const hasPendingRole = !!pendingRoleChanges[user.id] && pendingRoleChanges[user.id] !== user.role;

                return (
                  <tr key={user.id} className="staff-table-row">
                    {/* Nhân sự */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          className="staff-avatar-badge"
                          style={{ background: getRoleGradient(user.role) }}
                        >
                          {initials}
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)', display: 'block' }}>
                            {user.full_name || 'Chưa cập nhật tên'} {isSelf && <span style={{ fontSize: '0.75rem', color: 'var(--fpt-orange)', fontWeight: 600 }}>(Bạn)</span>}
                          </strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            ID: {user.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Liên hệ */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem' }}>
                          <Mail size={12} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ color: user.email ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {user.email || '—'}
                          </span>
                        </div>
                        {user.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                            <Phone size={11} style={{ color: 'var(--text-muted)' }} />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Vai trò (CHỈ 3 ROLE NHÂN VIÊN, KHÔNG CHO CHỌN CUSTOMER) */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select
                          className="staff-role-select"
                          disabled={!!busy || isSelf}
                          value={pendingRoleChanges[user.id] || user.role}
                          onChange={e =>
                            setPendingRoleChanges({
                              ...pendingRoleChanges,
                              [user.id]: e.target.value as UserRole,
                            })
                          }
                        >
                          <option value="super_admin">Quản trị viên (Super Admin)</option>
                          <option value="product_manager">Quản lý Kho & SP (PO)</option>
                          <option value="technician">Kỹ thuật viên (Technician)</option>
                        </select>

                        {hasPendingRole && (
                          <button
                            type="button"
                            className="staff-btn"
                            disabled={!!busy}
                            onClick={() => handleChangeRole(user)}
                            style={{ background: '#7c3aed', color: '#fff', borderColor: '#7c3aed' }}
                          >
                            <Check size={12} />
                            <span>Lưu</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Trạng thái */}
                    <td>
                      {user.is_locked ? (
                        <span className="staff-status-badge locked">
                          <Lock size={12} />
                          <span>Đang khóa</span>
                        </span>
                      ) : (
                        <span className="staff-status-badge active">
                          <CheckCircle2 size={12} />
                          <span>Hoạt động</span>
                        </span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="staff-btn"
                          disabled={!!busy}
                          onClick={() => setStaffDetail(user)}
                          title="Xem thông tin cán bộ nhân viên"
                        >
                          <Eye size={13} />
                          <span>Hồ sơ</span>
                        </button>

                        <button
                          type="button"
                          className={`staff-btn ${user.is_locked ? 'success' : 'danger'}`}
                          disabled={!!busy || isSelf}
                          onClick={() => handleOpenLock(user)}
                          title={isSelf ? 'Không thể tự khóa tài khoản của chính mình' : user.is_locked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                        >
                          {user.is_locked ? <Unlock size={13} /> : <Lock size={13} />}
                          <span>{user.is_locked ? 'Mở khóa' : 'Khóa'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 6. Pagination */}
      <Pagination
        page={page}
        totalPages={pages}
        totalElements={total}
        pageSize={20}
        onPageChange={setPage}
        loading={loading}
        itemLabel="nhân sự"
      />

      {/* 7. Modal Cấp Tài Khoản Nhân Viên Mới (CHỈ 3 ROLE NHÂN SỰ) */}
      {openCreateStaff && (
        <div className="fpt-modal-overlay" onClick={() => !busy && setOpenCreateStaff(false)}>
          <div className="fpt-modal-box" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="fpt-modal-header">
              <div>
                <h3>Cấp tài khoản nhân viên mới</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Khởi tạo tài khoản công vụ cho cán bộ quản lý hoặc kỹ thuật viên.
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={busy === 'create'}
                onClick={() => setOpenCreateStaff(false)}
                style={{ padding: '6px', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddStaff}>
              <div className="fpt-modal-body">
                {createStaffError && (
                  <div className="card" style={{ padding: '10px 14px', background: 'var(--fpt-rose-soft)', color: 'var(--fpt-rose)', borderColor: 'var(--fpt-rose)', fontSize: '0.85rem' }}>
                    {createStaffError}
                  </div>
                )}

                <div className="fpt-form-group">
                  <label>Họ và tên cán bộ nhân viên *</label>
                  <input
                    required
                    placeholder="Ví dụ: Lê Thị Thanh"
                    value={staffForm.fullName}
                    onChange={e => setStaffForm({ ...staffForm, fullName: e.target.value })}
                    disabled={busy === 'create'}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div className="fpt-form-group">
                    <label>Email đăng nhập công vụ *</label>
                    <input
                      type="email"
                      required
                      placeholder="thanh.le@smartbox.vn"
                      value={staffForm.email}
                      onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                      disabled={busy === 'create'}
                    />
                  </div>

                  <div className="fpt-form-group">
                    <label>Số điện thoại liên hệ</label>
                    <input
                      type="tel"
                      placeholder="0912345678"
                      value={staffForm.phone}
                      onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })}
                      disabled={busy === 'create'}
                    />
                  </div>
                </div>

                {/* 3 Staff Roles Selection */}
                <div className="fpt-form-group">
                  <label>Chọn vai trò nhân sự *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
                    {[
                      {
                        role: 'super_admin' as const,
                        label: 'Quản trị viên',
                        icon: <Shield size={18} />,
                        desc: 'Toàn quyền cấu hình, nhân sự và kiểm toán.',
                        color: 'var(--fpt-purple)',
                      },
                      {
                        role: 'product_manager' as const,
                        label: 'Quản lý Kho & SP',
                        icon: <Box size={18} />,
                        desc: 'Quản lý sản phẩm, tồn kho, đơn hàng và phê duyệt.',
                        color: 'var(--fpt-blue)',
                      },
                      {
                        role: 'technician' as const,
                        label: 'Kỹ thuật viên',
                        icon: <Wrench size={18} />,
                        desc: 'Giao hàng, lắp đặt tủ và bảo hành tại hiện trường.',
                        color: 'var(--fpt-orange)',
                      },
                    ].map(item => {
                      const isSelected = staffForm.role === item.role;
                      return (
                        <div
                          key={item.role}
                          onClick={() => setStaffForm({ ...staffForm, role: item.role })}
                          style={{
                            border: `2px solid ${isSelected ? item.color : 'var(--border-subtle)'}`,
                            background: isSelected ? 'var(--bg-card)' : 'var(--bg-surface)',
                            borderRadius: '12px',
                            padding: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ color: item.color }}>{item.icon}</div>
                            {isSelected && <CheckCircle2 size={16} style={{ color: item.color }} />}
                          </div>
                          <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{item.label}</strong>
                          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>{item.desc}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="fpt-form-group">
                  <label>Mật khẩu khởi tạo ban đầu *</label>
                  <input
                    type="password"
                    required
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    placeholder="Tối thiểu 12 ký tự (chữ hoa, số, ký tự đặc biệt)"
                    value={staffForm.initialPassword}
                    onChange={e => setStaffForm({ ...staffForm, initialPassword: e.target.value })}
                    disabled={busy === 'create'}
                  />
                  <span className="fpt-form-help">Mật khẩu bảo mật phải có từ 12 ký tự trở lên.</span>
                </div>
              </div>

              <div className="fpt-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy === 'create'}
                  onClick={() => setOpenCreateStaff(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={busy === 'create'}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {busy === 'create' ? <RefreshCw size={14} className="spin" /> : <UserPlus size={14} />}
                  <span>{busy === 'create' ? 'Đang tạo…' : 'Cấp tài khoản'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Modal Khóa / Mở Khóa Tài Khoản */}
      {lockTarget && (
        <div className="fpt-modal-overlay" onClick={() => !busy && setLockTarget(null)}>
          <div className="fpt-modal-box" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="fpt-modal-header">
              <div>
                <h3>{lockTarget.is_locked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {lockTarget.full_name || lockTarget.email}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={!!busy}
                onClick={() => setLockTarget(null)}
                style={{ padding: '6px', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="fpt-modal-body">
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {lockTarget.is_locked
                  ? 'Cán bộ sau khi mở khóa sẽ có thể đăng nhập bình thường vào hệ thống quản trị.'
                  : 'Tài khoản nhân sự khi bị khóa sẽ bị chặn đăng nhập và từ chối mọi thao tác nghiệp vụ.'}
              </p>

              <div className="fpt-form-group">
                <label>Lý do thực hiện *</label>
                <select
                  value={lockReason}
                  onChange={e => setLockReason(e.target.value)}
                  disabled={!!busy}
                >
                  {lockTarget.is_locked ? (
                    <>
                      <option value="Đã xác minh và hoàn tất kiểm tra">Đã xác minh và hoàn tất kiểm tra</option>
                      <option value="Cán bộ nhân viên trở lại công tác">Cán bộ nhân viên trở lại công tác</option>
                      <option value="Khác">Lý do khác...</option>
                    </>
                  ) : (
                    <>
                      <option value="Yêu cầu tạm dừng công tác / xem xét vi phạm">Yêu cầu tạm dừng công tác / xem xét vi phạm</option>
                      <option value="Cán bộ nhân viên đã nghỉ việc">Cán bộ nhân viên đã nghỉ việc</option>
                      <option value="Nghi vấn bảo mật tài khoản">Nghi vấn bảo mật tài khoản</option>
                      <option value="Khác">Lý do khác...</option>
                    </>
                  )}
                </select>
              </div>

              {lockReason === 'Khác' && (
                <div className="fpt-form-group">
                  <label>Chi tiết lý do *</label>
                  <textarea
                    rows={3}
                    placeholder="Nhập lý do cụ thể..."
                    value={lockCustomReason}
                    onChange={e => setLockCustomReason(e.target.value)}
                    disabled={!!busy}
                  />
                </div>
              )}
            </div>

            <div className="fpt-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!!busy}
                onClick={() => setLockTarget(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className={`btn ${lockTarget.is_locked ? 'btn-primary' : 'btn-danger'}`}
                disabled={!!busy}
                onClick={handleConfirmToggleLock}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {busy === lockTarget.id ? <RefreshCw size={14} className="spin" /> : lockTarget.is_locked ? <Unlock size={14} /> : <Lock size={14} />}
                <span>{lockTarget.is_locked ? 'Xác nhận mở khóa' : 'Xác nhận khóa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal Hồ Sơ Cán Bộ Nhân Viên (CHỈ HIỂN THỊ THÔNG TIN NHÂN SỰ, KHÔNG CÓ ĐƠN HÀNG) */}
      {staffDetail && (
        <div className="fpt-modal-overlay" onClick={() => setStaffDetail(null)}>
          <div className="fpt-modal-box" style={{ maxWidth: '540px' }} onClick={e => e.stopPropagation()}>
            <div className="fpt-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="fpt-avatar" style={{ background: getRoleGradient(staffDetail.role), width: 42, height: 42 }}>
                  {(staffDetail.full_name || staffDetail.email || 'NV').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>{staffDetail.full_name || 'Thông tin cán bộ'}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Mã nhân sự: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{staffDetail.id.slice(0, 8)}</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setStaffDetail(null)}
                style={{ padding: '6px', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="fpt-modal-body">
              {/* Card vai trò & phạm vi nghiệp vụ */}
              <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Vai trò hiện tại
                  </span>
                  {getRoleBadge(staffDetail.role)}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: '4px' }}>
                  {getRoleScopeDescription(staffDetail.role)}
                </div>
              </div>

              {/* Thông tin liên hệ công vụ */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                  <Mail size={16} style={{ color: 'var(--text-muted)' }} />
                  <span>Email công vụ: <strong>{staffDetail.email || '—'}</strong></span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                  <Phone size={16} style={{ color: 'var(--text-muted)' }} />
                  <span>Điện thoại: <strong>{staffDetail.phone || 'Chưa cập nhật'}</strong></span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                  <UserCheck size={16} style={{ color: 'var(--text-muted)' }} />
                  <span>Trạng thái tài khoản:{' '}
                    {staffDetail.is_locked ? (
                      <strong style={{ color: 'var(--fpt-rose)' }}>Đang bị khóa</strong>
                    ) : (
                      <strong style={{ color: 'var(--fpt-emerald)' }}>Đang hoạt động bình thường</strong>
                    )}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                  <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                  <span>Ngày khởi tạo: <strong>{new Date(staffDetail.created_at).toLocaleDateString('vi-VN')}</strong></span>
                </div>
              </div>
            </div>

            <div className="fpt-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStaffDetail(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
