"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Select,
  Avatar,
} from "@/components/ui";

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

const REMINDER_DAY_OPTIONS = [
  { value: 1, label: "1 day before" },
  { value: 3, label: "3 days before" },
  { value: 7, label: "7 days before" },
];

/* ------------------------------------------------------------------ */
/*  Toggle Switch                                                      */
/* ------------------------------------------------------------------ */

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col">
        <label htmlFor={id} className="text-sm font-medium text-foreground cursor-pointer">
          {label}
        </label>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  /* Notification prefs */
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [reminderDays, setReminderDays] = useState<number[]>([1, 3]);

  /* App prefs */
  const [timezone, setTimezone] = useState("America/Chicago");
  const [theme, setTheme] = useState("system");

  function toggleReminderDay(day: number) {
    setReminderDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      {/* ---- Profile ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar size="lg" fallback={USER.name} src={USER.avatarUrl} alt={USER.name} />
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-base font-medium text-foreground">{USER.name}</span>
              <span className="text-sm text-muted-foreground">{USER.email}</span>
            </div>
            <Button variant="outline" size="sm">
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ---- Notification Preferences ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Choose how and when you want to be reminded.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Toggle
            checked={pushEnabled}
            onChange={setPushEnabled}
            label="Push Notifications"
            description="Receive push notifications on your device"
          />
          <Toggle
            checked={emailEnabled}
            onChange={setEmailEnabled}
            label="Email Reminders"
            description="Get maintenance reminders via email"
          />
          <Toggle
            checked={weeklyDigest}
            onChange={setWeeklyDigest}
            label="Weekly Digest"
            description="Summary of upcoming tasks every Monday"
          />

          <hr className="border-border" />

          <Select
            label="Reminder Time"
            options={REMINDER_TIME_OPTIONS}
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Days Before Due</span>
            <div className="flex gap-2">
              {REMINDER_DAY_OPTIONS.map((opt) => {
                const selected = reminderDays.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleReminderDay(opt.value)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      selected
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-transparent text-foreground hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---- App Preferences ---- */}
      <Card>
        <CardHeader>
          <CardTitle>App Preferences</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Select
            label="Timezone"
            options={TIMEZONE_OPTIONS}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
          <Select
            label="Theme"
            options={THEME_OPTIONS}
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* ---- Data ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Your Data</CardTitle>
          <CardDescription>Manage your account data and privacy.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Button variant="outline">Export My Data</Button>
          <Button variant="danger">Delete Account</Button>
        </CardContent>
      </Card>

      {/* ---- About ---- */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">App Version</span>
            <Badge size="sm">0.1.0</Badge>
          </div>
          <hr className="border-border" />
          <div className="flex flex-col gap-2">
            <a href="#" className="text-sm text-primary hover:underline">
              Privacy Policy
            </a>
            <a href="#" className="text-sm text-primary hover:underline">
              Terms of Service
            </a>
            <a href="#" className="text-sm text-primary hover:underline">
              Help &amp; Support
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
