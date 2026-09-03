import { describe, it, expect } from "vitest";
import { parsePagination } from "./pagination";

/** The tasks list is a per-home endpoint; a typical home generates 58-69
 *  tasks. The old default limit of 50 silently truncated the list. */
describe("parsePagination", () => {
  it("defaults to a limit that fits every realistic home task list", () => {
    const { limit, offset } = parsePagination(new URLSearchParams());
    expect(limit).toBe(500);
    expect(offset).toBe(0);
  });

  it("honors explicit limit and offset", () => {
    const { limit, offset } = parsePagination(
      new URLSearchParams("limit=10&offset=20")
    );
    expect(limit).toBe(10);
    expect(offset).toBe(20);
  });

  it("clamps limit to [1, 500] and offset to >= 0", () => {
    expect(parsePagination(new URLSearchParams("limit=9999")).limit).toBe(500);
    expect(parsePagination(new URLSearchParams("limit=0")).limit).toBe(1);
    expect(parsePagination(new URLSearchParams("offset=-5")).offset).toBe(0);
  });

  it("falls back to defaults on garbage input", () => {
    const { limit, offset } = parsePagination(
      new URLSearchParams("limit=abc&offset=xyz")
    );
    expect(limit).toBe(500);
    expect(offset).toBe(0);
  });
});
