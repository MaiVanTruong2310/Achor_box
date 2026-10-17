import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  History,
  Eye,
  Check,
  X,
  FileText,
  ShoppingBag,
  Search,
  Copy,
  CheckCheck,
  ShieldCheck,
  User,
  Phone,
  MapPin,
  Package,
  Calendar,
  CreditCard,
  Mail,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../contexts/ToastContext';
import { AdminApiError, adminRequest } from '../../services/adminRequest';
import './approval-tickets.css';

interface TicketItemApproval {
  id: string;
  ticketId: string;
  orderId: string;
  orderItemId: string;
  productId: string;
  managerId?: string | null;
  status: string;
  reason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  productName?: string;
  sku?: string;
  variantName?: string;
  quantity?: number;
  price?: number;
  subtotal?: number;
}

interface TicketHistory {
  id: string;
  ticket_id: string;
  action: string;
  actor_id?: string | null;
  reason?: string | null;
  created_at: string;
}

interface Ticket {
  id: string;
  order_id: string;
  status: string;
  review_round: number;
  reason?: string | null;
  created_at?: string;
  updated_at?: string;
  order_total?: number;
  shipping_address_snapshot?: string | null;
  order_created_at?: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  item_count?: number;
  product_names?: string | null;
  order?: {
    id: string;
    total: number;
    status: string;
    shipping_address_snapshot?: string | null;
    created_at: string;
  };
  customer?: {
    full_name?: string;
    email?: string;
    phone?: string;
    default_address?: string;
  };
  history?: TicketHistory[];
  itemApprovals?: TicketItemApproval[];
}

const statusConfig: Record<string, { label: string; bg: string; color: string; border: string; icon: React.ReactNode }> = {
  PENDING: {
    label: 'Chờ thẩm định',
    bg: 'rgba(245, 158, 11, 0.12)',
    color: '#f59e0b',
    border: 'rgba(245, 158, 11, 0.28)',
    icon: <Clock size={12} />
  },
  APPROVED: {
    label: 'Đã phê duyệt',
    bg: 'rgba(16, 185, 129, 0.12)',
    color: '#10b981',
    border: 'rgba(16, 185, 129, 0.28)',
    icon: <CheckCircle2 size={12} />
  },
  RETURNED: {
    label: 'Chờ giải trình',
    bg: 'rgba(14, 165, 233, 0.12)',
    color: '#0ea5e9',
    border: 'rgba(14, 165, 233, 0.28)',
    icon: <RotateCcw size={12} />
  },
  REJECTED: {
    label: 'Đã từ chối',
    bg: 'rgba(244, 63, 94, 0.12)',
    color: '#f43f5e',
    border: 'rgba(244, 63, 94, 0.28)',
    icon: <XCircle size={12} />
  },
  PARTIALLY_REJECTED: {
    label: 'Duyệt một phần',
    bg: 'rgba(168, 85, 247, 0.12)',
    color: '#a855f7',
    border: 'rgba(168, 85, 247, 0.28)',
    icon: <AlertTriangle size={12} />
  },
  CANCELLED: {
    label: 'Đã hủy',
    bg: 'rgba(100, 116, 139, 0.12)',
    color: '#94a3b8',
    border: 'rgba(100, 116, 139, 0.28)',
    icon: <X size={12} />
  }
};

const formatVnd = (amount?: number | null) => {
  if (amount == null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Parse clean address from snapshot
const parseAddressSnapshot = (raw?: string | null, fallback = 'Chưa cập nhật địa chỉ') => {
  if (!raw) return { name: '', phone: '', fullAddress: fallback };
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') {
      return {
        name: obj.recipientName || '',
        phone: obj.phone || '',
        fullAddress: obj.address || obj.fullAddress || fallback
      };
    }
  } catch {
    // raw text
  }
  return { name: '', phone: '', fullAddress: raw };
};

