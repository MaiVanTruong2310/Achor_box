import React, { useEffect, useRef, useState } from 'react';
import {
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  FileText,
  AlertCircle,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { issueSalesInvoice, type SalesInvoice } from '../services/salesInvoiceApi';

interface SalesInvoiceModalProps {
  orderId: string;
  onClose: () => void;
  documentTitle?: string;
}

export const SalesInvoiceModal: React.FC<SalesInvoiceModalProps> = ({
  orderId,
  onClose,
  documentTitle = 'Hóa đơn bán hàng & Phiếu bàn giao'
}) => {
  const [invoice, setInvoice] = useState<SalesInvoice | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState<number>(1.0);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let active = true;
    setInvoice(null);
    setError('');
    setReady(false);
    issueSalesInvoice(orderId)
      .then((data) => {
        if (active) setInvoice(data);
      })
      .catch((e) => {
        if (active) setError(e.message || 'Không thể tạo hoặc tải hóa đơn.');
      });
    return () => {
      active = false;
    };
  }, [orderId, revision]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    if (!frame.current?.contentWindow) return;
    try {
      frame.current.contentWindow.focus();
      frame.current.contentWindow.print();
    } catch {
      window.print();
    }
  };

  const handleDownloadHtml = () => {
    if (!invoice) return;
    const url = URL.createObjectURL(
      new Blob([invoice.html], { type: 'text/html;charset=utf-8' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoice.invoiceNumber || 'hoa-don-' + orderId.slice(0, 8)}.html`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(1.5, Math.round((prev + 0.1) * 10) / 10));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.6, Math.round((prev - 0.1) * 10) / 10));
  const handleResetZoom = () => setZoom(1.0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={documentTitle}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2500,
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'appleFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <section
        style={{
          background: 'var(--bg-app, #f5f5f7)',
          borderRadius: 18,
          width: 'min(100%, 1160px)',
          height: '94vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 32px 80px -12px rgba(0, 0, 0, 0.6), 0 0 1px 1px rgba(255, 255, 255, 0.1)',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))'
        }}
      >
        {/* Apple HIG Top Toolbar */}
        <header
          style={{
            padding: '12px 20px',
            background: 'var(--bg-card, #ffffff)',
            borderBottom: '1px solid var(--border-subtle, rgba(0, 0, 0, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            zIndex: 10
          }}
        >
          {/* Document Title & Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'rgba(0, 122, 255, 0.1)',
                color: '#007aff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
                  }}
                >
                  {documentTitle}
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 650,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(52, 199, 89, 0.12)',
                    color: '#34c759',
                    border: '1px solid rgba(52, 199, 89, 0.25)'
                  }}
                >
                  Khổ A4 Chuẩn
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 2 }}>
                Đơn hàng: <strong style={{ color: 'var(--text-primary)' }}>#{orderId.slice(0, 8).toUpperCase()}</strong>
                {invoice?.invoiceNumber && (
                  <span style={{ marginLeft: 8 }}>
                    · Số HĐ: <strong>{invoice.invoiceNumber}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Zoom Controls */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              background: 'rgba(120, 120, 128, 0.1)',
              padding: '3px 6px',
              borderRadius: 999
            }}
          >
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 0.6}
              title="Thu nhỏ (-10%)"
              style={{
                background: 'none',
                border: 'none',
                cursor: zoom <= 0.6 ? 'not-allowed' : 'pointer',
                opacity: zoom <= 0.6 ? 0.4 : 1,
                color: 'var(--text-primary)',
                padding: '4px 6px',
                borderRadius: 999,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              title="Đặt lại 100%"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                padding: '2px 8px',
                minWidth: 44,
                textAlign: 'center'
              }}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 1.5}
              title="Phóng to (+10%)"
              style={{
                background: 'none',
                border: 'none',
                cursor: zoom >= 1.5 ? 'not-allowed' : 'pointer',
                opacity: zoom >= 1.5 ? 0.4 : 1,
                color: 'var(--text-primary)',
                padding: '4px 6px',
                borderRadius: 999,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Primary Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={handleDownloadHtml}
              disabled={!invoice}
              title="Tải tệp HTML về máy"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 999,
                border: '1px solid var(--border-subtle, rgba(0, 0, 0, 0.15))',
                background: 'var(--bg-surface, #ffffff)',
                color: 'var(--text-primary)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: invoice ? 'pointer' : 'not-allowed',
                opacity: invoice ? 1 : 0.5,
                transition: 'all 0.15s ease'
              }}
            >
              <Download size={14} />
              <span>Tải HTML</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!ready}
              title="In trực tiếp ra máy in hoặc Lưu dưới dạng PDF chuẩn A4"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 16px',
                borderRadius: 999,
                border: 'none',
                background: '#007aff',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: 650,
                cursor: ready ? 'pointer' : 'not-allowed',
                opacity: ready ? 1 : 0.6,
                boxShadow: '0 4px 14px rgba(0, 122, 255, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              <Printer size={15} />
              <span>In A4 / Lưu PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng bản xem trước"
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                border: 'none',
                background: 'rgba(120, 120, 128, 0.12)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 4,
                transition: 'all 0.15s ease'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Paper Studio Workspace (Grey Desk Canvas) */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            background: 'var(--bg-app, #e5e5ea)',
            padding: '32px 16px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start'
          }}
        >
          {error ? (
            <div
              style={{
                background: 'var(--bg-card, #ffffff)',
                borderRadius: 14,
                padding: '32px',
                maxWidth: 480,
                textAlign: 'center',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)'
              }}
            >
              <AlertCircle size={36} color="#ef4444" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>Không thể tải hóa đơn</h4>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{error}</p>
              <button
                type="button"
                className="btn-primary-compact"
                onClick={() => setRevision((r) => r + 1)}
                style={{ padding: '8px 18px', borderRadius: 999 }}
              >
                <RefreshCw size={14} style={{ marginRight: 6 }} /> Thử lại
              </button>
            </div>
          ) : !invoice ? (
            <div
              style={{
                background: 'var(--bg-card, #ffffff)',
                borderRadius: 14,
                padding: '40px 60px',
                textAlign: 'center',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                color: 'var(--text-secondary)'
              }}
            >
              <RefreshCw size={28} className="spin" style={{ color: '#007aff', margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                Đang lập hóa đơn &amp; tạo bản in A4…
              </div>
              <div style={{ fontSize: '12px' }}>Trích xuất thông số kỹ thuật, bảo hành và số tiền từ hệ thống.</div>
            </div>
          ) : (
            /* Authentic A4 Paper Sheet Frame */
            <div
              style={{
                width: '210mm',
                minHeight: '297mm',
                maxWidth: '96%',
                background: '#ffffff',
                boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.28), 0 2px 8px rgba(0, 0, 0, 0.08)',
                borderRadius: 4,
                border: '1px solid rgba(0, 0, 0, 0.12)',
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease',
                position: 'relative'
              }}
            >
              <iframe
                ref={frame}
                title="Bản in A4 Hóa đơn bán hàng & Phiếu nghiệm thu"
                sandbox="allow-same-origin allow-modals"
                srcDoc={invoice.html}
                onLoad={() => setReady(true)}
                style={{
                  width: '100%',
                  height: '297mm',
                  minHeight: '100%',
                  border: 'none',
                  display: 'block'
                }}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
