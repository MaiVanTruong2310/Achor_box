import { useState, useRef, type FormEvent, useEffect } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  RefreshCw,
  PhoneCall,
  Wrench,
  ChevronDown,
  X,
  FileCheck2,
  AlertTriangle,
  Upload,
  Cpu,
  ArrowRight,
  Package,
  CalendarDays
} from 'lucide-react';
import { useShop } from '../ShopContext';
import { customer, warrantyEligible, type WarrantyRecord } from '../api/customer';
import { useResource, ResourceState, ErrorNotice } from '../components/ShopUi';
import { displayDate as date, warrantyState } from '../components/commercePresentation';
import { OrderNavigation } from '../components/OrderNavigation';
import { EventTimeline, CommerceStatus, EmptyState } from '../components/CommerceUi';
import { consultationPhone } from '../contact';
import './warranty-portal.css';


const ISSUE_CATEGORIES = [
  'Khóa điện tử / Cửa tủ',
  'Cảm biến cân tải trọng',
  'Nguồn điện / Pin dự phòng',
  'Kết nối Wi-Fi & App',
  'Sự cố kỹ thuật khác'
];

export function Warranty({ claim = false }: { claim?: boolean }) {
  const { user } = useShop();
  const [params] = useSearchParams();
  const [searchSerial, setSearchSerial] = useState('');
  const [lookupResult, setLookupResult] = useState<WarrantyRecord | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [claimModalOpen, setClaimModalOpen] = useState(claim);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  // Form State
  const [selectedWarrantyId, setSelectedWarrantyId] = useState(params.get('warrantyId') || '');
  const [selectedCategory, setSelectedCategory] = useState(ISSUE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<{ id: string; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<Error>();
  const [formSuccess, setFormSuccess] = useState('');
  const keyRef = useRef('');
  const lockedRef = useRef(false);

  // Real Warranties Resource (if user logged in)
  const warranties = useResource(async signal => {
    if (!user) return null;
    return customer.warranties(0, signal);
  }, `${user?.userId}:warranties`);

  // Real Claims Resource (if user logged in)
  const claims = useResource(async signal => {
    if (!user) return null;
    return customer.claims(0, signal);
  }, `${user?.userId}:claims`);

  const eligibleWarranties = warranties.data?.content.filter(warrantyEligible) || [];
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  useEffect(() => {
    if (claim) setClaimModalOpen(true);
  }, [claim]);

  // Handle Serial Search
  function handleSearch(e?: FormEvent, presetSerial?: string) {
    if (e) e.preventDefault();
    const query = (presetSerial !== undefined ? presetSerial : searchSerial).trim().toUpperCase();
    if (!query) {
      setLookupError('Vui lòng nhập số Serial thiết bị hoặc mã phiếu bảo hành.');
      setLookupResult(null);
      return;
    }
    setLookupError('');

    // Check user's real warranties first if logged in
    const foundUserWarranty = warranties.data?.content.find(
      w => w.serialNumber.toUpperCase().includes(query) || w.id.toUpperCase().includes(query)
    );
    if (foundUserWarranty) {
      setLookupResult(foundUserWarranty);
      return;
    }

    setLookupError(`Không tìm thấy thông tin bảo hành cho mã "${query}". Vui lòng kiểm tra lại tem dán bên hông hộp.`);
    setLookupResult(null);
  }

  // Upload claim photos
  async function handleUpload(files: FileList | null) {
    if (!files || lockedRef.current) return;
    setFormError(undefined);
    const selected = Array.from(files);
    if (selected.length + images.length > 5 || selected.some(f => !['image/jpeg', 'image/png'].includes(f.type) || f.size > 5 * 1024 * 1024)) {
      setFormError(new Error('Tối đa 5 ảnh định dạng JPG/PNG, dung lượng không quá 5MB mỗi ảnh.'));
      return;
    }
    if (!eligibleWarranties.some(x => x.id === selectedWarrantyId)) {
      setFormError(new Error('Vui lòng chọn thiết bị còn hạn bảo hành trước khi tải ảnh.'));
      return;
    }

    lockedRef.current = true;
    setBusy(true);
    try {
      for (const file of selected) {
        const uploaded = await customer.uploadImage(selectedWarrantyId, file);
        setImages(prev => [...prev, uploaded]);
      }
    } catch (err) {
      setFormError(err as Error);
    } finally {
      lockedRef.current = false;
      setBusy(false);
    }
  }

  // Submit claim
  async function handleSubmitClaim(e: FormEvent) {
    e.preventDefault();
    if (lockedRef.current) return;
    setFormError(undefined);

    if (!selectedWarrantyId) {
      setFormError(new Error('Vui lòng chọn thiết bị AnchorBox cần yêu cầu bảo hành.'));
      return;
    }
    const cleanDesc = description.trim();
    if (cleanDesc.length < 10) {
      setFormError(new Error('Mô tả sự cố phải có tối thiểu 10 ký tự.'));
      return;
    }
    if (cleanDesc.length > 5000) {
      setFormError(new Error('Mô tả sự cố không được vượt quá 5000 ký tự.'));
      return;
    }
    if (images.length > 5) {
      setFormError(new Error('Hồ sơ bảo hành chỉ được đính kèm tối đa 5 ảnh hiện trường.'));
      return;
    }

    lockedRef.current = true;
    setBusy(true);

    if (!keyRef.current) keyRef.current = crypto.randomUUID();
    try {
      const fullDesc = `[${selectedCategory}] ${cleanDesc}`;
      const res = await customer.createClaim(
        selectedWarrantyId,
        fullDesc,
        images.map(img => img.id),
        keyRef.current
      );
      setFormSuccess(`Đã gửi yêu cầu bảo hành thành công! Mã yêu cầu: ${res.id}. Kỹ thuật viên sẽ liên hệ trong 2h.`);
      setDescription('');
      setImages([]);
      keyRef.current = '';
      claims.retry();
      setTimeout(() => {
        setClaimModalOpen(false);
        setFormSuccess('');
      }, 3000);
    } catch (err) {
      setFormError(err as Error);
    } finally {
      lockedRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="warranty-portal">
      {/* 1. HERO SECTION */}
      <section className="warranty-hero">
        <div className="container">
          <div className="warranty-hero-inner">
            <div className="warranty-badge">
              <ShieldCheck size={16} />
              <span>Dịch vụ & Bảo hành chính hãng AnchorBox</span>
            </div>
            <h1>An Tâm Tuyệt Đối Với Hộp Nhận Hàng Thông Minh</h1>
            <p className="lead">
              Tra cứu bảo hành điện tử tức thì bằng số Serial. Cam kết 1 đổi 1 trong 30 ngày, bảo hành phần cứng
              lên đến 24 tháng và hỗ trợ kỹ thuật tận nơi 24/7.
            </p>

            <div className="warranty-hero-stats">
              <div className="warranty-stat-pill">
                <strong>12 - 24 Tháng</strong>
                <span>Bảo hành chính hãng</span>
              </div>
              <div className="warranty-stat-pill">
                <strong>1 Đổi 1</strong>
                <span>Trong 30 ngày đầu</span>
              </div>
              <div className="warranty-stat-pill">
                <strong>&lt; 2 Giờ</strong>
                <span>Chẩn đoán từ xa qua IoT</span>
              </div>
              <div className="warranty-stat-pill">
                <strong>24/7</strong>
                <span>Tổng đài hỗ trợ kỹ thuật</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FLOATING SERIAL LOOKUP TOOL */}
      <div className="container warranty-lookup-wrap">
        <div className="warranty-lookup-card">
          <div className="warranty-lookup-header">
            <h2>
              <Search size={22} color="#0866e8" />
              Tra cứu Phiếu bảo hành Điện tử
            </h2>
            <span>Kiểm tra trạng thái & thời hạn bảo hành theo số Serial dán trên thiết bị</span>
          </div>

          <form onSubmit={handleSearch} className="warranty-search-bar">
            <div className="warranty-search-input-wrap">
              <Search size={18} />
              <input
                type="text"
                className="warranty-search-input"
                placeholder="Nhập số Serial thiết bị (ví dụ: AB-PRO-8842, AB-BASE-1205)..."
                value={searchSerial}
                onChange={e => setSearchSerial(e.target.value)}
              />
            </div>
            <button type="submit" className="warranty-search-btn">
              <span>Kiểm tra ngay</span>
              <ArrowRight size={17} />
            </button>
          </form>

          <div className="warranty-sample-chips">
            <span>Gợi ý Serial mẫu:</span>
            {['AB-PRO-8842', 'AB-BASE-1205', 'AB-L-9901'].map(sample => (
              <button
                key={sample}
                type="button"
                className="warranty-chip"
                onClick={() => {
                  setSearchSerial(sample);
                  handleSearch(undefined, sample);
                }}
              >
                {sample}
              </button>
            ))}
          </div>

          {lookupError && (
            <div className="notice" style={{ marginTop: 18, color: '#d12435', background: '#fef1f2' }}>
              <AlertTriangle size={18} />
              <span>{lookupError}</span>
            </div>
          )}

          {/* Certificate Result Card */}
          {lookupResult && (
            <div className="warranty-cert-card">
              <div className="warranty-cert-top">
                <div className="warranty-cert-title-group">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={20} color="#0866e8" />
                    <span className="order-caption" style={{ color: '#0866e8', fontWeight: 700 }}>
                      CHỨNG NHẬN BẢO HÀNH ĐIỆN TỬ
                    </span>
                  </div>
                  <h3>AnchorBox Device (Mã đơn: {lookupResult.orderId || 'Chính hãng'})</h3>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <span className="warranty-cert-serial">{lookupResult.serialNumber}</span>
                  </div>
                </div>

                <div>
                  <span className={`warranty-status-pill ${warrantyEligible(lookupResult) ? 'is-active' : 'is-expired'}`}>
                    <CheckCircle2 size={15} />
                    {warrantyState(lookupResult, today)}
                  </span>
                </div>
              </div>

              <div className="warranty-cert-grid">
                <div className="warranty-cert-item">
                  <dt>Ngày kích hoạt</dt>
                  <dd>{date(lookupResult.startDate, true)}</dd>
                </div>
                <div className="warranty-cert-item">
                  <dt>Hạn bảo hành</dt>
                  <dd>{date(lookupResult.endDate, true)}</dd>
                </div>
                <div className="warranty-cert-item">
                  <dt>Thời hạn bảo hành</dt>
                  <dd>{lookupResult.durationMonths} tháng chính hãng</dd>
                </div>
                <div className="warranty-cert-item">
                  <dt>Hình thức dịch vụ</dt>
                  <dd>Tận nơi &amp; Chẩn đoán OTA</dd>
                </div>
              </div>

              <div className="warranty-cert-coverage">
                <strong>Phạm vi bảo hành:</strong>
                Bảo hành đầy đủ bo mạch vi điều khiển IoT ESP32, khóa điện từ Solenoid, cảm biến tải trọng Loadcell, pin dự phòng và hỗ trợ kỹ thuật tận nơi.
              </div>

              <div className="warranty-cert-actions">
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    if (user) {
                      if ('id' in lookupResult) setSelectedWarrantyId(lookupResult.id);
                      setClaimModalOpen(true);
                    } else {
                      window.location.href = `/login?returnTo=/warranty`;
                    }
                  }}
                >
                  <Wrench size={16} />
                  <span>Gửi yêu cầu hỗ trợ cho thiết bị này</span>
                </button>
                <a
                  href={`tel:${consultationPhone.href.replace('tel:', '')}`}
                  className="button secondary"
                >
                  <PhoneCall size={16} />
                  <span>Tổng đài kỹ thuật: {consultationPhone.display}</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container">
        {/* 3. LOGGED-IN CUSTOMER HUB OR GUEST CALLOUT */}
        {user ? (
          <div className="warranty-user-hub">
            <div className="user-hub-header">
              <div>
                <h2>
                  <FileCheck2 size={24} color="#0866e8" />
                  Phiếu bảo hành của bạn
                </h2>
                <p className="muted" style={{ margin: '4px 0 0' }}>
                  Danh sách thiết bị AnchorBox đã được kích hoạt bảo hành điện tử gắn với tài khoản của bạn.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="button"
                  onClick={() => setClaimModalOpen(true)}
                  disabled={eligibleWarranties.length === 0}
                >
                  <Wrench size={16} />
                  <span>Yêu cầu bảo hành mới</span>
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    warranties.retry();
                    claims.retry();
                  }}
                  title="Cập nhật dữ liệu"
                >
                  <RefreshCw size={16} className={warranties.loading || claims.loading ? 'rotating' : ''} />
                </button>
              </div>
            </div>

            <ResourceState {...warranties} />

            {warranties.data && warranties.data.content.length > 0 ? (
              <div className="warranty-cards-row">
                {warranties.data.content.map(rec => (
                  <article key={rec.id} className="portal-warranty-card">
                    <div className="portal-card-header">
                      <span className="order-caption">SERIAL THIẾT BỊ</span>
                      <span
                        className={`warranty-status-pill ${
                          warrantyEligible(rec) ? 'is-active' : 'is-expired'
                        }`}
                      >
                        {warrantyState(rec, today)}
                      </span>
                    </div>
                    <div className="portal-card-serial">{rec.serialNumber}</div>
                    <div className="portal-card-dates">
                      <span>
                        Kích hoạt: <strong>{date(rec.startDate, true)}</strong>
                      </span>
                      <span>
                        Hết hạn: <strong>{date(rec.endDate, true)}</strong>
                      </span>
                      <span>
                        Thời hạn: <strong>{rec.durationMonths} tháng</strong>
                      </span>
                    </div>
                    <div className="portal-card-actions">
                      {rec.orderId && (
                        <Link to={`/account/orders/${rec.orderId}`} className="text-link">
                          Xem đơn hàng →
                        </Link>
                      )}
                      {warrantyEligible(rec) && (
                        <button
                          type="button"
                          className="button secondary"
                          style={{ padding: '6px 14px', fontSize: 13 }}
                          onClick={() => {
                            setSelectedWarrantyId(rec.id);
                            setClaimModalOpen(true);
                          }}
                        >
                          Yêu cầu bảo hành
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              !warranties.loading && (
                <EmptyState
                  title="Chưa có phiếu bảo hành nào"
                  action={
                    <Link className="button" to="/products">
                      Xem danh mục thiết bị
                    </Link>
                  }
                >
                  Sau khi đặt mua và hoàn tất bàn giao lắp đặt, phiếu bảo hành điện tử của thiết bị sẽ tự động xuất hiện tại đây.
                </EmptyState>
              )
            )}

            {/* Claims History Table/Cards */}
            <div style={{ marginTop: 40, borderTop: '1px solid #eef4fb', paddingTop: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h3 style={{ fontSize: 19, fontWeight: 700, margin: 0, color: '#112b50' }}>
                  Lịch sử yêu cầu hỗ trợ đã gửi ({claims.data?.totalElements || 0})
                </h3>
              </div>

              <ResourceState {...claims} />

              {claims.data && claims.data.content.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {claims.data.content.map(claimItem => (
                    <div
                      key={claimItem.id}
                      style={{
                        background: '#f8fbfe',
                        border: '1px solid #dce8f5',
                        borderRadius: 14,
                        padding: 18
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <span style={{ fontSize: 12, color: '#6882a2', fontWeight: 600 }}>
                            MÃ YÊU CẦU: {claimItem.id} · SERIAL: <strong>{claimItem.serialNumber}</strong>
                          </span>
                          <h4 style={{ margin: '4px 0 6px', fontSize: 15, color: '#112b50' }}>
                            {claimItem.description}
                          </h4>
                          <span style={{ fontSize: 12, color: '#5b7696' }}>
                            Gửi ngày {date(claimItem.createdAt)} {claimItem.resolvedAt ? `· Xử lý lúc ${date(claimItem.resolvedAt)}` : ''}
                          </span>
                        </div>
                        <CommerceStatus value={claimItem.status} />
                      </div>
                      {claimItem.images && claimItem.images.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          {claimItem.images.map((img, idx) => (
                            <a href={img} target="_blank" rel="noopener noreferrer" key={img}>
                              <img
                                src={img}
                                alt={`Ảnh minh họa ${idx + 1}`}
                                style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6, border: '1px solid #cbdff5' }}
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                !claims.loading && (
                  <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                    Bạn chưa gửi yêu cầu hỗ trợ kỹ thuật nào. Thiết bị của bạn hiện đang hoạt động bình thường!
                  </p>
                )
              )}
            </div>
          </div>
        ) : (
          <div className="warranty-guest-banner">
            <div>
              <h3>Bạn đã sở hữu AnchorBox?</h3>
              <p>
                Đăng nhập vào tài khoản để quản lý toàn bộ phiếu bảo hành điện tử, theo dõi tiến độ xử lý sự cố
                và nhận thông báo nhắc nhở kiểm tra định kỳ miễn phí.
              </p>
            </div>
            <Link className="button" to="/login?returnTo=/warranty">
              Đăng nhập xem bảo hành của bạn
            </Link>
          </div>
        )}

        {/* 4. FOUR CORE COMMITMENTS */}
        <div className="warranty-section">
          <div className="section-head-center">
            <span className="eyebrow">CHÍNH SÁCH BẢO HÀNH VÀNG</span>
            <h2>Cam Kết Bảo Vệ Toàn Diện Cho Thiết Bị Của Bạn</h2>
            <p>
              Mỗi sản phẩm AnchorBox được chế tạo theo tiêu chuẩn cơ khí và điện tử khắt khe, đi kèm chế độ
              bảo hành chính hãng uy tín hàng đầu.
            </p>
          </div>

          <div className="warranty-commitments-grid">
            <article className="commitment-card">
              <div className="commitment-icon-wrap">
                <ShieldCheck size={28} />
              </div>
              <h3>Bảo hành 12 - 24 Tháng</h3>
              <p>
                Áp dụng cho toàn bộ bo mạch điều khiển IoT, khóa từ solenoid, cảm biến tải trọng loadcell và hệ
                thống cấp nguồn điện dự phòng.
              </p>
            </article>

            <article className="commitment-card">
              <div className="commitment-icon-wrap">
                <RefreshCw size={28} />
              </div>
              <h3>1 Đổi 1 Trong 30 Ngày</h3>
              <p>
                Đổi mới hoàn toàn sản phẩm nếu phát sinh lỗi kỹ thuật do nhà sản xuất mà không thể khắc phục
                bằng cập nhật phần mềm từ xa.
              </p>
            </article>

            <article className="commitment-card">
              <div className="commitment-icon-wrap">
                <Wrench size={28} />
              </div>
              <h3>Kỹ Thuật Tận Nhà Trong 24h</h3>
              <p>
                Đội ngũ kỹ thuật viên AnchorBox hỗ trợ kiểm tra trực tiếp tại nhà đối với các vấn đề liên quan
                đến khung cơ khí, chốt khóa và lắp đặt cố định.
              </p>
            </article>

            <article className="commitment-card">
              <div className="commitment-icon-wrap">
                <Cpu size={28} />
              </div>
              <h3>Cập Nhật Firmware OTA Miễn Phí</h3>
              <p>
                Hệ thống liên tục được nâng cấp tính năng mới, tối ưu hóa độ nhạy cảm biến và vá lỗi bảo mật tự
                động qua kết nối Wi-Fi/4G đám mây.
              </p>
            </article>
          </div>
        </div>

        {/* 5. 4-STEP RESOLUTION PROCESS */}
        <div className="warranty-process-wrap">
          <div className="section-head-center" style={{ marginBottom: 20 }}>
            <span className="eyebrow">QUY TRÌNH TIÊU CHUẨN</span>
            <h2>Xử Lý Yêu Cầu Bảo Hành 4 Bước Nhanh Chóng</h2>
            <p>Quy trình minh bạch, ứng dụng công nghệ IoT giúp chẩn đoán và khắc phục sự cố tức thì.</p>
          </div>

          <div className="process-steps-grid">
            <div className="process-step">
              <div className="process-step-num">1</div>
              <h4>Tiếp Nhận Sự Cố</h4>
              <p>Khách hàng gửi yêu cầu qua Web, App hoặc gọi hotline. Hệ thống cấp mã Ticket xử lý tự động.</p>
            </div>
            <div className="process-step">
              <div className="process-step-num">2</div>
              <h4>Chẩn Đoán Từ Xa</h4>
              <p>Kỹ sư kiểm tra telemetry cảm biến, log đóng mở và điện áp pin qua Cloud trong vòng 2 giờ.</p>
            </div>
            <div className="process-step">
              <div className="process-step-num">3</div>
              <h4>Xử Lý Tận Nơi</h4>
              <p>Kỹ thuật viên đến trực tiếp khắc phục hoặc gửi linh kiện thay thế chuẩn hóa trong 24 giờ.</p>
            </div>
            <div className="process-step">
              <div className="process-step-num">4</div>
              <h4>Nghiệm Thu &amp; Bảo Lưu</h4>
              <p>Kiểm tra chu trình khóa và độ chuẩn xác cân tải, kích hoạt lại thời hạn bảo hành điện tử.</p>
            </div>
          </div>
        </div>

        {/* 6. FAQ ACCORDION */}
        <div className="warranty-section">
          <div className="section-head-center">
            <span className="eyebrow">CÂU HỎI THƯỜNG GẶP</span>
            <h2>Những Thắc Mắc Về Chính Sách Bảo Hành</h2>
            <p>Giải đáp chi tiết các quyền lợi bảo hành và cách chăm sóc bảo dưỡng hộp nhận hàng thông minh.</p>
          </div>

          <div className="warranty-faq-list">
            {[
              {
                q: 'Làm thế nào để kích hoạt bảo hành sau khi mua?',
                a: 'Bảo hành điện tử của AnchorBox được tự động kích hoạt ngay khi nhân viên kỹ thuật hoàn tất giao hàng, lắp đặt và nghiệm thu cùng bạn. Số Serial của thiết bị sẽ tự động liên kết với tài khoản đặt hàng của bạn trên hệ thống.'
              },
              {
                q: 'Nếu mất điện hoặc Wi-Fi bị gián đoạn, hộp có được bảo hành không?',
                a: 'AnchorBox được trang bị pin lưu điện dự phòng duy trì hoạt động đến 30 ngày và bộ nhớ đệm lưu trữ mã mở khóa offline. Nếu hộp gặp sự cố không mở được hoặc không sạc pin, kỹ thuật viên sẽ hỗ trợ kiểm tra và thay thế bộ nguồn miễn phí theo chính sách bảo hành.'
              },
              {
                q: 'Những trường hợp nào không được bảo hành miễn phí?',
                a: 'Các trường hợp can thiệp phần cứng trái phép, tự ý đập phá, thiên tai ngập nước vượt quá ngưỡng chuẩn chống nước IP54 ngoài trời hoặc hư hại do ngoại lực cố ý sẽ không được bảo hành miễn phí. Tuy nhiên, AnchorBox sẽ hỗ trợ sửa chữa và thay thế linh kiện với chi phí ưu đãi nhất.'
              },
              {
                q: 'Cảm biến cân tải trọng Loadcell có cần hiệu chuẩn định kỳ không?',
                a: 'Cảm biến Loadcell của AnchorBox tự động cân bằng điểm 0 (Auto Tare) mỗi lần đóng cửa. Tuy nhiên, định kỳ 12 tháng một lần, bạn có thể yêu cầu kỹ thuật viên đến kiểm tra và hiệu chuẩn tải trọng miễn phí trong thời gian bảo hành.'
              },
              {
                q: 'Tôi có thể chuyển nhượng phiếu bảo hành cho chủ nhà mới nếu bán nhà không?',
                a: 'Hoàn toàn được! Bạn chỉ cần gửi yêu cầu chuyển nhượng thiết bị kèm số Serial qua ứng dụng hoặc hotline, chúng tôi sẽ hỗ trợ bàn giao quyền quản lý thiết bị và tiếp tục duy trì thời hạn bảo hành cho chủ sở hữu mới.'
              }
            ].map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} className={`warranty-faq-item ${isOpen ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    className="warranty-faq-toggle"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={18}
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease'
                      }}
                    />
                  </button>
                  {isOpen && <div className="warranty-faq-body">{faq.a}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* 7. EMERGENCY SUPPORT & HOTLINE BANNER */}
        <div className="warranty-emergency-bar">
          <div className="warranty-emergency-info">
            <h3>Cần Hỗ Trợ Kỹ Thuật Khẩn Cấp?</h3>
            <p>
              Đội ngũ kỹ sư AnchorBox luôn sẵn sàng giải đáp thắc mắc và hướng dẫn khắc phục sự cố 24/7.
            </p>
          </div>
          <div className="warranty-emergency-contacts">
            <a href={consultationPhone.href} className="warranty-hotline-btn">
              <PhoneCall size={18} />
              <span>Hotline 24/7: {consultationPhone.display}</span>
            </a>
            <Link to="/contact" className="button" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
              Trung tâm Hỗ trợ &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* 8. CLAIM MODAL POPUP */}
      {claimModalOpen && (
        <div className="warranty-modal-overlay" onClick={() => setClaimModalOpen(false)}>
          <div className="warranty-modal-box" onClick={e => e.stopPropagation()}>
            <div className="warranty-modal-header">
              <div>
                <h3>Yêu Cầu Hỗ Trợ &amp; Bảo Hành</h3>
                <p className="warranty-modal-subtitle">
                  Kỹ sư kỹ thuật AnchorBox sẽ kiểm tra chẩn đoán và liên hệ hỗ trợ bạn
                </p>
              </div>
              <button
                type="button"
                className="warranty-modal-close"
                onClick={() => setClaimModalOpen(false)}
                title="Đóng modal"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="warranty-modal-body">
              {formSuccess ? (
                <div className="notice" style={{ background: '#eafbf0', color: '#107c39', padding: '20px', borderRadius: '18px' }}>
                  <CheckCircle2 size={24} style={{ marginBottom: '8px' }} />
                  <strong style={{ display: 'block', fontSize: '1rem', marginBottom: '4px' }}>Đã gửi yêu cầu thành công!</strong>
                  <span>{formSuccess}</span>
                </div>
              ) : (
                <form onSubmit={handleSubmitClaim}>
                  <ErrorNotice error={formError} />

                  <div className="warranty-form-group">
                    <label>1. Chọn thiết bị cần bảo hành *</label>
                    <select
                      className="warranty-form-select"
                      required
                      value={selectedWarrantyId}
                      onChange={e => setSelectedWarrantyId(e.target.value)}
                    >
                      <option value="">-- Chọn phiếu bảo hành còn hiệu lực --</option>
                      {eligibleWarranties.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.serialNumber} (Hạn đến {date(w.endDate, true)})
                        </option>
                      ))}
                      {eligibleWarranties.length === 0 && (
                        <option value="SAMPLE-01">AB-PRO-8842 (Thiết bị mẫu trải nghiệm)</option>
                      )}
                    </select>
                  </div>

                  {/* 2. CHỌN NHÓM SỰ CỐ (APPLE ISSUE PILLS) */}
                  <div className="warranty-form-group">
                    <span className="apple-issue-pills-label">2. Vấn đề bạn đang gặp phải *</span>
                    <div className="apple-issue-pills-grid">
                      {ISSUE_CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          className={`apple-issue-pill ${selectedCategory === cat ? 'is-active' : ''}`}
                          onClick={() => setSelectedCategory(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="warranty-form-group">
                    <label>3. Mô tả chi tiết sự cố gặp phải *</label>
                    <textarea
                      className="warranty-form-textarea"
                      required
                      minLength={10}
                      maxLength={5000}
                      placeholder="Ví dụ: Cửa hộp không tự động khóa sau khi đóng, cảm biến cân không nhận diện kiện hàng..."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                    <small style={{ color: '#86868b', display: 'block', marginTop: 4 }}>
                      Tối thiểu 10 ký tự ({description.length}/5000 ký tự)
                    </small>
                  </div>

                  <div className="warranty-form-group">
                    <label>4. Ảnh chụp sự cố hoặc vị trí hỏng (Tối đa 5 ảnh, dưới 5MB)</label>
                    <label className="warranty-upload-zone">
                      <Upload size={24} color="#0071e3" style={{ marginBottom: 6 }} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>
                        Bấm để tải ảnh chụp sự cố
                      </div>
                      <div style={{ fontSize: 12, color: '#86868b' }}>Định dạng JPG, PNG (tối đa 5 ảnh)</div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        multiple
                        style={{ display: 'none' }}
                        disabled={images.length >= 5 || busy}
                        onChange={e => {
                          void handleUpload(e.target.files);
                          e.target.value = '';
                        }}
                      />
                    </label>

                    {images.length > 0 && (
                      <div className="warranty-image-previews">
                        {images.map(img => (
                          <div key={img.id} className="warranty-preview-thumb">
                            <img src={img.url} alt="Ảnh sự cố" />
                            <button
                              type="button"
                              className="warranty-remove-thumb"
                              onClick={() => setImages(prev => prev.filter(i => i.id !== img.id))}
                              title="Bỏ ảnh"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="apple-sla-banner">
                    <Cpu size={18} />
                    <span>
                      <strong>Cam kết AppleCare Support:</strong> Kỹ sư AnchorBox tiếp nhận, kiểm tra dữ liệu telemetry cảm biến từ xa và phản hồi trong vòng 2 giờ.
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                    <button
                      type="submit"
                      className="apple-primary-cta-btn"
                      style={{ flex: 1 }}
                      disabled={busy || description.trim().length < 10}
                    >
                      {busy ? 'Đang gửi yêu cầu…' : 'Gửi yêu cầu bảo hành →'}
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      style={{ borderRadius: 980 }}
                      onClick={() => setClaimModalOpen(false)}
                      disabled={busy}
                    >
                      Hủy bỏ
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
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
