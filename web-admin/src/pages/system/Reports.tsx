import React, { useEffect, useState, useRef } from 'react';
import { exportRevenue, reportDefinition, type ReportDefinition } from '../../services/reportApi';
import {
  FileText,
  Download,
  Calendar,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  TrendingUp,
  Clock,
  ShieldCheck,
  FileDown,
  Trash2,
  RotateCcw,
  Eye,
  Printer,
  X
} from 'lucide-react';
import { toast } from '../../contexts/ToastContext';
import './reports.css';

interface ExportedReportItem {
  id: string;
  fileName: string;
  format: 'PDF' | 'XLSX';
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  customerId?: string;
  exportedAt: string; // ISO string
  fileSizeBytes?: number;
}

const dateToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const getPastDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

const getStartOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

// Chuyển đổi YYYY-MM-DD sang dd/mm/yyyy
const formatIsoToDdMmYyyy = (iso: string): string => {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return iso;
};

// Phân tích cú pháp dd/mm/yyyy thành YYYY-MM-DD
const parseDdMmYyyyToIso = (val: string): string | null => {
  const m = val.trim().match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const month = m[2].padStart(2, '0');
  const year = m[3];
  const d = parseInt(day, 10);
  const mo = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null;
  return `${year}-${month}-${day}`;
};

const formatBytes = (bytes?: number): string => {
  if (!bytes || bytes === 0) return '—';
  if (bytes < 1024) return bytes + ' B';
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(1) + ' KB';
  const mb = kb / 1024;
  return mb.toFixed(2) + ' MB';
};

