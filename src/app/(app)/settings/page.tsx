"use client";

import { useState } from "react";
import { signOut } from "@/lib/auth/actions";

/* ------------------------------------------------------------------ */
/*  Mock Data & Constants                                              */
/* ------------------------------------------------------------------ */

const USER = {
  name: "Jordan Mitchell",
  email: "jordan.mitchell@email.com",
  avatarUrl: null,
};

const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
];

const THEME_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
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
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`w-11 h-[26px] rounded-full relative cursor-pointer transition-colors ${
        checked
          ? "bg-[var(--color-primary-500)]"
          : "bg-[var(--color-neutral-200)]"
      }`}
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
  /* Notification prefs */
  const [pushEnabled, setPushEnabled] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [reminderTime] = useState("09:00");
  const [reminderDays] = useState<number[]>([1, 3, 7]);

  /* App prefs */
  const [timezone] = useState("America/Chicago");
  const [theme] = useState("system");

  /* Derive display values */
  const reminderTimeLabel =
    REMINDER_TIME_OPTIONS.find((o) => o.value === reminderTime)?.label ??
    reminderTime;

  const reminderDaysLabel = reminderDays.sort((a, b) => a - b).join(", ") + " days";

  const timezoneLabel =
    TIMEZONE_OPTIONS.find((o) => o.value === timezone)?.label ?? timezone;

  const themeLabel =
    THEME_OPTIONS.find((o) => o.value === theme)?.label ?? theme;

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
              checked={pushEnabled}
              onChange={setPushEnabled}
              label="Push notifications"
            />
          }
        />
        <Row
          label="Weekly digest email"
          toggle={
            <Toggle
              checked={weeklyDigest}
              onChange={setWeeklyDigest}
              label="Weekly digest email"
            />
          }
        />
        <Row label="Reminder time" value={reminderTimeLabel} chevron />
        <Row label="Remind me before" value={reminderDaysLabel} chevron />
      </Section>

      {/* ---- Account ---- */}
      <Section label="Account">
        <Row label="Email" value={USER.email} />
        <Row label="Name" value={USER.name} chevron />
        <Row label="Timezone" value={timezoneLabel} chevron />
      </Section>

      {/* ---- Appearance ---- */}
      <Section label="Appearance">
        <Row label="Theme" value={themeLabel} chevron />
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
