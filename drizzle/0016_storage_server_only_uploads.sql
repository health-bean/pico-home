-- Documents are uploaded only through POST /api/documents, which validates
-- size, magic-byte MIME type and home membership, builds the object path
-- itself, and writes with the service role. The authenticated INSERT policy
-- from 0010 let any signed-in member bypass all of that and PUT arbitrary
-- files (any type/size) straight into documents/<homeId>/ via the Storage
-- API. Drop it (and any UPDATE policy, which would allow overwriting).
--
-- SELECT (signed URLs) and DELETE policies stay: GET/DELETE /api/documents
-- still use the caller's session for those.
--
-- PREREQUISITE: SUPABASE_SERVICE_ROLE_KEY must be set in every environment
-- that serves uploads (Vercel prod/preview, .env.local) BEFORE applying
-- this, or uploads will fail with an RLS error.
--
-- Idempotent — safe to re-run.

DROP POLICY IF EXISTS "documents_insert_home_members" ON storage.objects;
DROP POLICY IF EXISTS "documents_update_home_members" ON storage.objects;
DROP POLICY IF EXISTS "Home members can upload documents flreew_0" ON storage.objects;
DROP POLICY IF EXISTS "Home members can upload documents flreew_1" ON storage.objects;
DROP POLICY IF EXISTS "Home members can update documents flreew_0" ON storage.objects;

-- Defense in depth: bucket-level caps mirror the API's limits (4 MiB, the
-- same MIME allow-list as src/app/api/documents/route.ts) so even a
-- service-role bug can't store oversized or unexpected files.
UPDATE storage.buckets
SET
  file_size_limit = 4194304,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ]
WHERE id = 'documents';
