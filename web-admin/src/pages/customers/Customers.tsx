import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { customerDirectoryApi, type CustomerContact } from '../../services/customerDirectoryApi';
import { adminRequest } from '../../services/adminRequest';
import { useAuth } from '../../contexts/AuthContext';
import { Pagination } from '../../components/Pagination';
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Edit,
  ExternalLink,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  ShoppingBag,
  Cpu,
  Wrench,
  Eye,
  Calendar,
  FileText,
  Copy,
  Clock
} from 'lucide-react';
import './customers.css';

interface CustomerDraft {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  createLogin: boolean;
  username: string;
  password: string;
  confirmPassword: string;
  archived: boolean;
}

const emptyDraft: CustomerDraft = {
  fullName: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
  createLogin: false,
  username: '',
  password: '',
  confirmPassword: '',
  archived: false,
};

export const CustomersPage: React.FC = () => {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';

  const [rows, setRows] = useState<CustomerContact[]>([]);
  const [search, setSearch] = useState('');
  const [account, setAccount] = useState('all');
  const [state, setState] = useState('active');
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);

  // Modal Add / Edit
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerContact | null>(null);
  const [draft, setDraft] = useState<CustomerDraft>(emptyDraft);
  const creationKey = useRef('');

  // Modal Customer 360 & Recent Orders
  const [viewCustomer, setViewCustomer] = useState<CustomerContact | null>(null);
  const [customerOrdersData, setCustomerOrdersData] = useState<any>(null);
  const [loadingCustomerOrders, setLoadingCustomerOrders] = useState(false);
  const [c360ActiveTab, setC360ActiveTab] = useState<'orders' | 'devices' | 'warranties'>('orders');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1800);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const timer = setTimeout(() => {
      customerDirectoryApi
        .list(page, search, account, state)
        .then(data => {
          if (active) {
            setRows(data.content);
            setPages(data.totalPages);
            setTotal(data.totalElements);
          }
        })
        .catch(e => {
          if (active) {
            setError(e.message);
            setRows([]);
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
  }, [page, search, account, state, revision]);

  useEffect(() => {
    setPage(0);
  }, [search, account, state]);

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    setDraft(emptyDraft);
    setFormError('');
  };

  const handleAdd = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setFormError('');
    creationKey.current = crypto.randomUUID();
    setOpen(true);
  };

  const handleEdit = (customer: CustomerContact) => {
    setEditing(customer);
    setFormError('');
    setDraft({
      ...emptyDraft,
      fullName: customer.fullName,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      notes: customer.notes || '',
      archived: customer.archived,
    });
    setOpen(true);
  };

  const handleViewCustomerProfile = async (customer: CustomerContact) => {
    setViewCustomer(customer);
    setCustomerOrdersData(null);
    setC360ActiveTab('orders');

    if (customer.profileId) {
      setLoadingCustomerOrders(true);
      try {
        const details = await adminRequest<any>(`/users/${customer.profileId}/details`);
        setCustomerOrdersData(details);
      } catch (err) {
        console.error('Error fetching customer 360 details:', err);
      } finally {
        setLoadingCustomerOrders(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setFormError('');

    if (draft.createLogin && draft.password !== draft.confirmPassword) {
      setFormError('Mật khẩu xác nhận chưa khớp với mật khẩu mới.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const contact = {
        fullName: draft.fullName.trim(),
        email: draft.email.trim() || null,
        phone: draft.phone.trim() || null,
        address: draft.address.trim() || null,
        notes: draft.notes.trim() || null,
      };

      if (editing) {
        await customerDirectoryApi.update(editing.id, {
          ...contact,
          archived: draft.archived,
        });
      } else {
        await customerDirectoryApi.create(
          {
            ...contact,
            createLogin: draft.createLogin,
            ...(draft.createLogin
              ? { username: draft.username.trim(), password: draft.password }
              : {}),
          },
          creationKey.current
        );
      }

      setMessage(
        editing
          ? 'Đã cập nhật hồ sơ khách hàng thành công.'
          : draft.createLogin
          ? 'Đã thêm khách hàng mới và cấp tài khoản đăng nhập.'
          : 'Đã thêm hồ sơ khách hàng thành công.'
      );
      handleClose();
      setRevision(r => r + 1);
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // KPI calculations
  const countWithAccount = useMemo(() => rows.filter(r => !!r.profileId).length, [rows]);
  const countWithoutAccount = useMemo(() => rows.filter(r => !r.profileId).length, [rows]);
  const countActive = useMemo(() => rows.filter(r => !r.archived).length, [rows]);

  return (
    <div className="customer-page-container">
      {/* 1. Header Ribbon */}
      <div className="customer-header-ribbon">
        <div className="customer-header-title-group">
          <div className="customer-header-icon">
            <Users size={22} />
          </div>
          <div>
            <h1 className="customer-header-title">Danh Bạ Khách Hàng</h1>
            <p className="customer-header-desc">
              Quản lý hồ sơ khách hàng, xem lịch sử đơn hàng, thiết bị sở hữu và đồng bộ tài khoản mua sắm trực tuyến.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAdd}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <UserPlus size={15} />
            <span>Thêm khách hàng</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading}
            onClick={() => setRevision(r => r + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. Executive 4-Card Metric Grid */}
      <div className="customer-kpi-grid">
        <div className="customer-kpi-card">
          <div className="customer-kpi-bubble" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <Users size={20} />
          </div>
          <div className="customer-kpi-meta">
            <span className="customer-kpi-label">Tổng khách hàng</span>
            <div className="customer-kpi-value">{total}</div>
            <div className="customer-kpi-sub">Hồ sơ trong hệ thống</div>
          </div>
        </div>

        <div className="customer-kpi-card">
          <div className="customer-kpi-bubble" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <UserCheck size={20} />
          </div>
          <div className="customer-kpi-meta">
            <span className="customer-kpi-label">Có tài khoản web/app</span>
            <div className="customer-kpi-value" style={{ color: '#10b981' }}>{countWithAccount}</div>
            <div className="customer-kpi-sub">Đã kích hoạt đăng nhập</div>
          </div>
        </div>

        <div className="customer-kpi-card">
          <div className="customer-kpi-bubble" style={{ background: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8' }}>
            <FileText size={20} />
          </div>
          <div className="customer-kpi-meta">
            <span className="customer-kpi-label">Hồ sơ mua lẻ</span>
            <div className="customer-kpi-value" style={{ color: 'var(--text-secondary)' }}>{countWithoutAccount}</div>
            <div className="customer-kpi-sub">Chưa tạo tài khoản</div>
          </div>
        </div>

        <div className="customer-kpi-card">
          <div className="customer-kpi-bubble" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <ShieldCheck size={20} />
          </div>
          <div className="customer-kpi-meta">
            <span className="customer-kpi-label">Đang quản lý</span>
            <div className="customer-kpi-value" style={{ color: '#f59e0b' }}>{countActive}</div>
            <div className="customer-kpi-sub">Hồ sơ đang mở hoạt động</div>
          </div>
        </div>
      </div>

      {/* 3. Alerts */}
      {message && (
        <div className="card" style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.25)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem' }}>
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="card" style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.25)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Filter Toolbar */}
      <div className="customer-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: '1 1 auto' }}>
          <div className="customer-search-box">
            <Search size={15} className="customer-search-icon" />
            <input
              type="text"
              placeholder="Tìm theo tên, email, số điện thoại…"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>

          <select
            className="customer-select-control"
            value={account}
            onChange={e => {
              setAccount(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">Mọi loại khách hàng</option>
            <option value="with">Đã có tài khoản đăng nhập</option>
            <option value="without">Chưa có tài khoản</option>
          </select>

          <select
            className="customer-select-control"
            value={state}
            onChange={e => {
              setState(e.target.value);
              setPage(0);
            }}
          >
            <option value="active">Đang quản lý</option>
            <option value="archived">Đã lưu trữ</option>
            <option value="all">Mọi trạng thái</option>
          </select>
        </div>

        <div className="customer-count-pill">
          Hiển thị <strong>{rows.length}</strong> / {total} khách hàng
        </div>
      </div>

      {/* Updating indicator when refetching or paginating */}
      {loading && rows.length > 0 && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 12px',
          borderRadius: 6,
          background: 'rgba(249, 115, 22, 0.1)',
          border: '1px solid rgba(249, 115, 22, 0.25)',
          color: 'var(--fpt-orange, #ea580c)',
          fontSize: '12px',
          fontWeight: 600
        }}>
          <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>↻</span>
          <span>Đang cập nhật danh sách khách hàng…</span>
        </div>
      )}

      {/* 5. Customer Table */}
      <div
        className="customer-table-card"
        style={{
          opacity: loading && rows.length > 0 ? 0.65 : 1,
          transition: 'opacity 0.2s ease',
          pointerEvents: loading && rows.length > 0 ? 'none' : 'auto'
        }}
      >
        {loading && rows.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Đang tải dữ liệu khách hàng…</p>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <h3 style={{ margin: '0 0 6px', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Không có khách hàng phù hợp</h3>
            <p style={{ margin: 0, fontSize: '0.8rem' }}>Thử thay đổi bộ lọc tìm kiếm hoặc thêm khách hàng mới.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="customer-table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Thông tin liên hệ</th>
                  <th>Tài khoản hệ thống</th>
                  <th>Địa chỉ nhận hàng</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(customer => {
                  const initials = (customer.fullName || 'KH')
                    .split(' ')
                    .filter(Boolean)
                    .map(w => w[0])
                    .slice(-2)
                    .join('')
                    .toUpperCase();

                  const customerCode = customer.archived ? 'LƯU TRỮ' : `KH-${customer.id.slice(0, 8).toUpperCase()}`;

                  return (
                    <tr key={customer.id} className="customer-table-row">
                      {/* Khách hàng */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            className="customer-avatar-badge"
                            style={{
                              background: customer.profileId
                                ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                                : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)', display: 'block' }}>
                              {customer.fullName}
                            </strong>
                            <span
                              className="customer-code-chip"
                              onClick={() => handleCopyText(customerCode)}
                              title="Bấm sao chép mã KH"
                              style={{ cursor: 'pointer' }}
                            >
                              {customerCode}
                              {copiedText === customerCode ? ' ✓' : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Liên hệ */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Mail size={12} style={{ color: 'var(--text-muted)' }} />
                            {customer.email ? (
                              <a href={`mailto:${customer.email}`} className="customer-contact-link">
                                {customer.email}
                              </a>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Chưa có email</span>
                            )}
                          </div>
                          {customer.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Phone size={11} style={{ color: 'var(--text-muted)' }} />
                              <a href={`tel:${customer.phone}`} className="customer-phone-link">
                                {customer.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Tài khoản */}
                      <td>
                        {customer.profileId ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span className="customer-account-tag active">
                              <CheckCircle2 size={11} />
                              <span>Có tài khoản</span>
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {customer.username ? `@${customer.username}` : 'Đăng nhập email'} ·{' '}
                              {customer.isLocked ? (
                                <strong style={{ color: 'var(--fpt-rose, #ef4444)' }}>Đang khóa</strong>
                              ) : (
                                <span style={{ color: '#10b981' }}>Hoạt động</span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="customer-account-tag retail">
                            <span>Chưa tạo tài khoản</span>
                          </span>
                        )}
                      </td>

                      {/* Địa chỉ */}
                      <td style={{ maxWidth: '280px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.8rem', color: customer.address ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                          <MapPin size={13} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--text-muted)' }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={customer.address || ''}>
                            {customer.address || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Thao tác */}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="customer-action-btn primary"
                            onClick={() => handleViewCustomerProfile(customer)}
                            title="Xem hồ sơ chi tiết và lịch sử đơn hàng của khách"
                          >
                            <Eye size={12} />
                            <span>Hồ sơ & Đơn</span>
                          </button>

                          <button
                            type="button"
                            className="customer-action-btn"
                            onClick={() => handleEdit(customer)}
                            title="Chỉnh sửa thông tin khách hàng"
                          >
                            <Edit size={12} />
                            <span>Sửa</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
        itemLabel="khách hàng"
      />

      {/* 7. Modal Customer 360 Dossier & History */}
      {viewCustomer && (
        <div className="fpt-modal-overlay" onClick={() => setViewCustomer(null)}>
          <div className="c360-modal-box" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="c360-header">
              <div className="c360-hero-group">
                <div
                  className="c360-avatar-large"
                  style={{
                    background: viewCustomer.profileId
                      ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                      : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                  }}
                >
                  {(viewCustomer.fullName || 'KH').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="c360-title">
                    <span>{viewCustomer.fullName}</span>
                    {viewCustomer.profileId && !viewCustomer.isLocked && (
                      <span className="customer-account-tag active" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        Hoạt động
                      </span>
                    )}
                  </h3>
                  <div className="c360-subtitle">
                    <span
                      className="customer-code-chip"
                      onClick={() => handleCopyText(viewCustomer.id.slice(0, 8).toUpperCase())}
                      title="Bấm sao chép mã KH"
                      style={{ cursor: 'pointer' }}
                    >
                      Mã KH: {viewCustomer.id.slice(0, 8).toUpperCase()}
                      {copiedText === viewCustomer.id.slice(0, 8).toUpperCase() ? ' ✓' : ''}
                    </span>
                    {viewCustomer.username && (
                      <span style={{ color: '#3b82f6', fontWeight: 600 }}>@{viewCustomer.username}</span>
                    )}
                    <span style={{ color: 'var(--text-muted)' }}>
                      • Tạo ngày {new Date(viewCustomer.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="customer-action-btn"
                onClick={() => setViewCustomer(null)}
                style={{ padding: '6px 8px' }}
                title="Đóng cửa sổ hồ sơ"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="c360-body">
              {/* 1. Contact Info 3-Tile Grid */}
              <div className="c360-contact-grid">
                <div className="c360-contact-tile">
                  <span className="c360-contact-tile-label">
                    <Mail size={12} /> Email liên hệ
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span className="c360-contact-tile-val" title={viewCustomer.email || ''}>
                      {viewCustomer.email || 'Chưa cập nhật'}
                    </span>
                    {viewCustomer.email && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(viewCustomer.email!)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                        title="Sao chép email"
                      >
                        {copiedText === viewCustomer.email ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={11} />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="c360-contact-tile">
                  <span className="c360-contact-tile-label">
                    <Phone size={12} /> Số điện thoại
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span className="c360-contact-tile-val">
                      {viewCustomer.phone ? (
                        <a href={`tel:${viewCustomer.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {viewCustomer.phone}
                        </a>
                      ) : (
                        'Chưa cập nhật'
                      )}
                    </span>
                    {viewCustomer.phone && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(viewCustomer.phone!)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                        title="Sao chép số điện thoại"
                      >
                        {copiedText === viewCustomer.phone ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={11} />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="c360-contact-tile">
                  <span className="c360-contact-tile-label">
                    <MapPin size={12} /> Địa chỉ giao hàng
                  </span>
                  <span className="c360-contact-tile-val" title={viewCustomer.address || ''}>
                    {viewCustomer.address || 'Chưa có địa chỉ'}
                  </span>
                </div>
              </div>

              {/* 2. Customer Notes */}
              {viewCustomer.notes && (
                <div className="c360-notes-quote">
                  <strong>Ghi chú chăm sóc khách hàng: </strong>
                  <span>"{viewCustomer.notes}"</span>
                </div>
              )}

              {/* 3. Three Executive Metric Cards */}
              <div className="c360-metrics-row">
                <div className="c360-metric-tile">
                  <div className="c360-metric-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                    <ShoppingBag size={20} />
                  </div>
                  <div>
                    <div className="c360-metric-title">Tổng đơn hàng</div>
                    <div className="c360-metric-number">
                      {(customerOrdersData?.orders || []).length}
                    </div>
                  </div>
                </div>

                <div className="c360-metric-tile">
                  <div className="c360-metric-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                    <Cpu size={20} />
                  </div>
                  <div>
                    <div className="c360-metric-title">Thiết bị sở hữu</div>
                    <div className="c360-metric-number" style={{ color: '#10b981' }}>
                      {(customerOrdersData?.devices || []).length}
                    </div>
                  </div>
                </div>

                <div className="c360-metric-tile">
                  <div className="c360-metric-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                    <Wrench size={20} />
                  </div>
                  <div>
                    <div className="c360-metric-title">Yêu cầu bảo hành</div>
                    <div className="c360-metric-number" style={{ color: '#f59e0b' }}>
                      {(customerOrdersData?.warrantyClaims || []).length}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Tabbed Content */}
              <div>
                <div className="c360-tabs-header">
                  <button
                    type="button"
                    className={`c360-tab-btn ${c360ActiveTab === 'orders' ? 'active' : ''}`}
                    onClick={() => setC360ActiveTab('orders')}
                  >
                    <ShoppingBag size={13} />
                    <span>Lịch sử đơn hàng</span>
                    <span className="c360-tab-count">{(customerOrdersData?.orders || []).length}</span>
                  </button>

                  <button
                    type="button"
                    className={`c360-tab-btn ${c360ActiveTab === 'devices' ? 'active' : ''}`}
                    onClick={() => setC360ActiveTab('devices')}
                  >
                    <Cpu size={13} />
                    <span>Thiết bị SmartBox</span>
                    <span className="c360-tab-count">{(customerOrdersData?.devices || []).length}</span>
                  </button>

                  <button
                    type="button"
                    className={`c360-tab-btn ${c360ActiveTab === 'warranties' ? 'active' : ''}`}
                    onClick={() => setC360ActiveTab('warranties')}
                  >
                    <Wrench size={13} />
                    <span>Bảo hành & Hỗ trợ</span>
                    <span className="c360-tab-count">{(customerOrdersData?.warrantyClaims || []).length}</span>
                  </button>
                </div>

                <div style={{ marginTop: '12px' }}>
                  {loadingCustomerOrders ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px' }} />
                      <p style={{ margin: 0, fontSize: '0.825rem' }}>Đang tải dữ liệu hồ sơ 360°…</p>
                    </div>
                  ) : !viewCustomer.profileId ? (
                    <div className="c360-empty-card">
                      <FileText size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Khách hàng mua lẻ (Vãng lai)</div>
                      <div style={{ fontSize: '0.78rem' }}>Khách hàng này chưa liên kết tài khoản trực tuyến nên chưa có dữ liệu giao dịch Web/App.</div>
                    </div>
                  ) : c360ActiveTab === 'orders' ? (
                    /* Tab 1: Orders */
                    !customerOrdersData?.orders || customerOrdersData.orders.length === 0 ? (
                      <div className="c360-empty-card">
                        <ShoppingBag size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Chưa phát sinh đơn hàng</div>
                        <div style={{ fontSize: '0.78rem' }}>Khách hàng chưa có lịch sử mua sắm nào trên hệ thống.</div>
                      </div>
                    ) : (
                      <div className="customer-table-card" style={{ boxShadow: 'none' }}>
                        <table className="customer-table">
                          <thead>
                            <tr>
                              <th>Mã đơn</th>
                              <th>Ngày tạo</th>
                              <th>Trạng thái</th>
                              <th>Tổng thanh toán</th>
                              <th style={{ textAlign: 'right' }}>Chi tiết</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerOrdersData.orders.map((o: any) => (
                              <tr key={o.id} className="customer-table-row">
                                <td>
                                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ea580c' }}>
                                    #{o.id.slice(0, 8).toUpperCase()}
                                  </span>
                                </td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.775rem' }}>
                                  {o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—'}
                                </td>
                                <td>
                                  <span className="customer-account-tag active" style={{ fontSize: '0.7rem' }}>
                                    {o.status}
                                  </span>
                                </td>
                                <td>
                                  <strong style={{ color: 'var(--text-primary)' }}>
                                    {Number(o.total || o.totalAmount || 0).toLocaleString('vi-VN')} ₫
                                  </strong>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <Link
                                    to={`/orders/${o.id}`}
                                    className="customer-action-btn primary"
                                    style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                    title="Xem chi tiết đơn hàng này"
                                  >
                                    <span>Xem đơn</span>
                                    <ExternalLink size={10} />
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : c360ActiveTab === 'devices' ? (
                    /* Tab 2: Devices */
                    !customerOrdersData?.devices || customerOrdersData.devices.length === 0 ? (
                      <div className="c360-empty-card">
                        <Cpu size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Chưa có thiết bị sở hữu</div>
                        <div style={{ fontSize: '0.78rem' }}>Khách hàng chưa kích hoạt tủ SmartBox nào trên tài khoản.</div>
                      </div>
                    ) : (
                      <div className="customer-table-card" style={{ boxShadow: 'none' }}>
                        <table className="customer-table">
                          <thead>
                            <tr>
                              <th>Mã Serial</th>
                              <th>Model thiết bị</th>
                              <th>Trạng thái</th>
                              <th>Ngày kích hoạt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerOrdersData.devices.map((d: any) => (
                              <tr key={d.id} className="customer-table-row">
                                <td>
                                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {d.serialNumber || 'SBX-SER-001'}
                                  </span>
                                </td>
                                <td>{d.modelName || 'SmartBox IoT Standard'}</td>
                                <td>
                                  <span className="customer-account-tag active" style={{ fontSize: '0.7rem' }}>
                                    {d.status || 'Hoạt động'}
                                  </span>
                                </td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.775rem' }}>
                                  {d.activatedAt ? new Date(d.activatedAt).toLocaleDateString('vi-VN') : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : (
                    /* Tab 3: Warranties */
                    !customerOrdersData?.warrantyClaims || customerOrdersData.warrantyClaims.length === 0 ? (
                      <div className="c360-empty-card">
                        <Wrench size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Không có sự cố bảo hành</div>
                        <div style={{ fontSize: '0.78rem' }}>Khách hàng chưa gửi yêu cầu hỗ trợ hoặc bảo hành kỹ thuật nào.</div>
                      </div>
                    ) : (
                      <div className="customer-table-card" style={{ boxShadow: 'none' }}>
                        <table className="customer-table">
                          <thead>
                            <tr>
                              <th>Mã yêu cầu</th>
                              <th>Serial</th>
                              <th>Mô tả sự cố</th>
                              <th>Trạng thái</th>
                              <th>Ngày gửi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerOrdersData.warrantyClaims.map((w: any) => (
                              <tr key={w.id} className="customer-table-row">
                                <td>
                                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                                    #{w.id.slice(0, 8).toUpperCase()}
                                  </span>
                                </td>
                                <td>
                                  <code style={{ color: '#ea580c' }}>{w.serialNumber}</code>
                                </td>
                                <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {w.description}
                                </td>
                                <td>
                                  <span className="customer-account-tag active" style={{ fontSize: '0.7rem' }}>
                                    {w.status}
                                  </span>
                                </td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.775rem' }}>
                                  {w.createdAt ? new Date(w.createdAt).toLocaleDateString('vi-VN') : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="c360-footer">
              <button
                type="button"
                className="customer-action-btn"
                onClick={() => {
                  const target = viewCustomer;
                  setViewCustomer(null);
                  handleEdit(target);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Edit size={13} />
                <span>Chỉnh sửa hồ sơ khách</span>
              </button>

              <button
                type="button"
                className="customer-action-btn"
                onClick={() => setViewCustomer(null)}
              >
                Đóng hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal Thêm / Cập Nhật Khách Hàng */}
      {open && (
        <div className="fpt-modal-overlay" onClick={() => !busy && handleClose()}>
          <div className="fpt-modal-box" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="fpt-modal-header">
              <div>
                <h3>{editing ? 'Cập nhật hồ sơ khách hàng' : 'Thêm khách hàng mới'}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {editing ? editing.fullName : 'Điền thông tin liên hệ và tùy chọn cấp tài khoản đăng nhập.'}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={busy}
                onClick={handleClose}
                style={{ padding: '6px', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="fpt-modal-body">
                {formError && (
                  <div className="card" style={{ padding: '10px 14px', background: 'var(--fpt-rose-soft)', color: 'var(--fpt-rose)', borderColor: 'var(--fpt-rose)', fontSize: '0.85rem' }}>
                    {formError}
                  </div>
                )}

                {/* Phần 1: Thông tin liên hệ */}
                <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--fpt-blue)', marginBottom: '-6px' }}>
                  1. Thông tin liên hệ
                </div>

                <div className="fpt-form-group">
                  <label>Họ và tên khách hàng *</label>
                  <input
                    required
                    maxLength={200}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    value={draft.fullName}
                    onChange={e => setDraft({ ...draft, fullName: e.target.value })}
                    disabled={busy}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div className="fpt-form-group">
                    <label>Địa chỉ Email {draft.createLogin ? '*' : ''}</label>
                    <input
                      type="email"
                      required={draft.createLogin}
                      maxLength={254}
                      placeholder="khachhang@example.com"
                      value={draft.email}
                      onChange={e => setDraft({ ...draft, email: e.target.value })}
                      disabled={busy || !!editing?.profileId}
                    />
                    {editing?.profileId && (
                      <span className="fpt-form-help">Email tài khoản đã liên kết Supabase Auth.</span>
                    )}
                  </div>

                  <div className="fpt-form-group">
                    <label>Số điện thoại</label>
                    <input
                      type="tel"
                      pattern={String.raw`[+]?(?:[0-9]| |\(|\)|-){8,30}`}
                      placeholder="0987654321"
                      value={draft.phone}
                      onChange={e => setDraft({ ...draft, phone: e.target.value })}
                      disabled={busy}
                    />
                  </div>
                </div>

                <div className="fpt-form-group">
                  <label>Địa chỉ nhận hàng mặc định</label>
                  <input
                    maxLength={2000}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
                    value={draft.address}
                    onChange={e => setDraft({ ...draft, address: e.target.value })}
                    disabled={busy}
                  />
                </div>

                <div className="fpt-form-group">
                  <label>Ghi chú chăm sóc khách hàng</label>
                  <textarea
                    rows={2}
                    maxLength={2000}
                    placeholder="Ghi chú sở thích, thời gian nhận hàng thuận tiện..."
                    value={draft.notes}
                    onChange={e => setDraft({ ...draft, notes: e.target.value })}
                    disabled={busy}
                  />
                </div>

                {/* Phần 2: Cấp tài khoản đăng nhập (khi tạo mới) */}
                {!editing && (
                  <>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--fpt-orange)', marginTop: '8px', marginBottom: '-6px' }}>
                      2. Tài khoản mua sắm trực tuyến
                    </div>

                    <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={draft.createLogin}
                          disabled={busy || !isSuperAdmin}
                          onChange={e =>
                            setDraft({
                              ...draft,
                              createLogin: e.target.checked,
                              username: '',
                              password: '',
                              confirmPassword: '',
                            })
                          }
                          style={{ width: '18px', height: '18px', accentColor: 'var(--fpt-orange)' }}
                        />
                        <span>Cấp tài khoản đăng nhập Web/App cho khách</span>
                      </label>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {isSuperAdmin
                          ? 'Bật tùy chọn này để tạo username và mật khẩu cho khách. Nếu tắt, thông tin chỉ lưu trong danh bạ.'
                          : 'Chỉ Quản trị viên (Super Admin) mới có quyền cấp tài khoản đăng nhập mới.'}
                      </p>

                      {draft.createLogin && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                          <div className="fpt-form-group">
                            <label>Tên đăng nhập (Username) *</label>
                            <input
                              required
                              minLength={3}
                              maxLength={32}
                              pattern={String.raw`[A-Za-z0-9][A-Za-z0-9_.\-]{2,31}`}
                              autoComplete="off"
                              placeholder="an.nguyen (3–32 ký tự, không dấu cách)"
                              value={draft.username}
                              onChange={e => setDraft({ ...draft, username: e.target.value })}
                              disabled={busy}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                            <div className="fpt-form-group">
                              <label>Mật khẩu ban đầu *</label>
                              <input
                                type="password"
                                required
                                minLength={8}
                                maxLength={72}
                                autoComplete="new-password"
                                placeholder="Tối thiểu 8 ký tự"
                                value={draft.password}
                                onChange={e => setDraft({ ...draft, password: e.target.value })}
                                disabled={busy}
                              />
                            </div>

                            <div className="fpt-form-group">
                              <label>Xác nhận mật khẩu *</label>
                              <input
                                type="password"
                                required
                                minLength={8}
                                maxLength={72}
                                autoComplete="new-password"
                                placeholder="Nhập lại mật khẩu"
                                value={draft.confirmPassword}
                                onChange={e => setDraft({ ...draft, confirmPassword: e.target.value })}
                                disabled={busy}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Phần lưu trữ khi sửa */}
                {editing && (
                  <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={draft.archived}
                        onChange={e => setDraft({ ...draft, archived: e.target.checked })}
                        disabled={busy}
                      />
                      <span>Lưu trữ hồ sơ này (Ẩn khỏi danh bạ chính mà không khóa tài khoản)</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="fpt-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={handleClose}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={busy}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {busy ? <RefreshCw size={14} className="spin" /> : <Check size={14} />}
                  <span>{busy ? 'Đang lưu…' : editing ? 'Lưu cập nhật' : 'Thêm khách hàng'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
