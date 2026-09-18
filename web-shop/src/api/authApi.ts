import { API_CONFIG, delay } from './client';
import { User, LoginCredentials, RegisterData, AuthResponse } from '../types/auth';
import { MOCK_CURRENT_USER } from '../mocks/user';

const STORAGE_USER_KEY = 'smartbox_shop_user';
const STORAGE_TOKEN_KEY = 'smartbox_shop_token';

export const authApi = {
  /**
   * Đăng nhập người dùng
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    if (API_CONFIG.useMock) {
      await delay(400);
      if (!credentials.email || !credentials.password) {
        throw new Error('Vui lòng nhập đầy đủ Email và Mật khẩu');
      }

      // Giả lập đăng nhập thành công với bất kỳ mật khẩu >= 6 ký tự
      if (credentials.password.length < 6) {
        throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
      }

      const user: User = {
        ...MOCK_CURRENT_USER,
        email: credentials.email,
      };

      const token = `mock_jwt_${Date.now()}_smartbox`;
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
      localStorage.setItem(STORAGE_TOKEN_KEY, token);

      return { user, token };
    }

    const res = await fetch(`${API_CONFIG.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Đăng nhập không thành công');
    }
    const data = await res.json();
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));
    localStorage.setItem(STORAGE_TOKEN_KEY, data.token);
    return data;
  },

  /**
   * Đăng ký tài khoản mới
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    if (API_CONFIG.useMock) {
      await delay(450);
      if (!data.fullName || !data.email || !data.password) {
        throw new Error('Vui lòng điền các trường thông tin bắt buộc');
      }
      if (data.password.length < 6) {
        throw new Error('Mật khẩu phải từ 6 ký tự trở lên');
      }
      if (data.confirmPassword && data.password !== data.confirmPassword) {
        throw new Error('Mật khẩu xác nhận không trùng khớp');
      }

      const newUser: User = {
        id: `usr-${Date.now()}`,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || '',
        address: data.address || '',
        createdAt: new Date().toISOString()
      };

      const token = `mock_jwt_${Date.now()}_smartbox`;
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(newUser));
      localStorage.setItem(STORAGE_TOKEN_KEY, token);

      return { user: newUser, token };
    }

    const res = await fetch(`${API_CONFIG.baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Đăng ký tài khoản không thành công');
    }
    const resData = await res.json();
    return resData;
  },

  /**
   * Lấy thông tin phiên đăng nhập hiện tại
   */
  async getCurrentUser(): Promise<User | null> {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    if (!raw || !token) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  /**
   * Cập nhật thông tin cá nhân
   */
  async updateProfile(updates: Partial<User>): Promise<User> {
    if (API_CONFIG.useMock) {
      await delay(300);
      const current = await this.getCurrentUser();
      if (!current) throw new Error('Chưa đăng nhập');
      const updated: User = { ...current, ...updates };
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updated));
      return updated;
    }

    const res = await fetch(`${API_CONFIG.baseUrl}/auth/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Không thể cập nhật thông tin');
    return res.json();
  },

  /**
   * Đăng xuất
   */
  async logout(): Promise<void> {
    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
  }
};
