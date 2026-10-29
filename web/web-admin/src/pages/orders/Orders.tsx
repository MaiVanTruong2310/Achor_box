import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  Eye,
  Truck,
  CheckCircle2,
  Clock,
  Download,
  Receipt,
  FileSpreadsheet,
  X,
  AlertCircle,
  MapPin,
  Check,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  History,
  RotateCcw,
  XCircle,
  User,
  Phone,
  CreditCard,
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Plus
} from 'lucide-react';
import { ExtendedOrder } from '../../services/api';
import { adminCatalogApi } from '../../services/adminCatalogApi';
import { adminRequest, AdminApiError } from '../../services/adminRequest';
import { deliveryApi } from '../../services/deliveryInstallation';
import { useAuth } from '../../contexts/AuthContext';
import { SalesInvoiceModal } from '../../components/SalesInvoiceModal';
import { CreateOrderModal } from '../../components/CreateOrderModal';
import { Pagination } from '../../components/Pagination';
import './orders.css';

const orderLabels: Record<string, string> = {
  pending: 'Chờ xử lý',
  awaiting_payment: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  confirmed: 'Đã duyệt',
  completed: 'Đã nghiệm thu',
  cancelled: 'Đã hủy',
  processing: 'Chuẩn bị hàng',
  shipping: 'Đang giao hàng',
  delivered: 'Đã giao hàng',
  refunded: 'Đã hoàn tiền'
};

const renderOrderStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
    case 'delivered':
      return (
        <span className="fpt-badge fpt-badge-success">
          <CheckCircle2 size={12} />
          <span>{orderLabels[status] || status}</span>
        </span>
      );
    case 'paid':
    case 'confirmed':
      return (
        <span className="fpt-badge fpt-badge-info">
          <Check size={12} />
          <span>{orderLabels[status] || status}</span>
        </span>
      );
    case 'pending':
    case 'awaiting_payment':
    case 'processing':
    case 'shipping':
      return (
        <span className="fpt-badge fpt-badge-warning">
          <Clock size={12} />
          <span>{orderLabels[status] || status}</span>
        </span>
      );
    case 'cancelled':
    case 'refunded':
      return (
        <span className="fpt-badge fpt-badge-danger">
          <XCircle size={12} />
          <span>{orderLabels[status] || status}</span>
        </span>
      );
    default:
      return (
        <span className="fpt-badge fpt-badge-customer">
          <span>{orderLabels[status] || status}</span>
        </span>
      );
  }
};

