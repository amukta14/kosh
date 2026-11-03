"use client";

export default function RootError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-dvh grid place-items-center px-5 text-center">
      <div>
        <h1 className="display text-[30px]">Something went wrong</h1>
        <p className="text-ink-2 mt-2">Nothing was charged or changed. Please try again.</p>
        <button onClick={reset} className="mt-6 h-11 px-5 rounded-[8px] bg-indigo text-white">Try again</button>
      </div>
    </main>
  );
}
