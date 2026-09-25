-- Harden the public `avatars` bucket (security audit before first deployment).
--
-- 1. Server-side upload limits. The client already checks JPEG/PNG/WebP and
--    5 MB, but a direct Storage API call bypassed that: any file type (HTML,
--    SVG...) could be served publicly from the Supabase domain. The size limit
--    is 10 MB, not 5: the client re-encodes the crop at native resolution, which
--    can land slightly above the 5 MB it accepted as input.
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';

-- 2. No more public listing. A public bucket serves files by URL without any
--    SELECT policy; the old "publicly accessible" policy only added the ability
--    to *list* the bucket, i.e. enumerate every user id. SELECT stays granted on
--    one's own folder because `upload(..., { upsert: true })` needs it.
drop policy if exists "Avatar images are publicly accessible" on storage.objects;

create policy "Users can view own avatar folder"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