export const ApprovalTickets: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Ticket[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'RETURNED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const listVersion = useRef(0);

  const isPO = profile?.role === 'product_manager';

  // 1. Fetch tickets
  const load = async (silent = false) => {
    const version = ++listVersion.current;
    if (!silent) setLoading(true);
    try {
      const data = await adminRequest<Ticket[]>(`/tickets?page=${page}&size=50`);
      if (version === listVersion.current) {
        setRows(data);
      }
    } catch (e) {
      if (version === listVersion.current) {
        setRows([]);
        if (!silent) toast.error((e as Error).message, 'Lỗi tải danh sách PO');
      }
    } finally {
      if (version === listVersion.current && !silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void load();
  }, [page]);

  // 2. Realtime auto-update: poll every 12s & listen to window events
  useEffect(() => {
    const handleRealtimeEvent = () => {
      void load(true);
    };

    window.addEventListener('smartbox:new_ticket', handleRealtimeEvent);
    window.addEventListener('smartbox:new_order', handleRealtimeEvent);

    const interval = setInterval(() => {
      if (!document.hidden && !busy) {
        void load(true);
      }
    }, 12000);

    return () => {
      window.removeEventListener('smartbox:new_ticket', handleRealtimeEvent);
      window.removeEventListener('smartbox:new_order', handleRealtimeEvent);
      clearInterval(interval);
    };
  }, [page, busy]);

  // 3. Navigate to dedicated full-page view
  const openDetail = (t: Ticket, index: number) => {
    const basePath = isPO ? '/po/approvals' : '/admin/orders/approvals';
    const seq = String(index).padStart(2, '0');
    const orderSeq = String(index).padStart(2, '0');
    navigate(`${basePath}/${t.id}`, { state: { seq, orderSeq } });
  };

  // 4. Copy helper
  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 7. KPI statistics
  const kpis = useMemo(() => {
    const pending = rows.filter((r) => r.status === 'PENDING').length;
    const approved = rows.filter((r) => r.status === 'APPROVED').length;
    const returned = rows.filter((r) => r.status === 'RETURNED').length;
    const rejected = rows.filter((r) => ['REJECTED', 'CANCELLED', 'PARTIALLY_REJECTED'].includes(r.status)).length;
    return { pending, approved, returned, rejected, total: rows.length };
  }, [rows]);

  // 8. Filter and Search
  const filteredRows = useMemo(() => {
    let result = [...rows];
    if (activeTab === 'PENDING') {
      result = result.filter((r) => r.status === 'PENDING');
    } else if (activeTab === 'APPROVED') {
      result = result.filter((r) => r.status === 'APPROVED');
    } else if (activeTab === 'RETURNED') {
      result = result.filter((r) => r.status === 'RETURNED');
    } else if (activeTab === 'REJECTED') {
      result = result.filter((r) => ['REJECTED', 'CANCELLED', 'PARTIALLY_REJECTED'].includes(r.status));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r, i) => {
          const ticketSeq = `po-${String(i + 1).padStart(2, '0')}`;
          const orderSeq = `đh-${String(i + 1).padStart(2, '0')}`;
          return (
            ticketSeq.includes(q) ||
            orderSeq.includes(q) ||
            r.id.toLowerCase().includes(q) ||
            r.order_id.toLowerCase().includes(q) ||
            (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
            (r.customer_phone && r.customer_phone.includes(q)) ||
            (r.product_names && r.product_names.toLowerCase().includes(q))
          );
        }
      );
    }

    return result;
  }, [rows, activeTab, searchQuery]);

  const renderBadge = (status: string) => {
    const config = statusConfig[status] || {
      label: status,
      bg: 'rgba(255, 255, 255, 0.08)',
      color: 'var(--text-secondary)',
      border: 'var(--border-subtle)',
      icon: null
    };

    return (
      <span
        className="apt-status-pill"
        style={{
          background: config.bg,
          color: config.color,
          border: `1px solid ${config.border}`
        }}
      >
        {config.icon}
        <span>{config.label}</span>
      </span>
    );
  };

  return (
    <div className="page-body apt-page">
      {/* 1. Header with Title & Realtime Badge */}
      <div className="apt-header">
        <div>
          <div className="apt-title-box">
            <div className="apt-title-icon">
              <FileCheck size={26} />
            </div>
            <div>
              <h1 className="apt-title">Phê Duyệt PO Ticket</h1>
              <p className="apt-subtitle">
                {isPO
                  ? 'Kiểm tra & thẩm định đơn hàng đối với các sản phẩm do bạn phụ trách trước khi điều phối xuất kho.'
                  : 'Kiểm soát toàn bộ phiếu đặt hàng (PO Ticket) trước khi tiến hành đóng gói và giao hàng.'}
              </p>
            </div>
          </div>
        </div>

        <div className="apt-header-actions">
          <div className="apt-realtime-badge">
            <span className="apt-pulse-dot" />
            <span>Đồng bộ Realtime</span>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(isPO ? '/po/products' : '/orders')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}
          >
            <ShoppingBag size={15} />
            <span>Danh mục sản phẩm</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading || busy}
            onClick={() => void load()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {!isPO && (
        <div style={{
          marginBottom: 16,
          padding: '12px 18px',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          color: '#1d4ed8',
          fontSize: '0.88rem'
        }}>
          <ShieldCheck size={20} color="#2563eb" style={{ flexShrink: 0 }} />
          <span>
            <strong>Chế độ Giám sát Vận hành (Audit Mode):</strong> Thẩm quyền thẩm định đơn hàng và phê duyệt PO thuộc trách nhiệm chuyên trách của <strong>Quản lý Sản phẩm & Kho (PO)</strong>. Quản trị viên theo dõi nhật ký và tiến trình để phục vụ kiểm toán và báo cáo, không trực tiếp duyệt PO.
          </span>
        </div>
      )}

      {/* 2. KPI Summary Cards */}
      <div className="apt-kpi-grid">
        <div
          className={`apt-kpi-card kpi-amber ${activeTab === 'PENDING' ? 'active' : ''}`}
          onClick={() => setActiveTab(activeTab === 'PENDING' ? 'ALL' : 'PENDING')}
        >
          <div className="apt-kpi-info">
            <span className="apt-kpi-label">Chờ thẩm định</span>
            <span className="apt-kpi-value">{kpis.pending}</span>
            <span className="apt-kpi-subtext">Cần xử lý &amp; xác nhận</span>
          </div>
          <div className="apt-kpi-icon-box">
            <Clock size={24} />
          </div>
        </div>

        <div
          className={`apt-kpi-card kpi-emerald ${activeTab === 'APPROVED' ? 'active' : ''}`}
          onClick={() => setActiveTab(activeTab === 'APPROVED' ? 'ALL' : 'APPROVED')}
        >
          <div className="apt-kpi-info">
            <span className="apt-kpi-label">Đã phê duyệt</span>
            <span className="apt-kpi-value">{kpis.approved}</span>
            <span className="apt-kpi-subtext">Sẵn sàng xuất kho</span>
          </div>
          <div className="apt-kpi-icon-box">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div
          className={`apt-kpi-card kpi-sky ${activeTab === 'RETURNED' ? 'active' : ''}`}
          onClick={() => setActiveTab(activeTab === 'RETURNED' ? 'ALL' : 'RETURNED')}
        >
          <div className="apt-kpi-info">
            <span className="apt-kpi-label">Chờ giải trình</span>
            <span className="apt-kpi-value">{kpis.returned}</span>
            <span className="apt-kpi-subtext">Đang bổ sung thông tin</span>
          </div>
          <div className="apt-kpi-icon-box">
            <RotateCcw size={24} />
          </div>
        </div>

        <div
          className={`apt-kpi-card kpi-rose ${activeTab === 'REJECTED' ? 'active' : ''}`}
          onClick={() => setActiveTab(activeTab === 'REJECTED' ? 'ALL' : 'REJECTED')}
        >
          <div className="apt-kpi-info">
            <span className="apt-kpi-label">Từ chối / Hủy</span>
            <span className="apt-kpi-value">{kpis.rejected}</span>
            <span className="apt-kpi-subtext">Không đủ điều kiện</span>
          </div>
          <div className="apt-kpi-icon-box">
            <XCircle size={24} />
          </div>
        </div>
      </div>

      {/* 3. Toolbar: Status Tabs & Search */}
      <div className="apt-toolbar">
        <div className="apt-status-tabs">
          <button
            type="button"
            className={`apt-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            <span>Tất cả</span>
            <span className="apt-tab-count">{kpis.total}</span>
          </button>
          <button
            type="button"
            className={`apt-tab-btn ${activeTab === 'PENDING' ? 'active' : ''}`}
            onClick={() => setActiveTab('PENDING')}
          >
            <span>Chờ thẩm định</span>
            <span className="apt-tab-count" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>
              {kpis.pending}
            </span>
          </button>
          <button
            type="button"
            className={`apt-tab-btn ${activeTab === 'APPROVED' ? 'active' : ''}`}
            onClick={() => setActiveTab('APPROVED')}
          >
            <span>Đã duyệt</span>
            <span className="apt-tab-count" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
              {kpis.approved}
            </span>
          </button>
          <button
            type="button"
            className={`apt-tab-btn ${activeTab === 'RETURNED' ? 'active' : ''}`}
            onClick={() => setActiveTab('RETURNED')}
          >
            <span>Giải trình</span>
            <span className="apt-tab-count" style={{ background: 'rgba(14, 165, 233, 0.2)', color: '#0ea5e9' }}>
              {kpis.returned}
            </span>
          </button>
          <button
            type="button"
            className={`apt-tab-btn ${activeTab === 'REJECTED' ? 'active' : ''}`}
            onClick={() => setActiveTab('REJECTED')}
          >
            <span>Từ chối</span>
            <span className="apt-tab-count">{kpis.rejected}</span>
          </button>
        </div>

        <div className="apt-search-box">
          <Search size={15} color="var(--text-muted)" />
          <input
            type="text"
            className="apt-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã, khách hàng..."
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 4. Table Card */}
      <div className="apt-table-card">
        <div className="apt-table-wrapper">
          <table className="apt-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Mã phiếu</th>
                <th style={{ width: '150px' }}>Đơn hàng</th>
                <th style={{ width: '220px' }}>Khách hàng</th>
                <th>Sản phẩm yêu cầu thẩm định</th>
                <th style={{ width: '160px', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((t, idx) => {
                const seq = String(idx + 1 + page * 50).padStart(2, '0');
                return (
                  <tr
                    key={t.id}
                    onClick={() => openDetail(t, idx + 1 + page * 50)}
                  >
                    {/* Mã phiếu: Hiển thị 1 -> n (PO-#01) */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="apt-seq-badge ticket" title={`ID: ${t.id}`}>
                            #PO-{seq}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopy(t.id, e)}
                            title="Sao chép UUID phiếu gốc"
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                          >
                            {copiedId === t.id ? <CheckCheck size={12} color="#10b981" /> : <Copy size={12} />}
                          </button>
                        </div>
                        <div>
                          <span className="apt-round-badge">Lần #{t.review_round}</span>
                        </div>
                      </div>
                    </td>

                    {/* Đơn hàng: Hiển thị 1 -> n (ĐH-#01) + giá tiền */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="apt-seq-badge order" title={`Mã đơn gốc: ${t.order_id}`}>
                            #ĐH-{seq}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopy(t.order_id, e)}
                            title="Sao chép UUID đơn hàng"
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                          >
                            {copiedId === t.order_id ? <CheckCheck size={12} color="#10b981" /> : <Copy size={12} />}
                          </button>
                        </div>
                        <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#10b981' }}>
                          {formatVnd(t.order_total)}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="apt-customer-cell">
                        <span className="apt-customer-name">
                          {t.customer_name || 'Khách vãng lai'}
                        </span>
                        <span className="apt-customer-meta">
                          <Phone size={11} />
                          <span>{t.customer_phone || 'Chưa cập nhật SĐT'}</span>
                        </span>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className="apt-product-badge">
                          {t.product_names || 'Thiết bị SmartBox Residential'}
                        </span>
                        {t.item_count != null && (
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {t.item_count} mặt hàng cần thẩm định xuất kho
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ textAlign: 'center' }}>{renderBadge(t.status)}</td>

                    <td style={{ textAlign: 'center' }}>
                      {t.status === 'PENDING' ? (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(t, idx + 1 + page * 50);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                          }}
                        >
                          <ShieldCheck size={14} />
                          <span>Thẩm định</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(t, idx + 1 + page * 50);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontSize: '0.8rem'
                          }}
                        >
                          <Eye size={13} />
                          <span>Chi tiết</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredRows.length === 0 && !loading && (
                <tr>
                  <td colSpan={6}>
                    <div className="apt-empty-state">
                      <div className="apt-empty-icon">
                        <FileText size={32} />
                      </div>
                      <h4 className="apt-empty-title">Không tìm thấy phiếu nào</h4>
                      <p className="apt-empty-desc">
                        {searchQuery
                          ? 'Không có kết quả nào phù hợp với từ khóa tìm kiếm của bạn.'
                          : 'Hiện không có phiếu thẩm định đơn hàng nào ở trạng thái này.'}
                      </p>
                      {(activeTab !== 'ALL' || searchQuery) && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setActiveTab('ALL');
                            setSearchQuery('');
                          }}
                          style={{ marginTop: '8px' }}
                        >
                          Xóa bộ lọc
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="workspace-pagination" style={{ borderTop: '1px solid var(--border-subtle)', margin: 0, padding: '12px 18px' }}>
          <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Hiển thị <strong>{filteredRows.length}</strong> / <strong>{rows.length}</strong> phiếu
          </span>
          <div className="workspace-pagination-controls">
            <button
              type="button"
              className="workspace-pagination-btn"
              disabled={loading || busy || page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Trước
            </button>
            <span style={{ padding: '0 8px', fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              Trang {page + 1}
            </span>
            <button
              type="button"
              className="workspace-pagination-btn"
              disabled={loading || busy || rows.length < 50}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

