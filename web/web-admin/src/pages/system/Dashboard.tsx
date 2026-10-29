import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShoppingBag,
  Truck,
  AlertTriangle,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
  Package,
  Activity,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminNotifications, noticeStatusLabel } from '../../contexts/AdminNotificationsContext';
import { InstallationBacklog } from '../../components/InstallationBacklog';
import { getConcurrentDashboard, type ConcurrentDashboard } from '../../services/concurrentDashboardApi';
import { deliveryApi, DailyTask } from '../../services/deliveryInstallation';

interface StatusConfig {
  label: string;
  color: string;
  filterKey: string;
}

const statusConfigs: Record<string, StatusConfig> = {
  PENDING: { label: 'Chờ xử lý', color: '#f59e0b', filterKey: 'pending' },
  AWAITING_PAYMENT: { label: 'Chờ thanh toán', color: '#3b82f6', filterKey: 'awaiting_payment' },
  PAID: { label: 'Đã thanh toán', color: '#10b981', filterKey: 'paid' },
  CONFIRMED: { label: 'Đã duyệt', color: '#6366f1', filterKey: 'confirmed' },
  COMPLETED: { label: 'Hoàn tất', color: '#0ea5e9', filterKey: 'completed' },
  CANCELLED: { label: 'Đã hủy', color: '#ef4444', filterKey: 'cancelled' },
};

