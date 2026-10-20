import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  Truck,
  Wrench,
  Camera,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Play,
  CalendarDays,
  LayoutGrid
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../contexts/ToastContext';
import { deliveryApi, DailyTask, DailyTasksResponse } from '../../services/deliveryInstallation';
import './technician-tasks.css';

function getWeekDays(baseDateStr: string): { dateStr: string; dayName: string; dayNumber: string; isToday: boolean }[] {
  const d = new Date(baseDateStr);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(d);
  monday.setDate(monday.getDate() - diffToMonday);

  const todayStr = new Date().toISOString().split('T')[0];
  const days: { dateStr: string; dayName: string; dayNumber: string; isToday: boolean }[] = [];
  const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(cur.getDate() + i);
    const iso = cur.toISOString().split('T')[0];
    const dd = String(cur.getDate()).padStart(2, '0');
    const mm = String(cur.getMonth() + 1).padStart(2, '0');
    days.push({
      dateStr: iso,
      dayName: dayNames[i],
      dayNumber: `${dd}/${mm}`,
      isToday: iso === todayStr,
    });
  }
  return days;
}

function getVnDateStr(d: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}

function formatTaskTimeSlot(task: DailyTask): string {
  if (task.scheduledAt) {
    try {
      const start = new Date(task.scheduledAt);
      const end = task.estimatedEndTime ? new Date(task.estimatedEndTime) : new Date(start.getTime() + 2 * 3600000);
      const fmt = (d: Date) => d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
      return `${fmt(start)} - ${fmt(end)}`;
    } catch {
      // fallback
    }
  }
  return task.timeSlot || '08:00 - 10:00';
}

function getTaskShift(task: DailyTask): 'morning' | 'afternoon' | 'evening' {
  if (!task.scheduledAt) return 'morning';
  try {
    const d = new Date(task.scheduledAt);
    const hour = d.getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  } catch {
    return 'morning';
  }
}

function isTaskCurrentlyLive(task: DailyTask): boolean {
  if (!task.scheduledAt) return false;
  try {
    const now = new Date();
    const start = new Date(task.scheduledAt);
    const end = task.estimatedEndTime ? new Date(task.estimatedEndTime) : new Date(start.getTime() + 2 * 3600000);
    return now >= start && now <= end;
  } catch {
    return false;
  }
}

const getStatusBadgeClass = (status: string, reworkNotes?: string | null) => {
  if (reworkNotes) return 'tech-badge-status rework';
  switch (status) {
    case 'ASSIGNED':
    case 'NEW':
      return 'tech-badge-status new';
    case 'IN_PROGRESS':
    case 'DELIVERED':
    case 'INSTALLED':
      return 'tech-badge-status in-progress';
    case 'WAITING_PO_CONFIRMATION':
      return 'tech-badge-status waiting';
    case 'COMPLETED':
    case 'RESOLVED':
      return 'tech-badge-status completed';
    default:
      return 'tech-badge-status in-progress';
  }
};

