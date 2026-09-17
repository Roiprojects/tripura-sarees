-- Restrict object listing on public buckets while keeping direct public URL access working.
-- Public buckets serve individual files via /storage/v1/object/public/... which bypasses RLS,
-- so blocking SELECT on storage.objects only prevents the LIST API (enumeration of filenames).

-- Drop any broad SELECT policies that were previously granted for these buckets.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname IN (
        'Public read product-images','Public read homepage-media',
        'product-images public read','homepage-media public read',
        'Allow public read on product-images','Allow public read on homepage-media',
        'product-images anon select','homepage-media anon select'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

-- Allow authenticated users to list (admins browsing the uploader), anon cannot enumerate.
DROP POLICY IF EXISTS "Authenticated can list product-images" ON storage.objects;
CREATE POLICY "Authenticated can list product-images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated can list homepage-media" ON storage.objects;
CREATE POLICY "Authenticated can list homepage-media"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'homepage-media');