const money = (value: number) => Number(value).toLocaleString('vi-VN') + ' ₫';
const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const ActivityFeed: React.FC = () => {
  const feed = useAdminNotifications();
  return (
    <div className="fpt-panel">
      <div className="fpt-panel-header">
        <h3 className="fpt-panel-title">
          <Clock size={17} style={{ color: 'var(--fpt-blue)' }} />
          <span>Hoạt động gần đây</span>
        </h3>
        {feed.events.length > 0 && (
          <button
            onClick={feed.markRead}
            className="fpt-btn fpt-btn-secondary"
            style={{ padding: '4px 8px', fontSize: 11 }}
          >
            Đã đọc
          </button>
        )}
      </div>

      {feed.error && <p role="alert" style={{ color: 'var(--fpt-rose)', fontSize: 12 }}>{feed.error}</p>}
      {!feed.events.length && !feed.error && (
        <p style={{ color: 'var(--text-muted)', fontSize: 12, padding: '16px 0', textAlign: 'center' }}>
          Chưa có hoạt động mới.
        </p>
      )}

      <div className="fpt-feed-list">
        {feed.events.map((e) => (
          <Link key={e.id} to={e.link} className="fpt-feed-item">
            <span className="fpt-feed-dot" />
            <div className="fpt-feed-content">
              <span className="fpt-feed-title">{e.title}</span>
              <div className="fpt-feed-meta">
                <span className="fpt-sku-pill">{e.referenceId.slice(0, 8)}</span>
                <span>{noticeStatusLabel(e)}</span>
                <span className="fpt-feed-time">
                  {new Date(e.occurredAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

interface RevenueTrendPoint {
  date: string;
  revenue: number;
  orders: number;
}

function getIsoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getIsoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

const RevenueLineChart: React.FC<{
  currentDate: string;
  dailyData?: RevenueTrendPoint[] | null;
  weeklyData?: RevenueTrendPoint[] | null;
  monthlyData?: RevenueTrendPoint[] | null;
  loading?: boolean;
}> = ({ currentDate, dailyData, weeklyData, monthlyData, loading }) => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const { points, totalLabel, avgLabel, periodTitle } = useMemo(() => {
    const list: { key: string; label: string; fullTitle: string; revenue: number; orders: number }[] = [];
    const baseDate = new Date(currentDate);
    const validBase = !isNaN(baseDate.getTime()) ? baseDate : new Date();

    if (period === 'day') {
      const dataMap = new Map<string, { revenue: number; orders: number }>();
      if (dailyData) {
        dailyData.forEach((item) => {
          dataMap.set(item.date, {
            revenue: Number(item.revenue) || 0,
            orders: Number(item.orders) || 0,
          });
        });
      }
      for (let i = 6; i >= 0; i--) {
        const d = new Date(validBase);
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().split('T')[0];
        const dayLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        const entry = dataMap.get(iso) || { revenue: 0, orders: 0 };
        list.push({
          key: iso,
          label: dayLabel,
          fullTitle: `Ngày ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`,
          revenue: entry.revenue,
          orders: entry.orders,
        });
      }
      return {
        points: list,
        totalLabel: 'Tổng 7 ngày',
        avgLabel: 'TB/ngày',
        periodTitle: '7 ngày qua',
      };
    } else if (period === 'week') {
      const dataMap = new Map<string, { revenue: number; orders: number }>();
      if (weeklyData) {
        weeklyData.forEach((item) => {
          dataMap.set(item.date, {
            revenue: Number(item.revenue) || 0,
            orders: Number(item.orders) || 0,
          });
        });
      }
      for (let i = 3; i >= 0; i--) {
        const d = new Date(validBase);
        d.setDate(d.getDate() - i * 7);
        const weekKey = getIsoWeek(d);
        const weekNo = getIsoWeekNumber(d);
        const entry = dataMap.get(weekKey) || { revenue: 0, orders: 0 };
        list.push({
          key: weekKey,
          label: `Tuần ${weekNo}`,
          fullTitle: `Tuần ${weekNo} (${weekKey})`,
          revenue: entry.revenue,
          orders: entry.orders,
        });
      }
      return {
        points: list,
        totalLabel: 'Tổng 4 tuần',
        avgLabel: 'TB/tuần',
        periodTitle: '4 tuần qua',
      };
    } else {
      // Month (6 months)
      const dataMap = new Map<string, { revenue: number; orders: number }>();
      if (monthlyData) {
        monthlyData.forEach((item) => {
          dataMap.set(item.date, {
            revenue: Number(item.revenue) || 0,
            orders: Number(item.orders) || 0,
          });
        });
      }
      for (let i = 5; i >= 0; i--) {
        const m = new Date(validBase.getFullYear(), validBase.getMonth() - i, 1);
        const key = `${String(m.getMonth() + 1).padStart(2, '0')}/${m.getFullYear()}`;
        const entry = dataMap.get(key) || { revenue: 0, orders: 0 };
        list.push({
          key: key,
          label: `T${m.getMonth() + 1}`,
          fullTitle: `Tháng ${m.getMonth() + 1}/${m.getFullYear()}`,
          revenue: entry.revenue,
          orders: entry.orders,
        });
      }
      return {
        points: list,
        totalLabel: 'Tổng 6 tháng',
        avgLabel: 'TB/tháng',
        periodTitle: '6 tháng qua',
      };
    }
  }, [currentDate, period, dailyData, weeklyData, monthlyData]);

  const totalRevenue = useMemo(() => points.reduce((sum, p) => sum + p.revenue, 0), [points]);
  const maxRevenue = useMemo(() => Math.max(...points.map((p) => p.revenue), 10000000), [points]);
  const avgRevenue = useMemo(() => Math.round(totalRevenue / (points.length || 1)), [totalRevenue, points]);

  // SVG Chart Dimensions - compact size to fit in card
  const svgWidth = 460;
  const svgHeight = 175;
  const padLeft = 46;
  const padRight = 18;
  const padTop = 16;
  const padBottom = 26;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const chartCoords = points.map((p, idx) => {
    const x = padLeft + (idx / Math.max(points.length - 1, 1)) * plotWidth;
    const y = padTop + plotHeight - (p.revenue / maxRevenue) * plotHeight;
    return { ...p, x, y };
  });

  // Smooth SVG cubic Bezier curve path
  const curvePath = useMemo(() => {
    if (chartCoords.length === 0) return '';
    if (chartCoords.length === 1) return `M ${chartCoords[0].x} ${chartCoords[0].y}`;

    let path = `M ${chartCoords[0].x} ${chartCoords[0].y}`;
    for (let i = 0; i < chartCoords.length - 1; i++) {
      const curr = chartCoords[i];
      const next = chartCoords[i + 1];
      const cp1x = curr.x + (next.x - curr.x) / 2;
      const cp1y = curr.y;
      const cp2x = curr.x + (next.x - curr.x) / 2;
      const cp2y = next.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }
    return path;
  }, [chartCoords]);

  const areaPath = useMemo(() => {
    if (!curvePath || chartCoords.length === 0) return '';
    const last = chartCoords[chartCoords.length - 1];
    const first = chartCoords[0];
    const baselineY = padTop + plotHeight;
    return `${curvePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
  }, [curvePath, chartCoords, padTop, plotHeight]);

  const yTicks = [
    { value: maxRevenue, y: padTop },
    { value: maxRevenue * 0.5, y: padTop + plotHeight * 0.5 },
    { value: 0, y: padTop + plotHeight }
  ];

  return (
    <div className="fpt-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        {/* Header with Title & Period Selector Tabs */}
        <div className="fpt-panel-header" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div className="fpt-icon-bubble orange" style={{ width: 32, height: 32 }}>
              <TrendingUp size={16} />
            </div>
            <div>
              <h3 className="fpt-panel-title" style={{ fontSize: 15 }}>
                Doanh thu {periodTitle}
              </h3>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Dòng tiền thực thu từ đơn hàng
              </span>
            </div>
          </div>

          {/* Segmented Pill Tabs: Ngày | Tuần | Tháng */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--bg-canvas, #f1f5f9)',
              padding: '2px',
              borderRadius: '7px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {(['day', 'week', 'month'] as const).map((p) => {
              const label = p === 'day' ? 'Ngày' : p === 'week' ? 'Tuần' : 'Tháng';
              const active = period === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPeriod(p);
                    setHoveredIdx(null);
                  }}
                  style={{
                    padding: '3px 9px',
                    fontSize: '11px',
                    fontWeight: active ? 600 : 500,
                    borderRadius: '5px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: active ? 'var(--fpt-orange, #ea580c)' : 'transparent',
                    color: active ? '#ffffff' : 'var(--text-muted, #64748b)',
                    boxShadow: active ? '0 1px 3px rgba(234, 88, 12, 0.3)' : 'none',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Total & Average Metrics Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 8,
            padding: '6px 10px',
            background: 'var(--bg-canvas, rgba(241, 245, 249, 0.5))',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', lineHeight: 1.2 }}>
              {totalLabel}
            </span>
            <b style={{ fontSize: 13, color: 'var(--fpt-orange)', fontWeight: 700 }}>
              {money(totalRevenue)}
            </b>
          </div>
          <div style={{ width: 1, height: 18, background: 'var(--border-subtle)' }} />
          <div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', lineHeight: 1.2 }}>
              {avgLabel}
            </span>
            <b style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 600 }}>
              {money(avgRevenue)}
            </b>
          </div>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div style={{ position: 'relative', width: '100%', overflowX: 'hidden' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: 'auto', overflow: 'visible', display: 'block' }}
        >
          <defs>
            <linearGradient id="revenueLineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#f97316" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
            </linearGradient>
            <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#ea580c" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Grid lines */}
          {yTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={tick.y}
                x2={svgWidth - padRight}
                y2={tick.y}
                stroke="var(--border-subtle)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={padLeft - 6}
                y={tick.y + 3.5}
                textAnchor="end"
                fontSize="9"
                fill="var(--text-muted)"
                fontFamily="inherit"
              >
                {tick.value >= 1000000 ? `${(tick.value / 1000000).toFixed(1)} tr` : tick.value >= 1000 ? `${Math.round(tick.value / 1000)} k` : '0'}
              </text>
            </g>
          ))}

          {/* Area fill under curve */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#revenueLineGrad)"
              style={{ transition: 'all 0.4s ease' }}
            />
          )}

          {/* Smooth line curve */}
          {curvePath && (
            <path
              d={curvePath}
              fill="none"
              stroke="#f97316"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: 'all 0.4s ease' }}
            />
          )}

          {/* Interactive dots and vertical guide lines */}
          {chartCoords.map((pt, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g key={i}>
                {isHovered && (
                  <line
                    x1={pt.x}
                    y1={padTop}
                    x2={pt.x}
                    y2={padTop + plotHeight}
                    stroke="#f97316"
                    strokeWidth="1.2"
                    strokeDasharray="2 3"
                    opacity="0.8"
                  />
                )}
                {/* Touch/hover target */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="14"
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
                {/* Visual dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5.5 : 3.5}
                  fill={isHovered ? '#ea580c' : '#ffffff'}
                  stroke="#ea580c"
                  strokeWidth={isHovered ? 2.5 : 2}
                  filter={isHovered ? 'url(#dotGlow)' : undefined}
                  style={{ transition: 'all 0.15s ease', pointerEvents: 'none' }}
                />
                {/* X axis label */}
                <text
                  x={pt.x}
                  y={padTop + plotHeight + 17}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight={isHovered ? '700' : '500'}
                  fill={isHovered ? 'var(--fpt-orange)' : 'var(--text-muted)'}
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIdx !== null && chartCoords[hoveredIdx] && (
          <div
            style={{
              position: 'absolute',
              left: `${(chartCoords[hoveredIdx].x / svgWidth) * 100}%`,
              top: `${(chartCoords[hoveredIdx].y / svgHeight) * 100}%`,
              transform: 'translate(-50%, -120%)',
              background: 'rgba(15, 23, 42, 0.94)',
              color: '#ffffff',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 10,
              border: '1px solid rgba(249, 115, 22, 0.4)',
              backdropFilter: 'blur(4px)'
            }}
          >
            <div style={{ fontWeight: 700, color: '#fed7aa', marginBottom: 2, fontSize: 11 }}>
              {chartCoords[hoveredIdx].fullTitle}
            </div>
            <div>
              Doanh thu: <b>{money(chartCoords[hoveredIdx].revenue)}</b>
            </div>
            <div style={{ fontSize: 10, color: '#cbd5e1' }}>
              Đơn hàng: {chartCoords[hoveredIdx].orders} đơn
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TechnicianTimetableWidget: React.FC = () => {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    deliveryApi
      .dailyTasks()
      .then((res) => setTasks(res.tasks || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const shifts = [
    { id: 'morning' as const, title: 'Ca Sáng', range: '08:00 – 12:00', icon: '🌅', color: '#0284c7' },
    { id: 'afternoon' as const, title: 'Ca Chiều', range: '13:30 – 17:30', icon: '☀️', color: '#ea580c' },
    { id: 'evening' as const, title: 'Ca Tối', range: '18:00 – 21:00', icon: '🌙', color: '#8b5cf6' },
  ];

  return (
    <div className="fpt-panel">
      <div className="fpt-panel-header">
        <h3 className="fpt-panel-title">
          <Calendar size={18} style={{ color: '#4f46e5' }} />
          <span>Thời khóa biểu công việc hôm nay</span>
          <span className="fpt-badge-pill blue">{tasks.length} ca hẹn</span>
        </h3>
        <Link to="/technician/tasks" className="fpt-panel-link">
          <span>Xem thời khóa biểu đầy đủ</span>
          <ArrowUpRight size={14} />
        </Link>
      </div>

      {loading && <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Đang tải lịch làm việc…</p>}

      {!loading && tasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          ☕ Hôm nay bạn chưa có lịch hẹn giao lắp hay bảo hành nào. Sẵn sàng nhận đơn!
        </div>
      )}

      {!loading && tasks.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {shifts.map((shift) => {
            const shiftTasks = tasks.filter((t) => {
              if (!t.scheduledAt) return shift.id === 'morning';
              const h = new Date(t.scheduledAt).getHours();
              if (h < 12) return shift.id === 'morning';
              if (h < 18) return shift.id === 'afternoon';
              return shift.id === 'evening';
            });

            return (
              <div
                key={shift.id}
                style={{
                  background: 'var(--bg-canvas, #f8fafc)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 12,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: shift.color }}>
                    <span>{shift.icon}</span>
                    <span>{shift.title}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{shift.range}</span>
                </div>

                {shiftTasks.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0', textAlign: 'center' }}>
                    Trống lịch
                  </div>
                ) : (
                  shiftTasks.map((t) => (
                    <Link
                      key={t.id}
                      to="/technician/tasks"
                      style={{
                        background: 'var(--bg-surface, #ffffff)',
                        border: '1px solid var(--border-subtle)',
                        borderLeft: `4px solid ${t.type === 'DELIVERY_INSTALLATION' ? '#4f46e5' : '#f59e0b'}`,
                        borderRadius: 8,
                        padding: '10px 12px',
                        textDecoration: 'none',
                        color: 'inherit',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                        <b style={{ color: '#4f46e5' }}>{t.timeSlot}</b>
                        <span className="fpt-sku-pill">{t.orderCode}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {t.items?.[0]?.productName || t.typeLabel}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        👤 {t.customerName} · 📍 {t.shortAddress || t.shippingAddress}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const finance = profile?.role === 'super_admin' || profile?.role === 'product_manager';
  const [date, setDate] = useState(today);
  const [mode, setMode] = useState<'parallel' | 'sequential'>('parallel');
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<ConcurrentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    if (!finance) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');

    getConcurrentDashboard(date, mode)
      .then((result) => {
        if (active) {
          setData(result);
          setDemo(result.demo);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.status === 503 ? 'Báo cáo đang bận, vui lòng thử lại sau.' : e.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [date, mode, revision, finance]);

  if (!finance) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Today's Timetable Widget for Technician */}
        <TechnicianTimetableWidget />
        <InstallationBacklog revision={revision} />
        <ActivityFeed />
      </div>
    );
  }

  // Calculate totals and status distribution
  const orderCounts = data?.orderCountByStatus || {};
  const totalOrders = Object.values(orderCounts).reduce((sum, count) => sum + count, 0);
  const paidCount = (orderCounts['PAID'] || 0) + (orderCounts['CONFIRMED'] || 0) + (orderCounts['COMPLETED'] || 0);
  const pendingCount = (orderCounts['PENDING'] || 0) + (orderCounts['AWAITING_PAYMENT'] || 0);

  // Maximum quantity sold among top 5 for proportional bar
  const maxSold = data?.top5Variants && data.top5Variants.length > 0
    ? Math.max(...data.top5Variants.map((v) => v.quantitySold), 1)
    : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Header Toolbar */}
      <div className="fpt-page-header">
        <div className="fpt-page-title-wrap">
          <h1 className="fpt-page-title">Tổng quan kinh doanh</h1>
          <p className="fpt-page-subtitle">
            Báo cáo hiệu suất bán hàng & luồng vận hành thời gian thực
          </p>
        </div>

        <div className="fpt-controls-row">
          <div className="fpt-date-box">
            <Calendar size={15} style={{ color: 'var(--text-muted)' }} />
            <input
              type="date"
              className="fpt-date-input"
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
          </div>

          {loading && data && (
            <span className="fpt-badge-pill blue" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 11 }}>
              <RefreshCw size={11} className="animate-spin" />
              <span>Đang cập nhật số liệu…</span>
            </span>
          )}

          <button
            className="fpt-btn fpt-btn-primary"
            disabled={loading}
            onClick={() => setRevision((r) => r + 1)}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Đang tải…' : 'Làm mới'}</span>
          </button>
        </div>
      </div>

      {/* Demo speed benchmark pill (if in demo mode) */}
      {demo && (
        <div className="fpt-panel" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={16} style={{ color: 'var(--fpt-orange)' }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Chế độ kiểm thử hiệu năng:</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'parallel' | 'sequential')}
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}
            >
              <option value="parallel">Xử lý song song (Tối ưu)</option>
              <option value="sequential">Xử lý tuần tự</option>
            </select>
          </div>
          <span className="fpt-badge-pill orange">
            Thời gian phản hồi: {data ? `${data.elapsedMs} ms` : 'Đang đo…'}
          </span>
        </div>
      )}

      {error && (
        <div className="fpt-panel" style={{ borderColor: 'var(--fpt-rose)', color: 'var(--fpt-rose)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button className="fpt-btn fpt-btn-secondary" onClick={() => setRevision((r) => r + 1)}>
            Thử lại
          </button>
        </div>
      )}

      {/* 2. Top 4 Executive KPI Cards */}
      <div className="fpt-hero-grid" style={{ opacity: loading && data ? 0.78 : 1, transition: 'opacity 0.25s ease' }}>
        {loading && !data ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="fpt-stat-card" style={{ opacity: 0.85 }}>
                <div className="fpt-stat-top">
                  <div style={{ width: '45%', height: 14, borderRadius: 4, background: 'var(--border-subtle)' }} />
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--border-subtle)' }} />
                </div>
                <div style={{ width: '65%', height: 32, borderRadius: 6, background: 'var(--border-subtle)', margin: '10px 0' }} />
                <div className="fpt-stat-footer">
                  <div style={{ width: '40%', height: 12, borderRadius: 4, background: 'var(--border-subtle)' }} />
                  <div style={{ width: '35%', height: 20, borderRadius: 10, background: 'var(--border-subtle)' }} />
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            {/* Doanh thu hôm nay */}
            <div className="fpt-stat-card">
          <div className="fpt-stat-top">
            <span className="fpt-stat-label">Doanh thu ngày</span>
            <div className="fpt-icon-bubble orange">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="fpt-stat-value">
            {loading && !data ? '—' : money(data?.revenueToday ?? 0)}
          </div>
          <div className="fpt-stat-footer">
            <span>Ngày {date}</span>
            <span className="fpt-badge-pill orange">Thực thu đã chốt</span>
          </div>
        </div>

        {/* Tổng đơn phát sinh */}
        <div className="fpt-stat-card">
          <div className="fpt-stat-top">
            <span className="fpt-stat-label">Tổng đơn hàng</span>
            <div className="fpt-icon-bubble blue">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="fpt-stat-value">
            {loading && !data ? '—' : `${totalOrders} đơn`}
          </div>
          <div className="fpt-stat-footer">
            <span>{paidCount} đơn đã thanh toán</span>
            <span className="fpt-badge-pill blue">{pendingCount} chờ xử lý</span>
          </div>
        </div>

        {/* Giao vận & Lắp đặt */}
        <div className="fpt-stat-card">
          <div className="fpt-stat-top">
            <span className="fpt-stat-label">Giao hàng & Lắp đặt</span>
            <div className="fpt-icon-bubble emerald">
              <Truck size={20} />
            </div>
          </div>
          <div className="fpt-stat-value">
            {orderCounts['CONFIRMED'] || 0} đang giao
          </div>
          <div className="fpt-stat-footer">
            <span>Tiến độ kỹ thuật</span>
            <Link to="/orders/delivery" className="fpt-badge-pill emerald" style={{ textDecoration: 'none' }}>
              Điều phối →
            </Link>
          </div>
        </div>

            {/* Cảnh báo kho hàng */}
            <div className="fpt-stat-card">
              <div className="fpt-stat-top">
                <span className="fpt-stat-label">Cảnh báo tồn kho</span>
                <div className="fpt-icon-bubble amber">
                  <AlertTriangle size={20} />
                </div>
              </div>
              <div className="fpt-stat-value">
                {`${data?.lowStockVariants?.length || 0} SKU`}
              </div>
              <div className="fpt-stat-footer">
                <span>Tồn có thể bán ≤ 5</span>
                <Link to="/products" className="fpt-badge-pill amber" style={{ textDecoration: 'none' }}>
                  Kiểm tra kho →
                </Link>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 2.5. Hàng chỉ số nâng cao: Biểu đồ doanh thu (vừa vặn như thẻ Top 5) & Top 5 sản phẩm bán chạy */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: 20,
          opacity: loading && data ? 0.78 : 1,
          transition: 'opacity 0.25s ease'
        }}
      >
        <RevenueLineChart
          currentDate={date}
          dailyData={data?.revenueTrend}
          weeklyData={data?.revenueTrendWeek}
          monthlyData={data?.revenueTrendMonth}
          loading={loading}
        />

        {/* Top 5 Best-selling SKUs */}
        <div className="fpt-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="fpt-panel-header">
            <h3 className="fpt-panel-title">
              <Flame size={18} style={{ color: 'var(--fpt-orange)' }} />
              <span>Top 5 sản phẩm bán chạy nhất</span>
            </h3>
            <Link to="/products" className="fpt-panel-link">
              <span>Xem danh mục</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>

          {loading && !data && <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Đang tải số liệu…</p>}

          {data?.top5Variants && data.top5Variants.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 12, padding: '16px 0', textAlign: 'center' }}>
              Chưa có dữ liệu bán hàng trong kỳ.
            </p>
          )}

          {data?.top5Variants && data.top5Variants.length > 0 && (
            <div className="fpt-rank-list">
              {data.top5Variants.map((v, index) => {
                const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'slate';
                const pct = Math.max(10, Math.round((v.quantitySold / maxSold) * 100));
                return (
                  <div key={v.variantId} className="fpt-rank-item">
                    <div className={`fpt-rank-badge ${rankClass}`}>
                      {index === 0 ? <Flame size={14} /> : `#${index + 1}`}
                    </div>

                    <div className="fpt-rank-meta">
                      <span className="fpt-rank-title">
                        {v.name} {v.variantName ? `· ${v.variantName}` : ''}
                      </span>
                      <span className="fpt-sku-pill">{v.sku || v.variantId.slice(0, 8)}</span>
                    </div>

                    <div className="fpt-rank-visual">
                      <span className="fpt-rank-count">{v.quantitySold} cái</span>
                      <div className="fpt-progress-strip">
                        <div className="fpt-progress-strip-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. Order Status Pipeline Tracker */}
      <div className="fpt-panel" style={{ opacity: loading && data ? 0.78 : 1, transition: 'opacity 0.25s ease' }}>
        <div className="fpt-panel-header">
          <h3 className="fpt-panel-title">
            <ShoppingBag size={18} style={{ color: 'var(--fpt-orange)' }} />
            <span>Tiến độ xử lý đơn hàng</span>
            <span className="fpt-badge-pill blue">{totalOrders} đơn trong hệ thống</span>
          </h3>
          <Link to="/orders" className="fpt-panel-link">
            <span>Quản lý đơn hàng</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

        {/* Visual segmented progress bar */}
        <div className="fpt-pipeline-track">
          {Object.entries(statusConfigs).map(([key, cfg]) => {
            const count = orderCounts[key] || 0;
            const pct = totalOrders > 0 ? (count / totalOrders) * 100 : 0;
            if (pct <= 0) return null;
            return (
              <Link
                key={key}
                to={`/orders?status=${cfg.filterKey}`}
                className="fpt-track-segment"
                style={{ width: `${pct}%`, background: cfg.color, cursor: 'pointer' }}
                title={`${cfg.label}: ${count} đơn (${pct.toFixed(1)}%) - Bấm để xem danh sách`}
              />
            );
          })}
        </div>

        {/* Status metric cards */}
        <div className="fpt-pipeline-grid">
          {Object.entries(statusConfigs).map(([key, cfg]) => {
            const count = orderCounts[key] || 0;
            const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
            return (
              <Link
                key={key}
                to={`/orders?status=${cfg.filterKey}`}
                className="fpt-pipeline-card"
              >
                <div className="fpt-pipeline-card-top">
                  <span className="fpt-status-dot" style={{ background: cfg.color }} />
                  <span className="fpt-pipeline-card-label">{cfg.label}</span>
                </div>
                <div className="fpt-pipeline-card-val">{count}</div>
                <span className="fpt-pipeline-card-pct">{pct}% tổng đơn</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 4. Main 2-Column Split Workspace */}
      <div className="fpt-dashboard-split" style={{ opacity: loading && data ? 0.78 : 1, transition: 'opacity 0.25s ease' }}>
        {/* Left Column: Installation Backlog */}
        <div>
          <InstallationBacklog revision={revision} />
        </div>

        {/* Right Column: Low Stock Alerts & Activity Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Low Stock Watchlist */}
          <div className="fpt-panel">
            <div className="fpt-panel-header">
              <h3 className="fpt-panel-title">
                <AlertTriangle size={18} style={{ color: 'var(--fpt-amber)' }} />
                <span>Sản phẩm sắp hết hàng</span>
              </h3>
              <Link to="/products" className="fpt-panel-link">
                <span>Nhập kho</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>

            {loading && !data && <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Đang tải số liệu…</p>}

            {data?.lowStockVariants && data.lowStockVariants.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0', color: 'var(--fpt-emerald)', fontSize: 13 }}>
                <CheckCircle2 size={16} />
                <span>Tất cả biến thể đều đủ định mức tồn kho an toàn.</span>
              </div>
            )}

            {data?.lowStockVariants && data.lowStockVariants.length > 0 && (
              <div className="fpt-stock-list">
                {data.lowStockVariants.slice(0, 6).map((v) => {
                  const isCritical = v.stock <= 2;
                  return (
                    <div key={v.variantId} className="fpt-stock-item">
                      <div className="fpt-stock-meta">
                        <span className="fpt-stock-name">{v.name}</span>
                        <span className="fpt-sku-pill">{v.sku || 'N/A'}</span>
                      </div>
                      <span className={`fpt-stock-badge ${isCritical ? 'critical' : 'warning'}`}>
                        Còn {v.stock} cái
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Real-time Activity Feed */}
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
};
