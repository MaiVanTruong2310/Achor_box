import React from 'react';
import { HowItWorksStepper } from '../components/home/HowItWorksStepper';
import { HardwareSpecsTable } from '../components/home/HardwareSpecsTable';
import { PageHeroHeader } from '../components/layout/PageHeroHeader';
import { Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';

export const HowItWorksPage: React.FC = () => {
  return (
    <div>
      {/* Page Hero */}
      <PageHeroHeader
        badge="Quy trình giao nhận 4.0"
        badgeIcon={<Cpu size={13} />}
        title="Cách thức vận hành Anchor Box"
        subtitle="Khám phá cơ chế tự động phát hiện kiện hàng, đo lường khối lượng và chốt khóa an toàn 24/7 giúp bảo vệ bưu phẩm toàn diện ngay trước cửa nhà."
        breadcrumbs={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Cách thức hoạt động' }
        ]}
        highlights={[
          'Quy trình 6 bước tự động hoàn toàn',
          'Khóa điện tử Servo phản hồi 2s',
          'Cảm biến tải trọng Load Cell HX711',
          'Điều khiển từ xa qua Web & App'
        ]}
      />

      {/* 6-Step Delivery Process */}
      <HowItWorksStepper />

      {/* In-depth Hardware Diagram Section */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center', margin: '0 auto 36px', maxWidth: '680px' }}>
            <h2 className="section-title">Sơ đồ bố trí cảm biến &amp; Chốt khóa</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>
              Minh họa vị trí các cụm cảm biến và cơ cấu khóa bảo vệ bên trong hộp nhận hàng.
            </p>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              maxWidth: '880px',
              margin: '0 auto',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <img
              src="/products/smartbox-std-diagram.svg"
              alt="Sơ đồ bố trí cảm biến Anchor Box"
              style={{ width: '100%', height: 'auto', borderRadius: 'var(--radius-md)' }}
            />
          </div>
        </div>
      </section>

      {/* Hardware Specs Table */}
      <HardwareSpecsTable />

      {/* CTA Box */}
      <section className="section">
        <div className="container" style={{ textAlign: 'center', maxWidth: '640px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '12px' }}>
            Sở hữu Anchor Box ngay hôm nay
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14.5px' }}>
            Lắp đặt nhanh chóng, sử dụng dễ dàng và bảo vệ bưu phẩm an toàn cho gia đình bạn.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
            <Link to="/products" className="btn btn-primary btn-lg">
              Xem sản phẩm &amp; Đặt hàng
            </Link>
            <Link to="/warranty" className="btn btn-secondary btn-lg">
              Tra cứu bảo hành
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
