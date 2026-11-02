import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  BellRing,
  Bluetooth,
  Cloud,
  Cpu,
  Info,
  KeyRound,
  ListChecks,
  QrCode,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';
import { HARDWARE_FACTS, HARDWARE_TILES } from './landing/landingData';
import { prefersReducedMotion } from './landing/useScrollProgress';
import { CtaBand, InfoPage, PageHero, SubNav } from './info/InfoChrome';

const SECTIONS = [
  { id: 'architecture', label: 'Kiến trúc' },
  { id: 'remote', label: 'Điều khiển từ xa' },
  { id: 'hardware', label: 'Phần cứng' },
  { id: 'security', label: 'Bảo mật' },
  { id: 'specs', label: 'Thông số' },
];

const NODES: { icon: LucideIcon; tint: string; kicker: string; name: string; items: string[] }[] = [
  { icon: Cpu, tint: 'orange', kicker: 'Tại cửa nhà bạn', name: 'Thiết bị Anchor Box', items: ['ESP32-S3, Wi-Fi 2,4 GHz + Bluetooth LE', 'Khóa kép, cân, cảm biến cửa', 'Bàn phím 4×4 và màn hình LCD'] },
  { icon: Cloud, tint: 'blue', kicker: 'Nguồn dữ liệu chuẩn', name: 'Đám mây Anchor Box', items: ['Xác thực mã PIN, ghép nối thiết bị', 'Hàng đợi lệnh và lịch sử sự kiện', 'Phân quyền theo từng tài khoản'] },
  { icon: Smartphone, tint: 'green', kicker: 'Trong túi bạn', name: 'Ứng dụng di động', items: ['Tạo PIN một lần cho shipper', 'Mở hoặc khóa hộp từ xa', 'Thông báo khi có bưu kiện'] },
];

const FLOW: { icon: LucideIcon; title: string; subtitle: string; body: string; badge: string; tint: string; code: string }[] = [
  {
    icon: Smartphone, title: 'Bạn chạm “Mở khóa”', subtitle: 'Ứng dụng', tint: 'blue', badge: 'Đã xếp hàng',
    body: 'Ứng dụng không nói chuyện trực tiếp với hộp. Lệnh được ghi vào hàng đợi trên đám mây, gắn với đúng thiết bị và tài khoản của bạn.',
    code: '<em>-- hàng đợi lệnh</em>\n<b>insert into</b> device_commands\n  (device_id, command)\n<b>values</b> (<i>\'DBX-…\'</i>, <i>\'unlock\'</i>);',
  },
  {
    icon: RefreshCcw, title: 'Hộp nhận lệnh', subtitle: 'Hỏi hàng đợi + MQTT', tint: 'indigo', badge: 'Đã nhận',
    body: 'Thiết bị định kỳ hỏi đám mây xem có lệnh mới. MQTT là kênh phụ giúp lệnh đến nhanh hơn, nhưng không phải nguồn dữ liệu chuẩn.',
    code: '<b>POST</b> /rpc/get_pending_device_command\n<em>→</em> { command: <i>"unlock"</i>,\n    command_id: <i>"8f2c…"</i> }',
  },
  {
    icon: Cpu, title: 'Khóa kép mở ra', subtitle: 'ESP32-S3', tint: 'orange', badge: 'Đang mở',
    body: 'Mỗi mã lệnh chỉ được chạy một lần: các mã gần nhất được lưu lại trong bộ nhớ của hộp, kể cả khi khởi động lại. Chốt điện nhả, servo xoay mở chốt gài.',
    code: '<em>// máy trạng thái khóa</em>\nIDLE <em>→</em> SOLENOID_PULSE\n     <em>→</em> SERVO_UNLOCKING\n     <em>→</em> UNLOCKED',
  },
  {
    icon: ListChecks, title: 'Báo lại trạng thái thật', subtitle: 'Telemetry', tint: 'green', badge: 'Đã xác nhận',
    body: 'Hộp gửi trạng thái khóa, cửa và khối lượng lên đám mây định kỳ. Ứng dụng chỉ báo “đã mở” khi thiết bị xác nhận, không suy ra từ thao tác của bạn.',
    code: '<b>POST</b> /rpc/report_device_telemetry\n{ lock: <i>"unlocked"</i>,\n  door: <i>"closed"</i>,\n  weight_kg: 1.25 }',
  },
];

