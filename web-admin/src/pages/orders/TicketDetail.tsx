import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  FileCheck,
  ArrowLeft,
  Copy,
  CheckCheck,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Package,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  History,
  Check,
  X,
  RefreshCw,
  Info,
  Truck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../contexts/ToastContext';
import { adminRequest, AdminApiError } from '../../services/adminRequest';
import { deliveryApi, Job } from '../../services/deliveryInstallation';
import { PoDeliveryDispatch } from '../../components/delivery/PoDeliveryDispatch';
import { PoAcceptanceReview } from '../../components/delivery/PoAcceptanceReview';
import './ticket-detail.css';

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
    icon: <Clock size={13} />
  },
  APPROVED: {
    label: 'Đã phê duyệt',
    bg: 'rgba(16, 185, 129, 0.12)',
    color: '#10b981',
    border: 'rgba(16, 185, 129, 0.28)',
    icon: <CheckCircle2 size={13} />
  },
  RETURNED: {
    label: 'Chờ giải trình',
    bg: 'rgba(14, 165, 233, 0.12)',
    color: '#0ea5e9',
    border: 'rgba(14, 165, 233, 0.28)',
    icon: <RotateCcw size={13} />
  },
  REJECTED: {
    label: 'Đã từ chối',
    bg: 'rgba(239, 68, 68, 0.12)',
    color: '#ef4444',
    border: 'rgba(239, 68, 68, 0.28)',
    icon: <XCircle size={13} />
  },
  CANCELLED: {
    label: 'Đã hủy đơn',
    bg: 'rgba(100, 116, 139, 0.12)',
    color: '#64748b',
    border: 'rgba(100, 116, 139, 0.28)',
    icon: <XCircle size={13} />
  }
};

const formatVnd = (amount?: number | null) => {
  if (amount == null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return iso;
  }
};

