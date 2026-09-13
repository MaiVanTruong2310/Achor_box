import React, { useState, useEffect } from 'react';
import { History, Shield, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { AuditLog } from '../types/database';
import { auditLogsService } from '../services/api';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadLogs = async () => {
    setLoading(true);
    const data = await auditLogsService.getLogs();
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <History size={24} color="var(--primary)" />
          Module 8: Nhật Ký Thao Tác Quản Trị (Audit Logs)
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Truy vết toàn bộ các hành động nhạy cảm: sửa đổi đơn hàng, phân công bảo hành, đẩy firmware OTA và khóa tài khoản.
        </p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '14px 20px', fontWeight: 600 }}>THỜI GIAN</th>
              <th style={{ padding: '14px 20px', fontWeight: 600 }}>NGƯỜI THỰC HIỆN</th>
              <th style={{ padding: '14px 20px', fontWeight: 600 }}>HÀNH ĐỘNG</th>
              <th style={{ padding: '14px 20px', fontWeight: 600 }}>ĐỐI TƯỢNG (TABLE / ID)</th>
              <th style={{ padding: '14px 20px', fontWeight: 600 }}>CHI TIẾT THAY ĐỔI (METADATA)</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '16px 20px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                  {log.created_at}
                </td>

                <td style={{ padding: '16px 20px', fontWeight: 600, color: '#fff' }}>
                  {log.actor?.full_name}
                </td>

                <td style={{ padding: '16px 20px' }}>
                  <span className="badge badge-role" style={{ fontFamily: 'monospace' }}>
                    {log.action}
                  </span>
                </td>

                <td style={{ padding: '16px 20px', fontSize: '0.8125rem' }}>
                  <div><strong style={{ color: '#fff' }}>{log.target_table}</strong></div>
                  <div style={{ color: 'var(--text-muted)' }}>ID: {log.target_id}</div>
                </td>

                <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#38bdf8' }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {JSON.stringify(log.meta, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
