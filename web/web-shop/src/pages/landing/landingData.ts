import {
  BellRing,
  DoorClosed,
  Grid3x3,
  LockKeyhole,
  PlugZap,
  Scale,
  ShieldAlert,
  Wifi,
  type LucideIcon,
} from 'lucide-react';

/*
 * Every number below comes from the Base hardware actually built for this project:
 * device/firmware/include/config.h (thresholds, timings, pins) and the Altium schematic
 * device/pcb/MainSCH.SchDoc (LM2576 buck, VIN 9–24 V, AO3400 solenoid driver, PCF8574, LCD 1602).
 * Do not add marketing figures that the hardware cannot back up.
 */

export type Tint = 'green' | 'orange' | 'yellow' | 'blue' | 'teal' | 'indigo' | 'red';

export interface HardwareTile {
  icon: LucideIcon;
  name: string;
  status: string;
  detail: string;
  tint: Tint;
  on?: boolean;
}

export const HARDWARE_TILES: HardwareTile[] = [
  { icon: LockKeyhole, name: 'Khóa kép', status: 'Đã khóa', detail: 'Chốt điện 12 V kết hợp servo gài chốt', tint: 'blue', on: true },
  { icon: Scale, name: 'Cân bưu kiện', status: '1,25 kg', detail: 'Loadcell + HX711, nhận hàng từ 50 g', tint: 'orange', on: true },
  { icon: DoorClosed, name: 'Cảm biến cửa', status: 'Đã đóng', detail: 'Công tắc từ MC-38, tự khóa sau 2 giây', tint: 'teal' },
  { icon: Grid3x3, name: 'Bàn phím & màn hình', status: 'Chờ mã', detail: 'Bàn phím 4×4 và LCD 16×2', tint: 'indigo' },
  { icon: ShieldAlert, name: 'Chống dò mã', status: 'Sẵn sàng', detail: 'Sai 3 lần, khóa bàn phím 60 giây', tint: 'red' },
  { icon: Wifi, name: 'Kết nối', status: 'Trực tuyến', detail: 'ESP32-S3: Wi-Fi 2,4 GHz và Bluetooth LE', tint: 'green', on: true },
  { icon: BellRing, name: 'Đèn & còi', status: '3 đèn', detail: 'Đèn đỏ, vàng (Wi-Fi), xanh và còi báo', tint: 'yellow' },
  { icon: PlugZap, name: 'Nguồn', status: 'DC 12 V', detail: 'Đầu vào 9–24 V, hạ áp LM2576', tint: 'green' },
];

export const HARDWARE_FACTS = [
  { value: '50 g', label: 'ngưỡng cân nhận ra bưu kiện' },
  { value: '2 lớp', label: 'khóa: chốt điện và servo' },
  { value: '60 s', label: 'khóa bàn phím sau 3 lần nhập sai' },
  { value: '2 s', label: 'tự khóa lại sau khi cửa đóng' },
];

export interface DeliveryStep {
  title: string;
  body: string;
  lcd: [string, string];
  door: 'closed' | 'open';
  lock: 'locked' | 'unlocked';
  weight: string;
  keypad: string;
}

/* Mirrors the firmware flow in device/firmware/src/main.cpp (PIN → actuator state machine → weight → door → relock → telemetry). */
export const DELIVERY_STEPS: DeliveryStep[] = [
  {
    title: 'Shipper nhập mã của bạn.',
    body: 'Bạn tạo một mã PIN dùng một lần trong ứng dụng và gửi cho shipper. Mã được kiểm tra trên đám mây, hết hạn là vô hiệu.',
    lcd: ['NHAP MA PIN', '****'],
    door: 'closed', lock: 'locked', weight: '0,00 kg', keypad: 'Đang nhập',
  },
  {
    title: 'Khóa kép mở ra.',
    body: 'Mã đúng: chốt điện nhả, servo xoay mở chốt gài. Đèn xanh sáng và còi kêu ngắn.',
    lcd: ['MA HOP LE', 'MOI MO CUA'],
    door: 'closed', lock: 'unlocked', weight: '0,00 kg', keypad: 'Mã đúng',
  },
  {
    title: 'Bưu kiện vào hộp.',
    body: 'Cảm biến cân nhận ra có hàng khi khối lượng vượt 50 g, kèm ngưỡng trễ để không báo nhầm.',
    lcd: ['DA NHAN HANG', '1.25 kg'],
    door: 'open', lock: 'unlocked', weight: '1,25 kg', keypad: 'Mã đúng',
  },
  {
    title: 'Đóng cửa là tự khóa.',
    body: 'Công tắc từ MC-38 xác nhận cửa đã đóng, 2 giây sau hộp tự khóa lại. Không cần ai chạm vào điện thoại.',
    lcd: ['DA DONG CUA', 'DANG KHOA...'],
    door: 'closed', lock: 'locked', weight: '1,25 kg', keypad: 'Chờ mã',
  },
  {
    title: 'Bạn nhận được thông báo.',
    body: 'Trạng thái được đồng bộ lên đám mây và đẩy về ứng dụng: có bưu kiện mới, hộp đã khóa an toàn.',
    lcd: ['DA KHOA', 'DA BAO CHU NHA'],
    door: 'closed', lock: 'locked', weight: '1,25 kg', keypad: 'Chờ mã',
  },
];

