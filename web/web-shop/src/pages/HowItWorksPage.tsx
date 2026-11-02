import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  BellRing,
  Check,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  KeyRound,
  Plug,
  QrCode,
  ShoppingBag,
  Smartphone,
  Truck,
  Wifi,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { CtaBand, InfoPage, PageHero, SubNav } from './info/InfoChrome';

const SECTIONS = [
  { id: 'journey', label: 'Hành trình đơn hàng' },
  { id: 'install-day', label: 'Ngày lắp đặt' },
  { id: 'activate', label: 'Kích hoạt' },
  { id: 'faq', label: 'Hỏi đáp' },
];

const JOURNEY: { icon: LucideIcon; tint: string; title: string; body: string; statuses: string[] }[] = [
  { icon: ShoppingBag, tint: 'blue', title: 'Đặt hàng', body: 'Chọn phiên bản và dung tích còn hàng, nhập địa chỉ lắp đặt. Đơn được gửi đi để xét duyệt trước khi bạn trả tiền.', statuses: ['Chờ duyệt đơn'] },
  { icon: ClipboardCheck, tint: 'indigo', title: 'Xét duyệt', body: 'Bộ phận sản phẩm kiểm tra từng mặt hàng. Nếu chỉ duyệt được một phần, bạn sẽ được hỏi có muốn tiếp tục với phần còn lại hay không.', statuses: ['Đã duyệt', 'Cần bạn xác nhận'] },
  { icon: CreditCard, tint: 'teal', title: 'Thanh toán', body: 'Thanh toán trực tuyến qua VNPay. Phiên thanh toán có thời hạn; quá hạn, bạn có thể mở lại từ trang đơn hàng.', statuses: ['Chờ thanh toán', 'Đã thanh toán'] },
  { icon: Truck, tint: 'orange', title: 'Giao và lắp đặt', body: 'Kỹ thuật viên được phân công, hẹn lịch, giao thiết bị và lắp tại nhà. Giao hàng và lắp đặt có trạng thái riêng để bạn theo dõi.', statuses: ['Đã phân công', 'Đã giao thiết bị', 'Đã lắp đặt'] },
  { icon: Wrench, tint: 'yellow', title: 'Kiểm tra tại chỗ', body: 'Trước khi bàn giao, kỹ thuật viên gắn serial thiết bị vào đơn và chạy thử khóa, mở khóa và cảm biến cân ngay trước mặt bạn.', statuses: ['Đã gắn serial', 'Kiểm tra khóa'] },
  { icon: BadgeCheck, tint: 'green', title: 'Nghiệm thu và bảo hành', body: 'Bạn xác nhận nghiệm thu trong tài khoản. Khi nghiệm thu được duyệt, phiếu bảo hành điện tử của thiết bị được tạo tự động.', statuses: ['Đã nghiệm thu', 'Còn hiệu lực'] },
];

const PREPARE = [
  { title: 'Ổ điện gần vị trí đặt hộp', body: 'Bản Base dùng adapter DC và không có pin dự phòng.' },
  { title: 'Wi-Fi 2,4 GHz', body: 'Hộp chưa hỗ trợ băng tần 5 GHz. Nên thử sóng ở vị trí đặt hộp trước.' },
  { title: 'Điện thoại có Bluetooth', body: 'Dùng để cài Wi-Fi cho hộp trong ứng dụng Anchor Box.' },
  { title: 'Mặt phẳng chắc chắn', body: 'Sàn hoặc tường đủ cứng để cố định hộp, có mái che càng tốt.' },
];

