import { db } from "@/lib/db";
import { appliances, homeSystems, householdHealthFlags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { HealthFlags } from "./scheduling";
import type { HomeType, SystemType, ApplianceCategory, HealthFlagKey } from "./templates";

const FLAG_KEYS: HealthFlagKey[] = [
  "hasAllergies", "hasYoungChildren", "hasPets", "hasElderly",
  "hasImmunocompromised", "prioritizeAirQuality", "prioritizeEnergyEfficiency",
  "moldSensitive",
];

/** Everything getApplicableTemplates needs about an existing home, loaded from
 *  the DB — for routes that add tasks after onboarding. */
export async function loadHomeForMatching(home: {
  id: string;
  type: string | null;
  climateZone: string | null;
}) {
  const [systems, appls, [flagsRow]] = await Promise.all([
    db.select().from(homeSystems).where(eq(homeSystems.homeId, home.id)),
    db.select().from(appliances).where(eq(appliances.homeId, home.id)),
    db.select().from(householdHealthFlags).where(eq(householdHealthFlags.homeId, home.id)),
  ]);

  const systemSubtypes: Partial<Record<SystemType, string[]>> = {};
  for (const s of systems) {
    (systemSubtypes[s.systemType as SystemType] ??= []).push(s.subtype ?? "standard");
  }

  const healthFlags: HealthFlags = {};
  for (const key of FLAG_KEYS) healthFlags[key] = flagsRow?.[key] ?? false;

  return {
    matching: {
      type: (home.type || "single_family") as HomeType,
      systems: systems.map((s) => s.systemType as SystemType),
      appliances: appls
        .map((a) => a.category)
        .filter((c): c is NonNullable<typeof c> => c !== null) as ApplianceCategory[],
      systemSubtypes,
      climateZone: home.climateZone,
    },
    healthFlags,
  };
}