const SECURITY: { icon: LucideIcon; tint: string; title: string; body: string }[] = [
  { icon: KeyRound, tint: 'blue', title: 'PIN được kiểm tra trên đám mây', body: 'Mã bạn tạo cho shipper chỉ dùng một lần và có hạn. Hộp gửi mã lên để xác thực, không lưu danh sách mã trong thiết bị.' },
  { icon: ShieldCheck, tint: 'red', title: 'Chống dò mã', body: 'Nhập sai 3 lần liên tiếp, bàn phím bị khóa 60 giây. Mỗi lần mở cửa đều được ghi vào lịch sử.' },
  { icon: QrCode, tint: 'indigo', title: 'Ghép nối có xác nhận', body: 'Quét QR trên hộp để bắt đầu, thiết bị phải xác nhận lại thì mới thuộc về tài khoản của bạn.' },
  { icon: Bluetooth, tint: 'teal', title: 'Wi-Fi qua Bluetooth', body: 'Mật khẩu Wi-Fi được gửi thẳng từ điện thoại sang hộp qua Bluetooth LE, không đi qua máy chủ.' },
  { icon: RefreshCcw, tint: 'orange', title: 'Lệnh không chạy hai lần', body: 'Mỗi lệnh có mã riêng. Hộp bỏ qua lệnh trùng, kể cả khi nhận cùng lúc qua hàng đợi và MQTT.' },
  { icon: BellRing, tint: 'green', title: 'Nhật ký tách bạch', body: 'Sự kiện kỹ thuật, thông báo cho bạn và nhật ký kiểm tra được lưu riêng, đúng quyền của từng tài khoản.' },
];

const SPECS: { label: string; values: string[] }[] = [
  { label: 'Vi điều khiển', values: ['ESP32-S3, bộ nhớ flash 16 MB, có PSRAM'] },
  { label: 'Kết nối', values: ['Wi-Fi 802.11 b/g/n 2,4 GHz', 'Bluetooth LE (cài đặt Wi-Fi)'] },
  { label: 'Giao tiếp đám mây', values: ['HTTPS tới API đám mây (kênh chính)', 'MQTT cho dữ liệu trực tiếp (kênh phụ)'] },
  { label: 'Khóa', values: ['Chốt điện 12 V điều khiển qua MOSFET', 'Servo gài chốt thứ hai'] },
  { label: 'Cảm biến', values: ['Loadcell + HX711, nhận bưu kiện từ 50 g', 'Công tắc từ MC-38 cho cửa'] },
  { label: 'Giao diện tại hộp', values: ['Bàn phím 4×4 qua mở rộng I²C PCF8574', 'Màn hình LCD 16×2, 3 đèn trạng thái và còi'] },
  { label: 'Nguồn', values: ['Adapter DC, đầu vào 9–24 V', 'Hạ áp LM2576'] },
];

