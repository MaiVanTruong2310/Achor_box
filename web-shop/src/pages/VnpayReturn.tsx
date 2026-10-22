import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { request } from '../api/shop';
import { type CustomerOrder } from '../api/customer';
import { ResourceState, useResource } from '../components/ShopUi';
import { useShop } from '../ShopContext';
export function VnpayReturn() {
  const [params] = useSearchParams(); const { user } = useShop();
  const resource = useResource(async signal => {
    const result = await request<{ paymentId: string }>(`/payments/vnpay/return?${params.toString()}`, { signal }, false);
    return request<CustomerOrder>(`/customer/orders/by-payment/${encodeURIComponent(result.paymentId)}`, { signal });
  }, `${user?.userId}:${params.toString()}`);
  if (resource.data) return <Navigate replace to={`/payment/result?orderId=${encodeURIComponent(resource.data.id)}`}/>;
  return <section className="container section"><h1>Đang xác minh thanh toán.</h1><p>Kết quả được lấy từ máy chủ sau thông báo của cổng thanh toán.</p><ResourceState {...resource}/><Link to="/account/orders">Kiểm tra đơn hàng của tôi</Link></section>;
}
