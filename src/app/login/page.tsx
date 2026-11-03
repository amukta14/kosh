import Link from "next/link";
import { Wordmark } from "@/components/ui";
import { OtpForm } from "./otp-form";

export const metadata = { title: "Parent login" };

export default function ParentLogin() {
  return (
    <main className="min-h-dvh flex flex-col">
      <div className="px-5 pt-6"><Link href="/"><Wordmark /></Link></div>
      <div className="flex-1 grid place-items-center px-5 py-10">
        <div className="w-full max-w-[380px] rise">
          <p className="eyebrow mb-2">Parents · अभिभावक</p>
          <h1 className="display text-[32px] leading-tight mb-1">See what is due, and pay.</h1>
          <p className="hi text-ink-2 text-[17px] mb-8">बकाया देखें और भुगतान करें।</p>
          <OtpForm />
        </div>
      </div>
      <p className="text-center text-[12.5px] text-ink-3 pb-6">
        Staff? <Link href="/staff/login" className="underline underline-offset-4">Log in here</Link>
      </p>
    </main>
  );
}
