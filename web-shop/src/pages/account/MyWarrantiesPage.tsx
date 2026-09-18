import React, { useEffect, useState } from 'react';
import { warrantyApi } from '../../api/warrantyApi';
import { WarrantyRecord } from '../../types/warranty';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Badge } from '../../components/ui/Badge';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

export const MyWarrantiesPage: React.FC = () => {
  const [warranties, setWarranties] = useState<WarrantyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    warrantyApi.getMyWarranties().then((data) => {
      setWarranties(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <LoadingSpinner message="Đang tải danh sách thiết bị bảo hành..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
            Thiết bị &amp; Bảo hành điện tử
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Danh sách các bộ Anchor Box đã được kích hoạt bảo hành theo tài khoản.
          </p>
        </div>

        <Link to="/warranty" className="btn btn-secondary btn-sm">
          <Search size={14} /> Tra cứu Serial khác
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {warranties.map((w, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {w.productName}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: 'var(--primary)', marginTop: '2px' }}>
                  SN: {w.serialNumber}
                </div>
              </div>

              {w.status === 'ACTIVE' ? (
                <Badge variant="emerald">Còn bảo hành ({w.expirationDate})</Badge>
              ) : (
                <Badge variant="rose">Đã hết hạn ({w.expirationDate})</Badge>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Ngày kích hoạt:</span>
                <div style={{ fontWeight: 600 }}>{w.activationDate}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Thời hạn:</span>
                <div style={{ fontWeight: 600 }}>{w.warrantyPeriodMonths} tháng</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Phần cứng / Firmware:</span>
                <div style={{ fontWeight: 600 }}>{w.firmwareVersion}</div>
              </div>
            </div>

            {w.serviceHistory.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                <strong>Lần bảo trì gần nhất:</strong> {w.serviceHistory[w.serviceHistory.length - 1].note} ({w.serviceHistory[w.serviceHistory.length - 1].date})
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
