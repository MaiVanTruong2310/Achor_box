import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  ArrowUpRight,
  AlertCircle,
  Clock,
  Play,
  Package,
  Wrench,
  CheckCircle2,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { backendRequest } from '../services/deliveryInstallation';

interface Summary {
  scope: string;
  counts: Record<string, number>;
  observedAt: string;
}

interface TileConfig {
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

const tileConfigs: Record<string, TileConfig> = {
  pendingApproval: {
    label: 'PO chờ duyệt',
    icon: <Calendar size={15} />,
    color: 'var(--accent-amber-text)',
    bg: 'color-mix(in srgb, var(--accent-amber) 8%, transparent)'
  },
  unassigned: {
    label: 'Chưa phân công',
    icon: <Clock size={15} />,
    color: 'var(--text-muted)',
    bg: 'color-mix(in srgb, var(--text-muted) 8%, transparent)'
  },
  ASSIGNED: {
    label: 'Chưa nhận việc',
    icon: <Clock size={15} />,
    color: 'var(--accent-primary)',
    bg: 'rgba(2, 132, 199, 0.08)'
  },
  IN_PROGRESS: {
    label: 'Đang thực hiện',
    icon: <Play size={15} />,
    color: '#4f46e5',
    bg: 'rgba(79, 70, 229, 0.08)'
  },
  DELIVERED: {
    label: 'Chờ lắp đặt',
    icon: <Package size={15} />,
    color: 'var(--accent-primary)',
    bg: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)'
  },
  INSTALLED: {
    label: 'Chờ nghiệm thu',
    icon: <Wrench size={15} />,
    color: 'var(--accent-primary)',
    bg: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)'
  },
  FAILED: {
    label: 'Cần xử lý lại',
    icon: <AlertTriangle size={15} />,
    color: 'var(--accent-rose-text)',
    bg: 'color-mix(in srgb, var(--accent-rose) 8%, transparent)'
  },
  overdue: {
    label: 'Quá lịch hẹn',
    icon: <AlertCircle size={15} />,
    color: 'var(--accent-rose-text)',
    bg: 'color-mix(in srgb, var(--accent-rose) 12%, transparent)'
  }
};

