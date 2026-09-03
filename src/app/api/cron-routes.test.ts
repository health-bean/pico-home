import { describe, it, expect, beforeAll } from "vitest";

/** Vercel Cron invokes cron paths with HTTP GET. These routes historically
 *  exported only POST, so every scheduled run 405'd and the features never
 *  ran in production. Lock the GET contract (and its auth) here. */

beforeAll(() => {
  process.env.CRON_SECRET = "test-secret-value";
});

const cronRoutes: [string, () => Promise<Record<string, unknown>>][] = [
  ["health-score", () => import("./health-score/route")],
  ["push/notify", () => import("./push/notify/route")],
  ["email/weekly-digest", () => import("./email/weekly-digest/route")],
];

describe.each(cronRoutes)("cron route /api/%s", (name, load) => {
  it("exports a GET handler (Vercel Cron sends GET)", async () => {
    const mod = await load();
    expect(typeof mod.GET).toBe("function");
  });

  it("GET rejects requests without the cron secret", async () => {
    const mod = await load();
    const GET = mod.GET as (req: Request) => Promise<Response>;
    const res = await GET(new Request(`http://localhost/api/${name}`));
    expect(res.status).toBe(401);
  });
});
