"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * iPhone/iPad Safari only allows web push once the app is added to the Home
 * Screen and opened from there. `needsHomeScreen` is true in exactly that
 * case. Server render: false (no banner/flash before hydration).
 */
export function useDeviceInstall(): { isIOS: boolean; standalone: boolean; needsHomeScreen: boolean } {
  const isIOS = useSyncExternalStore(
    noopSubscribe,
    () =>
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    () => false
  );
  const standalone = useSyncExternalStore(
    noopSubscribe,
    () =>
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    () => false
  );
  return { isIOS, standalone, needsHomeScreen: isIOS && !standalone };
}
