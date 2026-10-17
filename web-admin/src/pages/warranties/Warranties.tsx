import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { adminRequest } from '../../services/adminRequest';
import { useAuth } from '../../contexts/AuthContext';
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

  // Modal Xử lý
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Sleek Compact Header & Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--text-primary)' }}>
            <Wrench size={22} color="#ea580c" />
            Quản Lý Yêu Cầu Bảo Hành
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', margin: '3px 0 0 0' }}>
            {manager
              ? 'Tiếp nhận sự cố thiết bị, điều phối kỹ thuật viên và theo dõi tiến độ xử lý bảo hành.'
              : 'Danh sách các yêu cầu bảo hành được giao cho bạn kiểm tra & xử lý tại chỗ.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link to="/warranties/lookup" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 12px' }}>
            <QrCode size={14} />
            <span>Tra cứu Serial / QR</span>
          </Link>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading}
            onClick={() => setRevision(r => r + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 12px' }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. Four Sleek Executive Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '12px'
      }}>
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3b82f6',
            flexShrink: 0
          }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Tổng yêu cầu
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, marginTop: '2px' }}>
              {total || rows.length}
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(14, 165, 233, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0ea5e9',
            flexShrink: 0
          }}>
            <AlertCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Chờ tiếp nhận
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: countNew > 0 ? '#0ea5e9' : 'var(--text-primary)', lineHeight: 1.2, marginTop: '2px' }}>
              {countNew}
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f59e0b',
            flexShrink: 0
          }}>
            <Clock3 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Đang xử lý
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: countInProgress > 0 ? '#f59e0b' : 'var(--text-primary)', lineHeight: 1.2, marginTop: '2px' }}>
              {countInProgress}
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
            flexShrink: 0
          }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Đã hoàn tất
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: countResolved > 0 ? '#10b981' : 'var(--text-primary)', lineHeight: 1.2, marginTop: '2px' }}>
              {countResolved}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Compact Filter Toolbar with Badges & View Switcher */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        padding: '10px 14px',
        background: 'var(--bg-surface)',
        borderRadius: '10px',
        border: '1px solid var(--border-subtle)'
      }}>
        {/* Search input - dark mode aware */}
        <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 220px', maxWidth: '320px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Tìm Serial, tên khách, SĐT…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              paddingLeft: '32px',
              fontSize: '0.8rem',
              height: '34px',
              width: '100%',
              borderRadius: '6px',
              background: 'var(--bg-shell, rgba(0,0,0,0.3))',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              outline: 'none'
            }}
          />
        </div>

        {/* Status Pill Tabs with Counts */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
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
                className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  borderRadius: '999px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onClick={() => setSelectedStatus(tab.key)}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '0.68rem',
                  padding: '0 5px',
                  borderRadius: '999px',
                  background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg-shell)',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 600
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* View Mode Toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-shell)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              border: 'none',
              background: viewMode === 'table' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'table' ? '#fff' : 'var(--text-secondary)',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
              fontWeight: 600
            }}
            title="Dạng bảng gọn gàng"
          >
            <LayoutList size={13} />
            <span>Bảng</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            style={{
              border: 'none',
              background: viewMode === 'grid' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'grid' ? '#fff' : 'var(--text-secondary)',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
              fontWeight: 600
            }}
            title="Dạng thẻ lưới"
          >
            <LayoutGrid size={13} />
            <span>Thẻ</span>
          </button>
        </div>
      </div>

      {/* 4. Error Alert */}
      {error && (
        <div className="card" style={{ padding: '10px 14px', borderColor: 'var(--fpt-rose)', background: 'var(--fpt-rose-soft)', color: 'var(--fpt-rose)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem' }}>
          <AlertCircle size={16} />
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
        /* ================= TABLE VIEW ================= */
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '11px 14px', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Thiết bị & Serial</th>
                  <th style={{ padding: '11px 14px', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Khách hàng</th>
                  <th style={{ padding: '11px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Mô tả sự cố & Đính kèm</th>
                  <th style={{ padding: '11px 14px', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>KTV Phụ trách</th>
                  <th style={{ padding: '11px 14px', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Trạng thái</th>
                  <th style={{ padding: '11px 14px', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Ngày tạo</th>
                  <th style={{ padding: '11px 14px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right', whiteSpace: 'nowrap' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map(claim => {
                  const meta = statusMeta[claim.status] || { label: claim.status, badgeClass: 'fpt-badge-customer', icon: null };
                  return (
                    <tr key={claim.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="table-row-hover">
                      {/* Serial */}
                      <td style={{ padding: '11px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div
                          onClick={() => handleCopySerial(claim.serialNumber)}
                          title="Bấm sao chép Serial"
                          style={{
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)'
                          }}
                        >
                          <span>{claim.serialNumber}</span>
                          {copiedSerial === claim.serialNumber ? (
                            <Check size={11} style={{ color: 'var(--fpt-emerald)' }} />
                          ) : (
                            <Copy size={11} style={{ opacity: 0.5 }} />
                          )}
                        </div>
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '11px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {claim.customerName || 'Khách hàng'}
                        </div>
                        {claim.customerPhone && (
                          <a
                            href={`tel:${claim.customerPhone}`}
                            style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}
                          >
                            <Phone size={10} /> {claim.customerPhone}
                          </a>
                        )}
                      </td>

                      {/* Description & Images */}
                      <td style={{ padding: '11px 14px', verticalAlign: 'middle', maxWidth: '360px' }}>
                        <div style={{
                          color: 'var(--text-primary)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.45,
                          fontSize: '0.8rem'
                        }}>
                          {claim.description}
                        </div>

                        {/* Image badge or note */}
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '5px', flexWrap: 'wrap' }}>
                          {claim.images && claim.images.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setActiveImage(claim.images[0])}
                              style={{
                                border: '1px solid rgba(59, 130, 246, 0.25)',
                                background: 'rgba(59, 130, 246, 0.1)',
                                color: '#3b82f6',
                                borderRadius: '4px',
                                padding: '2px 7px',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer'
                              }}
                              title="Bấm để xem ảnh phóng to"
                            >
                              <ImageIcon size={11} />
                              <span>{claim.images.length} ảnh đính kèm</span>
                            </button>
                          )}
                          {claim.internalNotes && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                              Ghi chú: {claim.internalNotes}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Technician */}
                      <td style={{ padding: '11px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {claim.assigneeName ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            <User size={13} style={{ color: '#3b82f6' }} />
                            {claim.assigneeName}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem' }}>
                            Chưa phân công
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '11px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span className={`fpt-badge ${meta.badgeClass}`} style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                          {meta.icon}
                          <span>{meta.label}</span>
                        </span>
                      </td>

                      {/* Created At */}
                      <td style={{ padding: '11px 14px', verticalAlign: 'middle', color: 'var(--text-secondary)', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                        {new Date(claim.createdAt).toLocaleDateString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit'
                        })}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '11px 14px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => openClaimModal(claim)}
                          style={{ padding: '4px 10px', fontSize: '0.74rem', borderRadius: '6px' }}
                        >
                          Xử lý
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= GRID VIEW ================= */
        <div
          className="fpt-claim-grid"
          style={{
            opacity: loading && rows.length > 0 ? 0.65 : 1,
            transition: 'opacity 0.2s ease',
            pointerEvents: loading && rows.length > 0 ? 'none' : 'auto'
          }}
        >
          {filteredClaims.map(claim => {
            const meta = statusMeta[claim.status] || { label: claim.status, badgeClass: 'fpt-badge-customer', icon: null };
            return (
              <div className="fpt-claim-card" key={claim.id}>
                {/* Header */}
                <div className="fpt-claim-header">
                  <div
                    className="fpt-serial-chip"
                    onClick={() => handleCopySerial(claim.serialNumber)}
                    title="Bấm để sao chép mã Serial"
                    style={{ cursor: 'pointer' }}
                  >
                    <span>{claim.serialNumber}</span>
                    {copiedSerial === claim.serialNumber ? <Check size={13} style={{ color: 'var(--fpt-emerald)' }} /> : <Copy size={13} style={{ opacity: 0.6 }} />}
                  </div>

                  <span className={`fpt-badge ${meta.badgeClass}`}>
                    {meta.icon}
                    <span>{meta.label}</span>
                  </span>
                </div>

                {/* Body */}
                <div className="fpt-claim-body">
                  <div className="fpt-customer-row">
                    <div className="fpt-avatar" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', width: 32, height: 32, fontSize: '0.75rem' }}>
                      {(claim.customerName || 'KH').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        {claim.customerName || 'Khách hàng'}
                      </strong>
                      {claim.customerPhone && (
                        <a
                          href={`tel:${claim.customerPhone}`}
                          style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Phone size={11} /> {claim.customerPhone}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Description Box */}
                  <div className="fpt-issue-box">
                    <p style={{ margin: 0 }}>{claim.description}</p>
                  </div>

                  {/* Incident Images */}
                  {claim.images && claim.images.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <ImageIcon size={12} />
                        <span>Ảnh sự cố ({claim.images.length})</span>
                      </div>
                      <div className="fpt-thumb-row">
                        {claim.images.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt="Ảnh sự cố"
                            className="fpt-thumb-img"
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem', paddingTop: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Kỹ thuật viên:</span>
                    <span style={{ fontWeight: 600, color: claim.assigneeName ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {claim.assigneeName || 'Chưa phân công'}
                    </span>
                  </div>

                  {/* Internal Notes if any */}
                  {claim.internalNotes && (
                    <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '6px 10px', borderRadius: '6px', border: '1px dashed var(--border-subtle)' }}>
                      <strong>Ghi chú:</strong> {claim.internalNotes}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="fpt-claim-footer">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <Clock size={12} />
                    <span>{new Date(claim.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => openClaimModal(claim)}
                    style={{ borderRadius: '8px', padding: '6px 14px' }}
                  >
                    Xử lý yêu cầu
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 0 && (
        <div className="workspace-pagination" style={{ marginTop: '8px' }}>
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
              <ChevronLeft size={14} /> Trước
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
              Sau <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 6. Modal Xử Lý Yêu Cầu */}
      {selected && (
        <div className="fpt-modal-overlay" onClick={() => !busy && setSelected(null)}>
          <div className="fpt-modal-box" onClick={e => e.stopPropagation()}>
            <div className="fpt-modal-header">
              <div>
                <h3>Xử lý yêu cầu bảo hành</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Thiết bị Serial: <strong style={{ color: 'var(--text-primary)' }}>{selected.serialNumber}</strong>
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={busy}
                onClick={() => setSelected(null)}
                style={{ padding: '6px', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={saveClaim}>
              <div className="fpt-modal-body">
                {editError && (
                  <div className="card" style={{ padding: '10px 14px', background: 'var(--fpt-rose-soft)', color: 'var(--fpt-rose)', borderColor: 'var(--fpt-rose)', fontSize: '0.85rem' }}>
                    {editError}
                  </div>
                )}

                {/* Khách hàng tóm tắt */}
                <div style={{ background: 'var(--bg-surface)', padding: '12px 14px', borderRadius: '10px', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selected.customerName || 'Khách hàng'} {selected.customerPhone ? `· ${selected.customerPhone}` : ''}</div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{selected.description}</div>
                </div>

                {/* Phân công kỹ thuật viên (dành cho Quản lý) */}
                {manager && (
                  <div className="fpt-form-group">
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
                    <span className="fpt-form-help">Kỹ thuật viên sẽ nhận được thông báo để kiểm tra thiết bị.</span>
                  </div>
                )}

                {/* Trạng thái */}
                <div className="fpt-form-group">
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
                <div className="fpt-form-group">
                  <label>Ghi chú kỹ thuật nội bộ</label>
                  <textarea
                    rows={4}
                    maxLength={10000}
                    placeholder="Nhập chi tiết linh kiện thay thế, nguyên nhân sự cố hoặc ghi chú bảo hành..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    disabled={busy}
                  />
                  <span className="fpt-form-help">Ghi chú chỉ hiển thị trong nội bộ ban quản trị và kỹ thuật viên.</span>
                </div>
              </div>

              <div className="fpt-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => setSelected(null)}
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
