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

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    }
  }
);

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

