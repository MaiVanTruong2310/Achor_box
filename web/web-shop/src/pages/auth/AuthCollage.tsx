import { Fragment, type ReactNode } from 'react';
import { BellRing, CheckCircle2, DoorClosed, KeyRound, LockKeyhole, Package, Scale, ShieldCheck, Truck, Wifi } from 'lucide-react';

type Tone = 'sunset' | 'ocean' | 'mint' | 'paper' | 'night' | 'lemon' | 'lilac';

function Screen({ tone, children, tall = false }: { tone: Tone; children: ReactNode; tall?: boolean }) {
  return (
    <div className={`auth-shot auth-shot-${tone} ${tall ? 'is-tall' : ''}`}>
      <span className="auth-shot-bar"><b>9:41</b><i /></span>
      {children}
    </div>
  );
}

const SCREENS: ReactNode[] = [
  <Screen key="notice" tone="sunset" tall>
    <p className="auth-shot-kicker">Nhà của tôi</p>
    <h4>Cửa trước</h4>
    <div className="auth-shot-banner"><Package size={14} /> Có bưu kiện mới · 1,25 kg</div>
    <div className="auth-shot-tiles">
      <span className="is-on"><LockKeyhole size={14} />Đã khóa</span>
      <span className="is-on"><Scale size={14} />1,25 kg</span>
      <span><DoorClosed size={14} />Đã đóng</span>
      <span><Wifi size={14} />Trực tuyến</span>
    </div>
  </Screen>,
  <Screen key="pin" tone="paper">
    <p className="auth-shot-kicker">Mã cho shipper</p>
    <strong className="auth-shot-pin">482 719</strong>
    <p className="auth-shot-muted">Dùng một lần · hết hạn sau 24 giờ</p>
    <span className="auth-shot-button">Chia sẻ mã</span>
  </Screen>,
  <Screen key="photo" tone="night" tall>
    <img src="/brand/anchor-box-porch.webp" alt="" loading="lazy" />
    <p className="auth-shot-caption">Một nơi dành cho bưu kiện.</p>
  </Screen>,
  <Screen key="lcd" tone="night">
    <div className="auth-shot-lcd"><span>MA HOP LE</span><span>MOI MO CUA</span></div>
    <div className="auth-shot-keys">{'123A456B789C*0#D'.split('').map((key, i) => <i key={i}>{key}</i>)}</div>
  </Screen>,
  <Screen key="product" tone="lilac" tall>
    <img className="auth-shot-product" src="/products/smartbox-std-front.svg" alt="" loading="lazy" />
    <h4>Anchor Box Base</h4>
    <p className="auth-shot-muted">Khóa kép · Cân bưu kiện · Wi-Fi</p>
  </Screen>,
  <Screen key="order" tone="mint">
    <p className="auth-shot-kicker">Đơn hàng</p>
    <ul className="auth-shot-steps">
      <li className="is-done"><CheckCircle2 size={13} />Đã thanh toán</li>
      <li className="is-done"><Truck size={13} />Đã giao thiết bị</li>
      <li className="is-now"><KeyRound size={13} />Đang lắp đặt</li>
    </ul>
  </Screen>,
  <Screen key="warranty" tone="ocean">
    <ShieldCheck size={22} />
    <h4>Còn hiệu lực</h4>
    <p className="auth-shot-muted">Bảo hành điện tử · còn 530 ngày</p>
    <span className="auth-shot-meter"><i /></span>
  </Screen>,
  <Screen key="alert" tone="lemon" tall>
    <p className="auth-shot-kicker">Thông báo</p>
    <div className="auth-shot-list">
      <span><BellRing size={13} />Hộp vừa mở bằng mã PIN</span>
      <span><Package size={13} />Có bưu kiện mới</span>
      <span><LockKeyhole size={13} />Đã tự khóa sau 2 giây</span>
    </div>
  </Screen>,
  <Screen key="diagram" tone="paper" tall>
    <img className="auth-shot-product" src="/products/smartbox-std-inside.svg" alt="" loading="lazy" />
    <p className="auth-shot-muted">Bên trong: cân, khóa, cảm biến cửa</p>
  </Screen>,
];

const COLUMNS = [0, 1, 2, 3, 4].map((column) => SCREENS.map((_, i) => SCREENS[(i * 2 + column * 3) % SCREENS.length]));

export function AuthCollage() {
  return (
    <div className="auth-collage" aria-hidden="true">
      <div className="auth-collage-tilt">
        {COLUMNS.map((items, column) => (
          <div key={column} className="auth-collage-col" style={{ animationDuration: `${70 + column * 12}s`, animationDirection: column % 2 ? 'reverse' : 'normal' }}>
            <Fragment key="a">{items}</Fragment>
            <Fragment key="b">{items}</Fragment>
          </div>
        ))}
      </div>
    </div>
  );
}
