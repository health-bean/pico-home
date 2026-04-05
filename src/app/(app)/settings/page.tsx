"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut } from "@/lib/auth/actions";
import { Skeleton } from "@/components/ui/skeleton";

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

const REMINDER_TIME_OPTIONS = [
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "17:00", label: "5:00 PM" },
  { value: "20:00", label: "8:00 PM" },
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
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-neutral-400)] mb-2">
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
        <span className="text-[13px] text-[var(--color-neutral-400)] font-medium">
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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [userRes, prefsRes] = await Promise.all([
        fetch("/api/user/profile"),
        fetch("/api/settings"),
      ]);
      if (userRes.ok) setUser(await userRes.json());
      if (prefsRes.ok) setPrefs(await prefsRes.json());
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

  const reminderTimeLabel =
    REMINDER_TIME_OPTIONS.find((o) => o.value === prefs?.reminderTime)?.label ??
    prefs?.reminderTime ??
    "\u2014";

  const reminderDaysLabel = prefs?.reminderDaysBefore
    ? [...prefs.reminderDaysBefore].sort((a, b) => a - b).join(", ") + " days"
    : "\u2014";

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
        <Row label="Reminder time" value={reminderTimeLabel} chevron />
        <Row label="Remind me before" value={reminderDaysLabel} chevron />
      </Section>

      {/* ---- Account ---- */}
      <Section label="Account">
        <Row label="Email" value={user?.email ?? "\u2014"} />
        <Row label="Name" value={user?.name ?? "\u2014"} />
        <Row label="Timezone" value={timezoneLabel} />
      </Section>

      {/* ---- About ---- */}
      <Section label="About">
        <Row label="Version" value="0.1.0" />
        <Row label="Terms of Service" chevron />
        <Row label="Privacy Policy" chevron />
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
    </div>
  );
}
