export type WarrantyStatus = 'ACTIVE' | 'EXPIRED' | 'VOID' | 'PENDING_ACTIVATION';

export interface WarrantyRecord {
  serialNumber: string;
  productName: string;
  productSku: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  activationDate: string;
  expirationDate: string;
  status: WarrantyStatus;
  warrantyPeriodMonths: number;
  hardwareVersion: string;
  firmwareVersion: string;
  serviceHistory: Array<{
    date: string;
    type: 'Kích hoạt' | 'Bảo dưỡng' | 'Cập nhật Firmware' | 'Kiểm tra phần cứng';
    note: string;
    technician: string;
  }>;
}
