import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  X,
  CheckCheck,
  RotateCw,
  ShoppingBag,
  Ticket,
  Truck,
  ShieldCheck,
  Mail,
  ChevronDown,
  Inbox,
  Check,
  Trash2,
  ExternalLink
} from 'lucide-react';
import {
  useAdminNotifications,
  noticeStatusLabel,
  AdminNotice
} from '../contexts/AdminNotificationsContext';
import { useAuth } from '../contexts/AuthContext';
import './notification-popover.css';

type FilterTab = 'ALL' | 'UNREAD' | 'ORDER' | 'DELIVERY' | 'WARRANTY';

interface NotificationPopoverProps {
  onClose: () => void;
}

const PAGE_SIZE = 6;

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHour < 24) return `${diffHour} giờ trước`;
    if (diffDay === 1) {
      return `Hôm qua lúc ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

function getStatusBadgeClass(status: string): 'success' | 'warning' | 'info' | 'danger' | 'neutral' {
  const s = (status || '').toUpperCase();
  if (
    ['APPROVED', 'COMPLETED', 'DELIVERED', 'RESOLVED', 'SENT', 'PAID', 'CONFIRMED'].includes(s) ||
    status === 'Đã duyệt' ||
    status === 'Hoàn tất' ||
    status === 'Đã nghiệm thu' ||
    status === 'Đã giải quyết' ||
    status === 'Đã thanh toán'
  ) {
    return 'success';
  }
  if (
    [
      'PENDING',
      'WAITING_PO_CONFIRMATION',
      'SUBMITTED',
      'RETURNED',
      'AWAITING_PAYMENT',
      'NEW',
      'TASK_UPCOMING'
    ].includes(s) ||
    status === 'Chờ duyệt' ||
    status === 'Chờ xử lý' ||
    status === 'Chờ thanh toán' ||
    status === 'Chờ giải trình' ||
    status === 'Chờ PO xác nhận' ||
    status === 'Sắp tới giờ hẹn'
  ) {
    return 'warning';
  }
  if (
    ['ASSIGNED', 'IN_PROGRESS', 'DELIVERING', 'TASK_ASSIGNED'].includes(s) ||
    status === 'Đã phân công' ||
    status === 'Đang thực hiện' ||
    status === 'Đang xử lý' ||
    status === 'Đang giao hàng'
  ) {
    return 'info';
  }
  if (
    ['REJECTED', 'CANCELLED', 'FAILED'].includes(s) ||
    status === 'Đã hủy' ||
    status === 'Từ chối' ||
    status === 'Cần xử lý' ||
    status === 'Gửi thất bại'
  ) {
    return 'danger';
  }
  return 'neutral';
}

function renderTypeIcon(type: string) {
  switch (type) {
    case 'ORDER':
      return (
        <div className="notification-icon-wrapper order" title="Đơn hàng">
          <ShoppingBag size={17} />
        </div>
      );
    case 'PO':
      return (
        <div className="notification-icon-wrapper po" title="PO Ticket">
          <Ticket size={17} />
        </div>
      );
    case 'DELIVERY':
    case 'TASK_ASSIGNED':
    case 'TASK_UPCOMING':
      return (
        <div className="notification-icon-wrapper delivery" title="Giao hàng & Lắp đặt">
          <Truck size={17} />
        </div>
      );
    case 'WARRANTY':
      return (
        <div className="notification-icon-wrapper warranty" title="Bảo hành">
          <ShieldCheck size={17} />
        </div>
      );
    case 'EMAIL':
      return (
        <div className="notification-icon-wrapper email" title="Email Outbox">
          <Mail size={17} />
        </div>
      );
    default:
      return (
        <div className="notification-icon-wrapper default" title="Thông báo hệ thống">
          <Bell size={17} />
        </div>
      );
  }
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const popoverRef = useRef<HTMLDivElement>(null);

  const {
    events,
    unread,
    loading,
    error,
    markRead,
    markOneRead,
    markOneUnread,
    clearReadHistory,
    isRead,
    refresh
  } = useAdminNotifications();

  const { profile } = useAuth();
  const isPO = profile?.role === 'product_manager';

  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  // Đóng khi click outside hoặc ấn Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Reset phân trang khi đổi tab
  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    setVisibleCount(PAGE_SIZE);
  };

  // Thống kê đếm số lượng cho từng tab
  const counts = useMemo(() => {
    return {
      all: events.length,
      unread: events.filter((e) => !isRead(e.id)).length,
      order: events.filter((e) => e.type === 'ORDER' || e.type === 'PO').length,
      delivery: events.filter(
        (e) => e.type === 'DELIVERY' || e.type === 'TASK_ASSIGNED' || e.type === 'TASK_UPCOMING'
      ).length,
      warranty: events.filter((e) => e.type === 'WARRANTY').length
    };
  }, [events, isRead]);

  // Danh sách đã lọc theo tab
  const filteredEvents = useMemo(() => {
    switch (activeTab) {
      case 'UNREAD':
        return events.filter((e) => !isRead(e.id));
      case 'ORDER':
        return events.filter((e) => e.type === 'ORDER' || e.type === 'PO');
      case 'DELIVERY':
        return events.filter(
          (e) => e.type === 'DELIVERY' || e.type === 'TASK_ASSIGNED' || e.type === 'TASK_UPCOMING'
        );
      case 'WARRANTY':
        return events.filter((e) => e.type === 'WARRANTY');
      case 'ALL':
      default:
        return events;
    }
  }, [events, activeTab, isRead]);

  // Tải từng phần (Lazy chunking) - không render hết 1 lần để tránh lag
  const displayedEvents = useMemo(() => {
    return filteredEvents.slice(0, visibleCount);
  }, [filteredEvents, visibleCount]);

  const hasMore = visibleCount < filteredEvents.length;

  const handleItemClick = (e: React.MouseEvent, event: AdminNotice) => {
    e.preventDefault();
    markOneRead(event.id);
    onClose();
    if (event.link) {
      navigate(event.link);
    }
  };

  const handleToggleRead = (e: React.MouseEvent, id: string, read: boolean) => {
    e.stopPropagation();
    e.preventDefault();
    if (read) {
      markOneUnread(id);
    } else {
      markOneRead(id);
    }
  };

  return (
    <section className="notification-popover" ref={popoverRef} role="region" aria-label="Trung tâm thông báo">
      {/* Header Bar */}
      <div className="notification-popover-header">
        <div className="notification-header-title">
          <h4>Thông báo hoạt động</h4>
          {unread > 0 && (
            <span className="notification-unread-pill">{unread} chưa đọc</span>
          )}
        </div>

        <div className="notification-header-actions">
          <button
            type="button"
            className={`notification-tool-btn ${loading ? 'spinning' : ''}`}
            onClick={refresh}
            title="Làm mới danh sách ngay"
            aria-label="Làm mới"
            disabled={loading}
          >
            <RotateCw size={15} />
          </button>

          {unread > 0 && (
            <button
              type="button"
              className="notification-tool-btn primary"
              onClick={markRead}
              title="Đánh dấu tất cả thông báo là đã đọc"
            >
              <CheckCheck size={15} />
              <span>Đã đọc</span>
            </button>
          )}

          <button
            type="button"
            className="notification-tool-btn"
            onClick={onClose}
            aria-label="Đóng bảng thông báo"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="notification-tabs">
        <button
          type="button"
          className={`notification-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
          onClick={() => handleTabChange('ALL')}
        >
          <span>Tất cả</span>
          <span className="tab-badge">{counts.all}</span>
        </button>

        <button
          type="button"
          className={`notification-tab-btn ${activeTab === 'UNREAD' ? 'active' : ''}`}
          onClick={() => handleTabChange('UNREAD')}
        >
          <span>Chưa đọc</span>
          {counts.unread > 0 ? (
            <span className="tab-badge unread-dot">{counts.unread}</span>
          ) : (
            <span className="tab-badge">0</span>
          )}
        </button>

        <button
          type="button"
          className={`notification-tab-btn ${activeTab === 'ORDER' ? 'active' : ''}`}
          onClick={() => handleTabChange('ORDER')}
        >
          <span>Đơn & PO</span>
          <span className="tab-badge">{counts.order}</span>
        </button>

        {!isPO && (
          <button
            type="button"
            className={`notification-tab-btn ${activeTab === 'DELIVERY' ? 'active' : ''}`}
            onClick={() => handleTabChange('DELIVERY')}
          >
            <span>Giao lắp</span>
            <span className="tab-badge">{counts.delivery}</span>
          </button>
        )}

        <button
          type="button"
          className={`notification-tab-btn ${activeTab === 'WARRANTY' ? 'active' : ''}`}
          onClick={() => handleTabChange('WARRANTY')}
        >
          <span>Bảo hành</span>
          <span className="tab-badge">{counts.warranty}</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div role="alert" style={{ padding: '8px 14px', fontSize: 12, color: 'var(--fpt-rose)', background: 'rgba(244,63,94,0.08)' }}>
          {error}
        </div>
      )}

      {/* List Body */}
      <div className="notification-list-body">
        {filteredEvents.length === 0 ? (
          <div className="notification-empty-state">
            <Inbox size={38} />
            <p>
              {activeTab === 'UNREAD'
                ? 'Tuyệt vời! Bạn không còn thông báo chưa đọc nào.'
                : 'Không có thông báo nào trong mục này.'}
            </p>
            <small>Các cập nhật mới của hệ thống sẽ tự động xuất hiện tại đây.</small>
          </div>
        ) : (
          displayedEvents.map((event) => {
            const read = isRead(event.id);
            const statusText = noticeStatusLabel(event);
            const badgeClass = getStatusBadgeClass(statusText);
            const formattedTime = formatRelativeTime(event.occurredAt);

            return (
              <div
                key={event.id}
                className={`notification-item-card ${read ? 'is-read' : 'is-unread'}`}
                onClick={(e) => handleItemClick(e, event)}
              >
                {/* Loại icon */}
                {renderTypeIcon(event.type)}

                {/* Nội dung chi tiết */}
                <div className="notification-item-content">
                  <div className="notification-item-top">
                    <h5 className="notification-item-title">{event.title}</h5>
                    <span className={`notice-status-tag ${badgeClass}`}>
                      {statusText}
                    </span>
                  </div>

                  <div className="notification-item-meta">
                    <span className="notification-ref-pill">
                      #{event.referenceId.slice(0, 8)}
                    </span>
                    <span>·</span>
                    <span className="notification-item-time" title={new Date(event.occurredAt).toLocaleString('vi-VN')}>
                      {formattedTime}
                    </span>
                  </div>
                </div>

                {/* Nút thao tác trên từng item */}
                <div className="notification-item-actions">
                  <button
                    type="button"
                    className="notice-toggle-read-btn"
                    onClick={(e) => handleToggleRead(e, event.id, read)}
                    title={read ? 'Đánh dấu là chưa đọc' : 'Đánh dấu là đã đọc'}
                    aria-label={read ? 'Chưa đọc' : 'Đã đọc'}
                  >
                    {read ? (
                      <Check size={14} style={{ opacity: 0.6 }} />
                    ) : (
                      <span className="notice-unread-dot" />
                    )}
                  </button>
                  <ExternalLink size={13} style={{ opacity: 0.35, marginLeft: 2 }} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Controls & Incremental Load More */}
      {filteredEvents.length > 0 && (
        <div className="notification-popover-footer">
          <span>
            Hiển thị <strong>{displayedEvents.length}</strong> / <strong>{filteredEvents.length}</strong>
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {hasMore && (
              <button
                type="button"
                className="notification-load-more-btn"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              >
                <span>Xem thêm (+{Math.min(PAGE_SIZE, filteredEvents.length - displayedEvents.length)})</span>
                <ChevronDown size={14} />
              </button>
            )}

            <button
              type="button"
              className="notification-clear-history-btn"
              onClick={clearReadHistory}
              title="Đặt lại trạng thái đã đọc trên thiết bị này"
            >
              <Trash2 size={12} style={{ marginRight: 3, verticalAlign: -1 }} />
              <span>Dọn lịch sử</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
