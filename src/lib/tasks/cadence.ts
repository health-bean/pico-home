import { adjustFrequencyForHealth, type HealthFlags } from "./scheduling";
import type { FrequencyUnit, HealthFlagKey, TaskTemplate } from "./templates";

/** How household needs read in a sentence ("because of mold sensitivity"). */
export const HEALTH_FLAG_PHRASES: Record<HealthFlagKey, string> = {
  hasAllergies: "allergies",
  hasYoungChildren: "young children",
  hasPets: "pets",
  hasElderly: "elderly family",
  hasImmunocompromised: "immune sensitivity",
  prioritizeAirQuality: "your air-quality priority",
  prioritizeEnergyEfficiency: "your energy-efficiency priority",
  moldSensitive: "mold sensitivity",
};

const joinPhrases = (keys: HealthFlagKey[]) => {
  const p = keys.map((k) => HEALTH_FLAG_PHRASES[k]);
  return p.length <= 1 ? p.join("") : `${p.slice(0, -1).join(", ")} and ${p[p.length - 1]}`;
};

/**
 * The schedule Pico recommends for a task in this home, and the household
 * need behind it (if any) — so the task screen can say why.
 */
export function cadenceInfo(
  template: Pick<TaskTemplate, "frequencyValue" | "frequencyUnit" | "healthMultipliers" | "healthRequired">,
  flags: HealthFlags
): {
  suggested: { frequencyValue: number; frequencyUnit: FrequencyUnit };
  reason: string | null;
} {
  const suggested = adjustFrequencyForHealth(
    template.frequencyValue,
    template.frequencyUnit,
    template.healthMultipliers,
    flags
  );

  // Health-only tasks exist because of a need the home has.
  const requiredOn = template.healthRequired.filter((k) => flags[k]);
  if (requiredOn.length > 0) {
    return { suggested, reason: `Added because of ${joinPhrases(requiredOn)}` };
  }

  const changed =
    suggested.frequencyValue !== template.frequencyValue ||
    suggested.frequencyUnit !== template.frequencyUnit;
  if (!changed) return { suggested, reason: null };

  // Which needs produce the same (shortest) schedule on their own.
  const drivers = (Object.keys(template.healthMultipliers) as HealthFlagKey[]).filter((k) => {
    if (!flags[k]) return false;
    const alone = adjustFrequencyForHealth(
      template.frequencyValue,
      template.frequencyUnit,
      template.healthMultipliers,
      { [k]: true }
    );
    return alone.frequencyValue === suggested.frequencyValue && alone.frequencyUnit === suggested.frequencyUnit;
  });
  return { suggested, reason: `More often because of ${joinPhrases(drivers)}` };
}
