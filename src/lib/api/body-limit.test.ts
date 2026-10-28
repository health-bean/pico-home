import { describe, it, expect } from "vitest";
import { enforceBodyLimit, DEFAULT_MAX_BODY_BYTES } from "./body-limit";

function streamOf(bytes: number, chunk = 1000): ReadableStream<Uint8Array> {
  let sent = 0;
  return new ReadableStream({
    pull(controller) {
      if (sent >= bytes) return controller.close();
      const n = Math.min(chunk, bytes - sent);
      sent += n;
      controller.enqueue(new Uint8Array(n));
    },
  });
}

function chunked(bytes: number, method = "POST") {
  return new Request("http://localhost/api/x", {
    method,
    body: streamOf(bytes),
    headers: { "content-type": "application/octet-stream" },
    // @ts-expect-error -- Node requires duplex for stream bodies
    duplex: "half",
  });
}

describe("enforceBodyLimit", () => {
  it("defaults to 1 MiB", () => {
    expect(DEFAULT_MAX_BODY_BYTES).toBe(1_048_576);
  });

  it("rejects a declared Content-Length over the limit", async () => {
    const r = new Request("http://localhost/api/x", {
      method: "POST",
      body: "x".repeat(20),
      headers: { "content-length": "20" },
    });
    expect(await enforceBodyLimit(r, 10)).toBeNull();
  });

  it("passes through a declared Content-Length within the limit untouched", async () => {
    const r = new Request("http://localhost/api/x", {
      method: "POST",
      body: "hello",
      headers: { "content-length": "5" },
    });
    expect(await enforceBodyLimit(r, 10)).toBe(r);
  });

  it("bounds a body without Content-Length (chunked) by actually reading it", async () => {
    expect(await enforceBodyLimit(chunked(5000), 4096)).toBeNull();
  });

  it("re-wraps a small chunked body so the handler can still read it", async () => {
    const out = await enforceBodyLimit(chunked(3000), 4096);
    expect(out).not.toBeNull();
    expect((await out!.arrayBuffer()).byteLength).toBe(3000);
    expect(out!.headers.get("content-type")).toBe("application/octet-stream");
  });

  it("ignores GET requests", async () => {
    const r = new Request("http://localhost/api/x");
    expect(await enforceBodyLimit(r, 1)).toBe(r);
  });
});
