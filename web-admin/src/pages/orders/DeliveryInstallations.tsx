import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ShoppingBag,
  Search,
  Calendar,
  Clock,
  User,
  MapPin,
  Phone,
  ExternalLink,
  Play,
  Package,
  Wrench,
  Camera,
  AlertTriangle,
  Send,
  RotateCcw,
  History,
  Check,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  deliveryApi,
  DeliveryApiError,
  Checks,
  Job,
  JobStatus,
  JobSummary,
  Page
} from '../../services/deliveryInstallation';
import { PoDeliveryDispatch } from '../../components/delivery/PoDeliveryDispatch';
import { PoAcceptanceReview } from '../../components/delivery/PoAcceptanceReview';
import { InstallationBacklog } from '../../components/InstallationBacklog';
import './delivery-installations.css';

const statusLabels: Record<JobStatus, { text: string; class: string }> = {
  ASSIGNED: { text: 'Chưa nhận việc', class: 'assigned' },
  IN_PROGRESS: { text: 'Đang thực hiện', class: 'in-progress' },
  DELIVERED: { text: 'Đã giao hàng', class: 'delivered' },
  INSTALLED: { text: 'Đã lắp đặt', class: 'installed' },
  WAITING_PO_CONFIRMATION: { text: 'Chờ PO duyệt nghiệm thu', class: 'waiting' },
  COMPLETED: { text: 'Đã nghiệm thu', class: 'completed' },
  FAILED: { text: 'Cần xử lý lại', class: 'failed' }
};

const formatDate = (val: string | null) => {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return val;
  }
};

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Không xử lý được yêu cầu.');

