import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://plcliseudrcublpuweng.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsY2xpc2V1ZHJjdWJscHV3ZW5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njk4NTYyMywiZXhwIjoyMTAyNTYxNjIzfQ.SuFTJc3ApB8JhdviR0MBZoaeNb6YkPBkx5GYk714Les';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function mustInsert(table, rowOrRows) {
  const { data, error } = await supabase.from(table).insert(rowOrRows);
  if (error) {
    console.error(`[LỖI] Insert vào bảng ${table}:`, error);
    throw new Error(`Failed to insert into ${table}: ${error.message} - ${error.details || ''}`);
  }
}

async function seed() {
  console.log('=== BẮT ĐẦU TẠO DỮ LIỆU ĐƠN HÀNG MOCK VỚI ĐẦY ĐỦ QUY TRÌNH ===');

  const customerEmail = 'hung.nguyen@smartbox.vn';
  const techEmail = 'kythuat.truong@smartbox.vn';
  const adminId = 'edac1281-380c-400b-80e8-559205814402'; // Tổng Quản Trị Hệ Thống

  // 1. Kiểm tra / Lấy Auth Users
  const { data: usersData } = await supabase.auth.admin.listUsers();
  let customerUser = usersData.users.find(u => u.email === customerEmail);
  if (!customerUser) {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: customerEmail,
      password: 'SmartBox@2026!',
      email_confirm: true,
      user_metadata: { full_name: 'Nguyễn Văn Hưng', phone: '0988776655' }
    });
    if (error) throw error;
    customerUser = created.user;
  }

  let techUser = usersData.users.find(u => u.email === techEmail);
  if (!techUser) {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: techEmail,
      password: 'SmartBox@2026!',
      email_confirm: true,
      user_metadata: { full_name: 'Trương Kỹ Thuật', phone: '0912345678' }
    });
    if (error) throw error;
    techUser = created.user;
  }

  // Cập nhật Profiles
  await supabase.from('profiles').upsert([
    {
      id: customerUser.id,
      email: customerEmail,
      full_name: 'Nguyễn Văn Hưng',
      phone: '0988776655',
      default_address: 'Số 18, Phố Duy Tân, Cầu Giấy, Hà Nội',
      role: 'customer'
    },
    {
      id: techUser.id,
      email: techEmail,
      full_name: 'Trương Kỹ Thuật',
      phone: '0912345678',
      default_address: 'Trạm Kỹ Thuật SmartBox Cầu Giấy',
      role: 'technician'
    }
  ]);
  console.log('✓ Hồ sơ khách hàng & kỹ thuật viên đã sẵn sàng.');

  // 2. Sản phẩm & Biến thể
  const productId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
  const variantId = 'b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e';

  await supabase.from('products').upsert({
    id: productId,
    sku: 'SBX-PRO-85L',
    name: 'SmartBox Residential Pro 85L',
    price: 3500000,
    description: 'Tủ nhận hàng thông minh chống nước IP65, tích hợp cân điện tử và mở khóa mã OTP / App',
    stock_quantity: 25,
    is_active: true,
    manager_id: adminId
  });

  await supabase.from('product_variants').upsert({
    id: variantId,
    product_id: productId,
    sku: 'SBX-PRO-85L-METALLIC',
    variant_name: 'Bản Kim Loại Sơn Tĩnh Điện (Size L)',
    price_delta: 0,
    stock_quantity: 25,
    is_active: true,
    size: 'L',
    capacity_liter: 85
  });
  console.log('✓ Sản phẩm SmartBox Residential Pro 85L đã sẵn sàng.');

  // =========================================================================
  // XÓA DỮ LIỆU CŨ CỦA ĐƠN MOCK (ĐỂ ĐẢM BẢO SEED MỚI SẠCH SẼ)
  // =========================================================================
  const order1Id = '11111111-2222-3333-4444-555555555555';
  const order2Id = '22222222-3333-4444-5555-666666666666';

  await supabase.from('order_status_history').delete().in('order_id', [order1Id, order2Id]);
  await supabase.from('delivery_installation_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('delivery_installations').delete().in('order_id', [order1Id, order2Id]);
  await supabase.from('shipments').delete().in('order_id', [order1Id, order2Id]);
  await supabase.from('payments').delete().in('order_id', [order1Id, order2Id]);
  await supabase.from('order_item_approvals').delete().in('order_id', [order1Id, order2Id]);
  await supabase.from('ticket_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('approval_tickets').delete().in('order_id', [order1Id, order2Id]);
  await supabase.from('order_items').delete().in('order_id', [order1Id, order2Id]);
  await supabase.from('orders').delete().in('id', [order1Id, order2Id]);
  console.log('✓ Đã dọn dẹp các bản ghi mock cũ.');

  // =========================================================================
  // ĐƠN HÀNG 1: HOÀN TẤT TRỌN VẸN TOÀN BỘ QUY TRÌNH (COMPLETED)
  // Quy trình: PENDING -> AWAITING_PAYMENT -> PAID -> CONFIRMED -> PROCESSING -> SHIPPING -> DELIVERED -> COMPLETED
  // =========================================================================
  const order1ItemId = '11111111-aaaa-bbbb-cccc-555555555555';
  const order1TicketId = '11111111-dddd-eeee-ffff-555555555555';
  const order1PaymentId = '11111111-9999-8888-7777-555555555555';
  const order1ShipmentId = '11111111-6666-5555-4444-555555555555';
  const order1JobId = '11111111-4444-3333-2222-555555555555';

  const addressSnapshot = JSON.stringify({
    recipientName: 'Nguyễn Văn Hưng',
    phone: '0988776655',
    addressLine: 'Số 18, Phố Duy Tân, Cầu Giấy, Hà Nội',
    installationNote: 'Lắp đặt tại cổng chính biệt thự, hướng Tây Bắc',
    email: customerEmail
  });

  const t0 = new Date(Date.now() - 24 * 3600 * 1000).toISOString(); // 24h trước: Tạo đơn
  const t1 = new Date(Date.now() - 22 * 3600 * 1000).toISOString(); // 22h trước: PO Duyệt
  const t2 = new Date(Date.now() - 20 * 3600 * 1000).toISOString(); // 20h trước: Thanh toán VNPAY
  const t3 = new Date(Date.now() - 20 * 3600 * 1000 + 5000).toISOString(); // Xác nhận (Confirmed)
  const t4 = new Date(Date.now() - 16 * 3600 * 1000).toISOString(); // Kho chuẩn bị đóng gói (Processing)
  const t5 = new Date(Date.now() - 10 * 3600 * 1000).toISOString(); // Bàn giao vận chuyển VNPost (Shipping)
  const t6 = new Date(Date.now() - 3 * 3600 * 1000).toISOString();  // Giao tới nơi (Delivered)
  const t7 = new Date(Date.now() - 1 * 3600 * 1000).toISOString();  // Kỹ thuật nghiệm thu hoàn tất (Completed)

  // 1. Tạo Order 1
  await mustInsert('orders', {
    id: order1Id,
    user_id: customerUser.id,
    status: 'completed',
    shipping_address: 'Số 18, Phố Duy Tân, Cầu Giấy, Hà Nội',
    shipping_address_snapshot: addressSnapshot,
    tracking_number: 'VNPOST-HN-884920',
    total: 3500000,
    paid_at: t2,
    workflow_version: 2,
    inventory_released: false,
    created_at: t0,
    updated_at: t7
  });

  // 2. Order Item
  await mustInsert('order_items', {
    id: order1ItemId,
    order_id: order1Id,
    product_id: productId,
    variant_id: variantId,
    quantity: 1,
    unit_price: 3500000,
    sku_snapshot: 'SBX-PRO-85L-METALLIC',
    product_name_snapshot: 'SmartBox Residential Pro 85L',
    variant_name_snapshot: 'Bản Kim Loại Sơn Tĩnh Điện (Size L)',
    size_snapshot: 'L',
    capacity_liter_snapshot: 85
  });

  // 3. Approval Ticket & Items & History
  await mustInsert('approval_tickets', {
    id: order1TicketId,
    order_id: order1Id,
    status: 'APPROVED',
    review_round: 1,
    reason: 'Hồ sơ đơn hàng và vị trí lắp đặt đủ điều kiện kỹ thuật.',
    created_at: t0,
    updated_at: t1
  });

  await mustInsert('order_item_approvals', {
    id: '11111111-aaaa-1111-2222-333333333333',
    ticket_id: order1TicketId,
    order_id: order1Id,
    order_item_id: order1ItemId,
    product_id: productId,
    manager_id: adminId,
    status: 'APPROVED',
    reviewed_by: adminId,
    reviewed_at: t1,
    reason: 'Đã thẩm định thông số kích thước và dung tích 85L phù hợp vị trí.',
    created_at: t0
  });

  await mustInsert('ticket_history', [
    {
      id: '11111111-0001-0000-0000-000000000001',
      ticket_id: order1TicketId,
      action: 'SUBMITTED',
      actor_id: customerUser.id,
      reason: 'Khách hàng tạo đơn và gửi thẩm định PO',
      created_at: t0
    },
    {
      id: '11111111-0002-0000-0000-000000000002',
      ticket_id: order1TicketId,
      action: 'APPROVE',
      actor_id: adminId,
      reason: 'Đơn hàng hợp lệ, đã đối soát vị trí và phê duyệt sang bước thanh toán',
      created_at: t1
    }
  ]);

  // 4. Payment
  await mustInsert('payments', {
    id: order1PaymentId,
    order_id: order1Id,
    amount: 3500000,
    status: 'success',
    provider: 'vnpay',
    transaction_ref: 'VNP20261015892147',
    paid_at: t2,
    created_at: t2
  });

  // 5. Shipment
  await mustInsert('shipments', {
    id: order1ShipmentId,
    order_id: order1Id,
    carrier: 'VNPost Express',
    tracking_number: 'VNPOST-HN-884920',
    status: 'DELIVERED',
    created_at: t4,
    delivered_at: t6
  });

  // 6. Delivery Installation & History
  await mustInsert('delivery_installations', {
    id: order1JobId,
    order_id: order1Id,
    assigned_to: techUser.id,
    status: 'COMPLETED',
    scheduled_at: t5,
    started_at: t6,
    delivered_at: t6,
    installed_at: t7,
    completed_at: t7,
    installation_note: 'Gia cố 4 bulong M10 sàn bê tông, hiệu chuẩn cảm biến tải trọng (tare < 0.02kg), kết nối 4G thành công.',
    customer_accepted: true,
    acceptance_evidence: JSON.stringify({ ready: true, serialComplete: true, evidenceUrl: 'https://smartbox.vn/evidence/accept-884920.jpg', devices: [] }),
    attempt: 1,
    version: 1,
    created_at: t5,
    updated_at: t7
  });

  await mustInsert('delivery_installation_history', [
    {
      id: '11111111-0003-0000-0000-000000000001',
      job_id: order1JobId,
      actor_id: adminId,
      action: 'ASSIGNED',
      from_status: null,
      to_status: 'ASSIGNED',
      reason: 'Phân công kỹ thuật viên Trương Kỹ Thuật phụ trách lắp đặt',
      attempt: 1,
      version: 0,
      created_at: t5
    },
    {
      id: '11111111-0003-0000-0000-000000000002',
      job_id: order1JobId,
      actor_id: techUser.id,
      action: 'DELIVERED',
      from_status: 'ASSIGNED',
      to_status: 'DELIVERED',
      reason: 'Đã vận chuyển kiện hàng tới địa chỉ khách hàng',
      attempt: 1,
      version: 1,
      created_at: t6
    },
    {
      id: '11111111-0003-0000-0000-000000000003',
      job_id: order1JobId,
      actor_id: techUser.id,
      action: 'COMPLETED',
      from_status: 'DELIVERED',
      to_status: 'COMPLETED',
      reason: 'Lắp đặt cố định, kiểm tra cảm biến tải trọng và khách hàng ký biên bản nghiệm thu',
      attempt: 1,
      version: 1,
      created_at: t7
    }
  ]);

  // 7. Order Status History (Đầy đủ 8 bước tiến trình từ PENDING -> COMPLETED)
  await mustInsert('order_status_history', [
    {
      id: '11111111-0004-0000-0000-000000000001',
      order_id: order1Id,
      from_status: null,
      to_status: 'pending',
      changed_by: customerUser.id,
      reason: 'Khách hàng khởi tạo đơn hàng từ website (Chờ thẩm định PO)',
      created_at: t0
    },
    {
      id: '11111111-0004-0000-0000-000000000002',
      order_id: order1Id,
      from_status: 'pending',
      to_status: 'awaiting_payment',
      changed_by: adminId,
      reason: 'PO Ticket đã được phê duyệt, cấp hạn thanh toán 30 phút',
      created_at: t1
    },
    {
      id: '11111111-0004-0000-0000-000000000003',
      order_id: order1Id,
      from_status: 'awaiting_payment',
      to_status: 'paid',
      changed_by: 'GATEWAY_VNPAY',
      reason: 'Thanh toán 3.500.000 ₫ thành công qua VNPAY (Mã GD: VNP20261015892147)',
      created_at: t2
    },
    {
      id: '11111111-0004-0000-0000-000000000004',
      order_id: order1Id,
      from_status: 'paid',
      to_status: 'confirmed',
      changed_by: 'SYSTEM',
      reason: 'Hệ thống tự động xác nhận đơn hàng, sẵn sàng xuất kho',
      created_at: t3
    },
    {
      id: '11111111-0004-0000-0000-000000000005',
      order_id: order1Id,
      from_status: 'confirmed',
      to_status: 'processing',
      changed_by: adminId,
      reason: 'Bộ phận kho đang kiểm tra linh kiện và đóng gói tiêu chuẩn',
      created_at: t4
    },
    {
      id: '11111111-0004-0000-0000-000000000006',
      order_id: order1Id,
      from_status: 'processing',
      to_status: 'shipping',
      changed_by: adminId,
      reason: 'Đã bàn giao đơn vị vận chuyển VNPost Express (Vận đơn: VNPOST-HN-884920)',
      created_at: t5
    },
    {
      id: '11111111-0004-0000-0000-000000000007',
      order_id: order1Id,
      from_status: 'shipping',
      to_status: 'delivered',
      changed_by: techUser.id,
      reason: 'Kiện hàng đã tới địa chỉ người nhận, kỹ thuật viên tiếp nhận thi công',
      created_at: t6
    },
    {
      id: '11111111-0004-0000-0000-000000000008',
      order_id: order1Id,
      from_status: 'delivered',
      to_status: 'completed',
      changed_by: techUser.id,
      reason: 'Lắp đặt hoàn thiện, khách hàng nghiệm thu thành công và kích hoạt bảo hành điện tử',
      created_at: t7
    }
  ]);
  console.log('✓ ĐÃ TẠO XONG ĐƠN HÀNG 1 (HOÀN TẤT VỚI ĐẦY ĐỦ 8 BƯỚC TIMELINE).');

  // =========================================================================
  // ĐƠN HÀNG 2: ĐANG CHỜ DUYỆT PO (PENDING) ĐỂ TEST THAO TÁC NÚT PHÊ DUYỆT
  // =========================================================================
  const order2ItemId = '22222222-aaaa-bbbb-cccc-666666666666';
  const order2TicketId = '22222222-dddd-eeee-ffff-666666666666';
  const nowStr = new Date().toISOString();

  await mustInsert('orders', {
    id: order2Id,
    user_id: customerUser.id,
    status: 'pending',
    shipping_address: 'Tòa nhà Landmark 72, Phạm Hùng, Nam Từ Liêm, Hà Nội',
    shipping_address_snapshot: JSON.stringify({
      recipientName: 'Nguyễn Văn Hưng',
      phone: '0988776655',
      addressLine: 'Tòa nhà Landmark 72, Phạm Hùng, Nam Từ Liêm, Hà Nội',
      installationNote: 'Lắp đặt tại sảnh tầng 1 khu căn hộ',
      email: customerEmail
    }),
    tracking_number: null,
    total: 3500000,
    workflow_version: 2,
    inventory_released: false,
    created_at: nowStr,
    updated_at: nowStr
  });

  await mustInsert('order_items', {
    id: order2ItemId,
    order_id: order2Id,
    product_id: productId,
    variant_id: variantId,
    quantity: 1,
    unit_price: 3500000,
    sku_snapshot: 'SBX-PRO-85L-METALLIC',
    product_name_snapshot: 'SmartBox Residential Pro 85L',
    variant_name_snapshot: 'Bản Kim Loại Sơn Tĩnh Điện (Size L)',
    size_snapshot: 'L',
    capacity_liter_snapshot: 85
  });

  await mustInsert('approval_tickets', {
    id: order2TicketId,
    order_id: order2Id,
    status: 'PENDING',
    review_round: 1,
    reason: null,
    created_at: nowStr,
    updated_at: nowStr
  });

  await mustInsert('order_item_approvals', {
    id: '22222222-aaaa-1111-2222-333333333333',
    ticket_id: order2TicketId,
    order_id: order2Id,
    order_item_id: order2ItemId,
    product_id: productId,
    manager_id: adminId,
    status: 'PENDING',
    created_at: nowStr
  });

  await mustInsert('ticket_history', {
    id: '22222222-0001-0000-0000-000000000001',
    ticket_id: order2TicketId,
    action: 'SUBMITTED',
    actor_id: customerUser.id,
    reason: 'Khách hàng tạo đơn mới, chờ quản lý duyệt PO',
    created_at: nowStr
  });

  await mustInsert('order_status_history', {
    id: '22222222-0004-0000-0000-000000000001',
    order_id: order2Id,
    from_status: null,
    to_status: 'pending',
    changed_by: customerUser.id,
    reason: 'Khởi tạo đơn hàng từ giỏ hàng (Chờ thẩm định PO)',
    created_at: nowStr
  });

  console.log('✓ ĐÃ TẠO XONG ĐƠN HÀNG 2 (PENDING CHỜ DUYỆT PO).');
  console.log('=== SEED HOÀN THÀNH XUẤT SẮC ===');
}

seed().catch(err => {
  console.error('Lỗi khi seed mock orders:', err);
  process.exit(1);
});
