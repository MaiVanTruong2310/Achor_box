import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="section" style={{ minHeight: 'calc(100vh - 220px)', display: 'flex', alignItems: 'center' }}>
      <div className="container" style={{ textAlign: 'center', maxWidth: '480px' }}>
        <div style={{ fontSize: '72px', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>404</div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginTop: '16px', marginBottom: '8px' }}>
          Không tìm thấy trang
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Đường dẫn bạn truy cập không tồn tại hoặc đã được thay đổi trong hệ thống Anchor Box.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <Link to="/" className="btn btn-primary btn-md">
            <Home size={15} /> Về trang chủ
          </Link>
          <Link to="/products" className="btn btn-secondary btn-md">
            Xem sản phẩm
          </Link>
        </div>
      </div>
    </div>
  );
};
