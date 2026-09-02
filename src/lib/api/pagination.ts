const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 500;

/**
 * Parse limit/offset query params for per-home list endpoints.
 * Defaults are sized so a full home task list (58-69 tasks for a typical
 * single-family home, ~100+ with history) is never silently truncated.
 */
export function parsePagination(searchParams: URLSearchParams): {
  limit: number;
  offset: number;
} {
  const rawLimit = parseInt(searchParams.get("limit") ?? "", 10);
  const rawOffset = parseInt(searchParams.get("offset") ?? "", 10);

  const limit = Number.isNaN(rawLimit)
    ? DEFAULT_LIMIT
    : Math.min(Math.max(rawLimit, 1), MAX_LIMIT);
  const offset = Number.isNaN(rawOffset) ? 0 : Math.max(rawOffset, 0);

  return { limit, offset };
}
