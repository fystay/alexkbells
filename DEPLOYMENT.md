# DEPLOYMENT — Alex K Bells

How the site gets from GitHub to a preview URL, then to launch.
Nothing here has been deployed to production. Last reviewed: 2026-10-15.

## Current state (inspected read-only via the Vercel API, 2026-10-15)

| Item | State |
|---|---|
| Vercel project | `alexkbells` in the **developer's personal Hobby account** (`fystay1`) — not Alex's |
| Git connection | `fystay/alexkbells`, branch `phase-1-public-website`; every push creates a **preview** deployment |
| Framework preset | Was "Other", so every deployment served **404 for all pages** (only files in `public/` worked). Fixed in the repo by `vercel.json` → `"framework": "nextjs"`; confirm on the next preview |
| Production | No live production deployment (the first one failed). `alexkbells.vercel.app` is reserved for the project |
| Environment variables | None set |
| Deployment Protection | Vercel Authentication on all deployments except custom domains — reviewers must be logged in to the Vercel team, or be sent a share link |
| Node.js | Project setting 24.x; the repo is tested on Node 22 (`engines: >=22`). Either works; setting 22.x matches the tested version |

## Account ownership (decision for Alex)

Alex should own the accounts that keep the business online, and add the
developer as a member:

1. **Vercel**: create the project in an account or team Alex owns and pays
   for. Vercel describes the Hobby plan as for personal, non-commercial use;
   check the current terms at vercel.com/pricing before launch — a business
   site is likely to need Pro.
2. **GitHub**: transfer `fystay/alexkbells` to Alex (or an organisation he
   owns), or keep it with the developer under a written agreement.
3. **Domain**: register in Alex's name, with renewal on his card.

Moving Vercel projects between accounts is easiest by importing the GitHub
repo into Alex's account and deleting the old project after launch.

## Environment variables

All are read on the server only; none reach the browser (an e2e test checks
the JavaScript bundles and the /book HTML). Changing any of them needs a
redeploy: pages, including `/book`, are prerendered at build time.

