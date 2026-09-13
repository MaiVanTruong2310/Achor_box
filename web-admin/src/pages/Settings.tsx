import React, { useState, useEffect } from 'react';
import { Settings, Shield, Bell, CreditCard, Truck, Save, Mail, CheckCircle2, Sparkles } from 'lucide-react';
import { settingsService } from '../services/api';
import { TemplateManager } from '../components/TemplateManager';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'templates'>('general');

  const [stdWarranty, setStdWarranty] = useState('12 tháng');
  const [proWarranty, setProWarranty] = useState('24 tháng');
  const [enableCod, setEnableCod] = useState(true);
  const [enableVnpay, setEnableVnpay] = useState(true);
  const [enableMomo, setEnableMomo] = useState(true);
  const [shippingPartner, setShippingPartner] = useState('Giao Hàng Tiết Kiệm (GHTK)');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const data = await settingsService.getSettings();
      if (data.warranty_policy) {
        setStdWarranty(data.warranty_policy.std_months ? `${data.warranty_policy.std_months} tháng` : '12 tháng');
        setProWarranty(data.warranty_policy.pro_months ? `${data.warranty_policy.pro_months} tháng` : '24 tháng');
      }
    };
    loadSettings();
  }, []);

  const handleSaveGeneral = async () => {
    setSaving(true);
    await settingsService.saveSetting('warranty_policy', { std_months: parseInt(stdWarranty) || 12, pro_months: parseInt(proWarranty) || 24 });
    await settingsService.saveSetting('payment_methods', { cod: enableCod, vnpay: enableVnpay, momo: enableMomo, partner: shippingPartner });
    setSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="page-body">
      {/* Header Section */}
      <div className="section-header" style={{ marginBottom: '20px' }}>
        <div className="section-title-group">
          <div className="section-icon" style={{ background: 'var(--accent-primary-soft)', color: 'var(--accent-primary)' }}>
            <Settings size={24} />
          </div>
          <div>
            <h2>Cấu Hình Hệ Thống</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
              Thiết lập chính sách bảo hành, cổng thanh toán (MoMo, VNPay), đơn vị vận chuyển và trung tâm mẫu thông báo.
            </p>
          </div>
        </div>

        {activeTab === 'general' && (
          <button className="btn btn-primary" onClick={handleSaveGeneral} disabled={saving}>
            {savedSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />}
            <span>{saving ? 'Đang lưu...' : savedSuccess ? 'Đã lưu CSDL!' : 'Lưu Thay Đổi'}</span>
          </button>
        )}
      </div>

      {/* TABS NAVIGATION */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '12px',
          marginBottom: '20px'
        }}
      >
        <button
          type="button"
          className={`btn ${activeTab === 'general' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '9999px', padding: '8px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setActiveTab('general')}
        >
          <Settings size={16} />
          <span>Cài Đặt Chung & Vận Chuyển</span>
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'templates' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '9999px', padding: '8px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setActiveTab('templates')}
        >
          <Mail size={16} color={activeTab === 'templates' ? '#ffffff' : 'var(--accent-sky)'} />
          <span>Mẫu Thông Báo (Templates Center)</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'general' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {/* Module 1: Warranty Policy Settings */}
          <div className="card card-animated" style={{ animationDelay: '0ms' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={20} style={{ color: 'var(--accent-emerald)' }} />
              Chính sách bảo hành mặc định
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Smart Delivery Box Standard
                </label>
                <select className="input-field" value={stdWarranty} onChange={e => setStdWarranty(e.target.value)}>
                  <option>6 tháng</option>
                  <option>12 tháng</option>
                  <option>18 tháng</option>
                  <option>24 tháng</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Smart Delivery Box Pro & Phụ kiện
                </label>
                <select className="input-field" value={proWarranty} onChange={e => setProWarranty(e.target.value)}>
                  <option>12 tháng</option>
                  <option>24 tháng</option>
                  <option>36 tháng</option>
                </select>
              </div>
            </div>
          </div>

          {/* Module 2: Payment & Shipping */}
          <div className="card card-animated" style={{ animationDelay: '60ms' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CreditCard size={20} style={{ color: 'var(--accent-primary)' }} />
              Cổng thanh toán & Vận chuyển
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={enableCod} onChange={e => setEnableCod(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }} />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>Bật thanh toán khi nhận hàng (COD)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={enableVnpay} onChange={e => setEnableVnpay(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }} />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>Bật cổng thanh toán VNPay QR</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={enableMomo} onChange={e => setEnableMomo(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }} />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>Bật ví điện tử MoMo</span>
              </label>

              <div style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Đơn vị vận chuyển đối tác
                </label>
                <select className="input-field" value={shippingPartner} onChange={e => setShippingPartner(e.target.value)}>
                  <option>Giao Hàng Tiết Kiệm (GHTK)</option>
                  <option>Viettel Post</option>
                  <option>Tự giao hàng nội bộ</option>
                </select>
              </div>
            </div>
          </div>

          {/* Module 3: Quick Template Access Card */}
          <div className="card card-animated" style={{ animationDelay: '120ms', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bell size={20} style={{ color: 'var(--accent-amber)' }} />
                Mẫu thông báo tự động (Templates)
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Hệ thống hỗ trợ 6 mẫu thông báo đa kênh chuẩn (Email OTP, Xác nhận đơn hàng, Xuất kho, Bưu kiện vào hộp, Nghiệm thu bảo hành, Cảnh báo IoT).
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={() => setActiveTab('templates')}
            >
              <Sparkles size={16} color="var(--accent-sky)" />
              <span>Mở Trung Tâm Quản Lý Mẫu Thông Báo &rarr;</span>
            </button>
          </div>
        </div>
      ) : (
        <TemplateManager embedded={true} />
      )}
    </div>
  );
};