const formatDateTime = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}:${secs}`;
  } catch {
    return isoString;
  }
};

/**
 * Thành phần DatePicker định dạng dd/mm/yyyy
 */
const DateInputDdMmYyyy: React.FC<{
  label: string;
  required?: boolean;
  value: string; // YYYY-MM-DD
  onChange: (isoDate: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
}> = ({ label, required, value, onChange, min, max, disabled }) => {
  const hiddenDateRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => formatIsoToDdMmYyyy(value));

  useEffect(() => {
    setText(formatIsoToDdMmYyyy(value));
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);
    const iso = parseDdMmYyyyToIso(val);
    if (iso) {
      onChange(iso);
    }
  };

  const handleBlur = () => {
    const iso = parseDdMmYyyyToIso(text);
    if (iso) {
      onChange(iso);
      setText(formatIsoToDdMmYyyy(iso));
    } else {
      setText(formatIsoToDdMmYyyy(value));
    }
  };

  const openPicker = () => {
    if (disabled) return;
    try {
      hiddenDateRef.current?.showPicker?.();
    } catch {
      hiddenDateRef.current?.focus();
    }
  };

  return (
    <div className="fpt-form-group">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <label style={{ margin: 0, fontWeight: 600 }}>
          {label} {required && '*'}
        </label>
        <span style={{ fontSize: '0.72rem', color: 'var(--accent-sky)', fontWeight: 600, background: 'rgba(2, 132, 199, 0.08)', padding: '2px 8px', borderRadius: '4px' }}>
          dd/mm/yyyy
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          value={text}
          onChange={handleTextChange}
          onBlur={handleBlur}
          placeholder="dd/mm/yyyy (vd: 16/10/2026)"
          disabled={disabled}
          style={{
            width: '100%',
            padding: '9px 40px 9px 12px',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.4px',
            borderRadius: '8px',
          }}
        />
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          title="Mở lịch chọn ngày"
          aria-label="Mở lịch chọn ngày"
          style={{
            position: 'absolute',
            right: '6px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Calendar size={18} />
        </button>
        <input
          ref={hiddenDateRef}
          type="date"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          onChange={e => {
            if (e.target.value) {
              onChange(e.target.value);
              setText(formatIsoToDdMmYyyy(e.target.value));
            }
          }}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '1px',
            height: '1px',
            opacity: 0,
            pointerEvents: 'none',
          }}
          tabIndex={-1}
        />
      </div>
    </div>
  );
};

export const ReportsPage: React.FC = () => {
  const [definition, setDefinition] = useState<ReportDefinition | null>(null);
  const [from, setFrom] = useState(dateToday);
  const [to, setTo] = useState(dateToday);
  const [customer, setCustomer] = useState('');
  const [format, setFormat] = useState<'PDF' | 'XLSX'>('PDF');
  const [busy, setBusy] = useState(false);
  const [reDownloadingId, setReDownloadingId] = useState<string>('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Lịch sử tệp đã xuất (Lưu trong LocalStorage)
  const [exportedReports, setExportedReports] = useState<ExportedReportItem[]>(() => {
    try {
      const saved = localStorage.getItem('smartbox_exported_reports_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Bộ nhớ tạm Blob trong phiên hiện tại để tải lại tức thì
  const blobCacheRef = useRef<Map<string, Blob>>(new Map());

  // PDF Preview State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [activePreviewBlob, setActivePreviewBlob] = useState<Blob | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  const handlePreviewPdf = async () => {
    setError('');
    setMessage('');
    setPreviewLoading(true);
    try {
      const params: Record<string, string> = { fromDate: from, toDate: to };
      if (customer.trim()) params.customerId = customer.trim();
      const blob = await exportRevenue('PDF', params);
      const url = URL.createObjectURL(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
      setActivePreviewBlob(blob);
      const fromStr = formatIsoToDdMmYyyy(from).replace(/\//g, '-');
      const toStr = formatIsoToDdMmYyyy(to).replace(/\//g, '-');
      const fileName = `doanh-thu_${fromStr}_${toStr}.pdf`;
      setPreviewTitle(fileName);
      setPreviewModalOpen(true);
      toast.success('Đã tạo bản xem trước PDF!');
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo bản xem trước PDF', 'Lỗi xem trước');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePreviewFromHistory = async (item: ExportedReportItem) => {
    if (item.format !== 'PDF') return;
    setPreviewLoading(true);
    try {
      let blob = blobCacheRef.current.get(item.id);
      if (!blob) {
        const params: Record<string, string> = { fromDate: item.from, toDate: item.to };
        if (item.customerId) params.customerId = item.customerId;
        blob = await exportRevenue('PDF', params);
        blobCacheRef.current.set(item.id, blob);
      }
      const url = URL.createObjectURL(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
      setActivePreviewBlob(blob);
      setPreviewTitle(item.fileName);
      setPreviewModalOpen(true);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xem trước tệp PDF', 'Lỗi xem trước');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePrintPreview = () => {
    if (previewIframeRef.current?.contentWindow) {
      previewIframeRef.current.contentWindow.focus();
      previewIframeRef.current.contentWindow.print();
    }
  };

  const handleClosePreview = () => {
    setPreviewModalOpen(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setActivePreviewBlob(null);
    }
  };

  useEffect(() => {
    let active = true;
    reportDefinition()
      .then(d => {
        if (active) setDefinition(d);
      })
      .catch(e => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleQuickPreset = (preset: 'today' | '7days' | '30days' | 'month') => {
    const today = dateToday();
    setTo(today);
    switch (preset) {
      case 'today':
        setFrom(today);
        break;
      case '7days':
        setFrom(getPastDate(7));
        break;
      case '30days':
        setFrom(getPastDate(30));
        break;
      case 'month':
        setFrom(getStartOfMonth());
        break;
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);

    try {
      const params: Record<string, string> = { fromDate: from, toDate: to };
      if (customer.trim()) params.customerId = customer.trim();

      const blob = await exportRevenue(format, params);
      const fromStr = formatIsoToDdMmYyyy(from).replace(/\//g, '-');
      const toStr = formatIsoToDdMmYyyy(to).replace(/\//g, '-');
      const fileName = `doanh-thu_${fromStr}_${toStr}.${format.toLowerCase()}`;

      // Kích hoạt tải tệp về trình duyệt
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      // Thêm vào danh sách tệp đã xuất
      const newItem: ExportedReportItem = {
        id: 'rep_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        fileName,
        format,
        from,
        to,
        customerId: customer.trim() || undefined,
        exportedAt: new Date().toISOString(),
        fileSizeBytes: blob.size,
      };

      blobCacheRef.current.set(newItem.id, blob);

      setExportedReports(prev => {
        const next = [newItem, ...prev.filter(p => p.id !== newItem.id)].slice(0, 20);
        try {
          localStorage.setItem('smartbox_exported_reports_v1', JSON.stringify(next));
        } catch {}
        return next;
      });

      setMessage(`Đã tạo và tải xuống thành công báo cáo doanh thu định dạng ${format}. Tệp đã được lưu vào danh sách bên dưới.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadAgain = async (item: ExportedReportItem) => {
    try {
      setReDownloadingId(item.id);
      let blob = blobCacheRef.current.get(item.id);
      if (!blob) {
        // Nếu trong session chưa lưu Blob, gọi lại API
        const params: Record<string, string> = { fromDate: item.from, toDate: item.to };
        if (item.customerId) params.customerId = item.customerId;
        blob = await exportRevenue(item.format, params);
        blobCacheRef.current.set(item.id, blob);
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(`Đã tải lại tệp "${item.fileName}" thành công.`);
    } catch (err: any) {
      setError('Lỗi khi tải lại báo cáo: ' + (err?.message || 'Không thể kết nối máy chủ'));
    } finally {
      setReDownloadingId('');
    }
  };

  const handleDeleteReport = (id: string) => {
    blobCacheRef.current.delete(id);
    setExportedReports(prev => {
      const next = prev.filter(r => r.id !== id);
      try {
        localStorage.setItem('smartbox_exported_reports_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleClearAllReports = () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử các tệp báo cáo đã xuất?')) return;
    blobCacheRef.current.clear();
    setExportedReports([]);
    try {
      localStorage.removeItem('smartbox_exported_reports_v1');
    } catch {}
    setMessage('Đã dọn sạch lịch sử tệp đã xuất.');
  };

  const maxDays = Math.min(...(definition?.params.map(p => p.maxDays).filter((v): v is number => !!v) || [92]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Header */}
      <div className="fpt-page-header" style={{ marginBottom: 0 }}>
        <div className="fpt-page-title">
          <div className="fpt-page-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <h1>Báo Cáo Doanh Thu Bán Hàng</h1>
            <p className="fpt-page-desc">
              Kết xuất số liệu kinh doanh, dòng tiền đã thu, tiền hoàn trả và số lượng đơn hàng theo chuẩn mẫu biểu thống kê.
            </p>
          </div>
        </div>

        <span className="fpt-badge fpt-badge-success" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
          <ShieldCheck size={14} /> JasperReports Engine
        </span>
      </div>

      {/* 2. Thu nhỏ 3 thẻ thông tin (Compact Info Strip) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '10px',
        }}
      >
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--fpt-emerald-soft)',
              color: 'var(--fpt-emerald)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Clock size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Thời gian thực
            </div>
            <div style={{ fontSize: '0.835rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Múi giờ VN (UTC+7)
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--fpt-blue-soft)',
              color: 'var(--fpt-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FileSpreadsheet size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Định dạng hỗ trợ
            </div>
            <div style={{ fontSize: '0.835rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              PDF & Excel (.xlsx)
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--fpt-amber-soft)',
              color: 'var(--fpt-amber)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Calendar size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Giới hạn truy vấn
            </div>
            <div style={{ fontSize: '0.835rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Tối đa {Number.isFinite(maxDays) ? maxDays : 92} ngày
            </div>
          </div>
        </div>
      </div>

      {/* 3. Alerts */}
      {message && (
        <div className="card" style={{ padding: '10px 14px', background: 'var(--fpt-emerald-soft)', borderColor: 'var(--fpt-emerald)', color: 'var(--fpt-emerald)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="card" style={{ padding: '10px 14px', background: 'var(--fpt-rose-soft)', borderColor: 'var(--fpt-rose)', color: 'var(--fpt-rose)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* 4 & 5. Chia 2 cột: Form xuất báo cáo (Trái) & Danh sách tệp đã xuất (Phải) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '16px',
          alignItems: 'stretch',
        }}
      >
        {/* Cột 1: Form xuất báo cáo chính */}
        <div
          className="card"
          style={{
            padding: '20px 22px',
            borderRadius: '14px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Quick presets */}
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                  Khoảng thời gian báo cáo
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'today' as const, label: 'Hôm nay' },
                    { key: '7days' as const, label: '7 ngày gần nhất' },
                    { key: '30days' as const, label: '30 ngày gần nhất' },
                    { key: 'month' as const, label: 'Từ đầu tháng này' },
                  ].map(p => (
                    <button
                      key={p.key}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleQuickPreset(p.key)}
                      style={{ borderRadius: '8px', padding: '5px 12px', fontSize: '0.8rem' }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date range pickers định dạng dd/mm/yyyy */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <DateInputDdMmYyyy
                  label="Từ ngày"
                  required
                  max={to}
                  value={from}
                  onChange={setFrom}
                  disabled={busy}
                />

                <DateInputDdMmYyyy
                  label="Đến ngày"
                  required
                  min={from}
                  value={to}
                  onChange={setTo}
                  disabled={busy}
                />
              </div>

              {/* Format selection cards */}
              <div className="fpt-form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '0.825rem', marginBottom: '6px', display: 'block' }}>
                  Định dạng xuất báo cáo *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    {
                      fmt: 'PDF' as const,
                      title: 'Báo cáo văn bản PDF',
                      icon: <FileText size={20} />,
                      desc: 'Biểu mẫu tiêu chuẩn có logo, sẵn sàng in ấn hoặc nộp chứng từ.',
                      color: 'var(--fpt-rose)',
                    },
                    {
                      fmt: 'XLSX' as const,
                      title: 'Bảng tính Excel (.xlsx)',
                      icon: <FileSpreadsheet size={20} />,
                      desc: 'Dữ liệu số liệu thô có công thức để đối chiếu kế toán.',
                      color: 'var(--fpt-emerald)',
                    },
                  ].map(f => {
                    const isSelected = format === f.fmt;
                    return (
                      <div
                        key={f.fmt}
                        onClick={() => setFormat(f.fmt)}
                        style={{
                          border: `2px solid ${isSelected ? f.color : 'var(--border-subtle)'}`,
                          background: isSelected ? 'var(--bg-card)' : 'var(--bg-surface)',
                          borderRadius: '12px',
                          padding: '12px 14px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ color: f.color }}>{f.icon}</div>
                          {isSelected && <CheckCircle2 size={16} style={{ color: f.color }} />}
                        </div>
                        <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{f.title}</strong>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{f.desc}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Optional customer filter */}
              <div className="fpt-form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '0.825rem' }}>Lọc riêng theo mã khách hàng (Không bắt buộc)</label>
                <input
                  placeholder="Để trống để kết xuất doanh thu toàn bộ khách hàng"
                  pattern="[0-9a-fA-F-]{36}"
                  value={customer}
                  onChange={e => setCustomer(e.target.value)}
                  disabled={busy}
                  style={{ borderRadius: '8px', fontSize: '0.85rem', padding: '8px 12px' }}
                />
                <span className="fpt-form-help" style={{ fontSize: '0.74rem' }}>Nhập UUID khách hàng nếu chỉ muốn xem doanh số của một khách cụ thể.</span>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ paddingTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={previewLoading || busy || !definition}
                  onClick={handlePreviewPdf}
                  style={{ height: '42px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', borderRadius: '8px' }}
                  title="Xem trước định dạng PDF trong trình duyệt"
                >
                  {previewLoading ? <RefreshCw size={16} className="spin" /> : <Eye size={16} />}
                  <span>{previewLoading ? 'Đang tải…' : 'Xem trước PDF'}</span>
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={busy || !definition}
                  style={{ height: '42px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', borderRadius: '8px' }}
                >
                  {busy ? <RefreshCw size={17} className="spin" /> : <Download size={17} />}
                  <span>{busy ? 'Đang tạo…' : `Xuất & Tải ${format}`}</span>
                </button>
              </div>

              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                Kỳ xuất: <strong>{formatIsoToDdMmYyyy(from)}</strong> đến <strong>{formatIsoToDdMmYyyy(to)}</strong>
              </span>
            </div>
          </form>
        </div>

        {/* Cột 2: Box hiển thị các file đã export ra */}
        <div
          className="card"
          style={{
            padding: '20px 22px',
            borderRadius: '14px',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--fpt-emerald)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FileDown size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Danh sách tệp đã xuất
                  <span className="fpt-badge fpt-badge-info" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                    {exportedReports.length} tệp
                  </span>
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Lưu trữ các tệp đã tạo để tải lại tức thì không cần kết xuất lại.
                </p>
              </div>
            </div>

            {exportedReports.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleClearAllReports}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--fpt-rose)', padding: '4px 10px' }}
              >
                <Trash2 size={12} />
                <span>Xóa lịch sử</span>
              </button>
            )}
          </div>

          {exportedReports.length === 0 ? (
            <div
              style={{
                flex: 1,
                minHeight: '260px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px 16px',
                textAlign: 'center',
                borderRadius: '10px',
                border: '1px dashed var(--border-subtle)',
                background: 'var(--bg-surface)',
              }}
            >
              <FileDown size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 10px', opacity: 0.6 }} />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                Chưa có tệp báo cáo nào được xuất
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '300px', lineHeight: 1.4 }}>
                Chọn khoảng thời gian và định dạng ở bên trái rồi bấm <strong>"Xuất báo cáo"</strong>, tệp tải về sẽ xuất hiện tại đây.
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', overflowX: 'auto' }}>
              <table className="fpt-table" style={{ width: '100%', fontSize: '0.825rem' }}>
                <thead>
                  <tr>
                    <th style={{ width: '42px', textAlign: 'center' }}>Định dạng</th>
                    <th>Tên tệp & Dung lượng</th>
                    <th>Kỳ dữ liệu & Thời điểm</th>
                    <th style={{ textAlign: 'right', width: '90px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {exportedReports.map((item) => {
                    const isPdf = item.format === 'PDF';
                    const isDownloading = reDownloadingId === item.id;
                    return (
                      <tr key={item.id}>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <span
                            className={`fpt-badge ${isPdf ? 'fpt-badge-danger' : 'fpt-badge-success'}`}
                            style={{ padding: '3px 6px', fontSize: '0.68rem', fontWeight: 700 }}
                          >
                            {item.format}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            {isPdf ? (
                              <FileText size={16} style={{ color: 'var(--fpt-rose)', flexShrink: 0, marginTop: '2px' }} />
                            ) : (
                              <FileSpreadsheet size={16} style={{ color: 'var(--fpt-emerald)', flexShrink: 0, marginTop: '2px' }} />
                            )}
                            <div>
                              <strong style={{ color: 'var(--text-primary)', wordBreak: 'break-all', fontSize: '0.82rem', display: 'block' }}>
                                {item.fileName}
                              </strong>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {formatBytes(item.fileSizeBytes)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                            {formatIsoToDdMmYyyy(item.from)} — {formatIsoToDdMmYyyy(item.to)}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {formatDateTime(item.exportedAt)}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {isPdf && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={previewLoading}
                                onClick={() => handlePreviewFromHistory(item)}
                                title="Xem trước tài liệu PDF trực tiếp"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Eye size={12} />
                                <span>Xem</span>
                              </button>
                            )}

                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={isDownloading}
                              onClick={() => handleDownloadAgain(item)}
                              title="Tải lại tệp này"
                              style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              {isDownloading ? (
                                <RefreshCw size={12} className="spin" />
                              ) : (
                                <Download size={12} />
                              )}
                              <span>{isDownloading ? 'Đang tải' : 'Tải'}</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleDeleteReport(item.id)}
                              title="Xóa khỏi danh sách"
                              style={{ padding: '4px 6px', color: 'var(--fpt-rose)' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 6. PDF Preview Modal */}
      {previewModalOpen && previewUrl && (
        <div className="pdf-modal-overlay" onClick={handleClosePreview}>
          <div className="pdf-modal-box" onClick={e => e.stopPropagation()}>
            <div className="pdf-modal-header">
              <h3 className="pdf-modal-title">
                <FileText size={18} style={{ color: '#ef4444' }} />
                <span>{previewTitle}</span>
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="reports-btn"
                  onClick={handlePrintPreview}
                  title="In báo cáo trực tiếp"
                >
                  <Printer size={14} />
                  <span>In báo cáo</span>
                </button>
                <button
                  type="button"
                  className="reports-btn primary"
                  onClick={() => {
                    if (!activePreviewBlob) return;
                    const a = document.createElement('a');
                    a.href = previewUrl;
                    a.download = previewTitle.endsWith('.pdf') ? previewTitle : `${previewTitle}.pdf`;
                    a.click();
                    toast.success('Đã tải tệp PDF về máy!');
                  }}
                  title="Tải tệp PDF về máy"
                >
                  <Download size={14} />
                  <span>Tải PDF</span>
                </button>
                <button
                  type="button"
                  className="reports-btn"
                  onClick={handleClosePreview}
                  style={{ padding: '6px', borderRadius: '8px' }}
                  aria-label="Đóng"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="pdf-modal-body">
              <iframe
                ref={previewIframeRef}
                src={previewUrl}
                className="pdf-modal-iframe"
                title="Bản xem trước PDF"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
