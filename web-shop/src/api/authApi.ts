import { User, LoginCredentials, RegisterData, AuthResponse } from '../types/auth';
import { clearSession, customerRequest, saveSession } from './customerClient';
export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const session = await customerRequest<{ accessToken: string; refreshToken: string; expiresIn: number; role: string }>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }, false);
    if (session.role !== 'customer') throw new Error('Tài khoản nhân viên vui lòng dùng trang quản trị.');
    saveSession(session);
    try { const user = await this.getCurrentUser(); if (!user) throw new Error('Không tải được hồ sơ.'); return { user, token: session.accessToken }; }
    catch (error) { clearSession(); throw error; }
  },
  async register(data: RegisterData): Promise<string> {
    if (data.password !== data.confirmPassword) throw new Error('Mật khẩu xác nhận không khớp.');
    const result = await customerRequest<{ message: string }>('/auth/register', { method: 'POST', body: JSON.stringify({ email: data.email, password: data.password, fullName: data.fullName, phone: data.phone }) }, false);
    return result.message;
  },
  async getCurrentUser(): Promise<User | null> {
    if (!localStorage.getItem('smartbox_shop_token')) return null;
    return customerRequest<User>('/customer/profile');
  },
  updateProfile(updates: Partial<User>): Promise<User> {
    return customerRequest('/customer/profile', { method: 'PUT', body: JSON.stringify({ fullName: updates.fullName, phone: updates.phone }) });
  },
  async logout(): Promise<void> {
    try { if (localStorage.getItem('smartbox_shop_token')) await customerRequest('/auth/logout', { method: 'POST' }); }
    finally { clearSession(); }
  },
  forgotPassword: (email: string) => customerRequest<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }, false),
  async resetPassword(tokenHash: string, newPassword: string) { const result = await customerRequest<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ tokenHash, newPassword }) }, false); clearSession(); return result; },
  async changePassword(currentPassword: string, newPassword: string) {
    const result = await customerRequest<{ message: string }>('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
    clearSession(); return result;
  }
};
