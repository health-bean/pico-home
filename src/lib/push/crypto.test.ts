import { describe, it, expect, vi, afterEach } from "vitest";
import { encryptPushKey, decryptPushKey } from "./crypto";

const KEY = "a".repeat(64);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("encryptPushKey", () => {
  it("round-trips with a key", () => {
    vi.stubEnv("PUSH_ENCRYPTION_KEY", KEY);
    const enc = encryptPushKey("secret");
    expect(enc.startsWith("enc:v1:")).toBe(true);
    expect(decryptPushKey(enc)).toBe("secret");
  });

  it("refuses to store plaintext in production without a key", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PUSH_ENCRYPTION_KEY", "");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => encryptPushKey("secret")).toThrow(/PUSH_ENCRYPTION_KEY/);
    expect(err).toHaveBeenCalled();
  });

  it("keeps working (plaintext) in development without a key", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PUSH_ENCRYPTION_KEY", "");
    expect(encryptPushKey("secret")).toBe("secret");
  });

  it("still reads legacy plaintext rows", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PUSH_ENCRYPTION_KEY", "");
    expect(decryptPushKey("legacy")).toBe("legacy");
  });
});