function RemoteFlow() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = FLOW[step];

  useEffect(() => {
    if (paused || prefersReducedMotion()) return;
    const timer = window.setTimeout(() => setStep((value) => (value + 1) % FLOW.length), 5200);
    return () => window.clearTimeout(timer);
  }, [step, paused]);

  return (
    <div className="ab-flow">
      <ol className="ab-flow-steps" aria-label="Các bước của một lệnh mở khóa">
        {FLOW.map(({ icon: Icon, title, subtitle, body }, index) => (
          <li key={title} data-reveal style={{ '--i': index } as CSSProperties}>
            <button
              type="button"
              className={`ab-flow-step ${index === step ? 'is-active' : ''}`}
              aria-pressed={index === step}
              aria-controls="ab-flow-panel"
              onClick={() => { setStep(index); setPaused(true); }}
            >
              <span className="ab-feature-icon"><Icon size={19} aria-hidden /></span>
              <span>
                <strong>{title}</strong>
                <small>Bước {index + 1} · {subtitle}</small>
                {index === step && <p>{body}</p>}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="ab-flow-panel" id="ab-flow-panel" aria-live="polite" data-reveal style={{ '--step': step, '--tint': `var(--ab-${current.tint === 'blue' ? 'tint' : current.tint})` } as CSSProperties}>
        <header>
          <span>Bước {step + 1} / {FLOW.length} · {current.subtitle}</span>
          <strong>{current.badge}</strong>
        </header>
        <pre className="ab-code" dangerouslySetInnerHTML={{ __html: current.code }} />
        <div className="ab-mini-tiles">
          <article className={`ab-tile ab-tile-sm ${step >= 2 ? 'is-on' : ''}`} data-tint="orange">
            <span className="ab-tile-icon"><KeyRound size={18} aria-hidden /></span>
            <span className="ab-tile-name">Khóa</span>
            <span className="ab-tile-status">{step >= 2 ? 'Đã mở' : 'Đã khóa'}</span>
          </article>
          <article className={`ab-tile ab-tile-sm ${step === 3 ? 'is-on' : ''}`} data-tint="green">
            <span className="ab-tile-icon"><Smartphone size={18} aria-hidden /></span>
            <span className="ab-tile-name">Ứng dụng</span>
            <span className="ab-tile-status">{step === 3 ? 'Đã xác nhận' : 'Đang chờ hộp'}</span>
          </article>
        </div>
        <p className="ab-flow-note"><Info size={15} aria-hidden />Sơ đồ minh họa. Trang này không gửi lệnh hay đọc dữ liệu từ thiết bị thật.</p>
        <div className="ab-flow-progress" aria-hidden="true"><span /></div>
      </div>
    </div>
  );
}

export function TechnologyPage() {
  return (
    <InfoPage>
      <SubNav title="Công nghệ" links={SECTIONS} action={<Link to="/products" className="ab-btn ab-btn-primary ab-btn-xs">Mua</Link>} />

      <PageHero
        crumb="Công nghệ"
        eyebrow="Bên trong Anchor Box"
        title={<>Ba thành phần.<br /><span className="ab-gradient-text">Một trạng thái thật.</span></>}
        lead="Thiết bị, đám mây và ứng dụng cùng nhìn vào một nguồn dữ liệu. Vì vậy những gì bạn thấy trên điện thoại luôn là điều đang xảy ra ở cửa nhà."
      />

      <section id="architecture" className="ab-section" style={{ paddingTop: 0 }} aria-labelledby="tech-arch-title">
        <div className="ab-container ab-center">
          <p className="ab-eyebrow" data-reveal>Kiến trúc</p>
          <h2 id="tech-arch-title" className="ab-section-title" data-reveal>Mọi tín hiệu đi qua đám mây.</h2>
          <div className="ab-arch">
            {NODES.map(({ icon: Icon, tint, kicker, name, items }, index) => (
              <FragmentNode key={name} last={index === NODES.length - 1}>
                <article className="ab-arch-node" data-tint={tint} data-reveal style={{ '--i': index } as CSSProperties}>
                  <span className="ab-feature-icon"><Icon size={22} aria-hidden /></span>
                  <small>{kicker}</small>
                  <strong>{name}</strong>
                  <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
                </article>
              </FragmentNode>
            ))}
          </div>
        </div>
      </section>

      <section id="remote" className="ab-section ab-section-alt" aria-labelledby="tech-remote-title">
        <div className="ab-container">
          <p className="ab-eyebrow" data-reveal>Điều khiển từ xa</p>
          <h2 id="tech-remote-title" className="ab-section-title" data-reveal>Một lần chạm, bốn bước kiểm chứng.</h2>
          <p className="ab-section-lead" data-reveal>Theo chân một lệnh mở khóa từ điện thoại đến chốt cửa, rồi quay lại màn hình của bạn.</p>
          <RemoteFlow />
        </div>
      </section>

      <section id="hardware" className="ab-section" aria-labelledby="tech-hw-title">
        <div className="ab-container">
          <p className="ab-eyebrow" data-reveal>Phần cứng</p>
          <h2 id="tech-hw-title" className="ab-section-title" data-reveal>Mỗi bộ phận là một ô trong Nhà của bạn.</h2>
          <div className="ab-tile-grid">
            {HARDWARE_TILES.map(({ icon: Icon, name, status, detail, tint, on }, index) => (
              <article key={name} className={`ab-tile ${on ? 'is-on' : ''}`} data-tint={tint} data-reveal style={{ '--i': index % 4 } as CSSProperties}>
                <span className="ab-tile-icon"><Icon size={22} strokeWidth={1.9} aria-hidden /></span>
                <span className="ab-tile-name">{name}</span>
                <span className="ab-tile-status">{status}</span>
                <p className="ab-tile-detail">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ab-dark-band" aria-label="Con số phần cứng">
        <div className="ab-container">
          <p className="ab-eyebrow" data-reveal>Thiết kế cho chặng cuối</p>
          <h2 className="ab-section-title" data-reveal>Nhỏ trong từng con số. Lớn trong sự an tâm.</h2>
          <dl className="ab-facts" data-reveal>
            {HARDWARE_FACTS.map((fact) => (
              <div key={fact.label}><dt>{fact.value}</dt><dd>{fact.label}</dd></div>
            ))}
          </dl>
        </div>
      </section>

      <section id="security" className="ab-section" aria-labelledby="tech-sec-title">
        <div className="ab-container">
          <p className="ab-eyebrow" data-reveal>Bảo mật</p>
          <h2 id="tech-sec-title" className="ab-section-title" data-reveal>Riêng tư từ thiết kế.</h2>
          <div className="ab-grid-3 ab-mt">
            {SECURITY.map(({ icon: Icon, tint, title, body }, index) => (
              <article key={title} className="ab-card" data-tint={tint} data-reveal style={{ '--i': index % 3 } as CSSProperties}>
                <span className="ab-feature-icon"><Icon size={20} aria-hidden /></span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="specs" className="ab-section ab-section-alt" aria-labelledby="tech-spec-title">
        <div className="ab-container">
          <p className="ab-eyebrow" data-reveal>Thông số kỹ thuật</p>
          <h2 id="tech-spec-title" className="ab-section-title" data-reveal>Anchor Box Base.</h2>
          <dl className="ab-specs" data-reveal>
            {SPECS.map(({ label, values }) => (
              <div key={label}><dt>{label}</dt><dd>{values.map((value) => <span key={value}>{value}</span>)}</dd></div>
            ))}
          </dl>
          <p className="ab-footnote">Bản Pro và Solar Max đang trong giai đoạn nâng cấp; thông số sẽ được công bố khi mở bán.</p>
        </div>
      </section>

      <section className="ab-section" style={{ paddingTop: 0 }}>
        <CtaBand
          title="Chọn Anchor Box cho ngôi nhà của bạn."
          body="Xem giá, tồn kho và cấu hình của các phiên bản đang bán."
          primary={{ to: '/products', label: 'Xem sản phẩm' }}
          secondary={{ to: '/compare', label: 'So sánh phiên bản' }}
        />
      </section>
    </InfoPage>
  );
}

function FragmentNode({ children, last }: { children: ReactNode; last: boolean }) {
  return <>{children}{!last && <span className="ab-arch-link" aria-hidden="true" />}</>;
}
