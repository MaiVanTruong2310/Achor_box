import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Battery, Camera, Check, ChevronDown, Lock, Minus, Plug, Scale, ShieldCheck, Sun, Wifi } from 'lucide-react';
import { money, type CatalogProduct, type Variant } from '../api/shop';
import { canBuy } from '../api/catalog';
import { useCatalog } from '../CatalogContext';
import { BoxThumb } from '../components/BoxShowcase';
import { useReveal } from './landing/useScrollProgress';
import { findProduct } from './landing/Lineup';
import { LINEUP, type LineupModel } from './landing/landingData';
import './landing/landing.css';
import '../components/box-showcase.css';
import './compare-page.css';

type Key = LineupModel['key'];

const HARDWARE: Record<Key, { camera: boolean; battery: boolean; solar: boolean; power: string; warranty: number }> = {
  base: { camera: false, battery: false, solar: false, power: 'Adapter DC 12 V', warranty: 24 },
  pro: { camera: true, battery: true, solar: false, power: 'Adapter DC 12 V + pin dự phòng', warranty: 24 },
  solar: { camera: true, battery: true, solar: true, power: 'Tấm pin mặt trời + pin lưu trữ', warranty: 36 },
};

interface Column { model: LineupModel; product?: CatalogProduct; variants: Variant[]; hw: typeof HARDWARE[Key] }

const unique = <T,>(items: T[]) => [...new Set(items)];
const range = (values: number[], unit: string) => {
  if (!values.length) return null;
  const lo = Math.min(...values), hi = Math.max(...values);
  const fmt = (n: number) => n.toLocaleString('vi-VN');
  return lo === hi ? `${fmt(lo)} ${unit}` : `${fmt(lo)}–${fmt(hi)} ${unit}`;
};

function priceFrom(column: Column) {
  const prices = column.variants.map((v) => v.finalPrice).filter((p): p is number => p != null && Number.isFinite(p));
  if (prices.length) return Math.min(...prices);
  return column.product?.price ?? null;
}

function colorsOf(variants: Variant[]) {
  const seen = new Map<string, string>();
  variants.forEach((v) => { if (v.colorHex && !seen.has(v.colorHex)) seen.set(v.colorHex, v.colorName || v.colorHex); });
  return [...seen].map(([hex, name]) => ({ hex, name }));
}

interface Row { label: string; value: (c: Column) => ReactNode; icon?: (c: Column) => ReactNode }
interface Group { id: string; title: string; rows: Row[] }

const yes = (on: boolean, text: string) => (on ? <><Check className="ab-cmp-yes" size={22} aria-hidden /> {text}</> : <><Minus className="ab-cmp-no" size={22} aria-hidden /> <span className="ab-cmp-muted">Không có</span></>);