export const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Overall Ticket Decision State
  const [actionType, setActionType] = useState<'return' | 'reject' | null>(null);
  const [decisionReason, setDecisionReason] = useState('');

  // Item Reject Dialog State (Replaces native browser prompt)
  const [itemRejectDialog, setItemRejectDialog] = useState<{
    open: boolean;
    orderItemId: string | null;
    productName: string;
  }>({ open: false, orderItemId: null, productName: '' });
  const [itemRejectReason, setItemRejectReason] = useState('');
  const [deliveryJob, setDeliveryJob] = useState<Job | null>(null);
  const [loadingJob, setLoadingJob] = useState<boolean>(false);

  const isPO = profile?.role === 'product_manager';
  const backListUrl = isPO ? '/po/approvals' : '/admin/orders/approvals';

  const loadDeliveryJob = useCallback(async (orderId: string) => {
    setLoadingJob(true);
    try {
      const job = await deliveryApi.forOrder(orderId);
      setDeliveryJob(job);
    } catch {
      setDeliveryJob(null);
    } finally {
      setLoadingJob(false);
    }
  }, []);

  const seqInfo = useMemo(() => {
    const s = location.state as { seq?: string; orderSeq?: string } | undefined;
    return {
      seq: s?.seq || id?.slice(0, 4).toUpperCase() || '01',
      orderSeq: s?.orderSeq || ticket?.order_id?.slice(0, 4).toUpperCase() || '01'
    };
  }, [location.state, id, ticket?.order_id]);

  const loadTicket = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await adminRequest<Ticket>(`/tickets/${id}`);
      setTicket(data);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải chi tiết phiếu', 'Lỗi tải phiếu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTicket();
  }, [id]);

  useEffect(() => {
    if (ticket?.order_id) {
      void loadDeliveryJob(ticket.order_id);
    }
  }, [ticket?.order_id, loadDeliveryJob]);

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success(`Đã sao chép: ${text.slice(0, 8)}...`, 'Sao chép thành công');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Parse Address Snapshot JSON cleanly
  const parsedAddress = useMemo(() => {
    const raw = ticket?.shipping_address_snapshot || ticket?.order?.shipping_address_snapshot;
    if (!raw) return null;
    try {
      const obj = JSON.parse(raw);
      return {
        recipientName: obj.recipientName || obj.name || obj.fullName || ticket?.customer_name,
        phone: obj.phone || obj.phoneNumber || ticket?.customer_phone,
        fullAddress: obj.fullAddress || obj.address || obj.street || raw
      };
    } catch {
      return {
        recipientName: ticket?.customer_name,
        phone: ticket?.customer_phone,
        fullAddress: raw
      };
    }
  }, [ticket]);

  // Sort Audit History: NEWEST FIRST ("sắp xếp từ mới nhất trước")
  const sortedHistory = useMemo(() => {
    if (!ticket?.history) return [];
    return [...ticket.history].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return timeB - timeA;
    });
  }, [ticket?.history]);

  // Act on single item (approve / reject)
  const actItem = async (orderItemId: string, action: 'approve' | 'reject', customReason?: string) => {
    if (!ticket || busy) return;
    setBusy(true);
    try {
      const updated = await adminRequest<Ticket>(
        `/tickets/${ticket.id}/items/${orderItemId}/${action}`,
        {
          method: 'POST',
          ...(action === 'reject' ? { body: JSON.stringify({ reason: customReason || 'Từ chối xuất kho' }) } : {})
        }
      );
      setTicket(updated);
      toast.success(
        action === 'approve' ? 'Đã duyệt sản phẩm trong đơn.' : 'Đã từ chối sản phẩm này.',
        'Cập nhật thành công'
      );
      setItemRejectDialog({ open: false, orderItemId: null, productName: '' });
      setItemRejectReason('');
    } catch (e: any) {
      toast.error(e?.message || 'Không thể cập nhật sản phẩm', 'Lỗi thao tác');
    } finally {
      setBusy(false);
    }
  };

  // Act on entire ticket
  const actTicket = async (action: 'approve' | 'return' | 'reject') => {
    if (!ticket || busy) return;
    if (action !== 'approve' && !decisionReason.trim()) {
      toast.error('Vui lòng nhập lý do giải trình hoặc từ chối.', 'Thiếu thông tin');
      return;
    }

    setBusy(true);
    try {
      const updated = await adminRequest<Ticket>(`/tickets/${ticket.id}/${action}`, {
        method: 'POST',
        ...(action === 'approve' ? {} : { body: JSON.stringify({ reason: decisionReason.trim() }) })
      });
      setTicket(updated);
      toast.success(
        action === 'approve'
          ? 'Đã phê duyệt PO Ticket thành công. Đơn hàng chuyển sang chuẩn bị xuất kho.'
          : action === 'return'
          ? 'Đã gửi yêu cầu giải trình đến bộ phận kinh doanh.'
          : 'Đã từ chối phiếu PO Ticket thành công.',
        'Thao tác thành công'
      );
      setDecisionReason('');
      setActionType(null);
    } catch (e: any) {
      toast.error(e?.message || 'Thao tác thất bại', 'Lỗi phê duyệt');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="tkd-page">
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="spin" style={{ marginBottom: 12 }} />
          <p>Đang tải chi tiết phiếu thẩm định PO #{seqInfo.seq}...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="tkd-page">
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <AlertTriangle size={36} color="#ef4444" style={{ marginBottom: 12 }} />
          <h3>Không tìm thấy phiếu phê duyệt PO</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            Phiếu có thể đã bị xóa hoặc bạn không có quyền xem thông tin phiếu này.
          </p>
          <Link to={backListUrl} className="btn btn-secondary">
            &larr; Quay lại danh sách phiếu
          </Link>
        </div>
      </div>
    );
  }

  const currentStatusCfg = statusConfig[ticket.status] || {
    label: ticket.status,
    bg: 'rgba(100, 116, 139, 0.12)',
    color: '#64748b',
    border: 'rgba(100, 116, 139, 0.28)',
    icon: <Clock size={13} />
  };

  return (
    <div className="tkd-page">
      {/* 1. Top Navigation Bar */}
      <div className="tkd-top-nav">
        <Link to={backListUrl} className="tkd-back-btn" id="tkd-back-to-list-btn">
          <span className="tkd-back-icon">
            <ArrowLeft size={16} />
          </span>
          <span>Quay lại danh sách phiếu PO</span>
        </Link>

        <button
          type="button"
          onClick={() => void loadTicket()}
          className="tkd-refresh-btn"
          disabled={busy}
          id="tkd-refresh-btn"
          title="Tải lại dữ liệu phiếu mới nhất"
        >
          <RefreshCw size={13} className={busy ? 'spin' : ''} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* 2. Header Card */}
      <div className="tkd-header-card">
        <div className="tkd-header-left">
          <div className="tkd-header-icon">
            <FileCheck size={22} />
          </div>
          <div>
            <h1 className="tkd-header-title">
              <span>Phiếu Thẩm Định PO #{seqInfo.seq}</span>
              <span
                className="tkd-status-badge"
                style={{
                  background: currentStatusCfg.bg,
                  color: currentStatusCfg.color,
                  borderColor: currentStatusCfg.border
                }}
              >
                {currentStatusCfg.icon}
                <span>{currentStatusCfg.label}</span>
              </span>
            </h1>

            <div className="tkd-header-meta">
              <span className="tkd-seq-tag po">
                PO: #{seqInfo.seq}
                <button
                  type="button"
                  onClick={(e) => handleCopy(ticket.id, e)}
                  title="Sao chép UUID phiếu"
                  className="tkd-copy-icon-btn"
                >
                  {copiedId === ticket.id ? <CheckCheck size={12} color="#10b981" /> : <Copy size={12} />}
                </button>
              </span>

              <span className="tkd-seq-tag order">
                Đơn hàng: #ĐH-{seqInfo.orderSeq}
                <button
                  type="button"
                  onClick={(e) => handleCopy(ticket.order_id, e)}
                  title="Sao chép UUID đơn hàng"
                  className="tkd-copy-icon-btn"
                >
                  {copiedId === ticket.order_id ? <CheckCheck size={12} color="#10b981" /> : <Copy size={12} />}
                </button>
              </span>

              <span className="tkd-meta-item">
                <Clock size={13} />
                <span>Lần thẩm định #{ticket.review_round}</span>
              </span>

              <span className="tkd-meta-item">
                <Calendar size={13} />
                <span>Tạo lúc: {formatDateTime(ticket.created_at)}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Workspace Grid */}
      <div className="tkd-grid">
        {/* Left Column: Details, Items, Actions */}
        <div>
          {/* Card 1: Customer & Order Overview */}
          <div className="tkd-card">
            <div className="tkd-card-header">
              <h3 className="tkd-card-title">
                <User size={18} color="var(--accent-primary)" />
                <span>Thông tin Đơn hàng & Người nhận</span>
              </h3>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Đơn giá trị: <b style={{ color: '#10b981', fontSize: '0.95rem' }}>{formatVnd(ticket.order_total || ticket.order?.total)}</b>
              </span>
            </div>

            <div className="tkd-info-cols">
              {/* Customer Column */}
              <div className="tkd-info-block">
                <div className="tkd-info-block-title">
                  <User size={14} />
                  <span>Khách hàng & Người nhận</span>
                </div>

                <div className="tkd-info-row">
                  <span className="tkd-info-label">Người nhận:</span>
                  <span className="tkd-info-val">
                    {parsedAddress?.recipientName || ticket.customer_name || 'Khách vãng lai'}
                  </span>
                </div>

                <div className="tkd-info-row">
                  <span className="tkd-info-label">Điện thoại:</span>
                  <span className="tkd-info-val">
                    {parsedAddress?.phone || ticket.customer_phone ? (
                      <a
                        href={`tel:${parsedAddress?.phone || ticket.customer_phone}`}
                        style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 700 }}
                      >
                        {parsedAddress?.phone || ticket.customer_phone}
                      </a>
                    ) : (
                      'Chưa có số điện thoại'
                    )}
                  </span>
                </div>

                <div className="tkd-info-row">
                  <span className="tkd-info-label">Email:</span>
                  <span className="tkd-info-val">
                    {ticket.customer_email || ticket.customer?.email || 'Chưa cung cấp'}
                  </span>
                </div>

                <div className="tkd-info-row">
                  <span className="tkd-info-label">Địa chỉ nhận:</span>
                  <span className="tkd-info-val" style={{ lineHeight: 1.4 }}>
                    {parsedAddress?.fullAddress || ticket.customer?.default_address || 'Địa chỉ tiêu chuẩn'}
                  </span>
                </div>
              </div>

              {/* Order Column */}
              <div className="tkd-info-block">
                <div className="tkd-info-block-title">
                  <CreditCard size={14} />
                  <span>Chi tiết đơn hàng</span>
                </div>

                <div className="tkd-info-row">
                  <span className="tkd-info-label">Mã đơn gốc:</span>
                  <span className="tkd-info-val" style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.82rem' }}>
                    {ticket.order_id}
                  </span>
                </div>

                <div className="tkd-info-row">
                  <span className="tkd-info-label">Tổng thanh toán:</span>
                  <span className="tkd-info-val" style={{ fontSize: '1.15rem', color: '#10b981', fontWeight: 800 }}>
                    {formatVnd(ticket.order_total || ticket.order?.total)}
                  </span>
                </div>

                <div className="tkd-info-row">
                  <span className="tkd-info-label">Số mặt hàng:</span>
                  <span className="tkd-info-val">
                    {ticket.itemApprovals?.length ?? ticket.item_count ?? 1} cấu hình sản phẩm
                  </span>
                </div>

                <div className="tkd-info-row">
                  <span className="tkd-info-label">Trạng thái đơn:</span>
                  <span className="tkd-info-val" style={{ textTransform: 'uppercase', color: 'var(--accent-primary)' }}>
                    {ticket.order?.status || 'Chờ phê duyệt xuất kho'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Product Items to Audit */}
          <div className="tkd-card">
            <div className="tkd-card-header">
              <h3 className="tkd-card-title">
                <Package size={18} color="var(--accent-primary)" />
                <span>Danh mục sản phẩm trong đơn thẩm định ({ticket.itemApprovals?.length ?? 0})</span>
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                PO thẩm định tính khả dụng của từng mặt hàng trước khi xuất kho
              </span>
            </div>

            <div className="tkd-item-list">
              {ticket.itemApprovals && ticket.itemApprovals.length > 0 ? (
                ticket.itemApprovals.map((item) => {
                  const isManagerOfItem = isPO && (!item.managerId || item.managerId === profile?.id);
                  const itemStatus = item.status || 'PENDING';

                  return (
                    <div key={item.id} className="tkd-item-card">
                      <div className="tkd-item-left">
                        <div className="tkd-item-icon-box">
                          <Package size={22} />
                        </div>
                        <div className="tkd-item-info">
                          <span className="tkd-item-title">
                            {item.productName || 'SmartBox Residential'}
                          </span>
                          <div className="tkd-item-meta">
                            <span>Biến thể: <b>{item.variantName || 'Tiêu chuẩn'}</b></span>
                            <span>SKU: <code style={{ color: 'var(--accent-sky)' }}>{item.sku || 'N/A'}</code></span>
                            {isPO && isManagerOfItem && (
                              <span className="tkd-po-managed-tag">
                                &check; Bạn trực tiếp quản lý
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="tkd-item-right">
                        <div className="tkd-item-price-box">
                          <div className="tkd-item-unit">
                            {item.quantity} chiếc &times; {formatVnd(item.price)}
                          </div>
                          <div className="tkd-item-subtotal">
                            {formatVnd(item.subtotal || (item.quantity || 1) * (item.price || 0))}
                          </div>
                        </div>

                        <div className="tkd-item-actions">
                          {isPO && itemStatus === 'PENDING' ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={busy || !isManagerOfItem}
                                onClick={() => void actItem(item.orderItemId, 'approve')}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  color: '#10b981',
                                  borderColor: 'rgba(16, 185, 129, 0.3)',
                                  fontWeight: 700
                                }}
                              >
                                <Check size={14} />
                                <span>Duyệt</span>
                              </button>

                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={busy || !isManagerOfItem}
                                onClick={() => {
                                  setItemRejectReason('');
                                  setItemRejectDialog({
                                    open: true,
                                    orderItemId: item.orderItemId,
                                    productName: item.productName || 'Sản phẩm này'
                                  });
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  color: '#ef4444',
                                  borderColor: 'rgba(239, 68, 68, 0.3)',
                                  fontWeight: 700
                                }}
                              >
                                <X size={14} />
                                <span>Từ chối</span>
                              </button>
                            </>
                          ) : itemStatus === 'PENDING' ? (
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                background: 'rgba(245, 158, 11, 0.12)',
                                color: '#d97706',
                                border: '1px solid rgba(245, 158, 11, 0.25)'
                              }}
                            >
                              ⏳ Chờ PO thẩm định
                            </span>
                          ) : (
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                background: itemStatus === 'APPROVED' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                color: itemStatus === 'APPROVED' ? '#10b981' : '#ef4444'
                              }}
                            >
                              {itemStatus === 'APPROVED' ? 'Đã duyệt mặt hàng' : 'Đã từ chối mặt hàng'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  Chưa có danh sách mặt hàng chi tiết trong phiếu này.
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Action Decision Box */}
          <div className="tkd-decision-card">
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 800, color: 'var(--tkd-text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="var(--accent-primary)" />
              <span>Quyết định thẩm định PO Ticket</span>
            </h3>
            <p className="tkd-decision-desc">
              Sau khi phê duyệt, đơn hàng sẽ được phân quyền xuất kho và chuyển cho kỹ thuật viên tiếp nhận thi công, bàn giao thiết bị.
            </p>

            {!isPO ? (
              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                marginTop: '12px'
              }}>
                <ShieldCheck size={24} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1d4ed8', marginBottom: 4 }}>
                    Chế độ Giám sát Vận hành (Audit Log - Chỉ xem)
                  </div>
                  <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Quy trình thẩm định đơn hàng và phê duyệt PO thuộc thẩm quyền chuyên môn của <strong>Quản lý Sản phẩm & Kho (PO)</strong>. Quản trị viên chỉ theo dõi tiến trình và dữ liệu kiểm toán, không trực tiếp duyệt hoặc từ chối phiếu PO.
                  </div>
                </div>
              </div>
            ) : ticket.status === 'PENDING' ? (
              <>
                <div className="tkd-decision-buttons">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => void actTicket('approve')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 24px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderColor: '#059669'
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Phê duyệt toàn bộ phiếu PO</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() => {
                      setActionType(actionType === 'return' ? null : 'return');
                      setDecisionReason('');
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      fontWeight: 600,
                      color: '#0ea5e9',
                      borderColor: 'rgba(14, 165, 233, 0.35)'
                    }}
                  >
                    <RotateCcw size={16} />
                    <span>Yêu cầu giải trình</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() => {
                      setActionType(actionType === 'reject' ? null : 'reject');
                      setDecisionReason('');
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      fontWeight: 600,
                      color: '#ef4444',
                      borderColor: 'rgba(239, 68, 68, 0.35)'
                    }}
                  >
                    <XCircle size={16} />
                    <span>Từ chối phiếu</span>
                  </button>
                </div>

                {/* Inline Reason Box when Return or Reject is clicked */}
                {actionType && (
                  <div className="tkd-reason-box">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: actionType === 'return' ? '#0ea5e9' : '#ef4444' }}>
                        {actionType === 'return'
                          ? 'Ghi chú nội dung yêu cầu giải trình đến bộ phận kinh doanh:'
                          : 'Nhập lý do từ chối toàn bộ phiếu PO này:'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActionType(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Quick reason suggestions */}
                    <div className="tkd-reason-chips">
                      {(actionType === 'return'
                        ? ['Cần làm rõ địa chỉ giao hàng', 'Khách hẹn dời lịch giao', 'Thiếu thông tin người nhận', 'Cần điều chỉnh phí thi công']
                        : ['Hết hàng trong kho phân phối', 'Sản phẩm tạm ngừng kinh doanh', 'Đơn hàng nghi vấn gian lận', 'Khách hàng yêu cầu hủy đơn']
                      ).map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          className="tkd-chip"
                          onClick={() => setDecisionReason(chip)}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={3}
                      value={decisionReason}
                      onChange={(e) => setDecisionReason(e.target.value)}
                      placeholder="Nhập chi tiết lý do gửi thông báo..."
                      style={{
                        width: '100%',
                        borderRadius: '10px',
                        padding: '12px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: '0.88rem',
                        resize: 'vertical',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />

                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setActionType(null)}
                        disabled={busy}
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${actionType === 'return' ? 'btn-primary' : 'btn-danger'}`}
                        disabled={busy || !decisionReason.trim()}
                        onClick={() => void actTicket(actionType)}
                        style={{
                          fontWeight: 700,
                          padding: '6px 18px',
                          background: actionType === 'return' ? '#0ea5e9' : '#ef4444',
                          borderColor: actionType === 'return' ? '#0ea5e9' : '#ef4444',
                          color: '#fff'
                        }}
                      >
                        {busy ? 'Đang gửi...' : 'Xác nhận gửi quyết định'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="tkd-decision-status-banner" style={{ background: currentStatusCfg.bg, borderColor: currentStatusCfg.border }}>
                <div className="tkd-decision-status-row">
                  {currentStatusCfg.icon}
                  <span style={{ fontWeight: 700, color: currentStatusCfg.color }}>
                    Phiếu đã ở trạng thái &ldquo;{currentStatusCfg.label}&rdquo;
                  </span>
                </div>
                {ticket.reason && (
                  <p className="tkd-decision-status-reason">
                    Ghi chú quyết định: {ticket.reason}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Section: PO Dispatch & Technician Acceptance Workflow */}
          {ticket.status === 'APPROVED' && (
            <div style={{ marginTop: '20px' }}>
              {loadingJob ? (
                <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                  <RefreshCw size={20} className="spin" style={{ color: 'var(--accent-primary)', marginBottom: 8 }} />
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    Đang kiểm tra thông tin phân công kỹ thuật viên...
                  </p>
                </div>
              ) : !deliveryJob ? (
                <PoDeliveryDispatch
                  orderId={ticket.order_id}
                  orderCode={ticket.order_id.slice(0, 8).toUpperCase()}
                  onAssigned={(created) => setDeliveryJob(created)}
                />
              ) : deliveryJob.status === 'WAITING_PO_CONFIRMATION' || deliveryJob.status === 'COMPLETED' ? (
                <PoAcceptanceReview
                  job={deliveryJob}
                  onUpdated={(updated) => {
                    setDeliveryJob(updated);
                    void loadTicket();
                  }}
                />
              ) : (
                <div className="tkd-card" style={{ marginTop: '16px' }}>
                  <div className="tkd-card-header">
                    <h3 className="tkd-card-title">
                      <Truck size={20} color="#4f46e5" />
                      <span>Tiến độ thi công & giao hàng (Kỹ thuật viên)</span>
                    </h3>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: 'rgba(79, 70, 229, 0.1)',
                        color: '#4f46e5',
                        border: '1px solid rgba(79, 70, 229, 0.25)',
                      }}
                    >
                      {deliveryJob.status === 'ASSIGNED'
                        ? 'Đã phân công - Chờ KTV bắt đầu'
                        : deliveryJob.status === 'IN_PROGRESS'
                        ? 'KTV đang thực hiện ca làm việc'
                        : deliveryJob.status === 'DELIVERED'
                        ? 'Đã giao hàng tới khách'
                        : deliveryJob.status === 'INSTALLED'
                        ? 'Đã lắp đặt hoàn tất'
                        : deliveryJob.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                    <div>
                      <strong>Lịch hẹn thi công:</strong>{' '}
                      {new Date(deliveryJob.scheduledAt).toLocaleString('vi-VN')}
                      {deliveryJob.estimatedEndTime &&
                        ` - ${new Date(deliveryJob.estimatedEndTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                    </div>
                    {deliveryJob.customer?.fullName && (
                      <div>
                        <strong>Khách hàng:</strong> {deliveryJob.customer.fullName} ({deliveryJob.customer.phone || 'N/A'})
                      </div>
                    )}
                    {deliveryJob.installationNote && (
                      <div style={{ color: 'var(--text-secondary)' }}>
                        <strong>Dặn dò kỹ thuật:</strong> {deliveryJob.installationNote}
                      </div>
                    )}
                    {deliveryJob.reworkNotes && (
                      <div style={{ color: '#dc2626', fontWeight: 600 }}>
                        ⚠️ Đang yêu cầu KTV xử lý lại: {deliveryJob.reworkNotes}
                      </div>
                    )}
                    <div style={{ marginTop: 6, display: 'flex', gap: 10 }}>
                      <Link to={isPO ? '/po/delivery' : '/admin/orders/delivery'} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Truck size={14} /> Xem trên trang Điều phối
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Audit Trail (Top-Right, Sorted Newest First) & Guidelines */}
        <div>
          {/* Card 4: Audit Trail - TOP RIGHT, NEWEST FIRST */}
          <div className="tkd-card">
            <div className="tkd-audit-header">
              <div>
                <h3 className="tkd-card-title" style={{ fontSize: '1rem' }}>
                  <History size={17} color="var(--accent-primary)" />
                  <span>Nhật ký xét duyệt & giải trình</span>
                </h3>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  (Audit Trail · Sắp xếp mới nhất trước)
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-sky)' }}>
                {sortedHistory.length} mốc
              </span>
            </div>

            <ol className="tkd-audit-timeline">
              {sortedHistory.length > 0 ? (
                sortedHistory.map((h, idx) => {
                  const isNewest = idx === 0;
                  return (
                    <li key={h.id || idx} className="tkd-audit-item">
                      <span className={`tkd-audit-dot ${isNewest ? 'newest' : ''}`} />
                      <div className="tkd-audit-action">
                        <span>{h.action}</span>
                        {isNewest && (
                          <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: '#10b981', color: '#fff', fontWeight: 700 }}>
                            Mới nhất
                          </span>
                        )}
                      </div>
                      <div className="tkd-audit-time">{formatDateTime(h.created_at)}</div>
                      {h.reason && (
                        <div className="tkd-audit-note">
                          {h.reason}
                        </div>
                      )}
                    </li>
                  );
                })
              ) : (
                <li style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  Chưa có lịch sử thao tác.
                </li>
              )}
            </ol>
          </div>

          {/* Card 5: PO Guidelines & Policy */}
          <div className="tkd-card tkd-guidelines-card">
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.88rem', fontWeight: 700, color: 'var(--tkd-text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={14} color="var(--accent-primary)" />
              <span>Quy chuẩn xuất kho PO</span>
            </h4>
            <ul className="tkd-guidelines-list">
              <li>PO chỉ thẩm định các mặt hàng và biến thể thuộc danh mục phân quyền quản lý.</li>
              <li>Kiểm tra kỹ số lượng tồn kho khả dụng trước khi bấm &ldquo;Phê duyệt&rdquo;.</li>
              <li>Khi toàn bộ mặt hàng được duyệt, đơn hàng tự động kích hoạt điều phối kỹ thuật viên lắp đặt.</li>
              <li>Nếu thiếu hàng, có thể từ chối riêng mặt hàng đó hoặc yêu cầu kinh doanh đổi mã.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 4. In-Page Modal: Reject Single Item (NO BROWSER PROMPT) */}
      {itemRejectDialog.open && (
        <div className="tkd-modal-overlay" onClick={() => setItemRejectDialog({ open: false, orderItemId: null, productName: '' })}>
          <div className="tkd-modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <XCircle size={18} />
                <span>Từ chối mặt hàng xuất kho</span>
              </h3>
              <button
                type="button"
                onClick={() => setItemRejectDialog({ open: false, orderItemId: null, productName: '' })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Nhập lý do từ chối sản phẩm <b>&ldquo;{itemRejectDialog.productName}&rdquo;</b>:
            </p>

            <div className="tkd-reason-chips">
              {['Hết hàng trong kho', 'Lỗi linh kiện phần cứng', 'Sai quy cách sản phẩm', 'Khách yêu cầu hủy món'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="tkd-chip"
                  onClick={() => setItemRejectReason(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={itemRejectReason}
              onChange={(e) => setItemRejectReason(e.target.value)}
              placeholder="Nhập lý do cụ thể..."
              style={{
                width: '100%',
                borderRadius: '10px',
                padding: '12px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setItemRejectDialog({ open: false, orderItemId: null, productName: '' })}
                disabled={busy}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={busy || !itemRejectReason.trim()}
                onClick={() => {
                  if (itemRejectDialog.orderItemId) {
                    void actItem(itemRejectDialog.orderItemId, 'reject', itemRejectReason.trim());
                  }
                }}
                style={{ fontWeight: 700, padding: '6px 18px', background: '#ef4444', color: '#fff', borderColor: '#ef4444' }}
              >
                {busy ? 'Đang lưu...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetail;
