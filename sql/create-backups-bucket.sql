-- ============================================================
-- Create Supabase Storage bucket for database backups
-- Bucket: backups (private)
-- ============================================================

-- Insert bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'backups',
  'backups',
  false,
  52428800, -- 50 MiB (match config.toml storage.file_size_limit)
  ARRAY['application/sql', 'application/gzip', 'application/x-gzip', 'text/plain']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- Policies for backups bucket
-- ============================================================

DO $$
BEGIN
  -- Drop existing policies to avoid conflicts, then recreate
  DROP POLICY IF EXISTS "Allow admin/manager to read backups" ON storage.objects;
  DROP POLICY IF EXISTS "Allow admin to delete backups" ON storage.objects;

  CREATE POLICY "Allow admin/manager to read backups"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'backups'
    AND public.user_has_role(ARRAY['admin', 'manager'])
  );

  CREATE POLICY "Allow admin to delete backups"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'backups'
    AND public.user_has_role(ARRAY['admin'])
  );
END
$$;

-- Note: Service role key bypasses RLS, so the GitHub Actions runner
-- (and any server-side Edge Function) can upload files without an INSERT policy.
