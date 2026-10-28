import { describe, it, expect, vi } from "vitest";
import {
  listFolderPaths,
  removePaths,
  purgeDocumentFiles,
  type StorageBucket,
} from "./documents";

function fakeBucket(files: Record<string, string[]>, opts: { failRemove?: boolean } = {}) {
  const removed: string[] = [];
  const bucket: StorageBucket = {
    list: vi.fn(async (prefix: string, o?: { limit?: number; offset?: number }) => {
      const all = files[prefix] ?? [];
      const offset = o?.offset ?? 0;
      const limit = o?.limit ?? 100;
      return { data: all.slice(offset, offset + limit).map((name) => ({ name })), error: null };
    }),
    remove: vi.fn(async (paths: string[]) => {
      if (opts.failRemove) return { data: null, error: { message: "boom" } };
      removed.push(...paths);
      return { data: paths.map((name) => ({ name })), error: null };
    }),
  };
  return { bucket, removed };
}

describe("listFolderPaths", () => {
  it("paginates until a short page and returns full paths", async () => {
    const names = Array.from({ length: 250 }, (_, i) => `f${i}.pdf`);
    const { bucket } = fakeBucket({ home1: names });
    const paths = await listFolderPaths(bucket, "home1", 100);
    expect(paths).toHaveLength(250);
    expect(paths[0]).toBe("home1/f0.pdf");
    expect(bucket.list).toHaveBeenCalledTimes(3);
  });

  it("skips the folder placeholder", async () => {
    const { bucket } = fakeBucket({ h: [".emptyFolderPlaceholder", "a.pdf"] });
    expect(await listFolderPaths(bucket, "h")).toEqual(["h/a.pdf"]);
  });
});

describe("removePaths", () => {
  it("chunks removals and dedupes", async () => {
    const { bucket, removed } = fakeBucket({});
    const paths = Array.from({ length: 150 }, (_, i) => `h/${i}`);
    const res = await removePaths(bucket, [...paths, "h/0"], 100);
    expect(bucket.remove).toHaveBeenCalledTimes(2);
    expect(removed).toHaveLength(150);
    expect(res).toEqual({ removed: 150, failed: 0 });
  });

  it("counts failures instead of throwing", async () => {
    const { bucket } = fakeBucket({}, { failRemove: true });
    expect(await removePaths(bucket, ["a", "b"])).toEqual({ removed: 0, failed: 2 });
  });
});

describe("purgeDocumentFiles", () => {
  it("removes explicit paths plus every file under each home folder", async () => {
    const { bucket, removed } = fakeBucket({ h1: ["x.pdf", "y.pdf"] });
    const res = await purgeDocumentFiles(bucket, {
      paths: ["h2/z.pdf", "h1/x.pdf"],
      homeIds: ["h1"],
    });
    expect(new Set(removed)).toEqual(new Set(["h2/z.pdf", "h1/x.pdf", "h1/y.pdf"]));
    expect(res.failed).toBe(0);
  });

  it("never throws when storage errors, and logs no paths", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const bucket: StorageBucket = {
      list: async () => { throw new Error("network user@example.com"); },
      remove: async () => { throw new Error("network"); },
    };
    const res = await purgeDocumentFiles(bucket, { paths: ["h/a.pdf"], homeIds: ["h"] });
    expect(res.failed).toBeGreaterThan(0);
    const logged = JSON.stringify(err.mock.calls);
    expect(logged).not.toContain("h/a.pdf");
    expect(logged).not.toContain("user@example.com");
    err.mockRestore();
  });

  it("is a no-op with nothing to remove", async () => {
    const { bucket } = fakeBucket({});
    expect(await purgeDocumentFiles(bucket, { paths: [], homeIds: [] })).toEqual({ removed: 0, failed: 0 });
    expect(bucket.remove).not.toHaveBeenCalled();
  });
});
