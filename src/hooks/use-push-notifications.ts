"use client";

import { useState, useEffect, useCallback } from "react";

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const isSupported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setSupported(isSupported);

    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, []);

  const registerServiceWorker = useCallback(async () => {
    if (!supported) return null;

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      return registration;
    } catch (err) {
      console.error("Service worker registration failed:", err);
      return null;
    }
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!supported) return null;

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result !== "granted") return null;

    const registration = await registerServiceWorker();
    if (!registration) return null;

    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      setSubscription(sub);

      // Save subscription to server
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });

      return sub;
    } catch (err) {
      console.warn("Push subscription failed:", err);
      return null;
    }
  }, [supported, registerServiceWorker]);

  // Register service worker on mount (for offline support even without push)
  useEffect(() => {
    if (supported) {
      registerServiceWorker();
    }
  }, [supported, registerServiceWorker]);

  return {
    supported,
    permission,
    subscription,
    subscribe,
  };
}
