import type { BoxModel, BoxSize } from './types';

/** Display catalog. Replace with validated public product/variant API data when available. */
export const catalog = {
  base: { name: 'SmartBox Tiêu Chuẩn', label: 'SmartBox Base', tagline: 'Đơn giản. An toàn. Tin cậy.', description: 'Đầy đủ những gì bạn cần để nhận hàng an toàn: khóa điện tử, điều khiển từ xa và sự an tâm mỗi ngày.', prices: [1290000, 1690000, 2190000], features: ['Khóa điện tử', 'Điều khiển từ xa qua ứng dụng', 'Trạng thái cửa & lịch sử hoạt động', 'Thông báo theo thời gian thực'] },
  pro: { name: 'SmartBox Pro', label: 'SmartBox Pro', tagline: 'Thêm một bước thông minh.', description: 'Trọn vẹn tính năng cơ bản, thêm cảm biến khối lượng thông minh để nhận biết khi kiện hàng đã đến.', prices: [1690000, 2190000, 2790000], features: ['Mọi tính năng của SmartBox Base', 'Cảm biến khối lượng thông minh', 'Nhận biết kiện hàng trong hộp', 'Công nghệ loadcell + HX711'] },
};
export const sizes: BoxSize[] = ['S', 'M', 'L'];
export const capacities = [45, 85, 150];
export const getVariantPrice = (model: BoxModel, size: BoxSize) => catalog[model].prices[sizes.indexOf(size)];
