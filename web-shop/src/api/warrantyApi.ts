import { API_CONFIG, delay } from './client';
import { WarrantyRecord } from '../types/warranty';
import { MOCK_WARRANTIES } from '../mocks/warranties';

export const warrantyApi = {
  /**
   * Tra cứu bảo hành điện tử theo Serial Number (Ví dụ: SBOX-2026-001)
   */
  async lookupBySerial(serialNumber: string): Promise<WarrantyRecord | null> {
    const cleanSerial = serialNumber.trim().toUpperCase();
    if (!cleanSerial) return null;

    if (API_CONFIG.useMock) {
      await delay(350);
      const match = MOCK_WARRANTIES.find(
        (w) => w.serialNumber.toUpperCase() === cleanSerial
      );
      return match || null;
    }

    const res = await fetch(`${API_CONFIG.baseUrl}/warranties/lookup?serial=${encodeURIComponent(cleanSerial)}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error('Lỗi khi tra cứu bảo hành');
    }
    return res.json();
  },

  /**
   * Lấy danh sách thiết bị bảo hành của khách hàng đăng nhập
   */
  async getMyWarranties(): Promise<WarrantyRecord[]> {
    if (API_CONFIG.useMock) {
      await delay(250);
      return MOCK_WARRANTIES;
    }

    const res = await fetch(`${API_CONFIG.baseUrl}/warranties/my-warranties`);
    if (!res.ok) throw new Error('Không thể tải danh sách bảo hành');
    return res.json();
  }
};
