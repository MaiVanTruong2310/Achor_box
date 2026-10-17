import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  Search,
  ShoppingBag,
  User,
  Phone,
  MapPin,
  CreditCard,
  Truck,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowLeft,
  RefreshCw,
  Eye,
  ShieldCheck,
  ChevronRight,
  Package,
  Calendar,
  X
} from 'lucide-react';
import { adminRequest } from '../../services/adminRequest';
import { adminCatalogApi } from '../../services/adminCatalogApi';
import { ExtendedOrder } from '../../services/api';
import { SalesInvoiceModal } from '../../components/SalesInvoiceModal';
import '../catalog/products.css';

interface TimelineEvent {
  id: string;
  source: string;
  action: string;
  occurredAt: string;
  reason?: string;
  attempt?: number;
  version?: number;
}

interface Timeline {
  orderId: string;
  orderStatus: string;
  events: TimelineEvent[];
}

const sourceConfigs: Record<string, { label: string; color: string; bg: string }> = {
  ORDER: { label: 'Đơn hàng', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
  PO_TICKET: { label: 'Phê duyệt PO', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.1)' },
  DELIVERY_INSTALLATION: { label: 'Giao & Lắp đặt', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' }
};

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Chờ xử lý', color: '#d97706', bg: 'rgba(245, 158, 11, 0.1)' },
  awaiting_payment: { label: 'Chờ thanh toán', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' },
  paid: { label: 'Đã thanh toán', color: '#059669', bg: 'rgba(16, 185, 129, 0.1)' },
  confirmed: { label: 'Đã duyệt PO', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
  completed: { label: 'Đã nghiệm thu', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.1)' },
  cancelled: { label: 'Đã hủy', color: '#dc2626', bg: 'rgba(239, 68, 68, 0.1)' },
  processing: { label: 'Chuẩn bị hàng', color: '#d97706', bg: 'rgba(245, 158, 11, 0.1)' },
  shipping: { label: 'Đang giao hàng', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' },
  delivered: { label: 'Đã giao hàng', color: '#059669', bg: 'rgba(16, 185, 129, 0.1)' }
};

export const OrderProcessingHistory: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useSearchParams();
  const orderIdFromUrl = query.get('orderId') || '';

  const [ordersList, setOrdersList] = useState<ExtendedOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orderIdFromUrl);
  const [selectedOrder, setSelectedOrder] = useState<ExtendedOrder | null>(null);

  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  // Load recent orders for selection
  const loadRecentOrders = async () => {
    setLoadingOrders(true);
    try {
      const data = await adminCatalogApi.orders(0, '', 'all', 'all');
      setOrdersList(data.content || []);
    } catch (err: any) {
      console.error('Failed to load recent orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadRecentOrders();
  }, []);

  // When selectedOrderId changes, fetch timeline and find order info
  useEffect(() => {
    if (!selectedOrderId) {
      setTimeline(null);
      setSelectedOrder(null);
      return;
    }

    // Match order from list if available
    const matched = ordersList.find((o) => o.id === selectedOrderId);
    if (matched) {
      setSelectedOrder(matched);
    }

    let active = true;
    setLoadingTimeline(true);
    setError('');
    adminRequest<Timeline>(`/orders/${encodeURIComponent(selectedOrderId)}/timeline`)
      .then((data) => {
        if (active) setTimeline(data);
      })
      .catch((e) => {
        if (active) setError(e.message || 'Không thể tải lịch sử đơn hàng.');
      })
      .finally(() => {
        if (active) setLoadingTimeline(false);
      });

    return () => {
      active = false;
    };
  }, [selectedOrderId, ordersList]);

  // Handle selecting an order
  const handleSelectOrder = (id: string) => {
    setSelectedOrderId(id);
    setQuery({ orderId: id });
  };

  // Filter orders in dropdown / list
  const filteredOrders = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return ordersList;
    return ordersList.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        (o.customer?.full_name || '').toLowerCase().includes(q) ||
        (o.customer?.phone || '').includes(q)
    );
  }, [ordersList, searchTerm]);

  return (
    <div className="products-page">
      {/* 1. Header Bar */}
      <div className="products-topbar">
        <div className="products-topbar-title">
          <h1>
            <Clock size={22} style={{ color: 'var(--fpt-orange)' }} />
            <span>Chi Tiết &amp; Lịch Sử Xử Lý Đơn Hàng</span>
          </h1>
          <p className="products-topbar-desc">
            Theo dõi chi tiết thông tin đơn hàng, khách hàng, sản phẩm và toàn bộ dòng thời gian xử lý qua từng giai đoạn.
          </p>
        </div>

        <div className="products-topbar-actions">
          {selectedOrderId && (
            <button
              type="button"
              className="btn-secondary-compact"
              onClick={() => {
                setSelectedOrderId('');
                setQuery({});
              }}
            >
              <ArrowLeft size={15} />
              <span>Xem danh sách đơn</span>
            </button>
          )}

          <button
            type="button"
            className="icon-btn-clean"
            onClick={() => {
              loadRecentOrders();
              if (selectedOrderId) {
                adminRequest<Timeline>(`/orders/${encodeURIComponent(selectedOrderId)}/timeline`).then(setTimeline);
              }
            }}
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={15} className={loadingOrders || loadingTimeline ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Order Selector Bar */}
      <div className="products-filter-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
          <div className="products-search-box" style={{ maxWidth: 360 }}>
            <Search size={15} />
            <input
              type="text"
              placeholder="Tìm theo mã đơn, tên khách, SĐT…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchTerm('')}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 260 }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              Chọn đơn hàng:
            </label>
            <select
              className="products-select-clean"
              style={{ width: '100%', maxWidth: 460 }}
              value={selectedOrderId}
              onChange={(e) => handleSelectOrder(e.target.value)}
            >
              <option value="">-- Chọn đơn hàng để xem chi tiết &amp; lịch sử --</option>
              {filteredOrders.map((ord) => {
                const custName = ord.customer?.full_name || 'Khách vãng lai';
                const st = statusLabels[ord.status]?.label || ord.status;
                const amt = Number(ord.total || 0).toLocaleString('vi-VN') + ' ₫';
                return (
                  <option key={ord.id} value={ord.id}>
                    #{ord.id.slice(0, 8)} · {custName} · {amt} · [{st}]
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div
          role="alert"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#dc2626',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Main Content: When Order is Selected */}
      {selectedOrderId ? (
        loadingTimeline ? (
          <div className="products-clean-table-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <RefreshCw size={24} className="spin" style={{ color: 'var(--fpt-orange)', margin: '0 auto 12px' }} />
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13.5px' }}>
              Đang tải chi tiết đơn hàng và lịch sử xử lý…
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '20px', alignItems: 'start' }}>
            {/* Cột Trái: Chi Tiết Đơn Hàng & Khách Hàng */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Thẻ Tổng quan Đơn hàng */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                      Mã đơn hàng
                    </span>
                    <h3 style={{ margin: '4px 0 0', fontSize: '1.2rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                      {selectedOrderId}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {selectedOrder && (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          color: statusLabels[selectedOrder.status]?.color || '#64748b',
                          background: statusLabels[selectedOrder.status]?.bg || 'rgba(100, 116, 139, 0.1)'
                        }}
                      >
                        {statusLabels[selectedOrder.status]?.label || selectedOrder.status}
                      </span>
                    )}
                    {timeline && !selectedOrder && (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          color: statusLabels[timeline.orderStatus]?.color || '#64748b',
                          background: statusLabels[timeline.orderStatus]?.bg || 'rgba(100, 116, 139, 0.1)'
                        }}
                      >
                        {statusLabels[timeline.orderStatus]?.label || timeline.orderStatus}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                      Tổng tiền thanh toán
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--fpt-orange)' }}>
                      {selectedOrder ? Number(selectedOrder.total || 0).toLocaleString('vi-VN') + ' ₫' : '—'}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                      Hình thức thanh toán
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {selectedOrder?.payment_method?.toUpperCase() || 'VNPAY'}
                    </span>
                    <span
                      style={{
                        marginLeft: '8px',
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: selectedOrder?.payment_status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: selectedOrder?.payment_status === 'paid' ? '#059669' : '#d97706',
                        fontWeight: 600
                      }}
                    >
                      {selectedOrder?.payment_status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                    </span>
                  </div>
                </div>

                {selectedOrder && (
                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                      Ngày đặt hàng: <strong>{new Date(selectedOrder.created_at).toLocaleString('vi-VN')}</strong>
                    </span>
                    <button
                      type="button"
                      className="btn-secondary-compact"
                      style={{ padding: '5px 12px', fontSize: '12px' }}
                      onClick={() => setInvoiceModalOpen(true)}
                    >
                      <FileText size={14} />
                      <span>Xem hóa đơn VAT</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Thẻ Khách Hàng & Giao Nhận */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
                }}
              >
                <h4 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={16} style={{ color: '#0284c7' }} />
                  <span>Thông tin người nhận &amp; Giao hàng</span>
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: 110, color: 'var(--text-muted)' }}>Họ và tên:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {selectedOrder?.customer?.full_name || 'Khách hàng SmartBox'}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: 110, color: 'var(--text-muted)' }}>Số điện thoại:</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontFamily: 'monospace' }}>
                      {selectedOrder?.customer?.phone || selectedOrder?.shipping_address ? (selectedOrder.customer?.phone || 'Chưa cung cấp') : '—'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ width: 110, color: 'var(--text-muted)', flexShrink: 0 }}>Địa chỉ giao hàng:</span>
                    <span style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {selectedOrder?.shipping_address || 'Địa chỉ tiêu chuẩn ghi nhận tại hợp đồng'}
                    </span>
                  </div>

                  {selectedOrder?.tracking_number && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                      <span style={{ width: 110, color: 'var(--text-muted)' }}>Mã vận đơn:</span>
                      <code style={{ background: 'var(--bg-surface)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                        {selectedOrder.tracking_number}
                      </code>
                    </div>
                  )}
                </div>
              </div>

              {/* Thẻ Sản phẩm trong đơn */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
                }}
              >
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={16} style={{ color: 'var(--fpt-orange)' }} />
                  <span>Sản phẩm &amp; Thiết bị đã đặt</span>
                </h4>

                <div style={{ background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '13px', color: 'var(--text-primary)' }}>
                  {selectedOrder?.items_summary || 'Các thiết bị SmartBox, phiên bản và phụ kiện đi kèm theo hợp đồng giao dịch.'}
                </div>
              </div>
            </div>

            {/* Cột Phải: Dòng Thời Gian Xử Lý (Processing Timeline) */}
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={17} style={{ color: '#0ea5e9' }} />
                  <span>Tiến trình xử lý đơn hàng (Timeline)</span>
                </h4>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  {timeline?.events.length || 0} sự kiện
                </span>
              </div>

              {!timeline?.events.length ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Chưa có sự kiện xử lý nào được ghi nhận cho đơn hàng này.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0', position: 'relative' }}>
                  {/* Vertical connecting line */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '16px',
                      top: '12px',
                      bottom: '24px',
                      width: '2px',
                      background: 'var(--border-subtle)',
                      zIndex: 1
                    }}
                  />

                  {timeline.events.map((event, index) => {
                    const cfg = sourceConfigs[event.source] || { label: event.source, color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' };
                    const isLast = index === timeline.events.length - 1;

                    return (
                      <div
                        key={event.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '14px',
                          paddingBottom: isLast ? '0' : '22px',
                          position: 'relative',
                          zIndex: 2
                        }}
                      >
                        {/* Dot */}
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: isLast ? cfg.color : 'var(--bg-card)',
                            border: `2px solid ${cfg.color}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 0 0 3px var(--bg-card)'
                          }}
                        >
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: isLast ? '#fff' : cfg.color
                            }}
                          />
                        </div>

                        {/* Content */}
                        <div
                          style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '9px',
                            padding: '12px 14px',
                            flex: 1
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                color: cfg.color,
                                background: cfg.bg
                              }}
                            >
                              {cfg.label}
                            </span>
                            <time style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                              {new Date(event.occurredAt).toLocaleString('vi-VN')}
                            </time>
                          </div>

                          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginTop: 4 }}>
                            {event.action}
                          </div>

                          {event.reason && (
                            <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-card)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                              {event.reason}
                            </p>
                          )}

                          {event.attempt != null && (
                            <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                              Lần thực hiện: <strong>{event.attempt}</strong> · Phiên bản: <strong>{event.version}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        /* 4. When No Order is Selected: Render Order Selection Table */
        <div className="products-table-container">
          <table className="products-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Mã đơn hàng</th>
                <th style={{ width: '24%' }}>Khách hàng</th>
                <th style={{ width: '18%' }}>Tổng tiền (VNĐ)</th>
                <th style={{ width: '16%' }}>Trạng thái</th>
                <th style={{ width: '12%' }}>Ngày tạo</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loadingOrders ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                      <RefreshCw size={18} className="spin" />
                      <span>Đang tải danh sách đơn hàng…</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div className="products-empty">
                      <ShoppingBag size={36} style={{ color: 'var(--text-muted)' }} />
                      <p style={{ margin: '8px 0 0', fontWeight: 600 }}>Không tìm thấy đơn hàng nào</p>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Thử tìm với từ khóa khác hoặc kiểm tra lại kết nối
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const custName = ord.customer?.full_name || 'Khách hàng';
                  const phone = ord.customer?.phone || '';
                  const st = statusLabels[ord.status] || { label: ord.status, color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' };

                  return (
                    <tr key={ord.id}>
                      <td>
                        <strong style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-primary)' }}>
                          #{ord.id.slice(0, 8)}
                        </strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {ord.id}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                          {custName}
                        </div>
                        {phone && (
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            {phone}
                          </div>
                        )}
                      </td>

                      <td>
                        <strong style={{ color: 'var(--fpt-orange)', fontSize: '13.5px' }}>
                          {Number(ord.total || 0).toLocaleString('vi-VN')} ₫
                        </strong>
                      </td>

                      <td>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            color: st.color,
                            background: st.bg
                          }}
                        >
                          {st.label}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {new Date(ord.created_at).toLocaleDateString('vi-VN')}
                        </span>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-secondary-compact"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          onClick={() => handleSelectOrder(ord.id)}
                          title="Xem chi tiết và lịch sử xử lý đơn hàng"
                        >
                          <Eye size={13} />
                          <span>Chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceModalOpen && selectedOrderId && (
        <SalesInvoiceModal
          orderId={selectedOrderId}
          onClose={() => setInvoiceModalOpen(false)}
        />
      )}
    </div>
  );
};

export const OrderHistoryPreview: React.FC<{ orderId: string }> = ({ orderId }) => {
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    setLoading(true);
    adminRequest<Timeline>(`/orders/${encodeURIComponent(orderId)}/timeline`)
      .then((data) => {
        if (active) setTimeline(data);
      })
      .catch(() => {
        if (active) setTimeline(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  if (loading) {
    return (
      <div style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <RefreshCw size={14} className="spin" />
        <span>Đang tải tiến trình xử lý đơn hàng...</span>
      </div>
    );
  }

  if (!timeline || !timeline.events || timeline.events.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: 'var(--bg-input)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '10px',
        padding: '12px 16px',
        marginBottom: '16px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={14} color="var(--accent-primary)" />
          Tiến trình xử lý gần nhất ({timeline.events.length} mốc sự kiện)
        </span>
        <a
          href={`/orders/history?orderId=${encodeURIComponent(orderId)}`}
          style={{ fontSize: '0.75rem', color: 'var(--accent-sky)', textDecoration: 'none', fontWeight: 600 }}
        >
          Xem toàn bộ timeline →
        </a>
      </div>

      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {timeline.events.slice(-3).map((evt, idx) => (
          <div
            key={evt.id || idx}
            style={{
              flex: '1 0 160px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '8px 10px',
              fontSize: '0.75rem'
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {evt.action}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {new Date(evt.occurredAt).toLocaleString('vi-VN')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

