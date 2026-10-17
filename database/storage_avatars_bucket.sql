-- =========================================================================
-- STORAGE BUCKET: avatars
-- Chạy SQL này trong Supabase Dashboard → SQL Editor để tạo bucket avatars
-- và cấu hình RLS policy cho phép user upload/đọc avatar của chính mình.
-- =========================================================================

-- 1. Tạo bucket 'avatars' (public để getPublicUrl hoạt động)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,                                          -- public bucket
  2097152,                                       -- 2MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp'] -- chỉ cho phép ảnh
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS Policy: Cho phép user đã đăng nhập UPLOAD avatar của chính mình
--    File name format: avatar_<user_id>.<ext>
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND name LIKE 'avatar_' || auth.uid()::text || '.%'
);

-- 3. RLS Policy: Cho phép user UPDATE (upsert) avatar của chính mình
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND name LIKE 'avatar_' || auth.uid()::text || '.%'
);

-- 4. RLS Policy: Cho phép BẤT KỲ AI đọc avatar (bucket public)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- 5. RLS Policy: Cho phép user XÓA avatar của chính mình
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND name LIKE 'avatar_' || auth.uid()::text || '.%'
);
