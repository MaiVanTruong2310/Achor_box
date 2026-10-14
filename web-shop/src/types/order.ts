export type OrderStatus =
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'PENDING'     // Chờ xác nhận
  | 'CONFIRMED'   // Đã xác nhận
  | 'PROCESSING'  // Đang chuẩn bị
  | 'SHIPPING'    // Đang giao
  | 'COMPLETED'   // Hoàn thành
  | 'CANCELLED';  // Đã hủy

export const ORDER_STATUS_LABELS: Record<OrderStatus, { label: string; color: string; description: string }> = {
  AWAITING_PAYMENT: { label: 'Chờ thanh toán', color: 'amber', description: 'Đơn đang chờ xác nhận thanh toán' },
  PAID: { label: 'Đã thanh toán', color: 'sky', description: 'Chờ duyệt đơn và phân công giao/lắp đặt' },
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
    label: 'Đã nghiệm thu',
    color: 'emerald',
    description: 'Giao và lắp đặt đã được nghiệm thu đạt'
  },
  CANCELLED: {
    label: 'Đã hủy',
    color: 'rose',
    description: 'Đơn hàng đã bị hủy theo yêu cầu'
  }
};

export interface OrderItem {
  variantId?: string;
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
  timeline?: { id: string; source: string; action: string; occurredAt: string; attempt?: number }[];
  payment?: import('../api/paymentApi').PaymentInfo | null;
  deliveryInstallation?: DeliveryProgress | null;
  id: string;
  code: string;
  userId?: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: 'COD' | 'BANK_TRANSFER' | 'VNPAY';
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
  addressId?: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: 'COD' | 'BANK_TRANSFER' | 'VNPAY';
  note?: string;
}

export interface DeliveryProgress { status: string; scheduledAt: string; startedAt: string | null; deliveredAt: string | null; installedAt: string | null; completedAt: string | null; customerAccepted: boolean }
export const DELIVERY_LABELS: Record<string, string> = { ASSIGNED: 'Đã lên lịch', IN_PROGRESS: 'Đang giao và lắp đặt', DELIVERED: 'Đã giao thiết bị', INSTALLED: 'Đã lắp đặt, chờ nghiệm thu', COMPLETED: 'Đã nghiệm thu đạt', FAILED: 'Cần điều chỉnh lịch thực hiện' };