export const DeliveryInstallations: React.FC = () => {
  const { profile } = useAuth();
  const manager = profile?.role === 'super_admin' || profile?.role === 'product_manager';

  const [list, setList] = useState<Page<JobSummary> | null>(null);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [job, setJob] = useState<Job | null>(null);
  const [checks, setChecks] = useState<Checks | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [technicians, setTechnicians] = useState<{ id: string; fullName: string | null }[]>([]);
  const [eligible, setEligible] = useState<Page<{ id: string; shippingAddress: string | null; createdAt: string }> | null>(null);
  const [eligiblePage, setEligiblePage] = useState(0);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Form states for job actions
  const [orderId, setOrderId] = useState('');
  const [assignee, setAssignee] = useState('');
  const [scheduled, setScheduled] = useState('');
  const [itemId, setItemId] = useState('');
  const [serial, setSerial] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [customerAccepted, setCustomerAccepted] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'list' | 'detail'>('list');

  const selected = useRef<string | null>(null);
  const keys = useRef(new Map<string, string>());
  const keyFor = (identity: string) => {
    if (!keys.current.has(identity)) keys.current.set(identity, crypto.randomUUID());
    return keys.current.get(identity)!;
  };

  const open = useCallback(async (id: string, select = false) => {
    if (select) {
      selected.current = id;
      setJob(null);
      setChecks(null);
      setSerial('');
      setNote('');
      setReason('');
      setCustomerAccepted(false);
      setItemId('');
    }
    setDetailLoading(true);
    let detail: Job;
    let result: Checks;
    try {
      [detail, result] = await Promise.all([deliveryApi.detail(id), deliveryApi.checks(id)]);
    } catch (err) {
      if (err instanceof DeliveryApiError && [401, 403, 404].includes(err.status) && selected.current === id) {
        selected.current = null;
        setJob(null);
        setChecks(null);
      }
      throw err;
    } finally {
      setDetailLoading(false);
    }
    if (selected.current !== id) return;
    setJob((old) => (old?.id === id && old.version > detail.version ? old : detail));
    setChecks((old) => (old?.jobId === id && old.version > result.version ? old : result));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await deliveryApi.list(!manager, page, statusFilter);
      setList(res);

      // Auto-select the first job if none selected so that right column is never blank
      if (res?.content?.length && (!selected.current || !job)) {
        const firstId = res.content[0].id;
        selected.current = firstId;
        void open(firstId).catch(() => {});
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [manager, page, statusFilter, open, job]);

  const planning = useCallback(async () => {
    if (!manager) return;
    const [employees, orders] = await Promise.all([deliveryApi.technicians(), deliveryApi.eligible(eligiblePage)]);
    setTechnicians(employees);
    setEligible(orders);
  }, [manager, eligiblePage]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void planning().catch((e) => setError(errorText(e)));
  }, [planning]);

  const refresh = async () => {
    setError('');
    try {
      await load();
      await planning();
      if (selected.current) await open(selected.current);
    } catch (e) {
      setError(errorText(e));
    }
  };

  const perform = async (action: string, body: unknown) => {
    if (!job || busy) return;
    const id = job.id;
    const identity = `${id}:${job.version}:${action}:${JSON.stringify(body)}`;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await deliveryApi.mutate(job, action, body, keyFor(identity));
      await open(id);
      await load();
      setMessage('Thao tác đã được ghi nhận và đồng bộ thành công!');
      if (action === 'devices') setSerial('');
    } catch (e) {
      setError(errorText(e));
      try {
        await open(id);
      } catch {
        /* Keep unknown outcome visible */
      }
    } finally {
      setBusy(false);
    }
  };

  const working = profile?.role === 'technician' && job?.assignedTo === profile.id;
  const terminal = job?.status === 'COMPLETED' || job?.status === 'FAILED' || job?.orderStatus === 'cancelled';

  // Client-side search filtering
  const filteredJobs = useMemo(() => {
    const items = list?.content || [];
    if (!searchTerm.trim()) return items;
    const q = searchTerm.toLowerCase();
    return items.filter((j) => j.orderId.toLowerCase().includes(q) || j.id.toLowerCase().includes(q));
  }, [list?.content, searchTerm]);

  // Determine stage progression for 4-step stepper
  const getStepStatus = (stepIndex: number): 'done' | 'active' | 'waiting' => {
    if (!job) return 'waiting';
    const s = job.status;
    if (s === 'COMPLETED') return 'done';
    if (stepIndex === 1) {
      return s !== 'ASSIGNED' ? 'done' : 'active';
    }
    if (stepIndex === 2) {
      if (s === 'DELIVERED' || s === 'INSTALLED' || s === 'WAITING_PO_CONFIRMATION') return 'done';
      if (s === 'IN_PROGRESS') return 'active';
      return 'waiting';
    }
    if (stepIndex === 3) {
      if (s === 'INSTALLED' || s === 'WAITING_PO_CONFIRMATION') return 'done';
      if (s === 'DELIVERED') return 'active';
      return 'waiting';
    }
    if (stepIndex === 4) {
      if (s === 'WAITING_PO_CONFIRMATION') return 'active';
      return 'waiting';
    }
    return 'waiting';
  };

  return (
    <div className="di-page">
      {/* 1. Header Toolbar */}
      <header className="di-header">
        <div>
          <h2>
            <Truck size={24} color="#4f46e5" />
            <span>{manager ? 'Điều phối giao & lắp đặt' : 'Công việc giao & lắp đặt của tôi'}</span>
          </h2>
          <p>
            {manager
              ? 'Phân công kỹ thuật viên, theo dõi tiến độ thi công, kiểm tra mã serial và duyệt nghiệm thu đơn hàng.'
              : 'Tiếp nhận ca công việc, kiểm tra thiết bị, liên kết mã serial thực tế và hoàn tất biên bản bàn giao.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {manager && (
            <Link to="/orders" className="fpt-btn fpt-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ShoppingBag size={15} />
              <span>Danh sách đơn hàng</span>
            </Link>
          )}
          <button
            className="fpt-btn fpt-btn-primary"
            disabled={busy || loading}
            onClick={() => void refresh()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={15} className={busy || loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </header>

      {/* 2. Top Metric Bar (Compact Ribbon) */}
      <InstallationBacklog
        revision={job?.version}
        compact={true}
        activeStatus={statusFilter}
        onFilterSelect={(statusKey) => {
          setStatusFilter(statusKey === statusFilter ? '' : statusKey);
          setPage(0);
        }}
      />

      {/* Alert / Notification Feedback */}
      {error && (
        <div className="di-alert" role="alert">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="di-message" role="status">
          <CheckCircle2 size={15} />
          <span>{message}</span>
        </div>
      )}

      {/* 3. PO Dispatch Ribbon for New Orders (Manager only) */}
      {manager && eligible && eligible.totalElements > 0 && (
        <section className="di-compact-dispatch-bar">
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <Calendar size={14} />
            <span>Phân công ({eligible.totalElements} đơn chờ):</span>
          </span>
          <select
            value={orderId}
            disabled={busy}
            onChange={(e) => setOrderId(e.target.value)}
            style={{ flex: 1, padding: '4px 8px', fontSize: '0.78rem', borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'var(--bg-canvas)' }}
          >
            <option value="">-- Chọn đơn đủ điều kiện để phân công kỹ thuật viên --</option>
            {eligible.content.map((o) => (
              <option key={o.id} value={o.id}>
                Đơn #{o.id.slice(0, 8).toUpperCase()} · {o.shippingAddress || 'Chưa có địa chỉ'}
              </option>
            ))}
          </select>
          {orderId && (
            <button className="fpt-btn fpt-btn-secondary di-btn-sm" onClick={() => setOrderId('')}>
              Đóng
            </button>
          )}
        </section>
      )}

      {manager && orderId && (
        <PoDeliveryDispatch
          orderId={orderId}
          orderCode={orderId.slice(0, 8).toUpperCase()}
          onAssigned={async (created) => {
            setOrderId('');
            selected.current = created.id;
            await open(created.id, true);
            await load();
            await planning();
          }}
          onCancel={() => setOrderId('')}
        />
      )}

      {/* 4. Mobile/Tablet Tab Switcher (Visible on <= 1120px) */}
      <div className="di-mobile-nav">
        <button
          type="button"
          className={`di-mobile-tab-btn ${activeMobileTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveMobileTab('list')}
        >
          <Package size={16} />
          <span>Danh sách việc ({list?.totalElements || 0})</span>
        </button>
        <button
          type="button"
          className={`di-mobile-tab-btn ${activeMobileTab === 'detail' ? 'active' : ''}`}
          onClick={() => setActiveMobileTab('detail')}
          disabled={!job}
        >
          <Truck size={16} />
          <span>Chi tiết {job ? `#${job.orderId.slice(0, 8).toUpperCase()}` : ''}</span>
        </button>
      </div>

      {/* 5. Main Master-Detail Workspace Grid */}
      <div className="di-grid">
        {/* ============================================================== */}
        {/* LEFT COLUMN: JOB MASTER LIST                                  */}
        {/* ============================================================== */}
        <section className={`di-card di-master-card ${activeMobileTab === 'list' ? 'mobile-visible' : 'mobile-hidden'}`}>
          <div className="di-card-heading">
            <h3>
              <Package size={16} color="#4f46e5" />
              <span>Danh sách công việc</span>
            </h3>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 999,
                background: 'rgba(79, 70, 229, 0.1)',
                color: '#4f46e5'
              }}
            >
              {list?.totalElements || 0} việc
            </span>
          </div>

          {/* Quick Search */}
          <div className="di-search-input-wrap">
            <Search size={14} className="di-search-icon" />
            <input
              type="text"
              placeholder="Tìm mã đơn hoặc Job ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter Pills */}
          <div className="di-filter-pills">
            {[
              { id: '', label: 'Tất cả' },
              { id: 'ASSIGNED', label: 'Chưa nhận' },
              { id: 'IN_PROGRESS', label: 'Đang làm' },
              { id: 'WAITING_PO_CONFIRMATION', label: 'Chờ duyệt' },
              { id: 'COMPLETED', label: 'Đã xong' }
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                className={`di-pill-btn ${statusFilter === p.id ? 'active' : ''}`}
                onClick={() => {
                  setStatusFilter(p.id);
                  setPage(0);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Loading or Empty State */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              <RefreshCw size={18} className="animate-spin" style={{ marginBottom: 6, color: '#4f46e5' }} />
              <div>Đang tải...</div>
            </div>
          )}

          {!loading && filteredJobs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 8px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              ☕ Không có công việc nào.
            </div>
          )}

          {/* Job List Items */}
          <div className="di-jobs">
            {filteredJobs.map((row) => {
              const isSelected = (job?.id || selected.current) === row.id;
              const badgeCfg = statusLabels[row.status] || { text: row.status, class: 'assigned' };

              return (
                <div
                  key={row.id}
                  className={`di-job status-${row.status} ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    setError('');
                    setActiveMobileTab('detail');
                    void open(row.id, true).catch((e) => setError(errorText(e)));
                  }}
                >
                  <div className="di-job-top">
                    <span className="di-job-code">
                      <Truck size={13} color="#4f46e5" />
                      <span>Đơn #{row.orderId.slice(0, 8).toUpperCase()}</span>
                    </span>

                    <span className={`di-badge ${badgeCfg.class}`}>{badgeCfg.text}</span>
                  </div>

                  <div className="di-job-meta-row">
                    <span className="di-job-time-chip">
                      <Clock size={10} />
                      {formatDate(row.scheduledAt)}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Lượt {row.attempt}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="di-pagination">
            <button
              className="fpt-btn fpt-btn-secondary"
              disabled={busy || page === 0}
              onClick={() => setPage((p) => p - 1)}
              style={{ padding: '3px 8px', fontSize: '0.76rem' }}
            >
              Trước
            </button>
            <span>Trang {page + 1}</span>
            <button
              className="fpt-btn fpt-btn-secondary"
              disabled={busy || !list || page + 1 >= list.totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{ padding: '3px 8px', fontSize: '0.76rem' }}
            >
              Sau
            </button>
          </div>
        </section>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: UNIFIED COMPACT STUDIO WORKSPACE                */}
        {/* ============================================================== */}
        <section className={`di-card di-detail-card ${activeMobileTab === 'detail' ? 'mobile-visible' : 'mobile-hidden'}`} aria-busy={busy}>
          {detailLoading && !job && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
              <RefreshCw size={22} className="animate-spin" style={{ marginBottom: 8, color: '#4f46e5' }} />
              <div>Đang tải chi tiết nhiệm vụ...</div>
            </div>
          )}

          {!job && !detailLoading && (
            <div className="di-empty-workspace">
              <Truck size={40} color="#94a3b8" />
              <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
                Chưa chọn công việc nào
              </h4>
              <p style={{ margin: 0, maxWidth: 320, fontSize: '0.82rem' }}>
                Chọn một công việc từ danh sách bên trái để xem thông tin khách hàng, số Serial và thực hiện thi công.
              </p>
            </div>
          )}

          {job && (
            <>
              {/* Back to list button on mobile/tablet */}
              <div className="di-mobile-back-row">
                <button
                  type="button"
                  className="di-mobile-back-btn"
                  onClick={() => setActiveMobileTab('list')}
                >
                  <ArrowLeft size={14} />
                  <span>Quay lại danh sách công việc</span>
                </button>
              </div>

              {/* 1. Compact Header Bar */}
              <div className="di-compact-header">
                <div className="di-compact-header-left">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Đơn hàng #{job.orderId.slice(0, 8).toUpperCase()}
                    </h3>
                    <span className={`di-badge ${statusLabels[job.status]?.class || 'assigned'}`}>
                      {statusLabels[job.status]?.text || job.status}
                    </span>
                  </div>
                  <div className="di-compact-header-meta">
                    <span>Mã Job: <code>{job.id.slice(0, 8)}</code></span>
                    <span>•</span>
                    <span>Lượt: <b>{job.attempt}</b></span>
                    <span>•</span>
                    <span>Lịch hẹn: <b>{formatDate(job.scheduledAt)}</b></span>
                  </div>
                </div>

                <div className="di-compact-header-actions">
                  {working && job.status === 'ASSIGNED' && job.orderStatus === 'confirmed' && (
                    <button
                      className="fpt-btn fpt-btn-primary di-btn-sm"
                      disabled={busy}
                      onClick={() => void perform('start', undefined)}
                    >
                      <Play size={13} /> Nhận việc & Bắt đầu
                    </button>
                  )}
                  {working && job.status === 'IN_PROGRESS' && (
                    <button
                      className="fpt-btn fpt-btn-primary di-btn-sm"
                      disabled={busy}
                      onClick={() => void perform('confirm-delivery', { note: note || null })}
                    >
                      <Truck size={13} /> Xác nhận đã giao hàng
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Slim Connected Stepper */}
              <div className="di-compact-stepper">
                <div className={`di-mini-step ${getStepStatus(1)}`}>
                  <span className="di-mini-step-num">{getStepStatus(1) === 'done' ? '✓' : '1'}</span>
                  <span>1. Nhận việc</span>
                  {job.startedAt && <span className="di-mini-step-time">({formatDate(job.startedAt).split(' ')[0]})</span>}
                </div>
                <div className="di-stepper-line" />
                <div className={`di-mini-step ${getStepStatus(2)}`}>
                  <span className="di-mini-step-num">{getStepStatus(2) === 'done' ? '✓' : '2'}</span>
                  <span>2. Giao hàng</span>
                  {job.deliveredAt && <span className="di-mini-step-time">({formatDate(job.deliveredAt).split(' ')[0]})</span>}
                </div>
                <div className="di-stepper-line" />
                <div className={`di-mini-step ${getStepStatus(3)}`}>
                  <span className="di-mini-step-num">{getStepStatus(3) === 'done' ? '✓' : '3'}</span>
                  <span>3. Lắp & Serial</span>
                  {job.installedAt && <span className="di-mini-step-time">({formatDate(job.installedAt).split(' ')[0]})</span>}
                </div>
                <div className="di-stepper-line" />
                <div className={`di-mini-step ${getStepStatus(4)}`}>
                  <span className="di-mini-step-num">{getStepStatus(4) === 'done' ? '✓' : '4'}</span>
                  <span>4. Nghiệm thu</span>
                  {job.completedAt && <span className="di-mini-step-time">({formatDate(job.completedAt).split(' ')[0]})</span>}
                </div>
              </div>

              {/* Failure Alert */}
              {job.failureReason && (
                <div className="di-alert">
                  <AlertTriangle size={15} />
                  <span><strong>Lý do thất bại:</strong> {job.failureReason}</span>
                </div>
              )}

              {/* 3. Compact Customer & Location Bar */}
              <div className="di-compact-info-row">
                <div className="di-compact-info-col">
                  <span className="di-info-label"><User size={13} /> Khách:</span>
                  <span className="di-info-val"><b>{job.customer?.fullName || '—'}</b></span>
                  {job.customer?.phone && (
                    <a href={`tel:${job.customer.phone}`} className="di-mini-pill-link tel">
                      <Phone size={10} /> {job.customer.phone}
                    </a>
                  )}
                </div>

                <div className="di-compact-info-col">
                  <span className="di-info-label"><MapPin size={13} /> Đ/C:</span>
                  <span className="di-info-val" title={job.customer?.shippingAddress || ''}>
                    {job.customer?.shippingAddress || 'Chưa có địa chỉ'}
                  </span>
                  {job.customer?.shippingAddress && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.customer.shippingAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="di-mini-pill-link map"
                    >
                      Maps <ExternalLink size={9} />
                    </a>
                  )}
                </div>
              </div>

              {job.customer?.installationNote && (
                <div className="di-compact-note">
                  <strong>📝 Lời dặn:</strong> {job.customer.installationNote}
                </div>
              )}

              {/* 4. Compact Products & Devices Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    MẶT HÀNG & THIẾT BỊ BÀN GIAO ({job.items?.length || 0})
                  </span>
                </div>

                {job.items && job.items.length > 0 && (
                  <div className="di-table-responsive">
                    <table className="di-devices-table">
                      <thead>
                        <tr>
                          <th>Sản phẩm / Biến thể</th>
                          <th>Mã SKU</th>
                          <th style={{ textAlign: 'center' }}>SL</th>
                          <th>Mã Serial máy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {job.items.map((i) => {
                          const linkedDevice = job.devices?.find((d) => d.orderItemId === i.id);
                          return (
                            <tr key={i.id}>
                              <td>
                                <div style={{ fontWeight: 600 }}>{i.productName || 'Thiết bị SmartBox'}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{i.variantName}</div>
                              </td>
                              <td><span className="fpt-sku-pill">{i.sku || 'N/A'}</span></td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>{i.quantity}</td>
                              <td>
                                {linkedDevice ? (
                                  <span className="di-serial-tag done">
                                    <CheckCircle2 size={13} color="#10b981" />
                                    <code>{linkedDevice.serialNumber}</code>
                                  </span>
                                ) : (
                                  <span className="di-serial-tag pending">Chưa gắn Serial</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Serial linking inline form */}
                {working && (job.status === 'IN_PROGRESS' || job.status === 'DELIVERED') && (
                  <form
                    className="di-serial-form-inline"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void perform('devices', { orderItemId: itemId, serialNumber: serial.trim() });
                    }}
                  >
                    <select
                      required
                      value={itemId}
                      disabled={busy}
                      onChange={(e) => setItemId(e.target.value)}
                    >
                      <option value="">-- Gán Serial cho thiết bị --</option>
                      {job.items?.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.productName || i.sku} ({i.variantName})
                        </option>
                      ))}
                    </select>

                    <input
                      required
                      maxLength={100}
                      value={serial}
                      disabled={busy}
                      autoCapitalize="none"
                      onChange={(e) => setSerial(e.target.value)}
                      placeholder="Nhập mã Serial trên thân máy..."
                    />

                    <button
                      type="submit"
                      className="fpt-btn fpt-btn-primary di-btn-sm"
                      disabled={busy || !itemId || !serial.trim()}
                    >
                      <Check size={12} />
                      <span>Gắn Serial</span>
                    </button>
                  </form>
                )}

                {/* Linked hardware checks */}
                {job.devices && job.devices.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: '0.74rem' }}>
                    {job.devices.map((device) => (
                      <span
                        key={device.deviceId}
                        style={{
                          background: 'rgba(79, 70, 229, 0.05)',
                          border: '1px solid rgba(79, 70, 229, 0.2)',
                          padding: '3px 8px',
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <CheckCircle2 size={12} color="#10b981" />
                        <span><b>{device.serialNumber}</b>: Khớp đơn hàng • Thi công đạt chuẩn</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Completion Photos & Notes */}
              {job.completionPhotos && job.completionPhotos.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    ẢNH MINH CHỨNG ({job.completionPhotos.length} ảnh):
                  </span>
                  <div className="di-proof-gallery">
                    {job.completionPhotos.map((photoUrl, index) => (
                      <div key={index} className="di-proof-item">
                        <a href={photoUrl} target="_blank" rel="noopener noreferrer">
                          <img src={photoUrl} alt={`Ảnh ${index + 1}`} />
                        </a>
                      </div>
                    ))}
                  </div>
                  {job.completionNote && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      <b>Ghi chú:</b> {job.completionNote}
                    </div>
                  )}
                </div>
              )}

              {/* 6. PO Acceptance Review */}
              {manager && (job.status === 'WAITING_PO_CONFIRMATION' || job.status === 'COMPLETED') && (
                <PoAcceptanceReview
                  job={job}
                  onUpdated={async (updated) => {
                    setJob(updated);
                    await load();
                  }}
                />
              )}

              {/* 7. Action Toolbar */}
              <div className="di-action-toolbar">
                {working && job.status === 'DELIVERED' && (
                  <div style={{ display: 'flex', gap: 8, width: '100%', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Ghi chú thi công lắp đặt (bắt buộc)..."
                      value={note}
                      disabled={busy}
                      onChange={(e) => setNote(e.target.value)}
                      style={{ flex: 1, padding: '5px 8px', fontSize: '0.78rem', borderRadius: 6, border: '1px solid var(--border-subtle)' }}
                    />
                    <button
                      className="fpt-btn fpt-btn-primary di-btn-sm"
                      disabled={busy || !checks?.serialComplete || !note.trim()}
                      onClick={() => void perform('confirm-installation', { installationNote: note.trim() })}
                    >
                      <Wrench size={13} /> Hoàn tất lắp đặt
                    </button>
                  </div>
                )}

                {working && job.status === 'INSTALLED' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={customerAccepted}
                        disabled={busy}
                        onChange={(e) => setCustomerAccepted(e.target.checked)}
                      />
                      <span>Khách hàng đã ký biên bản nghiệm thu và hài lòng.</span>
                    </label>
                    <button
                      className="fpt-btn fpt-btn-primary di-btn-sm"
                      disabled={busy || !checks?.ready || checks.version !== job.version || !customerAccepted}
                      onClick={() => void perform('acceptance', { customerAccepted, note: note || null })}
                      style={{ background: '#10b981', width: 'fit-content' }}
                    >
                      <CheckCircle2 size={13} /> Nghiệm thu & Hoàn tất
                    </button>
                  </div>
                )}

                {/* Failure reporting inline toggle */}
                {!terminal && (working || manager) && (
                  <details style={{ width: '100%', fontSize: '0.78rem' }}>
                    <summary style={{ cursor: 'pointer', color: '#ef4444', fontWeight: 600 }}>
                      Báo cáo sự cố ca thi công...
                    </summary>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <input
                        type="text"
                        placeholder="Lý do (khách vắng nhà, hàng lỗi...)"
                        value={reason}
                        disabled={busy}
                        onChange={(e) => setReason(e.target.value)}
                        style={{ flex: 1, padding: '4px 8px', fontSize: '0.78rem', borderRadius: 6, border: '1px solid var(--border-subtle)' }}
                      />
                      <button
                        className="fpt-btn fpt-btn-secondary di-btn-sm"
                        disabled={busy || !reason.trim()}
                        onClick={() => void perform('fail', { failureReason: reason.trim() })}
                        style={{ color: '#ef4444' }}
                      >
                        Xác nhận thất bại
                      </button>
                    </div>
                  </details>
                )}
              </div>

              {/* 8. Reassign Box for Manager if Failed */}
              {manager && job.orderStatus === 'confirmed' && (job.status === 'FAILED' || job.status === 'ASSIGNED') && (
                <div style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RotateCcw size={13} />
                    <span>Phân công lại nhân viên:</span>
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 6 }}>
                    <select
                      value={assignee}
                      disabled={busy}
                      onChange={(e) => setAssignee(e.target.value)}
                      style={{ padding: '4px 8px', fontSize: '0.78rem', borderRadius: 6, border: '1px solid var(--border-subtle)' }}
                    >
                      <option value="">-- Chọn kỹ thuật viên --</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>{t.fullName || t.id}</option>
                      ))}
                    </select>
                    <input
                      type="datetime-local"
                      value={scheduled}
                      disabled={busy}
                      onChange={(e) => setScheduled(e.target.value)}
                      style={{ padding: '4px 8px', fontSize: '0.78rem', borderRadius: 6, border: '1px solid var(--border-subtle)' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      placeholder="Lý do phân công lại..."
                      value={reason}
                      disabled={busy}
                      onChange={(e) => setReason(e.target.value)}
                      style={{ flex: 1, padding: '4px 8px', fontSize: '0.78rem', borderRadius: 6, border: '1px solid var(--border-subtle)' }}
                    />
                    <button
                      className="fpt-btn fpt-btn-primary di-btn-sm"
                      disabled={busy || !assignee || !scheduled || !reason.trim()}
                      onClick={() => {
                        const time = new Date(scheduled);
                        if (!Number.isFinite(time.getTime())) {
                          setError('Lịch hẹn không hợp lệ.');
                          return;
                        }
                        void perform('reassign', {
                          assignedTo: assignee,
                          scheduledAt: time.toISOString(),
                          reason: reason.trim()
                        });
                      }}
                    >
                      Phân công lại
                    </button>
                  </div>
                </div>
              )}

              {/* 9. Collapsible History */}
              {job.history && job.history.length > 0 && (
                <details style={{ marginTop: 2, fontSize: '0.76rem' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Nhật ký lịch sử ({job.history.length} thao tác)
                  </summary>
                  <ol style={{ paddingLeft: 16, margin: '4px 0', lineHeight: 1.5 }}>
                    {job.history.map((h, i) => (
                      <li key={`${h.version}:${h.action}:${i}`}>
                        <b>{h.action}</b> ➔ <span>{statusLabels[h.toStatus as JobStatus]?.text || h.toStatus}</span>
                        <span style={{ color: 'var(--text-secondary)', marginLeft: 6 }}>({formatDate(h.createdAt)})</span>
                        {h.reason && <span style={{ color: '#ef4444', marginLeft: 6 }}>[{h.reason}]</span>}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};
