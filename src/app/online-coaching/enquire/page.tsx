import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { onlineEnquiryMode } from "@/lib/booking";
import { site } from "@/content/site";
import { OnlineOnboarding } from "@/components/booking/OnlineOnboarding";
import { DemoNotice, InstagramFallback } from "@/components/booking/ui";

export const metadata: Metadata = pageMetadata({
  title: "Online Coaching Enquiry",
  description:
    "Ask about online kettlebell coaching: tell Alex about your goals and training in a few quick questions. He reads every enquiry and replies personally.",
  path: "/online-coaching/enquire",
});

const next = [
  { title: "Tell Alex about you", body: "Your goal, your experience and how to reach you." },
  { title: "Alex reviews it personally", body: "He reads every enquiry himself and replies to talk it through." },
  { title: "Decide together", body: "If online coaching is a good fit, Alex explains how it works and the next steps." },
];

export default function OnlineCoachingPage() {
  const mode = onlineEnquiryMode();
  return (
    <section aria-labelledby="online-heading" className="bg-paper">
      <div className="container-page pt-6 pb-16 sm:pt-10 lg:pb-24">
        {/* Phones: intro, questions, then what happens next. Desktop: intro and next steps beside the questions. */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-14 lg:gap-y-10">
          <header className="lg:col-span-5">
            <p className="eyebrow text-muted">Online coaching · Enquiry</p>
            <h1 id="online-heading" className="mt-3 font-display text-h2 text-balance">
              Ask about online coaching
            </h1>
            <p className="mt-4 text-lede text-muted">
              Personalised kettlebell programming with ongoing support, wherever you train.{" "}
              {mode === "unavailable"
                ? "For now, online coaching enquiries happen on Instagram."
                : "Answer a few quick questions and Alex replies personally."}
            </p>
            <p className="mt-3 text-sm text-muted">
              This is an enquiry, not a sign-up: nothing is booked and there&apos;s nothing to pay.
            </p>
          </header>
          <div className="min-w-0 lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1">
            {mode === "unavailable" ? (
              <InstagramFallback>
                Online coaching enquiries happen on Instagram for now. Send Alex a message (
                {site.social.instagram.handle}) with your goal and your training experience, and he&apos;ll reply
                personally.
              </InstagramFallback>
            ) : (
              <>
                {mode === "demo" ? (
                  <div className="mb-8">
                    <DemoNotice>
                      <strong>Prototype.</strong> Sending isn&apos;t switched on here, so your answers won&apos;t be sent.
                    </DemoNotice>
                  </div>
                ) : null}
                <noscript>
                  <p className="mb-6 border-2 border-ink p-5">
                    This questionnaire needs JavaScript. You can also message Alex on Instagram ({site.social.instagram.handle}).
                  </p>
                </noscript>
                <OnlineOnboarding mode={mode} />
              </>
            )}
          </div>
          <div className="lg:col-span-5 lg:row-start-2">
            <h2 className="eyebrow text-muted">What happens next</h2>
            <ol className="mt-4 space-y-5 border-t-2 border-ink pt-5">
              {next.map((step, i) => (
                <li key={step.title} className="grid grid-cols-[2rem_1fr] gap-x-3">
                  <span className="eyebrow pt-1 text-muted" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-bold">{step.title}</h3>
                    <p className="mt-1 text-sm text-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
