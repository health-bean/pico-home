/** Default request-body cap for JSON endpoints. */
export const DEFAULT_MAX_BODY_BYTES = 1_048_576;

/**
 * Enforce a request-body size cap. Returns the request to hand to the route
 * (possibly re-wrapped with a buffered body) or null if it's too large.
 *
 * A declared Content-Length is trusted (the HTTP layer never delivers more
 * than it declares). Without one (chunked transfer, e.g. some multipart
 * clients), the stream is read up to `maxBytes` and aborted beyond it, so
 * `request.formData()` can never buffer an unbounded body.
 */
export async function enforceBodyLimit(
  request: Request,
  maxBytes: number
): Promise<Request | null> {
  const method = request.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return request;

  const declared = request.headers.get("content-length");
  if (declared !== null) {
    const n = Number(declared);
    if (!Number.isFinite(n) || n < 0) return null;
    return n > maxBytes ? null : request;
  }

  if (!request.body) return request;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    body.set(c, offset);
    offset += c.byteLength;
  }
  return new Request(request.url, {
    method,
    headers: request.headers,
    body,
    signal: request.signal,
  });
}
