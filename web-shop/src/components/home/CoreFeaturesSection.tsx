import React from 'react';
import { Lock, Scale, KeyRound, BellRing, Smartphone, Camera, BatteryCharging, ShieldAlert } from 'lucide-react';
import { ScrollReveal } from '../ui/ScrollReveal';

export const CORE_FEATURES = [
  {
    icon: <Lock size={20} />,
    title: 'Tự động khóa cơ học bằng Servo',
    desc: 'Khi phát hiện có kiện hàng bên trong và nắp hộp được đóng kín, hệ thống tự động gạt chốt khóa vật lý sau 2 giây mà không cần thêm thao tác.'
  },
  {
    icon: <Camera size={20} />,
    title: 'Camera an ninh AI góc rộng (Bản Plus / Pro Max)',
    desc: 'Tự động chụp ảnh người giao hàng và kiện hàng khi nắp mở, lưu trữ hình ảnh làm bằng chứng đối soát với sàn thương mại điện tử.'
  },
  {
    icon: <Scale size={20} />,
    title: 'Đo lường khối lượng bưu phẩm',
    desc: 'Mâm cân cảm biến Load Cell phối hợp mạch giải mã HX711 xác định trọng lượng kiện hàng đặt vào để lưu đối soát với thông tin đơn hàng.'
  },
  {
    icon: <Smartphone size={20} />,
    title: 'Mở khóa từ xa qua Web & App',
    desc: 'Chủ nhà dễ dàng gửi lệnh mở khóa hộp cho shipper hoặc người thân ngay cả khi đang ở cơ quan thông qua kết nối Internet.'
  },
  {
    icon: <KeyRound size={20} />,
    title: 'Mã PIN dự phòng qua Keypad',
    desc: 'Trang bị bàn phím ma trận phím bấm trực tiếp trên hộp, cho phép mở khóa khẩn cấp khi điện thoại hết pin hoặc mạng Wi-Fi gián đoạn.'
  },
  {
    icon: <BatteryCharging size={20} />,
    title: 'Pin sạc dự phòng 12 - 24 giờ (Bản Plus / Pro Max)',
    desc: 'Mạch chuyển nguồn tự động liền mạch, duy trì kết nối Wi-Fi, camera và cơ cấu đóng mở khóa hoạt động bình thường khi mất điện.'
  },
  {
    icon: <BellRing size={20} />,
    title: 'Thông báo & Lịch sử nhận hàng',
    desc: 'Cập nhật trạng thái tức thì ngay sau khi kiện hàng được đặt vào hộp kèm mốc thời gian, hình ảnh và khối lượng chi tiết.'
  },
  {
    icon: <ShieldAlert size={20} />,
    title: 'Cảnh báo âm thanh Buzzer & LED',
    desc: 'Còi Buzzer phát âm thanh bíp thông báo quy trình và cảnh báo khi nắp hộp đóng chưa khít hoặc có can thiệp bất thường.'
  }
];

export const CoreFeaturesSection: React.FC = () => {
  return (
    <section className="section">
      <div className="container">
        <ScrollReveal direction="up">
          <div className="section-header" style={{ textAlign: 'center', margin: '0 auto 40px', maxWidth: '680px' }}>
            <h2 className="section-title">Chức năng vận hành cốt lõi</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>
              Hệ thống tập trung tối ưu các tính năng thiết thực phục vụ trọn vẹn quy trình giao nhận chặng cuối.
            </p>
          </div>
        </ScrollReveal>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '24px'
          }}
        >
          {CORE_FEATURES.map((item, idx) => (
            <ScrollReveal key={idx} direction="up" delay={idx * 60}>
              <div
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  height: '100%'
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {item.icon}
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {item.desc}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};
