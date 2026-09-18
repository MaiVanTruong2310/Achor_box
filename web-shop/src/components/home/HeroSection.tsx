import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lock, ShieldCheck, Clock, Smartphone, Sparkles, CheckCircle2, PlayCircle, Wifi, Scale } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section className="hero-showcase-section">
      {/* Dynamic Ambient Background Glows */}
      <div className="hero-ambient-glow hero-glow-1" />
      <div className="hero-ambient-glow hero-glow-2" />
      <div className="hero-ambient-glow hero-glow-3" />
      <div className="hero-grid-pattern" />

      <div className="container hero-showcase-container">
        <div className="hero-grid">
          {/* Left Column: Commercial Heading & High-Impact Copy */}
          <div className="hero-left-col">
            {/* Tech Badge */}
            <div className="hero-smart-badge">
              <span className="smart-badge-pulse" />
              <Sparkles size={14} className="smart-badge-icon" />
              <span>GIẢI PHÁP GIAO NHẬN BƯU PHẨM THÔNG MINH THẾ HỆ MỚI</span>
            </div>

            {/* Main Single-Line Title with Vibrant Multi-Color Gradient Highlight */}
            <h1 className="hero-showcase-title">
              Hộp Nhận Hàng Thông Minh{' '}
              <span className="hero-gradient-brand">Anchor Box</span>
            </h1>

            {/* Description */}
            <p className="hero-showcase-desc">
              Nhận hàng an toàn tuyệt đối ngay cả khi bạn <strong>không có nhà</strong>. Shipper chỉ cần đặt bưu phẩm vào buồng chứa, hệ thống tự động nhận diện gói hàng, ghi nhận <strong>khối lượng thực tế</strong> và kích hoạt <strong>khóa chốt an toàn</strong> tức thì.
            </p>

            {/* Actions Buttons */}
            <div className="hero-actions-row">
              <Link to="/products" className="hero-btn-primary">
                <span>Khám phá các dòng sản phẩm</span>
                <ArrowRight size={18} className="btn-icon-arrow" />
                <div className="btn-shine-effect" />
              </Link>
              <Link to="/how-it-works" className="hero-btn-secondary">
                <PlayCircle size={18} />
                <span>Xem cách hoạt động</span>
              </Link>
            </div>

            {/* Micro Highlights Badges */}
            <div className="hero-micro-tags">
              <span className="micro-tag-item">
                <CheckCircle2 size={15} className="tag-check-icon" />
                <span>Không cần trực tiếp nhận hàng</span>
              </span>
              <span className="micro-tag-item">
                <CheckCircle2 size={15} className="tag-check-icon" />
                <span>Tự động khóa sau 2s</span>
              </span>
              <span className="micro-tag-item">
                <CheckCircle2 size={15} className="tag-check-icon" />
                <span>Mở khóa App &amp; Mã PIN</span>
              </span>
            </div>
          </div>

          {/* Right Column: Hardware Showcase with Interactive Floating Hotspots */}
          <div className="hero-right-col">
            <div className="hero-visual-wrapper">
              {/* Radial Aura behind box */}
              <div className="hero-box-aura" />

              {/* Main Card with Glass Border */}
              <div className="hero-image-card">
                <img
                  src="/products/hero-smartbox-delivery.svg"
                  alt="Hộp nhận hàng thông minh Anchor Box"
                  className="hero-main-illustration"
                />

                {/* Floating Tech Hotspots */}
                <div className="hero-float-pill pill-top-left">
                  <div className="pill-dot pill-dot-green" />
                  <Lock size={13} className="pill-icon" />
                  <span><strong>Tự động khóa:</strong> Khi đóng nắp</span>
                </div>

                <div className="hero-float-pill pill-top-right">
                  <div className="pill-dot pill-dot-blue" />
                  <Scale size={13} className="pill-icon" />
                  <span><strong>Đo khối lượng:</strong> Cảm biến Loadcell</span>
                </div>

                <div className="hero-float-pill pill-bottom-left">
                  <div className="pill-dot pill-dot-purple" />
                  <Wifi size={13} className="pill-icon" />
                  <span><strong>Mở từ xa:</strong> WiFi &amp; MQTT Cloud</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Practical Key Benefits Bar directly below Hero */}
        <div className="hero-benefits-grid">
          <div className="benefit-card benefit-card-blue">
            <div className="benefit-icon-box icon-box-blue">
              <Clock size={22} />
            </div>
            <div className="benefit-content">
              <div className="benefit-card-title">Không cần chờ shipper</div>
              <div className="benefit-card-desc">Chủ động nhận kiện hàng bất cứ thời điểm nào trong ngày</div>
            </div>
          </div>

          <div className="benefit-card benefit-card-emerald">
            <div className="benefit-icon-box icon-box-emerald">
              <ShieldCheck size={22} />
            </div>
            <div className="benefit-content">
              <div className="benefit-card-title">Hạn chế để hàng ngoài cửa</div>
              <div className="benefit-card-desc">Chống thất lạc, ướt mưa gió và bảo mật 100% bưu phẩm</div>
            </div>
          </div>

          <div className="benefit-card benefit-card-indigo">
            <div className="benefit-icon-box icon-box-indigo">
              <Lock size={22} />
            </div>
            <div className="benefit-content">
              <div className="benefit-card-title">Tự động khóa thông minh</div>
              <div className="benefit-card-desc">Khóa chốt điện từ Solenoid ngay khi shipper đóng nắp hộp</div>
            </div>
          </div>

          <div className="benefit-card benefit-card-purple">
            <div className="benefit-icon-box icon-box-purple">
              <Smartphone size={22} />
            </div>
            <div className="benefit-content">
              <div className="benefit-card-title">Theo dõi &amp; Quản lý từ xa</div>
              <div className="benefit-card-desc">Xem khối lượng bưu phẩm, chụp ảnh &amp; mở khóa qua App</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .hero-showcase-section {
          position: relative;
          background: linear-gradient(180deg, #f0f6ff 0%, #f8fafc 50%, #ffffff 100%);
          border-bottom: 1px solid rgba(226, 232, 240, 0.8);
          padding: 56px 0 44px;
          overflow: hidden;
        }

        /* Ambient Lighting */
        .hero-ambient-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 1;
        }
        .hero-glow-1 {
          top: -100px;
          left: 15%;
          width: 500px;
          height: 350px;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, rgba(56, 189, 248, 0.05) 70%, transparent 100%);
        }
        .hero-glow-2 {
          top: 40px;
          right: 5%;
          width: 550px;
          height: 400px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.05) 70%, transparent 100%);
        }
        .hero-glow-3 {
          bottom: -50px;
          left: 45%;
          width: 400px;
          height: 250px;
          background: radial-gradient(circle, rgba(14, 165, 233, 0.1) 0%, transparent 70%);
        }

        /* Subtle Modern Dot Grid */
        .hero-grid-pattern {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(37, 99, 235, 0.08) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
          z-index: 1;
          mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 40%, transparent 100%);
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 40%, transparent 100%);
        }

        .hero-showcase-container {
          position: relative;
          z-index: 2;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1.22fr 0.78fr;
          gap: 48px;
          align-items: center;
          margin-bottom: 48px;
        }

        /* Smart Badge */
        .hero-smart-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 16px;
          background: linear-gradient(135deg, rgba(239, 246, 255, 0.9) 0%, rgba(219, 234, 254, 0.7) 100%);
          border: 1px solid #93c5fd;
          color: #1d4ed8;
          border-radius: 999px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.05em;
          margin-bottom: 20px;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
        }

        .smart-badge-pulse {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #2563eb;
          box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7);
          animation: pulseBadge 2s infinite;
        }

        .smart-badge-icon {
          color: #2563eb;
        }

        @keyframes pulseBadge {
          0% {
            box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7);
          }
          70% {
            box-shadow: 0 0 0 7px rgba(37, 99, 235, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
          }
        }

        /* Single-Line High-Impact Title */
        .hero-showcase-title {
          font-size: clamp(24px, 2.5vw, 34px);
          font-weight: 850;
          color: #0f172a;
          line-height: 1.25;
          letter-spacing: -0.03em;
          margin: 0 0 18px;
          white-space: nowrap;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
        }

        .hero-gradient-brand {
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 40%, #0284c7 80%, #06b6d4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 900;
          position: relative;
          display: inline-block;
          filter: drop-shadow(0 2px 8px rgba(37, 99, 235, 0.2));
        }

        .hero-showcase-desc {
          font-size: 16px;
          color: #334155;
          line-height: 1.7;
          margin: 0 0 28px;
          max-width: 630px;
        }

        .hero-showcase-desc strong {
          color: #0f172a;
          font-weight: 600;
        }

        /* Action Buttons */
        .hero-actions-row {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 26px;
        }

        .hero-btn-primary {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 13px 26px;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 60%, #1e40af 100%);
          color: #ffffff;
          font-weight: 700;
          font-size: 15px;
          border-radius: 12px;
          text-decoration: none;
          box-shadow: 0 8px 24px -4px rgba(37, 99, 235, 0.45), 0 2px 6px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .hero-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px -4px rgba(37, 99, 235, 0.6), 0 4px 10px rgba(0, 0, 0, 0.1);
        }

        .hero-btn-primary .btn-icon-arrow {
          transition: transform 0.25s ease;
        }

        .hero-btn-primary:hover .btn-icon-arrow {
          transform: translateX(4px);
        }

        .btn-shine-effect {
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transform: skewX(-25deg);
          animation: btnShine 4.5s infinite;
        }

        @keyframes btnShine {
          0%, 65% {
            left: -100%;
          }
          100% {
            left: 200%;
          }
        }

        .hero-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 24px;
          background: #ffffff;
          color: #0f172a;
          font-weight: 600;
          font-size: 15px;
          border-radius: 12px;
          text-decoration: none;
          border: 1.5px solid #cbd5e1;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.04);
          transition: all 0.2s ease;
        }

        .hero-btn-secondary:hover {
          background-color: #f8fafc;
          border-color: #94a3b8;
          color: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.07);
        }

        /* Micro Tags */
        .hero-micro-tags {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          font-size: 13.5px;
          color: #475569;
          font-weight: 500;
        }

        .micro-tag-item {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .tag-check-icon {
          color: #10b981;
          flex-shrink: 0;
        }

        /* Right Visual Wrapper */
        .hero-visual-wrapper {
          position: relative;
        }

        .hero-box-aura {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 85%;
          height: 85%;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.18) 0%, rgba(56, 189, 248, 0.08) 60%, transparent 80%);
          filter: blur(40px);
          z-index: 0;
        }

        .hero-image-card {
          position: relative;
          z-index: 2;
          background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 24px;
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 
            0 24px 48px -12px rgba(15, 23, 42, 0.1),
            0 0 0 1px rgba(255, 255, 255, 0.8) inset,
            0 8px 16px -4px rgba(37, 99, 235, 0.06);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
        }

        .hero-image-card:hover {
          transform: translateY(-4px);
          box-shadow: 
            0 32px 64px -16px rgba(15, 23, 42, 0.14),
            0 0 0 1px rgba(255, 255, 255, 0.9) inset,
            0 12px 24px -6px rgba(37, 99, 235, 0.1);
        }

        .hero-main-illustration {
          width: 100%;
          height: auto;
          max-height: 380px;
          object-fit: contain;
          filter: drop-shadow(0 14px 24px rgba(15, 23, 42, 0.08));
          animation: floatBox 6s ease-in-out infinite;
        }

        @keyframes floatBox {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-6px);
          }
        }

        /* Floating Pill Badges on Card */
        .hero-float-pill {
          position: absolute;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(203, 213, 225, 0.8);
          border-radius: 999px;
          font-size: 11.5px;
          color: #1e293b;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(8px);
          z-index: 3;
          pointer-events: none;
        }

        .pill-icon {
          color: #2563eb;
        }

        .pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .pill-dot-green {
          background-color: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
        }
        .pill-dot-blue {
          background-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25);
        }
        .pill-dot-purple {
          background-color: #8b5cf6;
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.25);
        }

        .pill-top-left {
          top: 24px;
          left: 20px;
        }
        .pill-top-right {
          top: 36px;
          right: 20px;
        }
        .pill-bottom-left {
          bottom: 24px;
          left: 20px;
        }

        /* 4 Key Benefits Section */
        .hero-benefits-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }

        .benefit-card {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 18px 18px;
          box-shadow: 0 6px 18px -3px rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(255, 255, 255, 0.8) inset;
          backdrop-filter: blur(10px);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .benefit-card:hover {
          transform: translateY(-3px);
          background: #ffffff;
          border-color: #93c5fd;
          box-shadow: 0 14px 28px -6px rgba(37, 99, 235, 0.12), 0 0 0 1px #bfdbfe;
        }

        .benefit-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.25s ease;
        }

        .benefit-card:hover .benefit-icon-box {
          transform: scale(1.08) rotate(3deg);
        }

        .icon-box-blue {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          color: #2563eb;
          border: 1px solid #bfdbfe;
        }

        .icon-box-emerald {
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
          color: #059669;
          border: 1px solid #a7f3d0;
        }

        .icon-box-indigo {
          background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
          color: #4f46e5;
          border: 1px solid #c7d2fe;
        }

        .icon-box-purple {
          background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
          color: #9333ea;
          border: 1px solid #e9d5ff;
        }

        .benefit-card-title {
          font-weight: 750;
          font-size: 14.5px;
          color: #0f172a;
          line-height: 1.35;
        }

        .benefit-card-desc {
          font-size: 12.5px;
          color: #64748b;
          margin-top: 4px;
          line-height: 1.5;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1080px) {
          .hero-benefits-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 960px) {
          .hero-showcase-section {
            padding: 40px 0 32px;
          }
          .hero-grid {
            grid-template-columns: 1fr;
            gap: 36px;
          }
          .hero-showcase-title {
            white-space: normal;
            font-size: 28px;
          }
          .hero-float-pill {
            font-size: 10.5px;
            padding: 4px 9px;
          }
        }

        @media (max-width: 600px) {
          .hero-benefits-grid {
            grid-template-columns: 1fr;
          }
          .hero-actions-row {
            flex-direction: column;
            align-items: stretch;
          }
          .hero-btn-primary, .hero-btn-secondary {
            justify-content: center;
          }
        }
      `}</style>
    </section>
  );
};

