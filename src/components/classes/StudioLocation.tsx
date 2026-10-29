import { mapsUrl, site } from "@/content/site";

/**
 * Where the classes are: the street, town and postcode, with Get directions
 * (Alex via the owner, 2026-10-29: the address only, no venue name, no booking
 * button). Used under the class times on home and as Classes' "Studio location".
 */
export function StudioLocation({ className = "mt-8" }: { className?: string }) {
  const l = site.location;
  return (
    <section aria-labelledby="ct-venue" className={`${className} grid grid-cols-[auto_1fr] items-start gap-x-[1.125rem] gap-y-4 rounded-[1.375rem] bg-white px-5 py-[1.375rem]`}>
      <svg viewBox="0 0 34 44" aria-hidden="true" className="ct-pin h-11 w-[2.125rem]">
        <path d="M17 42s14-14.5 14-25A14 14 0 0 0 3 17c0 10.5 14 25 14 25z" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="17" cy="17" r="5" fill="currentColor" />
      </svg>
      <div className="min-w-0">
        <p className="eyebrow mb-1.5">Where we train</p>
        <p id="ct-venue" className="text-xl font-extrabold tracking-[-0.01em]">
          {l.street}
        </p>
        <address className="mt-1 leading-normal not-italic">
          <span className="block">
            {l.town}, {l.city}
          </span>
          <span className="block font-semibold tracking-[0.06em]">{l.postcode}</span>
        </address>
      </div>
      <a
        href={mapsUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="col-span-2 flex min-h-12 items-center justify-center rounded-full border-[1.5px] border-ink px-5 font-semibold hover:bg-ink hover:text-paper motion-safe:transition-colors"
      >
        Get directions<span className="sr-only"> to the class location (opens in a new tab)</span>
      </a>
    </section>
  );
}
