import React, { useState, useEffect } from 'react';
import { History, RefreshCw } from 'lucide-react';
import { AuditLog } from '../../types/database';
import { auditLogsService } from '../../services/api';

export const AuditLogsPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await auditLogsService.getLogs();
      setLogs(data);
    } catch (e) {
      console.error('Lỗi tải nhật ký thao tác:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {!embedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(37, 99, 235, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)'
              }}
            >
              <History size={17} />
            </div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Nhật ký thao tác quản trị (Audit Logs)
            </h1>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadLogs}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', padding: '6px 14px', borderRadius: '8px' }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            Làm mới
          </button>
        </div>
      )}

      <div
        className="card"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)'
        }}
      >
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              Lịch sử thao tác ({logs.length})
            </span>
          </div>
          {embedded && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={loadLogs}
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8125rem', padding: '5px 12px', borderRadius: '8px' }}
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
              Làm mới
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', margin: 0, fontSize: '0.83rem' }}>
            <thead>
              <tr>
                <th style={{ width: '160px', padding: '10px 14px' }}>Thời gian</th>
                <th style={{ width: '180px', padding: '10px 14px' }}>Người thực hiện</th>
                <th style={{ width: '160px', padding: '10px 14px' }}>Hành động</th>
                <th style={{ width: '180px', padding: '10px 14px' }}>Đối tượng</th>
                <th style={{ padding: '10px 14px' }}>Chi tiết (Metadata)</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {log.created_at ? new Date(log.created_at).toLocaleString('vi-VN') : '—'}
                  </td>

                  <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {log.actor?.full_name || 'Hệ thống'}
                  </td>

                  <td style={{ padding: '10px 14px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        fontFamily: 'var(--font-mono)',
                        background: 'rgba(37, 99, 235, 0.1)',
                        color: 'var(--accent-primary)',
                        border: '1px solid rgba(37, 99, 235, 0.2)'
                      }}
                    >
                      {log.action}
                    </span>
                  </td>

                  <td style={{ padding: '10px 14px', fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.target_table}</div>
                    {log.target_id && (
                      <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>
                        ID: {String(log.target_id).slice(0, 8)}...
                      </div>
                    )}
                  </td>

                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--accent-sky)' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '80px', overflowY: 'auto' }}>
                      {typeof log.meta === 'object' ? JSON.stringify(log.meta, null, 2) : log.meta || '—'}
                    </pre>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                    Chưa có nhật ký thao tác nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
