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

All are read at build time on the server; none reach the browser.

| Variable | Production | Preview | Notes |
|---|---|---|---|
| `SITE_URL` | `https://<chosen domain>` once decided | — | Canonical URLs, sitemap, social previews. Invalid values are ignored. Until set, falls back to the project's production URL (`alexkbells.vercel.app`) |
| `CONTENT_PREVIEW` | **do not set** | `true` | Shows provisional prices/times with an orange review frame. Ignored on production even if set by mistake |
| `BOOKING_URL` | only when a booking provider is confirmed (https) | optional, to test | Unset → class buttons say "Enquire about classes" and go to /contact |

`VERCEL_ENV` and `VERCEL_PROJECT_PRODUCTION_URL` are set by Vercel
automatically.

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
   add `SITE_URL` for Production, leave `CONTENT_PREVIEW` unset for Production.
5. Merge to the production branch → production deployment. Check `/`,
   `/classes`, `/coaching`, `/contact`, `/robots.txt` (should allow), and that
   no prices or times appear unless confirmed.
6. Add the custom domain in Vercel and update DNS at the registrar
   (**only with Alex's approval**). Vercel issues HTTPS automatically.
7. After DNS resolves: share a page on WhatsApp/Facebook to check the preview
   image, and submit the sitemap in Google Search Console (Alex's account).
