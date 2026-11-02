import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { CatalogProduct } from '../../api/shop';
import { money } from '../../api/shop';
import { segment, useScrollProgress } from './useScrollProgress';
import { BoxModel } from './BoxModel';

type Phase = 'idle' | 'unlock' | 'open' | 'locked';

const LCD: Record<Phase, [string, string]> = {
  idle: ['ANCHOR BOX', 'NHAP MA PIN'],
  unlock: ['MA HOP LE', 'DANG MO KHOA'],
  open: ['DA NHAN HANG', '1.25 kg'],
  locked: ['DA KHOA', 'DA BAO CHU NHA'],
};

const CAPTION: Record<Phase, [string, string]> = {
  idle: ['Mã PIN dùng một lần.', 'Bạn tạo trong ứng dụng, shipper nhập trên bàn phím.'],
  unlock: ['Khóa kép mở ra.', 'Chốt điện nhả, servo xoay mở chốt gài.'],
  open: ['Cân xác nhận có hàng.', 'Loadcell nhận ra bưu kiện từ 50 g.'],
  locked: ['Đóng cửa là tự khóa.', 'Cảm biến cửa xác nhận, ứng dụng báo ngay cho bạn.'],
};

/**
 * Pinned hero: the Base box turns toward the viewer, unlocks, opens its door,
 * receives a parcel and locks again as the user scrolls (≈ 2.4 screens).
 */
export function Hero3D({ product }: { product?: CatalogProduct }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');

  const onFrame = useCallback((p: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const turn = segment(p, 0, 0.3);
    const door = segment(p, 0.32, 0.5) - segment(p, 0.74, 0.88);
    const drop = segment(p, 0.5, 0.66);
    el.style.setProperty('--rot', `${-34 + 30 * turn}deg`);
    el.style.setProperty('--tilt', `${-12 + 6 * turn}deg`);
    el.style.setProperty('--door', `${-112 * door}deg`);
    el.style.setProperty('--drop', `${(1 - drop) * -260}px`);
    el.style.setProperty('--drop-o', `${drop > 0 ? 1 : 0}`);
    el.style.setProperty('--copy-o', `${1 - segment(p, 0.08, 0.22)}`);
    el.style.setProperty('--lift', `${segment(p, 0.06, 0.26) * Math.min(260, window.innerHeight * 0.28)}`);
    el.style.setProperty('--notice', `${segment(p, 0.9, 0.98)}`);
    el.style.setProperty('--pill', `${1 - segment(p, 0.86, 0.96)}`);
    setPhase(p < 0.26 ? 'idle' : p < 0.44 ? 'unlock' : p < 0.84 ? 'open' : 'locked');
  }, []);

  useScrollProgress(sectionRef, onFrame);

  const unlocked = phase === 'unlock' || phase === 'open';

  return (
    <section className="ab-hero" ref={sectionRef} aria-labelledby="ab-hero-title">
      <div className="ab-hero-sticky">
        <div className="ab-hero-copy">
          <p className="ab-eyebrow">Anchor Box Base</p>
          <h1 id="ab-hero-title" className="ab-hero-title">
            Vắng nhà.<br />Vẫn nhận hàng.
          </h1>
          <p className="ab-hero-sub">
            Shipper nhập mã một lần, hộp mở khóa, cân xác nhận có hàng và tự khóa lại khi cửa đóng.
          </p>
          <div className="ab-hero-cta">
            <Link to="/products" className="ab-btn ab-btn-primary">Mua Anchor Box</Link>
            <a href="#story" className="ab-btn-link">Xem cách hoạt động <ChevronRight size={16} aria-hidden /></a>
          </div>
        </div>

        <div className="ab-stage" aria-hidden="true">
          <div className="ab-floor-shadow" />
          <BoxModel lcd={LCD[phase]} unlocked={unlocked} />

          <div className="ab-notice" role="presentation">
            <span className="ab-notice-icon" />
            <span className="ab-notice-text">
              <strong>Anchor Box</strong>
              <span>Có bưu kiện mới · 1,25 kg. Hộp đã khóa.</span>
            </span>
            <small>bây giờ</small>
          </div>
        </div>

        <p className="ab-hero-caption" aria-live="polite">
          {CAPTION[phase][0]}
          <small>{CAPTION[phase][1]}</small>
        </p>

        <div className="ab-buy-pill">
          <span>{product ? <>Anchor Box Base · Từ {money(product.price)}</> : 'Anchor Box Base · Lắp đặt tận nhà'}</span>
          <Link to={product ? `/products/${product.id}` : '/products'} className="ab-btn ab-btn-primary ab-btn-sm">Xem giá</Link>
        </div>
      </div>
    </section>
  );
}
