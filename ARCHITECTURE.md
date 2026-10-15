# ARCHITECTURE — Alex K Bells

## Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 16.4 (App Router), React 19.3 | `cacheComponents` + `partialPrefetching` enabled (scaffold defaults). All routes prerender as static. |
| Language | TypeScript, `strict` | No `any`. |
| Styling | Tailwind CSS v4 | Tokens in `src/app/globals.css` `@theme` |
| Fonts | `next/font/google` (Archivo variable) | Downloaded at build and self-hosted; no runtime request to Google |
| Unit tests | Vitest 5 | `src/**/*.test.ts` |
| E2E / a11y | Playwright 1.56 + axe-core | `tests/e2e` |
| Hosting | Vercel (planned) | Static output; free/hobby tier is likely sufficient — confirm commercial-use terms for the client's account |
| Package manager | npm (lockfile committed) | Node ≥ 22 |

No database, auth or payment SDK is installed — none is needed in Phase 1.

Next 16 differs from older versions; read `node_modules/next/dist/docs/` before using an unfamiliar API (see AGENTS.md).

## Brand assets

`scripts/brand_assets.py` (Python + Pillow, run manually) crops the supplied
logo in `assets/brand/` into transparent PNGs in `public/brand/` and the
file-based metadata images in `src/app/` (`icon.png`, `apple-icon.png`,
`opengraph-image.png`). Outputs are committed, so builds don't need Python.
Pillow was used because `sharp` (bundled with Next) has no native binary in
the development container.

## Structure

```
src/
  app/                 routes, metadata, sitemap.ts, robots.ts, not-found.tsx
  components/
    layout/            SiteHeader, NavLinks (client), SiteFooter, Logo
    ui/                ButtonLink, Section, Provisional
    sections/          Timetable, PriceList, Location, Faq, CtaBand, PageHeader, JsonLd
  content/             typed business data (single source of truth) + tests
  lib/                 booking adapter, publish gate, schedule/format helpers, env, routes
tests/e2e/             Playwright specs
```

Only `NavLinks.tsx` is a client component (needs `usePathname` and menu state).

## Key decisions

1. **Content as typed modules, not a CMS.** Small, rarely changing data; type-checked; reviewed in Git. Revisit (Supabase table or headless CMS) when Alex needs to edit without a developer — Phase 4.
2. **Status-gated content.** `ContentStatus` + `Provisional` component + `CONTENT_PREVIEW` lets unconfirmed information be reviewed without ever shipping it to production.
3. **Booking boundary** (`src/lib/booking.ts`). Pages ask for a `CallToAction`; they never know the provider. Phase 1 supports an external `BOOKING_URL` (https only) and otherwise falls back to an enquiry. A Square/Setmore/custom adapter can replace the module later.
4. **No contact form in Phase 1.** Avoids storing personal data before privacy, spam protection and an email provider are decided.
5. **No embedded map.** Google Maps link only, avoiding third-party cookies and a consent banner.

## Environment variables

See `.env.example`. All are server/build-time only (no `NEXT_PUBLIC_*`).

| Name | Purpose |
|---|---|
| `SITE_URL` | Canonical origin (metadata, sitemap, JSON-LD). Falls back to `VERCEL_PROJECT_PRODUCTION_URL`, then localhost |
| `BOOKING_URL` | External booking page; empty → enquiry CTAs |
| `CONTENT_PREVIEW` | `true` on preview deployments only |
| `PLAYWRIGHT_CHROMIUM_PATH` | Tests only |

`robots.txt` disallows everything unless `VERCEL_ENV` is `production` (or unset locally) and preview mode is off.

## Security

- Headers (next.config.ts): `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`; `X-Powered-By` removed.
- CSP deferred: a nonce-based CSP forces dynamic rendering. Add a static CSP (hash-based or `'unsafe-inline'`-free review) when third-party scripts are introduced.
- JSON-LD escapes `<`.
- No secrets exist yet; `.env*` is git-ignored except `.env.example`.
- `npm audit` (2026-10-15): 5 high-severity advisories, all via `braces` in the dev-only ESLint toolchain (`eslint-config-next` → `fast-glob`). Not shipped to the browser. The suggested `--force` fix downgrades to Next 14 config — do not apply; update when `eslint-config-next` publishes a fix.

## Phase 2+ proposals (not implemented)

**Booking & payments** — choose one after confirming capabilities:
- *A. Hosted provider* (Setmore or Square Appointments): set `BOOKING_URL`. Lowest effort, no PII stored by us.
- *B. Custom booking + Square Online Checkout*: Next.js Route Handlers → Supabase Postgres; Square payment links; Square webhooks verified with the documented HMAC-SHA256 `x-square-hmacsha256-signature` (verify against current docs before building). Payment status only ever set from verified webhooks, never from the client.

Draft data model for B:
- `class_types(id, name, duration_min, capacity, price_pence)`
- `class_sessions(id, class_type_id, starts_at, capacity_override, status)`
- `customers(id, auth_user_id, name, email, phone, created_at)` — no health data
- `bookings(id, session_id, customer_id, status[pending|confirmed|cancelled], idempotency_key UNIQUE, created_at)` with `UNIQUE(session_id, customer_id)`
- `payments(id, booking_id, provider, provider_payment_id UNIQUE, status, amount_pence, raw_event_id UNIQUE)`
- Capacity enforced in a transaction (`SELECT … FOR UPDATE` on the session or a counted insert with a check) to handle the last-place race.
- RLS: customers read/write only their own rows; admin role via custom claim; service role only in server code.

**Membership** — Square Subscriptions if enabled on Alex's account; otherwise defer. Never build a checkout for an undefined plan.
