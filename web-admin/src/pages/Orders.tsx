import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Eye,
  Truck,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  CreditCard,
  Banknote,
  Receipt,
  FileSpreadsheet,
  X,
  AlertCircle,
  PackageCheck,
  Package,
  MapPin,
  Check,
  RefreshCw
} from 'lucide-react';
import { Order, OrderStatus } from '../types/database';
import { ordersService, ExtendedOrder } from '../services/api';

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<ExtendedOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    const data = await ordersService.getOrders();
    setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Financial totals for accountant
  const paidRevenue = orders
    .filter(o => o.payment_status === 'paid')
    .reduce((acc, o) => acc + Number(o.total || 0), 0);

  const pendingRevenue = orders
    .filter(o => o.payment_status === 'pending')
    .reduce((acc, o) => acc + Number(o.total || 0), 0);

  const completedCount = orders.filter(o => o.status === 'completed').length;

  const handleExportExcel = () => {
    alert('Đã xuất file đối soát tài chính: "BaoCao_DoiSoat_DoanhThu_2026-03.xlsx" thành công!');
  };

  const handleConfirmPayment = async (orderId: string) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, payment_status: 'paid', status: 'completed' } : o));
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, payment_status: 'paid', status: 'completed' });
    }
    await ordersService.updateOrderStatus(orderId, 'completed');
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
    await ordersService.updateOrderStatus(orderId, newStatus);
  };

  const filteredOrders = orders.filter(ord => {
    const matchesSearch =
      ord.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.customer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.customer?.phone?.includes(searchTerm) ||
      ord.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.transaction_ref?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPayment =
      paymentFilter === 'all' ||
      (paymentFilter === 'paid' && ord.payment_status === 'paid') ||
      (paymentFilter === 'pending' && ord.payment_status === 'pending') ||
      (paymentFilter === 'vnpay' && ord.payment_method === 'vnpay') ||
      (paymentFilter === 'cod' && ord.payment_method === 'cod');

    const matchesStatus = statusFilter === 'all' || ord.status === statusFilter;

    return matchesSearch && matchesPayment && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="section-header">
        <div className="section-title-group">
          <div className="section-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)' }}>
            <ShoppingBag size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Quản Lý Đơn Hàng
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
              Theo dõi đơn hàng, cổng thanh toán và trạng thái giao vận.
            </p>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileSpreadsheet size={16} color="var(--accent-emerald)" />
          <span>Xuất Báo Cáo</span>
        </button>
      </div>

      {/* Financial KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="kpi-card accent-emerald" style={{ animationDelay: '0ms' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Đã Thanh Toán
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '4px' }}>
            {paidRevenue.toLocaleString('vi-VN')} ₫
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Qua ngân hàng / ví điện tử
          </div>
          <div className="progress-bar-track" style={{ marginTop: '10px' }}>
            <div className="progress-bar-fill emerald" style={{ width: `${(paidRevenue / (paidRevenue + pendingRevenue || 1)) * 100}%` }} />
          </div>
        </div>

        <div className="kpi-card accent-amber" style={{ animationDelay: '80ms' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Chờ Thu Hộ (COD)
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '4px' }}>
            {pendingRevenue.toLocaleString('vi-VN')} ₫
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Đang trong luồng giao hàng
          </div>
        </div>

        <div className="kpi-card" style={{ animationDelay: '160ms' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Giao Thành Công
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '4px' }}>
            {completedCount} <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ {orders.length} đơn</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Đã bàn giao khách hàng
          </div>
        </div>

        <div className="kpi-card accent-sky" style={{ animationDelay: '240ms' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Tỷ Lệ Hoàn Tất
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {orders.length ? Math.round((completedCount / orders.length) * 100) : 100}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', marginTop: '2px' }}>
            Khớp đối soát tài chính
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '38px', margin: 0 }}
              placeholder="Tìm theo mã đơn, khách hàng, số điện thoại, vận đơn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            className="input-field"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8125rem', margin: 0 }}
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="all">Tất cả thanh toán</option>
            <option value="paid">Đã thanh toán</option>
            <option value="pending">Chờ thu tiền (COD)</option>
            <option value="vnpay">Cổng VNPAY</option>
            <option value="cod">Tiền mặt (COD)</option>
          </select>

          {[
            { id: 'all', label: 'Tất cả trạng thái' },
            { id: 'processing', label: 'Chuẩn bị hàng' },
            { id: 'shipping', label: 'Đang giao' },
            { id: 'completed', label: 'Hoàn tất' }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`btn ${statusFilter === st.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="card card-animated" style={{ padding: 0, overflow: 'hidden', animationDelay: '200ms' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-enhanced">
            <thead>
              <tr>
                <th>MÃ ĐƠN & THỜI GIAN</th>
                <th>KHÁCH HÀNG & ĐỊA CHỈ</th>
                <th>THANH TOÁN & ĐỐI SOÁT</th>
                <th>TỔNG TIỀN</th>
                <th>VẬN CHUYỂN</th>
                <th>TRẠNG THÁI</th>
                <th style={{ textAlign: 'right' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((ord) => (
                <tr key={ord.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                      {ord.id}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Clock size={12} />
                      <span>{ord.created_at}</span>
                    </div>
                  </td>

                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ord.customer?.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ord.customer?.phone}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                      {ord.shipping_address}
                    </div>
                  </td>

                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      {ord.payment_method === 'vnpay' && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(37, 99, 235, 0.12)',
                          color: '#38bdf8',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          <CreditCard size={12} />
                          VNPAY QR
                        </span>
                      )}
                      {ord.payment_method === 'cod' && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(245, 158, 11, 0.12)',
                          color: '#f59e0b',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          <Banknote size={12} />
                          COD (Tiền mặt)
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.72rem' }}>
                      {ord.payment_status === 'paid' ? (
                        <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>✓ Đã Quyết Toán</span>
                      ) : (
                        <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>⏳ Chờ Shipper Thu Tiền</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Ref: {ord.transaction_ref}
                    </div>
                  </td>

                  <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--accent-emerald)', fontSize: '1rem' }}>
                    {ord.total.toLocaleString('vi-VN')} ₫
                  </td>

                  <td style={{ padding: '14px 18px' }}>
                    {ord.tracking_number ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-sky)', fontSize: '0.8125rem' }}>
                        <Truck size={14} />
                        <span>{ord.tracking_number}</span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Chưa xuất mã</span>
                    )}
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {ord.items_summary}
                    </div>
                  </td>

                  <td style={{ padding: '14px 18px' }}>
                    {ord.status === 'processing' && (
                      <span className="badge badge-warning" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                        Đang chuẩn bị
                      </span>
                    )}
                    {ord.status === 'shipping' && (
                      <span className="badge badge-role" style={{ background: 'rgba(37, 99, 235, 0.15)', color: '#38bdf8' }}>
                        Đang giao hàng
                      </span>
                    )}
                    {ord.status === 'completed' && (
                      <span className="badge badge-success" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                        Hoàn tất
                      </span>
                    )}
                  </td>

                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      onClick={() => {
                        setSelectedOrder(ord);
                        setIsDetailModalOpen(true);
                      }}
                    >
                      <Eye size={13} />
                      <span>Chi tiết & Đối soát</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Chi Tiết & Đối Soát Tài Chính */}
      {isDetailModalOpen && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '620px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Receipt size={20} color="var(--accent-primary)" />
                  Hóa Đơn & Đối Soát Giao Dịch
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Mã đơn: <strong style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>{selectedOrder.id}</strong> • Thời gian: {selectedOrder.created_at}
                </p>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: '6px', borderRadius: '50%' }}
                onClick={() => setIsDetailModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            {/* SHIPPING TIMELINE */}
            {(() => {
              const statusSteps = ['processing', 'shipping', 'completed'];
              const currentIdx = statusSteps.indexOf(selectedOrder.status);
              const steps = [
                { label: 'Đặt hàng', icon: <ShoppingBag size={12} />, time: selectedOrder.created_at },
                { label: 'Chuẩn bị hàng', icon: <Package size={12} />, time: currentIdx >= 0 ? selectedOrder.created_at : '' },
                { label: 'Đang giao', icon: <Truck size={12} />, time: currentIdx >= 1 ? selectedOrder.updated_at : '' },
                { label: 'Hoàn tất', icon: <CheckCircle2 size={12} />, time: currentIdx >= 2 ? selectedOrder.updated_at : '' },
              ];
              const progressWidth = currentIdx >= 0 ? `${((currentIdx + 1) / (steps.length - 1)) * 100}%` : '0%';

              return (
                <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Tiến trình vận chuyển đơn hàng
                  </div>
                  <div className="timeline">
                    <div className="timeline-progress" style={{ width: progressWidth }} />
                    {steps.map((step, idx) => {
                      let stepClass = '';
                      if (idx <= currentIdx) stepClass = 'completed';
                      else if (idx === currentIdx + 1) stepClass = 'active';

                      return (
                        <div key={idx} className={`timeline-step ${stepClass}`}>
                          <div className="timeline-dot">
                            {stepClass === 'completed' ? <Check size={13} /> : step.icon}
                          </div>
                          <div className="timeline-label">{step.label}</div>
                          {step.time && <div className="timeline-time">{step.time}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Customer & Shipping Summary */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              fontSize: '0.8125rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>Khách hàng:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{selectedOrder.customer?.full_name}</strong>
                <div style={{ color: 'var(--text-secondary)' }}>{selectedOrder.customer?.phone}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>Địa chỉ nhận:</span>
                <div style={{ color: 'var(--text-secondary)' }}>{selectedOrder.shipping_address}</div>
              </div>
            </div>

            {/* Items and Financial Breakdown */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '8px' }}>Chi tiết giỏ hàng:</div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.8125rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>{selectedOrder.items_summary}</span>
                <strong style={{ color: 'var(--accent-sky)' }}>{selectedOrder.total.toLocaleString('vi-VN')} ₫</strong>
              </div>
            </div>

            {/* Payment & Gateway details */}
            <div style={{
              background: 'rgba(37, 99, 235, 0.06)',
              border: '1px dashed rgba(37, 99, 235, 0.3)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '0.8125rem'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '6px' }}>
                Thông tin đối soát kế toán:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Cổng thanh toán: </span>
                  <strong>{selectedOrder.payment_method.toUpperCase()}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Mã tham chiếu: </span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedOrder.transaction_ref}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Mã vận đơn: </span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedOrder.tracking_number}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Trạng thái tiền: </span>
                  <strong style={{ color: selectedOrder.payment_status === 'paid' ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                    {selectedOrder.payment_status === 'paid' ? 'Đã Quyết Toán Xong' : 'Chờ Thu Tiền Mặt'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Actions for Accountant */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => alert('Đã tạo và tải về Hóa đơn Giá trị gia tăng điện tử (VAT e-Invoice)!')}
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Download size={15} />
                <span>In Hóa Đơn VAT</span>
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                {selectedOrder.payment_status === 'pending' && (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleConfirmPayment(selectedOrder.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <PackageCheck size={16} />
                    <span>Xác Nhận Đã Thu Tiền</span>
                  </button>
                )}
                <button className="btn btn-secondary" onClick={() => setIsDetailModalOpen(false)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
