import { API_CONFIG, delay } from './client';
import { Order, CreateOrderPayload } from '../types/order';
import { MOCK_ORDERS } from '../mocks/orders';

const STORAGE_ORDERS_KEY = 'smartbox_shop_orders';

const getLocalOrders = (): Order[] => {
  try {
    const raw = localStorage.getItem(STORAGE_ORDERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(MOCK_ORDERS));
      return MOCK_ORDERS;
    }
    return JSON.parse(raw);
  } catch {
    return MOCK_ORDERS;
  }
};

const saveLocalOrders = (orders: Order[]) => {
  try {
    localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error('Failed to persist orders', err);
  }
};

export const orderApi = {
  /**
   * Tạo đơn hàng mới
   */
  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    if (API_CONFIG.useMock) {
      await delay(400);
      const subtotal = payload.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const nowStr = new Date().toISOString();
      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        code: `SBOX-ORD-2026-${randomSuffix}`,
        userId: 'usr-001',
        items: payload.items,
        shippingAddress: payload.shippingAddress,
        paymentMethod: payload.paymentMethod,
        paymentStatus: 'UNPAID',
        shippingFee: 0, // Miễn phí giao hàng toàn quốc
        subtotal,
        total: subtotal,
        status: 'PENDING',
        statusHistory: [
          {
            status: 'PENDING',
            timestamp: new Date().toLocaleString('vi-VN'),
            note: 'Đơn hàng mới được tạo thành công trên hệ thống'
          }
        ],
        createdAt: nowStr,
        updatedAt: nowStr
      };

      const current = getLocalOrders();
      const updated = [newOrder, ...current];
      saveLocalOrders(updated);
      return newOrder;
    }

    const res = await fetch(`${API_CONFIG.baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Không thể tạo đơn hàng');
    return res.json();
  },

  /**
   * Lấy danh sách đơn hàng của người dùng hiện tại
   */
  async getMyOrders(): Promise<Order[]> {
    if (API_CONFIG.useMock) {
      await delay(250);
      return getLocalOrders();
    }

    const res = await fetch(`${API_CONFIG.baseUrl}/orders/my-orders`);
    if (!res.ok) throw new Error('Không thể tải danh sách đơn hàng');
    return res.json();
  },

  /**
   * Lấy chi tiết một đơn hàng theo ID hoặc Mã đơn
   */
  async getOrderById(idOrCode: string): Promise<Order | null> {
    if (API_CONFIG.useMock) {
      await delay(200);
      const orders = getLocalOrders();
      const order = orders.find(
        (o) => o.id === idOrCode || o.code.toLowerCase() === idOrCode.toLowerCase()
      );
      return order || null;
    }

    const res = await fetch(`${API_CONFIG.baseUrl}/orders/${idOrCode}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error('Không thể tải chi tiết đơn hàng');
    }
    return res.json();
  },

  /**
   * Hủy đơn hàng (nếu đang ở trạng thái PENDING)
   */
  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    if (API_CONFIG.useMock) {
      await delay(300);
      const orders = getLocalOrders();
      const idx = orders.findIndex((o) => o.id === orderId);
      if (idx === -1) throw new Error('Không tìm thấy đơn hàng cần hủy');
      
      const order = orders[idx];
      if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
        throw new Error('Chỉ có thể hủy đơn hàng khi đơn chưa được xử lý đóng gói');
      }

      const updatedOrder: Order = {
        ...order,
        status: 'CANCELLED',
        statusHistory: [
          ...order.statusHistory,
          {
            status: 'CANCELLED',
            timestamp: new Date().toLocaleString('vi-VN'),
            note: reason || 'Khách hàng yêu cầu hủy đơn qua giao diện web'
          }
        ],
        updatedAt: new Date().toISOString()
      };

      orders[idx] = updatedOrder;
      saveLocalOrders(orders);
      return updatedOrder;
    }

    const res = await fetch(`${API_CONFIG.baseUrl}/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) throw new Error('Không thể hủy đơn hàng');
    return res.json();
  }
};
