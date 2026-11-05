import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  ShoppingBag,
  Truck,
  Check,
  X,
  FileCheck,
  RotateCcw,
  Layers,
  DollarSign,
  Calendar,
  Sparkles,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Box
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../contexts/ToastContext';
import { adminRequest } from '../../services/adminRequest';
import { productsService } from '../../services/api';
import './po-dashboard.css';

interface PoSummary {
  from?: string;
  to?: string;
  managerName?: string;
  managerEmail?: string;
  totalProducts: number;
  totalVariants: number;
  totalStock: number;
  totalInventoryValue?: number;
  totalSold: number;
  totalRevenue: number;
  items?: Array<{
    productName: string;
    variantName: string;
    sku: string;
    categoryName: string;
    price: number;
    stockQuantity: number;
    soldQuantity: number;
    revenue: number;
  }>;
}

interface PendingTicket {
  id: string;
  order_id: string;
  status: string;
  review_round: number;
  reason?: string | null;
  created_at?: string;
  order_total?: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  item_count?: number;
  product_names?: string | null;
}

interface WaitingAcceptanceJob {
  id: string;
  orderId: string;
  orderCode?: string;
  status: string;
  customerName?: string;
  customerPhone?: string;
  technicianName?: string;
  shippingAddress?: string;
  scheduledAt?: string;
  completedAt?: string;
  completionPhotos?: string[];
  completionNote?: string;
}

interface StockMovement {
  id: string;
  delta: number;
  reason: string;
  created_at: string;
  productName?: string;
  variantName?: string;
  sku?: string;
  actorName?: string;
}

const formatVnd = (amount?: number | null) => {
  if (amount == null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatTimeAgo = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
  } catch {
    return dateStr;
  }
};

