import type { CSSProperties } from 'react';
import { HARDWARE_FACTS, HARDWARE_TILES } from './landingData';

export function HardwareTiles() {
  return (
    <section id="hardware" className="ab-section ab-hardware" aria-labelledby="ab-hardware-title">
      <div className="ab-container">
        <p className="ab-eyebrow" data-reveal>Bên trong bản Base</p>
        <h2 id="ab-hardware-title" className="ab-section-title" data-reveal>Mỗi bộ phận là một ô trong Nhà của bạn.</h2>
        <p className="ab-section-lead" data-reveal>
          Vi điều khiển ESP32-S3 điều phối khóa, cân, cảm biến cửa và bàn phím, rồi báo trạng thái về ứng dụng.
        </p>

        <div className="ab-tile-grid">
          {HARDWARE_TILES.map(({ icon: Icon, name, status, detail, tint, on }, i) => (
            <article key={name} className={`ab-tile ${on ? 'is-on' : ''}`} data-tint={tint} data-reveal style={{ '--i': i % 4 } as CSSProperties}>
              <span className="ab-tile-icon"><Icon size={22} strokeWidth={1.9} aria-hidden /></span>
              <span className="ab-tile-name">{name}</span>
              <span className="ab-tile-status">{status}</span>
              <p className="ab-tile-detail">{detail}</p>
            </article>
          ))}
        </div>

        <dl className="ab-facts" data-reveal>
          {HARDWARE_FACTS.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.value}</dt>
              <dd>{fact.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
