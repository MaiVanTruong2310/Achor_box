import { Link } from 'react-router-dom';
import { customer } from '../api/customer';
import { useShop } from '../ShopContext';
import { AccountNav, ResourceState, useResource } from '../components/ShopUi';

export function AccountHome() {
  const { user } = useShop();
  const profile = useResource(signal => customer.profile(signal), user!.userId);
  const name = profile.data?.fullName || user!.fullName || 'bạn';
  return <section className="container section account-home">
    <AccountNav />
    <p className="eyebrow">TÀI KHOẢN ANCHORBOX</p>
    <div className="account-welcome">
      <span className="account-avatar" aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span>
      <div><h1>Xin chào, {name}.</h1><p className="muted">{profile.data?.email || user!.email}</p></div>
    </div>
    <ResourceState {...profile} />
    <p>Quản lý thông tin cá nhân, địa chỉ nhận hàng và các đơn mua của bạn.</p>
    <div className="account-grid">
      {[
        ['/account/orders', 'Đơn hàng của tôi', 'Xem trạng thái xét duyệt, thanh toán và giao lắp.'],
        ['/account/profile', 'Thông tin cá nhân', 'Cập nhật họ tên, số điện thoại và đổi mật khẩu.'],
        ['/account/addresses', 'Sổ địa chỉ', 'Lưu địa chỉ nhận hàng để sử dụng khi đặt hàng.'],
        ['/account/warranty', 'Bảo hành', 'Theo dõi bảo hành và gửi yêu cầu hỗ trợ.'],
        ['/products', 'Tiếp tục mua sắm', 'Khám phá các sản phẩm và cấu hình đang bán.'],
      ].map(([to, title, description]) => <Link className="panel account-card" key={to} to={to}><h2>{title} <span aria-hidden="true">↗</span></h2><p className="muted">{description}</p></Link>)}
    </div>
  </section>;
}
