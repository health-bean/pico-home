import { describe, it, expect } from "vitest";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { redactText, safeErrorSummary, scrubSentryEvent } from "./scrub";

const query = 'insert into "users" ("email", "name") values ($1, $2)';
const params = ["dee@example.com", "Dee Notes about the basement"];

function drizzleError() {
  const cause = Object.assign(new Error('duplicate key value violates unique constraint "users_email_key"'), {
    code: "23505",
    detail: "Key (email)=(dee@example.com) already exists.",
  });
  return new DrizzleQueryError(query, params, cause);
}

describe("redactText", () => {
  it("removes email addresses", () => {
    expect(redactText("failed for Dee.Bean+x@Example.co.uk today")).toBe("failed for [email] today");
  });
  it("drops a Drizzle params tail", () => {
    expect(redactText(`Failed query: ${query}\nparams: dee@example.com,secret`)).toBe(`Failed query: ${query}`);
  });
});

describe("safeErrorSummary", () => {
  it("keeps name/code and drops params, detail and emails for Drizzle errors", () => {
    const s = safeErrorSummary(drizzleError());
    const json = JSON.stringify(s);
    expect(s.name).toBe("DrizzleQueryError");
    expect(s.code).toBe("23505");
    expect(json).not.toContain("dee@example.com");
    expect(json).not.toContain("basement");
    expect(json).toContain("users_email_key");
  });
  it("handles non-Error values", () => {
    expect(safeErrorSummary("boom user@x.io")).toEqual({ name: "NonError", message: "boom [email]" });
    expect(safeErrorSummary(undefined)).toEqual({ name: "NonError", message: "undefined" });
  });
});

describe("scrubSentryEvent", () => {
  it("scrubs exception values, message, extra and breadcrumbs", () => {
    const event = {
      message: "hi a@b.com",
      exception: { values: [{ type: "DrizzleQueryError", value: `Failed query: ${query}\nparams: dee@example.com,notes` }] },
      extra: {
        params: ["dee@example.com"],
        query,
        nested: { note: "email me at z@y.org", list: ["q@w.com", 3] },
      },
      breadcrumbs: [{ message: "user a@b.com clicked", data: { params: ["x"], email: "c@d.com" } }],
    };
    const out = scrubSentryEvent(event);
    const json = JSON.stringify(out);
    expect(json).not.toMatch(/@(example|b|y|w|d)\.(com|org)/);
    expect(json).not.toContain("notes");
    expect(out.extra).not.toHaveProperty("params");
    expect(out.exception.values[0].value).toBe(`Failed query: ${query}`);
    expect(out.extra.nested.list[1]).toBe(3);
  });
});

describe("scrubSentryEvent — request, user, tags", () => {
  it("drops request body/cookies, sensitive headers and query strings", () => {
    const out = scrubSentryEvent({
      request: {
        url: "https://picohome.app/api/invites?email=dee@example.com&token=abc#frag",
        query_string: "email=dee@example.com&token=abc",
        data: { notes: "secret", email: "dee@example.com" },
        cookies: { "sb-access-token": "jwt" },
        headers: {
          Authorization: "Bearer jwt",
          cookie: "sb=1",
          "Set-Cookie": "x=1",
          "x-api-key": "k",
          apikey: "anon",
          "x-supabase-auth": "t",
          "X-Supabase-Client-Platform": "web",
          "user-agent": "Mozilla",
          referer: "https://picohome.app/x?email=a@b.com",
        },
        method: "POST",
      },
    });
    expect(out.request).not.toHaveProperty("data");
    expect(out.request).not.toHaveProperty("cookies");
    expect(out.request!.url).toBe("https://picohome.app/api/invites");
    expect(out.request!.query_string).toBe("[redacted]");
    expect(Object.keys(out.request!.headers!).sort()).toEqual(["referer", "user-agent"]);
    expect(out.request!.headers!.referer).not.toContain("a@b.com");
    expect(out.request!.method).toBe("POST");
  });

  it("strips the query from a relative or unparseable url", () => {
    expect(scrubSentryEvent({ request: { url: "/api/x?email=a@b.com" } }).request!.url).toBe("/api/x");
  });

  it("reduces user to id only", () => {
    const out = scrubSentryEvent({
      user: { id: "u1", email: "dee@example.com", ip_address: "1.2.3.4", username: "dee" },
    });
    expect(out.user).toEqual({ id: "u1" });
    expect(scrubSentryEvent({ user: { email: "x@y.com" } }).user).toEqual({});
  });

  it("scrubs tag values", () => {
    const out = scrubSentryEvent({ tags: { route: "/api/x", who: "dee@example.com" } });
    expect(out.tags).toEqual({ route: "/api/x", who: "[email]" });
  });
});
