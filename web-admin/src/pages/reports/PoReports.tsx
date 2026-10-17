import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  Package,
  Layers,
  TrendingUp,
  DollarSign,
  Eye,
  Printer,
  X,
  ShieldCheck,
  FileCheck,
  FileDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../contexts/ToastContext';
import { adminRequest } from '../../services/adminRequest';
import { supabase } from '../../services/supabase';
import './po-reports.css';

const base = (import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');

interface PoProductItem {
  productName: string;
  variantName: string;
  sku: string;
  categoryName: string;
  price: number;
  stockQuantity: number;
  inventoryValue?: number;
  soldQuantity: number;
  revenue: number;
}

interface PoReportSummary {
  from: string;
  to: string;
  managerName: string;
  managerEmail: string;
  reportType?: string;
  totalProducts: number;
  totalVariants: number;
  totalStock: number;
  totalInventoryValue?: number;
  totalSold: number;
  totalRevenue: number;
  items: PoProductItem[];
}

const dateToday = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

const getPastDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

const formatVnd = (amount?: number | null) => {
  if (amount == null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export const PoReports: React.FC = () => {
  const { profile } = useAuth();
  const [reportType, setReportType] = useState<'REVENUE' | 'INVENTORY'>('REVENUE');
  const [from, setFrom] = useState(getPastDate(30));
  const [to, setTo] = useState(dateToday());
  const [summary, setSummary] = useState<PoReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // PDF Preview Modal
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await adminRequest<PoReportSummary>(`/reports/po/summary?from=${from}&to=${to}&type=${reportType}`);
      setSummary(data);
    } catch (e: any) {
      toast.error(e?.message || 'Không thể tải báo cáo hàng hóa', 'Lỗi tải báo cáo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [from, to, reportType]);

  const handleExport = async (format: 'PDF' | 'XLSX', isPreview = false) => {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${base}/reports/po/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ format, from, to, type: reportType })
      });

      if (!res.ok) {
        throw new Error(`Xuất báo cáo thất bại (HTTP ${res.status})`);
      }

      const blob = await res.blob();
      const prefix = reportType === 'INVENTORY' ? 'TonKho' : 'DoanhThu';
      const filename = `BaoCao_PO_${prefix}_${from}_${to}.${format.toLowerCase()}`;

      if (isPreview && format === 'PDF') {
        const url = URL.createObjectURL(blob);
        setPreviewBlob(blob);
        setPreviewPdfUrl(url);
        toast.info('Đang mở bản xem trước báo cáo PDF...', 'Xem trước JasperReports');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        toast.success(`Đã xuất báo cáo ${format} thành công!`, 'Tải file hoàn tất');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi khi xuất file', 'Lỗi xuất báo cáo');
    } finally {
      setExporting(false);
    }
  };

  const closePreview = () => {
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
    }
    setPreviewPdfUrl(null);
    setPreviewBlob(null);
  };

  const handlePrintPreview = () => {
    if (previewPdfUrl) {
      const iframe = document.getElementById('po-pdf-preview-frame') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
    }
  };

  return (
    <div className="page-body po-rep-page">
      {/* 1. Header */}
      <div className="po-rep-header">
        <div>
          <div className="po-rep-title-box">
            <div className="po-rep-title-icon">
              <FileCheck size={26} />
            </div>
            <div>
              <h1 className="po-rep-title">
                {reportType === 'INVENTORY'
                  ? 'Báo Cáo Tồn Kho & Định Mức PO'
                  : 'Báo Cáo Doanh Thu & Bán Hàng PO'}
              </h1>
              <p className="po-rep-subtitle">
                {reportType === 'INVENTORY'
                  ? 'Theo dõi số lượng hàng tồn, giá trị hàng hóa và định mức tồn kho các sản phẩm được phân quyền (Kết xuất qua JasperReports).'
                  : 'Báo cáo sản lượng bán ra, doanh thu phát sinh và tỷ trọng đóng góp từ các sản phẩm được giao phụ trách (Kết xuất qua JasperReports).'}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="po-rep-engine-badge">
            <FileText size={14} />
            <span>JasperReports 6.21.3</span>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading}
            onClick={() => void loadData()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Cập nhật</span>
          </button>
        </div>
      </div>

      {/* 1.5. Report Type Switcher Tabs */}
      <div style={{ display: 'flex', gap: '10px', margin: '6px 0 20px 0' }}>
        <button
          type="button"
          onClick={() => setReportType('REVENUE')}
          className={`btn ${reportType === 'REVENUE' ? 'btn-primary' : 'btn-secondary'}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 22px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.88rem',
            boxShadow: reportType === 'REVENUE' ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none'
          }}
        >
          <DollarSign size={16} />
          <span>Báo cáo Doanh thu & Bán hàng</span>
        </button>

        <button
          type="button"
          onClick={() => setReportType('INVENTORY')}
          className={`btn ${reportType === 'INVENTORY' ? 'btn-primary' : 'btn-secondary'}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 22px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.88rem',
            boxShadow: reportType === 'INVENTORY' ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none'
          }}
        >
          <Package size={16} />
          <span>Báo cáo Tồn kho & Định mức</span>
        </button>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="po-rep-kpi-grid">
        <div className="po-rep-kpi-card kpi-orange">
          <div className="po-rep-kpi-info">
            <span className="po-rep-kpi-label">Dòng sản phẩm</span>
            <span className="po-rep-kpi-value">{summary?.totalProducts ?? 0}</span>
            <span className="po-rep-kpi-subtext">Sản phẩm PO phụ trách</span>
          </div>
          <div className="po-rep-kpi-icon-box">
            <Package size={24} />
          </div>
        </div>

        <div className="po-rep-kpi-card kpi-blue">
          <div className="po-rep-kpi-info">
            <span className="po-rep-kpi-label">Tổng biến thể SKU</span>
            <span className="po-rep-kpi-value">{summary?.totalVariants ?? 0}</span>
            <span className="po-rep-kpi-subtext">Cấu hình kích cỡ / mẫu</span>
          </div>
          <div className="po-rep-kpi-icon-box">
            <Layers size={24} />
          </div>
        </div>

        {reportType === 'REVENUE' ? (
          <>
            <div className="po-rep-kpi-card kpi-emerald">
              <div className="po-rep-kpi-info">
                <span className="po-rep-kpi-label">Sản lượng đã xuất bán</span>
                <span className="po-rep-kpi-value">{summary?.totalSold ?? 0}</span>
                <span className="po-rep-kpi-subtext">Chiếc bán trong kỳ</span>
              </div>
              <div className="po-rep-kpi-icon-box">
                <TrendingUp size={24} />
              </div>
            </div>

            <div className="po-rep-kpi-card kpi-amber">
              <div className="po-rep-kpi-info">
                <span className="po-rep-kpi-label">Doanh thu phát sinh</span>
                <span className="po-rep-kpi-value" style={{ fontSize: '1.45rem' }}>
                  {formatVnd(summary?.totalRevenue ?? 0)}
                </span>
                <span className="po-rep-kpi-subtext">Thực thu từ đơn hàng</span>
              </div>
              <div className="po-rep-kpi-icon-box">
                <DollarSign size={24} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="po-rep-kpi-card kpi-emerald">
              <div className="po-rep-kpi-info">
                <span className="po-rep-kpi-label">Tổng tồn kho khả dụng</span>
                <span className="po-rep-kpi-value">{summary?.totalStock ?? 0}</span>
                <span className="po-rep-kpi-subtext">Chiếc sẵn sàng giao</span>
              </div>
              <div className="po-rep-kpi-icon-box">
                <TrendingUp size={24} />
              </div>
            </div>

            <div className="po-rep-kpi-card kpi-amber">
              <div className="po-rep-kpi-info">
                <span className="po-rep-kpi-label">Tổng giá trị tồn kho</span>
                <span className="po-rep-kpi-value" style={{ fontSize: '1.45rem' }}>
                  {formatVnd(summary?.totalInventoryValue ?? 0)}
                </span>
                <span className="po-rep-kpi-subtext">Giá trị lưu kho ước tính</span>
              </div>
              <div className="po-rep-kpi-icon-box">
                <DollarSign size={24} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. Toolbar: Date Filters & Export Actions */}
      <div className="po-rep-toolbar">
        <div className="po-rep-filters">
          <div className="po-rep-date-group">
            <Calendar size={15} color="var(--accent-primary)" />
            <span>Từ ngày:</span>
            <input
              type="date"
              className="po-rep-date-input"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div className="po-rep-date-group">
            <span>Đến ngày:</span>
            <input
              type="date"
              className="po-rep-date-input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div className="po-rep-quick-btns">
            <button
              type="button"
              className="po-rep-quick-btn"
              onClick={() => {
                setFrom(getPastDate(7));
                setTo(dateToday());
              }}
            >
              7 ngày
            </button>
            <button
              type="button"
              className="po-rep-quick-btn"
              onClick={() => {
                setFrom(getPastDate(30));
                setTo(dateToday());
              }}
            >
              30 ngày
            </button>
            <button
              type="button"
              className="po-rep-quick-btn"
              onClick={() => {
                const now = new Date();
                setFrom(`${now.getFullYear()}-01-01`);
                setTo(dateToday());
              }}
            >
              Từ đầu năm
            </button>
          </div>
        </div>

        <div className="po-rep-actions">
          {/* Xem trước PDF */}
          <button
            type="button"
            className="btn btn-secondary"
            disabled={exporting || loading}
            onClick={() => void handleExport('PDF', true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '10px',
              color: 'var(--accent-primary)',
              borderColor: 'rgba(37, 99, 235, 0.3)'
            }}
          >
            <Eye size={15} />
            <span>Xem trước PDF</span>
          </button>

          {/* Tải PDF */}
          <button
            type="button"
            className="btn btn-primary"
            disabled={exporting || loading}
            onClick={() => void handleExport('PDF', false)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '10px', fontWeight: 600 }}
          >
            <FileDown size={15} />
            <span>Tải Jasper PDF</span>
          </button>

          {/* Xuất Excel */}
          <button
            type="button"
            className="btn btn-secondary"
            disabled={exporting || loading}
            onClick={() => void handleExport('XLSX', false)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '10px',
              color: '#10b981',
              borderColor: 'rgba(16, 185, 129, 0.3)'
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Xuất Excel (XLSX)</span>
          </button>
        </div>
      </div>

      {/* 4. Data Table Preview */}
      <div className="po-rep-table-card">
        <div className="po-rep-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={17} color="var(--accent-primary)" />
            <span style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--text-primary)' }}>
              {reportType === 'INVENTORY'
                ? `Định mức tồn kho sản phẩm do ${summary?.managerName || 'bạn'} trực tiếp quản lý (${summary?.items.length ?? 0} SKU)`
                : `Sản lượng bán hàng & doanh thu do ${summary?.managerName || 'bạn'} trực tiếp quản lý (${summary?.items.length ?? 0} SKU)`}
            </span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Kỳ báo cáo: {from} &rarr; {to}
          </span>
        </div>

        <div className="po-rep-table-wrapper">
          <table className="po-rep-table">
            <thead>
              {reportType === 'INVENTORY' ? (
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
                  <th>Tên sản phẩm</th>
                  <th>Biến thể / Size</th>
                  <th style={{ width: '150px' }}>Mã SKU</th>
                  <th style={{ width: '160px' }}>Danh mục</th>
                  <th style={{ textAlign: 'right', width: '130px' }}>Đơn giá</th>
                  <th style={{ textAlign: 'center', width: '100px' }}>Tồn kho</th>
                  <th style={{ textAlign: 'right', width: '150px' }}>Giá trị tồn</th>
                  <th style={{ textAlign: 'center', width: '130px' }}>Tình trạng</th>
                </tr>
              ) : (
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
                  <th>Tên sản phẩm</th>
                  <th>Biến thể / Size</th>
                  <th style={{ width: '150px' }}>Mã SKU</th>
                  <th style={{ width: '160px' }}>Danh mục</th>
                  <th style={{ textAlign: 'right', width: '130px' }}>Đơn giá</th>
                  <th style={{ textAlign: 'center', width: '90px' }}>Tồn kho</th>
                  <th style={{ textAlign: 'center', width: '85px' }}>Đã bán</th>
                  <th style={{ textAlign: 'right', width: '140px' }}>Doanh số</th>
                </tr>
              )}
            </thead>
            <tbody>
              {summary && summary.items.length > 0 ? (
                summary.items.map((item, idx) => {
                  const invVal = item.inventoryValue ?? (item.price * item.stockQuantity);
                  const isOutOfStock = item.stockQuantity === 0;
                  const isLowStock = item.stockQuantity > 0 && item.stockQuantity <= 5;

                  return (
                    <tr key={item.sku + idx}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>
                        #{idx + 1}
                      </td>
                      <td>
                        <strong style={{ color: 'var(--text-primary)' }}>{item.productName}</strong>
                      </td>
                      <td>
                        <span style={{ color: 'var(--text-secondary)' }}>{item.variantName}</span>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.78rem', color: 'var(--accent-sky)' }}>{item.sku}</code>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.categoryName}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatVnd(item.price)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: item.stockQuantity > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: item.stockQuantity > 0 ? '#10b981' : '#ef4444',
                            fontWeight: 700,
                            fontSize: '0.82rem'
                          }}
                        >
                          {item.stockQuantity}
                        </span>
                      </td>

                      {reportType === 'INVENTORY' ? (
                        <>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {formatVnd(invVal)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {isOutOfStock ? (
                              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontSize: '0.75rem', fontWeight: 700 }}>
                                Hết hàng
                              </span>
                            ) : isLowStock ? (
                              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 700 }}>
                                Sắp hết hàng
                              </span>
                            ) : (
                              <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>
                                Đủ định mức
                              </span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: '#f59e0b' }}>
                            {item.soldQuantity}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                            {formatVnd(item.revenue)}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    {loading ? 'Đang tải dữ liệu báo cáo...' : 'Không có sản phẩm nào được giao cho tài khoản này quản lý.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. PDF Preview Modal (JasperReports Preview) */}
      {previewPdfUrl && (
        <div className="po-pdf-modal-overlay" onClick={closePreview}>
          <div className="po-pdf-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="po-pdf-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} color="var(--accent-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Xem Trước Báo Cáo Hàng Hóa PO (JasperReports PDF)
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handlePrintPreview}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Printer size={14} />
                  <span>In báo cáo</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => void handleExport('PDF', false)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={14} />
                  <span>Tải file PDF</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={closePreview}
                  style={{ padding: '6px' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <iframe
              id="po-pdf-preview-frame"
              src={previewPdfUrl}
              className="po-pdf-iframe"
              title="Bản xem trước báo cáo PDF"
            />
          </div>
        </div>
      )}
    </div>
  );
};
