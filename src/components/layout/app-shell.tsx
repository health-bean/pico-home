"use client";

import { useState, useEffect } from "react";
import { BottomNav } from "./bottom-nav";
import { ToastProvider } from "@/components/ui";
import { Button } from "@/components/ui";
import { usePushNotifications } from "@/hooks/use-push-notifications";

function NotificationBanner() {
  const { supported, permission, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(localStorage.getItem("honeydo-notif-dismissed") === "true");
    }
  }, []);

  if (!supported || permission === "granted" || permission === "denied" || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("honeydo-notif-dismissed", "true");
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-4">
      <div className="flex items-center gap-3 rounded-xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-3 dark:border-[var(--color-primary-800)] dark:bg-[var(--color-primary-950)]">
        <span className="text-xl">🔔</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Enable reminders?</p>
          <p className="text-xs text-muted-foreground">
            Get notified when maintenance tasks are due.
          </p>
        </div>
        <Button size="sm" onClick={subscribe}>
          Enable
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
  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <NotificationBanner />
        <main className="mx-auto max-w-lg px-4 pb-24 pt-4">
          {children}
        </main>
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
