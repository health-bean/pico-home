import webPush from "web-push";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decryptPushKey } from "./crypto";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys not configured — set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY");
  }
  webPush.setVapidDetails("mailto:support@honeydoiq.app", publicKey, privateKey);
  vapidConfigured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

/**
 * Send a push notification to all subscriptions for a given user.
 * Automatically removes invalid/expired subscriptions.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  ensureVapid();

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: decryptPushKey(sub.p256dhKey),
            auth: decryptPushKey(sub.authKey),
          },
        },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err: unknown) {
      const statusCode =
        err instanceof webPush.WebPushError ? err.statusCode : 0;

      // 404 or 410 means subscription is no longer valid
      if (statusCode === 404 || statusCode === 410) {
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.id, sub.id));
      }
      failed++;
    }
  }

  return { sent, failed };
}
