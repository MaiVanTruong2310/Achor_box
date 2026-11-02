import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { Check, Minus } from 'lucide-react';
import type { CatalogProduct } from '../../api/shop';
import { money } from '../../api/shop';
import { COMPARE_ROWS, LINEUP, type LineupModel } from './landingData';

/** Finds the live catalog product for a lineup model (by name or SKU), if the store lists it. */
export function findProduct(products: CatalogProduct[], model: LineupModel) {
  return products.find((product) => {
    const haystack = `${product.name} ${product.sku ?? ''}`.toLowerCase();
    return model.slugHints.some((hint) => haystack.includes(hint));
  });
}

export function Lineup({ products }: { products: CatalogProduct[] }) {
  return (
    <section id="lineup" className="ab-section ab-lineup" aria-labelledby="ab-lineup-title">
      <div className="ab-container">
        <p className="ab-eyebrow" data-reveal>Các phiên bản</p>
        <h2 id="ab-lineup-title" className="ab-section-title" data-reveal>Chọn chiếc hộp hợp với ngôi nhà.</h2>

        <div className="ab-lineup-grid">
          {LINEUP.map((model, i) => {
            const product = findProduct(products, model);
            return (
              <article key={model.key} className={`ab-model ${model.available ? 'is-available' : ''}`} data-reveal style={{ '--i': i } as CSSProperties}>
                <div className={`ab-model-art ab-model-art-${model.key}`} aria-hidden="true"><span /></div>
                <span className="ab-model-badge">{model.available ? 'Đang bán' : 'Bản nâng cấp'}</span>
                <h3>{model.name}</h3>
                <p className="ab-model-tagline">{model.tagline}</p>
                <p className="ab-model-price">
                  {product ? <>Từ {money(product.price)}</> : model.available ? 'Xem giá trong cửa hàng' : 'Liên hệ tư vấn'}
                </p>
                <ul>
                  {model.highlights.map((item) => <li key={item}><Check size={15} aria-hidden /> {item}</li>)}
                </ul>
                <div className="ab-model-cta">
                  {model.available ? (
                    <Link className="ab-btn ab-btn-primary ab-btn-sm" to={product ? `/products/${product.id}` : '/products'}>Mua</Link>
                  ) : (
                    <Link className="ab-btn ab-btn-secondary ab-btn-sm" to="/contact">Đặt tư vấn</Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="ab-compare" data-reveal role="region" aria-label="So sánh phiên bản" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">Tính năng</span></th>
                {LINEUP.map((model) => <th key={model.key} scope="col">{model.name.replace('Anchor Box ', '')}</th>)}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {row.values.map((has, index) => (
                    <td key={LINEUP[index].key}>
                      {has ? <Check size={18} aria-label="Có" /> : <Minus size={18} aria-label="Không" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ab-footnote">
          Bản Base là phần cứng đang sản xuất. Bản Pro và Solar Max được lắp theo đơn đặt hàng; cấu hình chi tiết do tư vấn viên xác nhận.
        </p>
      </div>
    </section>
  );
}
