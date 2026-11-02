import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CatalogProduct } from '../../api/shop';
import { money } from '../../api/shop';

const LINKS = [
  { href: '#story', label: 'Cách hoạt động' },
  { href: '#explore', label: 'Phần cứng' },
  { href: '#app', label: 'Ứng dụng' },
  { href: '#lineup', label: 'Phiên bản' },
];

/** Apple-style product bar pinned under the global nav once the hero has scrolled away. */
export function ProductBar({ product }: { product?: CatalogProduct }) {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState('');

  useEffect(() => {
    const trigger = document.getElementById('highlights');
    if (!trigger) return;
    const sections = LINKS.map((link) => document.querySelector<HTMLElement>(link.href)).filter(Boolean) as HTMLElement[];
    const onScroll = () => {
      setVisible(trigger.getBoundingClientRect().top < window.innerHeight * 0.5);
      const passed = sections.filter((section) => section.getBoundingClientRect().top < window.innerHeight * 0.4);
      setCurrent(passed.length ? `#${passed[passed.length - 1].id}` : '');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={`ab-productbar ${visible ? 'is-visible' : ''}`} aria-hidden={!visible}>
      <div className="ab-container ab-productbar-inner">
        <strong>Anchor Box Base</strong>
        <nav aria-label="Mục trên trang">
          {LINKS.map((link) => <a key={link.href} href={link.href} tabIndex={visible ? 0 : -1} className={current === link.href ? 'is-current' : undefined} aria-current={current === link.href ? 'location' : undefined}>{link.label}</a>)}
        </nav>
        <div className="ab-productbar-buy">
          {product && <span>Từ {money(product.price)}</span>}
          <Link to={product ? `/products/${product.id}` : '/products'} className="ab-btn ab-btn-primary ab-btn-xs" tabIndex={visible ? 0 : -1}>Mua</Link>
        </div>
      </div>
    </div>
  );
}
