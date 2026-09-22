import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = 
  Boolean(supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder-project') && 
  !supabaseAnonKey.includes('placeholder-anon-key'));

if (!isSupabaseConfigured) {
  console.warn(
    '⚠️ [Web Admin] Chưa cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY hợp lệ trong file .env. Hệ thống đang chạy ở chế độ Demo/Mock.'
  );
}

// Cấu hình lưu phiên đăng nhập trong sessionStorage để:
// 1. Mỗi lần mở trình duyệt / chạy mới phiên đều bắt buộc phải đăng nhập lại
// 2. Không lưu giữ token vĩnh viễn trong localStorage gây rò rỉ phiên
const sessionStore = typeof window !== 'undefined' ? window.sessionStorage : undefined;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: sessionStore,
      autoRefreshToken: false, // Không tự động refresh ngầm vô hạn; hết hạn token bắt buộc phải đăng nhập lại
      persistSession: true,    // Lưu phiên trong sessionStorage của tab hiện tại
      detectSessionInUrl: true,
    }
  }
);

/**
 * Xóa sạch hoàn toàn tất cả token xác thực trong cả sessionStorage và localStorage
 */
export async function clearAllAuthTokens(): Promise<void> {
  try {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut().catch((e) => console.warn('Supabase signOut warning:', e));
    }
  } catch (err) {
    console.warn('Lỗi khi gọi supabase.auth.signOut:', err);
  }

  if (typeof window === 'undefined') return;

  // Dọn sạch localStorage
  try {
    const localKeysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase') || key.includes('smartbox_session'))) {
        localKeysToRemove.push(key);
      }
    }
    localKeysToRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch (e) {
    console.warn('Lỗi dọn localStorage:', e);
  }

  // Dọn sạch sessionStorage
  try {
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase') || key.includes('smartbox_session'))) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
  } catch (e) {
    console.warn('Lỗi dọn sessionStorage:', e);
  }
}

/**
 * Dọn sạch các token cũ còn sót lại trong localStorage từ các phiên chạy trước
 */
export function pruneLegacyLocalStorageAuth(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase') || key.includes('smartbox_session'))) {
        keysToRemove.push(key);
      }
    }
    if (keysToRemove.length > 0) {
      console.info(`[Auth] Đang dọn sạch ${keysToRemove.length} token cũ trong localStorage...`);
      keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    }
  } catch (e) {
    console.warn('Lỗi pruneLegacyLocalStorageAuth:', e);
  }
}

/**
 * Kiểm tra xem session hoặc token đã hết hạn hay chưa (kèm buffer 5 giây)
 */
export function isSessionExpired(session: { expires_at?: number } | null | undefined): boolean {
  if (!session || !session.expires_at) return true;
  // expires_at là unix timestamp tính bằng giây
  const expireTimeMs = session.expires_at * 1000;
  return expireTimeMs <= Date.now() + 5000;
}

// Khởi chạy dọn dẹp localStorage ngay khi file được import
pruneLegacyLocalStorageAuth();

/**
 * Upload an image file to Supabase Storage 'products' bucket and returns its public CDN URL
 */
export async function uploadProductImageToSupabase(file: File): Promise<{ url: string; error?: string }> {
  if (!isSupabaseConfigured) {
    const mockUrl = URL.createObjectURL(file);
    return { url: mockUrl };
  }

  try {
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `prod_${Date.now()}_${cleanName}`;

    const { error } = await supabase.storage
      .from('products')
      .upload(fileName, file, {
        contentType: file.type || 'image/png',
        upsert: true,
        cacheControl: '3600'
      });

    if (error) {
      console.error('Supabase Storage Error:', error);
      return { url: '', error: error.message };
    }

    const { data: publicData } = supabase.storage
      .from('products')
      .getPublicUrl(fileName);

    return { url: publicData.publicUrl };
  } catch (err: any) {
    console.error('Unexpected Storage Error:', err);
    return { url: '', error: err.message || 'Lỗi kết nối tải ảnh' };
  }
}

