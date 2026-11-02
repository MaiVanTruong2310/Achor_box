import { useCallback, useRef, type CSSProperties } from 'react';
import { BellRing, History, KeyRound, LockKeyhole, Scale, DoorClosed, Smartphone, Users } from 'lucide-react';
import { useScrollProgress } from './useScrollProgress';

const FEATURES = [
  { icon: KeyRound, title: 'Mã PIN dùng một lần', body: 'Tạo mã riêng cho từng lần giao, có thời hạn, dùng xong là hết hiệu lực.' },
  { icon: Smartphone, title: 'Mở khóa từ xa', body: 'Gửi lệnh mở từ bất cứ đâu, hộp nhận lệnh qua đám mây.' },
  { icon: Users, title: 'Chia sẻ cho người thân', body: 'Mời thành viên trong nhà cùng theo dõi và mở hộp.' },
  { icon: History, title: 'Lịch sử & thông báo', body: 'Mỗi lần mở cửa, nhận hàng hay nhập sai mã đều được ghi lại.' },
];

export function AppShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const onFrame = useCallback((p: number) => sectionRef.current?.style.setProperty('--app', `${p}`), []);
  useScrollProgress(sectionRef, onFrame);

  return (
    <section id="app" className="ab-section ab-app" ref={sectionRef} aria-labelledby="ab-app-title">
      <div className="ab-container ab-app-grid">
        <div>
          <p className="ab-eyebrow" data-reveal>Ứng dụng Anchor Box</p>
          <h2 id="ab-app-title" className="ab-section-title" data-reveal>Cả chiếc hộp, gọn trong lòng bàn tay.</h2>
          <ul className="ab-feature-list">
            {FEATURES.map(({ icon: Icon, title, body }, i) => (
              <li key={title} data-reveal style={{ '--i': i } as CSSProperties}>
                <span className="ab-feature-icon"><Icon size={20} strokeWidth={1.9} aria-hidden /></span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="ab-phone-wrap" aria-hidden="true">
          <div className="ab-phone">
            <div className="ab-phone-island" />
            <div className="ab-phone-screen">
              <p className="ab-phone-home">Nhà của tôi</p>
              <div className="ab-phone-banner">
                <BellRing size={14} />
                <span>Có bưu kiện mới · 1,25 kg</span>
              </div>
              <p className="ab-phone-room">Cửa trước</p>
              <div className="ab-phone-tiles">
                <div className="ab-tile ab-tile-xs is-on" data-tint="blue">
                  <span className="ab-tile-icon"><LockKeyhole size={15} /></span>
                  <span className="ab-tile-name">Anchor Box</span>
                  <span className="ab-tile-status">Đã khóa</span>
                </div>
                <div className="ab-tile ab-tile-xs is-on" data-tint="orange">
                  <span className="ab-tile-icon"><Scale size={15} /></span>
                  <span className="ab-tile-name">Cân</span>
                  <span className="ab-tile-status">1,25 kg</span>
                </div>
                <div className="ab-tile ab-tile-xs" data-tint="teal">
                  <span className="ab-tile-icon"><DoorClosed size={15} /></span>
                  <span className="ab-tile-name">Cửa</span>
                  <span className="ab-tile-status">Đã đóng</span>
                </div>
                <div className="ab-tile ab-tile-xs" data-tint="indigo">
                  <span className="ab-tile-icon"><KeyRound size={15} /></span>
                  <span className="ab-tile-name">PIN shipper</span>
                  <span className="ab-tile-status">Còn 2 giờ</span>
                </div>
              </div>
              <div className="ab-phone-pin">
                <span>Mã cho shipper</span>
                <strong>482 913</strong>
                <small>Dùng một lần</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
