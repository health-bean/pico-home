import { createClient as createAdminClient } from "@supabase/supabase-js";

export const DOCUMENTS_BUCKET = "documents";

/** The subset of Supabase's StorageFileApi we use — keeps helpers testable. */
export interface StorageBucket {
  list(
    prefix: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ data: { name: string }[] | null; error: unknown }>;
  remove(paths: string[]): Promise<{ data: unknown; error: unknown }>;
}

/**
 * Service-role Supabase client (bypasses storage RLS), or null when
 * SUPABASE_SERVICE_ROLE_KEY isn't configured. Server-only.
 */
export function getServiceRoleClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) return null;
  return createAdminClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Every object path directly under `${folder}/` (paginated). */
export async function listFolderPaths(
  bucket: StorageBucket,
  folder: string,
  pageSize = 100
): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await bucket.list(folder, { limit: pageSize, offset });
    if (error) throw new Error("storage list failed");
    const page = data ?? [];
    for (const obj of page) {
      if (obj.name && obj.name !== ".emptyFolderPlaceholder") {
        paths.push(`${folder}/${obj.name}`);
      }
    }
    if (page.length < pageSize) break;
  }
  return paths;
}

/** Remove paths in chunks; returns counts and never throws. */
export async function removePaths(
  bucket: StorageBucket,
  paths: string[],
  chunkSize = 100
): Promise<{ removed: number; failed: number }> {
  const unique = [...new Set(paths)];
  let removed = 0;
  let failed = 0;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    try {
      const { error } = await bucket.remove(chunk);
      if (error) failed += chunk.length;
      else removed += chunk.length;
    } catch {
      failed += chunk.length;
    }
  }
  return { removed, failed };
}

/**
 * Best-effort removal of document files: the explicit `paths` plus every
 * file under each `${homeId}/` folder. Never throws — account/home deletion
 * must not be blocked by storage hiccups. Logs counts only (no paths, which
 * embed home ids, and no raw error text, which can echo request data).
 */
export async function purgeDocumentFiles(
  bucket: StorageBucket,
  { paths, homeIds }: { paths: string[]; homeIds: string[] }
): Promise<{ removed: number; failed: number }> {
  const all = [...paths];
  let listFailures = 0;
  for (const homeId of homeIds) {
    try {
      all.push(...(await listFolderPaths(bucket, homeId)));
    } catch {
      listFailures += 1;
    }
  }

  const result = all.length ? await removePaths(bucket, all) : { removed: 0, failed: 0 };
  const failed = result.failed + listFailures;
  if (failed > 0) {
    console.error(
      `[storage] document purge incomplete: ${result.failed} file(s) not removed, ${listFailures} folder listing(s) failed`
    );
  }
  return { removed: result.removed, failed };
}