const GROUPS: Group[] = [
  {
    id: 'capacity', title: 'Dung tích và kích thước', rows: [
      { label: 'Dung tích khoang chứa', value: (c) => unique(c.variants.map((v) => v.capacityLiter).filter((n): n is number => n != null)).sort((a, b) => a - b).map((n) => `${n} L`).join(' · ') || '—' },
      { label: 'Kích thước (R × C × S)', value: (c) => {
        const dims = unique(c.variants.filter((v) => v.widthCm && v.heightCm && v.depthCm).map((v) => `${v.widthCm} × ${v.heightCm} × ${v.depthCm} cm`));
        return dims.length ? dims.map((d) => <span key={d} className="ab-cmp-line">{d}</span>) : '—';
      } },
      { label: 'Khối lượng hộp', value: (c) => range(c.variants.map((v) => v.weightKg).filter((n): n is number => n != null), 'kg') ?? '—' },
      { label: 'Tải trọng bưu kiện tối đa', value: (c) => range(c.variants.map((v) => v.maxLoadKg).filter((n): n is number => n != null), 'kg') ?? '—' },
    ],
  },
  {
    id: 'security', title: 'Khóa và an ninh', rows: [
      { label: 'Khóa kép', icon: () => <Lock size={28} />, value: () => 'Chốt điện 12 V + servo gài chốt' },
      { label: 'Cảm biến cửa', value: () => 'Tự khóa lại 2 giây sau khi đóng' },
      { label: 'Nhập mã tại hộp', value: () => 'Bàn phím 4×4 và màn hình LCD' },
      { label: 'Chống dò mã', value: () => 'Khóa bàn phím 60 giây sau 3 lần sai' },
      { label: 'Camera giám sát lúc giao hàng', icon: (c) => <Camera size={28} className={c.hw.camera ? '' : 'is-off'} />, value: (c) => yes(c.hw.camera, 'Có') },
    ],
  },
  {
    id: 'sensing', title: 'Nhận biết bưu kiện', rows: [
      { label: 'Cân bưu kiện', icon: () => <Scale size={28} />, value: () => 'Load cell + HX711, nhận biết từ 50 g' },
      { label: 'Thông báo khi có hàng', value: () => 'Đẩy về ứng dụng Anchor Box' },
    ],
  },
  {
    id: 'power', title: 'Nguồn điện và kết nối', rows: [
      { label: 'Nguồn cấp', icon: (c) => (c.hw.solar ? <Sun size={28} /> : <Plug size={28} />), value: (c) => c.hw.power },
      { label: 'Hoạt động khi mất điện', icon: (c) => <Battery size={28} className={c.hw.battery ? '' : 'is-off'} />, value: (c) => yes(c.hw.battery, 'Pin dự phòng') },
      { label: 'Tấm pin mặt trời', value: (c) => yes(c.hw.solar, 'Tích hợp') },
      { label: 'Kết nối', icon: () => <Wifi size={28} />, value: () => 'Wi-Fi 2,4 GHz + Bluetooth' },
      { label: 'Ứng dụng', value: () => 'PIN dùng một lần, mở từ xa, lịch sử' },
    ],
  },
  {
    id: 'warranty', title: 'Bảo hành', rows: [
      { label: 'Bảo hành tiêu chuẩn', icon: () => <ShieldCheck size={28} />, value: (c) => `${Math.max(0, ...c.variants.map((v) => v.warrantyMonths ?? 0)) || c.hw.warranty} tháng` },
      { label: 'Gói gia hạn', value: () => 'Thêm 6 hoặc 12 tháng khi mua' },
    ],
  },
];

function ModelPicker({ value, onChange, taken }: { value: Key; onChange: (key: Key) => void; taken: Key[] }) {
  return (
    <label className="ab-cmp-picker">
      <span className="sr-only">Chọn phiên bản</span>
      <select value={value} onChange={(e) => onChange(e.target.value as Key)}>
        {LINEUP.map((m) => <option key={m.key} value={m.key} disabled={m.key !== value && taken.includes(m.key)}>{m.name.replace('Anchor Box ', '')}</option>)}
      </select>
      <ChevronDown size={16} aria-hidden />
    </label>
  );
}

function ColumnHead({ column, color, onColor }: { column: Column; color?: string; onColor: (hex: string) => void }) {
  const { model, product } = column;
  const colors = colorsOf(column.variants);
  const active = color || colors[0]?.hex;
  const capacity = column.variants.find((v) => v.colorHex === active)?.capacityLiter ?? column.variants[0]?.capacityLiter;
  const price = priceFrom(column);
  const buyable = column.variants.some(canBuy);
  return (
    <div className="ab-cmp-head">
      <Link to={product ? `/products/${product.id}` : '/products'} className="ab-cmp-art" aria-label={model.name}>
        <BoxThumb colorHex={active} capacity={capacity} />
      </Link>
      {colors.length > 0 && (
        <div className="ab-cmp-swatches" role="radiogroup" aria-label={`Màu ${model.name}`}>
          {colors.map((c) => (
            <button key={c.hex} type="button" role="radio" aria-checked={c.hex === active} aria-label={c.name} title={c.name}
              className={c.hex === active ? 'is-active' : undefined} style={{ background: c.hex }} onClick={() => onColor(c.hex)} />
          ))}
        </div>
      )}
      <span className={`ab-cmp-badge ${buyable ? 'is-live' : ''}`}>{buyable ? 'Đang bán' : model.available ? 'Tạm hết hàng' : 'Đặt trước'}</span>
      <h3>{model.name}</h3>
      <p className="ab-cmp-tagline">{model.tagline}</p>
      <p className="ab-cmp-price">{price != null ? `Từ ${money(price)}` : 'Liên hệ tư vấn'}</p>
      <div className="ab-cmp-cta">
        {buyable && product
          ? <Link className="ab-btn ab-btn-primary ab-btn-sm" to={`/products/${product.id}`}>Mua</Link>
          : <Link className="ab-btn ab-btn-secondary ab-btn-sm" to="/contact">Đặt tư vấn</Link>}
        {product && <Link className="ab-btn-link ab-cmp-more" to={`/products/${product.id}`}>Tìm hiểu thêm ›</Link>}
      </div>
    </div>
  );
}

