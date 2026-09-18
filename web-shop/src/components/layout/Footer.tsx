import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="footer-wrapper">
      <div className="container">
        <div className="footer-grid">
          {/* Brand & Mission */}
          <div>
            <div className="footer-brand-title">Anchor Box</div>
            <p className="footer-desc">
              Hệ thống Hộp nhận hàng thông minh dành cho gia đình. Tự động phát hiện bưu phẩm, ghi nhận khối lượng và khóa nắp an toàn 24/7 khi bạn vắng nhà.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <div className="footer-heading">Sản phẩm</div>
            <ul className="footer-links">
              <li><Link to="/products">Tất cả sản phẩm</Link></li>
              <li><Link to="/products/smart-box-std">Anchor Box Standard (Không Cam)</Link></li>
              <li><Link to="/products/smart-box-compact">Anchor Box Compact (Gắn Tường)</Link></li>
              <li><Link to="/products/smart-box-plus">Anchor Box Plus (Camera AI 1080p)</Link></li>
              <li><Link to="/products/smart-box-promax">Anchor Box Pro Max (Dual-Cam 2 Tầng)</Link></li>
            </ul>
          </div>

          {/* Support & Guides */}
          <div>
            <div className="footer-heading">Hỗ trợ khách hàng</div>
            <ul className="footer-links">
              <li><Link to="/how-it-works">Cách thức hoạt động</Link></li>
              <li><Link to="/warranty">Tra cứu bảo hành điện tử</Link></li>
              <li><Link to="/#faq">Câu hỏi thường gặp (FAQ)</Link></li>
              <li><a href="tel:0367744634" style={{ color: '#38bdf8', fontWeight: 600 }}>Hotline: 0367 744 634</a></li>
              <li><a href="https://zalo.me/0367744634" target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8' }}>Zalo: 0367 744 634</a></li>
            </ul>
          </div>

          {/* Hardware & Specifications overview */}
          <div>
            <div className="footer-heading">Cam kết chất lượng</div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#cbd5e1' }}>
              Thiết bị được trang bị cảm biến nhận diện vật thể, mâm cân tải trọng điện tử, chốt khóa an toàn và kết nối Wi-Fi hỗ trợ mở khóa từ xa.
            </p>
            <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
              Bảo hành chính hãng 12 – 18 tháng
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div>
            &copy; 2026 Anchor Box. Tất cả quyền được bảo lưu.
          </div>
          <div style={{ fontSize: 12.5, color: '#94a3b8' }}>
            Anchor Box — Hộp nhận hàng thông minh bảo vệ bưu phẩm cho mọi nhà
          </div>
        </div>
      </div>
    </footer>
  );
};
