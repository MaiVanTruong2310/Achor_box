import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleSlash,
  ClipboardList,
  Cpu,
  ImagePlus,
  Package,
  PhoneCall,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCog,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useShop } from '../ShopContext';
import { customer, warrantyEligible, type PublicWarranty, type WarrantyRecord } from '../api/customer';
import { ApiError } from '../api/shop';
import { useCatalog } from '../CatalogContext';
import { useResource, ResourceState, ErrorNotice } from '../components/ShopUi';
import { displayDate as date, warrantyState } from '../components/commercePresentation';
import { OrderNavigation } from '../components/OrderNavigation';
import { EventTimeline, CommerceStatus, EmptyState } from '../components/CommerceUi';
import { consultationPhone } from '../contact';
import { CtaBand, InfoPage, PageHero, SubNav } from './info/InfoChrome';

const ISSUE_CATEGORIES = ['Khóa / cửa hộp', 'Cảm biến cân', 'Nguồn điện', 'Wi-Fi & ứng dụng', 'Bàn phím / màn hình', 'Khác'];
const DESCRIPTION_MAX = 4800;
const MAX_IMAGES = 5;

const SECTIONS = [
  { id: 'lookup', label: 'Tra cứu' },
  { id: 'mine', label: 'Thiết bị của tôi' },
  { id: 'coverage', label: 'Phạm vi' },
  { id: 'process', label: 'Quy trình' },
  { id: 'warranty-faq', label: 'Hỏi đáp' },
];

const COVERED = [
  { title: 'Bo mạch điều khiển', body: 'ESP32-S3, mạch nguồn và mạch điều khiển khóa.' },
  { title: 'Khóa kép', body: 'Chốt điện 12 V và servo gài chốt.' },
  { title: 'Cảm biến', body: 'Loadcell + HX711 và công tắc từ báo cửa.' },
  { title: 'Bàn phím, màn hình, đèn và còi', body: 'Các bộ phận giao tiếp ngay trên hộp.' },
];

const NOT_COVERED = [
  { title: 'Hư hại do va đập hoặc ngoại lực', body: 'Cạy phá, móp vỏ, gãy bản lề do tác động bên ngoài.' },
  { title: 'Tự ý tháo lắp, sửa mạch hoặc nạp firmware khác', body: 'Mọi can thiệp ngoài kỹ thuật viên Anchor Box.' },
  { title: 'Sự cố mạng hoặc điện của gia đình', body: 'Mất điện, Wi-Fi yếu hoặc đổi mật khẩu Wi-Fi không phải lỗi thiết bị.' },
  { title: 'Ngập nước, thiên tai, hao mòn bề mặt', body: 'Trầy xước sơn và hao mòn theo thời gian sử dụng.' },
];

const PROCESS: { icon: LucideIcon; tint: string; title: string; body: string; status: string }[] = [
  { icon: ClipboardList, tint: 'blue', title: 'Gửi yêu cầu', body: 'Chọn thiết bị, mô tả sự cố và đính kèm ảnh nếu có.', status: 'Đã tiếp nhận' },
  { icon: UserCog, tint: 'indigo', title: 'Phân công', body: 'Yêu cầu được giao cho kỹ thuật viên phụ trách khu vực của bạn.', status: 'Đã phân công' },
  { icon: Wrench, tint: 'orange', title: 'Kiểm tra và sửa', body: 'Kỹ thuật viên xem lịch sử thiết bị, liên hệ bạn và xử lý tại nhà khi cần.', status: 'Đang xử lý' },
  { icon: BadgeCheck, tint: 'green', title: 'Kết quả', body: 'Bạn nhận kết quả trong tài khoản. Nếu bị từ chối, lý do được ghi rõ.', status: 'Đã xử lý' },
];

const FAQ = [
  { q: 'Bảo hành bắt đầu khi nào?', a: 'Phiếu bảo hành điện tử được tạo tự động khi nghiệm thu lắp đặt được xác nhận. Ngày bắt đầu là ngày nghiệm thu, thời hạn theo phiên bản bạn mua và được ghi trên phiếu.' },
  { q: 'Số serial nằm ở đâu?', a: 'Serial có dạng DBX-… và được in trên tem kèm mã QR ở thân hộp. Bạn cũng xem được serial trong ứng dụng Anchor Box và trong chi tiết đơn hàng.' },
  { q: 'Mất điện thì hộp có hỏng không?', a: 'Không. Bản Base dùng adapter DC và không có pin dự phòng, nên khi mất điện hộp tạm ngừng hoạt động và chạy lại khi có điện. Đây không phải lỗi thuộc bảo hành.' },
  { q: 'Tôi có cần gửi ảnh không?', a: 'Không bắt buộc, nhưng ảnh giúp kỹ thuật viên chẩn đoán nhanh hơn. Tối đa 5 ảnh JPG hoặc PNG, mỗi ảnh dưới 5 MB.' },
  { q: 'Bán nhà thì phiếu bảo hành có chuyển được không?', a: 'Phiếu gắn với thiết bị và tài khoản đã mua. Hãy liên hệ hỗ trợ để được hướng dẫn chuyển quyền quản lý thiết bị.' },
];

const vietnamToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const normalizeSerial = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '');
const SERIAL_PATTERN = /^[A-Z0-9][A-Z0-9-]{3,63}$/;
const dayNumber = (value: string) => Date.parse(`${value.slice(0, 10)}T00:00:00Z`) / 86_400_000;

function usage(record: WarrantyRecord, today: string) {
  const start = dayNumber(record.startDate);
  const end = dayNumber(record.endDate);
  const now = dayNumber(today);
  if (![start, end, now].every(Number.isFinite)) return { used: 0, remaining: 0 };
  const span = Math.max(1, end - start);
  return { used: Math.min(1, Math.max(0, (now - start) / span)), remaining: Math.max(0, Math.round(end - now)) };
}

type Lookup =
  | { kind: 'missing' | 'invalid' }
  | { kind: 'owned'; record: WarrantyRecord }
  | { kind: 'public'; result: PublicWarranty };

async function findWarranty(serial: string, asCustomer: boolean, signal: AbortSignal): Promise<Lookup> {
  if (asCustomer) {
    const own = await customer.warrantyBySerial(serial, signal);
    if (own) return { kind: 'owned', record: own };
  }
  try {
    return { kind: 'public', result: await customer.publicWarranty(serial, signal) };
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 404) return { kind: 'missing' };
    if (reason instanceof ApiError && reason.status === 400) return { kind: 'invalid' };
    if (reason instanceof ApiError && reason.status === 429) throw new Error('Bạn tra cứu hơi nhanh. Vui lòng thử lại sau một phút.');
    throw reason;
  }
}

const CLAIM_ERRORS: Record<string, string> = {
  CLAIM_ALREADY_OPEN: 'Thiết bị này đang có một yêu cầu bảo hành chưa xử lý xong. Vui lòng theo dõi yêu cầu đó trong mục “Yêu cầu đã gửi”.',
  WARRANTY_NOT_ACTIVE: 'Thiết bị đã hết hạn hoặc chưa kích hoạt bảo hành.',
  IMAGE_ALREADY_ATTACHED: 'Ảnh đã được dùng cho một yêu cầu khác. Vui lòng tải ảnh mới.',
  IDEMPOTENCY_KEY_REUSED: 'Nội dung yêu cầu đã thay đổi so với lần gửi trước. Vui lòng gửi lại.',
  INVALID_CLAIM: 'Thông tin yêu cầu chưa hợp lệ (mô tả từ 10 ký tự, tối đa 5 ảnh).',
};

