-- ── Hero image + event settings ──────────────────────────────────
-- Run in Supabase SQL Editor

-- 1. Add hero_image_url column to event
ALTER TABLE event ADD COLUMN IF NOT EXISTS hero_image_url text;

-- 2. RPC to update the hero image URL
CREATE OR REPLACE FUNCTION set_event_hero_image(p_event_id uuid, p_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE event SET hero_image_url = p_url WHERE id = p_event_id;
END;
$$;

-- 3. Storage bucket for event assets (logos, hero image)
--    Creates a public bucket if it doesn't already exist.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-assets',
  'event-assets',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg','image/png','image/gif','image/webp','image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- 4. Allow public reads from the bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'event-assets public read'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "event-assets public read"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'event-assets')
    $pol$;
  END IF;
END $$;

-- 5. Allow anon uploads (admin is not authenticated via Supabase Auth)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'event-assets anon upload'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "event-assets anon upload"
      ON storage.objects FOR INSERT TO anon
      WITH CHECK (bucket_id = 'event-assets')
    $pol$;
  END IF;
END $$;

-- 6. Allow anon deletes/updates (so we can replace files)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'event-assets anon update'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "event-assets anon update"
      ON storage.objects FOR UPDATE TO anon
      USING (bucket_id = 'event-assets')
    $pol$;
  END IF;
END $$;
