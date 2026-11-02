-- Anchor Box catalog seed: 3 box lines (Base, Pro, Solar Max) and their capacity variants.
-- Idempotent: re-running refreshes names/specs/prices but never overwrites live stock.
-- SKUs double as URL slugs: /products/anchorbox-base resolves through the SKU lookup in web-shop.
-- Requires changeset 024 (color columns, warranty_plans). Colors are variant dimensions (stock per color);
-- warranty plans are paid extensions the server adds to unit price and warranty months.
-- Pro and Solar Max are upgrade lines that are not sold yet (stock 0, see landing LINEUP).
-- Base hardware has a load cell (HX711), so has_weight_sensor = true; model_tier is left NULL
-- because the BASE/PRO tier constraint ties BASE to "no sensor", which does not match the device.

BEGIN;

UPDATE public.product_categories
SET name = 'Hộp nhận hàng thông minh Anchor Box',
    description = 'Các dòng hộp nhận bưu kiện thông minh Anchor Box cho nhà phố, căn hộ và biệt thự.'
WHERE id = '11111111-1111-1111-1111-111111111101';

INSERT INTO public.products (id, category_id, sku, name, description, price, images, stock_quantity, is_active, has_weight_sensor)
VALUES
  ('ab000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111101', 'ANCHORBOX-BASE', 'Anchor Box Base',
   'Hộp nhận bưu kiện thông minh cho nhà phố và căn hộ. Khóa kép gồm chốt điện 12 V và servo gài chốt, cân nhận biết bưu kiện từ 50 g, cảm biến cửa tự khóa lại sau 2 giây, bàn phím 4×4 và màn hình LCD. Kết nối Wi-Fi 2,4 GHz: tạo mã PIN dùng một lần cho shipper, mở hộp từ xa và nhận thông báo khi có hàng qua ứng dụng.',
   2490000, '["/products/smartbox-std-front.svg", "/products/smartbox-std-inside.svg", "/products/smartbox-std-diagram.svg"]'::jsonb, 0, true, true),
  ('ab000000-0000-4000-8000-000000000002', '11111111-1111-1111-1111-111111111101', 'ANCHORBOX-PRO', 'Anchor Box Pro',
   'Mọi tính năng của bản Base, bổ sung camera giám sát lúc giao hàng và pin dự phòng để hộp vẫn nhận mã khi mất điện. Phiên bản nâng cấp đang hoàn thiện, liên hệ để đặt trước.',
   3890000, '["/products/smartbox-plus-front.svg", "/products/smartbox-std-inside.svg"]'::jsonb, 0, true, true),
  ('ab000000-0000-4000-8000-000000000003', '11111111-1111-1111-1111-111111111101', 'ANCHORBOX-SOLAR', 'Anchor Box Solar Max',
   'Mọi tính năng của bản Pro, thêm tấm pin mặt trời và khoang chứa lớn hơn cho nơi khó kéo dây điện. Phiên bản nâng cấp đang hoàn thiện, liên hệ để đặt trước.',
   4990000, '["/products/smartbox-promax-front.svg", "/products/smartbox-std-inside.svg"]'::jsonb, 0, true, true)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  sku = EXCLUDED.sku,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  images = EXCLUDED.images,
  is_active = EXCLUDED.is_active,
  has_weight_sensor = EXCLUDED.has_weight_sensor;

INSERT INTO public.product_variants (id, product_id, variant_name, sku, price_delta, stock_quantity, is_active, size, capacity_liter, model_tier,
                                     width_cm, height_cm, depth_cm, weight_kg, max_load_kg, has_weight_sensor, warranty_months, color_name, color_hex)
