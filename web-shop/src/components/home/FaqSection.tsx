import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ScrollReveal } from '../ui/ScrollReveal';

export const FAQS = [
  {
    q: 'Anchor Box hoạt động như thế nào?',
    a: 'Khi bạn vắng nhà, shipper chỉ cần mở nắp hộp, đặt kiện hàng vào trong và hạ nắp lại. Cảm biến bên trong hộp sẽ tự động nhận diện bưu phẩm, ghi nhận khối lượng và chốt khóa an toàn sau 2 giây. Bạn sẽ nhận được thông báo ngay khi giao hàng hoàn tất.'
  },
  {
    q: 'Nếu mất kết nối Wi-Fi hoặc mất điện thì làm sao để mở hộp?',
    a: 'Bạn luôn có thể mở hộp trực tiếp tại chỗ bằng cách bấm mã PIN trên bàn phím của thiết bị mà không phụ thuộc vào mạng Internet. Đối với phiên bản Anchor Box Plus, máy được trang bị sẵn pin dự phòng duy trì hoạt động liên tục đến 12 giờ khi mất điện lưới.'
  },
  {
    q: 'Làm thế nào để shipper biết cách đặt hàng vào hộp?',
    a: 'Khi đặt hàng trực tuyến, bạn có thể ghi chú vào địa chỉ giao nhận: "Gửi hàng vào Hộp nhận hàng Anchor Box trước cửa, đóng nắp hộp để tự khóa". Khi shipper đến, nắp hộp đang ở trạng thái mở sẵn, họ chỉ cần bỏ gói hàng vào và đậy nắp lại.'
  },
  {
    q: 'Hộp có bị ướt khi trời mưa hoặc lắp ngoài cổng không?',
    a: 'Anchor Box được thiết kế nắp gập che phủ mép hộp với gờ chắn nước và khe thoát nước viền. Tuy nhiên, khuyến nghị lắp đặt thiết bị tại vị trí có mái hiên, trước cửa nhà hoặc cổng có mái che để đảm bảo độ bền tối ưu.'
  },
  {
    q: 'Các dòng Anchor Box khác nhau như thế nào (Có Camera và Không Camera)?',
    a: 'Bản Standard và Compact không tích hợp sẵn camera, phù hợp cho khu vực cửa đã có sẵn camera an ninh hoặc hành lang chung cư để tiết kiệm chi phí. Bản Anchor Box Plus được tích hợp sẵn Camera AI 1080p góc rộng và pin dự phòng 12h, tự động chụp ảnh người giao hàng và kiện hàng khi nắp mở. Bản Pro Max cao cấp nhất trang bị Dual-Camera (Camera trước 2K + Camera nội soi trong lòng hộp) và cấu trúc hộp kép 2 tầng.'
  },
  {
    q: 'Nếu có nhiều đơn hàng giao trong cùng một ngày thì xử lý ra sao?',
    a: 'Sau khi kiện hàng đầu tiên đã được khóa an toàn, khi shipper tiếp theo đến, bạn có thể bấm nút "Mở khóa từ xa" trên giao diện Web/App hoặc cung cấp mã PIN tạm thời để mở nắp hộp cho kiện hàng tiếp theo.'
  },
  {
    q: 'Tôi kiểm tra thông tin bảo hành chính hãng ở đâu?',
    a: 'Mỗi thiết bị Anchor Box xuất xưởng đều có số Serial Number duy nhất. Bạn có thể truy cập mục "Bảo hành" trên website, nhập số Serial để tra cứu ngày kích hoạt, thời hạn bảo hành và lịch sử bảo dưỡng kỹ thuật.'
  }
];

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section className="section section-alt" id="faq">
      <div className="container">
        <ScrollReveal direction="up">
          <div className="section-header" style={{ textAlign: 'center', margin: '0 auto 36px', maxWidth: '680px' }}>
            <h2 className="section-title">Câu hỏi thường gặp (FAQ)</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>
              Giải đáp các thắc mắc phổ biến về việc sử dụng và lắp đặt Anchor Box.
            </p>
          </div>
        </ScrollReveal>

        <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {FAQS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <ScrollReveal key={idx} direction="up" delay={idx * 50}>
                <div
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden'
                  }}
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '14.5px',
                      color: 'var(--text-main)',
                      backgroundColor: isOpen ? 'var(--bg-surface-secondary)' : 'transparent'
                    }}
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      size={18}
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0,
                        color: 'var(--text-muted)'
                      }}
                    />
                  </button>

                  {isOpen && (
                    <div
                      style={{
                        padding: '16px 20px',
                        fontSize: '13.5px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.6,
                        borderTop: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-surface)'
                      }}
                    >
                      {item.a}
                    </div>
                  )}
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};
