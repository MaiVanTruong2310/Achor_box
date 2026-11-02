import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Search, X } from 'lucide-react';
import { useCatalog } from '../CatalogContext';
import { money, type CatalogProduct } from '../api/shop';
import { canBuy } from '../api/catalog';
import { BoxThumb } from './BoxShowcase';
import './box-showcase.css';
import './store-search.css';

interface StoreSearchProps {
  categories?: { id: string; name: string }[];
  initialCategory?: string;
  initialQuery?: string;
  topOffset?: number;
  onClose?: () => void;
}

const QUICK_LINKS = [
  { label: 'Tất cả sản phẩm', to: '/products', keywords: 'san pham cua hang mua hop' },
  { label: 'So sánh các phiên bản', to: '/compare', keywords: 'so sanh base pro solar max phien ban' },
  { label: 'Theo dõi đơn hàng', to: '/order-tracking', keywords: 'theo doi don hang van chuyen giao' },
  { label: 'Tra cứu bảo hành', to: '/warranty', keywords: 'bao hanh tra cuu serial sua chua' },
  { label: 'Giao và lắp đặt', to: '/how-it-works', keywords: 'giao lap dat quy trinh cai dat' },
  { label: 'Công nghệ bên trong', to: '/technology', keywords: 'cong nghe khoa can hx711 load cell esp32 wifi' },
  { label: 'Câu hỏi thường gặp', to: '/faq', keywords: 'cau hoi faq ho tro' },
  { label: 'Liên hệ tư vấn', to: '/contact', keywords: 'lien he tu van hotline dat truoc' },
];

const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

function Highlight({ text, query }: { text: string; query: string }) {
  const needle = fold(query.trim());
  const at = needle ? fold(text).indexOf(needle) : -1;
  if (at < 0) return <>{text}</>;
  return <>{text.slice(0, at)}<mark>{text.slice(at, at + needle.length)}</mark>{text.slice(at + needle.length)}</>;
}

function minPrice(product: CatalogProduct) {
  const prices = product.variants?.filter((v) => v.isActive && v.finalPrice != null && Number.isFinite(v.finalPrice)).map((v) => v.finalPrice!) || [];
  return prices.length ? Math.min(...prices) : product.price ?? null;
}

function score(product: CatalogProduct, needle: string) {
  const name = fold(product.name || '');
  if (name.startsWith(needle)) return 0;
  if (name.includes(needle)) return 1;
  if (fold(product.sku || '').includes(needle) || product.variants?.some((v) => fold(`${v.sku} ${v.variantName}`).includes(needle))) return 2;
  if (fold(`${product.categoryName || ''} ${product.description || ''}`).includes(needle)) return 3;
  return -1;
}

type Item = { key: string; to: string; node: ReactNode };

