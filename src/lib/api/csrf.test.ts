import { describe, it, expect } from "vitest";
import { checkCsrf } from "./handler";

function req(origin?: string, url = "http://localhost:3000/api/tasks") {
  return new Request(url, {
    method: "POST",
    headers: origin ? { origin } : {},
  });
}

describe("checkCsrf", () => {
  it("allows same-origin requests (localhost dev, previews)", () => {
    expect(checkCsrf(req("http://localhost:3000"))).toBe(true);
  });

  it("allows the production origin", () => {
    expect(
      checkCsrf(req("https://picohome.app", "https://picohome.app/api/tasks"))
    ).toBe(true);
  });

  it("allows Capacitor native shell origins", () => {
    expect(checkCsrf(req("capacitor://localhost"))).toBe(true);
    expect(checkCsrf(req("https://localhost"))).toBe(true);
  });

  it("rejects cross-site origins", () => {
    expect(checkCsrf(req("https://evil.example.com"))).toBe(false);
  });

  it("rejects the literal 'null' origin (sandboxed frames, no-referrer)", () => {
    expect(checkCsrf(req("null"))).toBe(false);
  });

  it("GET requests always pass", () => {
    const get = new Request("http://localhost:3000/api/tasks", { method: "GET" });
    expect(checkCsrf(get)).toBe(true);
  });
});
