import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { adminRequest } from '../services/adminRequest';
import { toast } from './ToastContext';

export interface AdminNotice {
  id: string;
  type: string;
  title: string;
  referenceId: string;
  status: string;
  occurredAt: string;
  link: string;
}

function playNotificationSound(type: 'new_task' | 'reminder' | 'order') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === 'new_task' || type === 'order') {
      // 2-tone bright pleasant chime: 587Hz (D5) -> 880Hz (A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.22, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);
    } else if (type === 'reminder') {
      // 3-tone alert chime: 523Hz (C5) -> 659Hz (E5) -> 784Hz (G5)
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + idx * 0.14;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.005, t + 0.38);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.38);
      });
    }
  } catch {
    // AudioContext silently ignored if user has not interacted with document yet
  }
}

interface Feed {
  events: AdminNotice[];
  observedAt: string;
}

interface AdminNotificationsContextValue {
  events: AdminNotice[];
  unread: number;
  pendingOrdersCount: number;
  error: string;
  markRead: () => void;
  fresh: AdminNotice[];
  refresh: () => void;
}

const Context = createContext<AdminNotificationsContextValue | null>(null);

export const AdminNotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [events, setEvents] = useState<AdminNotice[]>([]);
  const [error, setError] = useState('');
  const [seen, setSeen] = useState<string[]>([]);
  const [fresh, setFresh] = useState<AdminNotice[]>([]);
  const known = useRef<Set<string> | null>(null);

  const key = `smartbox_notice_read:${profile?.id}`;

  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      setSeen(Array.isArray(value) ? value.filter(v => typeof v === 'string').slice(-200) : []);
    } catch {
      setSeen([]);
    }
  }, [key]);

  const loadRef = useRef<(() => Promise<void>) | undefined>(undefined);

  useEffect(() => {
    let active = true;
    let loading = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    // Polling phản hồi nhanh: 3 giây, tối đa 6 giây
    const BASE_INTERVAL = 3000;
    const MAX_INTERVAL = 6000;
    let currentInterval = BASE_INTERVAL;

    known.current = null;
    setEvents([]);
    setError('');
    setFresh([]);

    const scheduleNext = (delay: number) => {
      if (!active) return;
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => {
        void load();
      }, delay);
    };

    const load = async (isManualOrVisible = false) => {
      if (loading || !profile || (!isManualOrVisible && document.hidden)) {
        scheduleNext(currentInterval);
        return;
      }
      loading = true;
      try {
        const feed = await adminRequest<Feed>('/admin/notifications');
        if (active) {
          if (known.current) {
            const added = feed.events.filter((e) => !known.current!.has(e.id));
            if (added.length) {
              setFresh(added.slice(0, 3));
              currentInterval = BASE_INTERVAL;

              // 1. Kiểm tra đơn hàng mới (Admin & PO)
              const newOrders = added.filter(e => e.type === 'ORDER');
              if (newOrders.length > 0) {
                const latestOrder = newOrders[0];
                toast.info(
                  `Có đơn hàng mới #${latestOrder.referenceId.slice(0, 8).toUpperCase()} vừa phát sinh!`,
                  'Đơn hàng mới'
                );
                playNotificationSound('order');
                window.dispatchEvent(new CustomEvent('smartbox:new_order', { detail: newOrders }));
              }

              // 2. Kiểm tra phiếu thẩm định PO mới
              const poTickets = added.filter(e => e.type === 'PO');
              if (poTickets.length > 0) {
                const latestTicket = poTickets[0];
                toast.info(
                  `Phiếu PO #${latestTicket.referenceId.slice(0, 8).toUpperCase()} cập nhật trạng thái: ${noticeStatusLabel(latestTicket)}`,
                  'Phê duyệt PO Ticket'
                );
                window.dispatchEvent(new CustomEvent('smartbox:new_ticket', { detail: poTickets }));
              }

              // 3. Kiểm tra công việc mới được phân công cho Kỹ thuật viên
              const newTasks = added.filter(
                e => e.type === 'TASK_ASSIGNED' || (e.type === 'DELIVERY' && e.status === 'ASSIGNED')
              );
              if (newTasks.length > 0) {
                const t = newTasks[0];
                toast.info(
                  `🔔 Bạn có công việc mới được phân công! Đơn hàng #${t.referenceId.slice(0, 8).toUpperCase()}`,
                  'Công việc mới'
                );
                playNotificationSound('new_task');
                window.dispatchEvent(new CustomEvent('smartbox:new_task', { detail: newTasks }));
              }

              // 4. Kiểm tra ca thi công / bảo hành sắp đến giờ hẹn (Gần đến giờ)
              const upcomingTasks = added.filter(e => e.type === 'TASK_UPCOMING');
              if (upcomingTasks.length > 0) {
                const up = upcomingTasks[0];
                toast.warning(
                  `⏰ SẮP ĐẾN GIỜ HẸN: Ca thi công đơn hàng #${up.referenceId.slice(0, 8).toUpperCase()} sắp bắt đầu. Vui lòng chuẩn bị di chuyển!`,
                  'Nhắc nhở ca hẹn'
                );
                playNotificationSound('reminder');
                window.dispatchEvent(new CustomEvent('smartbox:upcoming_task', { detail: upcomingTasks }));
              }
            } else {
              currentInterval = Math.min(MAX_INTERVAL, currentInterval + 1000);
            }
          }
          known.current = new Set(feed.events.map((e) => e.id));
          const adjustedEvents = feed.events.map(ev => {
            if (profile?.role === 'product_manager' && ev.link === '/orders/approvals') {
              return { ...ev, link: '/po/approvals' };
            }
            return ev;
          });
          setEvents(adjustedEvents);
          setError('');
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        loading = false;
        scheduleNext(currentInterval);
      }
    };

    loadRef.current = () => load(true);
    void load(true);

    const onVisibilityChange = () => {
      if (!document.hidden && active) {
        currentInterval = BASE_INTERVAL;
        void load(true);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [profile?.id, profile?.role]);

  useEffect(() => {
    if (!fresh.length) return;
    const timer = setTimeout(() => setFresh([]), 7000);
    return () => clearTimeout(timer);
  }, [fresh]);

  const markRead = () => {
    const next = Array.from(new Set([...seen, ...events.map(e => e.id)])).slice(-200);
    setSeen(next);
    localStorage.setItem(key, JSON.stringify(next));
  };

  const isPO = profile?.role === 'product_manager';
  const pendingOrdersCount = isPO
    ? events.filter(e => e.type === 'PO' && e.status === 'PENDING').length
    : events.filter(
        e => e.type === 'ORDER' && ['pending', 'awaiting_payment', 'paid'].includes(e.status.toLowerCase())
      ).length;

  return (
    <Context.Provider
      value={{
        events,
        unread: events.filter(e => !seen.includes(e.id)).length,
        pendingOrdersCount,
        error,
        markRead,
        fresh,
        refresh: () => void loadRef.current?.()
      }}
    >
      {children}
    </Context.Provider>
  );
};
export const useAdminNotifications=()=>{const context=useContext(Context);if(!context)throw new Error('Notification provider missing');return context;};

export const noticeStatusLabel=(notice:AdminNotice)=>({ORDER:{pending:'Chờ xử lý',awaiting_payment:'Chờ thanh toán',paid:'Đã thanh toán',confirmed:'Đã duyệt',completed:'Hoàn tất',cancelled:'Đã hủy'},PO:{PENDING:'Chờ duyệt',RETURNED:'Chờ giải trình',APPROVED:'Đã duyệt',REJECTED:'Đã từ chối'},DELIVERY:{ASSIGNED:'Đã phân công',IN_PROGRESS:'Đang thực hiện',DELIVERED:'Đã giao',INSTALLED:'Đã lắp đặt',COMPLETED:'Đã nghiệm thu',FAILED:'Cần xử lý'},WARRANTY:{new:'Yêu cầu mới',assigned:'Đã phân công',in_progress:'Đang xử lý',resolved:'Đã giải quyết',rejected:'Đã từ chối'},EMAIL:{FAILED:'Gửi thất bại'}} as Record<string,Record<string,string>>)[notice.type]?.[notice.status]||notice.status;