export interface LineupModel {
  key: 'base' | 'pro' | 'solar';
  name: string;
  tagline: string;
  slugHints: string[];
  available: boolean;
  highlights: string[];
}

export const LINEUP: LineupModel[] = [
  {
    key: 'base',
    name: 'Anchor Box Base',
    tagline: 'Đủ mọi thứ để nhận hàng khi vắng nhà.',
    slugHints: ['base'],
    available: true,
    highlights: ['Khóa kép chốt điện + servo', 'Cân nhận biết bưu kiện', 'Bàn phím 4×4, màn hình LCD', 'Ứng dụng: PIN một lần, mở từ xa'],
  },
  {
    key: 'pro',
    name: 'Anchor Box Pro',
    tagline: 'Thêm mắt nhìn và nguồn dự phòng.',
    slugHints: ['pro'],
    available: false,
    highlights: ['Mọi tính năng của Base', 'Camera giám sát lúc giao hàng', 'Pin dự phòng khi mất điện'],
  },
  {
    key: 'solar',
    name: 'Anchor Box Solar Max',
    tagline: 'Cho nơi khó kéo dây điện.',
    slugHints: ['solar', 'max'],
    available: false,
    highlights: ['Mọi tính năng của Pro', 'Tấm pin mặt trời', 'Khoang chứa lớn hơn'],
  },
];

export const COMPARE_ROWS: { label: string; values: [boolean, boolean, boolean] }[] = [
  { label: 'Khóa kép chốt điện + servo', values: [true, true, true] },
  { label: 'Cân nhận biết bưu kiện', values: [true, true, true] },
  { label: 'Bàn phím, LCD, đèn và còi', values: [true, true, true] },
  { label: 'Wi-Fi + Bluetooth, ứng dụng di động', values: [true, true, true] },
  { label: 'Camera giám sát', values: [false, true, true] },
  { label: 'Pin dự phòng', values: [false, true, true] },
  { label: 'Tấm pin mặt trời', values: [false, false, true] },
];

export const FAQS = [
  {
    q: 'Shipper lấy mã mở hộp ở đâu?',
    a: 'Bạn tạo mã PIN dùng một lần trong ứng dụng Anchor Box rồi gửi cho shipper (tin nhắn hoặc ghi chú đơn hàng). Mã chỉ dùng được một lần và có thời hạn.',
  },
  {
    q: 'Nếu ai đó đoán mã thì sao?',
    a: 'Nhập sai 3 lần liên tiếp, bàn phím bị khóa 60 giây. Mỗi lần mở cửa đều được ghi vào lịch sử trong ứng dụng.',
  },
  {
    q: 'Làm sao tôi biết hàng đã vào hộp?',
    a: 'Cảm biến cân ghi nhận khối lượng trong hộp và cảm biến cửa xác nhận cửa đã đóng. Khi có bưu kiện mới, ứng dụng sẽ thông báo cho bạn.',
  },
  {
    q: 'Mất điện thì hộp hoạt động thế nào?',
    a: 'Bản Base dùng nguồn adapter DC và không có pin dự phòng, nên khi mất điện hộp không nhận mã hay lệnh mở. Bản Pro bổ sung pin dự phòng cho trường hợp này.',
  },
  {
    q: 'Lắp đặt cần những gì?',
    a: 'Một vị trí gần ổ điện và sóng Wi-Fi 2,4 GHz. Bạn quét mã QR trên hộp để ghép nối, rồi cài Wi-Fi cho hộp qua Bluetooth ngay trong ứng dụng.',
  },
];
