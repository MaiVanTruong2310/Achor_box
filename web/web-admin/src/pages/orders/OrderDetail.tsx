import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  History,
  ShoppingBag,
  Truck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  X,
  FileCheck,
  CheckCircle,
  Clock,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Calendar,
  Layers,
  Wrench
} from 'lucide-react';
import { adminRequest } from '../../services/adminRequest';
import { ordersService } from '../../services/api';
import { deliveryApi, Job, Checks } from '../../services/deliveryInstallation';
import { toast } from '../../contexts/ToastContext';
import './order-detail.css';

interface OrderItem {
  id: string;
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  variantName?: string;
  size?: string;
  capacityLiter?: number;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

interface TimelineEvent {
  id?: string;
  source?: string;
  action: string;
  occurredAt?: string;
  timestamp?: string;
  reason?: string;
}

const ORDER_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Chờ xử lý', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  pending_payment: { label: 'Chờ thanh toán', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' },
  paid: { label: 'Đã thanh toán', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
  confirmed: { label: 'Đã duyệt PO', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
  approved: { label: 'Đã duyệt PO', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
  shipping: { label: 'Đang giao hàng', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
  installed: { label: 'Đã nghiệm thu', color: '#059669', bg: 'rgba(5, 150, 105, 0.1)' },
  completed: { label: 'Đã nghiệm thu', color: '#059669', bg: 'rgba(5, 150, 105, 0.1)' },
  cancelled: { label: 'Đã hủy', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' }
};

const JOB_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  ASSIGNED: { label: 'Đã xếp lịch', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
  IN_PROGRESS: { label: 'Đang giao & lắp', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  DELIVERED: { label: 'Đã tới địa chỉ', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
  INSTALLED: { label: 'Đã lắp đặt', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.1)' },
  COMPLETED: { label: 'Đã nghiệm thu', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
  FAILED: { label: 'Cần xử lý lại', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' }
};

function formatEventLabel(source?: string, action?: string): { title: string; desc: string; iconType: string; tag: string } {
  const act = (action || '').toUpperCase();
  if (source === 'DELIVERY_INSTALLATION') {
    if (act.includes('ACCEPTANCE') || act.includes('COMPLETE')) {
      return { title: 'Nghiệm thu & bàn giao xong', desc: 'Khách hàng đã ký nhận biên bản nghiệm thu', iconType: 'acceptance', tag: 'Nghiệm thu' };
    }
    if (act.includes('INSTALL')) {
      return { title: 'Lắp đặt SmartBox hoàn tất', desc: 'Đã thi công định vị & kết nối cảm biến', iconType: 'install', tag: 'Lắp đặt' };
    }
    if (act.includes('DELIVER')) {
      return { title: 'Đã giao tới địa chỉ nhận', desc: 'Kiện hàng đã bàn giao tại địa chỉ khách', iconType: 'delivery', tag: 'Vận chuyển' };
    }
    if (act.includes('START') || act.includes('IN_PROGRESS')) {
      return { title: 'Kỹ thuật viên bắt đầu di chuyển', desc: 'Đang vận chuyển thiết bị tới địa chỉ', iconType: 'delivery', tag: 'Vận chuyển' };
    }
    if (act.includes('ASSIGN')) {
      return { title: 'Phân công kỹ thuật viên', desc: 'Đã xếp lịch giao hàng và thi công lắp đặt', iconType: 'delivery', tag: 'Điều phối' };
    }
  }

  if (source === 'PO_TICKET') {
    if (act.includes('APPROVE')) return { title: 'Phê duyệt thẩm định PO', desc: 'Đủ điều kiện xuất kho & giao hàng', iconType: 'ticket', tag: 'Duyệt PO' };
    if (act.includes('REJECT')) return { title: 'Từ chối duyệt đơn PO', desc: 'Không đáp ứng điều kiện thương mại', iconType: 'ticket', tag: 'Duyệt PO' };
    if (act.includes('REVISE')) return { title: 'Yêu cầu giải trình đơn PO', desc: 'Chờ khách hàng bổ sung thông tin', iconType: 'ticket', tag: 'Duyệt PO' };
  }

  const lowAct = (action || '').toLowerCase();
  if (lowAct.includes('installed') || lowAct.includes('completed')) {
    return { title: 'Nghiệm thu thành công', desc: 'Đã kích hoạt bảo hành điện tử chính hãng', iconType: 'acceptance', tag: 'Nghiệm thu' };
  }
  if (lowAct.includes('shipping')) {
    return { title: 'Đang vận chuyển & thi công', desc: 'Bộ phận kỹ thuật đang thực hiện', iconType: 'delivery', tag: 'Vận chuyển' };
  }
  if (lowAct.includes('confirmed') || lowAct.includes('approved')) {
    return { title: 'Đơn hàng được duyệt', desc: 'Xác nhận xử lý đơn hàng', iconType: 'ticket', tag: 'Duyệt PO' };
  }
  if (lowAct.includes('paid')) {
    return { title: 'Thanh toán thành công', desc: 'Đối soát VNPAY đã quyết toán', iconType: 'payment', tag: 'Thanh toán' };
  }
  if (lowAct.includes('pending_payment')) {
    return { title: 'Chờ thanh toán', desc: 'Chờ giao dịch từ cổng thanh toán VNPAY', iconType: 'payment', tag: 'Thanh toán' };
  }
  if (lowAct.includes('created') || lowAct.includes('pending')) {
    return { title: 'Khách hàng đặt đơn hàng', desc: 'Khởi tạo đơn hàng trên SmartBox', iconType: 'order', tag: 'Đặt đơn' };
  }
  if (lowAct.includes('cancelled')) {
    return { title: 'Đơn hàng đã hủy', desc: 'Hủy đơn theo yêu cầu', iconType: 'order', tag: 'Hủy đơn' };
  }

  return { title: action || 'Cập nhật tiến trình', desc: 'Hệ thống ghi nhận', iconType: 'order', tag: 'Hệ thống' };
}

export const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Delivery & Technicians
  const [deliveryJob, setDeliveryJob] = useState<Job | null>(null);
  const [technicians, setTechnicians] = useState<{ id: string; fullName: string | null }[]>([]);
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [updatingTracking, setUpdatingTracking] = useState(false);
  const [trackingSuccess, setTrackingSuccess] = useState(false);

  // Acceptance Proof Modal
  const [showProofModal, setShowProofModal] = useState(false);
  const [checksData, setChecksData] = useState<Checks | null>(null);
  const [loadingProof, setLoadingProof] = useState(false);

  // Timeline Events
  const [rawTimeline, setRawTimeline] = useState<TimelineEvent[]>([]);

  const fetchOrderDetail = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const orderData = await adminRequest<any>(`/orders/${encodeURIComponent(id)}`);
      setOrder(orderData);
      setTrackingNumberInput(orderData.trackingNumber || (orderData.shipment && orderData.shipment[0]?.tracking_number) || '');

      // Technicians
      try {
        const techs = await deliveryApi.technicians();
        setTechnicians(techs || []);
      } catch {
        // Ignore
      }

      // Delivery job
      try {
        const jobRes = await adminRequest<Job>(`/orders/${encodeURIComponent(id)}/delivery-installation`);
        setDeliveryJob(jobRes && jobRes.id ? jobRes : null);
      } catch {
        setDeliveryJob(null);
      }

      // Timeline events
      try {
        const timelineRes = await adminRequest<any>(`/orders/${encodeURIComponent(id)}/timeline`);
        setRawTimeline(timelineRes?.events && Array.isArray(timelineRes.events) ? timelineRes.events : []);
      } catch {
        setRawTimeline([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tải thông tin đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  // Sort Timeline: NEWEST FIRST (mới nhất lên đầu)
  const sortedTimeline = useMemo(() => {
    const list = [...rawTimeline];
    if (order && list.length === 0) {
      list.push({ action: order.status || 'created', occurredAt: order.createdAt });
    }
    return list.sort((a, b) => {
      const timeA = new Date(a.occurredAt || a.timestamp || 0).getTime();
      const timeB = new Date(b.occurredAt || b.timestamp || 0).getTime();
      return timeB - timeA;
    });
  }, [rawTimeline, order]);

  // Compute 5 Progress Stepper Milestones (Đặt đơn -> Thanh toán -> Duyệt PO -> Giao lắp -> Nghiệm thu)
  const stepperStages = useMemo(() => {
    const st = (order?.status || 'pending').toLowerCase();
    const isDone = st === 'installed' || st === 'completed' || deliveryJob?.status === 'COMPLETED' || deliveryJob?.customerAccepted === true;
    const isShipping = st === 'shipping' || ['DELIVERED', 'INSTALLED', 'IN_PROGRESS'].includes(deliveryJob?.status || '');
    const isApproved = ['confirmed', 'approved'].includes(st) || deliveryJob?.status === 'ASSIGNED';
    const isPaid = !!order?.paidAt || st === 'paid';

    let currentStepIndex = 1; // 1: Order, 2: Payment, 3: PO, 4: Delivery, 5: Acceptance
    if (isDone) currentStepIndex = 5;
    else if (isShipping) currentStepIndex = 4;
    else if (isApproved) currentStepIndex = 3;
    else if (isPaid) currentStepIndex = 3; // Ready for PO / Approved
    else if (st === 'pending_payment') currentStepIndex = 2;
    else currentStepIndex = 1;

    return [
      { step: 1, label: 'Đặt đơn', completed: currentStepIndex > 1, active: currentStepIndex === 1 },
      { step: 2, label: 'Thanh toán', completed: currentStepIndex > 2 || isPaid, active: currentStepIndex === 2 && !isPaid },
      { step: 3, label: 'Duyệt PO', completed: currentStepIndex > 3, active: currentStepIndex === 3 },
      { step: 4, label: 'Giao & Lắp', completed: currentStepIndex > 4, active: currentStepIndex === 4 },
      { step: 5, label: 'Nghiệm thu', completed: isDone, active: currentStepIndex === 5 && !isDone }
    ];
  }, [order, deliveryJob]);

  const handleCopyId = () => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleUpdateTracking = async () => {
    if (!id || updatingTracking) return;
    setUpdatingTracking(true);
    setTrackingSuccess(false);
    try {
      await ordersService.updateTrackingNumber(id, trackingNumberInput.trim());
      toast.success('Đã cập nhật mã vận đơn thành công!');
      fetchOrderDetail();
      setTimeout(() => setTrackingSuccess(false), 2000);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể cập nhật mã vận đơn', 'Lỗi cập nhật');
    } finally {
      setUpdatingTracking(false);
    }
  };

  const handleOpenProofModal = async () => {
    setShowProofModal(true);
    if (deliveryJob?.id && !checksData) {
      setLoadingProof(true);
      try {
        const checks = await deliveryApi.checks(deliveryJob.id);
        setChecksData(checks);
      } catch (cErr) {
        console.warn('Could not fetch checks for acceptance proof', cErr);
      } finally {
        setLoadingProof(false);
      }
    }
  };

  const renderNodeIcon = (iconType: string) => {
    switch (iconType) {
      case 'acceptance':
        return <ShieldCheck size={13} style={{ color: '#10b981' }} />;
      case 'install':
        return <Wrench size={13} style={{ color: '#0ea5e9' }} />;
      case 'delivery':
        return <Truck size={13} style={{ color: '#3b82f6' }} />;
      case 'ticket':
        return <FileCheck size={13} style={{ color: '#8b5cf6' }} />;
      case 'payment':
        return <CreditCard size={13} style={{ color: '#10b981' }} />;
      default:
        return <ShoppingBag size={13} style={{ color: '#ea580c' }} />;
    }
  };

  if (loading) {
    return (
      <div className="order-detail-page">
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="spin" style={{ marginBottom: 8 }} />
          <div>Đang tải chi tiết đơn hàng #{id}…</div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="order-detail-page">
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--danger, #ef4444)' }}>
          <AlertCircle size={32} style={{ marginBottom: 8 }} />
          <h3>Không tìm thấy đơn hàng</h3>
          <p>{error || 'Đơn hàng không tồn tại hoặc đã bị xóa.'}</p>
          <button type="button" className="btn-back-compact" style={{ marginTop: 12 }} onClick={() => navigate('/orders')}>
            ← Quay lại danh sách đơn hàng
          </button>
        </div>
      </div>
    );
  }

  // Customer snapshot
  const snapshot = order.shippingAddressSnapshot || {};
  const recipientName = snapshot.recipientName || snapshot.fullName || 'Khách hàng SmartBox';
  const phone = snapshot.phone || '0988776655';
  const email = snapshot.email || '—';
  const addressLine = [snapshot.addressLine, snapshot.ward, snapshot.district, snapshot.city].filter(Boolean).join(', ') || order.shippingAddress || 'Chưa cung cấp';
  const installationNote = snapshot.installationNote || null;

  // Financial info
  const items: OrderItem[] = order.items || [];
  const totalAmount = Number(order.totalAmount ?? order.total ?? 0);
  const subtotal = Number(order.subtotal ?? totalAmount);
  const discountAmount = Number(order.discountAmount ?? 0);

  // Statuses
  const statusInfo = ORDER_STATUS_MAP[order.status] || {
    label: order.status || 'Chờ xử lý',
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.1)'
  };

  const assignedTechName = deliveryJob?.assignedTo
    ? (technicians.find(t => t.id === deliveryJob.assignedTo)?.fullName || 'Kỹ thuật viên SmartBox')
    : (order.technicianName || 'Chưa phân công');

  const currentJobStatus = deliveryJob?.status ? (JOB_STATUS_MAP[deliveryJob.status] || { label: deliveryJob.status, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' }) : null;
  const isCompleted = order.status === 'installed' || order.status === 'completed' || deliveryJob?.status === 'COMPLETED' || deliveryJob?.customerAccepted === true;

  // Stepper progress percent
  const completedStepsCount = stepperStages.filter(s => s.completed).length;
  const progressPercent = Math.min(100, Math.max(10, completedStepsCount * 22));

  return (
    <div className="order-detail-page">
      {/* 1. Unified Top Header Strip */}
      <div className="order-header-strip">
        <div className="order-header-left">
          <button type="button" className="btn-back-compact" onClick={() => navigate('/orders')}>
            <ArrowLeft size={13} />
            <span>Đơn hàng</span>
          </button>

          <span className="order-code-text">
            #{order.id.slice(0, 10)}...
            <button
              type="button"
              onClick={handleCopyId}
              title="Sao chép toàn bộ mã đơn hàng"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 2px' }}
            >
              {copied ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={13} />}
            </button>
          </span>

          <span
            className="order-badge-pill"
            style={{ color: statusInfo.color, backgroundColor: statusInfo.bg }}
          >
            <span className="dot" />
            <span>{statusInfo.label}</span>
          </span>

          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '—'}
          </span>
        </div>

        <div className="order-header-right">
          <div className="order-total-highlight">
            <span>Tổng thanh toán:</span>
            <strong>{totalAmount.toLocaleString('vi-VN')} ₫</strong>
          </div>

          <button
            type="button"
            className="btn-back-compact"
            onClick={fetchOrderDetail}
            title="Làm mới dữ liệu"
            style={{ padding: '4px 8px' }}
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* 2. Asymmetric 2-Column Layout */}
      {/* CỘT TRÁI (2/3): SẢN PHẨM & THANH TOÁN + GIAO HÀNG SLIM */}
      {/* CỘT PHẢI (1/3): KHÁCH HÀNG + BIỂU ĐỒ TIMELINE LỊCH SỬ TIẾN TRÌNH */}
      <div className="order-asymmetric-layout">
        {/* =================================================== */}
        {/* CỘT TRÁI: CHIẾM 2/3 KHUNG HÌNH */}
        {/* =================================================== */}
        <div className="order-left-column">
          {/* Main Card: Thông tin sản phẩm & Chi tiết đơn hàng */}
          <div className="order-panel">
            <div className="order-panel-header">
              <h3 className="order-panel-title">
                <ShoppingBag size={14} />
                <span>Chi tiết sản phẩm & Thanh toán</span>
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{items.length} sản phẩm</span>
            </div>

            <div className="order-panel-body">
              {/* Products Table */}
              <table className="compact-prod-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th style={{ textAlign: 'center', width: '50px' }}>SL</th>
                    <th style={{ textAlign: 'right', width: '120px' }}>Đơn giá</th>
                    <th style={{ textAlign: 'right', width: '130px' }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td>
                        <div>
                          {it.productId ? (
                            <Link to={`/products/${it.productId}`} className="compact-prod-link" title="Xem chi tiết sản phẩm này">
                              <span>{it.productName}</span>
                              <ExternalLink size={11} />
                            </Link>
                          ) : (
                            <span style={{ fontWeight: 600 }}>{it.productName}</span>
                          )}
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                            {it.variantName ? `${it.variantName} • ` : ''}SKU: <code style={{ color: '#ea580c' }}>{it.sku || 'SBX-DEF'}</code>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>x{it.quantity || 1}</td>
                      <td style={{ textAlign: 'right' }}>{Number(it.unitPrice || 0).toLocaleString('vi-VN')} ₫</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#ea580c' }}>
                        {Number(it.subtotal || it.unitPrice * (it.quantity || 1)).toLocaleString('vi-VN')} ₫
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Summary */}
              <div className="compact-finance-summary">
                <div className="compact-finance-row">
                  <span>Tạm tính tiền hàng:</span>
                  <span>{subtotal.toLocaleString('vi-VN')} ₫</span>
                </div>
                {discountAmount > 0 && (
                  <div className="compact-finance-row" style={{ color: '#10b981' }}>
                    <span>Giảm giá (Voucher):</span>
                    <span>-{discountAmount.toLocaleString('vi-VN')} ₫</span>
                  </div>
                )}
                <div className="compact-finance-row">
                  <span>Phí vận chuyển & lắp đặt:</span>
                  <span style={{ color: '#10b981' }}>Miễn phí 100%</span>
                </div>
                <div className="compact-finance-row grand">
                  <span>Tổng thanh toán:</span>
                  <span>{totalAmount.toLocaleString('vi-VN')} ₫</span>
                </div>
              </div>

              {/* Payment Row */}
              <div className={`compact-payment-strip ${order.paidAt ? 'paid' : order.status === 'cancelled' ? 'cancelled' : 'pending'}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CreditCard size={14} style={{ color: order.paidAt ? '#10b981' : order.status === 'cancelled' ? '#64748b' : '#f59e0b' }} />
                  <span>
                    Phương thức: <strong>{order.paymentMethod || 'VNPAY'}</strong> •{' '}
                    {order.status === 'cancelled'
                      ? (order.paidAt ? 'Đã thanh toán (Đã hủy đơn)' : 'Chưa thanh toán (Đã hủy đơn)')
                      : (order.paidAt ? 'Đã thanh toán (Quyết toán)' : 'Chờ thanh toán')}
                  </span>
                </div>
                {order.transactionRef && (
                  <code style={{ fontSize: '11px', color: '#ea580c' }}>Ref: {order.transactionRef}</code>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Thông tin giao hàng & Lắp đặt (Gọn gàng & Ngăn nắp) */}
          <div className="order-panel">
            <div className="order-panel-header">
              <h3 className="order-panel-title">
                <Truck size={14} />
                <span>Thông tin giao hàng & Lắp đặt</span>
              </h3>
              {currentJobStatus && (
                <span
                  className="order-badge-pill"
                  style={{
                    color: currentJobStatus.color,
                    backgroundColor: currentJobStatus.bg
                  }}
                >
                  <span className="dot" />
                  <span>{currentJobStatus.label}</span>
                </span>
              )}
            </div>

            <div className="order-panel-body">
              <div className="delivery-grid-layout">
                {/* Tile 1: Kỹ thuật viên phụ trách */}
                <div className="delivery-tile">
                  <div className="delivery-tile-label">
                    <User size={12} />
                    <span>Kỹ thuật viên phụ trách</span>
                  </div>
                  <div className="delivery-tile-content">
                    <span style={{ fontWeight: 700 }}>{assignedTechName}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {deliveryJob?.assignedTo ? 'Đã tiếp nhận' : 'Chờ điều phối'}
                    </span>
                  </div>
                </div>

                {/* Tile 2: Mã vận đơn */}
                <div className="delivery-tile">
                  <div className="delivery-tile-label">
                    <Truck size={12} />
                    <span>Mã vận đơn bưu tá</span>
                  </div>
                  <div className="tracking-input-group">
                    <input
                      type="text"
                      value={trackingNumberInput}
                      onChange={(e) => setTrackingNumberInput(e.target.value)}
                      placeholder="Nhập mã vận đơn..."
                    />
                    <button
                      type="button"
                      onClick={handleUpdateTracking}
                      disabled={updatingTracking}
                    >
                      {updatingTracking ? 'Lưu…' : 'Lưu'}
                    </button>
                  </div>
                  {trackingSuccess && (
                    <div style={{ color: '#10b981', fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Check size={12} /> Đã cập nhật mã vận đơn thành công.
                    </div>
                  )}
                </div>
              </div>

              {/* Nút xem minh chứng nghiệm thu nếu completed */}
              {isCompleted ? (
                <div style={{ marginTop: 2 }}>
                  <button
                    type="button"
                    className="btn-proof-slim"
                    onClick={handleOpenProofModal}
                  >
                    <FileCheck size={14} />
                    <span>Xem Biên Bản Nghiệm Thu & Kiểm Định Thiết Bị</span>
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 2px' }}>
                  <Clock size={12} />
                  <span>Đang tiến hành giao hàng & thi công định vị SmartBox.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =================================================== */}
        {/* CỘT PHẢI: CHIẾM 1/3 (KHÁCH HÀNG & BIỂU ĐỒ TIMELINE) */}
        {/* =================================================== */}
        <div className="order-right-column">
          {/* Card 1: Thông tin khách hàng */}
          <div className="order-panel">
            <div className="order-panel-header">
              <h3 className="order-panel-title">
                <User size={14} />
                <span>Thông tin khách hàng</span>
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Người nhận</span>
            </div>

            <div className="order-panel-body">
              <div className="compact-kv-table">
                <div className="compact-kv-row">
                  <span className="compact-kv-lbl">Khách hàng:</span>
                  <span className="compact-kv-val">{recipientName}</span>
                </div>
                <div className="compact-kv-row">
                  <span className="compact-kv-lbl">Điện thoại:</span>
                  <span className="compact-kv-val">
                    <a href={`tel:${phone}`}>{phone}</a>
                  </span>
                </div>
                <div className="compact-kv-row">
                  <span className="compact-kv-lbl">Email:</span>
                  <span className="compact-kv-val" style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{email}</span>
                </div>
                <div className="compact-kv-row" style={{ borderBottom: 'none' }}>
                  <span className="compact-kv-lbl">Địa chỉ nhận:</span>
                  <span className="compact-kv-val" style={{ fontWeight: 500 }}>
                    <MapPin size={11} style={{ display: 'inline', marginRight: 3, color: '#ea580c' }} />
                    {addressLine}
                  </span>
                </div>
              </div>

              {installationNote && (
                <div className="compact-address-box">
                  <strong style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Ghi chú: </strong>
                  <span>"{installationNote}"</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Biểu Đồ Timeline Tiến Trình (Visual Timeline Chart) */}
          <div className="order-panel">
            <div className="order-panel-header">
              <h3 className="order-panel-title">
                <History size={14} />
                <span>Biểu đồ tiến trình đơn hàng</span>
              </h3>
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                {sortedTimeline.length} sự kiện
              </span>
            </div>

            <div className="order-panel-body">
              {/* 1. Horizontal Phase Stepper / Roadmap */}
              <div className="timeline-stepper-chart">
                <div className="stepper-connector">
                  <div className="stepper-connector-fill" style={{ width: `${progressPercent}%` }} />
                </div>
                {stepperStages.map((st) => (
                  <div
                    key={st.step}
                    className={`stepper-step ${st.completed ? 'completed' : ''} ${st.active ? 'active' : ''}`}
                  >
                    <div className="stepper-node">
                      {st.completed ? <Check size={11} /> : st.step}
                    </div>
                    <span className="stepper-label">{st.label}</span>
                  </div>
                ))}
              </div>

              {/* 2. Visual Chronological Flow Nodes (Newest on top) */}
              <div className="visual-timeline-flow-container">
                <div className="visual-flow-chart">
                  {sortedTimeline.map((ev, idx) => {
                    const isLatest = idx === 0;
                    const labelData = formatEventLabel(ev.source, ev.action);
                    const displayTime = ev.occurredAt || ev.timestamp;

                    return (
                      <div key={ev.id || idx} className={`flow-node-item ${isLatest ? 'latest' : ''}`}>
                        {/* Node Icon */}
                        <div className="flow-node-icon">
                          {renderNodeIcon(labelData.iconType)}
                        </div>

                        {/* Node Card */}
                        <div className="flow-card">
                          <div className="flow-card-top">
                            <span className="flow-timestamp">
                              <Clock size={10} />
                              {displayTime ? new Date(displayTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—'}
                            </span>
                            <span className="flow-stage-tag">
                              {labelData.tag}
                            </span>
                          </div>

                          <div className="flow-title">
                            {labelData.title}
                          </div>

                          <div className="flow-desc">
                            {ev.reason || labelData.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Modal: Minh Chứng Nghiệm Thu Lắp Đặt Xong */}
      {showProofModal && (
        <div className="proof-modal-overlay" onClick={() => setShowProofModal(false)}>
          <div className="proof-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="proof-modal-header">
              <h4>
                <ShieldCheck size={16} />
                Biên Bản Nghiệm Thu & Bàn Giao Thiết Bị
              </h4>
              <button
                type="button"
                onClick={() => setShowProofModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="proof-modal-body">
              {loadingProof ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                  <RefreshCw size={20} className="spin" style={{ marginBottom: 6 }} />
                  <div>Đang tải biên bản kiểm định…</div>
                </div>
              ) : (
                <>
                  <div className="proof-banner">
                    <CheckCircle size={16} />
                    <span>Nghiệm thu hoàn tất & Khách hàng đã nhận bàn giao</span>
                  </div>

                  <div className="compact-kv-table">
                    <div className="compact-kv-row">
                      <span className="compact-kv-lbl">Thời gian:</span>
                      <span className="compact-kv-val" style={{ color: '#10b981' }}>
                        {deliveryJob?.completedAt ? new Date(deliveryJob.completedAt).toLocaleString('vi-VN') : 'Đã nghiệm thu'}
                      </span>
                    </div>
                    <div className="compact-kv-row">
                      <span className="compact-kv-lbl">Kỹ thuật viên:</span>
                      <span className="compact-kv-val">{assignedTechName}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                    Hạng mục kiểm định thiết bị tại chỗ:
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="proof-check-row">
                      <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                      <span>Xác minh mã Serial SmartBox khớp hợp đồng PO</span>
                    </div>
                    <div className="proof-check-row">
                      <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                      <span>Khởi tạo & kiểm tra đóng/mở khóa an toàn thành công</span>
                    </div>
                    <div className="proof-check-row">
                      <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                      <span>Hiệu chuẩn cảm biến tải trọng (Tare Weight Verification)</span>
                    </div>
                    <div className="proof-check-row">
                      <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                      <span>Kích hoạt bảo hành điện tử chính hãng tự động</span>
                    </div>
                  </div>

                  {deliveryJob?.devices && deliveryJob.devices.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Mã Serial thiết bị đã bàn giao:</span>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        {deliveryJob.devices.map((d, i) => (
                          <span
                            key={i}
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: 'var(--bg-main)',
                              border: '1px solid var(--border-color)',
                              fontFamily: 'monospace',
                              fontSize: '11.5px',
                              color: '#ea580c',
                              fontWeight: 700
                            }}
                          >
                            Serial: {d.serialNumber || 'SBX-SER-001'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {deliveryJob?.installationNote && (
                    <div className="compact-address-box">
                      <strong>Ghi chú bàn giao:</strong> {deliveryJob.installationNote}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="proof-modal-footer">
              <button
                type="button"
                className="btn-back-compact"
                onClick={() => setShowProofModal(false)}
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
