import Link from "next/link";
import { Wordmark } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="min-h-dvh grid place-items-center px-5">
      <div className="text-center">
        <Wordmark />
        <h1 className="display text-[34px] mt-8">Page not found</h1>
        <p className="text-ink-2 mt-2">The link may be old, or you may not have access to it.</p>
        <Link href="/" className="inline-block mt-6 underline underline-offset-4">Go to the start</Link>
      </div>
    </main>
  );
}
