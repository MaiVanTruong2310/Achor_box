-- Public, read-only bucket for brand images referenced by auth emails.
-- No insert/update/delete policies: only the service role (CLI/dashboard)
-- can upload, while anyone can read through the public URL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand', 'brand', true, 1048576, array['image/png', 'image/svg+xml', 'image/jpeg'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
