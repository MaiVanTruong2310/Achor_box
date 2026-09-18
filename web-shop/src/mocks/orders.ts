import { Order } from '../types/order';

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    code: 'SBOX-ORD-2026-8801',
    userId: 'usr-001',
    items: [
      {
        productId: 'smart-box-std',
        sku: 'SBOX-STD-01',
        name: 'Anchor Box Standard',
        price: 899000,
        quantity: 1,
        image: '/products/smartbox-std-front.svg'
      }
    ],
    shippingAddress: {
      fullName: 'Nguyễn Văn An',
      phone: '0912345678',
      email: 'an.nguyen@example.com',
      address: 'Số 12 Chùa Bộc, Phường Quang Trung, Quận Đống Đa, Hà Nội',
      province: 'Hà Nội',
      note: 'Giao giờ hành chính, gọi trước khi giao'
    },
    paymentMethod: 'COD',
    paymentStatus: 'PAID',
    shippingFee: 0,
    subtotal: 899000,
    total: 899000,
    status: 'COMPLETED',
    statusHistory: [
      { status: 'PENDING', timestamp: '2026-03-10 09:15', note: 'Đơn hàng được tiếp nhận thành công' },
      { status: 'CONFIRMED', timestamp: '2026-03-10 10:30', note: 'Đã xác nhận thông tin đơn hàng và địa chỉ' },
      { status: 'PROCESSING', timestamp: '2026-03-10 14:00', note: 'Đang kiểm tra chất lượng và đóng gói thiết bị' },
      { status: 'SHIPPING', timestamp: '2026-03-11 08:30', note: 'Đã bàn giao đơn vị vận chuyển' },
      { status: 'COMPLETED', timestamp: '2026-03-12 16:45', note: 'Giao hàng thành công' }
    ],
    createdAt: '2026-03-10T09:15:00Z',
    updatedAt: '2026-03-12T16:45:00Z'
  },
  {
    id: 'ord-1002',
    code: 'SBOX-ORD-2026-8802',
    userId: 'usr-001',
    items: [
      {
        productId: 'smart-box-plus',
        sku: 'SBOX-PLS-02',
        name: 'Anchor Box Plus',
        price: 1199000,
        quantity: 1,
        image: '/products/smartbox-plus-front.svg'
      },
      {
        productId: 'smart-box-keypad-module',
        sku: 'SBOX-ACC-01',
        name: 'Bàn Phím Mã PIN Chống Nước (Phụ Kiện)',
        price: 149000,
        quantity: 1,
        image: '/products/accessory-keypad.svg'
      }
    ],
    shippingAddress: {
      fullName: 'Nguyễn Văn An',
      phone: '0912345678',
      email: 'an.nguyen@example.com',
      address: 'Số 12 Chùa Bộc, Phường Quang Trung, Quận Đống Đa, Hà Nội',
      province: 'Hà Nội',
      note: 'Lắp đặt tại cổng chính'
    },
    paymentMethod: 'COD',
    paymentStatus: 'UNPAID',
    shippingFee: 0,
    subtotal: 1348000,
    total: 1348000,
    status: 'SHIPPING',
    statusHistory: [
      { status: 'PENDING', timestamp: '2026-03-15 11:20', note: 'Đơn hàng được tiếp nhận' },
      { status: 'CONFIRMED', timestamp: '2026-03-15 13:00', note: 'Đã xác nhận đơn hàng' },
      { status: 'PROCESSING', timestamp: '2026-03-15 16:30', note: 'Đang kiểm tra chất lượng và chuẩn bị hàng' },
      { status: 'SHIPPING', timestamp: '2026-03-16 09:00', note: 'Đang vận chuyển tới địa chỉ nhận hàng' }
    ],
    createdAt: '2026-03-15T11:20:00Z',
    updatedAt: '2026-03-16T09:00:00Z'
  },
  {
    id: 'ord-1003',
    code: 'SBOX-ORD-2026-8803',
    userId: 'usr-001',
    items: [
      {
        productId: 'smart-box-std',
        sku: 'SBOX-STD-01',
        name: 'Anchor Box Standard',
        price: 899000,
        quantity: 1,
        image: '/products/smartbox-std-front.svg'
      }
    ],
    shippingAddress: {
      fullName: 'Nguyễn Văn An',
      phone: '0912345678',
      email: 'an.nguyen@example.com',
      address: 'Số 18 Đường Láng, Đống Đa, Hà Nội',
      province: 'Hà Nội',
      note: ''
    },
    paymentMethod: 'COD',
    paymentStatus: 'UNPAID',
    shippingFee: 0,
    subtotal: 899000,
    total: 899000,
    status: 'PROCESSING',
    statusHistory: [
      { status: 'PENDING', timestamp: '2026-03-17 08:00', note: 'Đơn hàng được tiếp nhận' },
      { status: 'CONFIRMED', timestamp: '2026-03-17 08:30', note: 'Đã xác nhận đơn hàng' },
      { status: 'PROCESSING', timestamp: '2026-03-17 09:00', note: 'Đang chuẩn bị sản phẩm và đóng hộp' }
    ],
    createdAt: '2026-03-17T08:00:00Z',
    updatedAt: '2026-03-17T09:00:00Z'
  }
];
