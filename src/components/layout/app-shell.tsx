"use client";

import { BottomNav } from "./bottom-nav";
import { ToastProvider } from "@/components/ui";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-lg px-4 pb-24 pt-4">
          {children}
        </main>
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
