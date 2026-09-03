"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { signOut } from "@/lib/auth/actions";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UserProfile {
  name: string | null;
  email: string;
  avatarUrl: string | null;
  timezone: string | null;
}

interface NotificationPrefs {
  pushEnabled: boolean;
  emailEnabled: boolean;
  reminderTime: string;
  reminderDaysBefore: number[];
  weeklyDigest: boolean;
  weeklyDigestDay: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
];

const HOUSEHOLD_OPTIONS: { key: string; label: string }[] = [
  { key: "hasAllergies", label: "Allergies or asthma" },
  { key: "hasYoungChildren", label: "Young children (under 5)" },
  { key: "hasPets", label: "Pets" },
  { key: "hasElderly", label: "Elderly family (65+)" },
  { key: "hasImmunocompromised", label: "Immune-compromised" },
  { key: "prioritizeAirQuality", label: "Prioritize air quality" },
  { key: "prioritizeEnergyEfficiency", label: "Prioritize energy efficiency" },
];

/* ------------------------------------------------------------------ */
/*  iOS Toggle Switch                                                  */
/* ------------------------------------------------------------------ */

function Toggle({
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
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-11 h-[26px] rounded-full relative cursor-pointer transition-colors ${
        checked
          ? "bg-[var(--color-primary-500)]"
          : "bg-[var(--color-neutral-200)]"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`block w-5 h-5 rounded-full bg-white shadow-sm absolute top-[3px] transition-transform ${
          checked ? "left-[21px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                    */
/* ------------------------------------------------------------------ */

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-neutral-500)] mb-2">
        {label}
      </p>
      <div className="bg-white rounded-2xl border border-[var(--color-neutral-200)] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Row                                                                */
/* ------------------------------------------------------------------ */

function Row({
  label,
  value,
  chevron = false,
  toggle,
  onClick,
}: {
  label: string;
  value?: string;
  chevron?: boolean;
  toggle?: React.ReactNode;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--color-neutral-100)] last:border-b-0 w-full text-left"
    >
      <span className="text-sm font-semibold text-[var(--color-neutral-900)]">
        {label}
      </span>
      {toggle ?? (
        <span className="text-[13px] text-[var(--color-neutral-500)] font-medium">
          {value}
          {chevron && " \u203A"}
        </span>
      )}
    </Wrapper>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [userRes, prefsRes, flagsRes] = await Promise.all([
        fetch("/api/user/profile"),
        fetch("/api/settings"),
        fetch("/api/household-health"),
      ]);
      if (userRes.ok) setUser(await userRes.json());
      if (prefsRes.ok) setPrefs(await prefsRes.json());
      if (flagsRes.ok) setFlags(await flagsRes.json());
    } catch {
      // silently fail — page shows loading state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updatePref = useCallback(
    async (update: Partial<NotificationPrefs>) => {
      if (!prefs) return;
      const optimistic = { ...prefs, ...update };
      setPrefs(optimistic);
      setSaving(true);
      try {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(update),
        });
        if (res.ok) {
          setPrefs(await res.json());
        } else {
          setPrefs(prefs);
        }
      } catch {
        setPrefs(prefs);
      } finally {
        setSaving(false);
      }
    },
    [prefs]
  );

  const updateFlag = useCallback(
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
        if (typeof data.tasksAdjusted === "number" && data.tasksAdjusted > 0) {
          toast(
            `Saved — ${data.tasksAdjusted} task${data.tasksAdjusted === 1 ? "" : "s"} rescheduled from the next cycle`,
            "success"
          );
        }
      } catch {
        setFlags(previous);
        toast("Couldn't save household settings", "error");
      } finally {
        setSaving(false);
      }
    },
    [flags, toast]
  );

  const deleteAccount = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/user", { method: "DELETE" });
      if (!res.ok) throw new Error();
      try {
        localStorage.clear();
        await createClient().auth.signOut();
      } catch {
        // storage/auth cleanup is best-effort
      }
      window.location.href = "/";
    } catch {
      setDeleting(false);
      setConfirmingDelete(false);
      toast("Couldn't delete your account — try again or contact support", "error");
    }
  }, [toast]);

  const timezoneLabel =
    TIMEZONE_OPTIONS.find((o) => o.value === user?.timezone)?.label ??
    user?.timezone ??
    "\u2014";

  if (loading) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
        <Skeleton className="h-7 w-24" />
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-[22px] font-extrabold tracking-tight mb-5">
        Settings
      </h1>

      {/* ---- Notifications ---- */}
      <Section label="Notifications">
        <Row
          label="Push notifications"
          toggle={
            <Toggle
              checked={prefs?.pushEnabled ?? true}
              onChange={(v) => updatePref({ pushEnabled: v })}
              label="Push notifications"
              disabled={saving}
            />
          }
        />
        <Row
          label="Weekly digest email"
          toggle={
            <Toggle
              checked={prefs?.weeklyDigest ?? false}
              onChange={(v) => updatePref({ weeklyDigest: v })}
              label="Weekly digest email"
              disabled={saving}
            />
          }
        />
        <div className="px-4 py-3.5 border-b border-[var(--color-neutral-100)] last:border-b-0">
          <span className="text-sm font-semibold text-[var(--color-neutral-900)]">
            Remind me before
          </span>
          <div className="mt-2 flex gap-2">
            {[1, 3, 7, 14].map((d) => {
              const current = prefs?.reminderDaysBefore ?? [1, 3, 7];
              const active = current.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  disabled={saving || !prefs}
                  onClick={() => {
                    const next = active
                      ? current.filter((x) => x !== d)
                      : [...current, d].sort((a, b) => a - b);
                    updatePref({ reminderDaysBefore: next });
                  }}
                  className={`flex-1 h-9 rounded-lg text-xs font-semibold border-2 transition-all ${
                    active
                      ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-800)]"
                      : "border-[var(--color-neutral-200)] text-[var(--color-neutral-500)]"
                  }`}
                >
                  {d} day{d > 1 ? "s" : ""}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--color-neutral-500)]">
            A heads-up push this many days before a task is due.
          </p>
        </div>
      </Section>

      {/* ---- Account ---- */}
      <Section label="Account">
        <Row label="Email" value={user?.email ?? "\u2014"} />
        <Row label="Name" value={user?.name ?? "\u2014"} />
        <Row label="Timezone" value={timezoneLabel} />
      </Section>

      {/* ---- Household ---- */}
      <Section label="Household">
        {HOUSEHOLD_OPTIONS.map((opt) => (
          <Row
            key={opt.key}
            label={opt.label}
            toggle={
              <Toggle
                checked={flags?.[opt.key] ?? false}
                onChange={(v) => updateFlag(opt.key, v)}
                label={opt.label}
                disabled={saving || !flags}
              />
            }
          />
        ))}
        <p className="px-4 py-2.5 text-[11px] text-[var(--color-neutral-500)]">
          These tailor how often tasks recur — changes apply from each task&apos;s next cycle.
        </p>
      </Section>

      {/* ---- About ---- */}
      <Section label="About">
        <Row label="Version" value="0.1.0" />
        <Link href="/terms">
          <Row label="Terms of Service" chevron />
        </Link>
        <Link href="/privacy">
          <Row label="Privacy Policy" chevron />
        </Link>
      </Section>

      {/* ---- Sign Out ---- */}
      <form action={signOut}>
        <button
          type="submit"
          className="w-full py-3.5 bg-red-50 rounded-2xl text-[15px] font-bold text-red-600 text-center mt-4"
        >
          Sign Out
        </button>
      </form>

      {/* ---- Danger Zone ---- */}
      <Section label="Danger zone">
        {confirmingDelete ? (
          <div className="p-4">
            <p className="text-sm font-semibold text-[var(--color-danger-700)]">
              Delete your account permanently?
            </p>
            <p className="mt-1 text-xs text-[var(--color-neutral-500)]">
              Homes you share are handed to the other member; homes only you use are
              deleted with all their tasks and history. This cannot be undone.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={deleteAccount}
                disabled={deleting}
                className="flex-1 h-10 rounded-xl bg-[var(--color-danger-600)] text-sm font-bold text-white disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete forever"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="flex-1 h-10 rounded-xl border border-[var(--color-neutral-200)] text-sm font-semibold text-[var(--color-neutral-700)]"
              >
                Keep my account
              </button>
            </div>
          </div>
        ) : (
          <Row label="Delete account" chevron onClick={() => setConfirmingDelete(true)} />
        )}
      </Section>
    </div>
  );
}