export function ComparePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  useReveal(rootRef);
  const catalog = useCatalog();
  const [picks, setPicks] = useState<Key[]>(['base', 'pro', 'solar']);
  const [colors, setColors] = useState<Partial<Record<Key, string>>>({});

  const columns = useMemo<Column[]>(() => picks.map((key) => {
    const model = LINEUP.find((m) => m.key === key)!;
    const product = findProduct(catalog.data || [], model);
    return { model, product, variants: product?.variants?.filter((v) => v.isActive) || [], hw: HARDWARE[key] };
  }), [picks, catalog.data]);

  const pick = (index: number, key: Key) => setPicks((prev) => {
    const next = [...prev];
    const swap = next.indexOf(key);
    if (swap >= 0) next[swap] = next[index];
    next[index] = key;
    return next;
  });

  return (
    <div className="ab-landing ab-cmp" ref={rootRef}>
      <header className="ab-cmp-hero ab-container">
        <p className="ab-eyebrow" data-reveal>So sánh</p>
        <h1 data-reveal>Chọn Anchor Box<br />hợp với ngôi nhà bạn.</h1>
        <p className="ab-cmp-sub" data-reveal>Cùng một bộ khóa kép, cùng chiếc cân nhận biết bưu kiện. Khác nhau ở dung tích, camera và nguồn điện.</p>
      </header>

      <div className="ab-cmp-pickers" role="group" aria-label="Chọn phiên bản để so sánh">
        <div className="ab-container ab-cmp-grid">
          {picks.map((key, i) => <ModelPicker key={i} value={key} taken={picks} onChange={(k) => pick(i, k)} />)}
        </div>
      </div>

      <section className="ab-container ab-cmp-grid ab-cmp-heads" aria-label="Các phiên bản">
        {columns.map((c) => (
          <ColumnHead key={c.model.key} column={c} color={colors[c.model.key]} onColor={(hex) => setColors((prev) => ({ ...prev, [c.model.key]: hex }))} />
        ))}
      </section>

      {catalog.error && <p className="ab-container ab-cmp-note" role="alert">Chưa tải được giá và tồn kho. Thông số phần cứng bên dưới vẫn chính xác.</p>}

      {GROUPS.map((group) => (
        <section key={group.id} id={group.id} className="ab-container ab-cmp-group" aria-labelledby={`cmp-${group.id}`}>
          <h2 id={`cmp-${group.id}`} data-reveal>{group.title}</h2>
          {group.rows.map((row) => (
            <div key={row.label} className="ab-cmp-grid ab-cmp-row" data-reveal>
              {columns.map((c) => (
                <div key={c.model.key} className="ab-cmp-cell">
                  {row.icon && <span className="ab-cmp-icon" aria-hidden>{row.icon(c)}</span>}
                  <p className="ab-cmp-value">{row.value(c)}</p>
                  <p className="ab-cmp-label">{row.label}</p>
                </div>
              ))}
            </div>
          ))}
        </section>
      ))}

      {columns.some((c) => colorsOf(c.variants).length > 0) && <section className="ab-container ab-cmp-group" aria-label="Màu sắc">
        <h2 data-reveal>Màu sắc</h2>
        <div className="ab-cmp-grid ab-cmp-row" data-reveal>
          {columns.map((c) => {
            const list = colorsOf(c.variants);
            return (
              <div key={c.model.key} className="ab-cmp-cell">
                <div className="ab-cmp-swatches is-static">{list.map((s) => <span key={s.hex} style={{ background: s.hex }} title={s.name} />)}</div>
                <p className="ab-cmp-value">{list.length ? list.map((s) => s.name).join(' · ') : '—'}</p>
              </div>
            );
          })}
        </div>
      </section>}

      <p className="ab-container ab-cmp-note">Bản Base đang được sản xuất và giao lắp. Bản Pro và Solar Max được lắp theo đơn; giá, dung tích và màu lấy trực tiếp từ cửa hàng.</p>
    </div>
  );
}
