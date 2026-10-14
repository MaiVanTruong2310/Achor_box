const base = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');
const tokenKey = 'smartbox_shop_token';
const refreshKey = 'smartbox_shop_refresh_token';
const expiresKey = 'smartbox_shop_token_expires';
export const clearSession = () => { [tokenKey, refreshKey, expiresKey, 'smartbox_shop_user'].forEach(k => localStorage.removeItem(k)); window.dispatchEvent(new Event('smartbox:session-ended')); };
export function saveSession(session: { accessToken: string; refreshToken: string; expiresIn: number }) {
  localStorage.setItem(tokenKey, session.accessToken); localStorage.setItem(refreshKey, session.refreshToken);
  localStorage.setItem(expiresKey, String(Date.now() + session.expiresIn * 1000));
}
export class CustomerApiError extends Error { constructor(message: string, public status: number) { super(message); } }
let renewing: Promise<void> | null = null;
async function accessToken(): Promise<string> {
  if (Number(localStorage.getItem(expiresKey)) <= Date.now() + 30000 && localStorage.getItem(refreshKey)) {
    renewing ??= (async () => {
      try { saveSession(await customerRequest('/auth/refresh-token', { method: 'POST', body: JSON.stringify({ refreshToken: localStorage.getItem(refreshKey) }) }, false)); }
      catch (error) { if (error instanceof CustomerApiError && error.status === 401) clearSession(); throw error; }
      finally { renewing = null; }
    })();
    await renewing;
  }
  const token = localStorage.getItem(tokenKey);
  if (!token || token.startsWith('mock_')) { clearSession(); throw new CustomerApiError('Vui lòng đăng nhập để tiếp tục.', 401); }
  return token;
}
export async function customerRequest<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (authenticated) headers.set('Authorization', `Bearer ${await accessToken()}`);
  if (options.body !== undefined && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), options.body instanceof FormData ? 45000 : 12000);
  try {
    const response = await fetch(`${base}${path}`, { ...options, headers, signal: controller.signal });
    const text = await response.text(); let result: any = null;
    if (text) { try { result = JSON.parse(text); } catch { throw new CustomerApiError('Phản hồi không hợp lệ. Hãy tải lại trước khi thử lại thao tác.', response.status); } }
    if (!response.ok) { if (authenticated && response.status === 401) clearSession(); throw new CustomerApiError(result?.message || `Không xử lý được yêu cầu (${response.status}).`, response.status); }
    return result as T;
  } catch (error) {
    if (error instanceof CustomerApiError) throw error;
    throw new CustomerApiError('Chưa nhận được kết quả. Hãy kiểm tra trạng thái trước khi gửi lại.', 0);
  } finally { clearTimeout(timer); }
}