VALUES
  ('ab000000-0000-4000-8000-000000000101', 'ab000000-0000-4000-8000-000000000001', 'Anchor Box Base 45 L · Xám than', 'ANCHORBOX-BASE-45L-GRAY', 0, 28, true, 'S', 45, NULL, 45, 85, 38, 16.5, 40, true, 24, 'Xám than', '#4B4846'),
  ('ab000000-0000-4000-8000-000000000104', 'ab000000-0000-4000-8000-000000000001', 'Anchor Box Base 45 L · Trắng sứ', 'ANCHORBOX-BASE-45L-WHITE', 0, 10, true, 'S', 45, NULL, 45, 85, 38, 16.5, 40, true, 24, 'Trắng sứ', '#EDEDEA'),
  ('ab000000-0000-4000-8000-000000000102', 'ab000000-0000-4000-8000-000000000001', 'Anchor Box Base 75 L · Xám than', 'ANCHORBOX-BASE-75L-GRAY', 800000, 15, true, 'M', 75, NULL, 50, 98, 45, 19.5, 50, true, 24, 'Xám than', '#4B4846'),
  ('ab000000-0000-4000-8000-000000000105', 'ab000000-0000-4000-8000-000000000001', 'Anchor Box Base 75 L · Trắng sứ', 'ANCHORBOX-BASE-75L-WHITE', 800000, 6, true, 'M', 75, NULL, 50, 98, 45, 19.5, 50, true, 24, 'Trắng sứ', '#EDEDEA'),
  ('ab000000-0000-4000-8000-000000000201', 'ab000000-0000-4000-8000-000000000002', 'Anchor Box Pro 45 L · Xám than', 'ANCHORBOX-PRO-45L-GRAY', 0, 0, true, 'S', 45, NULL, 45, 85, 38, 17.5, 40, true, 24, 'Xám than', '#4B4846'),
  ('ab000000-0000-4000-8000-000000000204', 'ab000000-0000-4000-8000-000000000002', 'Anchor Box Pro 45 L · Trắng sứ', 'ANCHORBOX-PRO-45L-WHITE', 0, 0, true, 'S', 45, NULL, 45, 85, 38, 17.5, 40, true, 24, 'Trắng sứ', '#EDEDEA'),
  ('ab000000-0000-4000-8000-000000000202', 'ab000000-0000-4000-8000-000000000002', 'Anchor Box Pro 75 L · Xám than', 'ANCHORBOX-PRO-75L-GRAY', 800000, 0, true, 'M', 75, NULL, 50, 98, 45, 21.0, 60, true, 24, 'Xám than', '#4B4846'),
  ('ab000000-0000-4000-8000-000000000205', 'ab000000-0000-4000-8000-000000000002', 'Anchor Box Pro 75 L · Trắng sứ', 'ANCHORBOX-PRO-75L-WHITE', 800000, 0, true, 'M', 75, NULL, 50, 98, 45, 21.0, 60, true, 24, 'Trắng sứ', '#EDEDEA'),
  ('ab000000-0000-4000-8000-000000000203', 'ab000000-0000-4000-8000-000000000002', 'Anchor Box Pro 110 L · Xám than', 'ANCHORBOX-PRO-110L-GRAY', 1600000, 0, true, 'L', 110, NULL, 58, 112, 50, 25.5, 80, true, 24, 'Xám than', '#4B4846'),
  ('ab000000-0000-4000-8000-000000000206', 'ab000000-0000-4000-8000-000000000002', 'Anchor Box Pro 110 L · Trắng sứ', 'ANCHORBOX-PRO-110L-WHITE', 1600000, 0, true, 'L', 110, NULL, 58, 112, 50, 25.5, 80, true, 24, 'Trắng sứ', '#EDEDEA'),
  ('ab000000-0000-4000-8000-000000000301', 'ab000000-0000-4000-8000-000000000003', 'Anchor Box Solar Max 75 L · Xám than', 'ANCHORBOX-SOLAR-75L-GRAY', 0, 0, true, 'M', 75, NULL, 50, 98, 45, 23.0, 60, true, 36, 'Xám than', '#4B4846'),
  ('ab000000-0000-4000-8000-000000000303', 'ab000000-0000-4000-8000-000000000003', 'Anchor Box Solar Max 75 L · Trắng sứ', 'ANCHORBOX-SOLAR-75L-WHITE', 0, 0, true, 'M', 75, NULL, 50, 98, 45, 23.0, 60, true, 36, 'Trắng sứ', '#EDEDEA'),
  ('ab000000-0000-4000-8000-000000000302', 'ab000000-0000-4000-8000-000000000003', 'Anchor Box Solar Max 110 L · Xám than', 'ANCHORBOX-SOLAR-110L-GRAY', 800000, 0, true, 'L', 110, NULL, 58, 112, 50, 27.5, 80, true, 36, 'Xám than', '#4B4846'),
  ('ab000000-0000-4000-8000-000000000304', 'ab000000-0000-4000-8000-000000000003', 'Anchor Box Solar Max 110 L · Trắng sứ', 'ANCHORBOX-SOLAR-110L-WHITE', 800000, 0, true, 'L', 110, NULL, 58, 112, 50, 27.5, 80, true, 36, 'Trắng sứ', '#EDEDEA')
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id, variant_name = EXCLUDED.variant_name, sku = EXCLUDED.sku, price_delta = EXCLUDED.price_delta,
  is_active = EXCLUDED.is_active, size = EXCLUDED.size, capacity_liter = EXCLUDED.capacity_liter, model_tier = EXCLUDED.model_tier,
  width_cm = EXCLUDED.width_cm, height_cm = EXCLUDED.height_cm, depth_cm = EXCLUDED.depth_cm, weight_kg = EXCLUDED.weight_kg,
  max_load_kg = EXCLUDED.max_load_kg, has_weight_sensor = EXCLUDED.has_weight_sensor, warranty_months = EXCLUDED.warranty_months,
  color_name = EXCLUDED.color_name, color_hex = EXCLUDED.color_hex;

INSERT INTO public.warranty_plans (id, code, name, extra_months, price, sort_order, is_active)
VALUES
  ('ab000000-0000-4000-8000-000000009006', 'EXT-6M', 'Gói bảo hành +6 tháng', 6, 290000, 1, true),
  ('ab000000-0000-4000-8000-000000009012', 'EXT-12M', 'Gói bảo hành +12 tháng', 12, 490000, 2, true)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code, name = EXCLUDED.name, extra_months = EXCLUDED.extra_months, price = EXCLUDED.price,
  sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

INSERT INTO public.inventory_movements (id, variant_id, order_id, delta, reason, actor_id, created_at)
VALUES
  ('ab000000-0000-4000-8000-000000001101', 'ab000000-0000-4000-8000-000000000101', NULL, 28, 'INITIAL_STOCK', NULL, now()),
  ('ab000000-0000-4000-8000-000000001102', 'ab000000-0000-4000-8000-000000000102', NULL, 15, 'INITIAL_STOCK', NULL, now()),
  ('ab000000-0000-4000-8000-000000001104', 'ab000000-0000-4000-8000-000000000104', NULL, 10, 'INITIAL_STOCK', NULL, now()),
  ('ab000000-0000-4000-8000-000000001105', 'ab000000-0000-4000-8000-000000000105', NULL, 6, 'INITIAL_STOCK', NULL, now())
ON CONFLICT (id) DO NOTHING;

UPDATE public.products p
SET stock_quantity = COALESCE((SELECT sum(v.stock_quantity) FROM public.product_variants v WHERE v.product_id = p.id AND v.is_active), 0)
WHERE p.id IN ('ab000000-0000-4000-8000-000000000001', 'ab000000-0000-4000-8000-000000000002', 'ab000000-0000-4000-8000-000000000003');

COMMIT;
