import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bell,
  RefreshCw,
  CheckCheck,
  X,
  Truck,
  ShieldCheck,
  Package,
  ShoppingBag,
  Check,
  ChevronRight,
  BellOff,
} from 'lucide-react';
import { request } from '../api/shop';
import { useResource } from './ShopUi';
import {
  groupActivities,
  formatRelativeTime,
  type ActivityNotification,
} from './notificationPresentation';

const filters = [
  ['all', 'Tất cả'],
  ['unread', 'Chưa đọc'],
  ['orders', 'Đơn hàng'],
  ['delivery', 'Giao lắp'],
  ['warranty', 'Bảo hành'],
] as const;

export function NotificationCenter() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);

  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const locked = useRef(false);

  const resource = useResource(
    async signal => {
      const result: ActivityNotification[] = [];
      for (let page = 0; ; page++) {
        const batch = await request<ActivityNotification[]>(
          `/notifications?page=${page}&size=100`,
          { signal }
        );
        result.push(...batch);
        if (batch.length < 100) return result;
      }
    },
    String(version)
  );

  const groups = groupActivities(resource.data || []);
  const unread = groups.filter(g => g.unreadIds.length).length;
  const visible = groups.filter(g =>
    filter === 'all'
      ? true
      : filter === 'unread'
      ? g.unreadIds.length > 0
      : g.info.category === filter
  );

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  useEffect(() => {
    setOpen(false);
    if (location.search.includes('notifications=open')) setOpen(true);
  }, [location.key]);

  // Periodic polling every 60s & on window focus
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') setVersion(v => v + 1);
    };
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  // Click outside and escape key
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape, true);
    };
  }, [open]);

  async function read(ids: string[]) {
    if (locked.current || !ids.length) return;
    locked.current = true;
    setBusy(true);
    try {
      for (const id of ids) {
        await request(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
      }
    } catch {
      // Ignore network hiccup on read
    } finally {
      locked.current = false;
      setBusy(false);
      resource.retry();
    }
  }

  return (
    <div
      className="commerce-notification-wrapper"
      ref={root}
      onBlur={e => {
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className={`commerce-icon-action commerce-notification-btn ${open ? 'is-active' : ''}`}
        aria-label={`Thông báo hoạt động${unread ? `, ${unread} chưa đọc` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen(v => !v);
          if (!open) resource.retry();
        }}
      >
        <span className="commerce-notification-icon-wrap">
          <Bell size={20} />
          {unread > 0 && (
            <small className="commerce-notification-badge">
              {unread > 99 ? '99+' : unread}
            </small>
          )}
        </span>
        <span>Thông báo</span>
      </button>

      {open && (
        <section
          id="activity-popup"
          role="dialog"
          aria-labelledby="activity-heading"
          className="commerce-notification-dropdown"
        >
          {/* Dropdown Header */}
          <header className="commerce-notif-header">
            <div className="commerce-notif-title-row">
              <div className="commerce-notif-title-group">
                <h2 id="activity-heading" className="commerce-notif-title">
                  Thông báo
                </h2>
                {unread > 0 ? (
                  <span className="commerce-notif-pill unread">{unread} mới</span>
                ) : (
                  <span className="commerce-notif-pill read">Đã đọc tất cả</span>
                )}
              </div>
              <div className="commerce-notif-actions">
                <button
                  type="button"
                  className="commerce-notif-tool-btn"
                  title="Làm mới thông báo"
                  aria-label="Làm mới danh sách"
                  disabled={resource.loading || busy}
                  onClick={resource.retry}
                >
                  <RefreshCw size={14} className={resource.loading ? 'is-spinning' : ''} />
                </button>
                <button
                  type="button"
                  className="commerce-notif-tool-btn"
                  title="Đánh dấu tất cả đã đọc"
                  aria-label="Đánh dấu tất cả đã đọc"
                  disabled={!unread || busy || resource.loading || !!resource.error}
                  onClick={() => void read(groups.flatMap(g => g.unreadIds))}
                >
                  <CheckCheck size={16} />
                </button>
                <button
                  ref={closeButton}
                  type="button"
                  className="commerce-notif-tool-btn close-btn"
                  aria-label="Đóng bảng thông báo"
                  onClick={close}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="commerce-notif-tabs" role="tablist">
              {filters.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={filter === key}
                  className={`commerce-notif-tab ${filter === key ? 'is-active' : ''}`}
                  onClick={() => setFilter(key)}
                >
                  {label}
                  {key === 'unread' && unread > 0 && (
                    <span className="tab-count">{unread}</span>
                  )}
                </button>
              ))}
            </div>
          </header>

          {/* Scrollable List */}
          <div className="commerce-notif-scroll">
            {resource.error && (
              <div className="commerce-notif-error">
                <p>Chưa tải được danh sách thông báo.</p>
                <button type="button" onClick={resource.retry}>
                  Thử lại
                </button>
              </div>
            )}

            {resource.loading && !resource.data?.length && (
              <div className="commerce-notif-loading">
                <RefreshCw size={20} className="is-spinning" />
                <p>Đang kiểm tra thông báo mới…</p>
              </div>
            )}

            {!resource.loading && !resource.error && !visible.length && (
              <div className="commerce-notif-empty">
                <div className="empty-icon-wrap">
                  <BellOff size={26} />
                </div>
                <h4>Không có thông báo {filter === 'unread' ? 'chưa đọc' : 'trong mục này'}</h4>
                <p>Các cập nhật về đơn hàng, giao lắp và bảo hành sẽ hiển thị tại đây.</p>
              </div>
            )}

            {visible.map(group => {
              const { item, info, unreadIds } = group;
              const Icon =
                info.category === 'warranty'
                  ? ShieldCheck
                  : info.category === 'delivery'
                  ? Truck
                  : info.category === 'orders'
                  ? ShoppingBag
                  : Package;
              const isUnread = unreadIds.length > 0;

              return (
                <article
                  key={item.id}
                  className={`commerce-notif-item ${isUnread ? 'is-unread' : ''}`}
                >
                  <span
                    className={`commerce-notif-item-icon cat-${info.category} ${
                      info.urgent ? 'is-urgent' : ''
                    }`}
                  >
                    <Icon size={17} />
                  </span>
                  <div className="commerce-notif-item-content">
                    <div className="commerce-notif-item-head">
                      <Link
                        to={info.href}
                        className="commerce-notif-item-title"
                        onClick={() => {
                          setOpen(false);
                          if (isUnread) void read(unreadIds);
                        }}
                      >
                        {item.title}
                      </Link>
                      {isUnread && (
                        <span className="commerce-notif-unread-dot" title="Chưa đọc" />
                      )}
                    </div>
                    <p className="commerce-notif-item-body">{item.body}</p>
                    <div className="commerce-notif-item-footer">
                      <time dateTime={item.created_at} className="commerce-notif-time">
                        {formatRelativeTime(item.created_at)}
                      </time>
                      {info.reference && (
                        <span className="commerce-notif-ref">
                          #{info.reference.length > 14
                            ? info.reference.slice(0, 10) + '…'
                            : info.reference}
                        </span>
                      )}
                      {info.urgent && (
                        <span className="commerce-notif-tag urgent">Quan trọng</span>
                      )}
                      {!info.urgent && info.action && (
                        <span className="commerce-notif-tag action">Cần chú ý</span>
                      )}
                      {group.ids.length > 1 && (
                        <span className="commerce-notif-tag count">
                          +{group.ids.length} lần
                        </span>
                      )}
                      {isUnread && (
                        <button
                          type="button"
                          className="commerce-notif-mark-single-btn"
                          disabled={busy}
                          onClick={() => void read(unreadIds)}
                          title="Đánh dấu đã đọc"
                        >
                          <Check size={11} /> Đã đọc
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}

          </div>

          {/* Footer */}
          <footer className="commerce-notif-footer">
            <span>Hiển thị {visible.length}/{groups.length} thông báo</span>
            <Link
              to="/account/orders"
              className="commerce-notif-footer-link"
              onClick={() => setOpen(false)}
            >
              Xem đơn hàng <ChevronRight size={13} />
            </Link>
          </footer>
        </section>
      )}
    </div>
  );
}
