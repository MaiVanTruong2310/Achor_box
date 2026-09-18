import React from 'react';
import { ShieldCheck, Lock, Zap, Info } from 'lucide-react';
import { PageHeroHeader } from '../components/layout/PageHeroHeader';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  return (
    <>
      <PageHeroHeader
        badge="Thương hiệu Anchor Box"
        badgeIcon={<Info size={13} />}
        title="Về chúng tôi — Anchor Box"
        subtitle="Tiên phong kiến tạo giải pháp Hộp nhận hàng thông minh IoT bảo vệ kiện hàng và nâng cao chất lượng cuộc sống cho hàng triệu gia đình Việt Nam."
        breadcrumbs={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Giới thiệu' }
        ]}
        highlights={[
          'Giải pháp IoT chặng cuối Make-in-Vietnam',
          'Độ bền vật lý tiêu chuẩn IP54 kháng thời tiết',
          'Tích hợp bảo mật đa tầng mã PIN + App + Camera',
          'Hỗ trợ kỹ thuật tận nơi 24/7'
        ]}
      />
      <div className="section" style={{ paddingTop: '32px' }}>
        <div className="container" style={{ maxWidth: '880px' }}>

          {/* Content Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Mission */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '28px'
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '14px' }}>
                Sứ mệnh của Anchor Box
              </h2>
              <p style={{ fontSize: '14.5px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px' }}>
                Anchor Box được phát triển với mục tiêu giúp việc nhận hàng tại nhà trở nên linh hoạt và an toàn hơn khi người nhận không thể trực tiếp có mặt.
              </p>
              <p style={{ fontSize: '14.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Chúng tôi kết hợp hệ thống cảm biến thông minh, cơ cấu khóa điện tử tự động và kết nối không dây để tạo ra một điểm nhận hàng tin cậy ngay trước cửa nhà, giúp bạn không còn phải lo lắng về việc lỡ hẹn với shipper hay nguy cơ thất lạc bưu phẩm.
              </p>
            </div>

            {/* Core Values */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '28px'
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '20px' }}>
                Giá trị cốt lõi mang lại cho khách hàng
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                <div style={{ backgroundColor: 'var(--bg-surface-secondary)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                    <Lock size={18} />
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>An toàn &amp; Bảo mật</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
                    Khóa nắp tự động sau khi nhận hàng và bảo vệ bằng mã PIN tại chỗ.
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-surface-secondary)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                    <Zap size={18} />
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>Chủ động 24/7</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
                    Nhận hàng tự động ngay cả khi bạn đang làm việc hoặc đi công tác xa.
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-surface-secondary)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                    <ShieldCheck size={18} />
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>Bảo hành minh bạch</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
                    Tra cứu bảo hành điện tử chính hãng theo số Serial Number của từng thiết bị.
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Box */}
            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}
            >
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e40af' }}>Bạn cần tư vấn thêm về sản phẩm?</div>
                <div style={{ fontSize: '13.5px', color: '#3b82f6', marginTop: '2px' }}>Khám phá các dòng sản phẩm hoặc xem hướng dẫn cách thức hoạt động.</div>
              </div>
              <Link to="/products" className="btn btn-primary btn-md">
                Xem sản phẩm
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
