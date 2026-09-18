import { WarrantyRecord } from '../types/warranty';

export const MOCK_WARRANTIES: WarrantyRecord[] = [
  {
    serialNumber: 'SBOX-2026-001',
    productName: 'Anchor Box Standard',
    productSku: 'SBOX-STD-01',
    customerName: 'Nguyễn Văn An',
    customerPhone: '0912345678',
    customerEmail: 'an.nguyen@example.com',
    activationDate: '2026-03-12',
    expirationDate: '2027-03-12',
    status: 'ACTIVE',
    warrantyPeriodMonths: 12,
    hardwareVersion: 'HW-V1.2 (Standard 5kg)',
    firmwareVersion: 'FW-V1.0.4',
    serviceHistory: [
      {
        date: '2026-03-12',
        type: 'Kích hoạt',
        note: 'Kích hoạt bảo hành điện tử chính hãng sau khi bàn giao thiết bị',
        technician: 'Hệ thống Anchor Box'
      },
      {
        date: '2026-03-14',
        type: 'Cập nhật Firmware',
        note: 'Cập nhật thuật toán tối ưu cảm biến nhận diện qua kết nối tự động',
        technician: 'Kỹ thuật viên Anchor Box'
      }
    ]
  },
  {
    serialNumber: 'SBOX-2026-002',
    productName: 'Anchor Box Plus (Có Camera AI 1080p & Pin 12h)',
    productSku: 'SBOX-PLS-02',
    customerName: 'Hoàng Quang Đạt',
    customerPhone: '0988776655',
    customerEmail: 'dat.hoang@example.com',
    activationDate: '2026-01-15',
    expirationDate: '2027-07-15',
    status: 'ACTIVE',
    warrantyPeriodMonths: 18,
    hardwareVersion: 'HW-V2.0 (Plus 10kg + AI Camera 1080p + Pin 12h)',
    firmwareVersion: 'FW-V2.1.0',
    serviceHistory: [
      {
        date: '2026-01-15',
        type: 'Kích hoạt',
        note: 'Kích hoạt bảo hành thiết bị chính hãng kèm hiệu chuẩn ống kính Camera AI',
        technician: 'Trung tâm Anchor Box'
      }
    ]
  },
  {
    serialNumber: 'SBOX-2026-003',
    productName: 'Anchor Box Pro Max (Hộp Kép 2 Tầng & Dual-Cam 2K)',
    productSku: 'SBOX-PRO-04',
    customerName: 'Lê Hoàng Long',
    customerPhone: '0977112233',
    customerEmail: 'long.le@example.com',
    activationDate: '2026-02-20',
    expirationDate: '2028-02-20',
    status: 'ACTIVE',
    warrantyPeriodMonths: 24,
    hardwareVersion: 'HW-V3.0 (Pro Max 18kg + Dual-Cam 2K + Pin 24h)',
    firmwareVersion: 'FW-V3.0.1',
    serviceHistory: [
      {
        date: '2026-02-20',
        type: 'Kích hoạt',
        note: 'Bàn giao và kích hoạt bảo hành VIP 24 tháng cho thiết bị Anchor Box Pro Max',
        technician: 'Chuyên viên kỹ thuật Anchor Box'
      }
    ]
  },
  {
    serialNumber: 'SBOX-2025-099',
    productName: 'Anchor Box Standard',
    productSku: 'SBOX-STD-01',
    customerName: 'Trần Minh Tuấn',
    customerPhone: '0901234567',
    activationDate: '2025-01-10',
    expirationDate: '2026-01-10',
    status: 'EXPIRED',
    warrantyPeriodMonths: 12,
    hardwareVersion: 'HW-V1.0',
    firmwareVersion: 'FW-V0.9.8',
    serviceHistory: [
      {
        date: '2025-01-10',
        type: 'Kích hoạt',
        note: 'Kích hoạt bảo hành tiêu chuẩn',
        technician: 'Trung tâm Anchor Box'
      },
      {
        date: '2026-01-10',
        type: 'Kiểm tra phần cứng',
        note: 'Hết hạn bảo hành 12 tháng tiêu chuẩn',
        technician: 'Hệ thống tự động'
      }
    ]
  }
];
