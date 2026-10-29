import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminRequest } from '../../services/adminRequest';
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  User,
  Phone,
  RefreshCw,
  ArrowLeft,
  Calendar,
  Box
} from 'lucide-react';

export const WarrantyLookupPage: React.FC = () => {
  const [serial, setSerial] = useState('');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setData(null);
    setError('');

    let value = serial.trim();
    try {
      const url = new URL(value);
      value = url.searchParams.get('serial') || value;
    } catch {
      /* Plain serial string */
    }

    try {
      const res = await adminRequest<any>(`/warranties/lookup?${new URLSearchParams({ serial: value })}`);
      setData(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header */}
      <div className="fpt-page-header">
        <div className="fpt-page-title">
          <div className="fpt-page-icon" style={{ background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)' }}>
            <QrCode size={22} />
          </div>
          <div>
            <h1>Tra Cứu Bảo Hành Thiết Bị</h1>
            <p className="fpt-page-desc">
              Nhập mã số Serial trên tem nhãn hoặc dán toàn bộ đường dẫn quét từ mã QR gắn trên tủ SmartBox.
            </p>
          </div>
        </div>

        <div>
          <Link to="/warranties" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={15} />
            <span>Danh sách yêu cầu</span>
          </Link>
        </div>
      </div>

      {/* 2. Lookup Box Card */}
      <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
        <form onSubmit={handleLookup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Mã Serial thiết bị hoặc Đường dẫn quét QR
          </label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div className="fpt-search-input" style={{ maxWidth: 'none' }}>
              <Search size={18} className="fpt-search-icon" />
              <input
                required
                maxLength={1000}
                placeholder="Ví dụ: SB-PRO-2026-X8921 hoặc https://smartbox.vn/qr?serial=..."
                value={serial}
                onChange={e => setSerial(e.target.value)}
                style={{ height: '44px', fontSize: '0.95rem' }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !serial.trim()}
              style={{ height: '44px', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {loading ? <RefreshCw size={16} className="spin" /> : <Search size={16} />}
              <span>{loading ? 'Đang tra cứu…' : 'Tra cứu ngay'}</span>
            </button>
          </div>
          <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
            Thông tin cá nhân của khách hàng sẽ được che bảo mật theo quy định bảo vệ dữ liệu.
          </span>
        </form>
      </div>

      {/* 3. Alerts */}
      {error && (
        <div className="card" style={{ padding: '14px 18px', background: 'var(--fpt-rose-soft)', borderColor: 'var(--fpt-rose)', color: 'var(--fpt-rose)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Results Display */}
      {data && (
        <div className="card" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span className={`fpt-badge ${data.isValid ? 'fpt-badge-success' : 'fpt-badge-danger'}`}>
                  {data.isValid ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                  <span>{data.statusLabel || data.status}</span>
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  SERIAL: {data.serialNumber}
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {data.productName} · {data.variantName}
              </h2>
            </div>

            <div style={{ background: data.isValid ? 'var(--fpt-emerald-soft)' : 'var(--fpt-rose-soft)', padding: '10px 16px', borderRadius: '12px', textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: data.isValid ? 'var(--fpt-emerald)' : 'var(--fpt-rose)', fontWeight: 700, textTransform: 'uppercase' }}>
                Thời hạn bảo hành
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: data.isValid ? 'var(--fpt-emerald)' : 'var(--fpt-rose)' }}>
                {data.isValid ? `Còn ${data.remainingDays} ngày` : 'Hết hạn bảo hành'}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Cột 1: Thông số bảo hành */}
            <div style={{ background: 'var(--bg-surface)', padding: '18px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--fpt-orange)', letterSpacing: '0.04em' }}>
                Thông tin thời hạn
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                <span>Ngày kích hoạt: <strong>{data.startDate || 'Chưa kích hoạt'}</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                <Clock size={16} style={{ color: 'var(--text-muted)' }} />
                <span>Ngày hết hạn: <strong>{data.endDate || 'Chưa có'}</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                <Box size={16} style={{ color: 'var(--text-muted)' }} />
                <span>Tình trạng: <strong style={{ color: data.isValid ? 'var(--fpt-emerald)' : 'var(--fpt-rose)' }}>{data.isValid ? 'Bảo hành chính hãng hợp lệ' : 'Đã hết hạn hoặc chưa kích hoạt'}</strong></span>
              </div>
            </div>

            {/* Cột 2: Thông tin chủ sở hữu */}
            <div style={{ background: 'var(--bg-surface)', padding: '18px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--fpt-blue)', letterSpacing: '0.04em' }}>
                Chủ sở hữu & Vị trí
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                <User size={16} style={{ color: 'var(--text-muted)' }} />
                <span>Khách hàng: <strong>{data.ownerNameMasked || '—'}</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                <Phone size={16} style={{ color: 'var(--text-muted)' }} />
                <span>Số điện thoại: <strong>{data.ownerPhoneMasked || '—'}</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                <MapPin size={16} style={{ color: 'var(--text-muted)' }} />
                <span>Vị trí lắp đặt: <strong>{data.locationLabel || '—'}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
