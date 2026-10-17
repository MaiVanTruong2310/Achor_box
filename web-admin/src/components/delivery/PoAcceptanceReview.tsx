import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Camera,
  Clock,
  RotateCcw,
  AlertTriangle,
  ZoomIn,
  X,
  FileText,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../contexts/ToastContext';
import { deliveryApi, Job } from '../../services/deliveryInstallation';
import './po-delivery.css';

interface PoAcceptanceReviewProps {
  job: Job;
  onUpdated: (updatedJob: Job) => void;
}

export const PoAcceptanceReview: React.FC<PoAcceptanceReviewProps> = ({
  job,
  onUpdated
}) => {
  const { profile } = useAuth();
  const isPO = profile?.role === 'product_manager';
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [reworkDialogOpen, setReworkDialogOpen] = useState<boolean>(false);
  const [reworkReason, setReworkReason] = useState<string>('');
  const [approvalNote, setApprovalNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const photos = job.completionPhotos || [];
  const isWaitingPo = job.status === 'WAITING_PO_CONFIRMATION';
  const isCompleted = job.status === 'COMPLETED';

  const handleApprove = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const updated = await deliveryApi.approveCompletion(
        job.id,
        { approvalNote: approvalNote.trim() || undefined },
        job.version,
        idempotencyKey
      );
      toast.success('Phê duyệt nghiệm thu thành công! Đơn hàng đã chính thức hoàn tất.');
      onUpdated(updated);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể phê duyệt nghiệm thu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!reworkReason.trim() || submitting) return;
    setSubmitting(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const updated = await deliveryApi.rejectCompletion(
        job.id,
        { reason: reworkReason.trim() },
        job.version,
        idempotencyKey
      );
      toast.success('Đã gửi yêu cầu xử lý lại tới Kỹ thuật viên.');
      setReworkDialogOpen(false);
      setReworkReason('');
      onUpdated(updated);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể gửi yêu cầu xử lý lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="po-acceptance-card">
      <div className="po-acceptance-header">
        <div>
          <h3>
            <UserCheck size={20} color="#10b981" />
            <span>Nghiệm thu & Kết quả bàn giao của Kỹ thuật viên</span>
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
            PO kiểm tra ảnh minh chứng hiện trường thực tế trước khi hoàn tất toàn bộ quy trình đơn hàng.
          </p>
        </div>

        <span
          style={{
            padding: '4px 12px',
            borderRadius: 999,
            fontSize: '0.82rem',
            fontWeight: 700,
            background: isCompleted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(234, 88, 12, 0.12)',
            color: isCompleted ? '#059669' : '#ea580c',
            border: isCompleted ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(234, 88, 12, 0.3)'
          }}
        >
          {isCompleted ? '✓ Đã nghiệm thu & Hoàn thành' : '⏳ Chờ PO duyệt nghiệm thu'}
        </span>
      </div>

      {/* Completed Success Banner */}
      {isCompleted && (
        <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '14px 18px', borderRadius: 12, border: '1px solid rgba(16, 185, 129, 0.3)', color: '#047857' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
            <CheckCircle2 size={18} />
            <span>Đơn hàng đã hoàn thành toàn bộ quy trình!</span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem' }}>
            Nghiệm thu được xác nhận lúc {job.completedAt ? new Date(job.completedAt).toLocaleString('vi-VN') : 'vừa xong'}. Thiết bị đã kích hoạt bảo hành điện tử chính hãng.
          </p>
        </div>
      )}

      {/* Rework Banner if job was previously rejected and now back in progress */}
      {job.reworkNotes && (
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '14px 18px', borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.3)', color: '#b91c1c' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
            <AlertTriangle size={18} />
            <span>Yêu cầu xử lý lại trước đó:</span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem' }}>{job.reworkNotes}</p>
        </div>
      )}

      {/* Proof of Work Photos Gallery */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Camera size={16} color="#4f46e5" />
            <span>Ảnh minh chứng Kỹ thuật viên gửi về ({photos.length} ảnh):</span>
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Click ảnh để phóng to xem chi tiết</span>
        </div>

        {photos.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 10, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Kỹ thuật viên chưa tải lên ảnh minh chứng nào.
          </div>
        ) : (
          <div className="po-proof-gallery">
            {photos.map((url, idx) => (
              <div key={idx} className="po-proof-item" onClick={() => setLightboxImg(url)}>
                <img src={url} alt={`Minh chứng #${idx + 1}`} />
                <span className="po-proof-caption">Ảnh #{idx + 1}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completion Details */}
      <div className="po-acceptance-notes">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: '0.86rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Clock size={15} color="#4f46e5" />
            <strong>Thời gian hoàn thành:</strong>{' '}
            {job.completedAt ? new Date(job.completedAt).toLocaleString('vi-VN') : 'Đang xử lý'}
          </span>
          <span>
            <strong>Lượt thi công:</strong> Lượt {job.attempt}
          </span>
        </div>

        {job.completionNote && (
          <div style={{ marginTop: 6, fontSize: '0.88rem' }}>
            <strong>Ghi chú từ Kỹ thuật viên:</strong>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
              &ldquo;{job.completionNote}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* PO Actions (Approve / Reject) if waiting confirmation */}
      {!isPO ? (
        <div style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 10,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          color: '#1d4ed8',
          fontSize: '0.88rem'
        }}>
          <ShieldCheck size={20} color="#2563eb" style={{ flexShrink: 0 }} />
          <span>
            <strong>Chế độ giám sát:</strong> Quản trị viên chỉ theo dõi biên bản và minh chứng nghiệm thu. Quyền phê duyệt hoàn tất đơn hàng hoặc yêu cầu kỹ thuật viên xử lý lại thuộc về <strong>Quản lý Sản phẩm (PO)</strong>.
          </span>
        </div>
      ) : isWaitingPo && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="po-acceptance-actions">
            <button
              type="button"
              className="po-btn-approve"
              disabled={submitting}
              onClick={handleApprove}
            >
              <CheckCircle2 size={18} />
              <span>{submitting ? 'Đang xử lý...' : 'Phê duyệt hoàn tất (Approve Completion)'}</span>
            </button>

            <button
              type="button"
              className="po-btn-rework"
              disabled={submitting}
              onClick={() => setReworkDialogOpen(true)}
            >
              <RotateCcw size={17} />
              <span>Yêu cầu xử lý lại (Reject / Request Re-work)</span>
            </button>
          </div>
          <small style={{ color: 'var(--text-secondary)' }}>
            Lưu ý: Khi PO bấm &ldquo;Phê duyệt hoàn tất&rdquo;, đơn hàng sẽ chính thức chuyển sang trạng thái <strong>COMPLETED</strong> và kết thúc toàn bộ quy trình.
          </small>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div className="po-lightbox-overlay" onClick={() => setLightboxImg(null)}>
          <div className="po-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="po-lightbox-close" onClick={() => setLightboxImg(null)}>
              <X size={28} />
            </button>
            <img src={lightboxImg} alt="Ảnh minh chứng phóng to" />
          </div>
        </div>
      )}

      {/* Rework Reason Dialog */}
      {reworkDialogOpen && (
        <div className="tech-modal-overlay" onClick={() => setReworkDialogOpen(false)}>
          <div className="tech-modal-container" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="tech-modal-header">
              <h3 className="tech-modal-title" style={{ color: '#dc2626' }}>
                <RotateCcw size={20} />
                <span>Yêu cầu Kỹ thuật viên xử lý lại</span>
              </h3>
              <button className="tech-modal-close" onClick={() => setReworkDialogOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="tech-modal-body">
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Vui lòng nêu rõ lý do ảnh hoặc công việc chưa đạt yêu cầu để Kỹ thuật viên khắc phục:
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  'Ảnh chụp mờ, không thấy rõ tem serial',
                  'Chưa chụp tổng thể vị trí lắp đặt hộp',
                  'Khách báo chưa được hướng dẫn app',
                  'Thiếu ảnh biên bản nghiệm thu có chữ ký khách'
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="tkd-chip"
                    onClick={() => setReworkReason(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                placeholder="Nhập lý do chi tiết..."
                value={reworkReason}
                onChange={(e) => setReworkReason(e.target.value)}
                style={{
                  width: '100%',
                  borderRadius: 10,
                  border: '1px solid var(--border-subtle)',
                  padding: 12,
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  resize: 'vertical'
                }}
              />
            </div>

            <div className="tech-modal-footer">
              <button className="btn btn-secondary" onClick={() => setReworkDialogOpen(false)} disabled={submitting}>
                Hủy bỏ
              </button>
              <button
                className="btn btn-danger"
                disabled={submitting || !reworkReason.trim()}
                onClick={handleReject}
                style={{ fontWeight: 700 }}
              >
                {submitting ? 'Đang gửi...' : 'Gửi yêu cầu xử lý lại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