export function StoreSearch({ initialCategory = '', initialQuery = '', topOffset, onClose }: StoreSearchProps) {
  const navigate = useNavigate();
  const catalog = useCatalog();
  const listId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [active, setActive] = useState(-1);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const needle = fold(query.trim());

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  useEffect(() => {
    const outside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (panelRef.current?.contains(target) || target.closest?.('.apple-nav-search-trigger')) return;
      onClose?.();
    };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [onClose]);

  const products = useMemo(() => {
    const rows = (catalog.data || []).filter((p) => !initialCategory || p.categoryId === initialCategory || p.categorySlug === initialCategory);
    if (!needle) return rows.slice(0, 3);
    return rows.map((p) => ({ p, s: score(p, needle) })).filter((r) => r.s >= 0).sort((a, b) => a.s - b.s || a.p.name.localeCompare(b.p.name, 'vi')).map((r) => r.p);
  }, [catalog.data, needle, initialCategory]);

  const links = useMemo(() => (needle ? QUICK_LINKS.filter((l) => fold(`${l.label} ${l.keywords}`).includes(needle)) : QUICK_LINKS.slice(0, 5)), [needle]);

  const productItems: Item[] = products.slice(0, 6).map((product) => {
    const price = minPrice(product);
    const inStock = product.variants?.some(canBuy);
    const variants = product.variants?.filter((v) => v.isActive) || [];
    const hit = needle && !fold(product.name).includes(needle) ? variants.find((v) => fold(`${v.sku} ${v.variantName}`).includes(needle)) : undefined;
    const look = hit || variants[0];
    return {
      key: `p-${product.id}`,
      to: `/products/${product.id}`,
      node: (
        <>
          <span className="ab-search-thumb"><BoxThumb colorHex={look?.colorHex} capacity={look?.capacityLiter} /></span>
          <span className="ab-search-info">
            <span className="ab-search-name"><Highlight text={product.name} query={query} /></span>
            {hit && <span className="ab-search-sub"><Highlight text={hit.variantName} query={query} /></span>}
            <span className="ab-search-sub">{price != null ? `Từ ${money(price)}` : 'Liên hệ'} · <span className={inStock ? 'is-in' : ''}>{inStock ? 'Còn hàng' : 'Đặt trước'}</span></span>
          </span>
        </>
      ),
    };
  });
  const linkItems: Item[] = links.map((link) => ({
    key: `l-${link.to}`,
    to: link.to,
    node: <><ArrowRight size={15} className="ab-search-arrow" aria-hidden /><span className="ab-search-name"><Highlight text={link.label} query={query} /></span></>,
  }));
  const items = [...productItems, ...linkItems];

  useEffect(() => setActive(-1), [needle]);

  const go = (to: string) => { onClose?.(); navigate(to); };

  function submit(event: FormEvent) {
    event.preventDefault();
    if (active >= 0 && items[active]) return go(items[active].to);
    const q = query.trim();
    go(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
  }

  function onKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') { event.preventDefault(); onClose?.(); return; }
    if (!items.length || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return;
    event.preventDefault();
    setActive((i) => (event.key === 'ArrowDown' ? (i + 1) % items.length : (i <= 0 ? items.length - 1 : i - 1)));
  }

  const renderGroup = (title: string, group: Item[], offset: number) => group.length > 0 && (
    <div className="ab-search-group" role="group" aria-label={title}>
      <p className="ab-search-heading">{title}</p>
      {group.map((item, i) => (
        <a key={item.key} id={`${listId}-${offset + i}`} role="option" aria-selected={active === offset + i} href={item.to}
          className={`ab-search-item ${active === offset + i ? 'is-active' : ''}`}
          onMouseEnter={() => setActive(offset + i)}
          onClick={(e) => { e.preventDefault(); go(item.to); }}>
          {item.node}
        </a>
      ))}
    </div>
  );

  const top = topOffset != null ? { top: `${topOffset}px` } : undefined;
  const loading = catalog.loading && !catalog.data;
  const empty = needle && !items.length && !loading;

  return (
    <>
      <div className="ab-search" ref={panelRef} style={top}>
        <div className="ab-search-inner">
          <form className="ab-search-field" role="search" onSubmit={submit}>
            {loading && needle ? <Loader2 size={22} className="ab-search-icon ab-search-spin" aria-hidden /> : <Search size={22} className="ab-search-icon" aria-hidden />}
            <input
              ref={inputRef}
              type="search"
              value={query}
              maxLength={120}
              autoComplete="off"
              spellCheck={false}
              placeholder="Tìm kiếm trên Anchor Box"
              aria-label="Tìm kiếm sản phẩm và trang"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
            />
            {query && (
              <button type="button" className="ab-search-clear" aria-label="Xóa từ khóa" onClick={() => { setQuery(''); inputRef.current?.focus(); }}>
                <X size={14} strokeWidth={2.4} />
              </button>
            )}
          </form>

          <div id={listId} role="listbox" aria-label="Gợi ý tìm kiếm" className="ab-search-results">
            {renderGroup(needle ? `Sản phẩm (${products.length})` : 'Sản phẩm nổi bật', productItems, 0)}
            {renderGroup(needle ? 'Trang liên quan' : 'Liên kết nhanh', linkItems, productItems.length)}
            {loading && <p className="ab-search-state">Đang tải danh mục sản phẩm…</p>}
            {catalog.error && !catalog.data && (
              <p className="ab-search-state">Chưa tải được sản phẩm. <button type="button" onClick={catalog.retry}>Thử lại</button></p>
            )}
            {empty && (
              <p className="ab-search-state">Không tìm thấy kết quả cho “{query.trim()}”. Thử tên phiên bản (Base, Pro, Solar) hoặc dung tích như “75 L”.</p>
            )}
            {needle && products.length > 6 && (
              <button type="button" className="ab-search-all" onClick={() => go(`/products?q=${encodeURIComponent(query.trim())}`)}>
                Xem tất cả {products.length} sản phẩm <ArrowRight size={14} aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="ab-search-dim" style={top} onClick={onClose} aria-hidden="true" />
    </>
  );
}
