import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  RefreshCw,
  Phone,
  FileText
} from 'lucide-react';
import { toast } from '../../contexts/ToastContext';
import { deliveryApi, TechnicianAvailability, Job } from '../../services/deliveryInstallation';
import './po-delivery.css';

interface PoDeliveryDispatchProps {
  orderId: string;
  orderCode?: string;
  onAssigned: (job: Job) => void;
  onCancel?: () => void;
}

export const PoDeliveryDispatch: React.FC<PoDeliveryDispatchProps> = ({
  orderId,
  orderCode,
  onAssigned,
  onCancel
}) => {
  // Default to tomorrow 09:00 to 11:00
  const getDefaultDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [date, setDate] = useState<string>(getDefaultDate);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('11:00');
  const [note, setNote] = useState<string>('');

  const [technicians, setTechnicians] = useState<TechnicianAvailability[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [checking, setChecking] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Compute ISO time strings
  const getTimeWindow = useCallback(() => {
    try {
      const startIso = new Date(`${date}T${startTime}:00`).toISOString();
      const endIso = new Date(`${date}T${endTime}:00`).toISOString();
      return { startIso, endIso, valid: true };
    } catch {
      return { startIso: '', endIso: '', valid: false };
    }
  }, [date, startTime, endTime]);

  // Query availability from backend
  const checkAvailability = useCallback(async () => {
    const { startIso, endIso, valid } = getTimeWindow();
    if (!valid || !startIso || !endIso) return;

    if (new Date(endIso) <= new Date(startIso)) {
      toast.error('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }

    setChecking(true);
    try {
      const result = await deliveryApi.availability(startIso, endIso);
      setTechnicians(result);

      // If currently selected technician became busy, unselect or keep with warning
      setSelectedTechId((prev) => {
        const found = result.find((t) => t.id === prev);
        if (found && !found.isAvailable) return '';
        return prev;
      });
    } catch (err: any) {
      toast.error(err?.message || 'Không thể kiểm tra lịch kỹ thuật viên.');
    } finally {
      setChecking(false);
    }
  }, [getTimeWindow]);

  useEffect(() => {
    void checkAvailability();
  }, [checkAvailability]);

  const selectedTech = technicians.find((t) => t.id === selectedTechId);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTechId) {
      toast.error('Vui lòng chọn kỹ thuật viên để phân công.');
      return;
    }
    if (selectedTech && !selectedTech.isAvailable) {
      toast.error(`Kỹ thuật viên ${selectedTech.fullName} đang trùng lịch trong khung giờ này. Vui lòng chọn người khác.`);
      return;
    }

    const { startIso, endIso } = getTimeWindow();
    setSubmitting(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const payload = {
        assignedTo: selectedTechId,
        scheduledAt: startIso,
        estimatedEndTime: endIso,
        installationNote: note.trim() || undefined,
      };

      const created = await deliveryApi.assign(orderId, payload, idempotencyKey);
      toast.success(`Đã phân công đơn hàng cho kỹ thuật viên ${selectedTech?.fullName || ''}!`);
      onAssigned(created);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể phân công kỹ thuật viên.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="po-dispatch-card">
      <div className="po-dispatch-header">
        <div>
          <h3>
            <Calendar size={20} color="#4f46e5" />
            <span>Phân công & Lên lịch giao lắp (Technician Dispatch)</span>
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
            Đơn hàng #{orderCode || orderId.slice(0, 8).toUpperCase()}. Hệ thống tự động kiểm tra lịch trùng của toàn bộ kỹ thuật viên.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={checkAvailability}
          disabled={checking || submitting}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={14} className={checking ? 'spin' : ''} />
          <span>Kiểm tra lại lịch</span>
        </button>
      </div>

      <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Date and Time Window Selection */}
        <div className="po-dispatch-time-grid">
          <div className="po-dispatch-field">
            <label>Ngày thực hiện</label>
            <input
              type="date"
              required
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="po-dispatch-field">
            <label>Giờ bắt đầu dự kiến</label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="po-dispatch-field">
            <label>Giờ kết thúc dự kiến</label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        {/* Technicians Availability Cards */}
        <div>
          <div className="po-tech-list-label">
            <span>
              Chọn Kỹ thuật viên phụ trách ca ({technicians.length} kỹ thuật viên):
            </span>
            {checking && <span style={{ color: '#4f46e5', fontSize: '0.8rem' }}>Đang kiểm tra lịch...</span>}
          </div>

          <div className="po-tech-grid">
            {technicians.map((tech) => {
              const isSelected = selectedTechId === tech.id;
              const isAvailable = tech.isAvailable;

              return (
                <div
                  key={tech.id}
                  className={`po-tech-card ${isSelected ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}`}
                  onClick={() => {
                    if (isAvailable) {
                      setSelectedTechId(tech.id);
                    } else {
                      toast.warning(`Kỹ thuật viên ${tech.fullName} đang bận: ${tech.conflictReason}`);
                    }
                  }}
                >
                  <div className="po-tech-card-top">
                    <span className="po-tech-name">
                      <User size={16} />
                      {tech.fullName}
                    </span>

                    <span className={`po-tech-badge-avail ${isAvailable ? 'available' : 'busy'}`}>
                      {isAvailable ? (
                        <>
                          <CheckCircle2 size={12} /> Rảnh (Available)
                        </>
                      ) : (
                        <>
                          <XCircle size={12} /> Bận / Trùng lịch
                        </>
                      )}
                    </span>
                  </div>

                  {!isAvailable && tech.conflictReason && (
                    <div className="po-tech-conflict-reason">
                      ⚠️ {tech.conflictReason}
                    </div>
                  )}

                  <div className="po-tech-meta">
                    {tech.phone ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={12} /> {tech.phone}
                      </span>
                    ) : (
                      <span>Chưa có SĐT</span>
                    )}

                    <span>{tech.activeTasksCount} ca trong ngày</span>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedTech && !selectedTech.isAvailable && (
            <div
              style={{
                marginTop: 10,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#dc2626',
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertTriangle size={16} />
              <span>
                <strong>Không thể gán việc:</strong> Kỹ thuật viên {selectedTech.fullName} có lịch trùng trong khung giờ này.
              </span>
            </div>
          )}
        </div>

        {/* Note from PO */}
        <div className="po-dispatch-field">
          <label>Ghi chú phân công / Dặn dò kỹ thuật viên (nếu có):</label>
          <textarea
            rows={2}
            placeholder="VD: Khách dặn gọi trước khi đến 15 phút, mang theo phụ kiện bát treo tường dài..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={submitting}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          {onCancel && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={submitting}
            >
              Hủy bỏ
            </button>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || checking || !selectedTechId || (selectedTech && !selectedTech.isAvailable)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 24px',
              fontWeight: 700,
            }}
          >
            <Send size={16} />
            <span>{submitting ? 'Đang phân công...' : 'Xác nhận phân công kỹ thuật viên'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
