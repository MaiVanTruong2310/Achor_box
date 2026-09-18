import React from 'react';
import { ScrollReveal } from '../ui/ScrollReveal';

export const STEPS = [
  {
    step: 1,
    title: 'Shipper mở nắp hộp',
    desc: 'Hộp nhận hàng đang ở chế độ chờ sẵn sàng hoặc shipper nhập mã PIN tạm thời nếu hộp đang khóa.'
  },
  {
    step: 2,
    title: 'Đặt bưu phẩm vào trong',
    desc: 'Kiện hàng được đặt an toàn vào buồng chứa bên trong hộp.'
  },
  {
    step: 3,
    title: 'Hộp phát hiện và ghi nhận khối lượng',
    desc: 'Hệ thống cảm biến tự động nhận diện gói hàng và xác định chính xác trọng lượng của kiện hàng.'
  },
  {
    step: 4,
    title: 'Shipper đóng nắp',
    desc: 'Người giao hàng chỉ cần hạ nắp hộp xuống sau khi đã đặt xong hàng.'
  },
  {
    step: 5,
    title: 'Hộp tự động khóa an toàn',
    desc: 'Cơ cấu chốt khóa điện tử tự động gạt khóa chặt nắp hộp và phát âm thanh xác nhận.'
  },
  {
    step: 6,
    title: 'Bạn nhận được thông báo',
    desc: 'Hệ thống gửi thông báo kiện hàng đã được nhận an toàn kèm thông tin khối lượng và thời gian giao.'
  }
];

export const HowItWorksStepper: React.FC = () => {
  return (
    <section className="section" id="how-it-works">
      <div className="container">
        <ScrollReveal direction="up">
          <div className="section-header" style={{ textAlign: 'center', margin: '0 auto 40px', maxWidth: '680px' }}>
            <h2 className="section-title">Quy trình nhận hàng tự động 6 bước</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>
              Đơn giản, trực quan cho người giao hàng và an toàn tuyệt đối cho người nhận.
            </p>
          </div>
        </ScrollReveal>

        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div className="stepper-container">
            {STEPS.map((item, idx) => (
              <ScrollReveal key={item.step} direction="up" delay={idx * 80}>
                <div className="stepper-item">
                  <div className="stepper-num">{item.step}</div>
                  <div className="stepper-content">
                    <div className="stepper-title">{item.title}</div>
                    <div className="stepper-desc">{item.desc}</div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
