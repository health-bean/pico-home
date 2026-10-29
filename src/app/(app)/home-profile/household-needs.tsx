"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui";

/**
 * Household needs (allergies, pets, mold sensitivity…). These shape the
 * shared plan for everyone in the home, so they live with the home on
 * Property rather than in personal Settings.
 */

const OPTIONS: { key: string; label: string; detail?: string }[] = [
  { key: "hasAllergies", label: "Allergies or asthma" },
  { key: "moldSensitive", label: "Mold sensitivity", detail: "Extra checks for moisture, mold and drains" },
  { key: "hasYoungChildren", label: "Young children (under 5)" },
  { key: "hasPets", label: "Pets" },
  { key: "hasElderly", label: "Elderly family (65+)" },
  { key: "hasImmunocompromised", label: "Immune-compromised" },
  { key: "prioritizeAirQuality", label: "Prioritize air quality" },
  { key: "prioritizeEnergyEfficiency", label: "Prioritize energy efficiency" },
];

function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[26px] w-11 shrink-0 cursor-pointer rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        checked ? "bg-[var(--color-primary-700)]" : "bg-[var(--color-neutral-300)]"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span
        className={`absolute top-[3px] block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "left-[21px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

export function HouseholdNeedsSection() {
  const { toast } = useToast();
  const [flags, setFlags] = useState<Record<string, boolean> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/household-health");
      if (!res.ok) throw new Error();
      setFlags(await res.json());
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(
    async (key: string, value: boolean) => {
      if (!flags) return;
      const previous = flags;
      const next = { ...flags, [key]: value };
      setFlags(next);
      setSaving(true);
      try {
        const res = await fetch("/api/household-health", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const plural = (n: number) => `${n} task${n === 1 ? "" : "s"}`;
        const changes = [
          data.tasksAdded > 0 && `${plural(data.tasksAdded)} added to your plan`,
          data.tasksAdjusted > 0 && `${plural(data.tasksAdjusted)} rescheduled from the next cycle`,
        ].filter(Boolean);
        toast(changes.length > 0 ? `Saved — ${changes.join(", ")}` : "Saved", "success");
      } catch {
        setFlags(previous);
        toast("Couldn’t save that — try again", "error");
      } finally {
        setSaving(false);
      }
    },
    [flags, toast]
  );

  return (
    <section id="household">
      <h2 className="mb-1 text-[15px] font-bold">Household needs</h2>
      <p className="mb-3 text-xs text-[var(--color-neutral-500)]">
        Turning one on adds the tasks it calls for and makes some tasks repeat more often, for everyone in this home.
      </p>
      <div className="overflow-hidden rounded-2xl border border-[var(--color-neutral-200)] bg-white">
        {loadError ? (
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <p className="text-sm text-[var(--color-neutral-600)]">Couldn&rsquo;t load these.</p>
            <button
              type="button"
              onClick={load}
              className="text-[13px] font-semibold text-[var(--color-primary-700)]"
            >
              Try again
            </button>
          </div>
        ) : (
          OPTIONS.map((opt) => (
            <div
              key={opt.key}
              className="flex items-center justify-between gap-3 border-b border-[var(--color-neutral-100)] px-4 py-3.5 last:border-b-0"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[var(--color-neutral-900)]">{opt.label}</span>
                {opt.detail && (
                  <span className="block text-xs text-[var(--color-neutral-500)]">{opt.detail}</span>
                )}
              </span>
              <Switch
                checked={flags?.[opt.key] ?? false}
                onChange={(v) => update(opt.key, v)}
                label={opt.label}
                disabled={saving || !flags}
              />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
