/**
 * Log/telemetry scrubbing. Drizzle's DrizzleQueryError embeds bound
 * parameters in its message ("Failed query: …\nparams: …") and on `.params`,
 * and pg errors carry `detail` like "Key (email)=(x@y.com)". Those params
 * are user data — emails, notes, addresses — so never log raw errors.
 * Edge-safe (no Node imports): used by middleware and Sentry configs too.
 */

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PARAMS_TAIL_RE = /\n\s*params:[\s\S]*$/;
/** Keys whose values are bound query data or direct PII — dropped entirely. */
const DROP_KEYS = new Set(["params", "parameters", "detail", "email", "values"]);

export function redactText(text: string): string {
  return text.replace(PARAMS_TAIL_RE, "").replace(EMAIL_RE, "[email]");
}

export interface ErrorSummary {
  name: string;
  message: string;
  code?: string;
  cause?: ErrorSummary;
}

function codeOf(value: unknown): string | undefined {
  if (value && typeof value === "object" && "code" in value) {
    const code = (value as { code: unknown }).code;
    if (typeof code === "string" || typeof code === "number") return String(code);
  }
  return undefined;
}

/** name / code / redacted message (and the same for `.cause`, one level). */
export function safeErrorSummary(err: unknown, depth = 0): ErrorSummary {
  if (!(err instanceof Error)) {
    return { name: "NonError", message: redactText(String(err)) };
  }
  // DrizzleQueryError doesn't set .name; fall back to the class name.
  const name = err.name !== "Error" ? err.name : err.constructor?.name || "Error";
  const summary: ErrorSummary = { name, message: redactText(err.message) };
  const code = codeOf(err) ?? codeOf((err as { cause?: unknown }).cause);
  if (code) summary.code = code;
  const cause = (err as { cause?: unknown }).cause;
  if (cause !== undefined && depth < 1) summary.cause = safeErrorSummary(cause, depth + 1);
  return summary;
}

function scrubValue(value: unknown, depth: number): unknown {
  if (typeof value === "string") return redactText(value);
  if (depth > 8 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (DROP_KEYS.has(k.toLowerCase())) continue;
    out[k] = scrubValue(v, depth + 1);
  }
  return out;
}

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "apikey",
]);

function isSensitiveHeader(name: string): boolean {
  const n = name.toLowerCase();
  return SENSITIVE_HEADERS.has(n) || n.startsWith("x-supabase-");
}

/** Drop query string and fragment; works for absolute and relative URLs. */
function stripQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

interface ScrubbableRequest {
  url?: string;
  query_string?: unknown;
  data?: unknown;
  cookies?: unknown;
  headers?: Record<string, string>;
}

interface ScrubbableEvent {
  message?: string;
  exception?: { values?: Array<{ value?: string }> };
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  user?: { id?: string | number; [key: string]: unknown };
  request?: ScrubbableRequest;
  breadcrumbs?: Array<{ message?: string; data?: Record<string, unknown> }>;
}

/**
 * Sentry `beforeSend`: strip query params and email addresses, drop request
 * bodies/cookies/auth headers, and reduce the user to an opaque id.
 */
export function scrubSentryEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.message) event.message = redactText(event.message);
  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = redactText(ex.value);
  }
  if (event.extra) event.extra = scrubValue(event.extra, 0) as Record<string, unknown>;
  if (event.contexts) event.contexts = scrubValue(event.contexts, 0) as Record<string, unknown>;
  if (event.tags) event.tags = scrubValue(event.tags, 0) as Record<string, unknown>;
  if (event.user) {
    event.user = event.user.id !== undefined ? { id: event.user.id } : {};
  }
  if (event.request) {
    const req = event.request;
    delete req.data;
    delete req.cookies;
    if (req.query_string !== undefined) req.query_string = "[redacted]";
    if (typeof req.url === "string") req.url = stripQuery(req.url);
    if (req.headers) {
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (!isSensitiveHeader(k)) headers[k] = redactText(String(v));
      }
      req.headers = headers;
    }
  }
  for (const crumb of event.breadcrumbs ?? []) {
    if (crumb.message) crumb.message = redactText(crumb.message);
    if (crumb.data) crumb.data = scrubValue(crumb.data, 0) as Record<string, unknown>;
  }
  return event;
}
