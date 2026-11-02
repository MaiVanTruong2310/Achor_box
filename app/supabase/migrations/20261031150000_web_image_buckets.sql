-- Image buckets for the web backend (Spring Boot), replacing Cloudinary.
-- Uploads go through the backend with the service key, which validates role/ownership
-- and re-encodes every image, so there are deliberately no insert/update/delete
-- policies for clients. Objects are public-read with random UUID names; links are
-- only exposed to users allowed to see the related product, claim or job.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png']),
  ('warranty-claims', 'warranty-claims', true, 5242880, array['image/jpeg', 'image/png']),
  ('delivery-proofs', 'delivery-proofs', true, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
