import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Cpu,
  ShieldAlert,
  ArrowUpRight,
  CheckCircle2,
  Wrench,
  Package,
  Clock,
  LineChart as LineChartIcon,
  BarChart3,
  Lock,
  Scale,
  Wifi,
  Activity,
  ArrowRight,
  PieChart as PieIcon,
  Truck,
  MapPin
} from 'lucide-react';

interface DataPoint {
  month: string;
  label: string;
  revenue: number; // in Millions VND
  orders: number;
}

const MONTHLY_DATA: DataPoint[] = [
  { month: 'Thg 10/25', label: 'Tháng 10, 2025', revenue: 28.5, orders: 18 },
  { month: 'Thg 11/25', label: 'Tháng 11, 2025', revenue: 34.2, orders: 22 },
  { month: 'Thg 12/25', label: 'Tháng 12, 2025', revenue: 42.0, orders: 28 },
  { month: 'Thg 01/26', label: 'Tháng 01, 2026', revenue: 38.6, orders: 25 },
  { month: 'Thg 02/26', label: 'Tháng 02, 2026', revenue: 49.8, orders: 32 },
  { month: 'Thg 03/26', label: 'Tháng 03, 2026', revenue: 58.4, orders: 38 },
];

const PRODUCT_SALES = [
  { id: 'pro', name: 'SmartBox Pro', sub: 'Cân LoadCell + Bàn phím PIN', percent: 58, revenue: 33872000, color: '#3b82f6', icon: <Package size={16} /> },
  { id: 'std', name: 'SmartBox Standard', sub: 'Bản Tiêu Chuẩn cơ bản', percent: 32, revenue: 18688000, color: '#0ea5e9', icon: <BoxIcon size={16} /> },
  { id: 'acc', name: 'Phụ kiện & Bàn phím', sub: 'Keypad rời + Sạc dự phòng', percent: 10, revenue: 5840000, color: '#10b981', icon: <Wrench size={16} /> },
];

function BoxIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5"/>
      <path d="M12 22V12"/>
    </svg>
  );
}

