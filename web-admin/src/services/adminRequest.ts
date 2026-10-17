import { supabase } from './supabase';

const base = (import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');

export class AdminApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// In-memory token cache to avoid awaiting supabase.auth.getSession() on every request
let cachedToken: string | null = null;
let cachedTokenExpiresAt = 0;

supabase.auth.onAuthStateChange((_event, session) => {
  cachedToken = session?.access_token || null;
  cachedTokenExpiresAt = (session?.expires_at || 0) * 1000;
});

export function setCachedAdminToken(token: string | null, expiresInSeconds: number = 3600): void {
  cachedToken = token;
  cachedTokenExpiresAt = token ? Date.now() + expiresInSeconds * 1000 : 0;
}

async function getValidAccessToken(): Promise<string | null> {
  if (cachedToken && Date.now() < cachedTokenExpiresAt - 5000) {
    return cachedToken;
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      cachedToken = session.access_token;
      cachedTokenExpiresAt = (session.expires_at || 0) * 1000;
      return cachedToken;
    }
  } catch {
    // ignore
  }
  return null;
}

// In-memory micro-cache for GET requests to accelerate UI navigation & eliminate repeat remote calls
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const getResponseCache = new Map<string, CacheEntry<any>>();

export function invalidateAdminRequestCache(prefix?: string): void {
  if (!prefix) {
    getResponseCache.clear();
  } else {
    for (const key of getResponseCache.keys()) {
      if (key.startsWith(prefix)) {
        getResponseCache.delete(key);
      }
    }
  }
}

// In-flight GET request deduplication map to prevent parallel duplicate calls
const inFlightGetRequests = new Map<string, Promise<any>>();

export async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';

  // Any state mutation (POST, PUT, DELETE, PATCH) immediately invalidates cached GET data
  if (!isGet) {
    invalidateAdminRequestCache();
  }

  // Micro-cache check for GET requests (TTL: 4s) unless explicitly bypassed
  const headersObj = new Headers(options.headers);
  const bypassCache = headersObj.get('Cache-Control') === 'no-cache';
  if (isGet && !bypassCache) {
    const cached = getResponseCache.get(path);
    if (cached && Date.now() < cached.expiresAt) {
      return Promise.resolve(cached.data as T);
    }
  }

  // If identical GET request is already in-flight, coalesce onto the same promise
  if (isGet && inFlightGetRequests.has(path)) {
    return inFlightGetRequests.get(path) as Promise<T>;
  }

  const executionPromise = (async (): Promise<T> => {
    const headers = headersObj;
    if (!headers.has('Authorization')) {
      const token = await getValidAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      } else {
        const isPublic = isGet &&
          (path === '/products' || path === '/products/categories' || path.startsWith('/products/by-category'));
        if (!isPublic) throw new AdminApiError('Vui lòng đăng nhập.', 401);
      }
    }

    if (options.body !== undefined && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const controller = new AbortController();
    const timeoutMs = options.body instanceof FormData ? 45000 : 12000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${base}${path}`, { ...options, method, headers, signal: controller.signal });
      const text = await response.text();
      let data: any = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new AdminApiError('Phản hồi không hợp lệ; kiểm tra trạng thái trước khi gửi lại.', response.status);
        }
      }
      if (!response.ok) {
        if (response.status === 401) {
          cachedToken = null;
          getResponseCache.clear();
          window.dispatchEvent(new CustomEvent('smartbox:auth-expired', { detail: { reason: 'Phiên đăng nhập đã hết hạn.' } }));
        }
        throw new AdminApiError(data?.message || `Không xử lý được yêu cầu (${response.status}).`, response.status);
      }

      // Store in micro-cache if successful GET request
      if (isGet && !bypassCache) {
        getResponseCache.set(path, {
          data,
          expiresAt: Date.now() + 4000 // 4 seconds TTL
        });
      }

      return (data ?? {}) as T;
    } catch (error) {
      if (error instanceof AdminApiError) throw error;
      throw new AdminApiError('Chưa nhận được kết quả. Tải lại trạng thái trước khi gửi lại.', 0);
    } finally {
      clearTimeout(timer);
    }
  })();

  if (isGet) {
    inFlightGetRequests.set(path, executionPromise);
    executionPromise.finally(() => {
      inFlightGetRequests.delete(path);
    });
  }

  return executionPromise;
}