export const InstallationBacklog: React.FC<{
  revision?: number;
  compact?: boolean;
  activeStatus?: string;
  onFilterSelect?: (status: string) => void;
}> = ({ revision, compact = false, activeStatus, onFilterSelect }) => {
  const { profile } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const isTechnician = profile?.role === 'technician';

  useEffect(() => {
    let active = true;
    if (!profile || !['super_admin', 'product_manager', 'technician'].includes(profile.role)) return;

    const load = () =>
      backendRequest<Summary>('/delivery-installations/dashboard')
        .then((data) => {
          if (active) {
            setSummary(data);
            setError('');
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });

    void load();
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, 30000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [profile?.id, profile?.role, revision]);

  if (!profile || !['super_admin', 'product_manager', 'technician'].includes(profile.role)) return null;

  if (compact) {
    const unassignedCount = (summary?.counts?.unassigned || 0) + (summary?.counts?.pendingApproval || 0) + (summary?.counts?.ASSIGNED || 0);
    const inProgressCount = (summary?.counts?.IN_PROGRESS || 0) + (summary?.counts?.DELIVERED || 0) + (summary?.counts?.INSTALLED || 0);
    const waitingPoCount = summary?.counts?.WAITING_PO_CONFIRMATION || 0;
    const completedCount = summary?.counts?.COMPLETED || 0;
    const failedCount = summary?.counts?.FAILED || 0;

    return (
      <div className="di-metrics-grid">
        <div
          className={`di-metric-card amber ${activeStatus === 'ASSIGNED' ? 'active' : ''}`}
          onClick={() => onFilterSelect?.(activeStatus === 'ASSIGNED' ? '' : 'ASSIGNED')}
          title="Bấm để lọc các đơn chờ KTV tiếp nhận hoặc chưa phân công"
        >
          <div className="di-metric-icon">
            <Clock size={18} />
          </div>
          <div className="di-metric-body">
            <div className="di-metric-top">
              <span className="di-metric-label">Chờ nhận việc & điều phối</span>
              <span className="di-metric-val">{unassignedCount}</span>
            </div>
            <span className="di-metric-sub">Đơn cần KTV tiếp nhận</span>
          </div>
        </div>

        <div
          className={`di-metric-card indigo ${activeStatus === 'IN_PROGRESS' ? 'active' : ''}`}
          onClick={() => onFilterSelect?.(activeStatus === 'IN_PROGRESS' ? '' : 'IN_PROGRESS')}
          title="Bấm để lọc các đơn KTV đang di chuyển, giao hàng hoặc lắp đặt"
        >
          <div className="di-metric-icon">
            <Truck size={18} />
          </div>
          <div className="di-metric-body">
            <div className="di-metric-top">
              <span className="di-metric-label">Đang giao & thi công</span>
              <span className="di-metric-val">{inProgressCount}</span>
            </div>
            <span className="di-metric-sub">KTV đang ngoài hiện trường</span>
          </div>
        </div>

        <div
          className={`di-metric-card purple ${activeStatus === 'WAITING_PO_CONFIRMATION' ? 'active' : ''} ${waitingPoCount > 0 ? 'pulse-attention' : ''}`}
          onClick={() => onFilterSelect?.(activeStatus === 'WAITING_PO_CONFIRMATION' ? '' : 'WAITING_PO_CONFIRMATION')}
          title="Bấm để lọc các đơn KTV đã nộp ảnh minh chứng chờ PO duyệt nghiệm thu"
        >
          <div className="di-metric-icon">
            <Calendar size={18} />
          </div>
          <div className="di-metric-body">
            <div className="di-metric-top">
              <span className="di-metric-label">Chờ PO duyệt nghiệm thu</span>
              <span className="di-metric-val">{waitingPoCount}</span>
            </div>
            <span className="di-metric-sub">
              {waitingPoCount > 0 ? 'Cần PO kiểm tra ảnh' : 'Đã nộp ảnh minh chứng'}
            </span>
          </div>
        </div>

        <div
          className={`di-metric-card emerald ${activeStatus === 'COMPLETED' ? 'active' : ''}`}
          onClick={() => onFilterSelect?.(activeStatus === 'COMPLETED' ? '' : 'COMPLETED')}
          title="Bấm để lọc các đơn đã nghiệm thu hoàn tất"
        >
          <div className="di-metric-icon">
            <CheckCircle2 size={18} />
          </div>
          <div className="di-metric-body">
            <div className="di-metric-top">
              <span className="di-metric-label">Đã nghiệm thu hoàn tất</span>
              <span className="di-metric-val">{completedCount}</span>
            </div>
            <span className="di-metric-sub">Bảo hành đã kích hoạt</span>
          </div>
        </div>

        {failedCount > 0 && (
          <div
            className={`di-metric-card rose ${activeStatus === 'FAILED' ? 'active' : ''}`}
            onClick={() => onFilterSelect?.(activeStatus === 'FAILED' ? '' : 'FAILED')}
            title="Bấm để lọc các đơn gặp sự cố hoặc cần xử lý lại"
          >
            <div className="di-metric-icon">
              <AlertTriangle size={18} />
            </div>
            <div className="di-metric-body">
              <div className="di-metric-top">
                <span className="di-metric-label">Cần xử lý lại</span>
                <span className="di-metric-val">{failedCount}</span>
              </div>
              <span className="di-metric-sub">Sự cố hiện trường</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--bg-card, #ffffff)',
        border: 0,
        borderRadius: '18px',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'color-mix(in srgb, var(--accent-emerald) 12%, transparent)',
              color: 'var(--accent-emerald-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Truck size={17} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isTechnician ? 'Tiến độ thi công của tôi' : 'Tiến độ giao hàng & lắp đặt'}
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {summary ? `${summary.counts.totalOutstanding || 0} công việc cần xử lý` : 'Đang cập nhật...'}
            </span>
          </div>
        </div>

        {!isTechnician && (
          <Link
            to="/orders/delivery"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'var(--accent-primary)',
              textDecoration: 'none',
              minHeight: 36,
              padding: '0 14px',
              borderRadius: 999,
              background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
            }}
          >
            <span>Bàn điều phối</span>
          </Link>
        )}
      </div>

      {error && <p role="alert" style={{ color: 'var(--accent-rose-text)', fontSize: 12, margin: 0 }}>{error}</p>}

      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 1,
            background: 'rgba(120,120,128,.18)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {Object.entries(tileConfigs)
            .filter(([key]) => summary.scope !== 'MY_JOBS' || !['pendingApproval', 'unassigned'].includes(key))
            .map(([key, cfg]) => {
              const val = summary.counts[key] || 0;
              const hasAlert = (key === 'overdue' || key === 'FAILED') && val > 0;
              const isHighlight = val > 0;

              return (
                <div
                  key={key}
                  style={{
                    background: 'var(--bg-card, #ffffff)',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontSize: '1.375rem',
                        fontWeight: 600,
                        letterSpacing: '-0.022em',
                        color: hasAlert ? cfg.color : (isHighlight ? 'var(--text-primary)' : 'var(--text-muted)'),
                      }}
                    >
                      {val}
                    </span>
                    <span style={{ color: hasAlert ? cfg.color : 'var(--text-muted)' }}>
                      {cfg.icon}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 400,
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {cfg.label}
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