import { dashboardService, DashboardStats } from '../services/api';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [timeRange, setTimeRange] = useState<'6m' | '30d' | '7d'>('6m');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [hoveredProductIndex, setHoveredProductIndex] = useState<number | null>(null);

  // Initial load + background prefetching for 0ms instant filter switching
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      // 1. Fetch current selected range (instant if in memory cache)
      const data = await dashboardService.getDashboardData(timeRange);
      if (isMounted) {
        setStats(data);
        const pointCount = data?.monthlyRevenue?.length || 0;
        setHoveredPointIndex(pointCount > 0 ? pointCount - 1 : null);
        setLoading(false);
      }

      // 2. Prefetch other ranges into client cache in background
      const otherRanges = (['6m', '30d', '7d'] as const).filter(r => r !== timeRange);
      for (const r of otherRanges) {
        dashboardService.getDashboardData(r).catch(() => {});
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [timeRange]);

  const defaultMonths: DataPoint[] = [
    { month: 'Thg 04/26', label: 'Tháng 4, 2026', revenue: 0, orders: 0 },
    { month: 'Thg 05/26', label: 'Tháng 5, 2026', revenue: 0, orders: 0 },
    { month: 'Thg 06/26', label: 'Tháng 6, 2026', revenue: 0, orders: 0 },
    { month: 'Thg 07/26', label: 'Tháng 7, 2026', revenue: 0, orders: 0 },
    { month: 'Thg 08/26', label: 'Tháng 8, 2026', revenue: 0, orders: 0 },
    { month: 'Thg 09/26', label: 'Tháng 9, 2026', revenue: 0, orders: 0 },
  ];

  const rawMonthly = stats?.monthlyRevenue && stats.monthlyRevenue.length > 0 ? stats.monthlyRevenue : defaultMonths;
  const monthlyData = rawMonthly;
  const productSales = stats?.productSales && stats.productSales.length > 0 ? stats.productSales : [];

  // Dynamic max revenue & orders calculation for high-precision charting
  const highestRevenue = Math.max(0.1, ...(monthlyData.map(m => m.revenue || 0)));
  const maxRevenue = Math.max(1, Math.ceil(highestRevenue * 1.25));
  const highestOrders = Math.max(1, ...(monthlyData.map(m => m.orders || 0)));
  const maxOrders = Math.max(5, Math.ceil(highestOrders * 1.25));

  // Dynamic Y-Axis Ticks (5 levels from maxRevenue down to 0)
  const yTicks = [1.0, 0.75, 0.5, 0.25, 0.0].map(ratio => {
    const val = maxRevenue * ratio;
    if (val >= 1) {
      return `${Number(val.toFixed(1))} Tr ₫`;
    }
    return `${Math.round(val * 1000)}k ₫`;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Top Header */}
      <div className="section-header">
        <div className="section-title-group">
          <div className="section-icon" style={{ background: 'var(--accent-primary-soft)', color: 'var(--accent-primary)' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
              Tổng Quan Vận Hành & Doanh Thu
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
              {loading ? 'Đang tải dữ liệu...' : 'Số liệu tổng hợp thời gian thực từ cơ sở dữ liệu.'}
            </p>
          </div>
        </div>

        {/* Time Filter */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
          {[
            { id: '7d', label: '7 ngày' },
            { id: '30d', label: '30 ngày' },
            { id: '6m', label: '6 tháng' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTimeRange(t.id as any)}
              style={{
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: timeRange === t.id ? 600 : 400,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                background: timeRange === t.id ? 'var(--accent-primary)' : 'transparent',
                color: timeRange === t.id ? '#ffffff' : 'var(--text-secondary)',
                boxShadow: timeRange === t.id ? '0 2px 8px rgba(37, 99, 235, 0.35)' : 'none',
                transition: 'all 0.18s ease'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
        <div className="kpi-card" style={{ animationDelay: '0ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Doanh Thu
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--accent-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
              <DollarSign size={18} strokeWidth={2} />
            </div>
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {`${(stats?.totalRevenue || 0).toLocaleString('vi-VN')} ₫`}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--accent-emerald-text)' }}>
            <TrendingUp size={14} />
            <span>{stats?.revenueGrowth !== undefined ? `${stats.revenueGrowth >= 0 ? '+' : ''}${stats.revenueGrowth}%` : '+0.0%'} tháng này</span>
          </div>
          <div className="progress-bar-track" style={{ marginTop: '12px' }}>
            <div className="progress-bar-fill" style={{ width: '100%' }} />
          </div>
        </div>

        <div className="kpi-card accent-sky" style={{ animationDelay: '80ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Đơn Hàng
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--accent-sky-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-sky-text)' }}>
              <ShoppingBag size={18} strokeWidth={2} />
            </div>
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {`${stats?.totalOrders || 0} Đơn`}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--accent-sky-text)' }}>
            <ArrowUpRight size={14} />
            <span>{stats?.ordersGrowth !== undefined ? `${stats.ordersGrowth >= 0 ? '+' : ''}${stats.ordersGrowth}%` : '+0.0%'} tăng trưởng</span>
          </div>
          <div className="progress-bar-track" style={{ marginTop: '12px' }}>
            <div className="progress-bar-fill" style={{ width: '100%', background: 'linear-gradient(90deg, #0ea5e9 0%, #38bdf8 50%, #0ea5e9 100%)' }} />
          </div>
        </div>

        <div className="kpi-card accent-emerald" style={{ animationDelay: '160ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Thiết Bị Trực Tuyến
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--accent-emerald-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald-text)' }}>
              <Cpu size={18} strokeWidth={2} />
            </div>
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {`${stats?.activeDevices || 0}/${stats?.totalDevices || 0} Hộp`}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--accent-emerald-text)' }}>
            <CheckCircle2 size={14} />
            <span>{stats?.totalDevices ? Math.round(((stats.activeDevices || 0) / stats.totalDevices) * 100) : 100}% kết nối ổn định</span>
          </div>
          <div className="progress-bar-track" style={{ marginTop: '12px' }}>
            <div className="progress-bar-fill emerald" style={{ width: `${stats?.totalDevices ? Math.round(((stats.activeDevices || 0) / stats.totalDevices) * 100) : 100}%` }} />
          </div>
        </div>

        <div className="kpi-card accent-amber" style={{ animationDelay: '240ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Bảo Hành Cần Xử Lý
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--accent-amber-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-amber-text)' }}>
              <ShieldAlert size={18} strokeWidth={2} />
            </div>
          </div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {`${(stats?.pendingWarranties || 0) < 10 ? '0' : ''}${stats?.pendingWarranties || 0} Ca`}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--accent-amber-text)' }}>
            <Clock size={14} />
            <span>Yêu cầu đang chờ</span>
          </div>
          <div className="progress-bar-track" style={{ marginTop: '12px' }}>
            <div className="progress-bar-fill amber" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      {/* FULL-WIDTH CHART COMPONENT WITH CRISP TYPOGRAPHY */}
      <div className="card card-animated" style={{ padding: '24px', width: '100%', animationDelay: '200ms' }}>
        {/* Chart Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Biểu Đồ Xu Hướng Doanh Thu & Số Lượng Đơn Bán
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Nhịp độ tăng trưởng doanh thu (Triệu VNĐ) và sản lượng đơn hàng toàn hệ thống
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* Chart Switcher */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
              <button
                onClick={() => setChartType('line')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  fontSize: '0.75rem',
                  fontWeight: chartType === 'line' ? 600 : 400,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  background: chartType === 'line' ? 'var(--accent-primary)' : 'transparent',
                  color: chartType === 'line' ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease'
                }}
              >
                <LineChartIcon size={14} />
                <span>Đường (Line)</span>
              </button>

              <button
                onClick={() => setChartType('bar')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  fontSize: '0.75rem',
                  fontWeight: chartType === 'bar' ? 600 : 400,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  background: chartType === 'bar' ? 'var(--accent-primary)' : 'transparent',
                  color: chartType === 'bar' ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease'
                }}
              >
                <BarChart3 size={14} />
                <span>Cột (Bar)</span>
              </button>
            </div>

            {/* Reflective Glassmorphic Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(37, 99, 235, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.3)'
              }}>
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #bfdbfe 0%, #3b82f6 50%, #1d4ed8 100%)',
                  boxShadow: '0 0 10px rgba(59, 130, 246, 0.9), inset 0 1px 2px #ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.7)'
                }} />
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, letterSpacing: '-0.01em' }}>
                  Doanh thu (Triệu ₫)
                </span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(6, 182, 212, 0.12)',
                border: '1px solid rgba(6, 182, 212, 0.35)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 2px 8px rgba(6, 182, 212, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.3)'
              }}>
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #cffafe 0%, #06b6d4 50%, #0891b2 100%)',
                  boxShadow: '0 0 10px rgba(6, 182, 212, 0.9), inset 0 1px 2px #ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.7)'
                }} />
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, letterSpacing: '-0.01em' }}>
                  Số đơn hàng
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* HTML + SVG HIGH PRECISION CHART WRAPPER */}
        <div style={{ display: 'flex', width: '100%', gap: '14px' }}>
          
          {/* Y-Axis HTML Labels (Crisp Dynamic Ticks & Tabular Alignment) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '210px',
            textAlign: 'right',
            minWidth: '60px',
            paddingRight: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            fontFamily: 'var(--font-main)',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--text-muted)',
            letterSpacing: '0.01em',
            userSelect: 'none'
          }}>
            {yTicks.map((tick, i) => (
              <span key={i}>{tick}</span>
            ))}
          </div>

          {/* Graph Area */}
          <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            
            {chartType === 'line' ? (
              <div style={{ position: 'relative', height: '210px', width: '100%' }}>
                <svg
                  viewBox="0 0 1000 210"
                  preserveAspectRatio="none"
                  style={{ width: '100%', height: '100%', overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="fullRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                      <stop offset="50%" stopColor="#2563eb" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#1e40af" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="fullLineGlow" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#93c5fd" />
                      <stop offset="50%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#60a5fa" />
                    </linearGradient>
                    <linearGradient id="orderDashedGlow" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#a5f3fc" />
                      <stop offset="50%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                    const y = 210 - ratio * 210;
                    return (
                      <line
                        key={i}
                        x1={0}
                        y1={y}
                        x2={1000}
                        y2={y}
                        stroke="var(--border-subtle)"
                        strokeDasharray="4 4"
                      />
                    );
                  })}

                  {/* SVG Curve calculations */}
                  {(() => {
                    const divisor = Math.max(1, monthlyData.length - 1);
                    const ptsRev = monthlyData.map((d, index) => {
                      const x = (index / divisor) * 1000;
                      const y = maxRevenue > 0 ? 210 - ((d.revenue || 0) / maxRevenue) * 210 : 210;
                      return { x: isNaN(x) ? 0 : x, y: isNaN(y) ? 210 : y, data: d };
                    });

                    const ptsOrd = monthlyData.map((d, index) => {
                      const x = (index / divisor) * 1000;
                      const y = maxOrders > 0 ? 210 - ((d.orders || 0) / maxOrders) * 210 : 210;
                      return { x: isNaN(x) ? 0 : x, y: isNaN(y) ? 210 : y, data: d };
                    });

                    const makePath = (points: { x: number; y: number }[]) => {
                      if (!points || points.length === 0) return 'M 0 210 L 1000 210';
                      if (points.length === 1) return `M ${points[0].x || 0} ${points[0].y || 210} L 1000 ${points[0].y || 210}`;
                      let path = `M ${points[0].x} ${points[0].y}`;
                      for (let i = 0; i < points.length - 1; i++) {
                        const p0 = points[i];
                        const p1 = points[i + 1];
                        if (p0 && p1) {
                          const cpX = (p0.x + p1.x) / 2;
                          path += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
                        }
                      }
                      return path;
                    };

                    const revPath = makePath(ptsRev);
                    const ordPath = makePath(ptsOrd);
                    const areaPath = `${revPath} L 1000 210 L 0 210 Z`;

                    return (
                      <>
                        <path d={areaPath} fill="url(#fullRevenueGrad)" />
                        <path d={revPath} fill="none" stroke="url(#fullLineGlow)" strokeWidth="3.5" strokeLinecap="round" />
                        <path d={ordPath} fill="none" stroke="url(#orderDashedGlow)" strokeWidth="2.5" strokeDasharray="6 4" strokeLinecap="round" />

                        {/* Vertical Guide Line */}
                        {hoveredPointIndex !== null && ptsRev[hoveredPointIndex] && (
                          <line
                            x1={ptsRev[hoveredPointIndex].x}
                            y1={0}
                            x2={ptsRev[hoveredPointIndex].x}
                            y2={210}
                            stroke="var(--accent-primary)"
                            strokeWidth="1.5"
                            strokeDasharray="3 3"
                          />
                        )}

                        {/* Interactive Dots with Reflective Sheen */}
                        {ptsRev.map((pt, idx) => (
                          <circle
                            key={'rev-' + idx}
                            cx={pt.x}
                            cy={pt.y}
                            r={hoveredPointIndex === idx ? 7.5 : (monthlyData.length > 15 ? 3.5 : 5)}
                            fill="#3b82f6"
                            stroke="#ffffff"
                            strokeWidth={hoveredPointIndex === idx ? 2.5 : (monthlyData.length > 15 ? 1.5 : 2)}
                            className="chart-dot"
                            style={{ filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.8))' }}
                            onMouseEnter={() => setHoveredPointIndex(idx)}
                          />
                        ))}

                        {ptsOrd.map((pt, idx) => (
                          <circle
                            key={'ord-' + idx}
                            cx={pt.x}
                            cy={pt.y}
                            r={hoveredPointIndex === idx ? 6.5 : (monthlyData.length > 15 ? 3 : 4)}
                            fill="#06b6d4"
                            stroke="#ffffff"
                            strokeWidth={hoveredPointIndex === idx ? 2 : (monthlyData.length > 15 ? 1.5 : 1.8)}
                            className="chart-dot"
                            style={{ filter: 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.8))' }}
                            onMouseEnter={() => setHoveredPointIndex(idx)}
                          />
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
            ) : (
              /* Bar Chart View with Reflective Gradients */
              <div style={{ height: '210px', width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)' }}>
                {monthlyData.map((item, idx) => {
                  const heightPercent = (item.revenue / maxRevenue) * 100;
                  const isHovered = hoveredPointIndex === idx;

                  return (
                    <div
                      key={item.month + '-' + idx}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredPointIndex(idx)}
                    >
                      <div style={{ width: '100%', maxWidth: monthlyData.length > 15 ? '16px' : '56px', display: 'flex', alignItems: 'flex-end', gap: monthlyData.length > 15 ? '3px' : '6px', height: '100%' }}>
                        {/* Revenue Bar with Top Highlight */}
                        <div
                          style={{
                            flex: 1,
                            height: `${heightPercent}%`,
                            background: isHovered
                              ? 'linear-gradient(180deg, #93c5fd 0%, #3b82f6 50%, #1d4ed8 100%)'
                              : 'linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)',
                            borderRadius: '4px 4px 0 0',
                            boxShadow: isHovered
                              ? '0 0 14px rgba(59, 130, 246, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.7)'
                              : '0 0 8px rgba(37, 99, 235, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
                            transition: 'all 0.25s ease',
                          }}
                        />
                        {/* Orders Bar with Top Highlight */}
                        <div
                          style={{
                            flex: 0.75,
                            height: `${(item.orders / maxOrders) * 100}%`,
                            background: isHovered
                              ? 'linear-gradient(180deg, #a5f3fc 0%, #06b6d4 50%, #0891b2 100%)'
                              : 'linear-gradient(180deg, #67e8f9 0%, #06b6d4 100%)',
                            borderRadius: '4px 4px 0 0',
                            boxShadow: isHovered
                              ? '0 0 12px rgba(6, 182, 212, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.7)'
                              : '0 0 6px rgba(6, 182, 212, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
                            transition: 'all 0.25s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* X-Axis HTML Labels (Crisp, High-Legibility Responsive Typography) */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '12px',
              userSelect: 'none'
            }}>
              {monthlyData.map((item, idx) => {
                const isSelected = hoveredPointIndex === idx;
                const showText = monthlyData.length <= 10 || idx % 5 === 0 || idx === monthlyData.length - 1;

                return (
                  <button
                    key={item.month + '-' + idx}
                    onClick={() => setHoveredPointIndex(idx)}
                    onMouseEnter={() => setHoveredPointIndex(idx)}
                    style={{
                      background: isSelected ? 'var(--accent-primary-soft)' : 'transparent',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: monthlyData.length > 15 ? '2px 4px' : '4px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      transition: 'all 0.18s ease',
                      opacity: showText || isSelected ? 1 : 0
                    }}
                  >
                    <span style={{
                      fontSize: monthlyData.length > 15 ? '0.6875rem' : '0.78125rem',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontFamily: 'var(--font-main)',
                      letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap'
                    }}>
                      {item.month}
                    </span>
                  </button>
                );
              })}
            </div>

          </div>
        </div>

        {/* Hover Summary Info Footer Bar */}
        {hoveredPointIndex !== null && monthlyData[hoveredPointIndex] && (
          <div style={{
            marginTop: '16px',
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '0.8125rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #93c5fd 0%, #3b82f6 100%)',
                boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)'
              }} />
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                Thời điểm: <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{monthlyData[hoveredPointIndex].label}</strong>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(37, 99, 235, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.25)'
              }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Doanh thu:</span>
                <strong style={{ color: '#60a5fa', fontSize: '0.9375rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {monthlyData[hoveredPointIndex].revenue.toLocaleString('vi-VN')} Triệu ₫
                </strong>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(6, 182, 212, 0.1)',
                border: '1px solid rgba(6, 182, 212, 0.25)'
              }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Số lượng đơn:</span>
                <strong style={{ color: '#22d3ee', fontSize: '0.9375rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {monthlyData[hoveredPointIndex].orders} Đơn hàng
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* REDESIGNED BOTTOM 2 SECTIONS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '22px', animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both' }}>
        
        {/* SECTION 1: Product Market Share & Sales Donut Breakdown */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                  <PieIcon size={17} />
                </div>
                <div>
                  <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Cơ Cấu Doanh Số Theo Dòng Sản Phẩm
                  </h2>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tỷ trọng đóng góp doanh thu</div>
                </div>
              </div>
              <span className="badge badge-online">
                <span className="badge-dot" />
                Tổng: {stats?.totalRevenue ? `${(stats.totalRevenue / 1000000).toFixed(1)} Tr ₫` : '0 Tr ₫'}
              </span>
            </div>

            {/* Visual Segment Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {productSales.map((prod, idx) => {
                const isHovered = hoveredProductIndex === idx;

                return (
                  <div
                    key={prod.id}
                    onMouseEnter={() => setHoveredProductIndex(idx)}
                    onMouseLeave={() => setHoveredProductIndex(null)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: isHovered ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: `${prod.color}20`,
                          color: prod.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Package size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{prod.name}</div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{prod.sub}</div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: prod.color }}>
                          {prod.revenue.toLocaleString('vi-VN')} ₫
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {prod.percent}% Thị phần
                        </div>
                      </div>
                    </div>

                    {/* High Precision Gradient Bar */}
                    <div style={{ width: '100%', height: '6px', background: 'var(--bg-app)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${prod.percent}%`,
                          height: '100%',
                          background: prod.color,
                          borderRadius: 'var(--radius-full)',
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span><strong>SmartBox Pro</strong> chiếm <strong>58%</strong> tổng doanh số nhờ tính năng cân đo tự động.</span>
            <a href="/products" style={{ color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Kho hàng <ArrowRight size={13} />
            </a>
          </div>
        </div>

        {/* SECTION 2: Live Recent Orders & Logistics Stream */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-sky-soft, rgba(14, 165, 233, 0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-sky, #0ea5e9)' }}>
                  <Truck size={17} />
                </div>
                <div>
                  <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Đơn hàng & Luồng giao vận mới nhất
                  </h2>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tiến trình giao vận & theo dõi thời gian thực</div>
                </div>
              </div>
              <span className="badge badge-role" style={{ background: 'rgba(37, 99, 235, 0.15)', color: '#38bdf8', fontSize: '0.6875rem' }}>
                {stats?.recentOrders?.length ? `${stats.recentOrders.length} Đơn mới nhất` : 'Live Stream'}
              </span>
            </div>

            {/* Live Orders List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {(!stats?.recentOrders || stats.recentOrders.length === 0) ? (
                <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                  <ShoppingBag size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <div>Chưa có dữ liệu đơn hàng mới trong cơ sở dữ liệu.</div>
                </div>
              ) : (
                stats.recentOrders.slice(0, 4).map((ord: any, idx: number) => {
                  const customerName = ord.customerName || ord.customer?.full_name || 'Khách hàng';
                  const address = ord.shippingAddress || ord.shipping_address || 'Địa chỉ nhận hàng';
                  const tracking = ord.trackingNumber || ord.tracking_number;
                  const totalFormatted = (Number(ord.total) || 0).toLocaleString('vi-VN') + ' ₫';
                  const summary = ord.itemsSummary || ord.items_summary || (ord.items && ord.items.length > 0 ? `${ord.items[0].quantity}x ${ord.items[0].productName}` : 'Thiết bị SmartBox');

                  // Carrier extraction from tracking code
                  let carrierBg = 'rgba(14, 165, 233, 0.12)';
                  let carrierColor = '#0ea5e9';
                  if (tracking) {
                    if (tracking.toUpperCase().startsWith('VNPOST') || tracking.toUpperCase().startsWith('EMS')) {
                      carrierBg = 'rgba(245, 158, 11, 0.12)';
                      carrierColor = '#f59e0b';
                    } else if (tracking.toUpperCase().startsWith('GHTK')) {
                      carrierBg = 'rgba(16, 185, 129, 0.12)';
                      carrierColor = '#10b981';
                    }
                  }

                  // Status style
                  let statusText = 'Chờ xử lý';
                  let statusBg = 'rgba(100, 116, 139, 0.12)';
                  let statusColor = 'var(--text-secondary)';
                  if (ord.status === 'processing') {
                    statusText = 'Đang chuẩn bị';
                    statusBg = 'rgba(245, 158, 11, 0.15)';
                    statusColor = '#f59e0b';
                  } else if (ord.status === 'shipping') {
                    statusText = 'Đang giao hàng';
                    statusBg = 'rgba(37, 99, 235, 0.15)';
                    statusColor = '#38bdf8';
                  } else if (ord.status === 'completed' || ord.status === 'delivered') {
                    statusText = 'Hoàn tất';
                    statusBg = 'rgba(16, 185, 129, 0.15)';
                    statusColor = '#10b981';
                  }

                  return (
                    <div
                      key={ord.id || idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          background: carrierBg,
                          color: carrierColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Truck size={17} />
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {customerName}
                            </span>
                            {tracking ? (
                              <span style={{
                                fontSize: '0.6875rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: carrierBg,
                                color: carrierColor,
                                fontWeight: 700,
                                fontFamily: 'var(--font-mono)'
                              }}>
                                {tracking}
                              </span>
                            ) : null}
                          </div>
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }}>
                            {summary} • {address}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--accent-emerald, #10b981)', marginBottom: '3px' }}>
                          {totalFormatted}
                        </div>
                        <span style={{
                          fontSize: '0.6875rem',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: statusBg,
                          color: statusColor,
                          fontWeight: 600,
                          display: 'inline-block'
                        }}>
                          {statusText}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>Tự động đồng bộ luồng vận chuyển theo mã định danh từ <strong>VNPost / GHTK / EMS</strong>.</span>
            <a href="/orders" style={{ color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Quản lý đơn hàng <ArrowRight size={13} />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
