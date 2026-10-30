import { useState, useEffect, type FormEvent } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  ShieldCheck,
  MapPin,
  RefreshCw,
  AlertCircle,
  Calendar,
  CreditCard,
  ArrowRight,
  Receipt,
  Copy,
  Check,
  Phone,
  User,
  AlertOctagon,
  Wrench,
  Cpu,
  FileCheck,
  Navigation,
  CornerUpRight,
} from 'lucide-react';
import { request, money, ApiError } from '../api/shop';
import { displayDate, eventLabel } from '../components/commercePresentation';
import { useShop } from '../ShopContext';
import './OrderTracking.css';

interface OrderItem {
  id: string;
  productName: string;
  variantName: string | null;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface TimelineEvent {
  source: string;
  action: string;
  occurredAt: string;
}

interface DeliveryInfo {
  id: string;
  status: string;
  scheduledAt: string | null;
  deliveredAt: string | null;
  installedAt: string | null;
  completedAt: string | null;
  customerAccepted: boolean;
  devices: { serialNumber: string; name: string | null; hasWeightSensor: boolean }[];
}

interface OrderLookupResult {
  orderId: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string | null;
  shippingAddress: string;
  recipientNameMasked: string;
  phoneMasked: string;
  total: number;
  subtotal: number;
  discountAmount: number;
  voucherCode: string | null;
  items: OrderItem[];
  timeline: TimelineEvent[];
  deliveryInstallation: DeliveryInfo | null;
}

const statusMap: Record<string, { label: string; class: string; icon: 'clock' | 'check' | 'truck' | 'cancel' | 'card' }> = {
  pending: { label: 'Chờ xét duyệt kỹ thuật', class: 'tracking-status-pending', icon: 'clock' },
  PENDING: { label: 'Chờ xét duyệt kỹ thuật', class: 'tracking-status-pending', icon: 'clock' },
  customer_decision_pending: { label: 'Cần bạn xác nhận', class: 'tracking-status-pending', icon: 'clock' },
  PARTIALLY_REJECTED: { label: 'Duyệt một phần sản phẩm', class: 'tracking-status-pending', icon: 'clock' },
  approved: { label: 'Đã duyệt — Chờ thanh toán', class: 'tracking-status-approved', icon: 'check' },
  APPROVED: { label: 'Đã duyệt — Chờ thanh toán', class: 'tracking-status-approved', icon: 'check' },
  awaiting_payment: { label: 'Chờ thanh toán', class: 'tracking-status-awaiting_payment', icon: 'card' },
  paid: { label: 'Đã thanh toán thành công', class: 'tracking-status-paid', icon: 'check' },
  confirmed: { label: 'Đã xác nhận thanh toán', class: 'tracking-status-paid', icon: 'check' },
  shipping: { label: 'Đang vận chuyển & Lắp đặt', class: 'tracking-status-delivering', icon: 'truck' },
  delivering: { label: 'Đang vận chuyển & Lắp đặt', class: 'tracking-status-delivering', icon: 'truck' },
  completed: { label: 'Hoàn tất & Đã nghiệm thu', class: 'tracking-status-completed', icon: 'check' },
  COMPLETED: { label: 'Hoàn tất & Đã nghiệm thu', class: 'tracking-status-completed', icon: 'check' },
  cancelled: { label: 'Đơn hàng đã hủy', class: 'tracking-status-cancelled', icon: 'cancel' },
  CANCELLED: { label: 'Đơn hàng đã hủy', class: 'tracking-status-cancelled', icon: 'cancel' },
};

function formatTimelineAction(action: string) {
  const customMap: Record<string, string> = {
    pending: 'Khởi tạo đơn hàng & Chờ duyệt kỹ thuật',
    PENDING: 'Khởi tạo đơn hàng & Chờ duyệt kỹ thuật',
    awaiting_payment: 'Đơn hàng đã được duyệt — Chờ khách thanh toán',
    paid: 'Đã thanh toán thành công qua cổng thanh toán',
    confirmed: 'Đã xác nhận thanh toán & lên lịch lắp đặt',
    shipping: 'Bắt đầu vận chuyển thiết bị tới địa chỉ',
    delivering: 'Kỹ thuật viên đang giao & lắp đặt thiết bị',
    completed: 'Đã nghiệm thu hoàn tất & kích hoạt bảo hành điện tử',
    COMPLETED: 'Đã nghiệm thu hoàn tất & kích hoạt bảo hành điện tử',
    cancelled: 'Đơn hàng đã hủy',
    CANCELLED: 'Đơn hàng đã hủy',
    customer_decision_pending: 'Cần khách hàng xác nhận sản phẩm được duyệt',
    PARTIALLY_REJECTED: 'Được duyệt một phần danh sách sản phẩm',
    CREATED: 'Đã tạo đơn hàng mới',
    UPDATED: 'Đã cập nhật thông tin đơn hàng',
    RESUBMITTED: 'Đã gửi giải trình bổ sung',
    ORDER_CREATED_AWAITING_APPROVAL: 'Đơn đã gửi và đang chờ xét duyệt',
    APPROVE: 'Kỹ thuật viên đã duyệt đơn hàng',
    REJECT: 'Đơn hàng bị từ chối',
    RETURN: 'Yêu cầu khách hàng bổ sung thông tin',
    ASSIGN: 'Đã phân công kỹ thuật viên lắp đặt',
    START: 'Bắt đầu quá trình giao & lắp đặt',
    DELIVER: 'Đã giao kiện hàng đến cửa nhà',
    INSTALL: 'Đã hoàn tất gắn cố định và đấu nguồn',
    ACCEPT: 'Khách hàng đã ký biên bản nghiệm thu',
    LINK_SERIAL: 'Đã liên kết mã Serial thiết bị vào tài khoản',
  };
  return customMap[action] || eventLabel(action) || action;
}

function getTimelineIconType(action: string): 'positive' | 'negative' | 'warning' | 'neutral' {
  const lower = action.toLowerCase();
  if (['cancelled', 'reject', 'failed'].some(k => lower.includes(k))) return 'negative';
  if (['paid', 'confirmed', 'completed', 'accept', 'approve'].some(k => lower.includes(k))) return 'positive';
  if (['pending', 'awaiting_payment', 'return'].some(k => lower.includes(k))) return 'warning';
  return 'neutral';
}

export function OrderTracking() {
  const [params, setParams] = useSearchParams();
  const { user } = useShop();

  const [orderId, setOrderId] = useState(() => params.get('orderId') || params.get('id') || '');
  const [phone, setPhone] = useState(() => params.get('phone') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OrderLookupResult | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  async function performLookup(idToLookup: string, phoneToLookup: string) {
    if (!idToLookup.trim() && !phoneToLookup.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await request<OrderLookupResult>(
        '/orders/lookup',
        {
          method: 'POST',
          body: JSON.stringify({
            orderId: idToLookup.trim() || undefined,
            phone: phoneToLookup.trim() || undefined,
          }),
        },
        false
      );
      setData(result);
    } catch (err) {
      setData(null);
      if (err instanceof ApiError) {
        setError(err.message || 'Không tìm thấy thông tin đơn hàng');
      } else {
        setError('Có lỗi khi kết nối tới máy chủ. Vui lòng kiểm tra lại mã đơn.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const urlId = params.get('orderId') || params.get('id') || '';
    const urlPhone = params.get('phone') || '';
    if (urlId || urlPhone) {
      setOrderId(urlId);
      setPhone(urlPhone);
      void performLookup(urlId, urlPhone);
    }
  }, [params]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!orderId.trim() && !phone.trim()) {
      setError('Vui lòng nhập mã đơn hàng hoặc số điện thoại.');
      return;
    }
    const newParams = new URLSearchParams();
    if (orderId.trim()) newParams.set('orderId', orderId.trim());
    if (phone.trim()) newParams.set('phone', phone.trim());
    setParams(newParams);
    void performLookup(orderId, phone);
  }

  const handleCopyOrderId = () => {
    if (!data?.orderId) return;
    navigator.clipboard.writeText(data.orderId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const currentStatus = data?.status ? data.status.toLowerCase() : '';
  const isCancelled = currentStatus === 'cancelled';
  const isPaid = currentStatus === 'paid' || currentStatus === 'confirmed' || currentStatus === 'completed';
  const isCompleted = currentStatus === 'completed';
  const isAwaitingPayment = currentStatus === 'awaiting_payment';
  const isApproved = isAwaitingPayment || isPaid || isCompleted || currentStatus === 'approved';
  const isDelivering = currentStatus === 'shipping' || currentStatus === 'delivering';
  const routeProgressPct = isCompleted
    ? 100
    : isDelivering
    ? 80
    : isPaid
    ? 65
    : isApproved || isAwaitingPayment
    ? 45
    : 20;

  const statusInfo = statusMap[data?.status || ''] || {
    label: data?.status || 'Đang cập nhật',
    class: 'tracking-status-pending',
    icon: 'clock',
  };

  return (
    <div className="order-tracking-page">
      {/* Hero Header */}
      <div className="order-tracking-hero">
        <div className="hero-badge">
          <Package size={14} className="sparkle-icon" />
          <span>HỆ THỐNG TRA CỨU ĐƠN HÀNG ANCHORBOX</span>
        </div>
        <h1>Theo dõi tiến độ đơn hàng.</h1>
        <p>
          Kiểm tra tình trạng xét duyệt kỹ thuật, tiến độ giao lắp và thông tin thiết bị AnchorBox của bạn mọi lúc mọi nơi.
        </p>
      </div>

      {/* Lookup Search Box */}
      <div className="order-tracking-box">
        <form className="order-tracking-form" onSubmit={handleSubmit}>
          <div className="order-tracking-field">
            <label htmlFor="order-id-input">
              <span>Mã đơn hàng (Order ID)</span>
            </label>
            <div className="input-with-icon">
              <Package size={18} className="field-icon" />
              <input
                id="order-id-input"
                type="text"
                placeholder="Nhập mã đơn, VD: 29f2a16d-fc3e-..."
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              />
            </div>
          </div>

          <div className="order-tracking-field">
            <label htmlFor="order-phone-input">
              <span>Số điện thoại người nhận (tùy chọn)</span>
            </label>
            <div className="input-with-icon">
              <Phone size={18} className="field-icon" />
              <input
                id="order-phone-input"
                type="tel"
                placeholder="VD: 0987654321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="order-tracking-btn" disabled={loading}>
            {loading ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />}
            <span>Tra cứu tiến độ</span>
          </button>
        </form>

        {user && (
          <div className="logged-in-hint">
            <span>💡 Bạn đang đăng nhập với tài khoản <strong>{user.fullName || user.email}</strong>.</span>
            <Link to="/account/orders" className="orders-link">
              Xem toàn bộ lịch sử đơn hàng của bạn →
            </Link>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="tracking-error-notice" role="alert">
          <AlertCircle size={22} className="error-icon" />
          <div>
            <strong>Không tìm thấy đơn hàng:</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Tracking Result */}
      {data && (
        <div className="tracking-result-card">
          {/* Card Top Bar */}
          <div className="tracking-header">
            <div className="tracking-header-left">
              <div className="order-code-badge-row">
                <span className="order-code-label">MÃ ĐƠN HÀNG:</span>
                <code className="order-code-text">{data.orderId}</code>
                <button
                  type="button"
                  className="copy-id-btn"
                  onClick={handleCopyOrderId}
                  title="Sao chép mã đơn hàng"
                  aria-label="Sao chép mã đơn"
                >
                  {copiedId ? <Check size={14} className="copied" /> : <Copy size={14} />}
                  <span>{copiedId ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
              </div>
              <p className="order-init-time">
                Thời gian khởi tạo đơn: <strong>{displayDate(data.createdAt)}</strong>
              </p>
            </div>

            <div className={`tracking-status-pill ${statusInfo.class}`}>
              {statusInfo.icon === 'check' && <CheckCircle2 size={16} />}
              {statusInfo.icon === 'clock' && <Clock size={16} />}
              {statusInfo.icon === 'truck' && <Truck size={16} />}
              {statusInfo.icon === 'card' && <CreditCard size={16} />}
              {statusInfo.icon === 'cancel' && <AlertOctagon size={16} />}
              <span>{statusInfo.label}</span>
            </div>
          </div>

          {/* Cancelled Banner if applicable */}
          {isCancelled && (
            <div className="tracking-cancelled-banner">
              <AlertOctagon size={24} className="banner-icon" />
              <div className="banner-content">
                <h4>Đơn hàng đã được ghi nhận hủy</h4>
                <p>
                  Đơn hàng này hiện đã dừng xử lý. Nếu bạn cần kích hoạt lại hoặc đặt cấu hình mới, hãy liên hệ nhân viên hỗ trợ hoặc đặt đơn mới.
                </p>
              </div>
              <Link to="/products" className="banner-link">
                Khám phá sản phẩm khác →
              </Link>
            </div>
          )}

          {/* Apple Maps / Find My Inspired Delivery Route Card */}
          <div className="apple-map-route-widget">
            <div className="apple-map-header">
              <span className="apple-map-badge">
                <Navigation size={13} />
                LỘ TRÌNH ĐIỀU PHỐI & LẮP ĐẶT (APPLE MAPS WIDGET)
              </span>

              <div className="apple-map-gps-indicator">
                <span className="gps-radar-dot" />
                <span>
                  {isCompleted
                    ? 'Đã hoàn tất nghiệm thu & kích hoạt bảo hành'
                    : isDelivering
                    ? 'Kỹ thuật viên đang di chuyển trên lộ trình'
                    : isPaid
                    ? 'Đã chuẩn bị thiết bị • Sẵn sàng xuất kho'
                    : 'Đang thẩm định kỹ thuật vị trí lắp đặt'}
                </span>
              </div>
            </div>

            {/* Endpoints bar: Departure Hub -> Delivery Technician -> Customer Address */}
            <div className="apple-route-endpoints">
              <div className="endpoint-item">
                <div className="endpoint-icon origin">
                  <Package size={18} />
                </div>
                <div className="endpoint-meta">
                  <span className="endpoint-label">Điểm xuất xưởng</span>
                  <strong className="endpoint-name">Trung tâm Điều phối AnchorBox</strong>
                </div>
              </div>

              <ArrowRight size={18} className="endpoint-arrow" />

              <div className="endpoint-item">
                <div className="endpoint-icon origin">
                  <Truck size={18} />
                </div>
                <div className="endpoint-meta">
                  <span className="endpoint-label">Phương tiện điều phối</span>
                  <strong className="endpoint-name">Kỹ thuật viên AnchorBox Tech Squad</strong>
                </div>
              </div>

              <ArrowRight size={18} className="endpoint-arrow" />

              <div className="endpoint-item">
                <div className="endpoint-icon dest">
                  <MapPin size={18} />
                </div>
                <div className="endpoint-meta">
                  <span className="endpoint-label">Điểm đích nhận hàng</span>
                  <strong className="endpoint-name">
                    {data.shippingAddress || 'Địa chỉ đăng ký của khách hàng'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Sleek Segmented Route Progress Track (Apple Maps style) */}
            <div className="apple-route-track-container">
              <div className="apple-route-track">
                <div
                  className="apple-route-fill"
                  style={{ width: `${routeProgressPct}%` }}
                >
                  <span className="apple-route-gps-dot" title="Vị trí hiện tại" />
                </div>
              </div>

              {/* 4 Milestones */}
              <div className="apple-route-milestones">
                <div className={`apple-milestone-pill ${!isCancelled ? 'is-done' : ''}`}>
                  <div className="milestone-icon-circle">
                    <Package size={15} />
                  </div>
                  <div className="milestone-text">
                    <span className="milestone-step-num">Bước 01</span>
                    <strong className="milestone-title">Khởi tạo đơn</strong>
                    <span className="milestone-sub">Cấu hình hộp đã ghi nhận</span>
                  </div>
                </div>

                <div
                  className={`apple-milestone-pill ${
                    isApproved ? 'is-done' : currentStatus.includes('pending') ? 'is-active' : ''
                  }`}
                >
                  <div className="milestone-icon-circle">
                    <ShieldCheck size={15} />
                  </div>
                  <div className="milestone-text">
                    <span className="milestone-step-num">Bước 02</span>
                    <strong className="milestone-title">Khảo sát & Duyệt</strong>
                    <span className="milestone-sub">
                      {isApproved ? 'Đã duyệt kỹ thuật' : 'Kỹ thuật viên khảo sát'}
                    </span>
                  </div>
                </div>

                <div
                  className={`apple-milestone-pill ${
                    isPaid ? 'is-done' : isAwaitingPayment ? 'is-active' : ''
                  }`}
                >
                  <div className="milestone-icon-circle">
                    <CreditCard size={15} />
                  </div>
                  <div className="milestone-text">
                    <span className="milestone-step-num">Bước 03</span>
                    <strong className="milestone-title">Thanh toán</strong>
                    <span className="milestone-sub">
                      {isPaid ? 'Đã thanh toán an toàn' : isAwaitingPayment ? 'Chờ thanh toán' : 'Xác nhận hóa đơn'}
                    </span>
                  </div>
                </div>

                <div
                  className={`apple-milestone-pill ${
                    isCompleted ? 'is-done' : isDelivering ? 'is-active' : ''
                  }`}
                >
                  <div className="milestone-icon-circle">
                    <Truck size={15} />
                  </div>
                  <div className="milestone-text">
                    <span className="milestone-step-num">Bước 04</span>
                    <strong className="milestone-title">Giao & Lắp đặt</strong>
                    <span className="milestone-sub">
                      {isCompleted ? 'Đã nghiệm thu xong' : 'Bàn giao & Gắn cố định'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Grid 2 cột: Chi tiết sản phẩm + Thông tin giao nhận & Timeline */}
          <div className="tracking-grid">
            {/* Cột trái: Chi tiết sản phẩm & Thiết bị bàn giao */}
            <div className="tracking-col-left">
              {/* Box 1: Sản phẩm trong đơn */}
              <div className="tracking-info-block">
                <div className="block-title-row">
                  <div className="title-icon-badge blue">
                    <Receipt size={18} />
                  </div>
                  <h3>Sản phẩm trong đơn hàng</h3>
                  <span className="items-count-badge">
                    {data.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} sản phẩm
                  </span>
                </div>

                <div className="table-responsive-box">
                  <table className="tracking-items-table">
                    <thead>
                      <tr>
                        <th>Sản phẩm / Cấu hình</th>
                        <th className="num">SL</th>
                        <th className="num">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items?.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="product-row-flex">
                              <div className="item-cube-icon">
                                <Package size={18} />
                              </div>
                              <div>
                                <strong className="item-title">{item.productName}</strong>
                                {item.variantName && (
                                  <span className="item-variant-label">
                                    Phiên bản: {item.variantName}
                                  </span>
                                )}
                                <span className="item-sku-label">SKU: {item.sku}</span>
                              </div>
                            </div>
                          </td>
                          <td className="num">
                            <span className="qty-tag">{item.quantity}</span>
                          </td>
                          <td className="num">
                            <strong className="item-price-total">
                              {money(item.subtotal || item.unitPrice * item.quantity)}
                            </strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="tracking-total-summary">
                  <div className="tracking-fact-item">
                    <span className="tracking-fact-label">Tạm tính tiền hàng:</span>
                    <span className="tracking-fact-value">{money(data.subtotal)}</span>
                  </div>

                  {data.discountAmount > 0 && (
                    <div className="tracking-fact-item discount-row">
                      <span className="tracking-fact-label">
                        Giảm giá khuyến mại ({data.voucherCode || 'Mã ưu đãi'}):
                      </span>
                      <span className="tracking-fact-value">- {money(data.discountAmount)}</span>
                    </div>
                  )}

                  <div className="total-highlight-row">
                    <span className="total-label">Tổng thanh toán đơn hàng:</span>
                    <strong className="total-amount">{money(data.total)}</strong>
                  </div>
                </div>
              </div>

              {/* Box 2: Tiến độ bàn giao & Lắp đặt (nếu có) */}
              {data.deliveryInstallation && (
                <div className="tracking-info-block delivery-block">
                  <div className="block-title-row">
                    <div className="title-icon-badge purple">
                      <Truck size={18} />
                    </div>
                    <h3>Tiến độ bàn giao & Lắp đặt</h3>
                    <span className="delivery-status-tag">{data.deliveryInstallation.status}</span>
                  </div>

                  <div className="tracking-facts-list">
                    {data.deliveryInstallation.scheduledAt && (
                      <div className="tracking-fact-item">
                        <span className="tracking-fact-label">Lịch hẹn kỹ thuật viên:</span>
                        <strong className="tracking-fact-value">
                          {displayDate(data.deliveryInstallation.scheduledAt)}
                        </strong>
                      </div>
                    )}
                    {data.deliveryInstallation.installedAt && (
                      <div className="tracking-fact-item">
                        <span className="tracking-fact-label">Thời điểm hoàn tất lắp đặt:</span>
                        <strong className="tracking-fact-value">
                          {displayDate(data.deliveryInstallation.installedAt)}
                        </strong>
                      </div>
                    )}
                  </div>

                  {data.deliveryInstallation.devices?.length > 0 && (
                    <div className="tracking-device-box">
                      <div className="device-box-header">
                        <Cpu size={18} />
                        <span>Thiết bị phần cứng bàn giao:</span>
                      </div>
                      <div className="device-cards-list">
                        {data.deliveryInstallation.devices.map((dev, idx) => (
                          <div key={idx} className="device-chip">
                            <span className="dev-serial">
                              Serial: <code>{dev.serialNumber}</code>
                            </span>
                            {dev.hasWeightSensor ? (
                              <span className="sensor-tag has-sensor">✓ Cảm biến tải trọng Loadcell</span>
                            ) : (
                              <span className="sensor-tag no-sensor">Khóa điện tử tiêu chuẩn</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cột phải: Thông tin người nhận + Dòng thời gian lịch sử */}
            <div className="tracking-col-right">
              {/* Box 1: Địa chỉ & Người nhận */}
              <div className="tracking-info-block">
                <div className="block-title-row">
                  <div className="title-icon-badge emerald">
                    <MapPin size={18} />
                  </div>
                  <h3>Địa chỉ & Người nhận</h3>
                </div>

                <div className="customer-info-list">
                  <div className="info-item">
                    <User size={16} className="info-icon" />
                    <div>
                      <span className="info-label">Người nhận hàng</span>
                      <strong className="info-val">{data.recipientNameMasked || 'Chưa cập nhật'}</strong>
                    </div>
                  </div>

                  <div className="info-item">
                    <Phone size={16} className="info-icon" />
                    <div>
                      <span className="info-label">Số điện thoại liên hệ</span>
                      <strong className="info-val">{data.phoneMasked || 'Chưa cập nhật'}</strong>
                    </div>
                  </div>

                  <div className="info-item">
                    <MapPin size={16} className="info-icon" />
                    <div>
                      <span className="info-label">Địa chỉ lắp đặt AnchorBox</span>
                      <strong className="info-val address-text">
                        {data.shippingAddress || 'Chưa cập nhật địa chỉ'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 2: Timeline sự kiện lịch sử */}
              {data.timeline && data.timeline.length > 0 && (
                <div className="tracking-info-block timeline-block">
                  <div className="block-title-row">
                    <div className="title-icon-badge amber">
                      <Calendar size={18} />
                    </div>
                    <h3>Lịch sử cập nhật</h3>
                  </div>

                  {/* Apple Maps Turn-by-Turn Navigation Style Milestones */}
                  <div className="apple-turn-timeline-list">
                    {data.timeline.map((ev, index) => {
                      const tone = getTimelineIconType(ev.action);
                      const actionLabel = formatTimelineAction(ev.action);
                      return (
                        <div className="apple-turn-step-card" key={index}>
                          <div className={`turn-badge-icon ${tone}`}>
                            {tone === 'positive' && <CheckCircle2 size={16} />}
                            {tone === 'negative' && <AlertOctagon size={16} />}
                            {tone === 'warning' && <Clock size={16} />}
                            {tone === 'neutral' && <CornerUpRight size={16} />}
                          </div>
                          <div className="turn-step-content">
                            <strong className="turn-action-title">{actionLabel}</strong>
                            <time className="turn-step-time">{displayDate(ev.occurredAt)}</time>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Box 3: Quick Next Action CTAs */}
              <div className="tracking-actions-card">
                {isAwaitingPayment && (
                  <Link
                    to={`/account/orders/${data.orderId}`}
                    className="tracking-action-btn primary"
                  >
                    <span>Thanh toán đơn hàng ngay</span>
                    <ArrowRight size={16} />
                  </Link>
                )}

                {isCompleted && (
                  <Link
                    to={`/account/warranty?orderId=${data.orderId}`}
                    className="tracking-action-btn secondary"
                  >
                    <FileCheck size={16} />
                    <span>Tra cứu bảo hành thiết bị</span>
                  </Link>
                )}

                <div className="support-contact-box">
                  <div className="support-text">
                    <Wrench size={16} className="supp-icon" />
                    <span>Cần hỗ trợ kỹ thuật về đơn hàng này?</span>
                  </div>
                  <Link to="/contact" className="support-link">
                    Liên hệ kỹ thuật viên AnchorBox →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderTracking;
