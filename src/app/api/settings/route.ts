import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationPreferences } from "@/lib/db/schema";
import { apiHandler, parseBody } from "@/lib/api/handler";
import { updateNotificationPreferencesSchema } from "@/lib/api/schemas";

const DEFAULTS = {
  pushEnabled: true,
  emailEnabled: true,
  reminderTime: "09:00",
  reminderDaysBefore: [1, 3, 7],
  weeklyDigest: true,
  weeklyDigestDay: 1,
};

export const GET = apiHandler(async ({ user }) => {
  const [prefs] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, user.id))
    .limit(1);

  if (!prefs) {
    return NextResponse.json(DEFAULTS);
  }

  return NextResponse.json({
    pushEnabled: prefs.pushEnabled ?? DEFAULTS.pushEnabled,
    emailEnabled: prefs.emailEnabled ?? DEFAULTS.emailEnabled,
    reminderTime: prefs.reminderTime ?? DEFAULTS.reminderTime,
    reminderDaysBefore: prefs.reminderDaysBefore ?? DEFAULTS.reminderDaysBefore,
    weeklyDigest: prefs.weeklyDigest ?? DEFAULTS.weeklyDigest,
    weeklyDigestDay: prefs.weeklyDigestDay ?? DEFAULTS.weeklyDigestDay,
  });
});

export const PUT = apiHandler(async ({ user, request }) => {
  const body = await parseBody(request, updateNotificationPreferencesSchema);

  const [updated] = await db
    .insert(notificationPreferences)
    .values({
      userId: user.id,
      ...body,
    })
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: {
        ...body,
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json({
    pushEnabled: updated.pushEnabled ?? DEFAULTS.pushEnabled,
    emailEnabled: updated.emailEnabled ?? DEFAULTS.emailEnabled,
    reminderTime: updated.reminderTime ?? DEFAULTS.reminderTime,
    reminderDaysBefore:
      updated.reminderDaysBefore ?? DEFAULTS.reminderDaysBefore,
    weeklyDigest: updated.weeklyDigest ?? DEFAULTS.weeklyDigest,
    weeklyDigestDay: updated.weeklyDigestDay ?? DEFAULTS.weeklyDigestDay,
  });
});
