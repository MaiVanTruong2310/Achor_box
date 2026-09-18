import React from 'react';
import { ScrollReveal } from '../ui/ScrollReveal';

export const HARDWARE_PARTS = [
  {
    name: 'Kết nối mạng',
    category: 'Giao tiếp không dây',
    role: 'Kết nối Wi-Fi tốc độ cao, hỗ trợ mở khóa từ xa và đồng bộ trạng thái đơn hàng theo thời gian thực.'
  },
  {
    name: 'Cơ cấu chốt khóa điện tử',
    category: 'Bảo mật & Cơ khí',
    role: 'Cơ cấu khóa điều khiển điện tử với bánh răng kim loại chịu lực, tự động chốt chặt nắp hộp khi đóng lại.'
  },
  {
    name: 'Cảm biến phát hiện bưu phẩm',
    category: 'Cảm biến thông minh',
    role: 'Cảm biến khoảng cách siêu âm tự động nhận diện chính xác khi có kiện hàng được đặt vào buồng chứa.'
  },
  {
    name: 'Cảm biến đo khối lượng',
    category: 'Cân điện tử',
    role: 'Mâm cân tải trọng điện tử đo lường chính xác trọng lượng kiện hàng phục vụ đối soát đơn hàng.'
  },
  {
    name: 'Cảm biến trạng thái nắp hộp',
    category: 'Cảm biến thông minh',
    role: 'Phát hiện chính xác trạng thái tiếp xúc đóng/mở của nắp hộp để kích hoạt chốt khóa an toàn.'
  },
  {
    name: 'Bàn phím nhập mã PIN dự phòng',
    category: 'Mở khóa tại chỗ',
    role: 'Bàn phím 16 phím bấm chống nước, cho phép mở khóa khẩn cấp trực tiếp tại hộp khi điện thoại hết pin.'
  },
  {
    name: 'Đèn LED & Còi báo trạng thái',
    category: 'Chỉ thị',
    role: 'Âm thanh thông báo quy trình nhận hàng và đèn LED hiển thị trạng thái kết nối, sẵn sàng nhận bưu phẩm.'
  },
  {
    name: 'Camera an ninh AI (Bản Plus & Pro Max)',
    category: 'Hình ảnh & Giám sát',
    role: 'Camera góc rộng 135° - 160° có hồng ngoại nhìn đêm, tự động chụp ảnh người giao hàng và kiện hàng khi nắp mở để làm bằng chứng đối soát.'
  },
  {
    name: 'Pin sạc Lithium-ion dự phòng (Bản Plus & Pro Max)',
    category: 'Nguồn điện liên tục (UPS)',
    role: 'Module pin sạc tự động duy trì hoạt động liên tục 12 - 24 giờ khi mất điện lưới, đảm bảo việc nhận hàng không bị gián đoạn.'
  },
  {
    name: 'Bộ xử lý trung tâm',
    category: 'Vi xử lý',
    role: 'Vi xử lý điều khiển toàn bộ hệ thống cảm biến và cơ chế khóa với độ tin cậy và phản hồi nhanh.'
  }
];

export const HardwareSpecsTable: React.FC = () => {
  return (
    <section className="section section-alt" id="hardware-specs">
      <div className="container">
        <ScrollReveal direction="up">
          <div className="section-header" style={{ textAlign: 'center', margin: '0 auto 36px', maxWidth: '720px' }}>
            <h2 className="section-title">Công nghệ &amp; Trang bị bên trong</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>
              Hệ thống linh kiện cảm biến và cơ chế khóa điện tử được tích hợp đồng bộ trên Anchor Box.
            </p>
          </div>
        </ScrollReveal>

        {/* Technical Specs Table */}
        <ScrollReveal direction="up" delay={150}>
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              maxWidth: '960px',
              margin: '0 auto',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <table className="specs-table">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-secondary)', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', width: '30%' }}>
                    Trang bị / Chức năng
                  </th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', width: '25%' }}>
                    Phân loại
                  </th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                    Vai trò kỹ thuật
                  </th>
                </tr>
              </thead>
              <tbody>
                {HARDWARE_PARTS.map((item, idx) => (
                  <tr key={idx}>
                    <td className="spec-name" style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {item.name}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      <span className="badge badge-gray">{item.category}</span>
                    </td>
                    <td className="spec-val" style={{ fontSize: '13.5px', lineHeight: 1.5 }}>
                      {item.role}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
