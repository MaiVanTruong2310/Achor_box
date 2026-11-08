import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  History,
  RefreshCw,
  Search,
  Filter,
  Moon,
  Shield,
  Package,
  Settings,
  UserCheck,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  X,
  Copy,
  Clock,
  Eye,
  Download,
  AlertOctagon,
  Sparkles
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { AuditLog } from '../../types/database';
import { auditLogsService } from '../../services/api';
import './audit-logs.css';

export type AnomalySeverity = 'critical' | 'warning' | 'normal';
export type AnomalyCategory = 'after_hours' | 'destructive' | 'stock_shock' | 'role_escalation' | 'burst_frequency' | 'config_tamper' | 'normal';

export interface AnomalyReport {
  isAnomaly: boolean;
  severity: AnomalySeverity;
  category: AnomalyCategory;
  reasons: string[];
}

export const AuditLogsPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'anomaly' | 'night' | 'roles' | 'stock' | 'config'>('all');
  const [inspectTarget, setInspectTarget] = useState<AuditLog | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await auditLogsService.getLogs();
      setLogs(data || []);
    } catch (e) {
      console.error('Lỗi tải nhật ký thao tác:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Heuristic Anomaly Analysis Engine
  const anomaliesMap = useMemo(() => {
    const map = new Map<string, AnomalyReport>();
    if (!logs.length) return map;

    // 1. Group logs by actor to calculate burst rate
    const actorTimestamps: Record<string, number[]> = {};
    logs.forEach(log => {
      const actorKey = log.actor_id || log.actor?.full_name || 'unknown';
      if (!actorTimestamps[actorKey]) actorTimestamps[actorKey] = [];
      const ts = log.created_at ? new Date(log.created_at).getTime() : 0;
      if (ts) actorTimestamps[actorKey].push(ts);
    });

    logs.forEach((log) => {
      const reasons: string[] = [];
      let severity: AnomalySeverity = 'normal';
      let category: AnomalyCategory = 'normal';

      const act = (log.action || '').toUpperCase();
      const target = (log.target_table || '').toLowerCase();

      // Rule A: After-Hours Activity (22:00 - 05:00 UTC+7)
      let isNight = false;
      let localHour = 0;
      let localMin = 0;
      if (log.created_at) {
        const d = new Date(log.created_at);
        // Vietnam timezone UTC+7
        localHour = (d.getUTCHours() + 7) % 24;
        localMin = d.getUTCMinutes();
        if (localHour >= 22 || localHour < 5) {
          isNight = true;
          reasons.push(`Thao tác đêm muộn (${localHour}h:${String(localMin).padStart(2, '0')}) ngoài giờ hành chính`);
          severity = 'warning';
          category = 'after_hours';
        }
      }

      // Rule B: Destructive Actions
      const isDestructive =
        act.includes('DELETE') ||
        act.includes('DESTROY') ||
        act.includes('PURGE') ||
        act.includes('DROP') ||
        act.includes('CANCEL') ||
        act.includes('LOCK_USER') ||
        act.includes('BAN');

      if (isDestructive) {
        reasons.push(`Hành động mang tính xóa bỏ / hủy bỏ đối tượng [${log.target_table || 'hệ thống'}]`);
        severity = 'critical';
        category = 'destructive';
      }

      // Rule C: Role & Privilege Escalation
      const isRoleAction =
        act.includes('ROLE') ||
        act.includes('PERMISSION') ||
        act.includes('STAFF_CREATE') ||
        act.includes('RESET_PASS') ||
        target.includes('role') ||
        (target === 'users' && act.includes('UPDATE'));

      if (isRoleAction) {
        reasons.push(`Can thiệp tài khoản / phân bổ quyền hạn nhân sự nội bộ`);
        if (severity !== 'critical') severity = 'warning';
        if (category === 'normal') category = 'role_escalation';
      }

      // Rule D: Stock Shock (Large inventory jump or drop)
      const isStockAction =
        act.includes('STOCK') ||
        act.includes('INVENTORY') ||
        target === 'products' ||
        target === 'product_variants';

      if (isStockAction && log.meta) {
        const delta =
          log.meta.delta ?? log.meta.quantity ?? log.meta.amount ?? log.meta.adjustment;
        if (typeof delta === 'number' && Math.abs(delta) >= 20) {
          reasons.push(`Biến động tồn kho lớn bất thường (${delta > 0 ? '+' : ''}${delta} sản phẩm)`);
          severity = 'critical';
          category = 'stock_shock';
        }
      }

      // Rule E: Burst Rate (>= 6 actions in 2 minutes by same actor)
      const actorKey = log.actor_id || log.actor?.full_name || 'unknown';
      const myTs = log.created_at ? new Date(log.created_at).getTime() : 0;
      if (myTs && actorTimestamps[actorKey]) {
        const nearby = actorTimestamps[actorKey].filter(
          (t) => Math.abs(t - myTs) <= 2 * 60 * 1000
        );
        if (nearby.length >= 6) {
          reasons.push(`Thao tác dồn dập (${nearby.length} thao tác trong vòng 2 phút)`);
          if (severity !== 'critical') severity = 'warning';
          if (category === 'normal') category = 'burst_frequency';
        }
      }

      // Rule F: Config / Payment tampering
      const isConfigAction =
        target.includes('setting') ||
        target.includes('payment') ||
        act.includes('CONFIG') ||
        act.includes('SETTING') ||
        act.includes('SECRET');

      if (isConfigAction) {
        reasons.push(`Thay đổi cấu hình thanh toán / hạ tầng kỹ thuật máy chủ`);
        if (severity !== 'critical') severity = 'warning';
        if (category === 'normal') category = 'config_tamper';
      }

      // Super alert: Night + Destructive / Role / Stock
      if (isNight && (isDestructive || isRoleAction || isStockAction || isConfigAction)) {
        severity = 'critical';
        reasons.unshift('Nguy cơ cao: thao tác nhạy cảm được thực hiện ngoài giờ làm việc');
      }

      const isAnomaly = severity !== 'normal';
      map.set(log.id, {
        isAnomaly,
        severity,
        category,
        reasons
      });
    });

    return map;
  }, [logs]);

  // Metric counts
  const totalLogs = logs.length;
  const anomalyLogs = useMemo(() => {
    return logs.filter((l) => anomaliesMap.get(l.id)?.isAnomaly);
  }, [logs, anomaliesMap]);

  const nightLogs = useMemo(() => {
    return logs.filter((l) => {
      const cat = anomaliesMap.get(l.id);
      return cat?.category === 'after_hours' || (l.created_at && (() => {
        const h = (new Date(l.created_at).getUTCHours() + 7) % 24;
        return h >= 22 || h < 5;
      })());
    });
  }, [logs, anomaliesMap]);

  const roleLogs = useMemo(() => {
    return logs.filter((l) => {
      const act = (l.action || '').toUpperCase();
      return act.includes('ROLE') || act.includes('STAFF') || act.includes('PASS') || (l.target_table || '') === 'users';
    });
  }, [logs]);

  const stockLogs = useMemo(() => {
    return logs.filter((l) => {
      const act = (l.action || '').toUpperCase();
      return act.includes('STOCK') || (l.target_table || '').includes('product');
    });
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    let result = logs;

    if (filterType === 'anomaly') {
      result = result.filter((l) => anomaliesMap.get(l.id)?.isAnomaly);
    } else if (filterType === 'night') {
      result = nightLogs;
    } else if (filterType === 'roles') {
      result = roleLogs;
    } else if (filterType === 'stock') {
      result = stockLogs;
    } else if (filterType === 'config') {
      result = result.filter((l) => {
        const t = (l.target_table || '').toLowerCase();
        const a = (l.action || '').toUpperCase();
        return t.includes('setting') || t.includes('payment') || a.includes('CONFIG');
      });
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((l) => {
        const actorName = (l.actor?.full_name || '').toLowerCase();
        const action = (l.action || '').toLowerCase();
        const target = (l.target_table || '').toLowerCase();
        const metaStr = typeof l.meta === 'object' ? JSON.stringify(l.meta).toLowerCase() : String(l.meta || '').toLowerCase();
        return actorName.includes(q) || action.includes(q) || target.includes(q) || metaStr.includes(q);
      });
    }

    return result;
  }, [logs, filterType, search, anomaliesMap, nightLogs, roleLogs, stockLogs]);

  // Action badge color
  const getActionClass = (action: string) => {
    const a = action.toUpperCase();
    if (a.includes('DELETE') || a.includes('DROP') || a.includes('PURGE') || a.includes('CANCEL')) {
      return 'audit-action-red';
    }
    if (a.includes('STOCK') || a.includes('ADJUST') || a.includes('UPDATE')) {
      return 'audit-action-orange';
    }
    if (a.includes('ROLE') || a.includes('STAFF') || a.includes('PERMISSION')) {
      return 'audit-action-purple';
    }
    if (a.includes('CREATE') || a.includes('INSERT') || a.includes('SEND')) {
      return 'audit-action-blue';
    }
    return 'audit-action-gray';
  };

  const handleCopyJson = (obj: any) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `smartbox_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="audit-page-container">
      {/* 1. Embedded Notice (If viewed as subtab in settings) */}
      {embedded && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid color-mix(in srgb, var(--accent-primary) 25%, transparent)',
            borderRadius: '14px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={18} style={{ color: 'var(--accent-primary)' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                Nhật ký kiểm toán hiện đã được tách thành mục độc lập tại thanh Menu chính
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Truy cập trực tiếp tại menu <strong>Nhật ký kiểm toán</strong> để sử dụng đầy đủ chế độ Radar bất thường, bộ lọc chuyên sâu và xuất báo cáo.
              </div>
            </div>
          </div>
          <NavLink
            to="/admin/audit-logs"
            className="btn btn-primary"
            style={{ fontSize: '0.8125rem', padding: '6px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>Mở trang Radar an ninh toàn màn hình</span>
            <ExternalLink size={13} />
          </NavLink>
        </div>
      )}

      {/* 2. Header Ribbon */}
      {!embedded && (
        <div className="audit-header-ribbon">
          <div className="audit-header-title-group">
            <div className="audit-header-icon">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h1 className="audit-header-title">Nhật ký kiểm toán</h1>
              <p className="audit-header-desc">
                Giám sát toàn diện lịch sử thao tác, truy vết biến động kho, can thiệp phân quyền và tự động phát hiện hành vi bất thường theo thời gian thực.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportJson}
              disabled={loading || logs.length === 0}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={14} />
              <span>Xuất JSON</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              disabled={loading}
              onClick={loadLogs}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Làm mới radar</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Executive 4-Card Apple Bento KPI Grid */}
      <div className="audit-kpi-grid">
        <div
          className={`audit-kpi-card ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => setFilterType('all')}
        >
          <div className="audit-kpi-bubble" style={{ background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)', color: 'var(--accent-primary)' }}>
            <History size={20} />
          </div>
          <div className="audit-kpi-meta">
            <span className="audit-kpi-label">Tổng sự kiện ghi nhận</span>
            <div className="audit-kpi-value" style={{ color: 'var(--accent-primary)' }}>{totalLogs}</div>
            <span className="audit-kpi-sub">Nhật ký truy vết hệ thống</span>
          </div>
        </div>

        <div
          className={`audit-kpi-card ${anomalyLogs.length > 0 ? 'has-danger' : ''}`}
          onClick={() => setFilterType('anomaly')}
        >
          <div
            className="audit-kpi-bubble"
            style={{
              background: 'rgba(255, 59, 48, 0.14)',
              color: '#ff3b30',
              animation: anomalyLogs.length > 0 ? 'radarPulse 2s infinite' : 'none'
            }}
          >
            <AlertTriangle size={20} />
          </div>
          <div className="audit-kpi-meta">
            <span className="audit-kpi-label" style={{ color: 'var(--accent-rose-text)' }}>Bất thường</span>
            <div className="audit-kpi-value" style={{ color: 'var(--accent-rose-text)' }}>{anomalyLogs.length}</div>
            <span className="audit-kpi-sub">Cần người quản lý rà soát</span>
          </div>
        </div>

        <div
          className="audit-kpi-card"
          onClick={() => setFilterType('night')}
        >
          <div className="audit-kpi-bubble" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
            <Moon size={20} />
          </div>
          <div className="audit-kpi-meta">
            <span className="audit-kpi-label">Thao tác đêm (22h - 5h)</span>
            <div className="audit-kpi-value" style={{ color: 'var(--text-primary)' }}>{nightLogs.length}</div>
            <span className="audit-kpi-sub">Ngoài giờ hành chính</span>
          </div>
        </div>

        <div
          className="audit-kpi-card"
          onClick={() => setFilterType('roles')}
        >
          <div className="audit-kpi-bubble" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
            <Shield size={20} />
          </div>
          <div className="audit-kpi-meta">
            <span className="audit-kpi-label">Quyền hạn và nhân sự</span>
            <div className="audit-kpi-value" style={{ color: 'var(--text-primary)' }}>{roleLogs.length}</div>
            <span className="audit-kpi-sub">Đổi vai trò, mật khẩu nội bộ</span>
          </div>
        </div>
      </div>

      {/* 4. Toolbar & Segmented Quick Filters */}
      <div className="audit-toolbar">
        <div className="audit-segmented-group">
          <button
            type="button"
            className={`audit-segment-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            <History size={13} />
            <span>Tất cả ({totalLogs})</span>
          </button>

          <button
            type="button"
            className={`audit-segment-btn ${filterType === 'anomaly' ? 'active is-critical' : ''}`}
            onClick={() => setFilterType('anomaly')}
          >
            <AlertOctagon size={13} style={{ color: '#ff3b30' }} />
            <span>Bất thường ({anomalyLogs.length})</span>
          </button>

          <button
            type="button"
            className={`audit-segment-btn ${filterType === 'night' ? 'active' : ''}`}
            onClick={() => setFilterType('night')}
          >
            <Moon size={13} />
            <span>Ngoài giờ ({nightLogs.length})</span>
          </button>

          <button
            type="button"
            className={`audit-segment-btn ${filterType === 'roles' ? 'active' : ''}`}
            onClick={() => setFilterType('roles')}
          >
            <Shield size={13} />
            <span>Quyền hạn ({roleLogs.length})</span>
          </button>

          <button
            type="button"
            className={`audit-segment-btn ${filterType === 'stock' ? 'active' : ''}`}
            onClick={() => setFilterType('stock')}
          >
            <Package size={13} />
            <span>Biến động kho ({stockLogs.length})</span>
          </button>

          <button
            type="button"
            className={`audit-segment-btn ${filterType === 'config' ? 'active' : ''}`}
            onClick={() => setFilterType('config')}
          >
            <Settings size={13} />
            <span>Cấu hình</span>
          </button>
        </div>

        <div className="audit-search-box">
          <Search size={15} className="audit-search-icon" />
          <input
            type="text"
            placeholder="Tìm theo người thực hiện, hành động, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 5. Audit Log Table Card */}
      <div className="audit-table-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="audit-table">
            <thead>
              <tr>
                <th style={{ width: '150px' }}>Mức độ</th>
                <th style={{ width: '180px' }}>Thời gian</th>
                <th style={{ width: '180px' }}>Người thực hiện</th>
                <th style={{ width: '180px' }}>Hành động</th>
                <th style={{ width: '160px' }}>Đối tượng tác động</th>
                <th>Phân tích</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                      <RefreshCw size={18} className="spin" />
                      <span>Đang nạp và phân tích nhật ký kiểm toán…</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    Không tìm thấy sự kiện kiểm toán nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const anomaly = anomaliesMap.get(log.id);
                  const isCrit = anomaly?.severity === 'critical';
                  const isWarn = anomaly?.severity === 'warning';

                  // Night detection helper
                  const d = log.created_at ? new Date(log.created_at) : null;
                  const localH = d ? (d.getUTCHours() + 7) % 24 : 12;
                  const isNightHour = localH >= 22 || localH < 5;

                  return (
                    <tr
                      key={log.id}
                      className={isCrit ? 'row-anomaly-critical' : isWarn ? 'row-anomaly-warning' : ''}
                    >
                      {/* 1. Radar Severity Badge */}
                      <td>
                        {isCrit ? (
                          <span className="audit-risk-badge audit-risk-critical">
                            <AlertOctagon size={12} /> Bất thường cao
                          </span>
                        ) : isWarn ? (
                          <span className="audit-risk-badge audit-risk-warning">
                            <AlertTriangle size={12} /> Cần lưu ý
                          </span>
                        ) : (
                          <span className="audit-risk-badge audit-risk-normal">
                            <CheckCircle2 size={12} /> Bình thường
                          </span>
                        )}
                      </td>

                      {/* 2. Timestamp */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {d ? d.toLocaleTimeString('vi-VN') : '—'}
                            {isNightHour && (
                              <span className="audit-night-tag" title="Thao tác được thực hiện đêm muộn ngoài giờ làm việc">
                                <Moon size={9} /> Đêm
                              </span>
                            )}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {d ? d.toLocaleDateString('vi-VN') : '—'}
                          </span>
                        </div>
                      </td>

                      {/* 3. Actor */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '8px',
                              background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                              color: 'var(--accent-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              flexShrink: 0
                            }}
                          >
                            {(log.actor?.full_name || 'AD')[0]?.toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {log.actor?.full_name || 'Quản trị viên'}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {log.actor?.role === 'super_admin' ? 'Quản lý cửa hàng' : log.actor?.role === 'product_manager' ? 'PO' : log.actor?.role || 'Hệ thống'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 4. Action */}
                      <td>
                        <span className={`audit-action-badge ${getActionClass(log.action)}`}>
                          {log.action}
                        </span>
                      </td>

                      {/* 5. Target Table & ID */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                            {log.target_table || '—'}
                          </span>
                          {log.target_id && (
                            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {String(log.target_id).slice(0, 8)}...
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Radar Analysis & Reasons */}
                      <td>
                        {anomaly?.isAnomaly && anomaly.reasons.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {anomaly.reasons.map((r, idx) => (
                              <span key={idx} className="audit-reason-tag">
                                {isCrit ? <AlertOctagon size={11} /> : <AlertTriangle size={11} />}
                                <span>{r}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Giao dịch vận hành chuẩn mực, không vi phạm chính sách an ninh.
                          </span>
                        )}
                      </td>

                      {/* 7. Inspect Button */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setInspectTarget(log)}
                          title="Soi chi tiết kỹ thuật (Inspect Payload)"
                          style={{
                            padding: '4px 8px',
                            borderRadius: '7px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Eye size={13} />
                          <span style={{ fontSize: '0.75rem' }}>Soi</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Apple Glass Slide-Over Inspection Drawer */}
      {inspectTarget && (
        <div className="audit-drawer-backdrop" onClick={() => setInspectTarget(null)}>
          <div className="audit-drawer-sheet" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="audit-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Eye size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                    Chi Tiết Bản Ghi Kiểm Toán
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace' }}>
                    ID: {inspectTarget.id}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setInspectTarget(null)}
                style={{ padding: '6px', borderRadius: '8px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="audit-drawer-body">
              {/* Radar Assessment Card */}
              {(() => {
                const a = anomaliesMap.get(inspectTarget.id);
                if (!a?.isAnomaly) {
                  return (
                    <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(52, 199, 89, 0.08)', border: '1px solid rgba(52, 199, 89, 0.25)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle2 size={20} style={{ color: 'var(--accent-emerald-text)', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-emerald-text)' }}>Đánh giá an toàn: Bình thường</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Không phát hiện dấu hiệu gian lận hay bất thường.</div>
                      </div>
                    </div>
                  );
                }
                const isCrit = a.severity === 'critical';
                return (
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: isCrit ? 'rgba(255, 59, 48, 0.08)' : 'rgba(255, 149, 0, 0.08)',
                      border: isCrit ? '1.5px solid rgba(255, 59, 48, 0.35)' : '1.5px solid rgba(255, 149, 0, 0.35)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      {isCrit ? <AlertOctagon size={18} style={{ color: '#ff3b30' }} /> : <AlertTriangle size={18} style={{ color: 'var(--accent-amber-text)' }} />}
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: isCrit ? '#ff3b30' : '#ea580c' }}>
                        Cảnh báo an ninh: {isCrit ? 'Nguy cơ cao' : 'Cần lưu ý'}
                      </span>
                    </div>
                    <ul style={{ margin: '6px 0 0', paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {a.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {/* General Metadata Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'var(--bg-surface, #f8f9fa)', borderRadius: '10px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Người thực hiện</span>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', marginTop: '2px', color: 'var(--text-primary)' }}>
                    {inspectTarget.actor?.full_name || 'Admin'}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Vai trò: {inspectTarget.actor?.role || 'super_admin'}
                  </span>
                </div>

                <div style={{ padding: '12px', background: 'var(--bg-surface, #f8f9fa)', borderRadius: '10px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Thời gian ghi nhận</span>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', marginTop: '2px', color: 'var(--text-primary)' }}>
                    {inspectTarget.created_at ? new Date(inspectTarget.created_at).toLocaleString('vi-VN') : '—'}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'ui-monospace, monospace' }}>
                    UTC+7 Vietnam
                  </span>
                </div>

                <div style={{ padding: '12px', background: 'var(--bg-surface, #f8f9fa)', borderRadius: '10px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Hành động (Action)</span>
                  <div style={{ marginTop: '4px' }}>
                    <span className={`audit-action-badge ${getActionClass(inspectTarget.action)}`}>
                      {inspectTarget.action}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--bg-surface, #f8f9fa)', borderRadius: '10px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Đối tượng (Target)</span>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', marginTop: '2px', color: 'var(--text-primary)' }}>
                    {inspectTarget.target_table}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace' }}>
                    ID: {inspectTarget.target_id || '—'}
                  </span>
                </div>
              </div>

              {/* JSON Metadata Payload Viewer */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Dữ liệu tham số chi tiết (Metadata Payload)
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleCopyJson(inspectTarget.meta)}
                    style={{ fontSize: '0.75rem', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  >
                    {copiedJson ? <CheckCircle2 size={12} style={{ color: 'var(--accent-emerald-text)' }} /> : <Copy size={12} />}
                    <span>{copiedJson ? 'Đã sao chép!' : 'Sao chép JSON'}</span>
                  </button>
                </div>

                <div className="audit-json-box">
                  {typeof inspectTarget.meta === 'object'
                    ? JSON.stringify(inspectTarget.meta, null, 2)
                    : inspectTarget.meta || 'Không có metadata kèm theo.'}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="audit-drawer-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setInspectTarget(null)}
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
