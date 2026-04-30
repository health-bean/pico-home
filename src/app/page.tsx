"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function HomeContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const handleGoogleSignIn = async () => {
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (oauthError) {
        console.error("Google sign-in error:", oauthError);
        alert("Sign in failed. Please try again.");
      }
    } catch (err) {
      console.error("Google sign-in exception:", err);
      alert("Sign in failed. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[var(--color-primary-50)] via-[var(--color-primary-100)] via-[60%] to-[var(--color-primary-400)]">
      {/* Top section */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        {/* App icon */}
        <div className="flex h-[80px] w-[80px] items-center justify-center rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 text-[52px] drop-shadow-lg">
          🏠
        </div>

        {/* Headline */}
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[var(--color-primary-950)]">
          Home care, simplified.
        </h1>

        {/* Subtext */}
        <p className="mt-3 text-base text-[var(--color-primary-800)]">
          Smart home maintenance tracking and reminders. Never forget when you
          last changed that filter.
        </p>

        {/* Feature row */}
        <div className="mt-8 flex gap-5">
          {[
            { icon: "📋", label: "Track" },
            { icon: "🔔", label: "Remind" },
            { icon: "📊", label: "Score" },
            { icon: "👨‍👩‍👧", label: "Share" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1.5">
              <div className="flex h-[48px] w-[48px] items-center justify-center rounded-xl bg-white/60 text-xl backdrop-blur-sm">
                {item.icon}
              </div>
              <span className="text-xs font-bold text-[var(--color-primary-900)]">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom section */}
      <div className="flex flex-col gap-3 px-6 pb-10">
        {error === "not_allowed" && (
          <div className="mb-2 rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
            This app is in private beta. Contact us for access.
          </div>
        )}
        {error === "auth" && (
          <div className="mb-2 rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
            Sign in failed. Please try again.
          </div>
        )}
        <button
          onClick={handleGoogleSignIn}
          className="flex h-[52px] w-full items-center justify-center gap-3 rounded-xl bg-white text-[15px] font-bold text-[var(--color-neutral-900)] shadow-sm"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        {/* Apple Sign-In — disabled until Apple Developer account is configured */}
        <button
          disabled
          className="flex h-[52px] w-full items-center justify-center gap-3 rounded-xl bg-[var(--color-neutral-900)] text-[15px] font-bold text-white opacity-40"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          Continue with Apple
          <span className="text-[11px] font-medium opacity-70">Coming soon</span>
        </button>

        <p className="mt-4 text-center text-[11px] text-[var(--color-primary-800)]">
          Your data stays private
        </p>
        <div className="mt-2 flex justify-center gap-3 text-[11px] text-[var(--color-primary-800)]/70">
          <a href="/privacy" className="underline hover:text-[var(--color-primary-800)]">
            Privacy Policy
          </a>
          <span>·</span>
          <a href="/terms" className="underline hover:text-[var(--color-primary-800)]">
            Terms of Service
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