const renderOrderPaymentStatusBadge = (ord: ExtendedOrder) => {
  const isCancelled = ord.status === 'cancelled';
  const isPaid = ord.payment_status === 'paid' || Boolean((ord as any).paid_at);
  const isRefunded = ord.payment_status === 'refunded';

  if (isCancelled) {
    if (isRefunded) {
      return (
        <span style={{ color: '#0284c7', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <RotateCcw size={12} /> Đã hoàn tiền
        </span>
      );
    }
    if (isPaid) {
      return (
        <span
          style={{ color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}
          title="Đơn đã hủy nhưng đã thanh toán trước đó - Cần đối soát hoàn tiền"
        >
          <Check size={12} /> Đã thanh toán (Đã hủy)
        </span>
      );
    }
    return (
      <span
        style={{ color: '#64748b', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}
        title="Đơn hàng đã hủy khi chưa thanh toán"
      >
        <XCircle size={12} style={{ color: '#94a3b8' }} /> Chưa thanh toán
      </span>
    );
  }

  if (isPaid) {
    return (
      <span style={{ color: 'var(--fpt-emerald)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        <Check size={12} /> Đã quyết toán
      </span>
    );
  }

  if (isRefunded) {
    return (
      <span style={{ color: '#0284c7', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        <RotateCcw size={12} /> Đã hoàn tiền
      </span>
    );
  }

  return (
    <span style={{ color: 'var(--fpt-amber)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <Clock size={12} /> Chờ thanh toán
    </span>
  );
};

const ticketStatusLabels: Record<string, { label: string; bg: string; color: string; border: string }> = {
  PENDING: { label: 'Chờ thẩm định', bg: 'var(--fpt-amber-soft)', color: 'var(--fpt-amber)', border: 'rgba(245, 158, 11, 0.25)' },
  APPROVED: { label: 'Đã phê duyệt', bg: 'var(--fpt-emerald-soft)', color: 'var(--fpt-emerald)', border: 'rgba(16, 185, 129, 0.25)' },
  RETURNED: { label: 'Yêu cầu giải trình', bg: 'var(--fpt-blue-soft)', color: 'var(--fpt-blue)', border: 'rgba(37, 99, 235, 0.25)' },
  REJECTED: { label: 'Đã từ chối', bg: 'var(--fpt-rose-soft)', color: 'var(--fpt-rose)', border: 'rgba(239, 68, 68, 0.25)' }
};

interface TimelineEvent {
  id: string;
  source: string;
  action: string;
  occurredAt: string;
  reason?: string;
  attempt?: number;
  version?: number;
}

interface TimelineData {
  orderId: string;
  orderStatus: string;
  events: TimelineEvent[];
}

interface TicketData {
  id: string;
  order_id: string;
  status: string;
  review_round: number;
  reason?: string | null;
  history?: { id: string; action: string; reason?: string | null; created_at: string }[];
  itemApprovals?: { id: string; status: string; productName?: string; variantName?: string; sku?: string; reason?: string }[];
}

export const Orders: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialOrderId = searchParams.get('orderId');

  const validStatusKeys = useMemo(
    () => ['all', 'pending', 'awaiting_payment', 'paid', 'confirmed', 'completed', 'cancelled'],
    []
  );

  const getStatusFromUrl = (params: URLSearchParams) => {
    const raw = (params.get('status') || '').trim().toLowerCase();
    return validStatusKeys.includes(raw) ? raw : 'all';
  };

  const [invoiceOrder, setInvoiceOrder] = useState<string | null>(null);
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>(() => getStatusFromUrl(searchParams));

  // Sync statusFilter if URL query param changes (e.g. clicked from Dashboard or browser Back/Forward)
  useEffect(() => {
    const fromUrl = getStatusFromUrl(searchParams);
    if (fromUrl !== statusFilter) {
      setStatusFilter(fromUrl);
      setPage(0);
    }
  }, [searchParams]);

  const handleTabChange = (key: string) => {
    setStatusFilter(key);
    setPage(0);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (key === 'all') {
        next.delete('status');
      } else {
        next.set('status', key);
      }
      return next;
    }, { replace: true });
  };

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [listError, setListError] = useState('');
  const requestVersion = useRef(0);

  // Modal State for Order Details
  const [selectedOrder, setSelectedOrder] = useState<ExtendedOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'timeline' | 'approval'>('overview');

  // Timeline State within Modal
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // PO Ticket State within Modal
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [ticketReason, setTicketReason] = useState('');
  const [ticketBusy, setTicketBusy] = useState(false);
  const [ticketMsg, setTicketMsg] = useState('');
  const [ticketErr, setTicketErr] = useState('');

  const isAdmin = profile?.role === 'super_admin';
  const isPO = profile?.role === 'product_manager';
  const canApprove = isPO;
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);

  // Delivery & Installation Dispatch State (per-order action)
  const [dispatchOrder, setDispatchOrder] = useState<ExtendedOrder | null>(null);
  const [technicians, setTechnicians] = useState<{ id: string; fullName: string | null }[]>([]);
  const [technicianId, setTechnicianId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [dispatchNote, setDispatchNote] = useState('');
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchError, setDispatchError] = useState('');
  const [dispatchSuccess, setDispatchSuccess] = useState('');
  const [existingJob, setExistingJob] = useState<any | null>(null);
  const [loadingExistingJob, setLoadingExistingJob] = useState(false);

  const openDispatchModal = async (order: ExtendedOrder) => {
    setDispatchOrder(order);
    setDispatchError('');
    setDispatchSuccess('');
    setDispatchNote('');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setScheduledAt(localIso);

    try {
      const list = await deliveryApi.technicians();
      setTechnicians(list);
      if (list.length > 0 && !technicianId) {
        setTechnicianId(list[0].id);
      }
    } catch {
      // ignore
    }

    setLoadingExistingJob(true);
    try {
      const job = await adminRequest<any>(`/orders/${encodeURIComponent(order.id)}/delivery-installation`);
      setExistingJob(job);
    } catch {
      setExistingJob(null);
    } finally {
      setLoadingExistingJob(false);
    }
  };

  const handleAssignDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchOrder || dispatchLoading) return;
    if (!technicianId) {
      setDispatchError('Vui lòng chọn kỹ thuật viên phụ trách.');
      return;
    }
    const time = new Date(scheduledAt);
    if (!Number.isFinite(time.getTime())) {
      setDispatchError('Vui lòng chọn thời gian hẹn hợp lệ.');
      return;
    }

    setDispatchLoading(true);
    setDispatchError('');
    setDispatchSuccess('');

    try {
      const body = {
        assignedTo: technicianId,
        scheduledAt: time.toISOString()
      };
      const idempotencyKey = crypto.randomUUID();
      await deliveryApi.assign(dispatchOrder.id, body, idempotencyKey);
      setDispatchSuccess('Đã phân công giao hàng & lắp đặt thành công cho đơn hàng!');
      await loadOrders();
      setTimeout(() => {
        setDispatchOrder(null);
      }, 1500);
    } catch (err: any) {
      setDispatchError(err.message || 'Không thể phân công công việc. Vui lòng thử lại.');
    } finally {
      setDispatchLoading(false);
    }
  };

  // Sorting State
  const [sortField, setSortField] = useState<'created_at' | 'total' | 'customer' | 'status' | 'id'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Status Counts State
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  const statusTabs = [
    { key: 'all', label: 'Tất cả' },
    { key: 'pending', label: 'Chờ xử lý' },
    { key: 'awaiting_payment', label: 'Chờ thanh toán' },
    { key: 'paid', label: 'Đã thanh toán' },
    { key: 'confirmed', label: 'Đã duyệt' },
    { key: 'completed', label: 'Đã nghiệm thu' },
    { key: 'cancelled', label: 'Đã hủy' }
  ];

  const loadCounts = async () => {
    try {
      const counts = await adminCatalogApi.orderCounts();
      if (counts && Object.keys(counts).length > 0) {
        setStatusCounts(counts);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadCounts();
  }, [totalElements, orders.length]);

  const getTabCount = (key: string) => {
    if (statusCounts[key] !== undefined) return statusCounts[key];
    if (key === 'all') return totalElements || orders.length;
    return orders.filter((o) => o.status === key).length;
  };

  const handleSort = (field: 'created_at' | 'total' | 'customer' | 'status' | 'id') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'total' || field === 'created_at' ? 'desc' : 'asc');
    }
  };

  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const sortedOrders = useMemo(() => {
    const list = [...orders];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'created_at') {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === 'total') {
        cmp = Number(a.total || 0) - Number(b.total || 0);
      } else if (sortField === 'customer') {
        cmp = (a.customer?.full_name || '').localeCompare(b.customer?.full_name || '', 'vi');
      } else if (sortField === 'status') {
        cmp = (a.status || '').localeCompare(b.status || '');
      } else if (sortField === 'id') {
        cmp = a.id.localeCompare(b.id);
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [orders, sortField, sortOrder]);

  const loadOrders = async () => {
    const request = ++requestVersion.current;
    setLoading(true);
    setListError('');
    try {
      const data = await adminCatalogApi.orders(page, debouncedSearch, statusFilter, paymentFilter);
      if (request === requestVersion.current) {
        setOrders(data.content);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);

        // Auto open if orderId is in URL query
        if (initialOrderId && !selectedOrder) {
          const matched = data.content.find((o) => o.id === initialOrderId);
          if (matched) {
            openDetailModal(matched);
          }
        }
      }
    } catch (e) {
      if (request === requestVersion.current) {
        setListError((e as Error).message);
      }
    } finally {
      if (request === requestVersion.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, debouncedSearch, statusFilter, paymentFilter]);

  useEffect(() => {
    const handleNewOrder = () => {
      void loadOrders();
      void loadCounts();
    };
    window.addEventListener('smartbox:new_order', handleNewOrder);
    return () => {
      window.removeEventListener('smartbox:new_order', handleNewOrder);
    };
  }, []);

  // Open modal and fetch secondary data
  const openDetailModal = (ord: ExtendedOrder, initialTab: 'overview' | 'timeline' | 'approval' = 'overview') => {
    setSelectedOrder(ord);
    setDetailTab(initialTab);
    setIsDetailModalOpen(true);
    setTicketMsg('');
    setTicketErr('');
    setTicketReason('');

    // Load timeline
    setLoadingTimeline(true);
    adminRequest<TimelineData>(`/orders/${encodeURIComponent(ord.id)}/timeline`)
      .then((data) => setTimeline(data))
      .catch(() => setTimeline(null))
      .finally(() => setLoadingTimeline(false));

    // Load PO Ticket
    setLoadingTicket(true);
    adminRequest<TicketData>(`/orders/${encodeURIComponent(ord.id)}/ticket`)
      .then((data) => {
        if (data && data.id) setTicket(data);
        else setTicket(null);
      })
      .catch(() => setTicket(null))
      .finally(() => setLoadingTicket(false));
  };

  // Perform PO Ticket action (Approve / Return / Reject)
  const actOnTicket = async (action: 'approve' | 'return' | 'reject') => {
    if (!ticket || ticketBusy) return;
    if (action !== 'approve' && !ticketReason.trim()) {
      setTicketErr('Vui lòng nhập lý do giải trình hoặc từ chối.');
      return;
    }

    const confirmMsg =
      action === 'approve'
        ? 'Phê duyệt phiếu PO này để đơn hàng chuyển sang giai đoạn chuẩn bị & giao hàng?'
        : action === 'return'
        ? 'Yêu cầu khách hàng giải trình thông tin đơn hàng?'
        : 'Xác nhận TỪ CHỐI phiếu PO này?';

    if (!window.confirm(confirmMsg)) return;

    setTicketBusy(true);
    setTicketErr('');
    setTicketMsg('');
    try {
      const updated = await adminRequest<TicketData>(`/tickets/${ticket.id}/${action}`, {
        method: 'POST',
        ...(action === 'approve' ? {} : { body: JSON.stringify({ reason: ticketReason.trim() }) })
      });
      setTicket(updated);
      setTicketMsg(
        action === 'approve'
          ? 'Đã phê duyệt PO Ticket thành công.'
          : action === 'return'
          ? 'Đã trả phiếu yêu cầu bổ sung giải trình.'
          : 'Đã từ chối phiếu PO Ticket.'
      );
      setTicketReason('');

      // Refresh timeline & orders list
      if (selectedOrder) {
        adminRequest<TimelineData>(`/orders/${encodeURIComponent(selectedOrder.id)}/timeline`)
          .then((d) => setTimeline(d))
          .catch(() => {});
      }
      await loadOrders();
    } catch (e: any) {
      setTicketErr(e.message || 'Lỗi thao tác phiếu PO');
      try {
        const refreshed = await adminRequest<TicketData>(`/tickets/${ticket.id}`);
        setTicket(refreshed);
      } catch {
        // ignore
      }
    } finally {
      setTicketBusy(false);
    }
  };

  // Financial totals for current page
  const paidRevenue = orders
    .filter((o) => o.payment_status === 'paid' && o.status !== 'cancelled')
    .reduce((acc, o) => acc + Number(o.total || 0), 0);

  const pendingRevenue = orders
    .filter((o) => o.payment_status === 'pending' && o.status !== 'cancelled')
    .reduce((acc, o) => acc + Number(o.total || 0), 0);

  const completedCount = orders.filter((o) => o.status === 'completed').length;

  return (
    <div className="orders-page-container">
      {listError && (
        <div role="alert" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '10px 16px', color: '#dc2626', fontSize: '13px' }}>
          {listError}
        </div>
      )}

      {/* 1. Page Header */}
      <div className="fpt-page-header" style={{ marginBottom: 14 }}>
        <div className="fpt-page-title">
          <div className="fpt-page-icon" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}>
            <ShoppingBag size={22} />
          </div>
          <div>
            <h1>Quản Lý Đơn Hàng</h1>
            <p className="fpt-page-desc">
              Theo dõi đơn hàng, đối soát thanh toán, điều phối giao lắp và phê duyệt PO trực tiếp cho từng đơn hàng.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {isPO && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/po/approvals')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Trang thẩm định và phê duyệt phiếu PO"
              >
                <FileCheck size={16} style={{ color: 'var(--fpt-amber)' }} />
                <span>Phê duyệt PO</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/po/delivery')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Trang điều phối và thực hiện giao hàng & lắp đặt"
              >
                <Truck size={16} style={{ color: 'var(--fpt-emerald)' }} />
                <span>Điều phối & Nghiệm thu</span>
              </button>
            </>
          )}

          {isAdmin && (
            <button
              type="button"
              className="btn-create-order"
              onClick={() => setIsCreateOrderModalOpen(true)}
              title="Tạo đơn hàng mới cho khách hàng (Chờ PO thẩm định)"
            >
              <Plus size={16} strokeWidth={2.4} />
              <span>Tạo đơn hàng mới</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(isAdmin ? '/admin/reports' : '/po/reports')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileSpreadsheet size={16} />
            <span>Xuất Báo Cáo</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading}
            onClick={() => loadOrders()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. Compact Top Metric Ribbon (Minimal vertical space) */}
      <div className="orders-metric-strip">
        <div className="orders-mini-stat">
          <div className="orders-mini-icon" style={{ background: 'var(--fpt-emerald-soft)', color: 'var(--fpt-emerald)' }}>
            <CreditCard size={18} />
          </div>
          <div className="orders-mini-info">
            <span className="orders-mini-label">Doanh thu đã thu</span>
            <span className="orders-mini-value" style={{ color: 'var(--fpt-emerald)' }}>
              {paidRevenue.toLocaleString('vi-VN')} ₫
            </span>
            <span className="orders-mini-sub">Đã quyết toán (VNPAY / Thẻ)</span>
          </div>
        </div>

        <div className="orders-mini-stat">
          <div className="orders-mini-icon" style={{ background: 'var(--fpt-amber-soft)', color: 'var(--fpt-amber)' }}>
            <Clock size={18} />
          </div>
          <div className="orders-mini-info">
            <span className="orders-mini-label">Chờ thanh toán</span>
            <span className="orders-mini-value" style={{ color: 'var(--fpt-amber)' }}>
              {pendingRevenue.toLocaleString('vi-VN')} ₫
            </span>
            <span className="orders-mini-sub">Chờ khách thanh toán</span>
          </div>
        </div>

        <div className="orders-mini-stat">
          <div className="orders-mini-icon" style={{ background: 'var(--fpt-blue-soft)', color: 'var(--fpt-blue)' }}>
            <CheckCircle2 size={18} />
          </div>
          <div className="orders-mini-info">
            <span className="orders-mini-label">Nghiệm thu thành công</span>
            <span className="orders-mini-value" style={{ color: 'var(--fpt-blue)' }}>
              {completedCount} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {orders.length} đơn</span>
            </span>
            <span className="orders-mini-sub">Số đơn trên trang</span>
          </div>
        </div>

        <div className="orders-mini-stat">
          <div className="orders-mini-icon" style={{ background: 'var(--fpt-purple-soft)', color: 'var(--fpt-purple)' }}>
            <Package size={18} />
          </div>
          <div className="orders-mini-info">
            <span className="orders-mini-label">Tỷ lệ hoàn tất</span>
            <span className="orders-mini-value" style={{ color: 'var(--fpt-purple)' }}>
              {orders.length > 0 ? `${Math.round((completedCount / orders.length) * 100)}%` : '0%'}
            </span>
            <span className="orders-mini-sub">Tiến độ trang hiện tại</span>
          </div>
        </div>
      </div>

      {/* 3. Orders Table Card (Integrated status counts, inline search, filters & sortable columns) */}
      <div className="orders-table-card">
        {/* Top Status Tabs with Count Badges */}
        <div className="orders-tabs-strip">
          {statusTabs.map((tab) => {
            const count = getTabCount(tab.key);
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`orders-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleTabChange(tab.key)}
              >
                <span>{tab.label}</span>
                <span className="orders-tab-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Sub-Toolbar (Search input, payment filter, clear reset, sort status) */}
        <div className="orders-sub-toolbar">
          <div className="orders-sub-toolbar-left">
            <div className="orders-inline-search">
              <Search size={15} className="orders-search-icon-inline" />
              <input
                type="text"
                placeholder="Tìm mã đơn, khách hàng, số điện thoại, vận đơn…"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="orders-clear-search-btn"
                  onClick={() => {
                    setSearchTerm('');
                    setPage(0);
                  }}
                  title="Xóa từ khóa tìm kiếm"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <select
              className="orders-inline-select"
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">Tất cả thanh toán</option>
              <option value="paid">Đã thanh toán (VNPAY / Thẻ)</option>
              <option value="pending">Chưa thanh toán</option>
              <option value="refunded">Đã hoàn tiền</option>
            </select>

            {(searchTerm || paymentFilter !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                className="orders-reset-btn"
                onClick={() => {
                  setSearchTerm('');
                  setPaymentFilter('all');
                  setStatusFilter('all');
                  setPage(0);
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.delete('status');
                    return next;
                  }, { replace: true });
                }}
                title="Khôi phục toàn bộ bộ lọc"
              >
                <RotateCcw size={13} />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>

          <div className="orders-sub-toolbar-right">
            <span>
              Tổng: <strong>{totalElements}</strong> đơn
            </span>
            <span style={{ color: 'var(--border-subtle)' }}>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <SlidersHorizontal size={13} style={{ color: 'var(--text-muted)' }} />
              <span>
                Sắp xếp: <strong>{sortField === 'created_at' ? 'Thời gian' : sortField === 'total' ? 'Tổng tiền' : sortField === 'customer' ? 'Khách hàng' : 'Trạng thái'}</strong> ({sortOrder === 'desc' ? 'Giảm dần' : 'Tăng dần'})
              </span>
            </span>
          </div>
        </div>

        {loading && orders.length > 0 && (
          <div style={{
            position: 'absolute',
            top: 52,
            right: 16,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 16,
            background: 'rgba(37, 99, 235, 0.1)',
            color: 'var(--fpt-blue)',
            fontSize: '12px',
            fontWeight: 600,
            zIndex: 5,
            border: '1px solid rgba(37, 99, 235, 0.2)'
          }}>
            <RefreshCw size={12} className="spin" />
            <span>Đang cập nhật…</span>
          </div>
        )}

        <div className="orders-table-scroll">
          <table className="orders-table">
            <thead>
              <tr>
                <th
                  className={`sortable ${sortField === 'created_at' ? 'active' : ''}`}
                  style={{ width: '140px' }}
                  onClick={() => handleSort('created_at')}
                  title="Nhấn để sắp xếp theo ngày tạo"
                >
                  <span>MÃ ĐƠN &amp; NGÀY</span>
                  <span className={`sort-icon ${sortField === 'created_at' ? 'active' : 'inactive'}`}>
                    {sortField === 'created_at' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
                  </span>
                </th>

                <th
                  className={`sortable ${sortField === 'customer' ? 'active' : ''}`}
                  style={{ minWidth: '220px' }}
                  onClick={() => handleSort('customer')}
                  title="Nhấn để sắp xếp theo tên khách hàng"
                >
                  <span>KHÁCH HÀNG &amp; ĐỊA CHỈ</span>
                  <span className={`sort-icon ${sortField === 'customer' ? 'active' : 'inactive'}`}>
                    {sortField === 'customer' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
                  </span>
                </th>

                <th style={{ width: '140px' }}>
                  <span>THANH TOÁN</span>
                </th>

                <th
                  className={`sortable ${sortField === 'total' ? 'active' : ''}`}
                  style={{ width: '130px' }}
                  onClick={() => handleSort('total')}
                  title="Nhấn để sắp xếp theo tổng tiền"
                >
                  <span>TỔNG TIỀN</span>
                  <span className={`sort-icon ${sortField === 'total' ? 'active' : 'inactive'}`}>
                    {sortField === 'total' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
                  </span>
                </th>

                <th style={{ width: '160px' }}>
                  <span>VẬN CHUYỂN</span>
                </th>

                <th
                  className={`sortable ${sortField === 'status' ? 'active' : ''}`}
                  style={{ width: '130px' }}
                  onClick={() => handleSort('status')}
                  title="Nhấn để sắp xếp theo trạng thái đơn"
                >
                  <span>TRẠNG THÁI</span>
                  <span className={`sort-icon ${sortField === 'status' ? 'active' : 'inactive'}`}>
                    {sortField === 'status' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} />}
                  </span>
                </th>

                <th style={{ width: '185px', textAlign: 'right' }}>
                  <span>THAO TÁC</span>
                </th>
              </tr>
            </thead>
            <tbody style={{ opacity: loading && orders.length > 0 ? 0.6 : 1, transition: 'opacity 0.2s', pointerEvents: loading ? 'none' : 'auto' }}>
              {loading && orders.length === 0 ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td colSpan={7} style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <div style={{ width: '15%', height: 16, borderRadius: 4, background: 'var(--border-subtle)', opacity: 0.6 }} />
                        <div style={{ width: '30%', height: 16, borderRadius: 4, background: 'var(--border-subtle)', opacity: 0.6 }} />
                        <div style={{ width: '20%', height: 16, borderRadius: 4, background: 'var(--border-subtle)', opacity: 0.6 }} />
                        <div style={{ width: '15%', height: 16, borderRadius: 4, background: 'var(--border-subtle)', opacity: 0.6 }} />
                        <div style={{ width: '20%', height: 16, borderRadius: 4, background: 'var(--border-subtle)', opacity: 0.6 }} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-secondary)' }}>
                    <Package size={32} style={{ display: 'inline-block', marginBottom: '10px', opacity: 0.4 }} />
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Không có đơn hàng nào phù hợp với bộ lọc hiện tại</div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Thử thay đổi từ khóa tìm kiếm hoặc lọc theo trạng thái khác.</p>
                  </td>
                </tr>
              ) : (
                sortedOrders.map((ord) => {
                  const isTerminalStatus = ['completed', 'delivered', 'cancelled', 'refunded'].includes(ord.status);
                  const isPaid = ord.payment_status === 'paid' || ['paid', 'confirmed', 'processing'].includes(ord.status);
                  const canDispatch = !isTerminalStatus && isPaid && ['super_admin', 'product_manager'].includes(profile?.role || '');

                  return (
                    <tr
                      key={ord.id}
                      className="clickable-row"
                      onClick={() => navigate(`/orders/${ord.id}`)}
                    >
                      <td>
                        <div className="order-id-cell">
                          <span>{ord.id.slice(0, 8)}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>...</span>
                        </div>
                        <div className="order-date-sub">
                          {new Date(ord.created_at).toLocaleDateString('vi-VN')} {new Date(ord.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td>
                        <div className="order-customer-name">
                          {ord.customer?.full_name || 'Khách vãng lai'}
                        </div>
                        {ord.customer?.phone && (
                          <div className="order-customer-sub">
                            <Phone size={11} style={{ opacity: 0.7 }} />
                            <span>{ord.customer?.phone}</span>
                          </div>
                        )}
                        {ord.shipping_address && (
                          <div className="order-address-truncate" title={ord.shipping_address}>
                            <MapPin size={11} style={{ display: 'inline', marginRight: 3, verticalAlign: '-1px' }} />
                            {ord.shipping_address}
                          </div>
                        )}
                      </td>

                      <td>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {ord.payment_method?.toUpperCase() || 'CHƯA CHỌN'}
                        </div>
                        <div style={{ fontSize: '0.72rem', marginTop: '2px' }}>
                          {renderOrderPaymentStatusBadge(ord)}
                        </div>
                      </td>

                      <td>
                        <div className="order-total-value">
                          {Number(ord.total || 0).toLocaleString('vi-VN')} ₫
                        </div>
                      </td>

                      <td>
                        {ord.tracking_number ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--fpt-blue)', fontSize: '0.75rem', background: 'rgba(37, 99, 235, 0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                            <Truck size={12} />
                            <span>{ord.tracking_number}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Chưa xuất mã</span>
                        )}
                        {ord.items_summary && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '3px', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ord.items_summary}>
                            {ord.items_summary}
                          </div>
                        )}
                      </td>

                      <td>
                        {renderOrderStatusBadge(ord.status)}
                      </td>

                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div className="orders-actions-cell">
                          {canDispatch && (
                            <button
                              type="button"
                              className="btn-dispatch"
                              title="Điều phối giao hàng và lắp đặt cho đơn này"
                              onClick={() => openDispatchModal(ord)}
                            >
                              <Truck size={13} />
                              <span>Giao &amp; lắp</span>
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-detail"
                            title="Xem chi tiết đơn hàng"
                            onClick={() => navigate(`/orders/${ord.id}`)}
                          >
                            <Eye size={13} />
                            <span>Chi tiết</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={10}
          onPageChange={setPage}
          loading={loading}
          itemLabel="đơn hàng"
        />
      </div>

      {/* ========================================================================= */}
      {/* COMPREHENSIVE ORDER DETAILS MODAL (Overview, Timeline, PO Approval)       */}
      {/* ========================================================================= */}
      {isDetailModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={() => setIsDetailModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '880px', width: '95vw', maxHeight: '90vh', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 24px',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Chi Tiết Đơn Hàng
                  </h3>
                  {renderOrderStatusBadge(selectedOrder.status)}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Mã đơn: <code style={{ color: 'var(--fpt-blue)', fontFamily: 'var(--font-mono)' }}>{selectedOrder.id}</code> · Tạo lúc: {new Date(selectedOrder.created_at).toLocaleString('vi-VN')}
                </p>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '6px', borderRadius: '8px' }}
                onClick={() => setIsDetailModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Sub-Tabs (Segmented Pill Switcher) */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                padding: '12px 24px',
                background: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border-subtle)'
              }}
            >
              <div className="fpt-pill-tabs">
                <button
                  type="button"
                  className={`fpt-pill-tab ${detailTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setDetailTab('overview')}
                >
                  <Receipt size={14} />
                  <span>Đối soát &amp; Hóa đơn</span>
                </button>

                <button
                  type="button"
                  className={`fpt-pill-tab ${detailTab === 'timeline' ? 'active' : ''}`}
                  onClick={() => setDetailTab('timeline')}
                >
                  <Clock size={14} />
                  <span>Tiến trình xử lý (Timeline)</span>
                </button>

                <button
                  type="button"
                  className={`fpt-pill-tab ${detailTab === 'approval' ? 'active' : ''}`}
                  onClick={() => setDetailTab('approval')}
                >
                  <FileCheck size={14} />
                  <span>Phê duyệt PO Ticket</span>
                  {ticket?.status === 'PENDING' && (
                    <span className="tab-badge" style={{ background: 'var(--fpt-amber)', color: '#fff' }}>1</span>
                  )}
                </button>
              </div>
            </div>

            {/* Modal Body Content */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* TAB 1: OVERVIEW & FINANCIAL */}
              {detailTab === 'overview' && (
                <>
                  {/* Customer & Shipping Summary */}
                  <div
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: '16px 20px',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '16px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                        Khách hàng:
                      </span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        {selectedOrder.customer?.full_name || 'Khách vãng lai'}
                      </strong>
                      <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {selectedOrder.customer?.phone}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>
                        Địa chỉ nhận hàng:
                      </span>
                      <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {selectedOrder.shipping_address || 'Chưa cung cấp địa chỉ'}
                      </div>
                    </div>
                  </div>

                  {/* Items and Financial Breakdown */}
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                      Chi tiết sản phẩm trong đơn
                    </h4>
                    <div
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '10px',
                        padding: '14px 18px',
                        fontSize: '0.85rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span>{selectedOrder.items_summary}</span>
                      <strong style={{ color: 'var(--accent-emerald)', fontSize: '1.05rem' }}>
                        {Number(selectedOrder.total || 0).toLocaleString('vi-VN')} ₫
                      </strong>
                    </div>
                  </div>

                  {/* Payment & Gateway details */}
                  <div
                    style={{
                      background: 'var(--accent-primary-soft)',
                      border: '1px solid rgba(37, 99, 235, 0.25)',
                      borderRadius: '12px',
                      padding: '16px 20px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '10px' }}>
                      Thông tin đối soát &amp; Cổng thanh toán
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Cổng thanh toán: </span>
                        <strong>{selectedOrder.payment_method?.toUpperCase() || 'Chưa thanh toán'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Mã tham chiếu: </span>
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedOrder.transaction_ref || '—'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Mã vận đơn: </span>
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedOrder.tracking_number || 'Chưa xuất'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Trạng thái thanh toán: </span>
                        {selectedOrder.status === 'cancelled' ? (
                          selectedOrder.payment_status === 'refunded' ? (
                            <strong style={{ color: '#0284c7' }}>Đã hoàn tiền (Đơn đã hủy)</strong>
                          ) : selectedOrder.payment_status === 'paid' || Boolean((selectedOrder as any).paid_at) ? (
                            <strong style={{ color: '#059669' }}>Đã thanh toán (Cần đối soát hoàn tiền)</strong>
                          ) : (
                            <strong style={{ color: '#64748b' }}>Chưa thanh toán (Đơn đã hủy)</strong>
                          )
                        ) : (
                          <strong style={{ color: selectedOrder.payment_status === 'paid' ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                            {selectedOrder.payment_status === 'paid' ? 'Đã ghi nhận thanh toán' : 'Chờ thanh toán'}
                          </strong>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: ORDER PROCESSING TIMELINE */}
              {detailTab === 'timeline' && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 14px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <History size={16} color="var(--accent-primary)" />
                    <span>Lịch sử &amp; Dòng thời gian tiến trình đơn hàng</span>
                  </h4>

                  {loadingTimeline ? (
                    <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <RefreshCw size={18} className="spin" style={{ display: 'inline-block', marginBottom: '8px' }} />
                      <div>Đang tải dòng thời gian xử lý…</div>
                    </div>
                  ) : !timeline || !timeline.events || timeline.events.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '32px' }}>
                      Chưa ghi nhận sự kiện tiến trình nào cho đơn hàng này.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingLeft: '12px', borderLeft: '2px solid var(--border-subtle)' }}>
                      {timeline.events.map((evt, idx) => (
                        <div key={evt.id || idx} style={{ position: 'relative', paddingLeft: '16px' }}>
                          <div
                            style={{
                              position: 'absolute',
                              left: '-18px',
                              top: '4px',
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: evt.source === 'ORDER' ? 'var(--accent-primary)' : evt.source === 'PO_TICKET' ? 'var(--accent-sky)' : 'var(--accent-emerald)'
                            }}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                color: 'var(--text-secondary)',
                                fontWeight: 600
                              }}
                            >
                              {evt.source}
                            </span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                              {evt.action}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {new Date(evt.occurredAt).toLocaleString('vi-VN')}
                          </div>
                          {evt.reason && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--accent-amber)', marginTop: '4px', fontStyle: 'italic' }}>
                              Ghi chú: {evt.reason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PO TICKET & APPROVAL */}
              {detailTab === 'approval' && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 14px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileCheck size={16} color="var(--accent-sky)" />
                    <span>Thẩm định &amp; Phê duyệt PO Ticket của đơn hàng</span>
                  </h4>

                  {ticketErr && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '10px 14px', color: '#ef4444', fontSize: '0.82rem', marginBottom: '12px' }}>
                      {ticketErr}
                    </div>
                  )}

                  {ticketMsg && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '10px 14px', color: '#10b981', fontSize: '0.82rem', marginBottom: '12px' }}>
                      {ticketMsg}
                    </div>
                  )}

                  {loadingTicket ? (
                    <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <RefreshCw size={18} className="spin" style={{ display: 'inline-block', marginBottom: '8px' }} />
                      <div>Đang kiểm tra phiếu PO của đơn hàng…</div>
                    </div>
                  ) : !ticket ? (
                    <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-input)', borderRadius: '10px', border: '1px dashed var(--border-subtle)' }}>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        Đơn hàng này không có hoặc không yêu cầu thẩm định PO Ticket (Đã được duyệt tự động hoặc thuộc phiên bản quy trình cũ).
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {/* Ticket Summary Box */}
                      <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '10px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Mã phiếu PO:</span>
                          <code style={{ color: 'var(--accent-sky)', fontWeight: 600 }}>{ticket.id}</code>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Trạng thái thẩm định:</span>
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: ticketStatusLabels[ticket.status]?.bg || 'rgba(255,255,255,0.08)',
                              color: ticketStatusLabels[ticket.status]?.color || 'var(--text-primary)',
                              border: `1px solid ${ticketStatusLabels[ticket.status]?.border || 'transparent'}`
                            }}
                          >
                            {ticketStatusLabels[ticket.status]?.label || ticket.status}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Vòng xét duyệt:</span>
                          <strong>Lần thứ #{ticket.review_round}</strong>
                        </div>

                        {ticket.reason && (
                          <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed var(--border-subtle)' }}>
                            <span style={{ color: 'var(--accent-amber)', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                              Lý do gần nhất:
                            </span>
                            <span style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>{ticket.reason}</span>
                          </div>
                        )}
                      </div>

                      {/* Interactive Actions for Staff */}
                      {ticket.status === 'PENDING' && canApprove && (
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            Thao tác thẩm định phiếu PO:
                          </div>

                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={ticketBusy}
                            onClick={() => void actOnTicket('approve')}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 18px' }}
                          >
                            <Check size={16} />
                            <span>Phê duyệt đơn hàng &amp; chuyển tiếp</span>
                          </button>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              Lý do yêu cầu giải trình hoặc từ chối:
                            </label>
                            <textarea
                              className="input-field"
                              rows={2}
                              value={ticketReason}
                              onChange={(e) => setTicketReason(e.target.value)}
                              placeholder="Nhập lý do chi tiết..."
                              style={{ width: '100%', resize: 'vertical', margin: 0 }}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={ticketBusy || !ticketReason.trim()}
                                onClick={() => void actOnTicket('return')}
                                style={{ color: 'var(--accent-sky)' }}
                              >
                                <RotateCcw size={13} />
                                <span>Trả phiếu giải trình</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={ticketBusy || !ticketReason.trim()}
                                onClick={() => void actOnTicket('reject')}
                                style={{ color: 'var(--accent-rose)' }}
                              >
                                <XCircle size={13} />
                                <span>Từ chối phiếu</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Ticket History */}
                      {ticket.history && ticket.history.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                            Lịch sử các lần duyệt:
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
                            {ticket.history.map((h) => (
                              <div key={h.id} style={{ background: 'var(--bg-input)', padding: '8px 12px', borderRadius: '6px' }}>
                                <strong>{h.action}</strong> · <span style={{ color: 'var(--text-muted)' }}>{new Date(h.created_at).toLocaleString('vi-VN')}</span>
                                {h.reason && <div style={{ color: 'var(--accent-amber)', marginTop: '2px' }}>{h.reason}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Bottom Action Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)'
              }}
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setInvoiceOrder(selectedOrder.id)}
                disabled={!['paid', 'refund_required', 'refunded'].includes(selectedOrder.payment_status || '')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={14} />
                <span>Xem / In hóa đơn VAT</span>
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                {(profile?.role === 'super_admin' || profile?.role === 'product_manager') &&
                  !['completed', 'delivered', 'cancelled', 'refunded'].includes(selectedOrder.status) &&
                  (selectedOrder.payment_status === 'paid' || ['paid', 'confirmed', 'processing'].includes(selectedOrder.status)) && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      openDispatchModal(selectedOrder);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Truck size={14} />
                    <span>Điều phối giao &amp; lắp</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsDetailModalOpen(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VAT Invoice Modal */}
      {invoiceOrder && (
        <SalesInvoiceModal orderId={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
      )}

      {/* ========================================================================= */}
      {/* DISPATCH DELIVERY & INSTALLATION MODAL (PER-ORDER ASSIGNMENT)              */}
      {/* ========================================================================= */}
      {dispatchOrder && (
        <div className="dispatch-modal-backdrop" onClick={() => !dispatchLoading && setDispatchOrder(null)}>
          <div className="dispatch-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="dispatch-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'var(--fpt-blue-soft)',
                  color: 'var(--fpt-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Truck size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Điều Phối Giao &amp; Lắp Đặt
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Đơn hàng <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--fpt-blue)', fontWeight: 600 }}>#{dispatchOrder.id.slice(0, 8)}</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '6px', borderRadius: '8px' }}
                disabled={dispatchLoading}
                onClick={() => setDispatchOrder(null)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleAssignDelivery} className="dispatch-modal-body">
              {dispatchError && (
                <div role="alert" style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#dc2626',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} />
                  <span>{dispatchError}</span>
                </div>
              )}

              {dispatchSuccess && (
                <div role="status" style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#059669',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle2 size={16} />
                  <span>{dispatchSuccess}</span>
                </div>
              )}

              {/* Order Summary Info Box */}
              <div className="dispatch-order-info-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {dispatchOrder.customer?.full_name || 'Khách vãng lai'}
                  </span>
                  <span style={{ color: 'var(--fpt-emerald)', fontWeight: 700, fontSize: '0.85rem' }}>
                    {Number(dispatchOrder.total || 0).toLocaleString('vi-VN')} ₫ · {dispatchOrder.payment_status === 'paid' ? 'Đã quyết toán' : 'Đã xác nhận'}
                  </span>
                </div>
                {dispatchOrder.customer?.phone && (
                  <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone size={13} style={{ opacity: 0.7 }} />
                    <span>{dispatchOrder.customer?.phone}</span>
                  </div>
                )}
                <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: 6, lineHeight: 1.4 }}>
                  <MapPin size={13} style={{ opacity: 0.7, flexShrink: 0, marginTop: 2 }} />
                  <span>{dispatchOrder.shipping_address || 'Địa chỉ chưa cập nhật'}</span>
                </div>
                {dispatchOrder.items_summary && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', borderTop: '1px dashed var(--border-subtle)', paddingTop: 6, marginTop: 2 }}>
                    Sản phẩm: {dispatchOrder.items_summary}
                  </div>
                )}
              </div>

              {/* Notice if already assigned */}
              {existingJob && (
                <div style={{
                  background: 'rgba(37, 99, 235, 0.06)',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)'
                }}>
                  <strong style={{ color: 'var(--fpt-blue)', display: 'block', marginBottom: 2 }}>
                    ℹ Đơn hàng đã có lệnh giao lắp ({existingJob.status}):
                  </strong>
                  Lịch hẹn hiện tại: {existingJob.scheduledAt ? new Date(existingJob.scheduledAt).toLocaleString('vi-VN') : 'Chưa có'}. Bạn có thể chọn nhân sự khác hoặc đổi lịch hẹn để cập nhật lại.
                </div>
              )}

              {/* Technician Select */}
              <div className="dispatch-form-group">
                <label htmlFor="tech-select">
                  Kỹ thuật viên phụ trách giao &amp; lắp <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  id="tech-select"
                  required
                  value={technicianId}
                  disabled={dispatchLoading}
                  onChange={(e) => setTechnicianId(e.target.value)}
                >
                  <option value="">-- Chọn kỹ thuật viên --</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName || `Kỹ thuật viên (${t.id.slice(0, 8)})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scheduled Date/Time */}
              <div className="dispatch-form-group">
                <label htmlFor="sched-input">
                  Thời gian hẹn giao &amp; thi công <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  id="sched-input"
                  type="datetime-local"
                  required
                  value={scheduledAt}
                  disabled={dispatchLoading}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>

              {/* Optional Note */}
              <div className="dispatch-form-group">
                <label htmlFor="note-input">
                  Ghi chú cho kỹ thuật viên (Tùy chọn)
                </label>
                <textarea
                  id="note-input"
                  rows={2}
                  placeholder="Vị trí lắp đặt, lưu ý đặc biệt từ khách hàng..."
                  value={dispatchNote}
                  disabled={dispatchLoading}
                  onChange={(e) => setDispatchNote(e.target.value)}
                />
              </div>

              {/* Footer Buttons */}
              <div className="dispatch-modal-footer" style={{ margin: '0 -20px -20px -20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={dispatchLoading}
                  onClick={() => setDispatchOrder(null)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={dispatchLoading || !technicianId || !scheduledAt}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {dispatchLoading ? <RefreshCw size={14} className="spin" /> : <Truck size={14} />}
                  <span>{existingJob ? 'Cập nhật phân công' : 'Xác nhận điều phối'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Create Order Modal */}
      <CreateOrderModal
        isOpen={isCreateOrderModalOpen}
        onClose={() => setIsCreateOrderModalOpen(false)}
        onSuccess={() => void loadOrders()}
      />
    </div>
  );
};
