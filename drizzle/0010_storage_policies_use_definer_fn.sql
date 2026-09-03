-- Follow-up to 0009: the documents-bucket storage policies verified membership
-- by subquerying public.home_members / public.users directly. After 0009
-- revoked authenticated's table access, those subqueries fail with
-- "permission denied" and every document upload/view/delete breaks.
--
-- Fix: route the membership check through public.user_has_home_access(uuid),
-- which is SECURITY DEFINER (created in 0001) and therefore does not depend
-- on the caller's table grants. No PostgREST access is re-opened.

DROP POLICY IF EXISTS "Home members can view documents flreew_0" ON storage.objects;
DROP POLICY IF EXISTS "Home members can upload documents flreew_0" ON storage.objects;
DROP POLICY IF EXISTS "Home members can upload documents flreew_1" ON storage.objects;

CREATE POLICY "documents_select_home_members" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.user_has_home_access(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "documents_insert_home_members" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND public.user_has_home_access(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "documents_delete_home_members" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.user_has_home_access(((storage.foldername(name))[1])::uuid)
  );
