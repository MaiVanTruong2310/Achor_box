import { supabase } from './supabase';
const base = (import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');
export class AdminApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if(!headers.has('Authorization')) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new AdminApiError('Vui lòng đăng nhập.', 401);
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  if (options.body !== undefined && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), options.body instanceof FormData ? 45000 : 12000);
  try {
    const response = await fetch(`${base}${path}`, { ...options, headers, signal: controller.signal });
    const text = await response.text(); let data: any = null;
    if (text) { try { data = JSON.parse(text); } catch { throw new AdminApiError('Phản hồi không hợp lệ; kiểm tra trạng thái trước khi gửi lại.', response.status); } }
    if (!response.ok) {
      if (response.status === 401) window.dispatchEvent(new CustomEvent('smartbox:auth-expired', { detail: { reason: 'Phiên đăng nhập đã hết hạn.' } }));
      throw new AdminApiError(data?.message || `Không xử lý được yêu cầu (${response.status}).`, response.status);
    }
    return (data ?? {}) as T;
  } catch (error) {
    if (error instanceof AdminApiError) throw error;
    throw new AdminApiError('Chưa nhận được kết quả. Tải lại trạng thái trước khi gửi lại.', 0);
  } finally { clearTimeout(timer); }
}
