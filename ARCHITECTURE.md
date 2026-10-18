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
| Hosting | Vercel | `vercel.json` pins the Next.js framework preset. Static output. Account ownership and plan: see DEPLOYMENT.md |
| Package manager | npm (lockfile committed) | Node ≥ 22 |

No database, auth or payment SDK is installed — none is needed in Phase 1.

**Supabase** (connected 2026-10-17, config only): project `Alexkbells`, ref `sqkpixwvugrxllrxlexs`, region eu-west-1, URL `https://sqkpixwvugrxllrxlexs.supabase.co`. `supabaseConfig()` in `src/lib/env.ts` reads `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (server-only; bypasses RLS) on the server and returns null when either is missing. Used by the coach login and booking request storage (both plain `fetch`, server-only); `@supabase/supabase-js` is not installed. Link the CLI with `npx supabase link --project-ref sqkpixwvugrxllrxlexs`. **Caution:** the project's `public` schema also holds another app's tables (the booking table is prefixed `akb_` to keep clear of them); on 2026-10-17 it held (Prisma-managed `User`, `Listing`, `Booking`, `Review`, PMS and affiliate tables, with rows) — apparently FYStay's. Decide whether to clear it or create a fresh project before any migration from this repo.

Next 16 differs from older versions; read `node_modules/next/dist/docs/` before using an unfamiliar API (see AGENTS.md).

### Coach login (2026-10-17)

`/coach/login` signs Alex in with Supabase Auth (email + password), modelled on the coach login of his Lovable site. Plain `fetch` to the Auth REST API with the secret key, on the server only (`lib/coach-auth.ts`), so no SDK and nothing in the browser bundle.
- Only `COACH_EMAIL` addresses may sign in; any other address gets the "don't match" message without reaching Supabase.
- Session: two httpOnly, SameSite=Lax cookies scoped to `/coach` (`lib/coach-cookies.ts`): the access token (expires a minute before Supabase's, ≤1 h) and the refresh token (7 days).
- `src/proxy.ts` (matcher `/coach/:path*`) only refreshes an expired access cookie. Every coach page and Server Action authorises itself with `requireCoach()` (`lib/coach-session.ts`), which checks the token with Supabase on each request.
- `/coach` is partially prerendered: the static shell plus a `<Suspense>` section that reads the session and lists booking requests and enquiries.
- Not indexed (`noindex`, robots `Disallow: /coach$` and `/coach/`; a bare `/coach` would also block `/coaching`), not in the sitemap; linked from the footer and the phone menu.
- E2E runs against `tests/e2e/mock-supabase-auth.mjs`.

## Brand assets

`scripts/brand_assets.py` (Python + Pillow, run manually) crops the supplied
logo in `assets/brand/` into transparent PNGs in `public/brand/` and the
file-based icons in `src/app/` (`icon.png`, `apple-icon.png`), plus the
social preview image `public/og-image.png`. Outputs are committed, so builds
don't need Python.
Pillow was used because `sharp` (bundled with Next) has no native binary in
the development container.

### Supplied photos of Alex

`scripts/supplied_photos.py` (Python + Pillow, run manually) crops the
photos in `assets/journey/` to 4:5 (the before/after pair with matching
framing), resizes them to 720×900 and applies the hero video's black-and-white
grade, writing `public/journey/before.jpg`, `after.jpg` and
`public/images/alex/about.jpg` (committed).

### Hero video

`scripts/hero_video.py` (Python + OpenCV + numpy + ffmpeg, run manually)
cuts the hero loop from Alex's reel. It removes his own caption/handle
overlays by building exact per-pixel templates (pixels bright in every frame
across differently lit clips) and inpainting only those pixels, crops each
clip to 4:5, grades to black and white, and encodes VP9 WebM (first source)
and H.264 MP4 (Safari/iOS) from a lossless master, plus a JPEG poster.
Outputs (~1.2 MB each; browsers fetch one) are committed; the 30 MB source
reel is not. `HeroVideo` is the only other client component.

## Structure

```
src/
  app/                 routes, metadata, sitemap.ts, robots.ts, not-found.tsx
  components/
    layout/            SiteHeader, NavLinks (client), SiteFooter, Logo
    booking/           BookingPage, BookingWizard, AvailabilityCalendar, OnlineOnboarding, ui (client)
    ui/                ButtonLink, Section, Provisional
    sections/          Timetable, PriceList, Location, Faq, CtaBand, PageHeader, JsonLd
  content/             typed business data (single source of truth) + tests
  lib/                 booking modes, request/enquiry parsing, form validation, publish gate, schedule/format helpers, env, routes
    availability/      availability interface, dates, demonstration provider
