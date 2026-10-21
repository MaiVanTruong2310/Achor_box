import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { adminRequest } from '../../services/adminRequest';
import { useAuth } from '../../contexts/AuthContext';
import './warranties.css';
import {
  Wrench,
  Search,
  Filter,
  RefreshCw,
  User,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  Clock3,
  XCircle,
  Eye,
  ExternalLink,
  QrCode,
  X,
  Copy,
  Check,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  LayoutList,
  LayoutGrid
} from 'lucide-react';

interface Claim {
  id: string;
  description: string;
  images: string[];
  status: string;
  assignedTo: string | null;
  assigneeName: string | null;
  internalNotes: string | null;
  serialNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  createdAt: string;
}

interface Technician {
  id: string;
  fullName: string;
  phone: string | null;
}

const statusMeta: Record<string, { label: string; badgeClass: string; icon: React.ReactNode }> = {
  new: { label: 'Mới tiếp nhận', badgeClass: 'fpt-badge-info', icon: <AlertCircle size={13} /> },
  assigned: { label: 'Đã phân công', badgeClass: 'fpt-badge-manager', icon: <User size={13} /> },
  in_progress: { label: 'Đang xử lý', badgeClass: 'fpt-badge-warning', icon: <Clock3 size={13} /> },
  resolved: { label: 'Đã hoàn tất', badgeClass: 'fpt-badge-success', icon: <CheckCircle2 size={13} /> },
  rejected: { label: 'Đã từ chối', badgeClass: 'fpt-badge-danger', icon: <XCircle size={13} /> }
};

