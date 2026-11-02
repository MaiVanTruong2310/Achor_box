import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  CloudRain,
  Cpu,
  HeartHandshake,
  KeyRound,
  Layers,
  Lightbulb,
  Lock,
  PackageCheck,
  PhoneMissed,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { consultationPhone } from '../contact';
import { CtaBand, InfoPage, PageHero, SubNav } from './info/InfoChrome';

const SECTIONS = [
  { id: 'story', label: 'Câu chuyện' },
  { id: 'journey', label: 'Hành trình' },
  { id: 'values', label: 'Giá trị' },
  { id: 'built', label: 'Sản phẩm' },
];

const PROBLEMS: { icon: LucideIcon; tint: string; title: string; body: string }[] = [
  { icon: PhoneMissed, tint: 'red', title: 'Cuộc gọi nhỡ', body: 'Shipper gọi đúng lúc bạn đang họp, đang lái xe hay vắng nhà. Đơn bị hẹn lại, cả hai bên cùng mất thời gian.' },
  { icon: CloudRain, tint: 'orange', title: 'Hàng để ngoài cửa', body: 'Bưu kiện nằm ngoài hiên, gặp mưa nắng hoặc bị lấy mất, không ai biết là lúc nào.' },
  { icon: PackageCheck, tint: 'green', title: 'Một chỗ chờ an toàn', body: 'Shipper nhập mã dùng một lần, đặt hàng vào hộp, đóng cửa là hộp tự khóa và báo cho bạn.' },
];

const MILESTONES: { tint: string; phase: string; title: string; body: string }[] = [
  { tint: 'blue', phase: 'Giai đoạn 1', title: 'Khảo sát và ý tưởng', body: 'Tìm hiểu thói quen nhận hàng của các hộ gia đình đô thị và xác định bài toán của chặng giao cuối.' },
  { tint: 'indigo', phase: 'Giai đoạn 2', title: 'Mạch và cơ khí', body: 'Thiết kế bo mạch trên Altium, chọn khóa kép chốt điện + servo, tích hợp cân và cảm biến cửa.' },
  { tint: 'orange', phase: 'Giai đoạn 3', title: 'Firmware và đám mây', body: 'Viết firmware ESP32-S3 không chặn, xây hàng đợi lệnh, xác thực PIN và ghép nối trên đám mây.' },
  { tint: 'green', phase: 'Giai đoạn 4', title: 'Ứng dụng và cửa hàng', body: 'Hoàn thiện ứng dụng di động, cửa hàng trực tuyến, quy trình lắp đặt và bảo hành điện tử.' },
];

const VALUES: { icon: LucideIcon; tint: string; title: string; body: string }[] = [
  { icon: Sparkles, tint: 'blue', title: 'Đơn giản trước hết', body: 'Shipper không cần cài ứng dụng. Nhập mã, đặt hàng, đóng cửa. Thế là xong.' },
  { icon: Lock, tint: 'indigo', title: 'Riêng tư và an toàn', body: 'Mã PIN dùng một lần, kiểm tra trên đám mây, chống dò mã và phân quyền theo từng tài khoản.' },
  { icon: ShieldCheck, tint: 'green', title: 'Nói đúng sự thật', body: 'Ứng dụng chỉ báo “đã mở” khi thiết bị xác nhận. Trang web chỉ công bố thông số phần cứng làm được.' },
  { icon: HeartHandshake, tint: 'orange', title: 'Đồng hành lâu dài', body: 'Lắp đặt tận nơi, nghiệm thu rõ ràng và bảo hành điện tử theo dõi được trong tài khoản.' },
];

const STACK = ['ESP32-S3 · C++', 'Altium Designer', 'MQTT', 'Supabase · PostgreSQL', 'Flutter', 'Spring Boot', 'React'];