export const PoDashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<PoSummary | null>(null);
  const [pendingTickets, setPendingTickets] = useState<PendingTicket[]>([]);
  const [waitingJobs, setWaitingJobs] = useState<WaitingAcceptanceJob[]>([]);
  const [lowStockVariants, setLowStockVariants] = useState<any[]>([]);
  const [recentMovements, setRecentMovements] = useState<StockMovement[]>([]);
  const [actionQueueTab, setActionQueueTab] = useState<'TICKETS' | 'ACCEPTANCE'>('TICKETS');

  const loadDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      // 1. Fetch PO catalog summary
      const summaryPromise = adminRequest<PoSummary>('/reports/po/summary?type=INVENTORY')
        .catch(() => null);

      // 2. Fetch Tickets waiting for PO review
      const ticketsPromise = adminRequest<PendingTicket[]>('/tickets?size=15')
        .then((res) => (Array.isArray(res) ? res.filter((t) => t.status === 'PENDING') : []))
        .catch(() => []);

      // 3. Fetch Deliveries waiting for PO acceptance review
      const jobsPromise = adminRequest<WaitingAcceptanceJob[]>('/delivery-installations?status=WAITING_PO_CONFIRMATION&size=15')
        .then((res) => (Array.isArray(res) ? res : []))
        .catch(() => []);

      // 4. Fetch Products to evaluate stock thresholds
      const productsPromise = productsService.getProductsPaged({ size: 100 })
        .then((res) => res?.content || [])
        .catch(() => []);

      // 5. Fetch Recent Inventory Movements
      const movementsPromise = productsService.getStockTransactionsPaged(0, 6)
        .then((res) => res?.content || [])
        .catch(() => []);

      const [sumData, tickData, jobData, prods, moves] = await Promise.all([
        summaryPromise,
        ticketsPromise,
        jobsPromise,
        productsPromise,
        movementsPromise
      ]);

      if (sumData) setSummary(sumData);
      setPendingTickets(tickData);
      setWaitingJobs(jobData);
      setRecentMovements(moves);

      // Extract low stock variants (< 5)
      const lowList: any[] = [];
      prods.forEach((p: any) => {
        if (p.variants && p.variants.length > 0) {
          p.variants.forEach((v: any) => {
            if ((v.stockQuantity ?? 0) <= 5) {
              lowList.push({
                productName: p.name,
                variantName: v.variantName,
                sku: v.sku,
                stock: v.stockQuantity ?? 0
              });
            }
          });
        } else if ((p.stockQuantity ?? 0) <= 5) {
          lowList.push({
            productName: p.name,
            variantName: 'Mặc định',
            sku: p.sku,
            stock: p.stockQuantity ?? 0
          });
        }
      });
      setLowStockVariants(lowList.sort((a, b) => a.stock - b.stock));

    } catch (e: any) {
      toast.error(e?.message || 'Không thể cập nhật dữ liệu tổng quan PO');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboardData(false);
  }, [loadDashboardData]);

  // Total SKU count
  const totalSkuCount = useMemo(() => {
    if (summary?.totalVariants) return summary.totalVariants;
    if (summary?.items) return summary.items.length;
    return 0;
  }, [summary]);

  // Top 5 Best-Selling Items for this PO
  const topSellingItems = useMemo(() => {
    if (!summary?.items) return [];
    return [...summary.items]
      .filter((i) => i.soldQuantity > 0)
      .sort((a, b) => b.soldQuantity - a.soldQuantity)
      .slice(0, 5);
  }, [summary?.items]);

  const maxSold = useMemo(() => {
    if (!topSellingItems.length) return 1;
    return Math.max(...topSellingItems.map((i) => i.soldQuantity), 1);
  }, [topSellingItems]);

  return (
    <div className="po-dashboard-wrap">
      {/* 1. Header Bar */}
      <header className="po-dash-header">
        <div className="po-dash-header-title">
          <div className="po-dash-badge-row">
            <span className="po-role-tag">
              <Box size={13} />
              <span>Quản lý Kho & Thẩm định Đơn</span>
            </span>
            <span className="po-user-greeting">
              {profile?.full_name || 'Nhân viên bán hàng'}
            </span>
          </div>
          <h1>Tổng Quan Hàng Hóa & Thẩm Định</h1>
          <p>
            Giám sát số lượng xuất nhập tồn, thẩm định đơn hàng mới và phê duyệt nghiệm thu lắp đặt.
          </p>
        </div>

        <div className="po-dash-header-actions">
          <button
            type="button"
            className="po-dash-btn-refresh"
            onClick={() => void loadDashboardData(true)}
            disabled={loading || refreshing}
            title="Làm mới số liệu"
          >
            <RefreshCw size={15} className={refreshing ? 'spinning' : ''} />
            <span>{refreshing ? 'Đang đồng bộ…' : 'Làm mới'}</span>
          </button>

          <Link to="/po/approvals" className="po-dash-btn-primary">
            <FileCheck size={16} />
            <span>Xem vé thẩm định</span>
          </Link>
        </div>
      </header>

      {/* 2. Bento Grid 4 KPI Cards */}
      <section className="po-kpi-grid">
        {/* KPI 1: Đơn chờ PO thẩm định */}
        <div className="po-kpi-card amber">
          <div className="po-kpi-top">
            <span className="po-kpi-label">Đơn chờ PO thẩm định</span>
            <div className="po-kpi-icon amber">
              <Clock size={18} />
            </div>
          </div>
          <div className="po-kpi-val">
            {loading ? '—' : pendingTickets.length}
            <span className="po-kpi-unit">đơn hàng</span>
          </div>
          <div className="po-kpi-footer">
            <span className="po-kpi-sub">
              {pendingTickets.length > 0 ? 'Cần xử lý phê duyệt' : 'Đã duyệt hết vé'}
            </span>
            <Link to="/po/approvals" className="po-kpi-action-link amber">
              Xét duyệt ngay →
            </Link>
          </div>
        </div>

        {/* KPI 2: Phiếu nghiệm thu chờ duyệt */}
        <div className="po-kpi-card blue">
          <div className="po-kpi-top">
            <span className="po-kpi-label">Nghiệm thu chờ xác nhận</span>
            <div className="po-kpi-icon blue">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="po-kpi-val">
            {loading ? '—' : waitingJobs.length}
            <span className="po-kpi-unit">phiếu giao lắp</span>
          </div>
          <div className="po-kpi-footer">
            <span className="po-kpi-sub">KTV đã nộp ảnh minh chứng</span>
            <Link to="/po/delivery" className="po-kpi-action-link blue">
              Duyệt nghiệm thu →
            </Link>
          </div>
        </div>

        {/* KPI 3: Cảnh báo tồn kho SKU */}
        <div className="po-kpi-card red">
          <div className="po-kpi-top">
            <span className="po-kpi-label">Cảnh báo tồn kho</span>
            <div className="po-kpi-icon red">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="po-kpi-val">
            {loading ? '—' : lowStockVariants.length}
            <span className="po-kpi-unit">SKU sắp hết</span>
          </div>
          <div className="po-kpi-footer">
            <span className="po-kpi-sub">Định mức an toàn: ≤ 5 cái</span>
            <Link to="/po/products" className="po-kpi-action-link red">
              Kiểm tra kho →
            </Link>
          </div>
        </div>

        {/* KPI 4: Tổng giá trị hàng hóa trong kho */}
        <div className="po-kpi-card emerald">
          <div className="po-kpi-top">
            <span className="po-kpi-label">Giá trị kho phụ trách</span>
            <div className="po-kpi-icon emerald">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="po-kpi-val emerald-text">
            {loading ? '—' : formatVnd(summary?.totalInventoryValue ?? 0)}
          </div>
          <div className="po-kpi-footer">
            <span className="po-kpi-sub">
              {summary?.totalStock ?? 0} thiết bị · {totalSkuCount} mã SKU
            </span>
            <Link to="/po/reports" className="po-kpi-action-link emerald">
              Báo cáo hàng →
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Operational Main Workspace (2-Column Balanced Grid) */}
      <section className="po-dash-workspace">
        {/* Left Column: Urgent Action Queue (Tickets / Acceptance) */}
        <div className="po-panel po-action-queue">
          <div className="po-panel-header">
            <div className="po-queue-tabs">
              <button
                type="button"
                className={`po-queue-tab ${actionQueueTab === 'TICKETS' ? 'active' : ''}`}
                onClick={() => setActionQueueTab('TICKETS')}
              >
                <Clock size={15} />
                <span>Vé thẩm định đơn hàng</span>
                <span className="po-tab-count">{pendingTickets.length}</span>
              </button>

              <button
                type="button"
                className={`po-queue-tab ${actionQueueTab === 'ACCEPTANCE' ? 'active' : ''}`}
                onClick={() => setActionQueueTab('ACCEPTANCE')}
              >
                <CheckCircle2 size={15} />
                <span>Nghiệm thu chờ duyệt</span>
                <span className="po-tab-count">{waitingJobs.length}</span>
              </button>
            </div>

            <Link
              to={actionQueueTab === 'TICKETS' ? '/po/approvals' : '/po/delivery'}
              className="po-panel-link"
            >
              <span>Xem tất cả</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="po-queue-content">
            {/* Tab 1: PENDING TICKETS */}
            {actionQueueTab === 'TICKETS' && (
              <>
                {loading ? (
                  <div className="po-empty-state">
                    <RefreshCw size={22} className="spinning" />
                    <p>Đang tải hàng đợi thẩm định…</p>
                  </div>
                ) : pendingTickets.length === 0 ? (
                  <div className="po-empty-state">
                    <CheckCircle2 size={32} style={{ color: '#10b981' }} />
                    <p>Tuyệt vời! Hiện không có đơn hàng nào chờ bạn duyệt.</p>
                    <span>Các đơn hàng mới của khách sẽ xuất hiện ngay tại đây.</span>
                  </div>
                ) : (
                  <div className="po-ticket-list">
                    {pendingTickets.slice(0, 5).map((tk) => {
                      const shortCode = (tk.order_id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
                      return (
                        <div key={tk.id} className="po-ticket-card">
                          <div className="po-tc-header">
                            <div className="po-tc-code-row">
                              <span className="po-sku-pill">#{shortCode}</span>
                              <span className="po-tc-time">{formatTimeAgo(tk.created_at)}</span>
                            </div>
                            <span className="po-badge-pill amber">Chờ PO duyệt</span>
                          </div>

                          <div className="po-tc-body">
                            <div className="po-tc-cust">
                              👤 <b>{tk.customer_name || 'Khách vãng lai'}</b>
                              {tk.customer_phone && <span className="po-tc-phone"> · {tk.customer_phone}</span>}
                            </div>
                            <div className="po-tc-prods">
                              📦 {tk.product_names || `${tk.item_count || 1} sản phẩm SmartBox`}
                            </div>
                          </div>

                          <div className="po-tc-footer">
                            <div className="po-tc-total">
                              Tổng tiền: <b>{formatVnd(tk.order_total)}</b>
                            </div>
                            <Link
                              to={`/po/approvals/${tk.id}`}
                              className="po-tc-btn-review"
                            >
                              <span>Thẩm định ngay</span>
                              <ChevronRight size={14} />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Tab 2: WAITING ACCEPTANCE JOBS */}
            {actionQueueTab === 'ACCEPTANCE' && (
              <>
                {loading ? (
                  <div className="po-empty-state">
                    <RefreshCw size={22} className="spinning" />
                    <p>Đang tải danh sách nghiệm thu…</p>
                  </div>
                ) : waitingJobs.length === 0 ? (
                  <div className="po-empty-state">
                    <CheckCircle2 size={32} style={{ color: '#10b981' }} />
                    <p>Không có biên bản nghiệm thu nào cần xác nhận.</p>
                    <span>Khi KTV hoàn thành thi công tại nhà khách, hồ sơ sẽ gửi lên đây.</span>
                  </div>
                ) : (
                  <div className="po-ticket-list">
                    {waitingJobs.slice(0, 5).map((job) => {
                      const shortCode = (job.orderId || '').replace(/-/g, '').slice(0, 8).toUpperCase();
                      return (
                        <div key={job.id} className="po-ticket-card">
                          <div className="po-tc-header">
                            <div className="po-tc-code-row">
                              <span className="po-sku-pill">#{shortCode}</span>
                              <span className="po-tc-time">KTV nộp: {formatTimeAgo(job.completedAt)}</span>
                            </div>
                            <span className="po-badge-pill blue">Đã nộp ảnh nghiệm thu</span>
                          </div>

                          <div className="po-tc-body">
                            <div className="po-tc-cust">
                              👤 <b>{job.customerName || 'Khách hàng'}</b> · 📍 {job.shippingAddress || 'Địa chỉ tiêu chuẩn'}
                            </div>
                            <div className="po-tc-prods">
                              🔧 Kỹ thuật viên thi công: <b>{job.technicianName || 'Đội KTV'}</b>
                            </div>
                            {job.completionNote && (
                              <div className="po-tc-note">
                                💬 <i>"{job.completionNote}"</i>
                              </div>
                            )}
                          </div>

                          <div className="po-tc-footer">
                            <div className="po-tc-photos-pill">
                              📷 Có {job.completionPhotos?.length || 1} ảnh minh chứng
                            </div>
                            <Link
                              to={`/po/delivery/${job.id}`}
                              className="po-tc-btn-review"
                            >
                              <span>Duyệt nghiệm thu</span>
                              <ChevronRight size={14} />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Column: Inventory Watchlist & Best Sellers */}
        <div className="po-side-stack">
          {/* Low Stock Alerts */}
          <div className="po-panel">
            <div className="po-panel-header">
              <h3 className="po-panel-title">
                <AlertTriangle size={17} style={{ color: '#ef4444' }} />
                <span>Cảnh báo tồn kho an toàn</span>
              </h3>
              <Link to="/po/products" className="po-panel-link">
                <span>Nhập kho</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>

            {lowStockVariants.length === 0 ? (
              <div className="po-stock-safe-banner">
                <CheckCircle2 size={18} style={{ color: '#10b981' }} />
                <span>Tất cả biến thể thuộc danh mục của bạn đều còn đủ tồn kho an toàn.</span>
              </div>
            ) : (
              <div className="po-low-stock-list">
                {lowStockVariants.slice(0, 5).map((item, idx) => {
                  const isOut = item.stock === 0;
                  return (
                    <div key={idx} className="po-low-stock-row">
                      <div className="po-ls-left">
                        <div className="po-ls-name">{item.productName}</div>
                        <div className="po-ls-sub">
                          <span>{item.variantName}</span>
                          <span className="po-sku-pill">{item.sku}</span>
                        </div>
                      </div>
                      <div className="po-ls-right">
                        <span className={`po-stock-tag ${isOut ? 'critical' : 'warning'}`}>
                          {isOut ? 'Hết hàng (0)' : `Còn ${item.stock} cái`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top 5 Best Sellers */}
          <div className="po-panel">
            <div className="po-panel-header">
              <h3 className="po-panel-title">
                <TrendingUp size={17} style={{ color: '#f59e0b' }} />
                <span>Top sản phẩm bán chạy nhất</span>
              </h3>
              <Link to="/po/reports" className="po-panel-link">
                <span>Báo cáo chi tiết</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>

            {topSellingItems.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Chưa có dữ liệu tiêu thụ hàng hóa trong kỳ.
              </div>
            ) : (
              <div className="po-top-sellers-list">
                {topSellingItems.map((item, index) => {
                  const pct = Math.max(12, Math.round((item.soldQuantity / maxSold) * 100));
                  return (
                    <div key={index} className="po-ts-row">
                      <div className="po-ts-badge">#{index + 1}</div>
                      <div className="po-ts-info">
                        <div className="po-ts-name">
                          {item.productName} · {item.variantName}
                        </div>
                        <div className="po-ts-bar-wrap">
                          <div className="po-ts-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="po-ts-count">
                        <b>{item.soldQuantity}</b> cái
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Bottom Row: Recent Stock Movements Audit */}
      <section className="po-panel">
        <div className="po-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={17} style={{ color: 'var(--apple-blue, #007aff)' }} />
            <h3 className="po-panel-title" style={{ margin: 0 }}>
              Biến Động Xuất Nhập Kho Gần Đây
            </h3>
          </div>
          <Link to="/po/products" className="po-panel-link">
            <span>Sản phẩm & Kho hàng</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

        {recentMovements.length === 0 ? (
          <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Chưa có ghi nhận biến động xuất nhập kho nào.
          </div>
        ) : (
          <div className="po-movements-table-wrap">
            <table className="po-clean-table">
              <thead>
                <tr>
                  <th style={{ width: '16%' }}>Thời gian</th>
                  <th style={{ width: '28%' }}>Mặt hàng / Biến thể</th>
                  <th style={{ width: '16%' }}>Mã SKU</th>
                  <th style={{ width: '14%' }}>Biến động</th>
                  <th>Lý do nghiệp vụ</th>
                </tr>
              </thead>
              <tbody>
                {recentMovements.map((move) => {
                  const isPositive = move.delta > 0;
                  return (
                    <tr key={move.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {formatTimeAgo(move.created_at)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                          {move.productName || 'Anchor Box SmartBox'}
                        </div>
                        {move.variantName && (
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                            {move.variantName}
                          </div>
                        )}
                      </td>
                      <td>
                        <code className="po-sku-pill">{move.sku || 'N/A'}</code>
                      </td>
                      <td>
                        <span className={`po-delta-badge ${isPositive ? 'in' : 'out'}`}>
                          {isPositive ? `+${move.delta}` : move.delta} cái
                        </span>
                      </td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                        {move.reason || 'Điều chỉnh kho hàng'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
