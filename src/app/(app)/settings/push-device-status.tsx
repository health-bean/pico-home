"use client";

import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useDeviceInstall } from "@/hooks/use-device-install";

/**
 * Push is an account setting, but it only reaches a phone that has allowed
 * it. Say plainly whether *this* device will get reminders, and what to do
 * if not — otherwise "on" in Settings can silently mean nothing.
 */
export function PushDeviceStatus() {
  const { supported, permission, subscribe } = usePushNotifications();
  const { needsHomeScreen } = useDeviceInstall();

  let text: string;
  let action: { label: string; onClick: () => void } | null = null;
  let ok = false;

  if (needsHomeScreen) {
    text =
      "This iPhone: add Pico Home to your Home Screen first — tap Share, then “Add to Home Screen”, and open it from there. Then turn reminders on here.";
  } else if (!supported) {
    text = "This browser can’t show notifications. The weekly email still works.";
  } else if (permission === "granted") {
    text = "On for this device.";
    ok = true;
  } else if (permission === "denied") {
    text = "Blocked on this device. Allow notifications for Pico Home in your browser or phone settings.";
  } else {
    text = "Not set up on this device yet.";
    action = { label: "Turn on here", onClick: () => void subscribe() };
  }

  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--color-neutral-100)] px-4 py-3 last:border-b-0">
      <p
        className={`text-xs ${ok ? "text-[var(--color-success-700)]" : "text-[var(--color-neutral-600)]"}`}
        aria-live="polite"
      >
        {text}
      </p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="-my-2 inline-flex min-h-11 shrink-0 items-center rounded px-1 text-[13px] font-semibold text-[var(--color-primary-700)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
