import { useEffect, useMemo, useRef, useState, type ReactNode, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import seed from '../data/homeBanners.json';
import { nextBannerIndex, normalizeBanners } from '../data/bannerModel';
import { loadPublicBanners } from '../api/banners';
import './hero-banner.css';

const asset = (url: string) => url.startsWith('/') ? `${import.meta.env.BASE_URL}${url.slice(1)}` : url;

export function HeroBannerSlider({ fallback }: { fallback: ReactNode }) {
  const [raw, setRaw] = useState<unknown>(seed);
  const [now, setNow] = useState(Date.now);
  const [failed, setFailed] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [announcement, setAnnouncement] = useState('');
  const pointer = useRef<{ x: number; y: number; id: number } | null>(null);
  const swiped = useRef(false);
  const slides = useMemo(() => normalizeBanners(raw, now).filter(b => !failed.includes(b.id)), [raw, now, failed]);
  const active = Math.min(index, Math.max(0, slides.length - 1));

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    loadPublicBanners(controller.signal).then(value => {
      normalizeBanners(value); // A malformed response must not replace the safe fallback.
      if (!controller.signal.aborted) { setRaw(value); setFailed([]); setIndex(0); }
    }).catch(() => { /* Keep the local, non-promotional fallback if the public feed is unavailable. */ });
    const schedule = window.setInterval(() => setNow(Date.now()), 60000);
    return () => { controller.abort(); window.clearTimeout(timeout); window.clearInterval(schedule); };
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReduced(media.matches);
    const visibility = () => setHidden(document.hidden);
    media.addEventListener('change', motion); document.addEventListener('visibilitychange', visibility);
    return () => { media.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  useEffect(() => {
    if (slides.length < 2 || paused || hovered || focused || hidden || reduced) return;
    const timer = window.setInterval(() => setIndex(nextBannerIndex(active, 1, slides.length)), 5000);
    return () => window.clearInterval(timer);
  }, [active, slides.length, paused, hovered, focused, hidden, reduced]);

  function go(next: number) {
    const position = nextBannerIndex(0, next, slides.length);
    setIndex(position);
    setAnnouncement(`Banner ${position + 1} trên ${slides.length}: ${slides[position]?.title || ''}`);
  }

  function begin(event: PointerEvent<HTMLElement>) {
    swiped.current = false;
    if (event.button !== 0 || (event.target as Element).closest('button')) return;
    pointer.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  }
  function end(event: PointerEvent<HTMLElement>) {
    const start = pointer.current; pointer.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      swiped.current = true; go(active + (dx < 0 ? 1 : -1));
    }
  }

  if (!slides.length) return <>{fallback}</>;
  return <section className={`hero-banner${slides[active]?.layout === 'image' ? ' hero-banner-artwork hero-banner-full' : ' container'}`} aria-label="Bộ sưu tập và thông tin nổi bật" aria-roledescription="carousel" role="region" tabIndex={0}
    onPointerEnter={e => { if (e.pointerType === 'mouse') setHovered(true); }} onPointerLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}
    onPointerDown={begin} onPointerUp={end} onPointerCancel={() => { pointer.current = null; }}
    onPointerMove={e => {
      const start = pointer.current;
      if (start && Math.abs(e.clientX - start.x) > 12 && Math.abs(e.clientX - start.x) > Math.abs(e.clientY - start.y) * 1.3 && !e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId);
    }}
    onClickCapture={e => { if (swiped.current) { e.preventDefault(); e.stopPropagation(); swiped.current = false; } }}
    onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); go(active + (e.key === 'ArrowRight' ? 1 : -1)); } }}>
    <div className="hero-banner-stage">
      {slides.map((banner, i) => <article key={banner.id} className={`hero-banner-slide hero-banner-${banner.theme} hero-banner-${banner.layout}${i === active ? ' is-active' : ''}`}
        role="group" aria-roledescription="slide" aria-label={`${i + 1} / ${slides.length}`} aria-hidden={i !== active} inert={i !== active}>
        <Link className="hero-banner-link" to={banner.targetUrl} tabIndex={i === active ? 0 : -1} draggable={false} aria-label={`${banner.title.replace(/\n/g, ' ')} — ${banner.ctaLabel || 'Xem sản phẩm'}`}>
          <div className="hero-banner-art" aria-hidden="true">
            {banner.layout === 'product' && <div className="hero-banner-orbit"/>}
            <img src={asset(banner.imageUrl)} alt={banner.imageAlt || banner.title} width={banner.layout === 'image' ? 2000 : 640} height={banner.layout === 'image' ? 800 : 600} loading={i === 0 ? 'eager' : 'lazy'} fetchPriority={i === 0 ? 'high' : 'low'} decoding="async" draggable={false}
              onError={() => setFailed(previous => previous.includes(banner.id) ? previous : [...previous, banner.id])}/>
            {banner.layout === 'product' && <span className="hero-banner-image-note">Hình minh họa sản phẩm</span>}
          </div>
          {banner.layout === 'product' && <div className="hero-banner-copy">
            <p className="hero-banner-eyebrow"><span/>{banner.eyebrow || 'BỘ SƯU TẬP ANCHORBOX'}</p>
            <h1>{banner.title.split('\n').map((line, n) => <span key={n}>{line}</span>)}</h1>
            <p className="hero-banner-description">{banner.description || 'Khám phá sản phẩm và tìm cấu hình AnchorBox phù hợp với bạn.'}</p>
            <span className="hero-banner-cta">{banner.ctaLabel || 'Khám phá sản phẩm'}<ArrowUpRight size={19}/></span>
            <span className="hero-banner-signature">ANCHORBOX <span>—</span> Một nơi dành cho bưu kiện.</span>
          </div>}
        </Link>
      </article>)}
    </div>
    {slides.length > 1 && <div className="hero-banner-controls">
      <div className="hero-banner-dots" role="group" aria-label="Chọn banner">{slides.map((banner, i) => <button key={banner.id} type="button" aria-label={`Đến banner ${i + 1}`} aria-pressed={i === active} onClick={() => go(i)}><span/></button>)}</div>
      <div className="hero-banner-arrows">
        <span className="hero-banner-count" aria-hidden="true">{String(active + 1).padStart(2, '0')} <span>/ {String(slides.length).padStart(2, '0')}</span></span>
        <button type="button" aria-label="Banner trước" onClick={() => go(active - 1)}><ChevronLeft size={20}/></button>
        <button type="button" aria-label="Banner tiếp theo" onClick={() => go(active + 1)}><ChevronRight size={20}/></button>
        <button type="button" aria-label={paused ? 'Tiếp tục tự chuyển banner' : 'Tạm dừng tự chuyển banner'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={15}/> : <Pause size={15}/>}</button>
      </div>
    </div>}
    <p className="hero-banner-sr" aria-live="polite" aria-atomic="true">{announcement}</p>
  </section>;
}
