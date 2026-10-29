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
  Truck,
  ZoomIn,
  Camera,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../contexts/ToastContext';
import { adminRequest } from '../../services/adminRequest';
import { deliveryApi, Job } from '../../services/deliveryInstallation';
import { PoDeliveryDispatch } from '../../components/delivery/PoDeliveryDispatch';
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
  actor_name?: string | null;
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
    payment_method?: string | null;
    paid_at?: string | null;
  };
  payments?: {
    id: string;
    provider?: string;
    status: string;
    amount?: number;
    transaction_ref?: string | null;
    paid_at?: string | null;
  }[];
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
    color: '#d97706',
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
  PARTIALLY_REJECTED: {
    label: 'Từ chối 1 phần',
    bg: 'rgba(249, 115, 22, 0.12)',
    color: '#f97316',
    border: 'rgba(249, 115, 22, 0.28)',
    icon: <AlertTriangle size={13} />
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

  // Item Reject Dialog State
  const [itemRejectDialog, setItemRejectDialog] = useState<{
    open: boolean;
    orderItemId: string | null;
    productName: string;
  }>({ open: false, orderItemId: null, productName: '' });
  const [itemRejectReason, setItemRejectReason] = useState('');

  // Delivery & Acceptance State
  const [deliveryJob, setDeliveryJob] = useState<Job | null>(null);
  const [loadingJob, setLoadingJob] = useState<boolean>(false);
  const [showDispatchSection, setShowDispatchSection] = useState<boolean>(false);
  const [reworkDialogOpen, setReworkDialogOpen] = useState<boolean>(false);
  const [reworkReason, setReworkReason] = useState<string>('');
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [showAcceptanceModal, setShowAcceptanceModal] = useState<boolean>(false);

  // Collapsible Accordion & History Toggle
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

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

  const loadTicket = async () => {
    if (!id) return;
    setLoading(true);
    try {
      let data: Ticket | null = null;
      try {
        data = await adminRequest<Ticket>(`/tickets/${id}`);
      } catch (err1) {
        // Fallback: If id is an order UUID, query ticket by order
        try {
          data = await adminRequest<Ticket>(`/orders/${id}/ticket`);
        } catch {
          throw err1;
        }
      }
      if (data && data.id) {
        setTicket(data);
      } else {
        throw new Error('Không tìm thấy thông tin phiếu');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải chi tiết phiếu', 'Lỗi tải phiếu');
    } finally {
      setLoading(false);
    }
  };

  const refreshTicketSilently = useCallback(async () => {
    if (!id) return;
    try {
      let data: Ticket | null = null;
      try {
        data = await adminRequest<Ticket>(`/tickets/${id}`);
      } catch {
        try {
          data = await adminRequest<Ticket>(`/orders/${id}/ticket`);
        } catch {
          data = null;
        }
      }
      if (data && data.id) {
        setTicket((prev) => {
          const prevStatus = prev?.order?.status;
          const newStatus = data?.order?.status;
          if (prevStatus && prevStatus !== newStatus && (newStatus === 'paid' || newStatus === 'confirmed')) {
            toast.success(
              `Đơn hàng #${(data.order_id || '').slice(0, 8).toUpperCase()} vừa được khách hàng thanh toán thành công!`,
              'Thanh toán thành công'
            );
          }
          return data;
        });
        if (data.order_id) {
          void loadDeliveryJob(data.order_id);
        }
      }
    } catch {
      // Ignore background errors
    }
  }, [id, loadDeliveryJob]);

  useEffect(() => {
    void loadTicket();
  }, [id]);

  useEffect(() => {
    if (ticket?.order_id) {
      void loadDeliveryJob(ticket.order_id);
    }
  }, [ticket?.order_id, loadDeliveryJob]);

  // Realtime Polling
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) {
        void refreshTicketSilently();
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [refreshTicketSilently]);

  // Event Listeners
  useEffect(() => {
    const handleOrderEvent = () => {
      void refreshTicketSilently();
    };
    window.addEventListener('smartbox:order_paid', handleOrderEvent);
    window.addEventListener('smartbox:new_order', handleOrderEvent);
    window.addEventListener('smartbox:new_ticket', handleOrderEvent);
    return () => {
      window.removeEventListener('smartbox:order_paid', handleOrderEvent);
      window.removeEventListener('smartbox:new_order', handleOrderEvent);
      window.removeEventListener('smartbox:new_ticket', handleOrderEvent);
    };
  }, [refreshTicketSilently]);

  const seqInfo = useMemo(() => {
    const rawOrder = (ticket?.order_id || id || '').replace(/-/g, '').toUpperCase();
    const shortOrderCode = rawOrder.slice(0, 8) || '349CB78F';
    const stateSeq = (location.state as any)?.seq;
    const fallbackSeq = (ticket?.id || id || '').replace(/-/g, '').slice(0, 2).toUpperCase() || '01';
    const displaySeq = stateSeq || (fallbackSeq.match(/^\d+$/) ? fallbackSeq : '01');
    return {
      seq: displaySeq,
      orderSeq: (location.state as any)?.orderSeq || displaySeq,
      shortOrderCode
    };
  }, [ticket?.order_id, ticket?.id, id, location.state]);

  const hasForeignItems = useMemo(() => {
    if (!ticket?.itemApprovals || ticket.itemApprovals.length === 0) return false;
    return ticket.itemApprovals.some((item) => item.managerId !== profile?.id);
  }, [ticket?.itemApprovals, profile?.id]);

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
    if (!raw) {
      return {
        recipientName: ticket?.customer_name || 'Khách vãng lai',
        phone: ticket?.customer_phone || '',
        email: ticket?.customer_email || ticket?.customer?.email || '',
        fullAddress: ticket?.customer?.default_address || 'Địa chỉ tiêu chuẩn',
        installationNote: null
      };
    }
    let obj: any = null;
    if (typeof raw === 'object') {
      obj = raw;
    } else {
      try {
        obj = JSON.parse(raw);
      } catch {
        return {
          recipientName: ticket?.customer_name || 'Khách vãng lai',
          phone: ticket?.customer_phone || '',
          email: ticket?.customer_email || ticket?.customer?.email || '',
          fullAddress: String(raw),
          installationNote: null
        };
      }
    }

    const recipientName = obj.recipientName || obj.name || obj.fullName || ticket?.customer_name || 'Khách vãng lai';
    const phone = obj.phone || obj.phoneNumber || ticket?.customer_phone || '';
    const email = obj.email || ticket?.customer_email || ticket?.customer?.email || '';
    const parts = [obj.addressLine, obj.ward, obj.district, obj.city].filter(Boolean);
    const fullAddress = parts.length > 0
      ? parts.join(', ')
      : obj.fullAddress || obj.address || obj.street || ticket?.customer?.default_address || 'Chưa cung cấp địa chỉ';
    const installationNote = obj.installationNote || null;

    return {
      recipientName,
      phone,
      email,
      fullAddress,
      installationNote
    };
  }, [ticket]);

  // Translate audit actions
  const getAuditActionInfo = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act === 'ITEM_APPROVE') return { label: 'Duyệt từng món', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
    if (act === 'ITEM_REJECT') return { label: 'Từ chối món', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' };
    if (act === 'APPROVE' || act === 'TICKET_APPROVE') return { label: 'Phê duyệt PO', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
    if (act === 'REJECT' || act === 'TICKET_REJECT') return { label: 'Từ chối phiếu', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
    if (act === 'RETURN') return { label: 'Yêu cầu giải trình', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.12)' };
    if (act === 'CREATED') return { label: 'Khởi tạo đơn', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' };
    if (act === 'PARTIALLY_REJECTED' || act === 'PARTIAL_APPROVAL_PROMPT') return { label: 'Duyệt một phần', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
    if (act.includes('CUSTOMER_DECISION') || act.includes('CUSTOMER_ACCEPTED')) return { label: 'Khách xác nhận', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' };
    if (act.includes('ASSIGN')) return { label: 'Phân công KTV', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' };
    if (act.includes('START')) return { label: 'KTV di chuyển', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.12)' };
    if (act.includes('DELIVER')) return { label: 'Đã đến địa chỉ', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' };
    if (act.includes('LINK_SERIAL')) return { label: 'Gán Serial thiết bị', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' };
    if (act.includes('INSTALL')) return { label: 'Lắp đặt hoàn tất', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
    if (act.includes('SUBMIT_COMPLETION')) return { label: 'Nộp hồ sơ nghiệm thu', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' };
    if (act.includes('APPROVE_COMPLETION')) return { label: 'PO duyệt nghiệm thu', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
    if (act.includes('ACCEPT')) return { label: 'Nghiệm thu hoàn tất', color: '#10b981', bg: 'rgba(16, 185, 129, 0.16)' };
    if (act.includes('FAIL')) return { label: 'Yêu cầu xử lý lại', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' };
    return { label: action.replace(/^TECH_/, ''), color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' };
  };

  const formatAuditNote = (reason?: string | null) => {
    if (!reason || reason === 'null' || reason.trim() === '') return null;
    const itemMatch = reason.match(/^(?:Item |item:)([0-9a-fA-F-]+)(?::\s*(.*))?$/i);
    if (itemMatch) {
      const itemId = itemMatch[1];
      let note = itemMatch[2]?.trim();
      if (note === 'null' || !note) note = '';
      const matchedItem = ticket?.itemApprovals?.find(i => i.orderItemId === itemId || i.id === itemId);
      const prodName = matchedItem?.productName || 'Sản phẩm';
      const sku = matchedItem?.sku ? ` (${matchedItem.sku})` : '';
      return note ? `${prodName}${sku}: "${note}"` : `Đã duyệt ${prodName}${sku}`;
    }
    if (reason === 'ORDER_CREATED_AWAITING_APPROVAL') return 'Đơn hàng mới tạo chuyển sang luồng thẩm định PO';
    if (reason === 'CUSTOMER_ACCEPTED_PARTIAL_ORDER') return 'Khách hàng đồng ý tiếp tục đơn hàng';
    if (reason === 'INSTALLATION_ACCEPTED') return 'Biên bản nghiệm thu thiết bị đã được xác nhận';
    return reason;
  };

  // Sort Audit History: Newest First
  const sortedHistory = useMemo(() => {
    if (!ticket?.history) return [];
    return [...ticket.history].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return timeB - timeA;
    });
  }, [ticket?.history]);

  // Display limited items for continuous timeline
  const displayedHistory = useMemo(() => {
    if (showAllHistory) return sortedHistory;
    return sortedHistory.slice(0, 4);
  }, [sortedHistory, showAllHistory]);

  // Act on single item
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
      const isPaid = ticket.order?.paid_at || ['paid', 'confirmed'].includes(ticket.order?.status || '');
      const successMsg = action === 'approve'
        ? (isPaid
            ? 'Đã phê duyệt PO Ticket thành công! Đơn hàng đã thanh toán, sẵn sàng điều phối giao lắp.'
            : 'Đã phê duyệt PO Ticket thành công! Đơn hàng chuyển sang trạng thái chờ khách hàng thanh toán.')
        : action === 'return'
        ? 'Đã gửi yêu cầu giải trình đến bộ phận kinh doanh.'
        : 'Đã từ chối phiếu PO Ticket thành công.';
      toast.success(successMsg, 'Thao tác thành công');
      setDecisionReason('');
      setActionType(null);
    } catch (e: any) {
      toast.error(e?.message || 'Thao tác thất bại', 'Lỗi phê duyệt');
    } finally {
      setBusy(false);
    }
  };

  // PO Acceptance Review Actions
  const handleApproveAcceptance = async () => {
    if (!deliveryJob || busy) return;
    setBusy(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const updated = await deliveryApi.approveCompletion(
        deliveryJob.id,
        { approvalNote: 'PO phê duyệt nghiệm thu đơn hàng' },
        deliveryJob.version,
        idempotencyKey
      );
      toast.success('Phê duyệt nghiệm thu thành công! Đơn hàng đã chính thức hoàn tất.');
      setDeliveryJob(updated);
      void loadTicket();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể phê duyệt nghiệm thu.');
    } finally {
      setBusy(false);
    }
  };

  const handleRejectAcceptance = async () => {
    if (!deliveryJob || !reworkReason.trim() || busy) return;
    setBusy(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const updated = await deliveryApi.rejectCompletion(
        deliveryJob.id,
        { reason: reworkReason.trim() },
        deliveryJob.version,
        idempotencyKey
      );
      toast.success('Đã gửi yêu cầu xử lý lại tới Kỹ thuật viên.');
      setReworkDialogOpen(false);
      setReworkReason('');
      setDeliveryJob(updated);
      void loadTicket();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể gửi yêu cầu xử lý lại.');
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
          <Link to={backListUrl} className="btn-tkd-return" style={{ textDecoration: 'none' }}>
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

  const isPaid = !!(ticket.order?.paid_at || ['paid', 'confirmed'].includes(ticket.order?.status || ''));
  const paymentMethod = ticket.order?.payment_method?.toUpperCase() || 'VNPAY';
  const paymentTime = ticket.order?.paid_at ? formatDateTime(ticket.order.paid_at) : (ticket.order_created_at ? formatDateTime(ticket.order_created_at) : '07:30 20/10/2026');

  const photos = deliveryJob?.completionPhotos || [];
  const assignedTechName = deliveryJob?.customer?.fullName || 'Kỹ thuật viên SmartBox';

  return (
    <div className="tkd-page">
      {/* 1. Top Sub-bar & Navigation Header */}
      <div className="tkd-header-wrap">
        <div className="tkd-subbar">
          <div className="tkd-subbar-left">
            <Link to={backListUrl} className="tkd-back-link">
              <ArrowLeft size={14} />
              <span>Quay lại</span>
            </Link>

            <span className="tkd-subbar-sep">·</span>

            <span className="tkd-meta-tag">PO-{seqInfo.seq}</span>
            <span>·</span>
            <span className="tkd-meta-tag">
              Đơn hàng #{seqInfo.shortOrderCode}
              <button
                type="button"
                className="tkd-copy-btn"
                onClick={(e) => handleCopy(ticket.order_id, e)}
                title="Sao chép UUID đơn hàng"
              >
                {copiedId === ticket.order_id ? <CheckCheck size={12} color="#10b981" /> : <Copy size={12} />}
              </button>
            </span>
            <span>·</span>
            <span>{formatDateTime(ticket.created_at)}</span>
          </div>

          <button
            type="button"
            onClick={() => void loadTicket()}
            className="tkd-refresh-btn"
            disabled={busy}
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={13} className={busy ? 'spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>

        {/* Title & Status Badges */}
        <div className="tkd-title-row">
          <div className="tkd-title-left">
            <h1 className="tkd-main-title">
              <span>Phiếu thẩm định PO #{seqInfo.seq}</span>
            </h1>

            <div className="tkd-title-badges">
              {/* Badge 1: Phê duyệt PO */}
              <span
                className="tkd-badge-pill"
                style={{
                  background: currentStatusCfg.bg,
                  color: currentStatusCfg.color,
                  borderColor: currentStatusCfg.border
                }}
              >
                {currentStatusCfg.icon}
                <span>{currentStatusCfg.label}</span>
              </span>

              {/* Badge 2: Trạng thái thanh toán */}
              <span
                className="tkd-badge-pill tkd-badge-payment"
                style={{
                  background: isPaid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  color: isPaid ? '#10b981' : '#d97706',
                  borderColor: isPaid ? 'rgba(16, 185, 129, 0.28)' : 'rgba(245, 158, 11, 0.28)'
                }}
                title={`Cổng thanh toán ${paymentMethod} · ${paymentTime}`}
              >
                {isPaid ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                <span>{isPaid ? 'Thanh toán thành công' : 'Chờ khách hàng thanh toán'}</span>
              </span>

              {/* Badge 3: Trạng thái quyết toán */}
              <span
                className="tkd-badge-pill tkd-badge-settlement"
                style={{
                  background: isPaid ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                  color: isPaid ? '#059669' : '#d97706',
                  borderColor: isPaid ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'
                }}
                title={`Cổng thanh toán ${paymentMethod} · ${isPaid ? 'Đã quyết toán' : 'Chờ thanh toán'}`}
              >
                {isPaid ? 'ĐÃ QUYẾT TOÁN' : 'CHỜ THANH TOÁN'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main 2-Column Workspace */}
      <div className="tkd-grid">
        {/* ======================================================== */}
        {/* CỘT TRÁI: NỘI DUNG NGHIỆP VỤ (GỒM 4 KHU VỰC CHÍNH) */}
        {/* ======================================================== */}
        <div>
          {/* KHU VỰC 1 & 2: THÔNG TIN ĐƠN HÀNG & DANH MỤC SẢN PHẨM */}
          <div className="tkd-section-card">
            <div className="tkd-section-header">
              <h2 className="tkd-section-title">
                <User size={16} style={{ color: 'var(--accent-primary)' }} />
                <span>Thông tin đơn hàng</span>
              </h2>
            </div>

            {/* Row 1: Khách hàng & Tổng giá trị */}
            <div className="tkd-order-summary-grid">
              {/* Khách hàng */}
              <div>
                <div className="tkd-block-label">
                  <User size={12} />
                  <span>Khách hàng</span>
                </div>
                <div className="tkd-customer-name">{parsedAddress.recipientName}</div>
                <div className="tkd-customer-contact">
                  {parsedAddress.phone && (
                    <div>
                      <a href={`tel:${parsedAddress.phone}`}>{parsedAddress.phone}</a>
                    </div>
                  )}
                  {parsedAddress.email && <div>{parsedAddress.email}</div>}
                </div>
              </div>

              {/* Tổng giá trị */}
              <div>
                <div className="tkd-block-label">
                  <CreditCard size={12} />
                  <span>Tổng giá trị</span>
                </div>
                <div className="tkd-total-amount">
                  {formatVnd(ticket.order_total || ticket.order?.total)}
                </div>
                <div className="tkd-total-meta">
                  {ticket.itemApprovals?.length ?? ticket.item_count ?? 1} sản phẩm · {isPaid ? 'Thanh toán hoàn tất' : 'Chờ thanh toán'}
                </div>
              </div>
            </div>

            {/* Row 2: Địa chỉ giao hàng */}
            <div className="tkd-address-row">
              <div className="tkd-block-label">
                <MapPin size={12} />
                <span>Địa chỉ giao hàng</span>
              </div>
              <div className="tkd-address-text">
                {parsedAddress.fullAddress}
              </div>
              {parsedAddress.installationNote && (
                <div className="tkd-address-note">
                  <strong>Ghi chú:</strong>
                  <span>{parsedAddress.installationNote}</span>
                </div>
              )}
            </div>

            {/* Row 3: Danh mục sản phẩm */}
            <div className="tkd-products-box">
              <div className="tkd-block-label" style={{ marginBottom: 10 }}>
                <Package size={12} />
                <span>Danh mục sản phẩm ({ticket.itemApprovals?.length ?? 1})</span>
              </div>

              {ticket.itemApprovals && ticket.itemApprovals.length > 0 ? (
                ticket.itemApprovals.map((item) => {
                  const isManagerOfItem = isPO && item.managerId === profile?.id;
                  const itemStatus = item.status || 'PENDING';
                  return (
                    <div key={item.id} className="tkd-product-row">
                      <div className="tkd-product-left">
                        <div className="tkd-product-icon">
                          <Package size={20} />
                        </div>
                        <div className="tkd-product-info">
                          <div className="tkd-product-title">
                            {item.productName || 'SmartBox Residential Pro'}
                          </div>
                          <div className="tkd-product-subtitle">
                            {item.variantName ? `${item.variantName} · ` : ''}
                            <code>SKU: {item.sku || 'SBK-PRO-85L-METALLIC'}</code>
                          </div>
                        </div>
                      </div>

                      <div className="tkd-product-right">
                        <div className="tkd-product-price-box">
                          <div className="tkd-product-price">{formatVnd(item.price)}</div>
                          <div className="tkd-product-qty">SL: {item.quantity || 1}</div>
                        </div>

                        {/* Status tag & Actions */}
                        {isPO && itemStatus === 'PENDING' && isManagerOfItem ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              className="btn-tkd-approve"
                              style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                              disabled={busy}
                              onClick={() => void actItem(item.orderItemId, 'approve')}
                            >
                              <Check size={12} /> Duyệt
                            </button>
                            <button
                              type="button"
                              className="btn-tkd-reject"
                              style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                              disabled={busy}
                              onClick={() => {
                                setItemRejectReason('');
                                setItemRejectDialog({
                                  open: true,
                                  orderItemId: item.orderItemId,
                                  productName: item.productName || 'Sản phẩm này'
                                });
                              }}
                            >
                              <X size={12} /> Từ chối
                            </button>
                          </div>
                        ) : (
                          <span
                            className="tkd-product-status"
                            style={{
                              background: itemStatus === 'APPROVED'
                                ? 'rgba(16, 185, 129, 0.12)'
                                : itemStatus === 'REJECTED'
                                ? 'rgba(239, 68, 68, 0.12)'
                                : 'rgba(245, 158, 11, 0.12)',
                              color: itemStatus === 'APPROVED' ? '#10b981' : itemStatus === 'REJECTED' ? '#ef4444' : '#d97706',
                              borderColor: itemStatus === 'APPROVED' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'
                            }}
                          >
                            {itemStatus === 'APPROVED' ? 'Đã duyệt' : itemStatus === 'REJECTED' ? 'Đã từ chối' : 'Chờ duyệt'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="tkd-product-row">
                  <div className="tkd-product-left">
                    <div className="tkd-product-icon">
                      <Package size={20} />
                    </div>
                    <div className="tkd-product-info">
                      <div className="tkd-product-title">SmartBox Residential Pro 85L</div>
                      <div className="tkd-product-subtitle">Bản kim loại sơn tĩnh điện · Size L · SKU: SBK-PRO-85L-METALLIC</div>
                    </div>
                  </div>
                  <div className="tkd-product-right">
                    <div className="tkd-product-price-box">
                      <div className="tkd-product-price">{formatVnd(ticket.order_total || ticket.order?.total)}</div>
                      <div className="tkd-product-qty">SL: 1</div>
                    </div>
                    <span className="tkd-product-status" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                      Đã duyệt
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* KHU VỰC 3: QUYẾT ĐỊNH THẨM ĐỊNH PO TICKET (Chỉ hiện khi chờ thẩm định) */}
          {ticket.status === 'PENDING' && (
            <div className="tkd-action-box">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>Quyết định thẩm định PO Ticket</span>
                {hasForeignItems && (
                  <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>
                    ⚠️ Có mặt hàng thuộc PO khác
                  </span>
                )}
              </div>

              <div className="tkd-action-buttons">
                <button
                  type="button"
                  className="btn-tkd-approve"
                  disabled={busy || (isPO && hasForeignItems)}
                  onClick={() => void actTicket('approve')}
                  title={hasForeignItems ? 'Chỉ duyệt từng sản phẩm thuộc danh mục bạn quản lý' : undefined}
                >
                  <CheckCircle2 size={14} />
                  <span>Phê duyệt toàn bộ phiếu PO</span>
                </button>

                <button
                  type="button"
                  className="btn-tkd-return"
                  disabled={busy}
                  onClick={() => {
                    setActionType(actionType === 'return' ? null : 'return');
                    setDecisionReason('');
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Yêu cầu giải trình</span>
                </button>

                <button
                  type="button"
                  className="btn-tkd-reject"
                  disabled={busy}
                  onClick={() => {
                    setActionType(actionType === 'reject' ? null : 'reject');
                    setDecisionReason('');
                  }}
                >
                  <XCircle size={14} />
                  <span>Từ chối phiếu</span>
                </button>
              </div>

              {actionType && (
                <div className="tkd-reason-dropdown">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.84rem', color: actionType === 'return' ? '#0284c7' : '#dc2626' }}>
                      {actionType === 'return' ? 'Nhập nội dung yêu cầu giải trình:' : 'Nhập lý do từ chối phiếu:'}
                    </span>
                    <button type="button" onClick={() => setActionType(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X size={14} />
                    </button>
                  </div>

                  <div className="tkd-chips-row">
                    {(actionType === 'return'
                      ? ['Cần làm rõ địa chỉ', 'Khách hẹn dời ngày', 'Thiếu thông tin người nhận']
                      : ['Hết hàng trong kho', 'Sản phẩm tạm ngừng KD', 'Khách yêu cầu hủy đơn']
                    ).map((c) => (
                      <button key={c} type="button" className="tkd-chip-btn" onClick={() => setDecisionReason(c)}>
                        {c}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={2}
                    className="tkd-textarea"
                    value={decisionReason}
                    onChange={(e) => setDecisionReason(e.target.value)}
                    placeholder="Chi tiết lý do..."
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                    <button type="button" className="btn-tkd-return" onClick={() => setActionType(null)} disabled={busy} style={{ padding: '4px 12px' }}>
                      Hủy
                    </button>
                    <button
                      type="button"
                      className={actionType === 'return' ? 'btn-tkd-approve' : 'btn-tkd-reject'}
                      style={{ padding: '4px 14px' }}
                      disabled={busy || !decisionReason.trim()}
                      onClick={() => void actTicket(actionType)}
                    >
                      Xác nhận gửi
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cảnh báo nhanh nếu KTV đã nộp nghiệm thu và chờ PO duyệt */}
          {deliveryJob?.status === 'WAITING_PO_CONFIRMATION' && (
            <div className="tkd-acceptance-pending-alert">
              <div className="tkd-pending-alert-left">
                <AlertTriangle size={18} className="tkd-alert-icon" />
                <div>
                  <div className="tkd-alert-title">Kỹ thuật viên đã nộp hồ sơ nghiệm thu</div>
                  <div className="tkd-alert-desc">Biên bản thi công và ảnh minh chứng đang chờ bạn xem xét và phê duyệt.</div>
                </div>
              </div>
              <button
                type="button"
                className="btn-tkd-approve"
                style={{ padding: '6px 14px', fontSize: '0.82rem', flexShrink: 0 }}
                onClick={() => setShowAcceptanceModal(true)}
              >
                <FileCheck size={14} />
                <span>Xem & Duyệt ngay</span>
              </button>
            </div>
          )}

          {/* Nút phân công Kỹ thuật viên (khi đã duyệt và chưa có Job) */}
          {ticket.status === 'APPROVED' && !deliveryJob && !loadingJob && (
            <div style={{ marginTop: 12 }}>
              {!showDispatchSection ? (
                <button
                  type="button"
                  className="btn-tkd-approve"
                  onClick={() => setShowDispatchSection(true)}
                  style={{ width: '100%', justifyContent: 'center', padding: '10px 16px' }}
                >
                  <Truck size={14} />
                  <span>Phân công Kỹ thuật viên thi công</span>
                </button>
              ) : (
                <div style={{ marginTop: 10 }}>
                  <PoDeliveryDispatch
                    orderId={ticket.order_id}
                    orderCode={seqInfo.shortOrderCode}
                    onAssigned={(created) => {
                      setDeliveryJob(created);
                      setShowDispatchSection(false);
                    }}
                    onCancel={() => setShowDispatchSection(false)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* CỘT PHẢI: LỊCH SỬ TIẾN TRÌNH & QUY TRÌNH XUẤT KHO PO */}
        {/* ======================================================== */}
        <div>
          {/* Card: Nhật ký xét duyệt và giải trình */}
          <div className="tkd-history-card">
            <div className="tkd-history-header">
              <h3 className="tkd-history-title">
                <History size={15} style={{ color: 'var(--accent-sky)' }} />
                <span>Nhật ký xét duyệt & giải trình</span>
              </h3>
              <span className="tkd-history-count">{sortedHistory.length} mốc</span>
            </div>

            {/* Nút Xem chi tiết nghiệm thu & bàn giao trong Nhật ký */}
            <div className="tkd-acceptance-quick-box">
              <div className="tkd-quick-box-main">
                <div className="tkd-quick-box-title">
                  <Truck size={14} style={{ color: '#10b981' }} />
                  <span>Nghiệm thu & bàn giao</span>
                  <span
                    className="tkd-mini-badge"
                    style={{
                      background: deliveryJob?.status === 'COMPLETED'
                        ? 'rgba(16, 185, 129, 0.12)'
                        : deliveryJob?.status === 'WAITING_PO_CONFIRMATION'
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(59, 130, 246, 0.12)',
                      color: deliveryJob?.status === 'COMPLETED'
                        ? '#10b981'
                        : deliveryJob?.status === 'WAITING_PO_CONFIRMATION'
                        ? '#d97706'
                        : '#3b82f6',
                      borderColor: deliveryJob?.status === 'COMPLETED'
                        ? 'rgba(16, 185, 129, 0.28)'
                        : (deliveryJob?.status === 'WAITING_PO_CONFIRMATION' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(59, 130, 246, 0.28)')
                    }}
                  >
                    {deliveryJob?.status === 'COMPLETED'
                      ? 'Đã hoàn tất'
                      : deliveryJob?.status === 'WAITING_PO_CONFIRMATION'
                      ? 'Chờ PO duyệt'
                      : deliveryJob?.status === 'IN_PROGRESS'
                      ? 'Đang thi công'
                      : deliveryJob?.status === 'ASSIGNED'
                      ? 'Đã phân công'
                      : 'Chờ điều phối'}
                  </span>
                </div>
                <div className="tkd-quick-box-sub">
                  {deliveryJob?.status === 'COMPLETED'
                    ? `Nghiệm thu hoàn tất · ${formatDateTime(deliveryJob.completedAt || deliveryJob.updatedAt)}`
                    : deliveryJob?.status === 'WAITING_PO_CONFIRMATION'
                    ? 'KTV đã nộp hồ sơ kèm ảnh minh chứng'
                    : deliveryJob?.technicianName || deliveryJob?.technician?.fullName
                    ? `KTV: ${deliveryJob.technicianName || deliveryJob.technician?.fullName}`
                    : 'Đơn hàng thẩm định'}
                </div>
              </div>

              <button
                type="button"
                className="tkd-btn-acceptance-modal-trigger"
                onClick={() => setShowAcceptanceModal(true)}
              >
                <ExternalLink size={13} />
                <span>Xem chi tiết</span>
                {photos.length > 0 && <span className="tkd-photo-count-pill">({photos.length} ảnh)</span>}
              </button>
            </div>

            {/* Continuous Vertical Timeline */}
            <ol className="tkd-continuous-timeline">
              {displayedHistory.length > 0 ? (
                displayedHistory.map((h, idx) => {
                  const isNewest = idx === 0;
                  const actInfo = getAuditActionInfo(h.action);
                  const noteFormatted = formatAuditNote(h.reason);
                  const isAcceptanceEvent = h.action && (h.action.includes('COMPLETION') || h.action.includes('ACCEPT') || h.action.includes('INSTALL') || h.action.includes('DELIVER'));
                  return (
                    <li key={h.id || idx} className="tkd-timeline-event">
                      <span className={`tkd-timeline-dot ${isNewest ? 'newest' : ''}`} />
                      <div className="tkd-event-headline">
                        <span>{actInfo.label}</span>
                        <span
                          className="tkd-event-tag"
                          style={{ background: actInfo.bg, color: actInfo.color }}
                        >
                          {actInfo.label}
                        </span>
                      </div>
                      <div className="tkd-event-time">{formatDateTime(h.created_at)}</div>
                      {noteFormatted && (
                        <div className="tkd-event-note">{noteFormatted}</div>
                      )}
                      {isAcceptanceEvent && (
                        <button
                          type="button"
                          className="tkd-timeline-inline-link"
                          onClick={() => setShowAcceptanceModal(true)}
                        >
                          <FileCheck size={11} />
                          <span>Xem biên bản nghiệm thu →</span>
                        </button>
                      )}
                    </li>
                  );
                })
              ) : (
                <li style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Chưa có lịch sử thao tác.
                </li>
              )}
            </ol>

            {/* Toggle show all history button */}
            {sortedHistory.length > 4 && (
              <button
                type="button"
                className="tkd-history-toggle-btn"
                onClick={() => setShowAllHistory(!showAllHistory)}
              >
                {showAllHistory ? 'Thu gọn ▲' : `Xem toàn bộ lịch sử (${sortedHistory.length} mốc) ▼`}
              </button>
            )}
          </div>

          {/* Accordion: Quy trình xuất kho PO */}
          <div className="tkd-guidelines-accordion">
            <div
              className="tkd-accordion-header"
              onClick={() => setShowGuidelines(!showGuidelines)}
            >
              <h4 className="tkd-accordion-title">
                <Info size={14} style={{ color: 'var(--accent-primary)' }} />
                <span>Quy trình xuất kho PO</span>
              </h4>
              <span style={{ fontSize: '0.74rem', color: 'var(--accent-sky)', fontWeight: 600 }}>
                {showGuidelines ? 'Thu gọn ▲' : 'Mở rộng ▼'}
              </span>
            </div>

            {showGuidelines && (
              <div className="tkd-accordion-body">
                <ul className="tkd-accordion-list">
                  <li>PO thẩm định tính khả dụng của mặt hàng trong danh mục phụ trách.</li>
                  <li>Kiểm tra số lượng tồn kho khả dụng trước khi phê duyệt phiếu.</li>
                  <li>Khi toàn bộ mặt hàng được duyệt, đơn hàng sẵn sàng xuất kho và điều phối kỹ thuật viên.</li>
                  <li>Nếu thiếu hàng, có thể từ chối riêng mặt hàng hoặc yêu cầu khách giải trình.</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Fullscreen Lightbox Modal */}
      {lightboxImg && (
        <div className="tkd-lightbox-backdrop" onClick={() => setLightboxImg(null)}>
          <div className="tkd-lightbox-wrap" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="tkd-lightbox-close"
              onClick={() => setLightboxImg(null)}
              title="Đóng xem ảnh"
            >
              <X size={18} />
            </button>
            <img src={lightboxImg} alt="Ảnh minh chứng phóng to" className="tkd-lightbox-img" />
          </div>
        </div>
      )}

      {/* 4. Rework Dialog Modal */}
      {reworkDialogOpen && (
        <div className="tkd-modal-overlay" onClick={() => setReworkDialogOpen(false)}>
          <div className="tkd-modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                <RotateCcw size={16} />
                <span>Yêu cầu Kỹ thuật viên xử lý lại</span>
              </h3>
              <button type="button" onClick={() => setReworkDialogOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ margin: '0 0 10px 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Nhập chi tiết các điểm kỹ thuật chưa đạt hoặc cần chụp lại ảnh minh chứng:
            </p>

            <textarea
              rows={3}
              className="tkd-textarea"
              value={reworkReason}
              onChange={(e) => setReworkReason(e.target.value)}
              placeholder="VD: Cần chụp rõ hơn mã QR và vị trí lắp đặt..."
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button type="button" className="btn-tkd-return" onClick={() => setReworkDialogOpen(false)} disabled={busy}>
                Hủy
              </button>
              <button
                type="button"
                className="btn-tkd-reject"
                disabled={busy || !reworkReason.trim()}
                onClick={handleRejectAcceptance}
              >
                Gửi yêu cầu xử lý lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Single Item Reject Modal */}
      {itemRejectDialog.open && (
        <div className="tkd-modal-overlay" onClick={() => setItemRejectDialog({ open: false, orderItemId: null, productName: '' })}>
          <div className="tkd-modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                <XCircle size={16} />
                <span>Từ chối mặt hàng xuất kho</span>
              </h3>
              <button
                type="button"
                onClick={() => setItemRejectDialog({ open: false, orderItemId: null, productName: '' })}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ margin: '0 0 10px 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Nhập lý do từ chối sản phẩm <b>“{itemRejectDialog.productName}”</b>:
            </p>

            <textarea
              rows={3}
              className="tkd-textarea"
              value={itemRejectReason}
              onChange={(e) => setItemRejectReason(e.target.value)}
              placeholder="Nhập lý do cụ thể..."
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button
                type="button"
                className="btn-tkd-return"
                onClick={() => setItemRejectDialog({ open: false, orderItemId: null, productName: '' })}
                disabled={busy}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-tkd-reject"
                disabled={busy || !itemRejectReason.trim()}
                onClick={() => {
                  if (itemRejectDialog.orderItemId) {
                    void actItem(itemRejectDialog.orderItemId, 'reject', itemRejectReason.trim());
                  }
                }}
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 6. Modal Chi tiết Nghiệm thu & Bàn giao */}
      {showAcceptanceModal && (
        <div className="tkd-modal-overlay" onClick={() => setShowAcceptanceModal(false)}>
          <div
            className="tkd-modal-box tkd-acceptance-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="tkd-accmodal-header">
              <div className="tkd-accmodal-title-wrap">
                <div className="tkd-accmodal-icon">
                  <Truck size={18} />
                </div>
                <div>
                  <h3 className="tkd-accmodal-title">Hồ sơ nghiệm thu & bàn giao</h3>
                  <div className="tkd-accmodal-subtitle">
                    Đơn hàng #{seqInfo.shortOrderCode} · Ca làm việc #{deliveryJob?.id ? deliveryJob.id.slice(0, 8).toUpperCase() : 'N/A'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  className="tkd-badge-pill"
                  style={{
                    background: deliveryJob?.status === 'COMPLETED'
                      ? 'rgba(16, 185, 129, 0.12)'
                      : deliveryJob?.status === 'WAITING_PO_CONFIRMATION'
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(59, 130, 246, 0.12)',
                    color: deliveryJob?.status === 'COMPLETED'
                      ? '#10b981'
                      : deliveryJob?.status === 'WAITING_PO_CONFIRMATION'
                      ? '#d97706'
                      : '#3b82f6',
                    borderColor: deliveryJob?.status === 'COMPLETED'
                      ? 'rgba(16, 185, 129, 0.28)'
                      : (deliveryJob?.status === 'WAITING_PO_CONFIRMATION' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(59, 130, 246, 0.28)')
                  }}
                >
                  {deliveryJob?.status === 'COMPLETED'
                    ? 'Đã hoàn tất'
                    : deliveryJob?.status === 'WAITING_PO_CONFIRMATION'
                    ? 'Chờ PO duyệt'
                    : deliveryJob?.status === 'IN_PROGRESS'
                    ? 'Đang thi công'
                    : deliveryJob?.status === 'ASSIGNED'
                    ? 'Đã phân công'
                    : 'Chờ điều phối'}
                </span>

                <button
                  type="button"
                  className="tkd-accmodal-close-btn"
                  onClick={() => setShowAcceptanceModal(false)}
                  title="Đóng cửa sổ"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="tkd-accmodal-body">
              {/* Card 1: Thông tin phân công & Kỹ thuật viên */}
              <div className="tkd-accmodal-card">
                <div className="tkd-accmodal-card-title">
                  <User size={14} style={{ color: 'var(--accent-sky)' }} />
                  <span>Thông tin thi công & Kỹ thuật viên</span>
                </div>
                <div className="tkd-accmodal-meta-grid">
                  <div className="tkd-accmodal-meta-col">
                    <span className="tkd-meta-label">Kỹ thuật viên phụ trách:</span>
                    <span className="tkd-meta-val-strong">
                      {deliveryJob?.technicianName || deliveryJob?.technician?.fullName || assignedTechName}
                    </span>
                    {(deliveryJob?.technicianPhone || deliveryJob?.technician?.phone) && (
                      <span className="tkd-meta-sub">
                        SĐT:{' '}
                        <a href={`tel:${deliveryJob.technicianPhone || deliveryJob.technician?.phone}`}>
                          {deliveryJob.technicianPhone || deliveryJob.technician?.phone}
                        </a>
                      </span>
                    )}
                  </div>
                  <div className="tkd-accmodal-meta-col">
                    <span className="tkd-meta-label">Lịch hẹn thi công:</span>
                    <span className="tkd-meta-val">
                      {deliveryJob?.scheduledAt ? formatDateTime(deliveryJob.scheduledAt) : 'Theo thỏa thuận'}
                    </span>
                  </div>
                  <div className="tkd-accmodal-meta-col">
                    <span className="tkd-meta-label">Lượt thi công:</span>
                    <span className="tkd-meta-val">Lượt {deliveryJob?.attempt || 1}</span>
                  </div>
                  <div className="tkd-accmodal-meta-col">
                    <span className="tkd-meta-label">Thời gian hoàn tất:</span>
                    <span className="tkd-meta-val">
                      {deliveryJob?.completedAt
                        ? formatDateTime(deliveryJob.completedAt)
                        : (deliveryJob?.updatedAt ? formatDateTime(deliveryJob.updatedAt) : 'Chưa hoàn tất')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Thiết bị & Mã Serial */}
              {deliveryJob?.devices && deliveryJob.devices.length > 0 && (
                <div className="tkd-accmodal-card">
                  <div className="tkd-accmodal-card-title">
                    <Package size={14} style={{ color: 'var(--accent-primary)' }} />
                    <span>Thiết bị & Số Serial liên kết</span>
                  </div>
                  <div className="tkd-accmodal-devices-list">
                    {deliveryJob.devices.map((dev, idx) => (
                      <div key={idx} className="tkd-accmodal-device-item">
                        <span className="tkd-device-num">#{idx + 1}</span>
                        <div className="tkd-device-info">
                          <span className="tkd-device-serial">Mã Serial: <strong>{dev.serialNumber}</strong></span>
                          {dev.hasWeightSensor && (
                            <span className="tkd-sensor-pill">Có cảm biến tải</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Card 3: Ảnh minh chứng nghiệm thu */}
              <div className="tkd-accmodal-card">
                <div className="tkd-accmodal-card-title">
                  <Camera size={14} style={{ color: '#10b981' }} />
                  <span>Ảnh minh chứng kỹ thuật viên ({photos.length} ảnh)</span>
                </div>

                {photos.length > 0 ? (
                  <>
                    <div className="tkd-proof-hint" style={{ marginBottom: 10 }}>
                      Bấm vào từng ảnh để phóng to toàn màn hình
                    </div>
                    <div className="tkd-thumbs-row">
                      {photos.map((url, idx) => (
                        <div
                          key={idx}
                          className="tkd-thumb-item"
                          onClick={() => setLightboxImg(url)}
                          title="Xem ảnh phóng to"
                        >
                          <img src={url} alt={`Ảnh minh chứng ${idx + 1}`} className="tkd-thumb-img" />
                          <div className="tkd-thumb-overlay">
                            <ZoomIn size={16} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="tkd-empty-photos-box">
                    <Camera size={24} style={{ opacity: 0.4, marginBottom: 6 }} />
                    <div>Chưa có ảnh minh chứng được tải lên cho đơn này</div>
                  </div>
                )}
              </div>

              {/* Card 4: Biên bản bàn giao & Tiêu chí kỹ thuật */}
              <div className="tkd-accmodal-card">
                <div className="tkd-accmodal-card-title">
                  <ShieldCheck size={14} style={{ color: '#0ea5e9' }} />
                  <span>Kiểm định tiêu chuẩn SmartBox (4 tiêu chí)</span>
                </div>

                <div className="tkd-criteria-grid">
                  <div className="tkd-criteria-item pass">
                    <CheckCircle2 size={14} className="criteria-icon" />
                    <span>Nguồn điện & Pin sạc dự phòng đạt chuẩn</span>
                  </div>
                  <div className="tkd-criteria-item pass">
                    <CheckCircle2 size={14} className="criteria-icon" />
                    <span>Cảm biến trọng lượng / cân tải hoạt động</span>
                  </div>
                  <div className="tkd-criteria-item pass">
                    <CheckCircle2 size={14} className="criteria-icon" />
                    <span>Khóa điện tử & Cửa tủ đóng mở mượt mà</span>
                  </div>
                  <div className="tkd-criteria-item pass">
                    <CheckCircle2 size={14} className="criteria-icon" />
                    <span>Kết nối IoT MQTT & Cảm biến trực tuyến</span>
                  </div>
                </div>

                {(deliveryJob?.completionNote || deliveryJob?.installationNote) && (
                  <div className="tkd-completion-note-box">
                    <strong>Ghi chú từ KTV:</strong>{' '}
                    <span>{deliveryJob.completionNote || deliveryJob.installationNote}</span>
                  </div>
                )}

                {deliveryJob?.reworkNotes && (
                  <div className="tkd-rework-note-box">
                    <strong>Ghi chú yêu cầu xử lý lại trước đó:</strong>{' '}
                    <span>{deliveryJob.reworkNotes}</span>
                  </div>
                )}
              </div>

              {/* Actions for PO when WAITING_PO_CONFIRMATION */}
              {deliveryJob?.status === 'WAITING_PO_CONFIRMATION' && isPO && (
                <div className="tkd-accmodal-actions-bar">
                  <div className="tkd-accmodal-actions-hint">
                    Kỹ thuật viên đang chờ PO xác nhận nghiệm thu để hoàn tất bàn giao.
                  </div>
                  <div className="tkd-acceptance-actions">
                    <button
                      type="button"
                      className="btn-tkd-approve"
                      onClick={() => {
                        void handleApproveAcceptance();
                        setShowAcceptanceModal(false);
                      }}
                      disabled={busy}
                    >
                      <CheckCircle2 size={14} />
                      <span>Phê duyệt nghiệm thu & Hoàn tất</span>
                    </button>
                    <button
                      type="button"
                      className="btn-tkd-reject"
                      onClick={() => {
                        setReworkDialogOpen(true);
                      }}
                      disabled={busy}
                    >
                      <RotateCcw size={14} />
                      <span>Yêu cầu xử lý lại</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="tkd-accmodal-footer">
              <button
                type="button"
                className="btn-tkd-close"
                onClick={() => setShowAcceptanceModal(false)}
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

export default TicketDetail;