tests/e2e/             Playwright specs
```

Client components: `NavLinks.tsx` (menu state), `HeroVideo.tsx`, `StartTraining.tsx` / `TrainingIntro.tsx` (swipe button and booking intro), and the booking journeys in `components/booking/`.

## Key decisions

1. **Content as typed modules, not a CMS.** Small, rarely changing data; type-checked; reviewed in Git. Revisit (Supabase table or headless CMS) when Alex needs to edit without a developer — Phase 4.
2. **Status-gated content.** `ContentStatus` + `Provisional` component + `CONTENT_PREVIEW` lets unconfirmed information be reviewed without ever shipping it to production.
3. **Booking boundary** (`src/lib/booking.ts`). Pages ask for a `CallToAction` and a `bookingMode()`; they never know the provider. Modes, in order: `external` (`BOOKING_URL`, https only) → `demo` (`BOOKING_DEMO=true`, impossible on Vercel production) → `request` (Supabase storage and/or Resend email configured) → `unavailable` (Instagram prompt). Since 2026-10-18 `/book` is public: `getPrimaryCta()` sends "Start your training" there whenever the mode isn't `unavailable` (and always on previews); `getPrimaryCtaFor()` deep-links a service's own page.
4. **Guided booking** (`components/booking/BookingWizard.tsx`). Three steps — service, when, details — with a stepper, a summary with "Change" links, Back, and a Continue button disabled until the step is complete. Choices are native radios/checkboxes styled as tiles (keyboard and screen readers work by default); focus moves to each new step's heading. State lives in the client until the final step, which posts to a Server Action (`src/app/book/actions.ts`).
   - *demo*: a month calendar of **demonstration availability** (`lib/availability/demo.ts`), labelled "Demo" on the page, above the calendar and in the summary. Finishing shows "No booking has been made"; nothing is sent. The demo module is loaded with a dynamic `import()` so it never downloads in request mode, and the server refuses any posted `slot`.
   - *request*: group classes show real dates from the confirmed timetable (`lib/availability/timetable.ts`, `source: "live"`, next 28 days, every date requestable since capacity is unknown) with the class set out like Alex's listing (`groupClass` in `content/classes.ts`); the server re-checks the date is a real class day in the window (`isClassDate`). One-to-one asks for preferred days and times. Alex confirms each request.
   - **Replacing the demo with real availability:** implement `AvailabilityProvider` (`lib/availability/types.ts`) for the chosen provider or backend, add a `live` mode that uses it, and make the final step create the booking through that provider (server-side, idempotent, confirmed only by the provider's response). The calendar and wizard do not change.
5. **Request and enquiry delivery.** Server-side validation (`src/lib/booking-request.ts`, `src/lib/online-enquiry.ts`; field rules shared with the browser in `src/lib/form-validation.ts`), spam checks (honeypot + minimum fill time), then `deliverRequest()` (`src/lib/deliver-request.ts`): stored in Supabase (`src/lib/request-store.ts`, table `akb_booking_requests`, upsert on an idempotency key so retries store once) and/or emailed via Resend with the same key. Success is shown only when at least one route accepted it. The coach area (`/coach`) lists stored requests newest first. Table: `supabase/migrations/20261017000000_akb_booking_requests.sql` (applied 2026-10-18): RLS on with no policies and anon/authenticated revoked, so only the server (secret key) reads or writes it.
6. **Online coaching onboarding** (`/online-coaching`, `components/booking/OnlineOnboarding.tsx`). Not a calendar: goal → training → contact → review & send, with progressive disclosure ("Something else" asks for detail; a phone number or Instagram username is asked for only if that contact method is chosen). Reuses the same primitives, validation and email delivery. No health questions.
7. **e2e servers.** Playwright builds two copies: the main one (`.next`, booking demo on, email to `tests/e2e/mock-email-server.mjs`) and a Vercel-production one (`NEXT_DIST_DIR=.next-e2e-production`, `VERCEL_ENV=production` with `BOOKING_DEMO` and `CONTENT_PREVIEW` set by mistake) that must show no demo or provisional content. `tsconfig.json` lists the second build's types folder so builds don't rewrite it.
8. **No embedded map.** Google Maps link only, avoiding third-party cookies and a consent banner.

## Environment variables

See `.env.example`. All are server/build-time only (no `NEXT_PUBLIC_*`).

| Name | Purpose |
|---|---|
| `SITE_URL` | Canonical origin (metadata, sitemap, JSON-LD). Validated; falls back to `VERCEL_PROJECT_PRODUCTION_URL`, then localhost |
| `BOOKING_URL` | External booking page (https only); takes priority over everything else |
| `BOOKING_DEMO` | `true` shows demonstration availability on `/book` (previews/local only). **Ignored when `VERCEL_ENV=production`** |
| `RESEND_API_KEY`, `BOOKING_NOTIFY_EMAIL`, `BOOKING_FROM_EMAIL` | Booking request form delivery; all three valid → form on, else off. Server-only |
| `RESEND_API_URL` | Tests only: endpoint override, accepted only for https or `http://localhost` |
| `CONTENT_PREVIEW` | `true` on preview deployments only. **Ignored when `VERCEL_ENV=production`** |
| `PLAYWRIGHT_CHROMIUM_PATH`, `NEXT_DIST_DIR`, `E2E_PORT`, `E2E_PRODUCTION_PORT`, `MOCK_EMAIL_PORT` | Tests only |

