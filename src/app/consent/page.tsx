import { redirect } from "next/navigation";
import { giveConsent, skipConsent } from "@/app/actions/parent";
import { Button, Notice, Wordmark } from "@/components/ui";
import { Submit } from "@/components/submit";
import { parentContext } from "@/server/parent";

export const metadata = { title: "Consent" };

export default async function Consent({ searchParams }: { searchParams: Promise<{ error?: string; force?: string }> }) {
  const sp = await searchParams;
  const { parent, kids, lang } = await parentContext();
  if (parent.consentAt && !sp.force) redirect("/parent");
  const names = kids.map((k) => k.student.name).join(", ");
  const hi = lang === "hi";

  return (
    <main lang={lang} className={`min-h-dvh px-5 py-6 max-w-[520px] mx-auto ${hi ? "hi" : ""}`}>
      <Wordmark />
      <h1 className="display text-[28px] leading-tight mt-8">{hi ? "आपकी सहमति" : "Your consent"}</h1>
      <p className="text-ink-2 mt-2 text-[15px]">
        {hi
          ? `${names} नाबालिग हैं, इसलिए डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम 2023 के तहत हमें आपकी सहमति चाहिए।`
          : `${names} ${kids.length > 1 ? "are" : "is"} under 18, so the Digital Personal Data Protection Act 2023 requires your consent as parent or guardian.`}
      </p>

      <dl className="mt-6 text-[14.5px] ledger border-y border-rule">
        {(hi
          ? [["क्या", "फ़ीस, भुगतान, उपस्थिति और टेस्ट अंक"], ["क्यों", "आपको बकाया, रसीदें और प्रगति दिखाने, और फ़ीस रिमाइंडर भेजने के लिए"], ["कितने समय", "कोर्स खत्म होने के 8 साल बाद तक (टैक्स रिकॉर्ड)"], ["आपके अधिकार", "सेंटर पर फ़ोन करके कभी भी सहमति वापस लें या सुधार माँगें"]]
          : [["What", "Fees, payments, attendance and test scores"], ["Why", "To show you dues, receipts and progress, and send fee reminders"], ["How long", "Until 8 years after the course ends (tax records)"], ["Your rights", "Withdraw consent or ask for corrections any time by calling the centre"]]
        ).map(([k, v]) => (
          <div key={k} className="py-3 grid grid-cols-[100px_1fr] gap-3">
            <dt className="text-ink-3">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      {sp.error && <div className="mt-4"><Notice tone="madder">{hi ? "कृपया पुष्टि करें कि आप अभिभावक हैं।" : "Please confirm you are the parent or guardian."}</Notice></div>}

      <form action={giveConsent} className="mt-6">
        <label className="flex gap-3 items-start text-[15px] cursor-pointer">
          <input type="checkbox" name="guardian" value="yes" className="mt-1 size-5 accent-indigo" required />
          <span>{hi ? `मैं ${names} का/की माता-पिता या अभिभावक हूँ और ऊपर लिखी बातों के लिए सहमति देता/देती हूँ।` : `I am the parent or guardian of ${names} and I agree to the above.`}</span>
        </label>
        <p className="text-[12.5px] text-ink-3 mt-3">{hi ? "यह सहमति आपके OTP से सत्यापित मोबाइल नंबर के साथ दर्ज होगी।" : "This is recorded against the mobile number you just verified by OTP."}</p>
        <Submit size="lg" block className="mt-5">{hi ? "सहमति दें" : "I agree"}</Submit>
      </form>
      <form action={skipConsent} className="mt-2">
        <Button tone="ghost" block>{hi ? "अभी नहीं, सिर्फ़ फ़ीस देखें" : "Not now, show fees only"}</Button>
      </form>
    </main>
  );
}