const TimetableCard: React.FC<{
  task: DailyTask;
  onOpen: (task: DailyTask) => void;
  onStart: (e: React.MouseEvent, task: DailyTask) => void;
  submitting?: boolean;
}> = ({ task, onOpen, onStart, submitting }) => {
  const isDelivery = task.type === 'DELIVERY_INSTALLATION';
  const isLive = isTaskCurrentlyLive(task);
  const firstItem = task.items?.[0];
  const itemTitle = firstItem
    ? `${firstItem.productName || 'Thiết bị SmartBox'}${firstItem.variantName ? ` (${firstItem.variantName})` : ''}`
    : task.typeLabel;

  return (
    <div
      className={`timetable-card ${isDelivery ? 'delivery' : 'warranty'}`}
      onClick={() => onOpen(task)}
    >
      <div>
        {/* Top Header: Shift Tag, Live indicator, Type & Status badge */}
        <div className="timetable-card-top-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className={`timetable-period-tag ${!isDelivery ? 'warranty' : ''}`}>
              <Clock size={12} />
              <span>{formatTaskTimeSlot(task)}</span>
            </span>
            {isLive && (
              <span className="timetable-live-tag">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626' }} />
                Đang diễn ra
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className={`tech-badge-type ${task.typeColor}`}>
              {isDelivery ? <Truck size={11} style={{ marginRight: 3 }} /> : <Wrench size={11} style={{ marginRight: 3 }} />}
              {task.typeLabel}
            </span>
            <span className={getStatusBadgeClass(task.status, task.reworkNotes)}>
              {task.reworkNotes ? 'Cần làm lại' : task.statusLabel}
            </span>
          </div>
        </div>

        {/* Subject & Order Code */}
        <div className="timetable-subject-wrap">
          <div className="timetable-subject-title">{itemTitle}</div>
          <div className="timetable-subject-sub">
            <span className="fpt-sku-pill">{task.orderCode}</span>
            {task.items?.length > 1 && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                +{task.items.length - 1} phụ kiện khác
              </span>
            )}
          </div>
        </div>

        {/* Room / Address */}
        <div className="timetable-room-row">
          <MapPin size={14} />
          <span title={task.shippingAddress}>{task.shortAddress || task.shippingAddress || 'Chưa có địa chỉ'}</span>
          {task.shippingAddress && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.shippingAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ color: '#4f46e5', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: '0.76rem', textDecoration: 'none' }}
              title="Mở Google Maps chỉ đường"
            >
              <ExternalLink size={12} />
            </a>
          )}
        </div>

        {/* Customer & Quick Call */}
        <div className="timetable-teacher-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
            <User size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {task.customerName}
            </span>
          </div>
          {task.customerPhone && (
            <a
              href={`tel:${task.customerPhone}`}
              onClick={(e) => e.stopPropagation()}
              className="timetable-call-btn"
            >
              <Phone size={11} /> Gọi {task.customerPhone}
            </a>
          )}
        </div>

        {/* Rework Alert */}
        {task.reworkNotes && (
          <div className="tech-card-rework-alert" style={{ marginTop: 8, padding: '6px 10px', fontSize: '0.8rem' }}>
            <AlertTriangle size={13} />
            <span>PO yêu cầu làm lại: {task.reworkNotes}</span>
          </div>
        )}

        {/* Proof Preview */}
        {task.completionPhotos && task.completionPhotos.length > 0 && (
          <div className="tech-card-proof-preview" style={{ marginTop: 8, padding: '4px 8px', fontSize: '0.78rem' }}>
            <Camera size={13} />
            <span>Đã nộp {task.completionPhotos.length} ảnh nghiệm thu</span>
          </div>
        )}
      </div>

      {/* Card Footer with Direct Action Buttons */}
      <div className="timetable-card-footer">
        {task.status === 'ASSIGNED' || task.status === 'NEW' ? (
          <button
            type="button"
            className="fpt-btn fpt-btn-primary"
            style={{ padding: '4px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            onClick={(e) => onStart(e, task)}
            disabled={submitting}
          >
            <Play size={11} /> Bắt đầu ca
          </button>
        ) : task.status === 'IN_PROGRESS' || task.status === 'DELIVERED' || task.status === 'INSTALLED' ? (
          <button
            type="button"
            className="fpt-btn"
            style={{ padding: '4px 10px', fontSize: '11px', background: '#10b981', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 6 }}
            onClick={(e) => {
              e.stopPropagation();
              onOpen(task);
            }}
          >
            <Camera size={11} /> Nghiệm thu
          </button>
        ) : (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {task.statusLabel}
          </span>
        )}

        <span className="timetable-quick-action">
          Chi tiết →
        </span>
      </div>
    </div>
  );
};