const ACTIVATE: { icon: LucideIcon; tint: string; title: string; body: string }[] = [
  { icon: QrCode, tint: 'indigo', title: 'Quét mã QR', body: 'Mã trên hộp chứa serial DBX-…. Ứng dụng gửi yêu cầu ghép nối, hộp xác nhận lại.' },
  { icon: Wifi, tint: 'teal', title: 'Cài Wi-Fi', body: 'Gửi tên và mật khẩu mạng sang hộp qua Bluetooth. Đèn vàng tắt khi đã kết nối.' },
  { icon: KeyRound, tint: 'blue', title: 'Tạo PIN đầu tiên', body: 'Tạo mã dùng một lần và gửi cho shipper cùng đơn hàng tiếp theo của bạn.' },
  { icon: BellRing, tint: 'green', title: 'Nhận thông báo', body: 'Có bưu kiện mới, hộp mở hay hộp mất kết nối, ứng dụng đều báo cho bạn.' },
];

const FAQ = [
  { q: 'Bao lâu thì đơn được duyệt?', a: 'Đơn được xét duyệt theo từng mặt hàng. Mọi thay đổi trạng thái đều hiện trong chi tiết đơn hàng và thông báo tài khoản của bạn.' },
  { q: 'Đơn bị duyệt một phần thì sao?', a: 'Bạn sẽ thấy trạng thái “Cần bạn xác nhận”. Bạn có thể đồng ý tiếp tục với các mặt hàng đã duyệt hoặc hủy đơn.' },
  { q: 'Đã giao hàng có nghĩa là đã nghiệm thu?', a: 'Không. Giao hàng, lắp đặt và nghiệm thu là ba bước riêng. Bảo hành chỉ bắt đầu sau khi nghiệm thu được xác nhận.' },
  { q: 'Tôi có thể tự lắp đặt không?', a: 'Lắp đặt do kỹ thuật viên thực hiện để kiểm tra khóa, cân và gắn serial với đơn hàng. Đây cũng là điều kiện để kích hoạt bảo hành.' },
  { q: 'Tôi xem tiến độ ở đâu?', a: 'Trong mục Đơn hàng của tài khoản, hoặc tra cứu nhanh bằng mã đơn tại trang Theo dõi đơn hàng.' },
];

