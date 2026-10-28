import { describe, it, expect } from "vitest";
import { isAllowedPushEndpoint } from "./endpoint";

describe("isAllowedPushEndpoint", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc123",
    "https://updates.push.services.mozilla.com/wpush/v2/gAAA",
    "https://wns2-par02p.notify.windows.com/w/?token=BQYAAA",
    "https://web.push.apple.com/QGuQyavXutnMH",
    "https://api.push.apple.com/3/device/abc",
    "https://FCM.googleapis.com/fcm/send/x",
    "https://fcm.googleapis.com:443/fcm/send/x",
  ])("allows %s", (url) => {
    expect(isAllowedPushEndpoint(url)).toBe(true);
  });

  it.each([
    "http://fcm.googleapis.com/fcm/send/abc", // not https
    "https://example.com/push",
    "https://169.254.169.254/latest/meta-data",
    "https://localhost/push",
    "https://fcm.googleapis.com.evil.com/x", // suffix trick
    "https://evilfcm.googleapis.com/x",
    "https://push.services.mozilla.com.evil.com/x",
    "https://notify.windows.com.evil.com/x",
    "https://evilpush.apple.com/x", // not a subdomain of push.apple.com
    "https://fcm.googleapis.com:8443/fcm/send/x", // non-default port
    "https://user:pw@fcm.googleapis.com/fcm/send/x", // credentials
    "not-a-url",
    "",
  ])("rejects %s", (url) => {
    expect(isAllowedPushEndpoint(url)).toBe(false);
  });
});