export const TechnicianDailyTasks: React.FC = () => {
  const { profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(() => getVnDateStr());

  const [viewMode, setViewMode] = useState<'timetable_day' | 'timetable_week' | 'cards'>('timetable_day');
  const [data, setData] = useState<DailyTasksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);

  // Weekly data state
  const [weekTasks, setWeekTasks] = useState<Record<string, DailyTask[]>>({});
  const [weekLoading, setWeekLoading] = useState(false);

  // Proof submission form state
  const [proofPhotos, setProofPhotos] = useState<string[]>([]);
  const [completionNote, setCompletionNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTasks = useCallback(async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await deliveryApi.dailyTasks(dateStr);
      setData(res);
      setSelectedTask((prev) => {
        if (!prev) return null;
        const updated = res.tasks.find((t) => t.id === prev.id);
        return updated || prev;
      });
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải danh sách công việc trong ngày.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWeekTasks = useCallback(async (baseDate: string) => {
    const days = getWeekDays(baseDate);
    setWeekLoading(true);
    try {
      const results = await Promise.all(
        days.map(async (day) => {
          try {
            const res = await deliveryApi.dailyTasks(day.dateStr);
            return { dateStr: day.dateStr, tasks: res.tasks || [] };
          } catch {
            return { dateStr: day.dateStr, tasks: [] };
          }
        })
      );
      const map: Record<string, DailyTask[]> = {};
      results.forEach((r) => {
        map[r.dateStr] = r.tasks;
      });
      setWeekTasks(map);
    } finally {
      setWeekLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks(selectedDate);
  }, [selectedDate, loadTasks]);

  useEffect(() => {
    if (viewMode === 'timetable_week') {
      void loadWeekTasks(selectedDate);
    }
  }, [viewMode, selectedDate, loadWeekTasks]);

  // Real-time synchronization when a new task is assigned or nearing scheduled time
  useEffect(() => {
    const handleNewOrUpcomingTask = () => {
      void loadTasks(selectedDate);
      if (viewMode === 'timetable_week') {
        void loadWeekTasks(selectedDate);
      }
    };
    window.addEventListener('smartbox:new_task', handleNewOrUpcomingTask);
    window.addEventListener('smartbox:upcoming_task', handleNewOrUpcomingTask);
    return () => {
      window.removeEventListener('smartbox:new_task', handleNewOrUpcomingTask);
      window.removeEventListener('smartbox:upcoming_task', handleNewOrUpcomingTask);
    };
  }, [selectedDate, viewMode, loadTasks, loadWeekTasks]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(getVnDateStr(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(getVnDateStr(d));
  };

  const handlePrevWeek = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 7);
    setSelectedDate(getVnDateStr(d));
  };

  const handleNextWeek = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    setSelectedDate(getVnDateStr(d));
  };

  const handleToday = () => {
    setSelectedDate(getVnDateStr());
  };

  const handleTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setSelectedDate(getVnDateStr(d));
  };

  const openTaskModal = (task: DailyTask) => {
    setSelectedTask(task);
    setProofPhotos(task.completionPhotos || []);
    setCompletionNote(task.completionNote || '');
  };

  const closeTaskModal = () => {
    setSelectedTask(null);
    setProofPhotos([]);
    setCompletionNote('');
  };

  const handleStartTask = async (taskToStart?: DailyTask) => {
    const target = taskToStart || selectedTask;
    if (!target || submitting) return;
    setSubmitting(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      await deliveryApi.mutate(
        target as any,
        'start',
        undefined,
        idempotencyKey
      );
      toast.success('Đã bắt đầu ca thi công!');
      await loadTasks(selectedDate);
      if (viewMode === 'timetable_week') {
        void loadWeekTasks(selectedDate);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Không thể bắt đầu ca thi công.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await deliveryApi.uploadProof(file);
        if (res?.url) {
          uploadedUrls.push(res.url);
        }
      }
      setProofPhotos((prev) => [...prev, ...uploadedUrls]);
      toast.success(`Đã tải lên ${uploadedUrls.length} ảnh minh chứng.`);
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải ảnh minh chứng.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setProofPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitProof = async () => {
    if (!selectedTask || submitting) return;
    if (proofPhotos.length === 0) {
      toast.error('Bắt buộc phải tải lên hoặc chụp ít nhất 1 ảnh minh chứng hoàn thành.');
      return;
    }
    setSubmitting(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      await deliveryApi.submitCompletion(
        selectedTask.id,
        {
          proofPhotos,
          completionNote: completionNote.trim() || undefined,
        },
        selectedTask.version,
        idempotencyKey
      );
      toast.success('Đã gửi báo cáo nghiệm thu thành công! Chờ PO kiểm tra và phê duyệt.');
      await loadTasks(selectedDate);
      if (viewMode === 'timetable_week') {
        void loadWeekTasks(selectedDate);
      }
      closeTaskModal();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể gửi báo cáo hoàn thành.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter tasks based on active metric tab
  const filteredTasks = (data?.tasks || []).filter((task) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'PENDING') return task.status === 'ASSIGNED' || task.status === 'NEW';
    if (activeFilter === 'IN_PROGRESS')
      return task.status === 'IN_PROGRESS' || task.status === 'DELIVERED' || task.status === 'INSTALLED';
    if (activeFilter === 'WAITING') return task.status === 'WAITING_PO_CONFIRMATION';
    if (activeFilter === 'COMPLETED') return task.status === 'COMPLETED' || task.status === 'RESOLVED';
    return true;
  });

  // Shifts definition for daily timetable
  const shifts = [
    { id: 'morning' as const, title: 'Ca Sáng', range: '08:00 – 12:00', icon: '🌅', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.08)' },
    { id: 'afternoon' as const, title: 'Ca Chiều', range: '13:30 – 17:30', icon: '☀️', color: '#ea580c', bg: 'rgba(234, 88, 12, 0.08)' },
    { id: 'evening' as const, title: 'Ca Tối / Tăng ca', range: '18:00 – 21:00', icon: '🌙', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)' },
  ];

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  // Urgent upcoming or live tasks within next 60 minutes
  const upcomingUrgentTasks = useMemo(() => {
    if (!data?.tasks) return [];
    const nowMs = Date.now();
    return data.tasks.filter((t) => {
      if (t.status === 'COMPLETED' || t.status === 'RESOLVED' || t.status === 'FAILED') return false;
      if (!t.scheduledAt) return false;
      try {
        const schedMs = new Date(t.scheduledAt).getTime();
        const diffMin = (schedMs - nowMs) / 60000;
        return diffMin >= -60 && diffMin <= 60;
      } catch {
        return false;
      }
    });
  }, [data?.tasks]);

  return (
    <div className="tech-tasks-page">
      {/* Top Header & Date / View Navigation */}
      <header className="tech-header">
        <div className="tech-header-info">
          <h1>
            <Truck size={24} color="#4f46e5" />
            Lịch làm việc & Nhiệm vụ trong ngày
          </h1>
          <p>
            Xin chào {profile?.full_name || 'Kỹ thuật viên'}. Quản lý danh sách thi công theo thời khóa biểu, nộp ảnh minh chứng và nghiệm thu.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* View Mode Switcher: Thời khóa biểu ngày | Thời khóa biểu tuần | Dạng thẻ */}
          <div className="tech-view-mode-tabs">
            <button
              type="button"
              className={`tech-view-tab ${viewMode === 'timetable_day' ? 'active' : ''}`}
              onClick={() => setViewMode('timetable_day')}
              title="Xem lịch theo ca sáng, chiều, tối"
            >
              <CalendarDays size={14} />
              <span>Thời khóa biểu ngày</span>
            </button>
            <button
              type="button"
              className={`tech-view-tab ${viewMode === 'timetable_week' ? 'active' : ''}`}
              onClick={() => setViewMode('timetable_week')}
              title="Xem thời khóa biểu tuần 7 ngày"
            >
              <Clock size={14} />
              <span>Thời khóa biểu tuần</span>
            </button>
            <button
              type="button"
              className={`tech-view-tab ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Xem dạng thẻ danh sách"
            >
              <LayoutGrid size={14} />
              <span>Dạng thẻ</span>
            </button>
          </div>

          {/* Date Controls */}
          <div className="tech-date-controls">
            <button
              className="tech-quick-btn"
              onClick={viewMode === 'timetable_week' ? handlePrevWeek : handlePrevDay}
              title={viewMode === 'timetable_week' ? 'Tuần trước' : 'Ngày trước'}
            >
              <ChevronLeft size={16} />
            </button>

            <div className="tech-date-picker-wrap">
              <Calendar size={17} color="#4f46e5" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <button
              className="tech-quick-btn"
              onClick={viewMode === 'timetable_week' ? handleNextWeek : handleNextDay}
              title={viewMode === 'timetable_week' ? 'Tuần sau' : 'Ngày sau'}
            >
              <ChevronRight size={16} />
            </button>

            <button
              className={`tech-quick-btn ${selectedDate === getVnDateStr() ? 'active' : ''}`}
              onClick={handleToday}
            >
              Hôm nay
            </button>

            <button className="tech-quick-btn" onClick={handleTomorrow}>
              Ngày mai
            </button>

            <button
              className="tech-quick-btn"
              onClick={() => {
                void loadTasks(selectedDate);
                if (viewMode === 'timetable_week') void loadWeekTasks(selectedDate);
              }}
              title="Tải lại"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Upcoming / Live Urgent Task Reminder Banner */}
      {upcomingUrgentTasks.length > 0 && (
        <section className="tech-urgent-banner">
          <div className="tech-urgent-banner-left">
            <div className="tech-urgent-pulse-icon">
              <AlertTriangle size={22} color="#dc2626" />
            </div>
            <div>
              <div className="tech-urgent-title">
                ⏰ SẮP ĐẾN GIỜ HẸN ({upcomingUrgentTasks.length} ca thi công cần chuẩn bị)
              </div>
              <div className="tech-urgent-desc">
                {upcomingUrgentTasks.map((t) => {
                  const diffMin = Math.round((new Date(t.scheduledAt!).getTime() - Date.now()) / 60000);
                  const timeText = diffMin > 0 ? `Bắt đầu sau ${diffMin} phút` : 'Đang trong khung giờ hẹn';
                  return (
                    <span key={t.id} className="tech-urgent-task-pill">
                      <strong>#{t.orderCode}</strong> ({formatTaskTimeSlot(t)}): {timeText} • {t.shippingAddress || t.shortAddress || 'Địa chỉ liên hệ'}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="tech-urgent-banner-actions">
            {(upcomingUrgentTasks[0].shippingAddress || upcomingUrgentTasks[0].shortAddress) && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(upcomingUrgentTasks[0].shippingAddress || upcomingUrgentTasks[0].shortAddress)}`}
                target="_blank"
                rel="noreferrer"
                className="tech-urgent-action-btn maps"
              >
                <MapPin size={15} />
                <span>Chỉ đường Maps</span>
              </a>
            )}
            <button
              type="button"
              className="tech-urgent-action-btn open"
              onClick={() => openTaskModal(upcomingUrgentTasks[0])}
            >
              <Play size={15} />
              <span>Xem chi tiết ca</span>
            </button>
          </div>
        </section>
      )}

      {/* Summary Metrics Pills */}
      <section className="tech-metrics-bar">
        <div
          className={`tech-metric-card ${activeFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setActiveFilter('ALL')}
        >
          <div>
            <span className="tech-metric-label">Tổng nhiệm vụ</span>
            <div className="tech-metric-count">{data?.summary.total || 0}</div>
          </div>
          <Calendar size={22} color="#6366f1" />
        </div>

        <div
          className={`tech-metric-card ${activeFilter === 'PENDING' ? 'active' : ''}`}
          onClick={() => setActiveFilter('PENDING')}
        >
          <div>
            <span className="tech-metric-label">Mới giao</span>
            <div className="tech-metric-count" style={{ color: '#0284c7' }}>
              {data?.summary.pending || 0}
            </div>
          </div>
          <Clock size={22} color="#0284c7" />
        </div>

        <div
          className={`tech-metric-card ${activeFilter === 'IN_PROGRESS' ? 'active' : ''}`}
          onClick={() => setActiveFilter('IN_PROGRESS')}
        >
          <div>
            <span className="tech-metric-label">Đang thực hiện</span>
            <div className="tech-metric-count" style={{ color: '#4f46e5' }}>
              {data?.summary.inProgress || 0}
            </div>
          </div>
          <Play size={22} color="#4f46e5" />
        </div>

        <div
          className={`tech-metric-card ${activeFilter === 'WAITING' ? 'active' : ''}`}
          onClick={() => setActiveFilter('WAITING')}
        >
          <div>
            <span className="tech-metric-label">Chờ PO duyệt</span>
            <div className="tech-metric-count" style={{ color: '#ea580c' }}>
              {data?.summary.waitingConfirmation || 0}
            </div>
          </div>
          <Camera size={22} color="#ea580c" />
        </div>

        <div
          className={`tech-metric-card ${activeFilter === 'COMPLETED' ? 'active' : ''}`}
          onClick={() => setActiveFilter('COMPLETED')}
        >
          <div>
            <span className="tech-metric-label">Đã hoàn thành</span>
            <div className="tech-metric-count" style={{ color: '#059669' }}>
              {data?.summary.completed || 0}
            </div>
          </div>
          <CheckCircle2 size={22} color="#059669" />
        </div>
      </section>

      {/* ============================================================== */}
      {/* 1. CHẾ ĐỘ THỜI KHÓA BIỂU NGÀY (DAILY 3-COLUMN TIMETABLE BOARD) */}
      {/* ============================================================== */}
      {viewMode === 'timetable_day' && (
        <section className="timetable-day-container">
          {loading && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
              <RefreshCw size={24} className="spin" style={{ marginBottom: 10, color: '#4f46e5' }} />
              <div>Đang tải thời khóa biểu ngày...</div>
            </div>
          )}

          {!loading && (
            <>
              {filteredTasks.length === 0 && (
                <div className="timetable-day-notice">
                  <span>☕ Ngày <strong>{new Date(selectedDate).toLocaleDateString('vi-VN')}</strong> chưa có ca thi công nào.</span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" className="tech-quick-btn" onClick={handleToday}>Xem Hôm nay</button>
                    <button type="button" className="tech-quick-btn" onClick={handleTomorrow}>Xem Ngày mai</button>
                    <button type="button" className="tech-quick-btn" onClick={() => setViewMode('timetable_week')}>Thời khóa biểu tuần</button>
                  </div>
                </div>
              )}

              <div className="timetable-columns-board">
                {shifts.map((shift) => {
                  const shiftTasks = filteredTasks.filter((t) => getTaskShift(t) === shift.id);
                  return (
                    <div key={shift.id} className="timetable-shift-column">
                      {/* Column Header */}
                      <div className="timetable-col-header" style={{ borderTop: `4px solid ${shift.color}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '1.25rem' }}>{shift.icon}</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: shift.color }}>{shift.title}</div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{shift.range}</div>
                          </div>
                        </div>
                        <span className={`timetable-col-count ${shiftTasks.length > 0 ? 'has-tasks' : ''}`}>
                          {shiftTasks.length} ca
                        </span>
                      </div>

                      {/* Column Task Cards or Empty Slot */}
                      <div className="timetable-col-body">
                        {shiftTasks.length > 0 ? (
                          shiftTasks.map((task) => (
                            <TimetableCard
                              key={task.id}
                              task={task}
                              onOpen={openTaskModal}
                              onStart={(e, t) => {
                                e.stopPropagation();
                                void handleStartTask(t);
                              }}
                              submitting={submitting}
                            />
                          ))
                        ) : (
                          <div className="timetable-col-empty">
                            <span style={{ fontSize: '1.5rem', opacity: 0.5 }}>{shift.icon}</span>
                            <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                              Trống lịch {shift.title}
                            </div>
                            <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                              Khung giờ {shift.range} sẵn sàng nhận đơn mới
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      {/* ============================================================== */}
      {/* 2. CHẾ ĐỘ THỜI KHÓA BIỂU TUẦN (WEEKLY TIMETABLE GRID - 7 NGÀY) */}
      {/* ============================================================== */}
      {viewMode === 'timetable_week' && (
        <section className="weekly-timetable-card">
          <div className="weekly-timetable-header">
            <div className="weekly-timetable-title">
              <CalendarDays size={20} color="#4f46e5" />
              <span>
                Thời khóa biểu tuần: {weekDays[0].dayNumber} – {weekDays[6].dayNumber}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="weekly-nav-btn" onClick={handlePrevWeek}>
                <ChevronLeft size={14} /> Tuần trước
              </button>
              <button className="weekly-nav-btn" onClick={handleToday}>
                Tuần này
              </button>
              <button className="weekly-nav-btn" onClick={handleNextWeek}>
                Tuần sau <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {weekLoading && (
            <p style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
              Đang tải dữ liệu thời khóa biểu tuần...
            </p>
          )}

          {!weekLoading && (
            <div className="weekly-grid-container">
              <table className="weekly-grid-table">
                <thead>
                  <tr>
                    <th style={{ width: 110 }}>Ca / Khung giờ</th>
                    {weekDays.map((d) => (
                      <th
                        key={d.dateStr}
                        className={d.isToday ? 'today-col' : ''}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedDate(d.dateStr);
                          setViewMode('timetable_day');
                        }}
                        title="Bấm để xem chi tiết ngày này"
                      >
                        <div>{d.dayName}</div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 500, opacity: 0.85 }}>
                          {d.dayNumber} {d.isToday && '(Hôm nay)'}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((shift) => (
                    <tr key={shift.id}>
                      {/* Left Header for Shift */}
                      <td className="weekly-shift-label-cell">
                        <div style={{ fontSize: '1.2rem', marginBottom: 2 }}>{shift.icon}</div>
                        <div style={{ color: shift.color }}>{shift.title}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {shift.range}
                        </div>
                      </td>

                      {/* 7 Days Columns */}
                      {weekDays.map((d) => {
                        const dayTasks = (weekTasks[d.dateStr] || []).filter(
                          (t) => getTaskShift(t) === shift.id
                        );
                        return (
                          <td
                            key={d.dateStr}
                            className={d.isToday ? 'today-cell' : ''}
                          >
                            {dayTasks.length > 0 ? (
                              dayTasks.map((t) => {
                                const isDelivery = t.type === 'DELIVERY_INSTALLATION';
                                return (
                                  <div
                                    key={t.id}
                                    className={`weekly-mini-item ${isDelivery ? 'delivery' : 'warranty'}`}
                                    onClick={() => openTaskModal(t)}
                                    title={`${t.typeLabel} - ${t.customerName} (${formatTaskTimeSlot(t)})`}
                                  >
                                    <div className="weekly-mini-time">
                                      <Clock size={10} />
                                      <span>{formatTaskTimeSlot(t)}</span>
                                    </div>
                                    <div className="weekly-mini-title">
                                      {t.items?.[0]?.productName || t.typeLabel}
                                    </div>
                                    <div className="weekly-mini-cust">
                                      {t.customerName} · {t.orderCode}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div
                                style={{
                                  fontSize: '0.72rem',
                                  color: 'var(--text-muted)',
                                  textAlign: 'center',
                                  padding: '12px 0',
                                }}
                              >
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ============================================================== */}
      {/* 3. CHẾ ĐỘ THẺ LƯỚI TRUYỀN THỐNG (CARD GRID VIEW)               */}
      {/* ============================================================== */}
      {viewMode === 'cards' && (
        <section className="tech-cards-grid">
          {loading && <p style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '32px' }}>Đang tải công việc...</p>}

          {!loading && filteredTasks.length === 0 && (
            <div className="tech-empty-state">
              <Truck size={40} />
              <h3>Không có công việc nào trong ngày này</h3>
              <p>
                Bạn chưa có lịch hẹn giao lắp hoặc bảo hành nào vào ngày{' '}
                <strong>{new Date(selectedDate).toLocaleDateString('vi-VN')}</strong>.
              </p>
            </div>
          )}

          {!loading &&
            filteredTasks.map((task) => (
              <TimetableCard
                key={task.id}
                task={task}
                onOpen={openTaskModal}
                onStart={(e, t) => {
                  e.stopPropagation();
                  void handleStartTask(t);
                }}
                submitting={submitting}
              />
            ))}
        </section>
      )}

      {/* Task Detail & Proof Modal */}
      {selectedTask && (
        <div className="tech-modal-overlay" onClick={closeTaskModal}>
          <div className="tech-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="tech-modal-header">
              <div>
                <h3 className="tech-modal-title">
                  {selectedTask.type === 'DELIVERY_INSTALLATION' ? <Truck size={20} color="#4f46e5" /> : <Wrench size={20} color="#f59e0b" />}
                  Chi tiết {selectedTask.typeLabel} · {selectedTask.orderCode}
                </h3>
                <span className={getStatusBadgeClass(selectedTask.status, selectedTask.reworkNotes)}>
                  {selectedTask.reworkNotes ? '⚠️ Yêu cầu xử lý lại' : selectedTask.statusLabel}
                </span>
              </div>
              <button className="tech-modal-close" onClick={closeTaskModal}>
                <X size={20} />
              </button>
            </div>

            <div className="tech-modal-body">
              {/* Rework alert if any */}
              {selectedTask.reworkNotes && (
                <div className="tech-card-rework-alert" style={{ fontSize: '0.9rem', padding: '12px 16px' }}>
                  <AlertTriangle size={18} />
                  <div>
                    <strong>Phản hồi yêu cầu làm lại từ PO:</strong>
                    <p style={{ margin: '4px 0 0 0' }}>{selectedTask.reworkNotes}</p>
                  </div>
                </div>
              )}

              {/* Customer Box with Direct Actions */}
              <div className="tech-modal-cust-box">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '1.05rem' }}>
                    <User size={18} />
                    <span>{selectedTask.customerName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4f46e5', fontWeight: 600 }}>
                    <Clock size={15} />
                    <span>{formatTaskTimeSlot(selectedTask)}</span>
                  </div>
                </div>

                <div className="tech-card-info-row">
                  <MapPin size={16} />
                  <span>{selectedTask.shippingAddress || 'Chưa có địa chỉ chi tiết'}</span>
                </div>

                <div className="tech-modal-cust-actions">
                  {selectedTask.customerPhone && (
                    <a href={`tel:${selectedTask.customerPhone}`} className="tech-btn-call">
                      <Phone size={15} /> Gọi cho khách ({selectedTask.customerPhone})
                    </a>
                  )}

                  {selectedTask.shippingAddress && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedTask.shippingAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tech-btn-map"
                    >
                      <MapPin size={15} /> Mở chỉ đường (Google Maps)
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>

                {selectedTask.installationNote && (
                  <div style={{ marginTop: 6, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                    <strong>Ghi chú đơn hàng / Hướng dẫn:</strong> {selectedTask.installationNote}
                  </div>
                )}
              </div>

              {/* Items List */}
              {selectedTask.items && selectedTask.items.length > 0 && (
                <div className="tech-modal-items">
                  <div className="tech-modal-items-head">Sản phẩm cần thi công ({selectedTask.items.length})</div>
                  {selectedTask.items.map((item) => (
                    <div key={item.id} className="tech-modal-item-row">
                      <div>
                        <strong>{item.productName || item.sku || 'Sản phẩm'}</strong>
                        {item.variantName && (
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            Biến thể: {item.variantName}
                          </div>
                        )}
                      </div>
                      <div style={{ fontWeight: 700 }}>SL: {item.quantity}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Start Task Action if New */}
              {selectedTask.status === 'ASSIGNED' && (
                <div style={{ background: 'rgba(99, 102, 241, 0.06)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>
                    Công việc đang ở trạng thái <strong>Mới giao</strong>. Hãy bấm bắt đầu khi bắt đầu di chuyển hoặc tới nơi thi công.
                  </p>
                  <button
                    className="btn btn-primary"
                    disabled={submitting}
                    onClick={() => void handleStartTask()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Play size={16} /> Bắt đầu ca làm việc
                  </button>
                </div>
              )}

              {/* Status Banner for Waiting Confirmation */}
              {selectedTask.status === 'WAITING_PO_CONFIRMATION' && (
                <div style={{ background: 'rgba(234, 88, 12, 0.08)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(234, 88, 12, 0.3)', color: '#c2410c' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.95rem' }}>
                    <Clock size={18} />
                    <span>Đang chờ PO duyệt nghiệm thu</span>
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem' }}>
                    Báo cáo hoàn thành và ảnh minh chứng đã được gửi tới Quản lý Kho & SP (PO). Đơn hàng chưa kết thúc ngay mà sẽ chính thức hoàn thành khi PO phê duyệt nghiệm thu.
                  </p>
                </div>
              )}

              {/* Status Banner for Completed */}
              {selectedTask.status === 'COMPLETED' && (
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#047857' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.95rem' }}>
                    <CheckCircle2 size={18} />
                    <span>Công việc đã hoàn thành & Được PO nghiệm thu</span>
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem' }}>
                    Quy trình đơn hàng đã kết thúc thành công. Bảo hành điện tử đã được kích hoạt cho khách hàng.
                  </p>
                </div>
              )}

              {/* Proof of Work Section: Upload & Submit */}
              <div className="tech-proof-section">
                <div className="tech-proof-title">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Camera size={18} color="#4f46e5" />
                    <span>Ảnh minh chứng nghiệm thu (Proof of Work)</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>
                    * Bắt buộc ít nhất 1 ảnh
                  </span>
                </div>

                {/* Upload Button */}
                {selectedTask.status !== 'COMPLETED' && (
                  <div className="tech-upload-btn-wrap">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      capture="environment"
                      multiple
                      style={{ display: 'none' }}
                      id="proof-camera-input"
                      onChange={handleUploadPhoto}
                      disabled={uploading || submitting}
                    />
                    <label htmlFor="proof-camera-input" className="tech-upload-label">
                      <Camera size={16} />
                      <span>{uploading ? 'Đang tải ảnh...' : 'Chụp ảnh / Tải ảnh lên'}</span>
                    </label>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Chụp thực tế tại nhà khách hàng (hộp SmartBox đã lắp, tem bảo hành...)
                    </span>
                  </div>
                )}

                {/* Photo Thumbnails */}
                {proofPhotos.length > 0 && (
                  <div className="tech-proof-grid">
                    {proofPhotos.map((url, idx) => (
                      <div key={idx} className="tech-proof-thumb">
                        <img src={url} alt={`Minh chứng ${idx + 1}`} />
                        {selectedTask.status !== 'COMPLETED' && selectedTask.status !== 'WAITING_PO_CONFIRMATION' && (
                          <button
                            type="button"
                            className="tech-proof-remove"
                            onClick={() => handleRemovePhoto(idx)}
                            title="Xóa ảnh này"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Completion Note Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, marginBottom: 6 }}>
                    Ghi chú kết quả hoàn thành & biên bản:
                  </label>
                  <textarea
                    className="tech-proof-note-input"
                    placeholder="VD: Đã hoàn tất lắp đặt hộp thông minh, kiểm tra cảm biến tải trọng hoạt động tốt, đã hướng dẫn khách quét app mở khóa."
                    value={completionNote}
                    onChange={(e) => setCompletionNote(e.target.value)}
                    disabled={selectedTask.status === 'COMPLETED' || submitting}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer with Submit Action */}
            <div className="tech-modal-footer">
              <button className="btn btn-secondary" onClick={closeTaskModal}>
                Đóng
              </button>

              {selectedTask.status !== 'COMPLETED' && (
                <button
                  className="tech-btn-submit-proof"
                  disabled={submitting || uploading || proofPhotos.length === 0}
                  onClick={handleSubmitProof}
                  title={proofPhotos.length === 0 ? 'Cần tải lên ít nhất 1 ảnh minh chứng' : 'Gửi báo cáo nghiệm thu'}
                >
                  <Upload size={16} />
                  <span>
                    {submitting
                      ? 'Đang gửi...'
                      : selectedTask.status === 'WAITING_PO_CONFIRMATION'
                      ? 'Cập nhật lại báo cáo'
                      : 'Gửi báo cáo hoàn thành'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
