import React, { useState } from 'react';
import { FileText, Image, MessageCircle, HelpCircle, Plus, Mail, Sparkles } from 'lucide-react';
import { TemplateManager } from '../components/TemplateManager';

export const ContentPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'content' | 'templates'>('content');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <FileText size={24} color="var(--primary)" />
            Module 7: Quản Lý Nội Dung & Mẫu Truyền Thông
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
            Quản lý bài viết blog, duyệt đánh giá, và trung tâm cấu hình mẫu Email/SMS/Push Templates cho khách hàng.
          </p>
        </div>

        {activeTab === 'content' && (
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} />
            <span>Tạo Bài Viết Mới</span>
          </button>
        )}
      </div>

      {/* Tabs Switcher */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '12px'
        }}
      >
        <button
          type="button"
          className={`btn ${activeTab === 'content' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '9999px', padding: '8px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setActiveTab('content')}
        >
          <FileText size={16} />
          <span>Bài Viết Blog & Đánh Giá</span>
        </button>

        <button
          type="button"
          className={`btn ${activeTab === 'templates' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '9999px', padding: '8px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setActiveTab('templates')}
        >
          <Mail size={16} color={activeTab === 'templates' ? '#ffffff' : 'var(--accent-sky)'} />
          <span>Mẫu Thông Báo (Templates Center)</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'content' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="var(--primary)" />
              Bài viết Blog / Tin tức
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
              <div style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600 }}>Giải pháp hộp nhận hàng thông minh cho thời đại E-Commerce 4.0</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đã xuất bản • 1.2k lượt xem</div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600 }}>Hướng dẫn cài đặt và đồng bộ mã PIN cho Shipper</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đã xuất bản • 850 lượt xem</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageCircle size={18} color="var(--accent-amber)" />
              Duyệt Đánh Giá Khách Hàng (Reviews)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
              <div style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600 }}>⭐⭐⭐⭐⭐ SmartBox Pro</span>
                  <span className="badge badge-success">Đã duyệt</span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  "Hộp cân rất chuẩn, shipper giao hàng lúc tôi đi làm chỉ cần bấm PIN là mở được nắp."
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={18} color="var(--accent-sky)" />
                Quản lý Mẫu Email & Tin Nhắn
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Chỉnh sửa các mẫu thư điện tử tự động gửi cho khách hàng: Mã OTP reset mật khẩu, biên nhận mua hàng, thông báo shipper giao thành công.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={() => setActiveTab('templates')}
            >
              <Sparkles size={15} color="var(--accent-sky)" />
              <span>Chuyển sang Quản lý Mẫu Thông Báo &rarr;</span>
            </button>
          </div>
        </div>
      ) : (
        <TemplateManager embedded={true} />
      )}
    </div>
  );
};
