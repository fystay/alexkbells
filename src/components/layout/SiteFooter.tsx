import Link from "next/link";
import { formatAddressLines, mainNav, mapsUrl, site } from "@/content/site";
import { Logo } from "./Logo";

export function SiteFooter() {
  const { email, phone } = site.contact;

  return (
    <footer className="border-t border-line-inverse bg-ink text-paper">
      <div className="container-page grid grid-cols-1 gap-12 py-16 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <Logo tone="dark" />
          <p className="mt-6 max-w-sm text-sm text-muted-inverse">
            Kettlebell coaching in Cumbernauld: group classes, one-to-one coaching and
            online coaching.
          </p>
        </div>

        <nav aria-label="Footer" className="lg:col-span-2">
          <h2 className="eyebrow text-muted-inverse">Explore</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/" className="hover:underline">
                Home
              </Link>
            </li>
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lg:col-span-3">
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
            className="mt-3 inline-block text-sm underline underline-offset-4 hover:no-underline"
          >
            Open in Google Maps<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>

        <div className="lg:col-span-2">
          <h2 className="eyebrow text-muted-inverse">Contact</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a
                href={site.social.instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Instagram {site.social.instagram.handle}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
            {email ? (
              <li>
                <a href={`mailto:${email}`} className="hover:underline">
                  {email}
                </a>
              </li>
            ) : null}
            {phone ? (
              <li>
                <a href={`tel:${phone.replace(/\s+/g, "")}`} className="hover:underline">
                  {phone}
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="border-t border-line-inverse">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-muted-inverse sm:flex-row sm:justify-between">
          <p>
            {site.name} · {site.descriptor}
          </p>
          <p>
            {site.location.town}, {site.location.region}
          </p>
        </div>
      </div>
    </footer>
  );
}
