"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardCheck,
  Home,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Tasks", href: "/tasks", icon: ClipboardCheck },
  { label: "Property", href: "/home-profile", icon: Home },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/85 backdrop-blur-xl border-t border-[var(--color-neutral-200)] pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <div className="mx-auto flex max-w-lg items-center justify-around pt-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 ${
                isActive
                  ? "text-[var(--color-primary-600)]"
                  : "text-[var(--color-neutral-400)]"
              }`}
            >
              {isActive ? (
                <div className="bg-[var(--color-primary-50)] rounded-lg p-1.5">
                  <Icon className="h-5 w-5" />
                </div>
              ) : (
                <div className="p-1.5">
                  <Icon className="h-5 w-5" />
                </div>
              )}
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