| Variable | Production | Preview | Notes |
|---|---|---|---|
| `SITE_URL` | `https://<chosen domain>` once decided | — | Canonical URLs, sitemap, social previews. Invalid values are ignored. Until set, falls back to the project's production URL (`alexkbells.vercel.app`) |
| `CONTENT_PREVIEW` | **do not set** | `true` | Shows provisional prices/times with an orange review frame. Ignored on production even if set by mistake |
| `BOOKING_URL` | Alex's external booking page (https), only if he chooses a hosted provider | optional, to test | Set → "Book" buttons open it in a new tab; takes priority over everything else |
| `BOOKING_DEMO` | **do not set** (ignored anyway) | `true` to demo the booking calendar to Alex | Shows labelled sample availability on `/book`; nothing is booked or sent. Ignored when `VERCEL_ENV=production` |
| `RESEND_API_KEY` | Optional since requests are stored in Supabase: API key from Alex's own Resend account, "sending access" only | a separate test key, optional | Mark as Sensitive in Vercel. With the two settings below, also emails each request to Alex |
| `BOOKING_NOTIFY_EMAIL` | Alex's inbox for booking requests | a test inbox | Requests arrive here with Reply-To set to the visitor |
| `BOOKING_FROM_EMAIL` | e.g. `Alex K Bells <bookings@<verified domain>>` | same | Must be on a domain verified in Resend (needs the domain decision; DNS records with Alex's approval) |
| `SUPABASE_URL` | `https://sqkpixwvugrxllrxlexs.supabase.co` — **set** | same — **set** | Project `Alexkbells` in the developer's Supabase organisation. Turns on booking requests (stored) and the coach login |
| `SUPABASE_SECRET_KEY` | secret key (`sb_secret_...`) from the Supabase dashboard — **set 2026-10-17** | same — **set** | Sensitive. Bypasses RLS, so server code only. `SUPABASE_URL` also set for both, 2026-10-17 |
| `COACH_EMAIL` | **set 2026-10-18** to the developer's account (Supabase user created the same day); change to Alex's email at handover (comma-separate to allow more than one) | same — **set** | Turns on `/coach/login` with the two Supabase settings. Only these addresses can sign in |

"Start your training" opens `/book` whenever booking works: on production that is the
case as soon as `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are set (they are, since
2026-10-17), and Vercel **Preview** always opens it. With no booking route at all
it falls back to /contact, `/book` shows the Instagram prompt and production builds
log a warning. **On Preview, `BOOKING_DEMO=true` takes priority** and shows the
labelled sample calendar; delete it from Preview to try the real flow there (requests
from previews then land in the same table as production ones).

### Booking requests: what to know (live on production from 2026-10-18)

- `/book` takes **requests**, not confirmed bookings. Group classes: a real
  date from the confirmed timetable (next four weeks); one-to-one: preferred
  days and times. Capacity is unknown, so Alex confirms each place.
- Each request is **stored in Supabase** (`akb_booking_requests`, EU West) and
  listed in the coach area (`/coach`, after the coach login). If the Resend
  settings are also set, it is emailed to Alex too. Success is shown only when
  at least one of those accepted it; otherwise the visitor sees an error and is
  pointed to Instagram. `/online-coaching` enquiries work the same way.
- Without `COACH_EMAIL` and Alex's Supabase login (see Coach login below),
  requests are stored but **nobody can see them on the site**: set those up
  before relying on it.
- Personal data is stored in Supabase and passes through Vercel (and Resend
  if set), as described on `/privacy`. **Alex must review the privacy notice**
  (who's responsible, retention) and decide how long requests are kept.
- Spam protection: hidden honeypot field plus a minimum fill time (3 s).
  Duplicate submissions share an idempotency key, so a double-click sends
  one email and stores one row. No CAPTCHA (keeps the CSP first-party); add one if spam appears.
- To test email delivery too, set the three Resend variables (a test inbox for
  Preview), redeploy and send a request.



### Coach login: setup

1. In Supabase (project `Alexkbells`) → Authentication → Users → **Add user**: Alex's email and a strong password (tick "Auto confirm"). Let Alex change it, or send him a password reset.
2. Authentication → Sign In / Providers: turn **off** "Allow new users to sign up". (The site already ignores any address not in `COACH_EMAIL`; this stops strangers creating accounts at all.)
3. Set `COACH_EMAIL` in Vercel for Production and Preview, then redeploy.

`VERCEL_ENV` and `VERCEL_PROJECT_PRODUCTION_URL` are set by Vercel
automatically.

### Coach portal: setup (2026-10-19)

The portal uses the same settings as the coach login (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `COACH_EMAIL`); no new environment variables. It needs one database migration:

1. **Back up first** (Supabase → Database → Backups, or `pg_dump`). The project also holds another app's tables; the migration touches only `akb_*` objects. On 2026-10-19 `akb_booking_requests` was the only `akb_` table and held no rows.
2. Apply `supabase/migrations/20261019000000_akb_coach_portal.sql`, either with the CLI (`npx supabase link --project-ref sqkpixwvugrxllrxlexs` then `npx supabase db push`) or by pasting it into the SQL editor. It is safe to run again. It ends with `notify pgrst, 'reload schema'` so the API sees the new tables at once.
3. Check: Supabase → Advisors (security) shows no new warnings for `akb_*`; `/coach` shows the dashboard instead of "tables aren't set up yet".
4. Turn off public sign-ups (Authentication → Sign In / Providers) if not done: only `COACH_EMAIL` accounts get in either way, but this stops strangers creating accounts.

**Applied 2026-10-18 (UK), with the owner's approval**, to project `Alexkbells` (`sqkpixwvugrxllrxlexs`, eu-west-1), which production and previews both use. Done through the Supabase MCP `execute_sql` tool in small transactions (its `apply_migration` call, and any statement containing `DROP` or `DELETE`, timed out waiting for a confirmation step), each ending with the migration's access lock-down. Verified afterwards: all 15 `akb_*` tables have RLS on and no policies; `anon`/`authenticated` can't read any table or view or execute any function; `service_role` can; the API answers "permission denied" (not "not found") for the new tables with the publishable key; a service-role smoke test (part payment, overpayment refused, class place) passed and was rolled back. The 2 existing requests were kept, and the one with a class date was backfilled.

**Still to run by hand** (one SQL Editor paste): the three functions whose bodies contain `DELETE` (`akb_void_charge`, `akb_record_refund`, `akb_set_payment_status`), copied verbatim from the migration, plus the entry in `supabase_migrations.schema_migrations` that marks `20261019000000` as applied. Until then: cancelling a charge, refunds, marking a payment failed/void, and cancelling a class place or session that has an unpaid charge show "tables aren't set up yet"; everything else works.

Data kept: client details, bookings, payments and notes, all in Supabase (EU West). Alex should add retention to the privacy notice (e.g. delete former clients' records after N years; financial records are usually kept six years in the UK). A former client with no bookings or payments can be deleted from their record; anyone with history is kept (set them to Former).

## Safety built into the code

- Provisional content needs `CONTENT_PREVIEW=true` **and** a non-production
  deployment (`src/lib/publish.ts`); unit-tested.
- Non-production deployments send `robots.txt` Disallow and a `noindex` meta
  tag (`src/lib/env.ts` `isIndexable`).
- Security headers incl. a first-party CSP (`src/lib/security-headers.ts`);
  previews additionally allow the Vercel Toolbar.

## Get a preview URL now

1. Push this branch (done as part of this change). Vercel builds it as a
   preview automatically.
2. In Vercel → project → Deployments, open the newest deployment and check it
   shows the homepage (not a 404).
3. Optional, for Alex's review of provisional content: Settings → Environment
   Variables → add `CONTENT_PREVIEW` = `true` for **Preview** only, then
   redeploy.
4. To let Alex view it without a Vercel login, use the deployment's **Share**
   button (shareable link), or relax Deployment Protection for previews.

## Launch checklist

1. Alex decides account ownership (above) and the domain.
2. Alex confirms or withholds: timetable, prices, booking provider (see
   CONTENT.md → Questions for Alex). Confirmed items get `status: "confirmed"`.
3. Alex confirms permission for people shown in the hero video.
4. In the owning Vercel project: set the production branch (e.g. `main`),
   add `SITE_URL` for Production, leave `CONTENT_PREVIEW` unset for Production,
   and add the booking form settings (`RESEND_API_KEY`, `BOOKING_NOTIFY_EMAIL`,
   `BOOKING_FROM_EMAIL`) or `BOOKING_URL`. Send a test request and check it arrives.
5. Merge to the production branch → production deployment. Check `/`,
   `/classes`, `/coaching`, `/contact`, `/book`, `/privacy`, `/robots.txt` (should allow), and that
   no prices or times appear unless confirmed.
6. Add the custom domain in Vercel and update DNS at the registrar
   (**only with Alex's approval**). Vercel issues HTTPS automatically.
7. After DNS resolves: share a page on WhatsApp/Facebook to check the preview
   image, and submit the sitemap in Google Search Console (Alex's account).
