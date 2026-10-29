import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import './toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
  exiting?: boolean;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (type: ToastType, message: string, title?: string, duration?: number) => string;
  removeToast: (id: string) => void;
  success: (message: string, title?: string, duration?: number) => string;
  error: (message: string, title?: string, duration?: number) => string;
  warning: (message: string, title?: string, duration?: number) => string;
  info: (message: string, title?: string, duration?: number) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Global handler so `toast.success(...)` can be called from outside React components if needed
let globalAddToast: ((type: ToastType, message: string, title?: string, duration?: number) => string) | null = null;

export const toast = {
  success: (message: string, title = 'Thành công', duration = 3500) => {
    if (globalAddToast) return globalAddToast('success', message, title, duration);
    console.log('[Toast Success]', title, message);
    return '';
  },
  error: (message: string, title = 'Lỗi', duration = 4500) => {
    if (globalAddToast) return globalAddToast('error', message, title, duration);
    console.error('[Toast Error]', title, message);
    return '';
  },
  warning: (message: string, title = 'Cảnh báo', duration = 4000) => {
    if (globalAddToast) return globalAddToast('warning', message, title, duration);
    console.warn('[Toast Warning]', title, message);
    return '';
  },
  info: (message: string, title = 'Thông báo', duration = 3500) => {
    if (globalAddToast) return globalAddToast('info', message, title, duration);
    console.info('[Toast Info]', title, message);
    return '';
  },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Record<string, number>>({});

  const removeToast = useCallback((id: string) => {
    setToasts(prev =>
      prev.map(t => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      if (timeoutsRef.current[id]) {
        clearTimeout(timeoutsRef.current[id]);
        delete timeoutsRef.current[id];
      }
    }, 220);
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string, duration = 3500) => {
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = {
        id,
        type,
        message,
        title: title || (type === 'success' ? 'Thành công' : type === 'error' ? 'Lỗi' : type === 'warning' ? 'Cảnh báo' : 'Thông báo'),
        duration,
      };

      setToasts(prev => [newToast, ...prev].slice(0, 5)); // Keep max 5 visible toasts

      if (duration > 0) {
        timeoutsRef.current[id] = window.setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  // Link global toast runner to context
  globalAddToast = addToast;

  const success = useCallback((message: string, title?: string, duration?: number) => addToast('success', message, title, duration), [addToast]);
  const error = useCallback((message: string, title?: string, duration?: number) => addToast('error', message, title, duration), [addToast]);
  const warning = useCallback((message: string, title?: string, duration?: number) => addToast('warning', message, title, duration), [addToast]);
  const info = useCallback((message: string, title?: string, duration?: number) => addToast('info', message, title, duration), [addToast]);

  const renderIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} />;
      case 'error':
        return <AlertCircle size={18} />;
      case 'warning':
        return <AlertTriangle size={18} />;
      case 'info':
      default:
        return <Info size={18} />;
    }
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <div className="toast-portal-root" aria-live="polite">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast-item ${t.type} ${t.exiting ? 'exiting' : ''}`}
            role="alert"
          >
            <div className="toast-icon-wrap">
              {renderIcon(t.type)}
            </div>
            <div className="toast-content">
              {t.title && <h4 className="toast-title">{t.title}</h4>}
              <p className="toast-message">{t.message}</p>
            </div>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => removeToast(t.id)}
              aria-label="Đóng thông báo"
            >
              <X size={15} />
            </button>
            {t.duration && t.duration > 0 && (
              <div
                className="toast-progress-bar"
                style={{ animationDuration: `${t.duration}ms` }}
              />
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toasts: [],
      addToast: toast.info,
      removeToast: () => {},
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
      info: toast.info,
    };
  }
  return ctx;
};
