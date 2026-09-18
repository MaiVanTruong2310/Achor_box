import React, { useState } from 'react';
import { warrantyApi } from '../api/warrantyApi';
import { WarrantyRecord } from '../types/warranty';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Search, ShieldCheck, CheckCircle2, AlertCircle, Wrench, Calendar, Cpu, Tag } from 'lucide-react';
import { PageHeroHeader } from '../components/layout/PageHeroHeader';

export const WarrantyPage: React.FC = () => {
  const [serialInput, setSerialInput] = useState('');
  const [record, setRecord] = useState<WarrantyRecord | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialInput.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const data = await warrantyApi.lookupBySerial(serialInput);
      setRecord(data);
    } catch (err) {
      console.error('Lỗi tra cứu', err);
      setRecord(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSampleClick = (serial: string) => {
    setSerialInput(serial);
    setLoading(true);
    setSearched(true);
    warrantyApi.lookupBySerial(serial).then((data) => {
      setRecord(data);
      setLoading(false);
    });
  };

  return (
    <>
      <PageHeroHeader
        badge="Hệ thống bảo hành điện tử 24/7"
        badgeIcon={<ShieldCheck size={13} />}
        title="Tra cứu bảo hành thiết bị"
        subtitle="Nhập số Serial Number (SN) in trên thân hộp Anchor Box để tra cứu thời hạn bảo hành, tình trạng kích hoạt và toàn bộ lịch sử bảo dưỡng kỹ thuật."
        breadcrumbs={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Tra cứu bảo hành' }
        ]}
        highlights={[
          'Bảo hành chính hãng 12 – 18 tháng',
          'Đổi mới 1-1 trong 30 ngày nếu lỗi NSX',
          'Lịch sử bảo dưỡng minh bạch',
          'Hỗ trợ kỹ thuật tại nhà toàn quốc'
        ]}
      />
      <div className="section" style={{ paddingTop: '32px' }}>
        <div className="container" style={{ maxWidth: '880px' }}>

          {/* Lookup Form */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              marginBottom: '28px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <form onSubmit={handleLookup} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                <Search
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                />
                <input
                  type="text"
                  placeholder="Ví dụ: SBOX-2026-001"
                  className="form-input"
                  style={{ paddingLeft: '42px', height: '44px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value)}
                />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ height: '44px' }}>
                {loading ? 'Đang kiểm tra...' : 'Kiểm tra'}
              </button>
            </form>

            {/* Helper quick lookup tags */}
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-muted)' }}>
              <span>Mã Serial tra cứu nhanh:</span>
              <button
                type="button"
                onClick={() => handleSampleClick('SBOX-2026-001')}
                style={{ color: 'var(--primary)', textDecoration: 'underline', fontWeight: 600 }}
              >
                SBOX-2026-001 (Bản Standard)
              </button>
              <span>&bull;</span>
              <button
                type="button"
                onClick={() => handleSampleClick('SBOX-2026-002')}
                style={{ color: 'var(--primary)', textDecoration: 'underline', fontWeight: 600 }}
              >
                SBOX-2026-002 (Bản Plus)
              </button>
            </div>
          </div>

          {/* Lookup Result View */}
          {loading ? (
            <LoadingSpinner message="Đang kiểm tra thông tin bảo hành..." />
          ) : searched && !record ? (
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '32px 24px',
                textAlign: 'center'
              }}
            >
              <AlertCircle size={32} style={{ color: 'var(--danger)', margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                Không tìm thấy số Serial
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto' }}>
                Mã Serial <strong>{serialInput}</strong> không tồn tại trong hệ thống bảo hành. Vui lòng kiểm tra lại tem dán trên thân máy.
              </p>
            </div>
          ) : record ? (
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
              }}
            >
              {/* Top Status Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Thông tin sản phẩm</span>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>{record.productName}</h2>
                </div>

                <div>
                  {record.status === 'ACTIVE' ? (
                    <Badge variant="emerald" style={{ fontSize: '13px', padding: '6px 12px' }}>
                      <CheckCircle2 size={15} /> Đang trong thời hạn bảo hành
                    </Badge>
                  ) : (
                    <Badge variant="rose" style={{ fontSize: '13px', padding: '6px 12px' }}>
                      <AlertCircle size={15} /> Đã hết hạn bảo hành
                    </Badge>
                  )}
                </div>
              </div>

              {/* Hardware & Warranty Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div style={{ backgroundColor: 'var(--bg-surface-secondary)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <Tag size={13} /> Số Serial (SN)
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: 'var(--primary)', marginTop: '4px' }}>
                    {record.serialNumber}
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-surface-secondary)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <Calendar size={13} /> Ngày kích hoạt
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                    {record.activationDate}
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-surface-secondary)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <Calendar size={13} /> Ngày hết hạn
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                    {record.expirationDate} ({record.warrantyPeriodMonths} tháng)
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-surface-secondary)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <Cpu size={13} /> Phiên bản thiết bị
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginTop: '4px' }}>
                    {record.hardwareVersion}
                  </div>
                </div>
              </div>

              {/* Service History */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px' }}>
                  <Wrench size={16} /> Lịch sử bảo dưỡng &amp; Cập nhật
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {record.serviceHistory.map((h, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 16px',
                        fontSize: '13.5px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          <span className="badge badge-blue" style={{ marginRight: '8px' }}>{h.type}</span>
                          {h.note}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Đơn vị thực hiện: {h.technician}
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {h.date}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};
