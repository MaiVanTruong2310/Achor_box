import { useCallback, useRef, useState } from 'react';
import { DoorClosed, DoorOpen, Grid3x3, LockKeyhole, LockKeyholeOpen, Scale } from 'lucide-react';
import { DELIVERY_STEPS } from './landingData';
import { useScrollProgress } from './useScrollProgress';

/** Pinned "one delivery" story: five steps scrubbed by scroll, with a live Apple Home accessory card. */
export function DeliveryStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  const onFrame = useCallback((p: number) => {
    sectionRef.current?.style.setProperty('--story', `${p}`);
    setActive(Math.min(DELIVERY_STEPS.length - 1, Math.floor(p * DELIVERY_STEPS.length)));
  }, []);
  useScrollProgress(sectionRef, onFrame);

  const step = DELIVERY_STEPS[active];
  const open = step.door === 'open';
  const unlocked = step.lock === 'unlocked';

  return (
    <section id="story" className="ab-story" ref={sectionRef} aria-labelledby="ab-story-title">
      <div className="ab-story-sticky">
        <div className="ab-story-copy">
          <p className="ab-eyebrow">Một lần giao hàng</p>
          <h2 id="ab-story-title" className="ab-section-title">Bạn không cần có mặt.</h2>
          <ol className="ab-steps">
            {DELIVERY_STEPS.map((item, index) => (
              <li key={item.title} className={index === active ? 'is-active' : index < active ? 'is-done' : ''}>
                <span className="ab-step-index">{index + 1}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="ab-story-visual" aria-live="polite">
          <div className="ab-accessory-card">
            <header>
              <span className="ab-accessory-room">Cửa trước</span>
              <strong>Anchor Box</strong>
              <span className={`ab-accessory-state ${unlocked ? 'is-alert' : ''}`}>
                {unlocked ? 'Đang mở khóa' : 'Đã khóa'}
              </span>
            </header>
            <div className="ab-lcd ab-lcd-wide">
              <span>{step.lcd[0]}</span>
              <span>{step.lcd[1]}</span>
            </div>
            <div className="ab-mini-tiles">
              <div className={`ab-tile ab-tile-sm ${unlocked ? '' : 'is-on'}`} data-tint="blue">
                <span className="ab-tile-icon">{unlocked ? <LockKeyholeOpen size={18} /> : <LockKeyhole size={18} />}</span>
                <span className="ab-tile-name">Khóa</span>
                <span className="ab-tile-status">{unlocked ? 'Đã mở' : 'Đã khóa'}</span>
              </div>
              <div className={`ab-tile ab-tile-sm ${open ? 'is-on' : ''}`} data-tint="teal">
                <span className="ab-tile-icon">{open ? <DoorOpen size={18} /> : <DoorClosed size={18} />}</span>
                <span className="ab-tile-name">Cửa</span>
                <span className="ab-tile-status">{open ? 'Đang mở' : 'Đã đóng'}</span>
              </div>
              <div className={`ab-tile ab-tile-sm ${step.weight !== '0,00 kg' ? 'is-on' : ''}`} data-tint="orange">
                <span className="ab-tile-icon"><Scale size={18} /></span>
                <span className="ab-tile-name">Cân</span>
                <span className="ab-tile-status">{step.weight}</span>
              </div>
              <div className="ab-tile ab-tile-sm" data-tint="indigo">
                <span className="ab-tile-icon"><Grid3x3 size={18} /></span>
                <span className="ab-tile-name">Bàn phím</span>
                <span className="ab-tile-status">{step.keypad}</span>
              </div>
            </div>
            <div className="ab-progress" aria-hidden="true"><span /></div>
          </div>
        </div>
      </div>
    </section>
  );
}
