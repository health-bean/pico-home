import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[var(--color-primary-50)] to-white px-4 dark:from-[var(--color-neutral-950)] dark:to-[var(--color-neutral-900)]">
      <main className="flex max-w-md flex-col items-center gap-8 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[var(--color-primary-400)] to-[var(--color-primary-600)] text-5xl shadow-lg">
          🏠
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            HoneyDoIQ
          </h1>
          <p className="text-lg text-muted-foreground">
            Smart home maintenance tracking and reminders.
            Never forget when you last changed that filter.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Link
            href="/onboarding"
            className="flex h-12 items-center justify-center rounded-xl bg-primary font-medium text-white shadow-sm transition-colors hover:bg-[var(--color-primary-600)]"
          >
            Get Started
          </Link>
          <Link
            href="/dashboard"
            className="flex h-12 items-center justify-center rounded-xl border border-border font-medium text-foreground transition-colors hover:bg-muted"
          >
            I Already Have an Account
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          Free to use. Your data stays private.
        </p>
      </main>
    </div>
  );
}
