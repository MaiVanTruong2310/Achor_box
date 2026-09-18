export type OrderStatus =
  | 'PENDING'     // Chờ xác nhận
  | 'CONFIRMED'   // Đã xác nhận
  | 'PROCESSING'  // Đang chuẩn bị
  | 'SHIPPING'    // Đang giao
  | 'COMPLETED'   // Hoàn thành
  | 'CANCELLED';  // Đã hủy

export const ORDER_STATUS_LABELS: Record<OrderStatus, { label: string; color: string; description: string }> = {
  PENDING: {
    label: 'Chờ xác nhận',
    color: 'amber',
    description: 'Đơn hàng mới tạo, đang đợi hệ thống xác nhận'
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    color: 'sky',
    description: 'Đơn hàng đã được xác nhận thông tin'
  },
  PROCESSING: {
    label: 'Đang chuẩn bị hàng',
    color: 'blue',
    description: 'Đang kiểm tra linh kiện và đóng gói thiết bị'
  },
  SHIPPING: {
    label: 'Đang giao hàng',
    color: 'indigo',
    description: 'Đơn hàng đang trên đường vận chuyển tới địa chỉ'
  },
  COMPLETED: {
    label: 'Giao thành công',
    color: 'emerald',
    description: 'Khách hàng đã nhận thiết bị và kích hoạt bảo hành'
  },
  CANCELLED: {
    label: 'Đã hủy',
    color: 'rose',
    description: 'Đơn hàng đã bị hủy theo yêu cầu'
  }
};

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  province?: string;
  note?: string;
}

export interface Order {
  id: string;
  code: string;
  userId?: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: 'COD' | 'BANK_TRANSFER';
  paymentStatus: 'UNPAID' | 'PAID';
  shippingFee: number;
  subtotal: number;
  total: number;
  status: OrderStatus;
  statusHistory: Array<{
    status: OrderStatus;
    timestamp: string;
    note: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: 'COD' | 'BANK_TRANSFER';
  note?: string;
}
