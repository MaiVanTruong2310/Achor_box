import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ShieldCheck,
  Cpu,
  GraduationCap,
  Users,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  HeartHandshake,
  TrendingUp,
  Zap,
  Lock,
  Layers,
  PhoneCall
} from 'lucide-react';
import { consultationPhone } from '../contact';
import './about-page.css';

export function AboutPage() {
  // Scroll reveal IntersectionObserver engine
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const elements = document.querySelectorAll<HTMLElement>('.scroll-reveal');

    if (reducedMotion || !('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('is-revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    elements.forEach(el => {
      // If element is already in initial view, reveal it immediately
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        el.classList.add('is-revealed');
      } else {
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="about-us-page">
      {/* 1. HERO SECTION: LỜI MỞ ĐẦU (ẢNH NỀN BACKGROUND CHO CHỮ ĐÈ LÊN) */}
      <section className="about-hero-section">
        <div className="container">
          <div className="about-hero-content scroll-reveal">
            <div className="about-badge">
              <Package size={15} />
              <span>VỀ CHÚNG TÔI · CÂU CHUYỆN ANCHORBOX</span>
            </div>
            <h1 className="about-hero-title">
              Chúng Tôi Là Ai? <br />
              <span className="highlight-cyan">Khát vọng định hình lại văn hóa giao nhận.</span>
            </h1>
            <p className="about-hero-lead">
              Khởi nguồn từ đề tài Đồ án Tốt nghiệp chuyên ngành tại <strong>Học viện Ngân hàng</strong> đến
              giải pháp hộp nhận hàng thông minh thực tế. Chúng tôi kết hợp cơ khí vững chắc, công nghệ IoT
              thời gian thực và sự thấu hiểu sâu sắc nhu cầu người dùng Việt Nam để mang lại sự an tâm tuyệt
              đối cho mỗi bưu kiện.
            </p>

            <div className="about-hero-metrics">
              <div className="hero-metric-item">
                <strong>100%</strong>
                <span>R&amp;D tự chủ sinh viên</span>
              </div>
              <div className="hero-metric-item">
                <strong>HVNH</strong>
                <span>Học viện Ngân hàng</span>
              </div>
              <div className="hero-metric-item">
                <strong>IP54</strong>
                <span>Chuẩn kháng nước bụi</span>
              </div>
              <div className="hero-metric-item">
                <strong>24/7</strong>
                <span>Kết nối giám sát Cloud</span>
              </div>
            </div>

            <div className="about-hero-badges-row">
              <div className="hero-glass-pill">
                <ShieldCheck size={18} color="#2bd0ff" />
                <span>AnchorBox Project · Chế tạo &amp; phát triển tại Việt Nam</span>
              </div>
              <div className="hero-glass-pill">
                <Zap size={18} color="#ffd166" />
                <span>Khóa Solenoid điện từ &amp; Cảm biến tải trọng Loadcell</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. WHY WE STARTED: LÝ DO CHÚNG TÔI BẮT ĐẦU */}
      <section className="story-section">
        <div className="container">
          <div className="why-story-grid">
            <div className="why-story-text scroll-reveal reveal-left">
              <span className="section-tag">
                <Lightbulb size={16} />
                KHỞI NGUỒN Ý TƯỞNG
              </span>
              <h2 className="section-title">Tại Sao Lại Là AnchorBox?</h2>
              <p>
                Mỗi ngày, hàng triệu bưu kiện được vận chuyển hối hả khắp mọi ngõ phố Việt Nam. Thương mại điện
                tử đem đến sự tiện lợi vượt trội, nhưng khâu giao nhận chặng cuối (Last-Mile Delivery) vẫn tồn tại
                vô số điểm nghẽn nhức nhối: những cuộc gọi nhỡ lúc bạn đang họp, kiện hàng bị vứt ngoài hiên mưa
                ướt, hay nỗi lo hàng giá trị cao bị thất lạc khi vắng nhà.
              </p>
              <p>
                Người giao hàng thì vất vả chờ đợi, người mua thì bất an mỗi lần đặt hàng online. Chúng tôi tự đặt
                câu hỏi: <em>Tại sao một ngôi nhà hiện đại lại chưa có một nơi an toàn, tử tế dành riêng cho bưu kiện?</em>
              </p>
              <div className="why-story-quote">
                &ldquo;AnchorBox ra đời không chỉ để lưu trữ một món hàng, mà để giải phóng con người khỏi sự chờ
                đợi và mang lại sự an tâm tuyệt đối cho tổ ấm của bạn.&rdquo;
              </div>
            </div>

            <div className="why-cards-col">
              <div className="problem-solution-card scroll-reveal delay-100">
                <div className="problem-card-icon is-red">
                  <AlertCircle size={22} />
                </div>
                <div>
                  <h4>Thực Trạng Bất Cập</h4>
                  <p>
                    Khách hàng vắng nhà hoặc bận rộn; shipper phải gọi nhiều lần; bưu kiện để trước cửa có nguy cơ bị
                    mưa nắng làm hỏng hoặc mất cắp.
                  </p>
                </div>
              </div>

              <div className="problem-solution-card scroll-reveal delay-200">
                <div className="problem-card-icon is-amber">
                  <Lightbulb size={22} />
                </div>
                <div>
                  <h4>Ý Tưởng Đột Phá</h4>
                  <p>
                    Tạo ra một điểm giao nhận cơ khí thép bền bỉ, tích hợp khóa điện từ tự động và cảm biến tải trọng
                    kết nối đám mây, vận hành hoàn toàn độc lập 24/7.
                  </p>
                </div>
              </div>

              <div className="problem-solution-card scroll-reveal delay-300">
                <div className="problem-card-icon is-green">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h4>Giải Pháp AnchorBox</h4>
                  <p>
                    Shipper mở hộp bằng mã OTP 1 lần nhanh gọn; chủ nhà nhận thông báo tức thì kèm trọng lượng kiện hàng
                    trên điện thoại; kiểm soát đóng mở từ xa chỉ bằng 1 chạm.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ACADEMIC THESIS JOURNEY: DẤU ẤN HỌC VIỆN NGÂN HÀNG (ẢNH NỀN CHO CHỮ ĐÈ LÊN) */}
      <section className="story-section has-bg">
        <div className="container">
          <div className="academic-banner-box scroll-reveal">
            <div className="academic-info">
              <span className="about-badge" style={{ background: 'rgba(255,255,255,0.18)', color: '#ffffff' }}>
                <GraduationCap size={15} />
                ĐỒ ÁN TỐT NGHIỆP XUẤT SẮC
              </span>
              <h3>Từ Giảng Đường Đại Học Đến Giải Pháp Thực Tế</h3>
              <p>
                AnchorBox được thai nghén và hiện thực hóa từ đề tài Đồ án Tốt nghiệp chuyên ngành Hệ thống Thông
                tin &amp; Thương mại Điện tử tại <strong>Học viện Ngân hàng</strong>. Chúng tôi không bằng lòng với
                một bài báo cáo lý thuyết trên giấy, mà quyết tâm tự tay nghiên cứu, thiết kế vi mạch PCB, lập trình
                firmware C++ và gia công cơ khí hoàn chỉnh để mang đến một sản phẩm hữu dụng thực sự cho đời sống.
              </p>
              <div className="academic-tags">
                <span className="academic-tag-item">🎓 Khoa Hệ thống Thông tin - HVNH</span>
                <span className="academic-tag-item">🔬 R&amp;D Phần Cứng &amp; Firmware IoT</span>
                <span className="academic-tag-item">☁️ Cloud Microservices &amp; MQTT</span>
                <span className="academic-tag-item">📦 Thử nghiệm thực địa thành công</span>
              </div>
            </div>
          </div>

          {/* Timeline steps */}
          <div className="center-text scroll-reveal">
            <span className="section-tag">
              <TrendingUp size={16} />
              CỘT MỐC PHÁT TRIỂN
            </span>
            <h2 className="section-title">Hành Trình Nghiên Cứu &amp; Hoàn Thiện</h2>
            <p className="section-subtitle">
              Mỗi chặng đường là sự kiên trì thử nghiệm, cải tiến để đưa sản phẩm từ bản vẽ ý tưởng ra ngoài thực địa.
            </p>
          </div>

          <div className="thesis-steps-grid">
            <div className="thesis-step-card scroll-reveal delay-100">
              <span className="thesis-step-date">09/2025</span>
              <h4>Khảo Sát &amp; Phác Thảo</h4>
              <p>
                Khảo sát nhu cầu thực tế của 500 hộ gia đình tại Hà Nội; nhận diện bài toán giao nhận chặng cuối và
                xác định yêu cầu kỹ thuật cơ khí, chống nước.
              </p>
            </div>

            <div className="thesis-step-card scroll-reveal delay-200">
              <span className="thesis-step-date">11/2025</span>
              <h4>Thiết Kế 3D &amp; Cơ Khí</h4>
              <p>
                Hoàn thiện bản vẽ CAD 3D với 3 kích thước S (45L), M (85L), L (150L); gia công mẫu khung thép cán nguội
                và thử nghiệm cơ cấu khóa Solenoid lực giữ &gt;1500N.
              </p>
            </div>

            <div className="thesis-step-card scroll-reveal delay-300">
              <span className="thesis-step-date">01/2026</span>
              <h4>Mạch Nhúng &amp; Firmware</h4>
              <p>
                Thiết kế bo mạch MCU ESP32, tích hợp cảm biến tải trọng Loadcell HX711, hệ thống nguồn kép pin UPS và
                lập trình firmware điều khiển giao tiếp MQTT.
              </p>
            </div>

            <div className="thesis-step-card scroll-reveal delay-400">
              <span className="thesis-step-date">05/2026</span>
              <h4>Thực Địa &amp; Nghiệm Thu</h4>
              <p>
                Triển khai thử nghiệm 15 thiết bị tại khu dân cư; bảo vệ xuất sắc Đồ án Tốt nghiệp và hoàn thiện hệ sinh
                thái Web/App quản lý thương mại.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CORE VALUES: GIÁ TRỊ CỐT LÕI */}
      <section className="story-section">
        <div className="container">
          <div className="center-text scroll-reveal">
            <span className="section-tag">
              <HeartHandshake size={16} />
              KIM CHỈ NAM HÀNH ĐỘNG
            </span>
            <h2 className="section-title">Những Giá Trị Chúng Tôi Tin Tưởng</h2>
            <p className="section-subtitle">
              Sản phẩm công nghệ tốt phải được xây dựng từ sự tử tế, tôn trọng khách hàng và cam kết chất lượng bền vững.
            </p>
          </div>

          <div className="values-four-grid">
            <div className="value-box scroll-reveal delay-100">
              <span className="value-box-num">01</span>
              <div className="value-box-icon">
                <ShieldCheck size={26} />
              </div>
              <h3>Tử Tế Trong Chi Tiết</h3>
              <p>
                Từ độ dày của thép tấm 1.5mm, lớp sơn tĩnh điện ngoài trời chống tia UV, cho đến từng gioăng cao su chống
                thấm nước. Mọi chi tiết đều được chăm chút kỹ lưỡng.
              </p>
            </div>

            <div className="value-box scroll-reveal delay-200">
              <span className="value-box-num">02</span>
              <div className="value-box-icon">
                <Zap size={26} />
              </div>
              <h3>Đơn Giản &amp; Tiện Dụng</h3>
              <p>
                Công nghệ không làm phức tạp cuộc sống. Shipper lớn tuổi hay trẻ nhỏ đều có thể mở khóa nhận hàng trong 5
                giây bằng mã OTP hoặc bàn phím số mà không cần cài đặt ứng dụng.
              </p>
            </div>

            <div className="value-box scroll-reveal delay-300">
              <span className="value-box-num">03</span>
              <div className="value-box-icon">
                <Lock size={26} />
              </div>
              <h3>Bảo Mật &amp; Trách Nhiệm</h3>
              <p>
                Mọi lệnh đóng mở và dữ liệu cân nặng đều được mã hóa đầu cuối. Bưu kiện của bạn là tài sản và sự riêng tư,
                chúng tôi bảo vệ nó như tài sản của chính mình.
              </p>
            </div>

            <div className="value-box scroll-reveal delay-400">
              <span className="value-box-num">04</span>
              <div className="value-box-icon">
                <TrendingUp size={26} />
              </div>
              <h3>Đồng Hành Bền Vững</h3>
              <p>
                Hỗ trợ kỹ thuật 24/7, cập nhật firmware OTA từ xa và cam kết bảo hành chính hãng uy tín trong suốt vòng đời
                sử dụng của thiết bị.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. MEET THE TEAM: ĐỘI NGŨ PHÁT TRIỂN */}
      <section className="story-section has-bg">
        <div className="container">
          <div className="center-text scroll-reveal">
            <span className="section-tag">
              <Users size={16} />
              ĐỘI NGŨ SÁNG LẬP
            </span>
            <h2 className="section-title">Những Con Người Đứng Sau AnchorBox</h2>
            <p className="section-subtitle">
              Tập thể những sinh viên, kỹ sư trẻ đam mê công nghệ tại Học viện Ngân hàng, cùng chung một lý tưởng biến
              giải pháp thông minh thành hiện thực.
            </p>
          </div>

          <div className="team-cards-grid">
            <div className="team-card scroll-reveal delay-100">
              <div className="team-avatar-wrap">
                <Cpu size={36} />
              </div>
              <h3>Nhóm Phần Cứng &amp; IoT</h3>
              <span className="team-role">Hardware &amp; Embedded Firmware</span>
              <p>
                Chịu trách nhiệm thiết kế sơ đồ nguyên lý mạch in PCB, lập trình firmware vi điều khiển MCU ESP32,
                tích hợp cơ cấu khóa Solenoid và hiệu chuẩn cảm biến tải trọng Loadcell HX711.
              </p>
              <div className="team-skills-chips">
                <span>ESP32 C/C++</span>
                <span>KiCAD PCB</span>
                <span>Loadcell HX711</span>
                <span>Solenoid Lock</span>
              </div>
            </div>

            <div className="team-card scroll-reveal delay-200">
              <div className="team-avatar-wrap">
                <Layers size={36} />
              </div>
              <h3>Nhóm Nền Tảng &amp; Cloud</h3>
              <span className="team-role">Backend &amp; Mobile Architecture</span>
              <p>
                Xây dựng hệ thống microservices bảo mật với Spring Boot, hạ tầng thông điệp MQTT thời gian thực,
                cơ chế sinh mã OTP chống trùng lặp và ứng dụng quản lý di động đa nền tảng.
              </p>
              <div className="team-skills-chips">
                <span>Spring Boot</span>
                <span>MQTT Broker</span>
                <span>React &amp; Vite</span>
                <span>PostgreSQL</span>
              </div>
            </div>

            <div className="team-card scroll-reveal delay-300">
              <div className="team-avatar-wrap">
                <ShieldCheck size={36} />
              </div>
              <h3>Nhóm Vận Hành &amp; Dịch Vụ</h3>
              <span className="team-role">Product &amp; Customer Care</span>
              <p>
                Nghiên cứu hành vi người dùng, tối ưu hóa quy trình giao nhận chặng cuối, xây dựng chính sách bảo hành
                điện tử và kiểm định chất lượng xuất xưởng cho từng sản phẩm.
              </p>
              <div className="team-skills-chips">
                <span>Product Design</span>
                <span>Last-Mile Logistics</span>
                <span>E-Warranty</span>
                <span>QA Testing</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. VISION & GREEN IMPACT: TẦM NHÌN TƯƠNG LAI */}
      <section className="story-section">
        <div className="container">
          <div className="center-text scroll-reveal">
            <span className="section-tag">
              <TrendingUp size={16} />
              TẦM NHÌN 2026 - 2030
            </span>
            <h2 className="section-title">Kiến Tạo Tương Lai Giao Nhận Xanh Cho Đô Thị</h2>
            <p className="section-subtitle">
              AnchorBox không chỉ dừng lại ở một sản phẩm phần cứng gia đình, mà hướng tới việc trở thành hạ tầng tiêu chuẩn
              cho mọi khu đô thị, nhà phố và chung cư thông minh tại Việt Nam.
            </p>
          </div>

          <div className="stats-showcase-grid">
            <div className="stats-card-box scroll-reveal delay-100">
              <strong>99.8%</strong>
              <h4>An Toàn Tuyệt Đối</h4>
              <p>Loại bỏ hoàn toàn rủi ro mất cắp hoặc bưu kiện bị mưa gió ẩm ướt.</p>
            </div>

            <div className="stats-card-box scroll-reveal delay-200">
              <strong>80%</strong>
              <h4>Giảm Thời Gian Chờ</h4>
              <p>Shipper chỉ mất 10 giây để thả hàng và tiếp tục hành trình giao tiếp theo.</p>
            </div>

            <div className="stats-card-box scroll-reveal delay-300">
              <strong>30 Ngày</strong>
              <h4>Pin Dự Phòng UPS</h4>
              <p>Hoạt động bền bỉ, nhận hàng và cảnh báo liên tục ngay cả khi mất điện.</p>
            </div>

            <div className="stats-card-box scroll-reveal delay-400">
              <strong>100%</strong>
              <h4>Tự Chủ Công Nghệ</h4>
              <p>Tự thiết kế phần cứng, viết phần mềm và làm chủ dây chuyền tại Việt Nam.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. GRAND CTA: LỜI NGỎ & KẾT NỐI */}
      <section className="container scroll-reveal" style={{ marginTop: 20 }}>
        <div className="about-final-cta">
          <h2>Đồng Hành Cùng Chúng Tôi Trên Hành Trình Đổi Mới</h2>
          <p>
            Dù bạn là một khách hàng tìm kiếm sự an tâm cho bưu kiện gia đình, một đối tác logistics hay đơn giản là người
            yêu công nghệ muốn chia sẻ ý tưởng — đội ngũ sáng lập AnchorBox luôn sẵn sàng lắng nghe và kết nối.
          </p>

          <div className="about-final-actions">
            <Link
              to="/products"
              className="button"
              style={{ background: '#ffffff', color: '#0866e8', fontWeight: 800, padding: '14px 32px' }}
            >
              Khám Phá Các Dòng Hộp AnchorBox
            </Link>

            <Link
              to="/contact"
              className="button secondary"
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                borderColor: 'rgba(255,255,255,0.3)',
                padding: '14px 28px'
              }}
            >
              Liên Hệ &amp; Hợp Tác
            </Link>

            <a
              href={consultationPhone.href}
              className="button secondary"
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                borderColor: 'rgba(255,255,255,0.3)',
                padding: '14px 28px'
              }}
            >
              <PhoneCall size={16} />
              <span>Hotline: {consultationPhone.display}</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AboutPage;
