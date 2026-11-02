import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, PackageCheck, QrCode, Wrench } from 'lucide-react';
import { FAQS } from './landingData';

const INSTALL_STEPS = [
  { icon: PackageCheck, title: 'Đặt hàng', body: 'Chọn phiên bản, thanh toán và theo dõi đơn ngay trên website.' },
  { icon: Wrench, title: 'Lắp đặt', body: 'Kỹ thuật viên lắp hộp gần ổ điện, kiểm tra khóa, cân và cảm biến cửa.' },
  { icon: QrCode, title: 'Ghép nối', body: 'Quét mã QR trên hộp, cài Wi-Fi qua Bluetooth, rồi tạo mã đầu tiên cho shipper.' },
];

export function InstallSteps() {
  return (
    <section id="how" className="ab-section ab-install" aria-labelledby="ab-install-title">
      <div className="ab-container">
        <p className="ab-eyebrow" data-reveal>Giao & lắp đặt</p>
        <h2 id="ab-install-title" className="ab-section-title" data-reveal>Từ đơn hàng đến bưu kiện đầu tiên.</h2>
        <ol className="ab-install-grid">
          {INSTALL_STEPS.map(({ icon: Icon, title, body }, index) => (
            <li key={title} className="ab-card" data-reveal style={{ '--i': index } as CSSProperties}>
              <span className="ab-feature-icon"><Icon size={20} strokeWidth={1.9} aria-hidden /></span>
              <span className="ab-install-index">Bước {index + 1}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
        <Link to="/how-it-works" className="ab-btn-link">Chi tiết quy trình <ChevronRight size={16} aria-hidden /></Link>
      </div>
    </section>
  );
}

export function LandingFaq() {
  return (
    <section id="faq" className="ab-section ab-faq" aria-labelledby="ab-faq-title">
      <div className="ab-container ab-container-narrow">
        <h2 id="ab-faq-title" className="ab-section-title" data-reveal>Câu hỏi thường gặp.</h2>
        <div className="ab-faq-list">
          {FAQS.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="ab-final" aria-labelledby="ab-final-title">
      <div className="ab-container">
        <h2 id="ab-final-title" className="ab-final-title" data-reveal>Để bưu kiện có chỗ chờ bạn về.</h2>
        <div className="ab-hero-cta">
          <Link to="/products" className="ab-btn ab-btn-primary">Mua Anchor Box</Link>
          <Link to="/contact" className="ab-btn-link">Nhận tư vấn lắp đặt <ChevronRight size={16} aria-hidden /></Link>
        </div>
      </div>
    </section>
  );
}