const BUILT: { icon: LucideIcon; tint: string; title: string; body: string; to: string; cta: string }[] = [
  { icon: Cpu, tint: 'orange', title: 'Thiết bị', body: 'Khóa kép, cân bưu kiện, cảm biến cửa, bàn phím và màn hình trong một chiếc hộp.', to: '/technology', cta: 'Công nghệ bên trong' },
  { icon: Smartphone, tint: 'blue', title: 'Ứng dụng', body: 'Tạo PIN cho shipper, mở hộp từ xa và nhận thông báo khi có bưu kiện.', to: '/app', cta: 'Về ứng dụng' },
  { icon: Wrench, tint: 'green', title: 'Dịch vụ', body: 'Giao, lắp đặt, nghiệm thu và bảo hành điện tử cho mỗi thiết bị.', to: '/how-it-works', cta: 'Quy trình giao & lắp' },
];

function IconCard({ icon: Icon, tint, title, body, index }: { icon: LucideIcon; tint: string; title: string; body: string; index: number }) {
  return (
    <article className="ab-card" data-tint={tint} data-reveal style={{ '--i': index } as CSSProperties}>
      <span className="ab-feature-icon"><Icon size={20} aria-hidden /></span>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

export function AboutPage() {
  return (
    <InfoPage>
      <SubNav title="Về Anchor Box" links={SECTIONS} action={<Link to="/products" className="ab-btn ab-btn-primary ab-btn-xs">Mua</Link>} />

      <PageHero
        crumb="Về Anchor Box"
        eyebrow="Về chúng tôi"
        title={<>Một nơi tử tế<br /><span className="ab-gradient-text">cho mỗi bưu kiện.</span></>}
        lead="Anchor Box bắt đầu từ một đồ án tốt nghiệp tại Học viện Ngân hàng, với một câu hỏi đơn giản: vì sao ngôi nhà hiện đại vẫn chưa có chỗ nào dành riêng cho bưu kiện?"
      >
        <div className="ab-hero-cta" data-reveal>
          <Link to="/products" className="ab-btn ab-btn-primary">Khám phá Anchor Box</Link>
          <Link to="/contact" className="ab-btn-link">Liên hệ hợp tác <ChevronRight size={16} aria-hidden /></Link>
        </div>
      </PageHero>

      <section className="ab-section" style={{ paddingTop: 0 }} aria-label="Tuyên ngôn">
        <div className="ab-container ab-center">
          <p className="ab-quote" data-reveal>
            Chúng tôi không làm thêm một chiếc hộp. <span>Chúng tôi làm để bạn không phải chờ shipper, và shipper không phải chờ bạn.</span>
          </p>
        </div>
      </section>

      <section id="story" className="ab-section ab-section-alt" aria-labelledby="about-story-title">
        <div className="ab-container">
          <div className="ab-story-grid">
            <div>
              <p className="ab-eyebrow" data-reveal><Lightbulb size={14} aria-hidden style={{ verticalAlign: '-2px' }} /> Khởi nguồn</p>
              <h2 id="about-story-title" className="ab-section-title" data-reveal>Chặng giao cuối vẫn là chặng khó nhất.</h2>
            </div>
            <div>
              <p className="ab-section-lead" data-reveal>Thương mại điện tử giúp đặt hàng chỉ trong vài giây, nhưng khoảnh khắc nhận hàng vẫn phụ thuộc vào việc bạn có ở nhà hay không.</p>
              <p className="ab-section-lead" data-reveal>Anchor Box là một điểm nhận hàng đặt ngay tại nhà bạn: chắc chắn, tự khóa và luôn kết nối, để mỗi lần giao hàng diễn ra trọn vẹn kể cả khi không ai ở nhà.</p>
            </div>
          </div>
          <div className="ab-grid-3 ab-mt">
            {PROBLEMS.map((item, index) => <IconCard key={item.title} {...item} index={index} />)}
          </div>
        </div>
      </section>

      <section className="ab-dark-band" aria-labelledby="about-thesis-title">
        <div className="ab-container">
          <p className="ab-eyebrow" data-reveal>Đồ án tốt nghiệp · Học viện Ngân hàng</p>
          <h2 id="about-thesis-title" className="ab-section-title" data-reveal>Từ giảng đường đến cửa nhà bạn.</h2>
          <p className="ab-section-lead" data-reveal>Không dừng ở bản báo cáo, nhóm tự thiết kế mạch, viết firmware, xây hạ tầng đám mây, ứng dụng di động và cả cửa hàng bạn đang xem.</p>
          <div className="ab-stack" data-reveal>
            {STACK.map((item) => <span key={item} style={{ background: 'rgba(255,255,255,0.1)', color: '#f5f5f7' }}>{item}</span>)}
          </div>
        </div>
      </section>

      <section id="journey" className="ab-section" aria-labelledby="about-journey-title">
        <div className="ab-container">
          <p className="ab-eyebrow" data-reveal>Hành trình</p>
          <h2 id="about-journey-title" className="ab-section-title" data-reveal>Bốn chặng, một sản phẩm hoàn chỉnh.</h2>
          <ol className="ab-milestones">
            {MILESTONES.map(({ tint, phase, title, body }, index) => (
              <li key={title} data-tint={tint} data-reveal style={{ '--i': index } as CSSProperties}>
                <small>{phase}</small>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="values" className="ab-section ab-section-alt" aria-labelledby="about-values-title">
        <div className="ab-container">
          <p className="ab-eyebrow" data-reveal>Giá trị</p>
          <h2 id="about-values-title" className="ab-section-title" data-reveal>Điều chúng tôi tin.</h2>
          <div className="ab-grid-4 ab-mt">
            {VALUES.map((item, index) => <IconCard key={item.title} {...item} index={index} />)}
          </div>
        </div>
      </section>

      <section id="built" className="ab-section" aria-labelledby="about-built-title">
        <div className="ab-container">
          <p className="ab-eyebrow" data-reveal>Chúng tôi đã làm gì</p>
          <h2 id="about-built-title" className="ab-section-title" data-reveal>Một hệ sinh thái, ba phần ăn khớp.</h2>
          <div className="ab-grid-3 ab-mt">
            {BUILT.map(({ icon: Icon, tint, title, body, to, cta }, index) => (
              <Link key={title} to={to} className="ab-card ab-card-link" data-tint={tint} data-reveal style={{ '--i': index } as CSSProperties}>
                <span className="ab-feature-icon"><Icon size={20} aria-hidden /></span>
                <h3>{title}</h3>
                <p>{body}</p>
                <span className="ab-btn-link">{cta} <ChevronRight size={16} aria-hidden /></span>
              </Link>
            ))}
          </div>
          <div className="ab-grid-2 ab-mt">
            <article className="ab-card" data-tint="indigo" data-reveal>
              <span className="ab-feature-icon"><Layers size={20} aria-hidden /></span>
              <h3>Hợp tác cùng chúng tôi</h3>
              <p>Chủ đầu tư khu đô thị, chung cư hay đơn vị giao nhận muốn thử nghiệm Anchor Box, hãy để lại thông tin.</p>
            </article>
            <article className="ab-card" data-tint="teal" data-reveal style={{ '--i': 1 } as CSSProperties}>
              <span className="ab-feature-icon"><KeyRound size={20} aria-hidden /></span>
              <h3>Gọi trực tiếp</h3>
              <p>Tư vấn sản phẩm và lắp đặt: <a href={consultationPhone.href} className="ab-btn-link" style={{ fontSize: 'inherit' }}>{consultationPhone.display}</a></p>
            </article>
          </div>
        </div>
      </section>

      <section className="ab-section" style={{ paddingTop: 0 }}>
        <CtaBand
          title="Để bưu kiện có chỗ chờ bạn về."
          body="Xem các phiên bản Anchor Box và đặt lịch lắp đặt tại nhà."
          primary={{ to: '/products', label: 'Mua Anchor Box' }}
          secondary={{ to: '/contact', label: 'Liên hệ tư vấn' }}
        />
      </section>
    </InfoPage>
  );
}

export default AboutPage;
