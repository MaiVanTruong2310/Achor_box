import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  CreditCard,
  Truck,
  BellRing,
  Server,
  History,
  ShieldCheck,
  Database,
  Cpu,
  Radio,
  CheckCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { TemplateManager } from '../../components/TemplateManager';
import { AdminCatalogSettings } from '../../components/AdminCatalogSettings';
import { AuditLogsPage } from './AuditLogs';

type SettingsTab = 'payment' | 'shipping' | 'templates' | 'audit' | 'infrastructure';

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'payment', label: 'Phương thức thanh toán', icon: <CreditCard size={15} /> },
  { id: 'shipping', label: 'Giao hàng & Lắp đặt', icon: <Truck size={15} /> },
  { id: 'templates', label: 'Mẫu thông báo & Email', icon: <BellRing size={15} /> },
  { id: 'audit', label: 'Nhật ký thao tác', icon: <History size={15} /> },
  { id: 'infrastructure', label: 'Hạ tầng & Cổng dịch vụ', icon: <Server size={15} /> }
];

export const SettingsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as SettingsTab) || 'payment';
  const [tab, setTab] = useState<SettingsTab>(
    ['payment', 'shipping', 'templates', 'audit', 'infrastructure'].includes(initialTab) ? initialTab : 'payment'
  );
  const [infraRefreshing, setInfraRefreshing] = useState(false);
  const [infraTimestamp, setInfraTimestamp] = useState(new Date().toLocaleTimeString('vi-VN'));

  const handleRefreshInfra = () => {
    setInfraRefreshing(true);
    setTimeout(() => {
      setInfraTimestamp(new Date().toLocaleTimeString('vi-VN'));
      setInfraRefreshing(false);
    }, 600);
  };

  return (
    <div className="page-body" style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '30px' }}>
      {/* 1. Header Section - Compact */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(14, 165, 233, 0.15))',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)'
            }}
          >
            <SettingsIcon size={17} />
          </div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Cấu hình hệ thống & Dịch vụ
          </h1>
        </div>

        {/* Global environment badge - Compact */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 10px',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'rgba(16, 185, 129, 0.1)',
            color: 'var(--accent-emerald)',
            border: '1px solid rgba(16, 185, 129, 0.25)'
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--accent-emerald)',
              boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)'
            }}
          />
          Sandbox
        </span>
      </div>

      {/* 2. Compact Single-Row Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          padding: '4px',
          background: 'var(--bg-card)',
          borderRadius: '10px',
          border: '1px solid var(--border-subtle)',
          marginBottom: '16px',
          overflowX: 'auto'
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: tab === t.id ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: tab === t.id ? 'var(--accent-primary)' : 'transparent',
              color: tab === t.id ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: tab === t.id ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
              whiteSpace: 'nowrap'
            }}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* 3. Tab Content */}
      {tab === 'payment' && <AdminCatalogSettings forcedKind="payment-methods" />}

      {tab === 'shipping' && <AdminCatalogSettings forcedKind="shipping-methods" />}

      {tab === 'templates' && <TemplateManager embedded />}

      {tab === 'audit' && <AuditLogsPage embedded />}

      {tab === 'infrastructure' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Status bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 20px',
              borderRadius: '12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Radio size={18} color="var(--accent-emerald)" />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Tất cả các dịch vụ nền tảng & cổng thanh toán, hóa đơn đang hoạt động ổn định
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Cập nhật lúc: {infraTimestamp}</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleRefreshInfra}
                disabled={infraRefreshing}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', fontSize: '0.8rem' }}
              >
                <RefreshCw size={13} className={infraRefreshing ? 'spin' : ''} />
                Kiểm tra lại
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* Card 1: VNPay Sandbox Gateway */}
            <div
              className="card"
              style={{
                padding: '22px',
                borderRadius: '14px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(37, 99, 235, 0.1)',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Cổng VNPAY QR Gateway
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Mã TMNC: SmartBox Merchant</span>
                  </div>
                </div>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: 'var(--accent-emerald)',
                    border: '1px solid rgba(16, 185, 129, 0.25)'
                  }}
                >
                  Đang hoạt động
                </span>
              </div>

              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Hỗ trợ thanh toán QR đa ngân hàng, thẻ ATM nội địa và thẻ thanh toán quốc tế qua chuẩn kết nối SHA-512 HMAC checksum.
              </p>

              <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Gateway Endpoint:</span>
                  <code style={{ color: 'var(--accent-sky)' }}>sandbox.vnpayment.vn</code>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Thời gian hiệu lực URL:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>15 phút</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Webhook IPN:</span>
                  <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>/api/payments/vnpay/ipn</span>
                </div>
              </div>
            </div>

            {/* Card 2: MQTT Broker & IoT Hub */}
            <div
              className="card"
              style={{
                padding: '22px',
                borderRadius: '14px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(14, 165, 233, 0.1)',
                      color: 'var(--accent-sky)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Nghiệm Thu & Bảo Hành Điện Tử
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Cơ chế cấp & tra cứu bảo hành tự động</span>
                  </div>
                </div>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: 'var(--accent-emerald)',
                    border: '1px solid rgba(16, 185, 129, 0.25)'
                  }}
                >
                  Hoạt động 100%
                </span>
              </div>

              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Tự động phát hành thẻ bảo hành điện tử theo mã Serial khi đơn hàng hoàn tất nghiệm thu bàn giao và tra cứu tức thì qua mã QR.
              </p>

              <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Định dạng mã tra cứu:</span>
                  <code style={{ color: 'var(--accent-sky)' }}>SERIAL / QR-CODE</code>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Kích hoạt bảo hành:</span>
                  <code style={{ color: 'var(--accent-emerald)' }}>Tự động khi bàn giao</code>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Xử lý khiếu nại:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Điều phối Kỹ thuật viên</span>
                </div>
              </div>
            </div>

            {/* Card 3: Storage & Invoice Engine */}
            <div
              className="card"
              style={{
                padding: '22px',
                borderRadius: '14px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      color: 'var(--accent-amber)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Database size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Cơ sở dữ liệu & Xuất hóa đơn
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>PostgreSQL & OpenPDF Generator</span>
                  </div>
                </div>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: 'var(--accent-emerald)',
                    border: '1px solid rgba(16, 185, 129, 0.25)'
                  }}
                >
                  Sẵn sàng
                </span>
              </div>

              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Lưu trữ toàn vẹn lịch sử giao dịch đơn hàng, audit log phê duyệt PO, bảng mã serial thiết bị và kết xuất Hóa đơn bán hàng VAT tự động.
              </p>

              <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Định dạng xuất hóa đơn:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>PDF chuẩn Vector tiếng Việt UTF-8</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Thuế suất VAT cấu hình:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>10% (Theo quy chuẩn Nhà Nước)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Audit Log Isolation:</span>
                  <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>Read Committed + Repeatable Read</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
