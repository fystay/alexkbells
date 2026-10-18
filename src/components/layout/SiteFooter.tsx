import Link from "next/link";
import { footerNav, formatAddressLines, mapsUrl, site } from "@/content/site";
import { Logo } from "./Logo";

// 44px tap targets on touch layouts; compact rows on desktop.
const footerLink =
  "inline-flex min-h-11 items-center hover:underline underline-offset-4 lg:min-h-0 lg:py-1";

export function SiteFooter() {
  const { email, phone } = site.contact;

  return (
    <footer className="border-t border-line-inverse bg-ink text-paper">
      {/* Mobile: brand, then Explore (sized to its links) | Contact + Find us. */}
      <div className="container-page grid grid-cols-[auto_minmax(0,1fr)] gap-x-12 gap-y-10 sm:gap-x-20 py-14 sm:py-16 lg:grid-cols-12 lg:gap-8">
        <div className="col-span-2 lg:order-1 lg:col-span-5">
          <Logo variant="lockup" tone="dark" />
          <p className="mt-5 max-w-sm text-sm text-muted-inverse">
            Kettlebell coaching in Cumbernauld: group classes, one-to-one coaching and
            online coaching.
          </p>
        </div>

        <nav aria-label="Footer" className="lg:order-2 lg:col-span-2">
          <h2 className="eyebrow text-muted-inverse">Explore</h2>
          <ul className="mt-2 text-sm lg:mt-4">
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={footerLink}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* lg:contents lets both blocks rejoin the 12-column grid on desktop. */}
        <div className="flex min-w-0 flex-col gap-10 sm:flex-row sm:gap-20 lg:contents">
          <div className="lg:order-4 lg:col-span-2">
            <h2 className="eyebrow text-muted-inverse">Contact</h2>
            <ul className="mt-2 text-sm lg:mt-4">
              <li>
                <a
                  href={site.social.instagram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={footerLink}
                >
                  Instagram
                  <span className="sr-only"> {site.social.instagram.handle} (opens in a new tab)</span>
                </a>
              </li>
              <li>
                <a
                  href={site.social.facebook.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={footerLink}
                >
                  Facebook
                  <span className="sr-only"> {site.social.facebook.name} (opens in a new tab)</span>
                </a>
              </li>
              {email ? (
                <li>
                  <a href={`mailto:${email}`} className={`${footerLink} break-all`}>
                    {email}
                  </a>
                </li>
              ) : null}
              {phone ? (
                <li>
                  <a href={`tel:${phone.replace(/\s+/g, "")}`} className={footerLink}>
                    {phone}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          <div className="lg:order-3 lg:col-span-3">
            <h2 className="eyebrow text-muted-inverse">Find us</h2>
            <address className="mt-4 text-sm not-italic leading-relaxed">
              {formatAddressLines().map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <a
              href={mapsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className={`${footerLink} mt-1 text-sm underline lg:mt-2`}
            >
              Open in Google Maps<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-line-inverse">
        <div className="container-page flex flex-col gap-1 py-5 text-xs text-muted-inverse sm:flex-row sm:items-center sm:justify-between">
          <p>
            {site.name} · {site.descriptor}
          </p>
          <p className="flex flex-wrap items-center gap-x-4">
            <span>
              {site.location.town}, {site.location.region}
            </span>
            <Link href="/privacy" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:no-underline">
              Privacy notice
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