Per-environment values: DEPLOYMENT.md. Non-production deployments (and local
builds with `CONTENT_PREVIEW=true`) get `robots.txt` Disallow plus a
`noindex, nofollow` meta tag (`isIndexable` in `src/lib/env.ts`).

Metadata: `src/lib/metadata.ts` `pageMetadata()` gives every page its own
title, description, canonical URL and Open Graph/Twitter preview. The share
image (`public/og-image.png`) is declared explicitly because a page-level
`openGraph` object replaces the layout's.

## Security

- Headers (`src/lib/security-headers.ts`, applied in next.config.ts): `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`, HSTS (no preload); `X-Powered-By` removed.
- CSP on builds (not `next dev`): first-party only for scripts, styles, fonts, media, connections; `frame-ancestors`/`object-src` `'none'`. `script-src` needs `'unsafe-inline'` because nonces would force dynamic rendering. Vercel preview deployments also allow `vercel.live` for the Toolbar. Any new third-party service must be added here deliberately.
- JSON-LD escapes `<`.
- No secrets exist yet; `.env*` is git-ignored except `.env.example`.
- `npm audit --omit=dev` (2026-10-15): **0 vulnerabilities** in production dependencies. Full audit: 5 high-severity advisories, all via `braces` in the dev-only ESLint toolchain (`eslint-config-next` → `fast-glob`); not shipped to the browser. The suggested `--force` fix downgrades to Next 14 config — do not apply; update when `eslint-config-next` publishes a fix.
- `playwright-core` is pinned as a devDependency so `@axe-core/playwright` uses the same Playwright version as the tests.

## Enquiry form options (not implemented)

The booking and online coaching journeys (above) use option 3. The
contact page itself still has no form; options for general enquiries, in
order of effort:

1. **Instagram only (current).** No personal data stored by the site.
2. **`mailto:` link** — needs a confirmed public email address; no backend.
3. **Server Action + email API** (e.g. Resend/Postmark): server-side
   validation, honeypot + rate limit, sends to Alex's inbox, stores nothing.
   Needs: a confirmed recipient address, an email provider account owned by
   Alex with a verified sending domain (needs the domain decision), an API key
   in Vercel env vars, and a privacy notice. Avoid hosted form widgets that
   would need CSP exceptions and third-party data processing.

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
