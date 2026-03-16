export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-amber-50 px-4 dark:bg-zinc-900">
      <main className="flex max-w-md flex-col items-center gap-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500 text-4xl shadow-lg">
          🏠
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
          HoneyDoIQ
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Smart home maintenance tracking and reminders.
          Never forget when you last changed that filter.
        </p>
        <div className="mt-4 rounded-xl border border-amber-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Coming soon — track tasks, get reminders, keep your home running smooth.
          </p>
        </div>
      </main>
    </div>
  );
}
