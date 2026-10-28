import { describe, it, expect } from "vitest";
import { isEmailAllowed, parseAllowList } from "./allow-list";

describe("parseAllowList", () => {
  it("returns null when unset or blank (gate disabled)", () => {
    expect(parseAllowList(undefined)).toBeNull();
    expect(parseAllowList("")).toBeNull();
  });

  it("trims, lowercases, and drops empty entries", () => {
    expect(parseAllowList(" A@x.com, ,b@Y.com ")).toEqual(["a@x.com", "b@y.com"]);
  });
});

describe("isEmailAllowed", () => {
  it("allows everyone when ALLOWED_EMAILS is unset", () => {
    expect(isEmailAllowed("anyone@example.com", undefined)).toBe(true);
    expect(isEmailAllowed("anyone@example.com", "")).toBe(true);
  });

  it("allows listed emails case-insensitively", () => {
    expect(isEmailAllowed("Dee@Example.com", "dee@example.com,amy@example.com")).toBe(true);
  });

  it("rejects unlisted emails when the gate is on", () => {
    expect(isEmailAllowed("eve@example.com", "dee@example.com")).toBe(false);
  });

  it("rejects missing emails when the gate is on", () => {
    expect(isEmailAllowed(null, "dee@example.com")).toBe(false);
    expect(isEmailAllowed("", "dee@example.com")).toBe(false);
  });

  it("reads process.env.ALLOWED_EMAILS by default", () => {
    const prev = process.env.ALLOWED_EMAILS;
    process.env.ALLOWED_EMAILS = "dee@example.com";
    try {
      expect(isEmailAllowed("eve@example.com")).toBe(false);
      expect(isEmailAllowed("dee@example.com")).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.ALLOWED_EMAILS;
      else process.env.ALLOWED_EMAILS = prev;
    }
  });
});