export function HowItWorksPage() {
  return (
    <InfoPage>
      <SubNav title="Giao & lắp đặt" links={SECTIONS} action={<Link to="/order-tracking" className="ab-btn ab-btn-secondary ab-btn-xs">Theo dõi đơn</Link>} />

      <PageHero
        crumb="Giao & lắp đặt"
        eyebrow="Từ lựa chọn đến sử dụng"
        title={<>Bạn đặt hàng.<br /><span className="ab-gradient-text">Chúng tôi lo phần còn lại.</span></>}
        lead="Mỗi đơn Anchor Box đi qua sáu bước rõ ràng, từ xét duyệt đến nghiệm thu. Bước nào bạn cũng thấy được trong tài khoản."
      >
        <div className="ab-hero-cta" data-reveal>
          <Link to="/products" className="ab-btn ab-btn-primary">Chọn sản phẩm</Link>
          <Link to="/account/orders" className="ab-btn-link">Xem đơn hàng của tôi <ChevronRight size={16} aria-hidden /></Link>
        </div>
      </PageHero>

      <section id="journey" className="ab-section" style={{ paddingTop: 0 }} aria-labelledby="hiw-journey-title">
        <div className="ab-container">
          <p className="ab-eyebrow" data-reveal>Hành trình đơn hàng</p>
          <h2 id="hiw-journey-title" className="ab-section-title" data-reveal>Sáu bước. Không bước nào mập mờ.</h2>
          <p className="ab-section-lead" data-reveal>Các nhãn màu là đúng tên trạng thái bạn sẽ thấy trong chi tiết đơn hàng.</p>
          <ol className="ab-timeline">
            {JOURNEY.map(({ icon: Icon, tint, title, body, statuses }, index) => (
              <li key={title} data-tint={tint} data-reveal style={{ '--i': 0 } as CSSProperties}>
                <span className="ab-timeline-dot"><Icon size={22} aria-hidden /></span>
                <article className="ab-card">
                  <span className="ab-timeline-step">Bước {index + 1}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                  <div className="ab-status-chips" aria-label="Trạng thái liên quan">
                    {statuses.map((status) => <span key={status} className="ab-chip">{status}</span>)}
                  </div>
                </article>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="install-day" className="ab-section ab-section-alt" aria-labelledby="hiw-install-title">
        <div className="ab-container ab-story-grid">
          <div>
            <p className="ab-eyebrow" data-reveal>Ngày lắp đặt</p>
            <h2 id="hiw-install-title" className="ab-section-title" data-reveal>Chuẩn bị bốn thứ. Phần còn lại mất chưa đến một buổi.</h2>
            <p className="ab-section-lead" data-reveal>Kỹ thuật viên mang theo hộp, phụ kiện cố định và kiểm tra mọi cảm biến trước khi rời đi.</p>
          </div>
          <div className="ab-card ab-card-lg" data-reveal>
            <span className="ab-feature-icon"><Plug size={20} aria-hidden /></span>
            <h3>Bạn cần chuẩn bị</h3>
            <ul className="ab-checklist" style={{ marginTop: 18 }}>
              {PREPARE.map(({ title, body }) => (
                <li key={title}><Check size={20} aria-hidden /><span><strong>{title}</strong>{body}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="activate" className="ab-section" aria-labelledby="hiw-activate-title">
        <div className="ab-container">
          <p className="ab-eyebrow" data-reveal>Sau khi bàn giao</p>
          <h2 id="hiw-activate-title" className="ab-section-title" data-reveal>Kích hoạt trong vài phút.</h2>
          <p className="ab-section-lead" data-reveal>Mọi thao tác nằm trong ứng dụng Anchor Box trên điện thoại của bạn.</p>
          <div className="ab-grid-4 ab-mt">
            {ACTIVATE.map(({ icon: Icon, tint, title, body }, index) => (
              <article key={title} className="ab-card" data-tint={tint} data-reveal style={{ '--i': index } as CSSProperties}>
                <span className="ab-feature-icon"><Icon size={20} aria-hidden /></span>
                <span className="ab-install-index">Bước {index + 1}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
          <div className="ab-grid-2 ab-mt">
            <Link to="/app" className="ab-card ab-card-link" data-reveal>
              <span className="ab-feature-icon"><Smartphone size={20} aria-hidden /></span>
              <h3>Ứng dụng Anchor Box</h3>
              <p>Xem ứng dụng làm được những gì trước khi lắp đặt.</p>
              <span className="ab-btn-link">Tìm hiểu <ChevronRight size={16} aria-hidden /></span>
            </Link>
            <Link to="/warranty" className="ab-card ab-card-link" data-reveal style={{ '--i': 1 } as CSSProperties}>
              <span className="ab-feature-icon"><BadgeCheck size={20} aria-hidden /></span>
              <h3>Bảo hành điện tử</h3>
              <p>Phiếu bảo hành được tạo khi nghiệm thu và luôn có trong tài khoản.</p>
              <span className="ab-btn-link">Xem bảo hành <ChevronRight size={16} aria-hidden /></span>
            </Link>
          </div>
        </div>
      </section>

      <section id="faq" className="ab-section ab-faq ab-section-alt" aria-labelledby="hiw-faq-title">
        <div className="ab-container ab-container-narrow">
          <h2 id="hiw-faq-title" className="ab-section-title" data-reveal>Câu hỏi về giao và lắp đặt.</h2>
          <div className="ab-faq-list">
            {FAQ.map(({ q, a }) => (
              <details key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
        </div>
      </section>

      <section className="ab-section">
        <CtaBand
          title="Cần khảo sát vị trí trước?"
          body="Gửi yêu cầu, chúng tôi sẽ gọi lại để tư vấn vị trí và phiên bản phù hợp."
          primary={{ to: '/contact', label: 'Đặt lịch tư vấn' }}
          secondary={{ to: '/products', label: 'Xem sản phẩm' }}
        />
      </section>
    </InfoPage>
  );
}
