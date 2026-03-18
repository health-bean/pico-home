import { db } from "@/lib/db";
import { homes, homeMembers } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * Get all homes the user has access to — as owner or member.
 */
export async function getUserHomes(userId: string) {
  const memberships = await db
    .select({
      homeId: homeMembers.homeId,
      role: homeMembers.role,
    })
    .from(homeMembers)
    .where(eq(homeMembers.userId, userId));

  if (memberships.length === 0) {
    return [];
  }

  const homeIds = memberships.map((m) => m.homeId);
  const userHomes = await db
    .select()
    .from(homes)
    .where(inArray(homes.id, homeIds));

  const roleMap = new Map(memberships.map((m) => [m.homeId, m.role]));

  return userHomes.map((h) => ({
    ...h,
    memberRole: roleMap.get(h.id) ?? "member",
  }));
}

/**
 * Get a specific home by ID if the user has access, or the first home if no ID provided.
 */
export async function getUserHome(userId: string, homeId?: string) {
  const allHomes = await getUserHomes(userId);

  if (allHomes.length === 0) return null;

  if (homeId) {
    return allHomes.find((h) => h.id === homeId) ?? null;
  }

  return allHomes[0];
}
