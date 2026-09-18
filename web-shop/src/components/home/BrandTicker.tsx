import React from 'react';
import {
  Package,
  Cpu,
  Clock,
  Lock,
  Camera,
  Scale,
  BatteryCharging,
  Smartphone,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface TickerItem {
  icon: React.ReactNode;
  text: string;
}

const ALL_TICKER_ITEMS: TickerItem[] = [
  {
    icon: <Package size={16} className="ticker-icon" />,
    text: 'An tâm hơn khi giao/nhận hàng'
  },
  {
    icon: <Cpu size={16} className="ticker-icon" />,
    text: 'Công nghệ IoT hiện đại'
  },
  {
    icon: <Clock size={16} className="ticker-icon" />,
    text: 'Hoạt động 24/7, sử dụng linh hoạt'
  },
  {
    icon: <Lock size={16} className="ticker-icon" />,
    text: 'Tự động khóa an toàn khi đóng nắp'
  },
  {
    icon: <Camera size={16} className="ticker-icon" />,
    text: 'Tích hợp Camera AI giám sát bưu phẩm'
  },
  {
    icon: <Scale size={16} className="ticker-icon" />,
    text: 'Đo lường trọng lượng kiện hàng chính xác'
  },
  {
    icon: <BatteryCharging size={16} className="ticker-icon" />,
    text: 'Pin dự phòng duy trì liên tục khi mất điện'
  },
  {
    icon: <Smartphone size={16} className="ticker-icon" />,
    text: 'Mở khóa từ xa & thông báo tức thì'
  },
  {
    icon: <ShieldCheck size={16} className="ticker-icon" />,
    text: 'Bảo hành điện tử chính hãng lên tới 24 tháng'
  },
  {
    icon: <Zap size={16} className="ticker-icon" />,
    text: 'Không lo lỡ hẹn shipper hay thất lạc hàng'
  }
];

export const BrandTicker: React.FC = () => {
  return (
    <section className="brand-ticker-section" aria-label="Tính năng nổi bật Anchor Box">
      <div className="ticker-gradient-overlay left" />
      <div className="ticker-gradient-overlay right" />

      {/* Single Continuous Running Row */}
      <div className="ticker-track-wrapper">
        <div className="ticker-track scroll-left">
          {/* Duplicate 3 times for completely seamless infinite loop */}
          {[...ALL_TICKER_ITEMS, ...ALL_TICKER_ITEMS, ...ALL_TICKER_ITEMS].map((item, idx) => (
            <div key={`ticker-${idx}`} className="ticker-pill">
              <span className="ticker-pill-icon">{item.icon}</span>
              <span className="ticker-pill-text">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .brand-ticker-section {
          position: relative;
          overflow: hidden;
          padding: 16px 0;
          background-color: var(--bg-surface);
          border-top: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);
          user-select: none;
        }

        .ticker-gradient-overlay {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 80px;
          z-index: 2;
          pointer-events: none;
        }

        .ticker-gradient-overlay.left {
          left: 0;
          background: linear-gradient(to right, var(--bg-surface), transparent);
        }

        .ticker-gradient-overlay.right {
          right: 0;
          background: linear-gradient(to left, var(--bg-surface), transparent);
        }

        .ticker-track-wrapper {
          display: flex;
          overflow: hidden;
          width: 100%;
        }

        .ticker-track {
          display: flex;
          gap: 12px;
          width: max-content;
          will-change: transform;
        }

        .ticker-track:hover {
          animation-play-state: paused;
        }

        .scroll-left {
          animation: marquee-left 38s linear infinite;
        }

        @keyframes marquee-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-100% / 3));
          }
        }

        .ticker-pill {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 8px 18px;
          background-color: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 9999px;
          white-space: nowrap;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
        }

        .ticker-pill:hover {
          background-color: #e2e8f0;
          border-color: #cbd5e1;
          transform: translateY(-1px);
        }

        .ticker-pill-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563eb;
          flex-shrink: 0;
        }

        .ticker-pill-text {
          font-size: 13.5px;
          font-weight: 600;
          color: #334155;
          letter-spacing: -0.01em;
        }

        @media (max-width: 640px) {
          .brand-ticker-section {
            padding: 12px 0;
          }
          .ticker-pill {
            padding: 6px 14px;
            gap: 7px;
          }
          .ticker-pill-text {
            font-size: 12.5px;
          }
          .ticker-gradient-overlay {
            width: 40px;
          }
        }
      `}</style>
    </section>
  );
};
