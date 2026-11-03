import Link from "next/link";
import { Wordmark } from "@/components/ui";
import { StaffLoginForm } from "./form";

export const metadata = { title: "Staff login" };

export default function StaffLogin() {
  return (
    <main className="min-h-dvh grid lg:grid-cols-[1fr_1.1fr]">
      <section className="hidden lg:flex flex-col justify-between p-10 bg-indigo text-white relative overflow-hidden">
        <Link href="/" className="[&_*]:!text-white"><Wordmark /></Link>
        <div className="relative z-10 max-w-md">
          <p className="display text-[44px] leading-[1.05]">Every rupee, every centre, one register.</p>
          <p className="text-white/70 mt-4 text-[15px]">Gopalpura · Mansarovar · Vaishali Nagar · Raja Park</p>
        </div>
        <Lattice />
      </section>
      <section className="flex flex-col px-5 py-6">
        <div className="lg:hidden"><Link href="/"><Wordmark /></Link></div>
        <div className="flex-1 grid place-items-center py-10">
          <div className="w-full max-w-[360px] rise">
            <p className="eyebrow mb-2">Accounts and counselling</p>
            <h1 className="display text-[30px] mb-8">Staff login</h1>
            <StaffLoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}

/** Jali screen pattern, as on the Hawa Mahal windows. Purely decorative, kept faint. */
function Lattice() {
  return (
    <svg className="absolute -right-20 -bottom-20 w-[560px] h-[560px] opacity-[0.09]" viewBox="0 0 200 200" aria-hidden>
      <defs>
        <pattern id="jali" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M10 0 L20 10 L10 20 L0 10 Z" fill="none" stroke="white" strokeWidth="1.2" />
          <circle cx="10" cy="10" r="2.5" fill="none" stroke="white" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="200" height="200" fill="url(#jali)" />
    </svg>
  );
}
