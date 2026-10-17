import React, { useEffect, useState, useMemo } from 'react';
import { adminRequest } from '../../services/adminRequest';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../contexts/ToastContext';
import {
  Mail,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Send,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
  Search,
  Eye,
  X,
  Copy,
  Check
} from 'lucide-react';
import './email-history.css';

interface MailRecord {
  id: string;
  template: string;
  reference_id: string;
  recipient: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
  next_attempt_at: string;
}

const templateLabels: Record<string, string> = {
  TEST_EMAIL_VERIFICATION: 'Kiểm thử SMTP hệ thống',
  ORDER_PAID: 'Thanh toán thành công',
  ORDER_CONFIRMED: 'Xác nhận đơn hàng',
  ORDER_DELIVERED: 'Đã giao hàng thành công',
  INSTALLATION_SCHEDULED: 'Lịch hẹn lắp đặt tủ',
  RESET_PASSWORD: 'Mã OTP Đặt lại mật khẩu',
  WARRANTY_CLAIM_RECEIVED: 'Tiếp nhận bảo hành',
  INVOICE_ISSUED: 'Hóa đơn điện tử',
};

export const EmailHistoryPage: React.FC = () => {
  const [status, setStatus] = useState<string>('FAILED');
  const [page, setPage] = useState<number>(0);
  const [rows, setRows] = useState<MailRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [busy, setBusy] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [revision, setRevision] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Test Email Modal State
  const { profile } = useAuth();
  const [testModalOpen, setTestModalOpen] = useState<boolean>(false);
  const [testRecipient, setTestRecipient] = useState<string>('hoangquangdat2005@gmail.com');
  const [testSubject, setTestSubject] = useState<string>('[SmartBox Test] Kiểm thử gửi email hệ thống');
  const [testSending, setTestSending] = useState<boolean>(false);
  const [testFeedback, setTestFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Background poller for email status (checks status every 1.5s up to 14 times)
  const trackEmailDelivery = (emailId: string, recipientEmail: string, actionLabel: string = 'Gửi email') => {
    let attempts = 0;
    const maxAttempts = 14;
    const interval = window.setInterval(async () => {
      attempts++;
      try {
        const res = await adminRequest<{ id: string; status: string; lastError?: string; sentAt?: string }>(
          `/admin/emails/${emailId}/status`,
          { headers: { 'Cache-Control': 'no-cache' } }
        );

        if (res && res.status === 'SENT') {
          window.clearInterval(interval);
          toast.success(`Đã gửi email thành công tới ${recipientEmail}!`, `${actionLabel} thành công`);
          setRevision(r => r + 1);
        } else if (res && res.status === 'FAILED') {
          window.clearInterval(interval);
          toast.error(`Gửi email tới ${recipientEmail} thất bại: ${res.lastError || 'Lỗi máy chủ gửi mail'}`, `${actionLabel} thất bại`);
          setRevision(r => r + 1);
        } else if (attempts >= maxAttempts) {
          window.clearInterval(interval);
          toast.warning(`Email gửi tới ${recipientEmail} đang nằm trong hàng đợi hệ thống.`, 'Đang xử lý');
          setRevision(r => r + 1);
        }
      } catch {
        if (attempts >= maxAttempts) {
          window.clearInterval(interval);
        }
      }
    }, 1500);
  };

  const handleSendTestEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!testRecipient.trim() || testSending) return;
    const targetRecipient = testRecipient.trim();
    const targetSubject = testSubject.trim() || undefined;

    try {
      setTestSending(true);
      setTestFeedback(null);

      const res = await adminRequest<{
        success: boolean;
        queued?: boolean;
        id?: string;
        recipient: string;
        message: string;
      }>('/admin/emails/test-send', {
        method: 'POST',
        body: JSON.stringify({
          recipient: targetRecipient,
          subject: targetSubject
        })
      });

      // Close modal immediately so user doesn't wait
      setTestModalOpen(false);
      setTestSending(false);

      toast.info(`Đang gửi email kiểm thử tới ${targetRecipient} trong nền...`, 'Tiến trình gửi email');
      setMessage(`Yêu cầu gửi email tới ${targetRecipient} đã được tiếp nhận.`);
      setRevision(r => r + 1);

      if (res.id) {
        trackEmailDelivery(res.id, targetRecipient, 'Kiểm thử SMTP');
      }
    } catch (err: any) {
      setTestSending(false);
      toast.error(err.message || 'Không thể gửi email kiểm thử.', 'Lỗi gửi email');
    }
  };

  // Counts for KPI cards
  const [counts, setCounts] = useState<{ FAILED: number; PENDING: number; SENT: number }>({
    FAILED: 0,
    PENDING: 0,
    SENT: 0,
  });

  // Modal inspection
  const [selectedMail, setSelectedMail] = useState<MailRecord | null>(null);
  const [copied, setCopied] = useState<string>('');

  // Fetch KPI counts
  useEffect(() => {
    let active = true;
    Promise.all([
      adminRequest<{ totalElements: number }>('/admin/emails?status=FAILED&page=0&size=1'),
      adminRequest<{ totalElements: number }>('/admin/emails?status=PENDING&page=0&size=1'),
      adminRequest<{ totalElements: number }>('/admin/emails?status=SENT&page=0&size=1'),
    ])
      .then(([failedRes, pendingRes, sentRes]) => {
        if (active) {
          setCounts({
            FAILED: Number(failedRes.totalElements || 0),
            PENDING: Number(pendingRes.totalElements || 0),
            SENT: Number(sentRes.totalElements || 0),
          });
        }
      })
      .catch(err => {
        console.error('Failed to load email summary counts:', err);
      });

    return () => {
      active = false;
    };
  }, [revision]);

  // Fetch paginated emails
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    adminRequest<{ content: MailRecord[]; totalElements: number }>(
      `/admin/emails?${new URLSearchParams({ status, page: String(page), size: '20' })}`
    )
      .then(data => {
        if (active) {
          setRows(data.content || []);
          setTotal(data.totalElements || 0);
        }
      })
      .catch(e => {
        if (active) {
          setError(e.message);
          setRows([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status, page, revision]);

  const handleRetry = async (mail: MailRecord) => {
    try {
      toast.info(`Đang xử lý gửi lại email tới ${mail.recipient} trong nền...`, 'Gửi lại email');
      if (selectedMail && selectedMail.id === mail.id) {
        setSelectedMail(null);
      }
      const res = await adminRequest<{ queued: boolean; id: string }>(`/admin/emails/${mail.id}/resend`, { method: 'POST' });
      setMessage(`Đã đưa email gửi tới ${mail.recipient} vào hàng đợi gửi lại.`);
      setRevision(r => r + 1);
      trackEmailDelivery(mail.id, mail.recipient, 'Gửi lại email');
    } catch (e: any) {
      toast.error(e.message || 'Không thể gửi lại email.', 'Lỗi gửi lại');
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase().trim();
    return rows.filter(
      r =>
        r.recipient.toLowerCase().includes(term) ||
        r.id.toLowerCase().includes(term) ||
        (r.reference_id && r.reference_id.toLowerCase().includes(term)) ||
        (templateLabels[r.template] || r.template).toLowerCase().includes(term)
    );
  }, [rows, searchTerm]);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'SENT':
        return (
          <span className="email-badge success">
            <CheckCircle2 size={12} />
            <span>Đã gửi thành công</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="email-badge warning">
            <Clock size={12} />
            <span>Chờ gửi (Queue)</span>
          </span>
        );
      case 'FAILED':
      default:
        return (
          <span className="email-badge danger">
            <AlertCircle size={12} />
            <span>Gửi thất bại</span>
          </span>
        );
    }
  };

  const grandTotal = counts.FAILED + counts.PENDING + counts.SENT;
  const successRate =
    counts.SENT + counts.FAILED > 0
      ? Math.round((counts.SENT / (counts.SENT + counts.FAILED)) * 100)
      : 100;

  return (
    <div className="email-page-container">
      {/* 1. Header Ribbon */}
      <div className="email-header-ribbon">
        <div className="email-header-title-group">
          <div className="email-header-icon">
            <Mail size={22} />
          </div>
          <div>
            <h1 className="email-header-title">Nhật Ký Email Giao Dịch</h1>
            <p className="email-header-desc">
              Giám sát hệ thống gửi email tự động (xác nhận đơn hàng, OTP, hóa đơn điện tử) và kích hoạt gửi lại các email thất bại.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setTestModalOpen(true);
              setTestFeedback(null);
              if (profile?.email && testRecipient === 'hoangquangdat2005@gmail.com') {
                setTestRecipient(profile.email);
              }
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Send size={15} />
            <span>Gửi email test thử</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading}
            onClick={() => setRevision(r => r + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. Executive 4-Card KPI Grid */}
      <div className="email-kpi-grid">
        <div
          className={`email-kpi-card ${status === 'FAILED' ? 'active' : ''}`}
          style={{ '--active-color': '#ef4444' } as React.CSSProperties}
          onClick={() => {
            setStatus('FAILED');
            setPage(0);
          }}
        >
          <div className="email-kpi-bubble" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
            <AlertCircle size={20} />
          </div>
          <div className="email-kpi-meta">
            <span className="email-kpi-label">Gửi thất bại</span>
            <div className="email-kpi-value" style={{ color: '#ef4444' }}>
              {counts.FAILED}
            </div>
            <span className="email-kpi-sub">Cần kiểm tra lỗi hoặc gửi lại</span>
          </div>
        </div>

        <div
          className={`email-kpi-card ${status === 'PENDING' ? 'active' : ''}`}
          style={{ '--active-color': '#f59e0b' } as React.CSSProperties}
          onClick={() => {
            setStatus('PENDING');
            setPage(0);
          }}
        >
          <div className="email-kpi-bubble" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <Clock size={20} />
          </div>
          <div className="email-kpi-meta">
            <span className="email-kpi-label">Hàng đợi chờ gửi</span>
            <div className="email-kpi-value" style={{ color: '#f59e0b' }}>
              {counts.PENDING}
            </div>
            <span className="email-kpi-sub">Đang trong tiến trình scheduler</span>
          </div>
        </div>

        <div
          className={`email-kpi-card ${status === 'SENT' ? 'active' : ''}`}
          style={{ '--active-color': '#10b981' } as React.CSSProperties}
          onClick={() => {
            setStatus('SENT');
            setPage(0);
          }}
        >
          <div className="email-kpi-bubble" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <CheckCircle2 size={20} />
          </div>
          <div className="email-kpi-meta">
            <span className="email-kpi-label">Đã gửi thành công</span>
            <div className="email-kpi-value" style={{ color: '#10b981' }}>
              {counts.SENT}
            </div>
            <span className="email-kpi-sub">Khách hàng đã nhận được thư</span>
          </div>
        </div>

        <div className="email-kpi-card" style={{ cursor: 'default' }}>
          <div className="email-kpi-bubble" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <Send size={20} />
          </div>
          <div className="email-kpi-meta">
            <span className="email-kpi-label">Tỷ lệ thành công</span>
            <div className="email-kpi-value" style={{ color: '#3b82f6' }}>
              {successRate}%
            </div>
            <span className="email-kpi-sub">Tổng cộng {grandTotal} giao dịch email</span>
          </div>
        </div>
      </div>

      {/* 3. Alerts */}
      {message && (
        <div className="card" style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="card" style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Filter Toolbar */}
      <div className="email-toolbar">
        <div className="email-pill-tabs">
          {[
            { key: 'FAILED', label: 'Gửi thất bại', count: counts.FAILED, cls: 'failed' },
            { key: 'PENDING', label: 'Chờ gửi (Queue)', count: counts.PENDING, cls: 'pending' },
            { key: 'SENT', label: 'Đã gửi thành công', count: counts.SENT, cls: 'sent' },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              className={`email-pill-tab ${status === tab.key ? `active ${tab.cls}` : ''}`}
              onClick={() => {
                setStatus(tab.key);
                setPage(0);
              }}
            >
              <span>{tab.label}</span>
              <span className="email-tab-badge">{tab.count}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="email-search-box">
            <Search size={15} className="email-search-icon" />
            <input
              type="text"
              placeholder="Lọc người nhận, mã tham chiếu…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            Hiển thị <strong>{filteredRows.length}</strong> / <strong>{total}</strong> thư
          </div>
        </div>
      </div>

      {/* 5. Table */}
      <div className="email-table-card">
        {loading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: 0 }}>Đang tải nhật ký email…</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="email-empty-state">
            <div className="email-empty-icon">
              <Mail size={24} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              Không có email nào ở trạng thái này
            </h3>
            <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              Hệ thống gửi thư hoạt động ổn định hoặc chưa phát sinh thư cần xử lý.
            </p>
          </div>
        ) : (
          <table className="email-table">
            <thead>
              <tr>
                <th>Người nhận</th>
                <th>Mẫu email & Tham chiếu</th>
                <th>Trạng thái & Lần thử</th>
                <th>Thời gian</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(mail => (
                <tr key={mail.id} className="email-table-row">
                  {/* Người nhận */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="email-kpi-bubble" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', width: 34, height: 34, color: '#fff', borderRadius: '8px' }}>
                        <Mail size={16} />
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'block' }}>
                          {mail.recipient}
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          ID: {mail.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Mẫu & Mã tham chiếu */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.825rem', color: 'var(--text-primary)' }}>
                        {templateLabels[mail.template] || mail.template}
                      </span>
                      {mail.reference_id && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          Ref: #{mail.reference_id.slice(0, 8).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Trạng thái & số lần thử */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {getStatusBadge(mail.status)}
                      {mail.attempts > 0 && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Đã thử {mail.attempts} lần
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Thời gian */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                      <span>{new Date(mail.sent_at || mail.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                  </td>

                  {/* Thao tác */}
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        className="email-btn"
                        onClick={() => setSelectedMail(mail)}
                        title="Xem chi tiết lỗi & thông số email"
                      >
                        <Eye size={13} />
                        <span>Chi tiết</span>
                      </button>

                      {mail.status === 'FAILED' && (
                        <button
                          type="button"
                          className="email-btn primary"
                          disabled={busy === mail.id}
                          onClick={() => handleRetry(mail)}
                        >
                          <RotateCcw size={12} className={busy === mail.id ? 'spin' : ''} />
                          <span>{busy === mail.id ? 'Đang gửi…' : 'Gửi lại'}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 6. Pagination */}
      {total > 0 && (
        <div className="workspace-pagination">
          <span>
            Hiển thị {rows.length} / {total} email · Trang {Math.ceil(total / 20) ? page + 1 : 0} / {Math.ceil(total / 20) || 1}
          </span>
          <div className="workspace-pagination-controls">
            <button
              type="button"
              className="workspace-pagination-btn"
              disabled={loading || page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft size={14} /> Trước
            </button>
            {Array.from({ length: Math.min(Math.ceil(total / 20), 7) }, (_, idx) => {
              const maxP = Math.ceil(total / 20);
              let pIndex = idx;
              if (maxP > 7) {
                if (page > 3 && page < maxP - 3) {
                  pIndex = page - 3 + idx;
                } else if (page >= maxP - 3) {
                  pIndex = maxP - 7 + idx;
                }
              }
              return (
                <button
                  key={pIndex}
                  type="button"
                  className={`workspace-pagination-btn ${page === pIndex ? 'active' : ''}`}
                  onClick={() => setPage(pIndex)}
                  disabled={loading}
                >
                  {pIndex + 1}
                </button>
              );
            })}
            <button
              type="button"
              className="workspace-pagination-btn"
              disabled={loading || (page + 1) * 20 >= total}
              onClick={() => setPage(p => p + 1)}
            >
              Sau <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 7. Modal Chi Tiết Email */}
      {selectedMail && (
        <div className="fpt-modal-overlay" onClick={() => setSelectedMail(null)}>
          <div className="fpt-modal-box" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="fpt-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="fpt-avatar" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', width: 38, height: 38 }}>
                  <Mail size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>Chi tiết email giao dịch</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    ID: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{selectedMail.id}</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedMail(null)}
                style={{ padding: '6px', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="fpt-modal-body">
              {/* Header card with status */}
              <div style={{ background: 'var(--bg-surface)', padding: '14px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>
                    Trạng thái chuyển phát
                  </span>
                  <div style={{ marginTop: '4px' }}>{getStatusBadge(selectedMail.status)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Số lần thử gửi</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{selectedMail.attempts} lần</strong>
                </div>
              </div>

              {/* Thông tin thông số */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Người nhận (Recipient)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{selectedMail.recipient}</strong>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedMail.recipient, 'recipient')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-muted)' }}
                      title="Sao chép email"
                    >
                      {copied === 'recipient' ? <Check size={13} style={{ color: 'var(--fpt-emerald)' }} /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Mẫu email (Template)</span>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--fpt-blue)', marginTop: '2px', display: 'block' }}>
                    {templateLabels[selectedMail.template] || selectedMail.template}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Mã tham chiếu (Ref ID)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                      {selectedMail.reference_id || '—'}
                    </span>
                    {selectedMail.reference_id && (
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedMail.reference_id, 'ref')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-muted)' }}
                        title="Sao chép Ref ID"
                      >
                        {copied === 'ref' ? <Check size={13} style={{ color: 'var(--fpt-emerald)' }} /> : <Copy size={13} />}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Thời gian khởi tạo</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '2px', display: 'block' }}>
                    {new Date(selectedMail.created_at).toLocaleString('vi-VN')}
                  </span>
                </div>

                {selectedMail.sent_at && (
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Thời gian gửi thành công</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--fpt-emerald)', marginTop: '2px', display: 'block' }}>
                      {new Date(selectedMail.sent_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                )}

                {selectedMail.next_attempt_at && selectedMail.status === 'PENDING' && (
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Lần thử tiếp theo</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--fpt-amber)', marginTop: '2px', display: 'block' }}>
                      {new Date(selectedMail.next_attempt_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Thông tin lỗi kỹ thuật nếu có */}
              {selectedMail.last_error && (
                <div style={{ background: 'var(--fpt-rose-soft)', border: '1px solid var(--fpt-rose)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--fpt-rose)', fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>
                    <AlertTriangle size={16} />
                    <span>Chi tiết lỗi ghi nhận từ Mail Server (SMTP / Provider)</span>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: '10px',
                      background: 'var(--bg-card)',
                      borderRadius: '8px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      maxHeight: '140px',
                      overflowY: 'auto',
                    }}
                  >
                    {selectedMail.last_error}
                  </pre>
                </div>
              )}
            </div>

            <div className="fpt-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedMail(null)}
              >
                Đóng
              </button>

              {selectedMail.status === 'FAILED' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy === selectedMail.id}
                  onClick={() => handleRetry(selectedMail)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RotateCcw size={14} className={busy === selectedMail.id ? 'spin' : ''} />
                  <span>{busy === selectedMail.id ? 'Đang gửi lại…' : 'Gửi lại email này ngay'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal Gửi Email Test Thử */}
      {testModalOpen && (
        <div className="fpt-modal-overlay" onClick={() => !testSending && setTestModalOpen(false)}>
          <div className="fpt-modal-box" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
            <div className="fpt-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Send size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Gửi email kiểm thử hệ thống</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Kiểm tra trực tiếp máy chủ SMTP / Gmail và nội dung hiển thị trong hòm thư thực tế
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={testSending}
                onClick={() => setTestModalOpen(false)}
                style={{ padding: '6px', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendTestEmail}>
              <div className="fpt-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {testFeedback && (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      fontSize: '0.875rem',
                      background: testFeedback.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      border: `1px solid ${testFeedback.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      color: testFeedback.success ? 'var(--accent-emerald)' : 'var(--fpt-rose)',
                    }}
                  >
                    {testFeedback.success ? <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 2 }} /> : <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />}
                    <div>
                      <div style={{ fontWeight: 600 }}>{testFeedback.success ? 'Thành công!' : 'Chưa gửi được!'}</div>
                      <div style={{ fontSize: '0.825rem', marginTop: 2 }}>{testFeedback.message}</div>
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Email người nhận kiểm thử *
                  </label>
                  <input
                    type="email"
                    required
                    disabled={testSending}
                    value={testRecipient}
                    onChange={e => setTestRecipient(e.target.value)}
                    placeholder="vd: hoangquangdat2005@gmail.com"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Gợi ý:</span>
                    {profile?.email && (
                      <button
                        type="button"
                        onClick={() => setTestRecipient(profile.email)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-sky)', fontSize: '0.78rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                      >
                        Email của tôi ({profile.email})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setTestRecipient('hoangquangdat2005@gmail.com')}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-sky)', fontSize: '0.78rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                    >
                      hoangquangdat2005@gmail.com
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Tiêu đề thư (Subject)
                  </label>
                  <input
                    type="text"
                    disabled={testSending}
                    value={testSubject}
                    onChange={e => setTestSubject(e.target.value)}
                    placeholder="[SmartBox Test] Kiểm thử gửi email hệ thống"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={14} style={{ color: 'var(--accent-sky)' }} />
                    <span>Cấu hình máy chủ gửi (SMTP Gateway)</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', color: 'var(--text-muted)' }}>
                    <div>Máy chủ: <strong style={{ color: 'var(--text-primary)' }}>smtp.gmail.com:587</strong></div>
                    <div>Giao thức: <strong style={{ color: 'var(--text-primary)' }}>STARTTLS</strong></div>
                    <div>Tài khoản gửi: <strong style={{ color: 'var(--text-primary)' }}>hoangquangdat2005@gmail.com</strong></div>
                    <div>Nhãn hiển thị: <strong style={{ color: 'var(--text-primary)' }}>SmartBox</strong></div>
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Email được gửi thật ra Internet. Sau khi gửi, bạn có thể kiểm tra hòm thư đến và bản ghi sẽ xuất hiện ngay trong bảng Nhật ký Email.
                  </p>
                </div>
              </div>

              <div className="fpt-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={testSending}
                  onClick={() => setTestModalOpen(false)}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={testSending || !testRecipient.trim()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {testSending ? (
                    <>
                      <RefreshCw size={14} className="spin" />
                      <span>Đang gửi qua SMTP…</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Gửi thử ngay</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
