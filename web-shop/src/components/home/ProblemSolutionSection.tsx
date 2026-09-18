import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { ScrollReveal } from '../ui/ScrollReveal';

export const ProblemSolutionSection: React.FC = () => {
  return (
    <section className="section section-alt">
      <div className="container">
        <ScrollReveal direction="up">
          <div className="section-header" style={{ textAlign: 'center', margin: '0 auto 40px', maxWidth: '720px' }}>
            <h2 className="section-title">Giải pháp giao nhận tiện lợi cho ngôi nhà của bạn</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>
              Không còn nỗi lo gián đoạn công việc hay lo lắng bưu phẩm bị thất lạc mỗi khi shipper gọi giao hàng.
            </p>
          </div>
        </ScrollReveal>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px'
          }}
          className="problem-solution-grid"
        >
          {/* Left: Customer Problems */}
          <ScrollReveal direction="right" delay={100} style={{ height: '100%' }}>
            <div
              style={{
                backgroundColor: 'var(--bg-body)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '28px',
                height: '100%'
              }}
            >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--danger-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--danger)'
                }}
              >
                <AlertCircle size={18} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>
                Không phải lúc nào bạn cũng có thể ở nhà
              </h3>
            </div>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>&bull;</span>
                <span><strong>Bạn đang bận đi làm hoặc vắng nhà:</strong> Không thể sắp xếp thời gian có mặt kịp lúc để nhận trực tiếp từng đơn hàng.</span>
              </li>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>&bull;</span>
                <span><strong>Shipper giao tới vào giờ hành chính:</strong> Phải hẹn giao lại nhiều lần gây phiền toái cho cả bạn và người giao.</span>
              </li>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>&bull;</span>
                <span><strong>Không có người quen nhận hộ:</strong> Nhờ hàng xóm hoặc bảo vệ nhiều lần gây bất tiện.</span>
              </li>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>&bull;</span>
                <span><strong>Để hàng tạm trước cửa tiềm ẩn rủi ro:</strong> Gói hàng có thể bị lấy nhầm, dính nước mưa hoặc bụi bẩn khi thời tiết xấu.</span>
              </li>
            </ul>
            </div>
          </ScrollReveal>

          {/* Right: Anchor Box Solution */}
          <ScrollReveal direction="left" delay={200} style={{ height: '100%' }}>
            <div
              style={{
                backgroundColor: 'var(--bg-body)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '28px',
                height: '100%'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--success-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--success-text)'
                  }}
                >
                  <CheckCircle2 size={18} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Một nơi nhận hàng riêng ngay trước cửa nhà
                </h3>
              </div>

              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                <li style={{ display: 'flex', gap: '10px' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>&bull;</span>
                  <span><strong>Nhận hàng tự động 24/7:</strong> Shipper chỉ cần mở nắp hộp, đặt bưu phẩm vào và hạ nắp lại.</span>
                </li>
                <li style={{ display: 'flex', gap: '10px' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>&bull;</span>
                  <span><strong>Tự động khóa an toàn:</strong> Cảm biến nhận diện có bưu phẩm bên trong và kích hoạt chốt khóa bảo vệ kiện hàng.</span>
                </li>
                <li style={{ display: 'flex', gap: '10px' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>&bull;</span>
                  <span><strong>Ghi nhận khối lượng bưu phẩm:</strong> Hệ thống cân điện tử đo trọng lượng thực tế của kiện hàng vừa nhận.</span>
                </li>
                <li style={{ display: 'flex', gap: '10px' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>&bull;</span>
                  <span><strong>Mở khóa linh hoạt:</strong> Bạn có thể mở khóa từ xa qua Web/App hoặc bấm trực tiếp mã PIN trên bàn phím của hộp.</span>
                </li>
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .problem-solution-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
};