export function Warranty({ claim = false }: { claim?: boolean }) {
  const { user } = useShop();
  const [params, setParams] = useSearchParams();
  const isCustomer = user?.role === 'customer';
  const today = vietnamToday();

  const [serialInput, setSerialInput] = useState(() => params.get('serial') ?? '');
  const [submitted, setSubmitted] = useState(() => {
    const initial = normalizeSerial(params.get('serial') ?? '');
    return SERIAL_PATTERN.test(initial) ? initial : '';
  });
  const [inputError, setInputError] = useState('');
  const [sheet, setSheet] = useState<{ warrantyId: string } | null>(() => (claim ? { warrantyId: params.get('warrantyId') ?? '' } : null));

  const warranties = useResource(async (signal) => (isCustomer ? customer.warranties(0, signal) : null), `${user?.userId}:${isCustomer}:warranties`);
  const claims = useResource(async (signal) => (isCustomer ? customer.claims(0, signal) : null), `${user?.userId}:${isCustomer}:claims`);
  const records = warranties.data?.content ?? [];
  const eligible = records.filter(warrantyEligible);

  useEffect(() => {
    if (claim) setSheet((current) => current ?? { warrantyId: params.get('warrantyId') ?? '' });
  }, [claim, params]);

  const lookup = useResource(async (signal) => (submitted ? findWarranty(submitted, isCustomer, signal) : null), `${user?.userId}:${isCustomer}:lookup:${submitted}`);

  function handleLookup(event: FormEvent) {
    event.preventDefault();
    const value = normalizeSerial(serialInput);
    if (!value) {
      setInputError('Nhập số serial in trên tem của hộp, ví dụ DBX-98C377AD9D60.');
      setSubmitted('');
      return;
    }
    if (!SERIAL_PATTERN.test(value)) {
      setInputError('Serial chỉ gồm chữ, số và dấu gạch ngang, ví dụ DBX-98C377AD9D60.');
      setSubmitted('');
      return;
    }
    setInputError('');
    setSubmitted(value);
    const next = new URLSearchParams(params);
    next.set('serial', value);
    setParams(next, { replace: true });
  }

  const loginHref = `/login?returnTo=${encodeURIComponent(`/warranty${submitted ? `?serial=${submitted}` : ''}`)}`;
  const refreshing = warranties.loading || claims.loading;

  return (
    <InfoPage>
      <SubNav
        title="Bảo hành"
        links={SECTIONS}
        action={isCustomer && eligible.length > 0
          ? <button type="button" className="ab-btn ab-btn-primary ab-btn-xs" onClick={() => setSheet({ warrantyId: eligible[0].id })}>Yêu cầu hỗ trợ</button>
          : <a href={consultationPhone.href} className="ab-btn ab-btn-secondary ab-btn-xs">Gọi hỗ trợ</a>}
      />

      <PageHero
        crumb="Bảo hành"
        eyebrow="Bảo hành Anchor Box"
        title={<>Yên tâm cho<br /><span className="ab-gradient-text">mỗi lần nhận hàng.</span></>}
        lead="Phiếu bảo hành điện tử được tạo ngay khi nghiệm thu lắp đặt. Tra cứu thời hạn, gửi yêu cầu và theo dõi kết quả ở cùng một nơi."
      >
        <div id="lookup" className="ab-lookup" data-reveal>
          <form onSubmit={handleLookup} role="search" aria-label="Tra cứu bảo hành theo serial">
            <label className="ab-lookup-field">
              <Search size={18} aria-hidden />
              <span className="sr-only">Số serial thiết bị</span>
              <input
                value={serialInput}
                onChange={(event) => setSerialInput(event.target.value)}
                placeholder="Nhập số serial, ví dụ DBX-98C377AD9D60"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={!!inputError}
                aria-describedby="lookup-hint"
              />
            </label>
            <button type="submit" className="ab-btn ab-btn-primary">Kiểm tra</button>
          </form>
          <p id="lookup-hint" className="ab-lookup-hint">Serial in trên tem QR ở thân hộp và trong ứng dụng Anchor Box.</p>
        </div>

        {inputError ? <Alert>{inputError}</Alert> : submitted && (
          lookup.loading ? <Alert tint="blue">Đang tra cứu serial {submitted}…</Alert>
            : lookup.error ? <Alert tint="red">{lookup.error.message} <button type="button" className="ab-btn-link" onClick={lookup.retry}>Thử lại</button></Alert>
            : lookup.data && (
              <LookupResult
                lookup={lookup.data}
                submitted={submitted}
                today={today}
                signedIn={!!user}
                loginHref={loginHref}
                onClaim={(record) => setSheet({ warrantyId: record.id })}
              />
            )
        )}
      </PageHero>

      <section id="mine" className="ab-section ab-section-alt" aria-labelledby="w-mine-title">
        <div className="ab-container">
          <div className="ab-hub-head">
            <div>
              <p className="ab-eyebrow" data-reveal>Thiết bị của tôi</p>
              <h2 id="w-mine-title" className="ab-section-title" data-reveal>Mọi phiếu bảo hành, một chỗ.</h2>
            </div>
            {isCustomer && (
              <div className="ab-cta-actions">
                <button type="button" className="ab-icon-btn" onClick={() => { warranties.retry(); claims.retry(); }} disabled={refreshing} aria-label="Tải lại dữ liệu bảo hành">
                  <RefreshCw size={18} className={refreshing ? 'ab-spin' : undefined} aria-hidden />
                </button>
                <button type="button" className="ab-btn ab-btn-primary ab-btn-sm" disabled={eligible.length === 0} onClick={() => setSheet({ warrantyId: eligible[0]?.id ?? '' })}>
                  <Wrench size={16} aria-hidden /> Yêu cầu hỗ trợ
                </button>
              </div>
            )}
          </div>

          {!user && (
            <div className="ab-empty ab-mt" data-reveal>
              <h3>Đăng nhập để xem thiết bị của bạn.</h3>
              <p>Phiếu bảo hành và lịch sử yêu cầu hỗ trợ gắn với tài khoản đã đặt mua Anchor Box.</p>
              <Link to={loginHref} className="ab-btn ab-btn-primary ab-btn-sm">Đăng nhập</Link>
            </div>
          )}

          {user && !isCustomer && (
            <div className="ab-empty ab-mt">
              <h3>Đây là khu vực dành cho khách hàng.</h3>
              <p>Tài khoản nhân viên tra cứu bảo hành trong trang quản trị.</p>
            </div>
          )}

          {isCustomer && (
            <>
              <div className="ab-mt"><ResourceState {...warranties} /></div>
              {!warranties.loading && !warranties.error && records.length === 0 && (
                <div className="ab-empty">
                  <h3>Chưa có phiếu bảo hành.</h3>
                  <p>Phiếu sẽ tự xuất hiện ở đây sau khi thiết bị được lắp đặt và nghiệm thu.</p>
                  <Link to="/account/orders" className="ab-btn ab-btn-secondary ab-btn-sm">Xem đơn hàng</Link>
                </div>
              )}
              {records.length > 0 && (
                <div className="ab-grid-3">
                  {records.map((record, index) => (
                    <DeviceCard key={record.id} record={record} today={today} index={index} onClaim={() => setSheet({ warrantyId: record.id })} />
                  ))}
                </div>
              )}

              <h3 className="ab-section-title" style={{ fontSize: 'clamp(24px, 3vw, 32px)', marginTop: 64 }}>
                Yêu cầu đã gửi{claims.data ? ` (${claims.data.totalElements})` : ''}.
              </h3>
              <ResourceState {...claims} />
              {claims.data && claims.data.content.length > 0 ? (
                <ul className="ab-claims">
                  {claims.data.content.map((item) => (
                    <li key={item.id}>
                      <div>
                        <small>Serial {item.serialNumber} · Gửi {date(item.createdAt)}{item.resolvedAt ? ` · Xử lý ${date(item.resolvedAt)}` : ''}</small>
                        <p>{item.description}</p>
                        {item.status === 'rejected' && item.rejectionReason && (
                          <p style={{ margin: '6px 0 4px', padding: '8px 12px', borderRadius: 8, background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.25)', color: '#b91c1c', fontSize: 13 }}>
                            <strong>Lý do từ chối:</strong> {item.rejectionReason}
                          </p>
                        )}
                        <small>Mã yêu cầu {item.id}</small>
                      </div>
                      <CommerceStatus value={item.status} />
                      {item.images?.length > 0 && (
                        <div className="ab-claim-images">
                          {item.images.map((src, imageIndex) => (
                            <a key={src} href={src} target="_blank" rel="noopener noreferrer"><img src={src} alt={`Ảnh sự cố ${imageIndex + 1}`} loading="lazy" /></a>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                !claims.loading && !claims.error && <p className="ab-footnote">Bạn chưa gửi yêu cầu hỗ trợ nào.</p>
              )}
            </>
          )}
        </div>
      </section>

      <section id="coverage" className="ab-section" aria-labelledby="w-cov-title">
        <div className="ab-container">
          <p className="ab-eyebrow" data-reveal>Phạm vi bảo hành</p>
          <h2 id="w-cov-title" className="ab-section-title" data-reveal>Rõ ràng điều gì được bảo hành.</h2>
          <div className="ab-grid-2 ab-mt">
            <article className="ab-card ab-card-lg" data-tint="green" data-reveal>
              <span className="ab-feature-icon"><ShieldCheck size={20} aria-hidden /></span>
              <h3>Được bảo hành khi lỗi do sản xuất</h3>
              <ul className="ab-checklist" style={{ marginTop: 18 }}>
                {COVERED.map(({ title, body }) => <li key={title}><Check size={20} aria-hidden /><span><strong>{title}</strong>{body}</span></li>)}
              </ul>
            </article>
            <article className="ab-card ab-card-lg" data-tint="red" data-reveal style={{ '--i': 1 } as CSSProperties}>
              <span className="ab-feature-icon"><CircleSlash size={20} aria-hidden /></span>
              <h3>Không thuộc bảo hành miễn phí</h3>
              <ul className="ab-checklist is-muted" style={{ marginTop: 18 }}>
                {NOT_COVERED.map(({ title, body }) => <li key={title}><CircleSlash size={18} aria-hidden /><span><strong>{title}</strong>{body}</span></li>)}
              </ul>
            </article>
          </div>
          <WarrantyTerms />
        </div>
      </section>

      <section id="process" className="ab-section ab-section-alt" aria-labelledby="w-proc-title">
        <div className="ab-container">
          <p className="ab-eyebrow" data-reveal>Quy trình</p>
          <h2 id="w-proc-title" className="ab-section-title" data-reveal>Từ lúc gửi đến lúc xong.</h2>
          <p className="ab-section-lead" data-reveal>Nhãn trạng thái bên dưới là đúng nhãn bạn thấy trong danh sách yêu cầu.</p>
          <div className="ab-grid-4 ab-mt">
            {PROCESS.map(({ icon: Icon, tint, title, body, status }, index) => (
              <article key={title} className="ab-card" data-tint={tint} data-reveal style={{ '--i': index } as CSSProperties}>
                <span className="ab-feature-icon"><Icon size={20} aria-hidden /></span>
                <span className="ab-install-index">Bước {index + 1}</span>
                <h3>{title}</h3>
                <p>{body}</p>
                <p><span className="ab-chip" data-tint={tint}>{status}</span></p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="warranty-faq" className="ab-section ab-faq" aria-labelledby="w-faq-title">
        <div className="ab-container ab-container-narrow">
          <h2 id="w-faq-title" className="ab-section-title" data-reveal>Câu hỏi về bảo hành.</h2>
          <div className="ab-faq-list">
            {FAQ.map(({ q, a }) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>

      <section className="ab-section" style={{ paddingTop: 0 }}>
        <CtaBand
          title={`Cần hỗ trợ ngay? Gọi ${consultationPhone.display}.`}
          body="Hoặc gửi yêu cầu tư vấn, chúng tôi sẽ gọi lại cho bạn."
          primary={{ to: '/contact', label: 'Liên hệ hỗ trợ' }}
          secondary={{ to: '/how-it-works', label: 'Quy trình lắp đặt' }}
        />
      </section>

      {sheet && isCustomer && (
        <ClaimSheet
          eligible={eligible}
          loading={warranties.loading}
          initialWarrantyId={sheet.warrantyId}
          onClose={() => setSheet(null)}
          onSubmitted={claims.retry}
        />
      )}
    </InfoPage>
  );
}

function WarrantyTerms() {
  const catalog = useCatalog();
  const terms = (catalog.data ?? [])
    .filter((product) => product.isActive)
    .map((product) => ({
      id: product.id,
      name: product.name,
      months: [...new Set((product.variants ?? []).filter((variant) => variant.isActive && (variant.warrantyMonths ?? 0) > 0).map((variant) => variant.warrantyMonths as number))].sort((a, b) => a - b),
    }))
    .filter((term) => term.months.length > 0);

  if (!terms.length) return <p className="ab-footnote">Thời hạn bảo hành của từng phiên bản được ghi trên trang sản phẩm và trên phiếu bảo hành điện tử của bạn.</p>;
  return (
    <dl className="ab-specs" data-reveal>
      {terms.map(({ id, name, months }) => (
        <div key={id}>
          <dt><Link to={`/products/${id}`} className="ab-btn-link" style={{ fontSize: 'inherit', fontWeight: 650 }}>{name}</Link></dt>
          <dd><span>Bảo hành {months.join(' hoặc ')} tháng kể từ ngày nghiệm thu{months.length > 1 ? ', tùy dung tích' : ''}.</span></dd>
        </div>
      ))}
    </dl>
  );
}

function LookupResult({ lookup, submitted, today, signedIn, loginHref, onClaim }: {
  lookup: Lookup;
  submitted: string;
  today: string;
  signedIn: boolean;
  loginHref: string;
  onClaim: (record: WarrantyRecord) => void;
}) {
  switch (lookup.kind) {
    case 'invalid':
      return <Alert>Serial chỉ gồm chữ, số và dấu gạch ngang, ví dụ DBX-98C377AD9D60.</Alert>;
    case 'missing':
      return <Alert>Không tìm thấy phiếu bảo hành cho serial {submitted}. Kiểm tra lại tem trên hộp, hoặc thiết bị có thể chưa được nghiệm thu.</Alert>;
    case 'owned':
      return <Certificate record={lookup.record} today={today} onClaim={onClaim} />;
    case 'public':
      return <PublicCertificate result={lookup.result} signedIn={signedIn} loginHref={loginHref} />;
  }
}

function PublicCertificate({ result, signedIn, loginHref }: { result: PublicWarranty; signedIn: boolean; loginHref: string }) {
  const span = result.startDate && result.endDate ? Math.max(1, dayNumber(result.endDate) - dayNumber(result.startDate)) : 1;
  const used = result.valid ? Math.min(1, Math.max(0, 1 - (result.remainingDays ?? 0) / span)) : 1;
  return (
    <article className="ab-cert" data-tint={result.valid ? 'green' : 'red'} style={{ '--used': used } as CSSProperties} aria-label={`Bảo hành ${result.serialNumber}`}>
      <div className="ab-cert-top">
        <div>
          <small>{result.productName || 'Anchor Box'}</small>
          <span className="ab-cert-serial">{result.serialNumber}</span>
        </div>
        <span className="ab-chip" data-tint={result.valid ? 'green' : 'red'}>{result.valid ? 'Còn hiệu lực' : 'Hết hiệu lực'}</span>
      </div>
      <div className="ab-cert-meter" aria-hidden="true"><span /></div>
      <div className="ab-cert-meter-label">
        <span>{date(result.startDate, true)}</span>
        <span>{result.valid ? `Còn ${result.remainingDays ?? 0} ngày` : 'Hết hiệu lực'}</span>
        <span>{date(result.endDate, true)}</span>
      </div>
      <p className="ab-footnote">
        {signedIn
          ? 'Thiết bị này không thuộc tài khoản của bạn, nên chỉ hiển thị thời hạn bảo hành.'
          : 'Để bảo vệ chủ sở hữu, tra cứu công khai chỉ hiển thị thời hạn. Chủ thiết bị đăng nhập để xem chi tiết và gửi yêu cầu hỗ trợ.'}
      </p>
      <div className="ab-cert-actions">
        {!signedIn && <Link to={loginHref} className="ab-btn ab-btn-primary ab-btn-sm">Đăng nhập</Link>}
        <a href={consultationPhone.href} className="ab-btn-link"><PhoneCall size={16} aria-hidden /> {consultationPhone.display}</a>
      </div>
    </article>
  );
}

function Alert({ children, tint = 'orange' }: { children: ReactNode; tint?: string }) {
  return <div className="ab-alert" data-tint={tint} role="status"><AlertTriangle size={18} aria-hidden /><span>{children}</span></div>;
}

function Certificate({ record, today, onClaim }: { record: WarrantyRecord; today: string; onClaim: (record: WarrantyRecord) => void }) {
  const valid = warrantyEligible(record);
  const { used, remaining } = usage(record, today);
  return (
    <article className="ab-cert" data-tint={valid ? 'green' : 'red'} style={{ '--used': used } as CSSProperties} aria-label={`Phiếu bảo hành ${record.serialNumber}`}>
      <div className="ab-cert-top">
        <div>
          <small>Phiếu bảo hành điện tử · Anchor Box</small>
          <span className="ab-cert-serial">{record.serialNumber}</span>
        </div>
        <span className="ab-chip" data-tint={valid ? 'green' : 'red'}>{warrantyState(record, today)}</span>
      </div>
      <div className="ab-cert-meter" aria-hidden="true"><span /></div>
      <div className="ab-cert-meter-label">
        <span>{date(record.startDate, true)}</span>
        <span>{valid ? `Còn ${remaining} ngày` : 'Hết hiệu lực'}</span>
        <span>{date(record.endDate, true)}</span>
      </div>
      <dl className="ab-cert-grid">
        <div><dt>Thời hạn</dt><dd>{record.durationMonths} tháng</dd></div>
        <div><dt>Nghiệm thu</dt><dd>{date(record.acceptedAt, true)}</dd></div>
        <div><dt>Đơn hàng</dt><dd>{record.orderId ? `#${record.orderId.slice(0, 8)}` : '—'}</dd></div>
      </dl>
      <div className="ab-cert-actions">
        {valid && <button type="button" className="ab-btn ab-btn-primary ab-btn-sm" onClick={() => onClaim(record)}><Wrench size={16} aria-hidden /> Yêu cầu hỗ trợ</button>}
        {record.orderId && <Link to={`/account/orders/${record.orderId}`} className="ab-btn-link">Xem đơn hàng <ChevronRight size={16} aria-hidden /></Link>}
        <a href={consultationPhone.href} className="ab-btn-link"><PhoneCall size={16} aria-hidden /> {consultationPhone.display}</a>
      </div>
    </article>
  );
}

function DeviceCard({ record, today, index, onClaim }: { record: WarrantyRecord; today: string; index: number; onClaim: () => void }) {
  const valid = warrantyEligible(record);
  const { remaining } = usage(record, today);
  return (
    <article className="ab-card ab-device-card" data-tint={valid ? 'green' : 'red'} data-reveal style={{ '--i': index % 3 } as CSSProperties}>
      <span className="ab-feature-icon"><Cpu size={20} aria-hidden /></span>
      <small className="ab-timeline-step" style={{ marginTop: 14 }}>Serial thiết bị</small>
      <span className="ab-cert-serial">{record.serialNumber}</span>
      <span><span className="ab-chip" data-tint={valid ? 'green' : 'red'}>{warrantyState(record, today)}</span></span>
      <dl>
        <div><dt>Bắt đầu</dt><dd>{date(record.startDate, true)}</dd></div>
        <div><dt>Hết hạn</dt><dd>{date(record.endDate, true)}</dd></div>
        <div><dt>Còn lại</dt><dd>{valid ? `${remaining} ngày` : '—'}</dd></div>
      </dl>
      <div className="ab-device-actions">
        {record.orderId ? <Link to={`/account/orders/${record.orderId}`} className="ab-btn-link">Đơn hàng <ChevronRight size={16} aria-hidden /></Link> : <span />}
        {valid && <button type="button" className="ab-btn ab-btn-secondary ab-btn-xs" onClick={onClaim}>Yêu cầu hỗ trợ</button>}
      </div>
    </article>
  );
}

function discardImages(warrantyId: string, images: { id: string }[]) {
  if (!warrantyId || !images.length) return;
  void Promise.allSettled(images.map((image) => customer.deleteImage(warrantyId, image.id)));
}

function ClaimSheet({ eligible, loading, initialWarrantyId, onClose, onSubmitted }: {
  eligible: WarrantyRecord[];
  loading: boolean;
  initialWarrantyId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [warrantyId, setWarrantyId] = useState(initialWarrantyId);
  const [category, setCategory] = useState(ISSUE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<{ id: string; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error>();
  const [notice, setNotice] = useState('');
  const [doneId, setDoneId] = useState('');
  const keyRef = useRef('');
  const lockedRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const pendingRef = useRef({ warrantyId, images, done: false });
  pendingRef.current = { warrantyId, images, done: !!doneId };

  useEffect(() => {
    if (!eligible.some((item) => item.id === warrantyId) && eligible.length > 0) setWarrantyId(eligible[0].id);
  }, [eligible, warrantyId]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !lockedRef.current) closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      const pending = pendingRef.current;
      if (!pending.done) discardImages(pending.warrantyId, pending.images);
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, []);

  const resetKey = () => { keyRef.current = ''; };
  const trimmed = description.trim();
  const canSubmit = !busy && !!warrantyId && trimmed.length >= 10;

  function changeWarranty(next: string) {
    if (next === warrantyId) return;
    if (images.length) setNotice('Ảnh đã tải được gắn với thiết bị trước nên đã được bỏ. Vui lòng tải lại ảnh cho thiết bị mới.');
    discardImages(warrantyId, images);
    setImages([]);
    setWarrantyId(next);
    resetKey();
  }

  async function upload(files: FileList | null) {
    if (!files?.length || lockedRef.current) return;
    setError(undefined);
    setNotice('');
    const selected = Array.from(files);
    if (selected.length + images.length > MAX_IMAGES) return setError(new Error(`Tối đa ${MAX_IMAGES} ảnh cho mỗi yêu cầu.`));
    if (selected.some((file) => !['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024)) return setError(new Error('Chỉ nhận ảnh JPG hoặc PNG, mỗi ảnh dưới 5 MB.'));
    if (!eligible.some((item) => item.id === warrantyId)) return setError(new Error('Chọn thiết bị còn hạn bảo hành trước khi tải ảnh.'));

    lockedRef.current = true;
    setBusy(true);
    const target = warrantyId;
    try {
      for (const file of selected) {
        const uploaded = await customer.uploadImage(target, file);
        setImages((previous) => [...previous, uploaded]);
      }
      resetKey();
    } catch (reason) {
      setError(reason as Error);
    } finally {
      lockedRef.current = false;
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lockedRef.current) return;
    setError(undefined);
    if (!eligible.some((item) => item.id === warrantyId)) return setError(new Error('Chọn thiết bị còn hạn bảo hành.'));
    if (trimmed.length < 10) return setError(new Error('Mô tả sự cố cần ít nhất 10 ký tự.'));
    if (trimmed.length > DESCRIPTION_MAX) return setError(new Error(`Mô tả không quá ${DESCRIPTION_MAX} ký tự.`));

    lockedRef.current = true;
    setBusy(true);
    if (!keyRef.current) keyRef.current = crypto.randomUUID();
    try {
      const created = await customer.createClaim(warrantyId, `[${category}] ${trimmed}`, images.map((image) => image.id), keyRef.current);
      setDoneId(created.id);
      keyRef.current = '';
      onSubmitted();
    } catch (reason) {
      const code = (reason as Error).message || '';
      const friendly = CLAIM_ERRORS[code.split(':')[0].trim()];
      setError(friendly ? new Error(friendly) : (reason as Error));
    } finally {
      lockedRef.current = false;
      setBusy(false);
    }
  }

  return createPortal(
    <div className="ab-landing ab-info ab-sheet-root"><div className="ab-sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div className="ab-sheet" role="dialog" aria-modal="true" aria-labelledby="claim-title" tabIndex={-1} ref={dialogRef}>
        <button type="button" className="ab-sheet-close" onClick={onClose} disabled={busy} aria-label="Đóng"><X size={18} aria-hidden /></button>

        {doneId ? (
          <div className="ab-success">
            <CheckCircle2 size={48} aria-hidden />
            <h2 id="claim-title">Đã gửi yêu cầu.</h2>
            <p>Mã yêu cầu {doneId}. Bạn theo dõi trạng thái trong mục “Yêu cầu đã gửi”.</p>
            <button type="button" className="ab-btn ab-btn-primary ab-btn-sm" onClick={onClose} style={{ marginTop: 12 }}>Xong</button>
          </div>
        ) : (
          <>
            <h2 id="claim-title">Yêu cầu hỗ trợ bảo hành</h2>
            <p>Mô tả càng rõ, kỹ thuật viên xử lý càng nhanh.</p>

            {loading ? (
              <p className="ab-footnote">Đang tải danh sách thiết bị…</p>
            ) : eligible.length === 0 ? (
              <div className="ab-empty" style={{ marginTop: 22 }}>
                <h3>Không có thiết bị còn hạn.</h3>
                <p>Bạn vẫn có thể gọi {consultationPhone.display} để được hỗ trợ sửa chữa có tính phí.</p>
                <a href={consultationPhone.href} className="ab-btn ab-btn-primary ab-btn-sm">Gọi hỗ trợ</a>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <ErrorNotice error={error} focus />
                {notice && <p className="notice" role="status">{notice}</p>}

                <label className="ab-field">
                  <span>Thiết bị</span>
                  <select value={warrantyId} onChange={(event) => changeWarranty(event.target.value)} disabled={busy}>
                    {eligible.map((item) => <option key={item.id} value={item.id}>{item.serialNumber} · hạn đến {date(item.endDate, true)}</option>)}
                  </select>
                </label>

                <div className="ab-field" role="group" aria-labelledby="claim-category">
                  <span id="claim-category">Vấn đề gặp phải</span>
                  <div className="ab-segment">
                    {ISSUE_CATEGORIES.map((item) => (
                      <button key={item} type="button" aria-pressed={category === item} onClick={() => { setCategory(item); resetKey(); }} disabled={busy}>{item}</button>
                    ))}
                  </div>
                </div>

                <label className="ab-field">
                  <span>Mô tả sự cố</span>
                  <textarea
                    value={description}
                    onChange={(event) => { setDescription(event.target.value); resetKey(); }}
                    maxLength={DESCRIPTION_MAX}
                    placeholder="Ví dụ: Cửa đóng nhưng hộp không tự khóa, màn hình báo DA DONG CUA nhưng ứng dụng vẫn hiện đang mở."
                    disabled={busy}
                  />
                  <small>{trimmed.length < 10 ? `Cần thêm ${10 - trimmed.length} ký tự` : `${description.length}/${DESCRIPTION_MAX}`}</small>
                </label>

                <div className="ab-field">
                  <span>Ảnh sự cố (không bắt buộc)</span>
                  <label className="ab-upload" aria-disabled={busy || images.length >= MAX_IMAGES}>
                    <ImagePlus size={26} aria-hidden />
                    <strong>{busy ? 'Đang tải ảnh…' : 'Chọn ảnh'}</strong>
                    <span>JPG hoặc PNG, tối đa {MAX_IMAGES} ảnh, mỗi ảnh dưới 5 MB · {images.length}/{MAX_IMAGES}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      multiple
                      hidden
                      disabled={busy || images.length >= MAX_IMAGES}
                      onChange={(event) => { void upload(event.target.files); event.target.value = ''; }}
                    />
                  </label>
                  {images.length > 0 && (
                    <div className="ab-thumbs">
                      {images.map((image, index) => (
                        <div key={image.id}>
                          <img src={image.url} alt={`Ảnh sự cố ${index + 1}`} />
                          <button type="button" onClick={() => { discardImages(warrantyId, [image]); setImages((previous) => previous.filter((item) => item.id !== image.id)); resetKey(); }} disabled={busy} aria-label={`Bỏ ảnh ${index + 1}`}><X size={12} aria-hidden /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="ab-sheet-actions">
                  <button type="button" className="ab-btn ab-btn-secondary" onClick={onClose} disabled={busy}>Hủy</button>
                  <button type="submit" className="ab-btn ab-btn-primary" disabled={!canSubmit}>{busy ? 'Đang gửi…' : 'Gửi yêu cầu'}</button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div></div>,
    document.body,
  );
}
export function InstallationTracking() {
  const { id = '' } = useParams();
  const { user } = useShop();
  const resource = useResource(signal => customer.order(id, signal), `${user?.userId}:${id}`);
  const job = resource.data?.deliveryInstallation;

  return (
    <section className="container section commerce-workspace">
      <OrderNavigation id={id} title="Giao hàng & lắp đặt" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Tiến trình giao hàng &amp; lắp đặt đơn #{id}</h2>
        <button
          type="button"
          className="button secondary"
          onClick={resource.retry}
          disabled={resource.loading}
        >
          <RefreshCw size={15} className={resource.loading ? 'rotating' : ''} />
          <span>Cập nhật tiến trình</span>
        </button>
      </div>

      <ResourceState {...resource} />

      {resource.data && (
        <div className="commerce-two-column">
          <div className="panel">
            {job ? (
              <>
                <div className="commerce-section-title">
                  <h2>
                    <CalendarDays size={21} />
                    Thông tin giao lắp
                  </h2>
                  <CommerceStatus value={job.status} />
                </div>
                <dl className="commerce-facts">
                  <div>
                    <dt>Lịch hẹn</dt>
                    <dd>{date(job.scheduledAt)}</dd>
                  </div>
                  <div>
                    <dt>Thời điểm giao hàng</dt>
                    <dd>{date(job.deliveredAt)}</dd>
                  </div>
                  <div>
                    <dt>Thời điểm lắp đặt</dt>
                    <dd>{date(job.installedAt)}</dd>
                  </div>
                  <div>
                    <dt>Nghiệm thu</dt>
                    <dd>{job.customerAccepted ? 'Đã xác nhận nghiệm thu' : 'Chưa xác nhận'}</dd>
                  </div>
                  <div>
                    <dt>Hoàn tất</dt>
                    <dd>{date(job.completedAt)}</dd>
                  </div>
                </dl>
                <h3>Thiết bị bàn giao</h3>
                {job.devices.length ? (
                  job.devices.map(device => (
                    <div className="commerce-device-row" key={device.deviceId}>
                      <Package size={19} />
                      <div>
                        <strong>{device.serialNumber}</strong>
                        <small>
                          {device.hasWeightSensor
                            ? 'Có cảm biến trọng lượng Loadcell'
                            : 'Không có cảm biến trọng lượng'}
                        </small>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">Chưa có serial thiết bị được liên kết với lần giao lắp này.</p>
                )}
                <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #eef4fb' }}>
                  <Link className="text-link" to={`/warranty`}>
                    Tra cứu phiếu bảo hành của thiết bị &rarr;
                  </Link>
                </div>
              </>
            ) : (
              <EmptyState title="Chưa có lịch giao lắp">
                Bạn sẽ thấy lịch hẹn và thông tin thiết bị tại đây khi bên bán cập nhật.
              </EmptyState>
            )}
          </div>
          <div className="panel">
            <EventTimeline title="Tiến trình đơn hàng" events={resource.data.timeline || []} />
          </div>
        </div>
      )}
    </section>
  );
}
