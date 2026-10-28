import { describe, it, expect, vi, beforeEach } from "vitest";

const { rows, deleted, sendNotification } = vi.hoisted(() => ({
  rows: [] as Array<{ id: string; endpoint: string; p256dhKey: string; authKey: string }>,
  deleted: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sendNotification: vi.fn(async (..._args: unknown[]) => ({})),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: async () => rows }) }),
    delete: () => ({ where: async () => deleted() }),
  },
}));

vi.mock("web-push", () => {
  class WebPushError extends Error { statusCode = 0; }
  return {
    default: { setVapidDetails: vi.fn(), sendNotification, WebPushError },
  };
});

import { sendPushToUser } from "./send";

describe("sendPushToUser", () => {
  beforeEach(() => {
    rows.length = 0;
    deleted.mockClear();
    sendNotification.mockClear();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub";
    process.env.VAPID_PRIVATE_KEY = "priv";
  });

  it("never sends to a stored endpoint outside the allow-list, and drops it", async () => {
    rows.push(
      { id: "1", endpoint: "https://169.254.169.254/latest", p256dhKey: "k", authKey: "a" },
      { id: "2", endpoint: "https://fcm.googleapis.com/fcm/send/ok", p256dhKey: "k", authKey: "a" },
    );
    const res = await sendPushToUser("u", { title: "t", body: "b" });
    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect((sendNotification.mock.calls[0][0] as { endpoint: string }).endpoint).toContain("fcm.googleapis.com");
    expect(deleted).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ sent: 1, failed: 1 });
  });
});
