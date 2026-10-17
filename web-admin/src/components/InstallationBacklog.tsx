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
    color: '#d97706',
    bg: 'rgba(217, 119, 6, 0.08)'
  },
  unassigned: {
    label: 'Chưa phân công',
    icon: <Clock size={15} />,
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.08)'
  },
  ASSIGNED: {
    label: 'Chưa nhận việc',
    icon: <Clock size={15} />,
    color: '#0284c7',
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
    color: '#0ea5e9',
    bg: 'rgba(14, 165, 233, 0.08)'
  },
  INSTALLED: {
    label: 'Chờ nghiệm thu',
    icon: <Wrench size={15} />,
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.08)'
  },
  FAILED: {
    label: 'Cần xử lý lại',
    icon: <AlertTriangle size={15} />,
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.08)'
  },
  overdue: {
    label: 'Quá lịch hẹn',
    icon: <AlertCircle size={15} />,
    color: '#dc2626',
    bg: 'rgba(220, 38, 38, 0.12)'
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
    return (
      <div className="ib-compact-bar">
        <div className="ib-track-label">
          <Truck size={16} />
          <span>Tiến độ:</span>
          <span className="ib-track-count">
            {summary ? summary.counts.totalOutstanding || 0 : 0} việc
          </span>
        </div>

        {summary && (
          <div className="ib-pills-wrap">
            {Object.entries(tileConfigs)
              .filter(([key]) => summary.scope !== 'MY_JOBS' || !['pendingApproval', 'unassigned'].includes(key))
              .map(([key, cfg]) => {
                const val = summary.counts[key] || 0;
                const isSelected = activeStatus === key;
                const isHighlight = val > 0;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onFilterSelect?.(key)}
                    className={`ib-pill-btn ${isSelected ? 'selected' : ''} ${isHighlight ? 'highlight' : ''}`}
                    style={{
                      '--pill-color': cfg.color,
                      '--pill-bg': cfg.bg,
                    } as React.CSSProperties}
                  >
                    <span className="ib-pill-icon">{cfg.icon}</span>
                    <span className="ib-pill-title">{cfg.label}:</span>
                    <strong className="ib-pill-val">{val}</strong>
                  </button>
                );
              })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--bg-card, #ffffff)',
        border: '1px solid var(--border-subtle, #e2e8f0)',
        borderRadius: '16px',
        padding: '18px 22px',
        boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
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
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
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
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#4f46e5',
              textDecoration: 'none',
              padding: '4px 10px',
              borderRadius: 6,
              background: 'rgba(79, 70, 229, 0.06)',
            }}
          >
            <span>Bàn điều phối</span>
            <ArrowUpRight size={13} />
          </Link>
        )}
      </div>

      {error && <p role="alert" style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>{error}</p>}

      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 10,
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
                    background: isHighlight ? cfg.bg : 'var(--bg-canvas, rgba(248, 250, 252, 0.6))',
                    border: `1px solid ${isHighlight ? cfg.color + '40' : 'var(--border-subtle, #e2e8f0)'}`,
                    borderRadius: 10,
                    padding: '10px 12px',
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
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: isHighlight ? cfg.color : 'var(--text-secondary)',
                      }}
                    >
                      {val}
                    </span>
                    <span style={{ color: isHighlight ? cfg.color : 'var(--text-muted)' }}>
                      {cfg.icon}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: isHighlight ? 'var(--text-primary)' : 'var(--text-secondary)',
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