export const Warranties: React.FC = () => {
  const { profile } = useAuth();
  const manager = profile?.role === 'super_admin' || profile?.role === 'product_manager';

  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<Claim[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Modal Chi tiết & Xử lý
  const [detailClaim, setDetailClaim] = useState<Claim | null>(null);
  const [selected, setSelected] = useState<Claim | null>(null);
  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState('new');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [editError, setEditError] = useState('');

  // Image Lightbox
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [copiedSerial, setCopiedSerial] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    adminRequest<{ content: Claim[]; totalPages: number; totalElements: number }>(`/warranties/claims/paged?page=${page}&size=24`)
      .then(data => {
        if (alive) {
          setRows(data.content);
          setPages(data.totalPages);
          setTotal(data.totalElements);
        }
      })
      .catch(e => {
        if (alive) {
          setRows([]);
          setError(e.message);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [page, revision]);

  useEffect(() => {
    if (!manager) return;
    let alive = true;
    adminRequest<Technician[]>('/warranties/technicians')
      .then(data => { if (alive) setTechnicians(data); })
      .catch(e => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [manager]);

  const handleCopySerial = (serial: string) => {
    navigator.clipboard.writeText(serial);
    setCopiedSerial(serial);
    setTimeout(() => setCopiedSerial(null), 2000);
  };

  const openClaimModal = (claim: Claim) => {
    setSelected(claim);
    setAssignee(claim.assignedTo || '');
    setStatus(claim.status);
    setNotes(claim.internalNotes || '');
    setEditError('');
  };

  const saveClaim = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    setEditError('');
    try {
      let assigned = false;
      if (manager && assignee !== (selected.assignedTo || '')) {
        if (!assignee) throw new Error('Vui lòng chọn kỹ thuật viên để phân công.');
        await adminRequest(`/warranties/claims/${selected.id}/assign`, {
          method: 'PATCH',
          body: JSON.stringify({ technicianId: assignee })
        });
        assigned = true;
      }
      if (notes !== (selected.internalNotes || '')) {
        await adminRequest(`/warranties/claims/${selected.id}/notes`, {
          method: 'PATCH',
          body: JSON.stringify({ notes })
        });
      }
      if (status !== selected.status && !(assigned && status === 'new')) {
        await adminRequest(`/warranties/claims/${selected.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status })
        });
      }
      setSelected(null);
      setRevision(r => r + 1);
    } catch (e) {
      setEditError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Filtered rows
  const filteredClaims = useMemo(() => {
    return rows.filter(claim => {
      const matchStatus = selectedStatus === 'all' || claim.status === selectedStatus;
      const term = debouncedSearchTerm.toLowerCase().trim();
      const matchSearch = !term ||
        (claim.serialNumber && claim.serialNumber.toLowerCase().includes(term)) ||
        (claim.customerName && claim.customerName.toLowerCase().includes(term)) ||
        (claim.customerPhone && claim.customerPhone.includes(term)) ||
        (claim.description && claim.description.toLowerCase().includes(term));
      return matchStatus && matchSearch;
    });
  }, [rows, selectedStatus, debouncedSearchTerm]);

  // Quick KPI counts
  const countNew = useMemo(() => rows.filter(r => r.status === 'new').length, [rows]);
  const countAssigned = useMemo(() => rows.filter(r => r.status === 'assigned').length, [rows]);
  const countInProgress = useMemo(() => rows.filter(r => r.status === 'in_progress').length, [rows]);
  const countResolved = useMemo(() => rows.filter(r => r.status === 'resolved').length, [rows]);
  const countRejected = useMemo(() => rows.filter(r => r.status === 'rejected').length, [rows]);
  const lookupPath = profile?.role === 'product_manager' ? '/po/warranties/lookup' : '/admin/warranties/lookup';

  return (
    <div className="warranty-page-container">
      {/* 1. Sleek Compact Header & Action Buttons */}
      <div className="warranty-header">
        <div className="warranty-title-wrap">
          <h2>
            <Wrench size={18} color="#ea580c" />
            <span>Quản Lý Yêu Cầu Bảo Hành</span>
          </h2>
          <p className="warranty-subtitle">
            {manager
              ? 'Tiếp nhận sự cố thiết bị, điều phối kỹ thuật viên và theo dõi tiến độ xử lý bảo hành.'
              : 'Danh sách các yêu cầu bảo hành được giao cho bạn kiểm tra & xử lý tại chỗ.'}
          </p>
        </div>

        <div className="warranty-header-actions">
          <Link to={lookupPath} className="btn btn-secondary" title="Tra cứu theo mã Serial hoặc đường dẫn quét QR">
            <QrCode size={13} />
            <span>Tra cứu Serial / QR</span>
          </Link>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading}
            onClick={() => setRevision(r => r + 1)}
            title="Tải lại danh sách yêu cầu"
          >
            <RefreshCw size={12} className={loading ? 'spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. Executive Mini Stat Cards (KPI Strip) */}
      <div className="warranty-kpi-grid">
        <div className="warranty-kpi-card">
          <div className="warranty-kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
            <ShieldCheck size={16} />
          </div>
          <div className="warranty-kpi-body">
            <span className="warranty-kpi-label">Tổng yêu cầu</span>
            <span className="warranty-kpi-value">{total || rows.length}</span>
          </div>
        </div>

        <div className="warranty-kpi-card">
          <div className="warranty-kpi-icon" style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0284c7' }}>
            <AlertCircle size={16} />
          </div>
          <div className="warranty-kpi-body">
            <span className="warranty-kpi-label">Chờ tiếp nhận</span>
            <span className="warranty-kpi-value" style={{ color: countNew > 0 ? '#0284c7' : 'inherit' }}>{countNew}</span>
          </div>
        </div>

        <div className="warranty-kpi-card">
          <div className="warranty-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
            <Clock3 size={16} />
          </div>
          <div className="warranty-kpi-body">
            <span className="warranty-kpi-label">Đang xử lý</span>
            <span className="warranty-kpi-value" style={{ color: countInProgress > 0 ? '#d97706' : 'inherit' }}>{countInProgress}</span>
          </div>
        </div>

        <div className="warranty-kpi-card">
          <div className="warranty-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
            <CheckCircle2 size={16} />
          </div>
          <div className="warranty-kpi-body">
            <span className="warranty-kpi-label">Đã hoàn tất</span>
            <span className="warranty-kpi-value" style={{ color: countResolved > 0 ? '#059669' : 'inherit' }}>{countResolved}</span>
          </div>
        </div>
      </div>

      {/* 3. Compact Filter Toolbar */}
      <div className="warranty-toolbar">
        {/* Search input */}
        <div className="warranty-search-wrap">
          <Search size={13} className="warranty-search-icon" />
          <input
            type="text"
            className="warranty-search-input"
            placeholder="Tìm Serial, tên khách, SĐT…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Status Pill Tabs with Counts */}
        <div className="warranty-filter-tabs">
          {[
            { key: 'all', label: 'Tất cả', count: rows.length },
            { key: 'new', label: 'Mới tiếp nhận', count: countNew },
            { key: 'assigned', label: 'Đã phân công', count: countAssigned },
            { key: 'in_progress', label: 'Đang xử lý', count: countInProgress },
            { key: 'resolved', label: 'Đã hoàn tất', count: countResolved },
            { key: 'rejected', label: 'Đã từ chối', count: countRejected }
          ].map(tab => {
            const isActive = selectedStatus === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`warranty-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedStatus(tab.key)}
              >
                <span>{tab.label}</span>
                <span className="warranty-tab-count">{tab.count}</span>
              </button>
            );
          })}
        </div>

        {/* View Mode Toggle */}
        <div className="warranty-view-switcher">
          <button
            type="button"
            className={`warranty-view-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            title="Dạng bảng dữ liệu tinh gọn"
          >
            <LayoutList size={12} />
            <span>Bảng</span>
          </button>
          <button
            type="button"
            className={`warranty-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Dạng lưới thẻ"
          >
            <LayoutGrid size={12} />
            <span>Thẻ</span>
          </button>
        </div>
      </div>

      {/* 4. Error Alert */}
      {error && (
        <div className="card" style={{ padding: '8px 12px', borderColor: 'var(--fpt-rose)', background: 'var(--fpt-rose-soft)', color: 'var(--fpt-rose)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.775rem' }}>
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Updating indicator */}
      {loading && rows.length > 0 && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 4,
          background: 'rgba(249, 115, 22, 0.1)',
          border: '1px solid rgba(249, 115, 22, 0.25)',
          color: 'var(--fpt-orange)',
          fontSize: '12px',
          fontWeight: 600
        }}>
          <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>↻</span>
          <span>Đang cập nhật danh sách…</span>
        </div>
      )}

      {/* 5. Claims Display (Table or Grid) */}
      {loading && rows.length === 0 ? (
        <div className="card" style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw size={22} className="spin" style={{ margin: '0 auto 8px' }} />
          <p style={{ margin: 0, fontSize: '0.825rem' }}>Đang tải danh sách yêu cầu bảo hành…</p>
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="card" style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Wrench size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
          <h3 style={{ margin: '0 0 4px', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Không có yêu cầu bảo hành phù hợp</h3>
          <p style={{ margin: 0, fontSize: '0.8rem' }}>Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* ================= COMPACT TABLE VIEW ================= */
        <div className="warranty-table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="warranty-table">
              <thead>
                <tr>
                  <th style={{ width: '150px' }}>Thiết bị & Serial</th>
                  <th style={{ width: '140px' }}>Khách hàng</th>
                  <th>Mô tả sự cố</th>
                  <th style={{ width: '130px' }}>KTV Phụ trách</th>
                  <th style={{ width: '115px' }}>Trạng thái</th>
                  <th style={{ width: '85px' }}>Ngày tạo</th>
                  <th style={{ width: '135px', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map(claim => {
                  const meta = statusMeta[claim.status] || { label: claim.status, badgeClass: 'fpt-badge-customer', icon: null };
                  return (
                    <tr key={claim.id}>
                      {/* Serial */}
                      <td>
                        <div
                          className="warranty-serial-tag"
                          onClick={() => handleCopySerial(claim.serialNumber)}
                          title="Bấm sao chép Serial"
                        >
                          <span>{claim.serialNumber}</span>
                          {copiedSerial === claim.serialNumber ? (
                            <Check size={10} style={{ color: 'var(--fpt-emerald)' }} />
                          ) : (
                            <Copy size={10} style={{ opacity: 0.5 }} />
                          )}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="warranty-customer-cell">
                        <div className="warranty-customer-name">
                          {claim.customerName || 'Khách hàng'}
                        </div>
                        {claim.customerPhone && (
                          <a
                            href={`tel:${claim.customerPhone}`}
                            className="warranty-customer-phone"
                          >
                            <Phone size={9} /> {claim.customerPhone}
                          </a>
                        )}
                      </td>

                      {/* Description */}
                      <td className="warranty-desc-cell">
                        <div className="warranty-desc-text" title={claim.description}>
                          {claim.description}
                        </div>
                      </td>

                      {/* Technician */}
                      <td>
                        {claim.assigneeName ? (
                          <span className="warranty-tech-name">
                            <User size={11} style={{ color: '#3b82f6' }} />
                            {claim.assigneeName}
                          </span>
                        ) : (
                          <span className="warranty-tech-empty">
                            Chưa phân công
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`fpt-badge warranty-badge ${meta.badgeClass}`}>
                          {meta.icon}
                          <span>{meta.label}</span>
                        </span>
                      </td>

                      {/* Created At */}
                      <td style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(claim.createdAt).toLocaleDateString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit'
                        })}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-secondary warranty-action-btn"
                            onClick={() => setDetailClaim(claim)}
                            title="Xem chi tiết yêu cầu & hình ảnh sự cố"
                          >
                            <Eye size={11} />
                            <span>Chi tiết</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary warranty-action-btn"
                            onClick={() => openClaimModal(claim)}
                            title="Xử lý / phân công yêu cầu"
                          >
                            <span>Xử lý</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= COMPACT GRID VIEW ================= */
        <div
          className="warranty-claim-grid-compact"
          style={{
            opacity: loading && rows.length > 0 ? 0.65 : 1,
            transition: 'opacity 0.2s ease',
            pointerEvents: loading && rows.length > 0 ? 'none' : 'auto'
          }}
        >
          {filteredClaims.map(claim => {
            const meta = statusMeta[claim.status] || { label: claim.status, badgeClass: 'fpt-badge-customer', icon: null };
            return (
              <div className="warranty-compact-card" key={claim.id}>
                {/* Header */}
                <div className="warranty-compact-card-header">
                  <div
                    className="warranty-serial-tag"
                    onClick={() => handleCopySerial(claim.serialNumber)}
                    title="Bấm sao chép Serial"
                  >
                    <span>{claim.serialNumber}</span>
                    {copiedSerial === claim.serialNumber ? <Check size={11} style={{ color: 'var(--fpt-emerald)' }} /> : <Copy size={11} style={{ opacity: 0.6 }} />}
                  </div>

                  <span className={`fpt-badge warranty-badge ${meta.badgeClass}`}>
                    {meta.icon}
                    <span>{meta.label}</span>
                  </span>
                </div>

                {/* Body */}
                <div className="warranty-compact-card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="fpt-avatar" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', width: 26, height: 26, fontSize: '0.65rem' }}>
                      {(claim.customerName || 'KH').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <strong style={{ fontSize: '0.775rem', color: 'var(--text-primary)' }}>
                        {claim.customerName || 'Khách hàng'}
                      </strong>
                      {claim.customerPhone && (
                        <a
                          href={`tel:${claim.customerPhone}`}
                          style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                        >
                          <Phone size={9} /> {claim.customerPhone}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Description Box */}
                  <div className="warranty-compact-issue-box">
                    <p style={{ margin: 0 }}>{claim.description}</p>
                  </div>

                  {/* Incident Images */}
                  {claim.images && claim.images.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ImageIcon size={10} />
                        <span>Ảnh sự cố ({claim.images.length})</span>
                      </div>
                      <div className="fpt-thumb-row" style={{ gap: '6px' }}>
                        {claim.images.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt="Ảnh sự cố"
                            className="fpt-thumb-img"
                            style={{ width: '44px', height: '44px', borderRadius: '5px' }}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                            onClick={() => setActiveImage(url)}
                            title="Bấm để xem ảnh phóng to"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Technician Info */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.725rem', paddingTop: '2px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Kỹ thuật viên:</span>
                    <span style={{ fontWeight: 600, color: claim.assigneeName ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {claim.assigneeName || 'Chưa phân công'}
                    </span>
                  </div>

                  {/* Internal Notes if any */}
                  {claim.internalNotes && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'var(--bg-shell)', padding: '4px 8px', borderRadius: '5px', border: '1px dashed var(--border-subtle)' }}>
                      <strong>Ghi chú:</strong> {claim.internalNotes}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="warranty-compact-card-footer">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <Clock size={11} />
                    <span>{new Date(claim.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary warranty-action-btn"
                      onClick={() => setDetailClaim(claim)}
                      title="Xem chi tiết yêu cầu & ảnh sự cố"
                    >
                      <Eye size={11} />
                      <span>Chi tiết</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary warranty-action-btn"
                      onClick={() => openClaimModal(claim)}
                      title="Xử lý / phân công yêu cầu"
                    >
                      <span>Xử lý</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 0 && (
        <div className="workspace-pagination" style={{ marginTop: '4px' }}>
          <span>
            Hiển thị {rows.length} / {total} yêu cầu · Trang {pages ? page + 1 : 0} / {pages}
          </span>
          <div className="workspace-pagination-controls">
            <button
              type="button"
              className="workspace-pagination-btn"
              disabled={loading || page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft size={13} /> Trước
            </button>
            {Array.from({ length: Math.min(pages, 7) }, (_, idx) => {
              let pIndex = idx;
              if (pages > 7) {
                if (page > 3 && page < pages - 3) {
                  pIndex = page - 3 + idx;
                } else if (page >= pages - 3) {
                  pIndex = pages - 7 + idx;
                }
              }
              return (
                <button
                  key={pIndex}
                  type="button"
                  className={`workspace-pagination-btn ${page === pIndex ? 'active' : ''}`}
                  onClick={() => setPage(pIndex)}
                  disabled={loading}
                >
                  {pIndex + 1}
                </button>
              );
            })}
            <button
              type="button"
              className="workspace-pagination-btn"
              disabled={loading || page + 1 >= pages}
              onClick={() => setPage(p => p + 1)}
            >
              Sau <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Modal Chi tiết Yêu Cầu Bảo Hành */}
      {detailClaim && (() => {
        const dMeta = statusMeta[detailClaim.status] || { label: detailClaim.status, badgeClass: 'fpt-badge-customer', icon: null };
        return (
          <div className="fpt-modal-overlay" onClick={() => setDetailClaim(null)}>
            <div className="fpt-modal-box warranty-detail-modal-box" onClick={e => e.stopPropagation()}>
              <div className="fpt-modal-header warranty-modal-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0 }}>Chi tiết yêu cầu bảo hành</h3>
                    <span className={`fpt-badge warranty-badge ${dMeta.badgeClass}`}>
                      {dMeta.icon}
                      <span>{dMeta.label}</span>
                    </span>
                  </div>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '2px', display: 'inline-block' }}>
                    Mã yêu cầu: <code style={{ fontSize: '0.725rem' }}>{detailClaim.id}</code>
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setDetailClaim(null)}
                  style={{ padding: '4px', borderRadius: '6px' }}
                >
                  <X size={15} />
                </button>
              </div>

              <div className="fpt-modal-body warranty-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* 2 Cột thông tin: Khách hàng & Thiết bị */}
                <div className="warranty-detail-grid">
                  {/* Khách hàng */}
                  <div className="warranty-detail-card">
                    <div className="warranty-detail-card-title">
                      <User size={13} style={{ color: 'var(--fpt-orange)' }} />
                      <span>Thông tin khách hàng</span>
                    </div>
                    <div className="warranty-detail-card-row">
                      <span style={{ color: 'var(--text-muted)' }}>Họ tên:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{detailClaim.customerName || 'Khách vãng lai'}</strong>
                    </div>
                    <div className="warranty-detail-card-row">
                      <span style={{ color: 'var(--text-muted)' }}>Số điện thoại:</span>
                      {detailClaim.customerPhone ? (
                        <a
                          href={`tel:${detailClaim.customerPhone}`}
                          style={{ color: 'var(--fpt-orange)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          <Phone size={11} /> {detailClaim.customerPhone}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Chưa cập nhật</span>
                      )}
                    </div>
                    <div className="warranty-detail-card-row">
                      <span style={{ color: 'var(--text-muted)' }}>Thời gian gửi:</span>
                      <span>{new Date(detailClaim.createdAt).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>

                  {/* Thiết bị & KTV */}
                  <div className="warranty-detail-card">
                    <div className="warranty-detail-card-title">
                      <ShieldCheck size={13} style={{ color: 'var(--fpt-orange)' }} />
                      <span>Thiết bị & Kỹ thuật viên</span>
                    </div>
                    <div className="warranty-detail-card-row">
                      <span style={{ color: 'var(--text-muted)' }}>Mã Serial:</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span className="warranty-serial-tag" onClick={() => handleCopySerial(detailClaim.serialNumber)} style={{ margin: 0 }}>
                          <span>{detailClaim.serialNumber}</span>
                          {copiedSerial === detailClaim.serialNumber ? <Check size={10} style={{ color: 'var(--fpt-emerald)' }} /> : <Copy size={10} style={{ opacity: 0.5 }} />}
                        </span>
                      </span>
                    </div>
                    <div className="warranty-detail-card-row">
                      <span style={{ color: 'var(--text-muted)' }}>KTV phụ trách:</span>
                      <strong style={{ color: detailClaim.assigneeName ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {detailClaim.assigneeName || 'Chưa phân công'}
                      </strong>
                    </div>
                    <div className="warranty-detail-card-row">
                      <span style={{ color: 'var(--text-muted)' }}>Hồ sơ máy:</span>
                      <Link
                        to={`${lookupPath}?serial=${encodeURIComponent(detailClaim.serialNumber)}`}
                        style={{ color: 'var(--fpt-orange)', fontSize: '0.725rem', display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'none', fontWeight: 600 }}
                      >
                        <QrCode size={11} />
                        <span>Xem chi tiết thiết bị</span>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Mô tả sự cố */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Nội dung mô tả sự cố:
                  </label>
                  <div className="warranty-detail-issue-box">
                    {detailClaim.description || 'Không có mô tả chi tiết.'}
                  </div>
                </div>

                {/* Danh sách ảnh đính kèm */}
                {detailClaim.images && detailClaim.images.length > 0 ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <ImageIcon size={13} style={{ color: '#3b82f6' }} />
                        <span>Hình ảnh đính kèm ({detailClaim.images.length} ảnh):</span>
                      </label>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Bấm vào ảnh để phóng to</span>
                    </div>
                    <div className="warranty-gallery-grid">
                      {detailClaim.images.map((imgUrl, i) => (
                        <div
                          key={i}
                          className="warranty-gallery-item"
                          onClick={() => setActiveImage(imgUrl)}
                          title={`Xem ảnh ${i + 1}`}
                        >
                          <img
                            src={imgUrl}
                            alt={`Ảnh sự cố ${i + 1}`}
                            className="warranty-gallery-img"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                          <span className="warranty-gallery-badge">#{i + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontStyle: 'italic', background: 'var(--bg-shell)', padding: '6px 10px', borderRadius: '6px' }}>
                    Không có hình ảnh đính kèm từ khách hàng.
                  </div>
                )}

                {/* Ghi chú nội bộ nếu có */}
                {detailClaim.internalNotes && (
                  <div style={{ background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Ghi chú nội bộ xử lý:
                    </label>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                      {detailClaim.internalNotes}
                    </div>
                  </div>
                )}
              </div>

              <div className="fpt-modal-footer warranty-modal-footer" style={{ justifyContent: 'space-between' }}>
                <Link
                  to={`${lookupPath}?serial=${encodeURIComponent(detailClaim.serialNumber)}`}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <QrCode size={13} />
                  <span>Tra cứu Serial</span>
                </Link>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setDetailClaim(null)}
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      const c = detailClaim;
                      setDetailClaim(null);
                      openClaimModal(c);
                    }}
                  >
                    <span>Xử lý yêu cầu</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 6. Modal Xử Lý Yêu Cầu */}
      {selected && (
        <div className="fpt-modal-overlay" onClick={() => !busy && setSelected(null)}>
          <div className="fpt-modal-box warranty-modal-box" onClick={e => e.stopPropagation()}>
            <div className="fpt-modal-header warranty-modal-header">
              <div>
                <h3>Xử lý yêu cầu bảo hành</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Thiết bị Serial: <strong style={{ color: 'var(--text-primary)' }}>{selected.serialNumber}</strong>
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={busy}
                onClick={() => setSelected(null)}
                style={{ padding: '4px', borderRadius: '6px' }}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={saveClaim}>
              <div className="fpt-modal-body warranty-modal-body">
                {editError && (
                  <div className="card" style={{ padding: '8px 12px', background: 'var(--fpt-rose-soft)', color: 'var(--fpt-rose)', borderColor: 'var(--fpt-rose)', fontSize: '0.785rem' }}>
                    {editError}
                  </div>
                )}

                {/* Khách hàng tóm tắt */}
                <div style={{ background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.775rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selected.customerName || 'Khách hàng'} {selected.customerPhone ? `· ${selected.customerPhone}` : ''}</div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.35 }}>{selected.description}</div>
                </div>

                {/* Ảnh sự cố & Ảnh minh chứng của KTV */}
                {selected.images && selected.images.length > 0 && (
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <ImageIcon size={13} color="#3b82f6" />
                      <span>Ảnh sự cố ({selected.images.length} ảnh):</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {selected.images.map((url, idx) => (
                        <div
                          key={idx}
                          onClick={() => setActiveImage(url)}
                          style={{
                            position: 'relative',
                            cursor: 'pointer',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            border: '1px solid var(--border-subtle)',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                          }}
                          title="Bấm để xem ảnh phóng to"
                        >
                          <img
                            src={url}
                            alt={`Ảnh minh chứng ${idx + 1}`}
                            style={{ width: '64px', height: '64px', objectFit: 'cover', display: 'block' }}
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                          <span style={{
                            position: 'absolute',
                            bottom: '2px',
                            right: '2px',
                            background: 'rgba(0,0,0,0.7)',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '0 3px',
                            borderRadius: '2px'
                          }}>
                            #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phân công kỹ thuật viên (dành cho Quản lý) */}
                {manager && (
                  <div className="warranty-form-group">
                    <label>Phân công kỹ thuật viên phụ trách</label>
                    <select
                      value={assignee}
                      onChange={e => setAssignee(e.target.value)}
                      disabled={busy}
                    >
                      <option value="">-- Chưa phân công --</option>
                      {technicians.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.fullName} {t.phone ? `(${t.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Trạng thái */}
                <div className="warranty-form-group">
                  <label>Trạng thái xử lý</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    disabled={busy}
                  >
                    {Object.entries(statusMeta).map(([val, item]) => (
                      <option key={val} value={val}>{item.label}</option>
                    ))}
                  </select>
                </div>

                {/* Ghi chú nội bộ */}
                <div className="warranty-form-group">
                  <label>Ghi chú kỹ thuật nội bộ</label>
                  <textarea
                    rows={3}
                    maxLength={10000}
                    placeholder="Nhập chi tiết linh kiện thay thế, nguyên nhân sự cố hoặc ghi chú bảo hành..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    disabled={busy}
                  />
                </div>
              </div>

              <div className="fpt-modal-footer warranty-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => setSelected(null)}
                  style={{ height: '30px', fontSize: '0.75rem', padding: '0 12px' }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={busy}
                  style={{ height: '30px', fontSize: '0.75rem', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  {busy ? <RefreshCw size={13} className="spin" /> : <Check size={13} />}
                  <span>{busy ? 'Đang lưu…' : 'Lưu cập nhật'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Image Lightbox Modal */}
      {activeImage && (
        <div className="fpt-modal-overlay" onClick={() => setActiveImage(null)}>
          <div style={{ position: 'relative', maxWidth: '85vw', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setActiveImage(null)}
              style={{
                position: 'absolute',
                top: -14,
                right: -14,
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#000',
                color: '#fff',
                border: '2px solid #fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
              }}
            >
              <X size={20} />
            </button>
            <img
              src={activeImage}
              alt="Ảnh sự cố đầy đủ"
              style={{
                maxWidth: '85vw',
                maxHeight: '85vh',
                borderRadius: '12px',
                objectFit: 'contain',
                boxShadow: '0 12px 36px rgba(0,0,0,0.6)'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
