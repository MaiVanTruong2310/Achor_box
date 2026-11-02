import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { BellRing, Pause, Play } from 'lucide-react';
import { prefersReducedMotion, useScrollProgress } from './useScrollProgress';

interface Highlight {
  title: string;
  body: string;
  video?: string;
  image?: string;
  notice?: boolean;
}

const SLIDE_MS = 6000;

const HIGHLIGHTS: Highlight[] = [
  { title: 'Mỗi lần giao, một mã riêng.', body: 'Shipper nhập mã PIN dùng một lần trên bàn phím 4×4. Dùng xong là hết hiệu lực.', video: '/videos/smartbox-keypad.mp4' },
  { title: 'Shipper đến. Bạn không cần ở nhà.', body: 'Hộp tự mở khóa khi mã đúng và tự khóa lại khi cửa đóng.', video: '/videos/smartbox-delivery.mp4' },
  { title: 'Gọn gàng trước hiên nhà.', body: 'Chỉ cần ổ điện và sóng Wi-Fi 2,4 GHz. Ghép nối bằng mã QR trong vài phút.', image: '/brand/anchor-box-porch.webp' },
  { title: 'Biết ngay khi có bưu kiện.', body: 'Cân xác nhận có hàng, cảm biến cửa xác nhận đã khóa, ứng dụng báo cho bạn.', image: '/brand/anchor-box-porch.webp', notice: true },
];

/** Apple-style highlights gallery: peeking cards, auto-advance, progress dots and a pause button. */
export function Highlights() {
  const sectionRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [inView, setInView] = useState(false);

  // Rise + zoom while the gallery enters the viewport.
  const onFrame = useCallback((p: number) => sectionRef.current?.style.setProperty('--enter', `${p}`), []);
  useScrollProgress(sectionRef, onFrame, 'enter');

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !inView) return;
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % HIGHLIGHTS.length), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [index, playing, inView]);

  const running = playing && inView;

  // The pause button also stops the current video, like Apple's gallery.
  useEffect(() => {
    const video = sectionRef.current?.querySelector<HTMLVideoElement>('.ab-gallery-card.is-current video');
    if (!video) return;
    if (running) video.play().catch(() => {});
    else video.pause();
  }, [running, index]);

  return (
    <section id="highlights" className="ab-highlights" ref={sectionRef} aria-labelledby="ab-highlights-title" aria-roledescription="carousel">
      <div className="ab-container">
        <h2 id="ab-highlights-title" className="ab-section-title" data-reveal>Điểm nổi bật.</h2>
      </div>

      <div className="ab-gallery">
        <ul className="ab-gallery-track" style={{ '--index': index } as CSSProperties}>
          {HIGHLIGHTS.map((item, i) => (
            <li key={item.title} className={`ab-gallery-card ${i === index ? 'is-current' : ''}`} aria-hidden={i !== index} aria-roledescription="slide" aria-label={`${i + 1} / ${HIGHLIGHTS.length}`}>
              {item.video ? (
                <video src={i === index ? item.video : undefined} poster="/brand/anchor-box-porch.webp" muted loop playsInline autoPlay={running} preload="none" />
              ) : (
                <img src={item.image} alt="" loading="lazy" decoding="async" />
              )}
              <div className="ab-gallery-copy">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
              {item.notice && (
                <div className="ab-gallery-notice">
                  <BellRing size={16} aria-hidden />
                  <span><strong>Anchor Box</strong> Có bưu kiện mới · 1,25 kg</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="ab-gallery-controls">
        <div className="ab-dots" role="tablist" aria-label="Chọn điểm nổi bật">
          {HIGHLIGHTS.map((item, i) => (
            <button
              key={item.title}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={item.title}
              className={`ab-dot ${i === index ? 'is-current' : ''} ${i === index && running ? 'is-running' : ''}`}
              style={{ '--slide-ms': `${SLIDE_MS}ms` } as CSSProperties}
              onClick={() => setIndex(i)}
            >
              <span />
            </button>
          ))}
        </div>
        <button type="button" className="ab-gallery-play" onClick={() => setPlaying((value) => !value)} aria-label={playing ? 'Tạm dừng' : 'Phát'}>
          {playing ? <Pause size={18} fill="currentColor" aria-hidden /> : <Play size={18} fill="currentColor" aria-hidden />}
        </button>
      </div>
    </section>
  );
}
