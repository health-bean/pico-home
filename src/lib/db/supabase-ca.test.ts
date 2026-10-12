import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { X509Certificate } from "node:crypto";
import { SUPABASE_ROOT_CA } from "./supabase-ca";

describe("SUPABASE_ROOT_CA", () => {
  it("matches the cert the DB scripts use", () => {
    const file = fs.readFileSync("certs/supabase-prod-ca-2021.crt", "utf8");
    expect(SUPABASE_ROOT_CA.trim()).toBe(file.trim());
  });

  it("is the Supabase Root 2021 CA", () => {
    const cert = new X509Certificate(SUPABASE_ROOT_CA);
    expect(cert.subject).toContain("CN=Supabase Root 2021 CA");
    expect(cert.fingerprint256).toBe(
      "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA"
    );
  });
});
