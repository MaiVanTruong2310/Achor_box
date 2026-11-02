import { useState, type CSSProperties } from 'react';
import { Plus, X } from 'lucide-react';
import { BoxModel, type BoxFocus } from './BoxModel';

export interface Part {
  key: Exclude<BoxFocus, null>;
  label: string;
  title: string;
  body: string;
  pose: { rot: number; tilt: number; door: number };
  lcd: [string, string];
  unlocked?: boolean;
  parcel?: boolean;
}

/* Copy matches the Base hardware (device/firmware/include/config.h, device/pcb/MainSCH.SchDoc). */
export const PARTS: Part[] = [
  {
    key: 'keypad', label: 'Bàn phím & màn hình', title: 'Bàn phím 4×4, màn hình LCD 16×2.',
    body: 'Bàn phím đọc qua bộ mở rộng I2C PCF8574. Màn hình hướng dẫn shipper từng bước và báo khi mã sai.',
    pose: { rot: -8, tilt: -8, door: 0 }, lcd: ['NHAP MA PIN', '******'],
  },
  {
    key: 'lock', label: 'Khóa kép', title: 'Hai lớp khóa, mở cùng lúc.',
    body: 'Chốt điện 12 V điều khiển qua MOSFET AO3400 và servo xoay chốt gài. Cả hai cùng nhả khi mã đúng.',
    pose: { rot: -46, tilt: -10, door: -38 }, lcd: ['MA HOP LE', 'DANG MO KHOA'], unlocked: true,
  },
  {
    key: 'scale', label: 'Cân bưu kiện', title: 'Biết có hàng từ 50 g.',
    body: 'Loadcell dưới sàn khoang đọc qua HX711, có ngưỡng trễ để không báo nhầm khi hộp rung.',
    pose: { rot: -14, tilt: -14, door: -112 }, lcd: ['DA NHAN HANG', '1.25 kg'], unlocked: true, parcel: true,
  },
  {
    key: 'door', label: 'Cảm biến cửa', title: 'Đóng cửa là tự khóa.',
    body: 'Công tắc từ MC-38 xác nhận cửa đã đóng hẳn, 2 giây sau hộp tự khóa lại.',
    pose: { rot: -30, tilt: -8, door: -18 }, lcd: ['DA DONG CUA', 'DANG KHOA...'],
  },
  {
    key: 'status', label: 'Kết nối & đèn báo', title: 'Luôn báo trạng thái.',
    body: 'ESP32-S3 kết nối Wi-Fi 2,4 GHz và Bluetooth LE. Ba đèn đỏ, vàng (Wi-Fi), xanh cùng còi báo cho biết hộp đang làm gì.',
    pose: { rot: -4, tilt: -6, door: 0 }, lcd: ['WIFI: DA KET NOI', 'SAN SANG'],
  },
];

const OVERVIEW = { rot: -32, tilt: -12, door: 0 };

/** Apple-style product viewer: "+" pills on the left, the 3D box turns to the chosen part. */
export function BoxExplorer() {
  const [active, setActive] = useState<Part | null>(null);
  const pose = active?.pose ?? OVERVIEW;
  const stageStyle = {
    '--rot': `${pose.rot}deg`,
    '--tilt': `${pose.tilt}deg`,
    '--door': `${pose.door}deg`,
    '--drop': '0px',
    '--drop-o': active?.parcel ? 1 : 0,
  } as CSSProperties;

  return (
    <section id="explore" className="ab-section ab-explorer" aria-labelledby="ab-explorer-title">
      <div className="ab-container">
        <h2 id="ab-explorer-title" className="ab-section-title" data-reveal>Khám phá Anchor Box.</h2>
        <div className="ab-explorer-grid">
          <ul className="ab-pills">
            {PARTS.map((part, i) => {
              const open = active?.key === part.key;
              return (
                <li key={part.key} data-reveal style={{ '--i': i } as CSSProperties}>
                  <div className={`ab-pill ${open ? 'is-open' : ''}`}>
                    <button
                      type="button"
                      className="ab-pill-head"
                      aria-expanded={open}
                      onClick={() => setActive(open ? null : part)}
                    >
                      <span className="ab-pill-icon">{open ? <X size={16} aria-hidden /> : <Plus size={16} aria-hidden />}</span>
                      {part.label}
                    </button>
                    <div className="ab-pill-body" hidden={!open}>
                      <strong>{part.title}</strong>
                      <p>{part.body}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="ab-stage ab-explorer-stage" style={stageStyle} aria-hidden="true">
            <div className="ab-floor-shadow" />
            <BoxModel lcd={active?.lcd ?? ['ANCHOR BOX', 'NHAP MA PIN']} unlocked={!!active?.unlocked} focus={active?.key ?? null} />
          </div>
        </div>
      </div>
    </section>
  );
}
