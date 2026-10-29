"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { BottomNav } from "./bottom-nav";
import { ToastProvider, Button } from "@/components/ui";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { ActiveHomeCtx, useActiveHomeProvider } from "@/hooks/use-active-home";

function HomeSwitcher() {
  const { homes, activeHome, setActiveHomeId } = useActiveHomeProvider();
  const [open, setOpen] = useState(false);

  if (homes.length <= 1) return null;

  return (
    <div className="relative mx-auto max-w-lg px-4 pb-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-left shadow-sm transition-colors hover:bg-muted"
      >
        <span className="text-sm">🏠</span>
        <span className="flex-1 text-sm font-medium text-foreground truncate">
          {activeHome?.name ?? "Select property"}
        </span>
        <svg className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-4 right-4 z-50 mt-1 rounded-lg border border-border bg-white shadow-lg">
          {homes.map((home) => (
            <button
              key={home.id}
              type="button"
              onClick={() => {
                setActiveHomeId(home.id);
                setOpen(false);
                window.location.reload();
              }}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors first:rounded-t-lg last:rounded-b-lg ${
                home.id === activeHome?.id
                  ? "bg-[var(--color-primary-50)]"
                  : "hover:bg-muted"
              }`}
            >
              <span className="text-sm">🏠</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{home.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {home.type?.replace(/_/g, " ")}
                </p>
              </div>
              {home.id === activeHome?.id && (
                <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
          {/* Multi-home creation is hidden for V1 — /api/onboarding no-ops for
              onboarded users, so the old "Add Another Property" link was a dead end. */}
        </div>
      )}
    </div>
  );
}

/**
 * Shown only on the dashboard, and only when push reminders are on in
 * Settings but this device hasn't been allowed to show them yet — so it
 * never contradicts Settings or follows you onto every page.
 */
function NotificationBanner() {
  const pathname = usePathname();
  const { supported, permission, subscribe } = usePushNotifications();
  const [pushOn, setPushOn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (!cancelled) setPushOn(p ? p.pushEnabled !== false : false);
      })
      .catch(() => !cancelled && setPushOn(false));
    return () => {
      cancelled = true;
    };
  }, []);
  const isDismissedFromStorage = useSyncExternalStore(
    (cb) => { window.addEventListener("storage", cb); return () => window.removeEventListener("storage", cb); },
    () => localStorage.getItem("pico-notif-dismissed") === "true",
    () => false
  );
  const [dismissed, setDismissed] = useState(false);
  const effectiveDismissed = dismissed || isDismissedFromStorage;

  if (
    pathname !== "/dashboard" ||
    !pushOn ||
    !supported ||
    permission === "granted" ||
    permission === "denied" ||
    effectiveDismissed
  ) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pico-notif-dismissed", "true");
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-4">
      <div className="flex items-center gap-3 rounded-xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-3">
        <Bell aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--color-primary-700)]" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Reminders are on, but not on this device</p>
          <p className="text-xs text-muted-foreground">
            Allow notifications here to get them when tasks are due.
          </p>
        </div>
        <Button size="sm" onClick={subscribe}>
          Turn on
        </Button>
        <button
          onClick={handleDismiss}
          className="p-1 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const homeCtx = useActiveHomeProvider();

  return (
    <ActiveHomeCtx value={homeCtx}>
      <ToastProvider>
        <div className="min-h-screen bg-background">
          <NotificationBanner />
          <HomeSwitcher />
          <main className="mx-auto max-w-lg px-4 pb-24 pt-4">
            {children}
          </main>
          <BottomNav />
        </div>
      </ToastProvider>
    </ActiveHomeCtx>
  );
}
