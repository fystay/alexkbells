# CONTENT — Alex K Bells

## Where content lives (single source of truth)

| Content | File |
|---|---|
| Brand, address, contact, social, logo, photos, nav | `src/content/site.ts` |
| Class timetable | `src/content/classes.ts` |
| Services, descriptions, prices | `src/content/services.ts` |
| FAQ | `src/content/faq.ts` (timetable answer is generated from `classes.ts`) |
| Page-specific copy | the page file in `src/app/**/page.tsx` |

## Approval workflow

Every customer-critical item has `status: "confirmed" | "provisional"`.

- **Production** (`CONTENT_PREVIEW` unset): provisional items are hidden. Fallbacks are neutral, e.g. "Get in touch for current pricing", "The class timetable is being finalised".
- **Preview** (`CONTENT_PREVIEW=true`, Vercel preview only): provisional items render inside a dashed amber "Preview · awaiting confirmation" frame for Alex to review.
- To publish: change the item's status to `"confirmed"`, update `src/content/content.test.ts` (it deliberately fails if something is confirmed by accident), and record the approval date below.

## Sitemap

| Route | Purpose |
|---|---|
| `/` | Hero, class times, services, why kettlebells, about, coaching options, location, FAQ, CTA |
| `/classes` | Timetable, joining info, location |
| `/coaching` | One-to-one (`#one-to-one`) and online (`#online`) |
| `/contact` | Instagram (primary), email/phone when supplied, address, directions |

**Trade-offs taken**

- `/one-to-one` and `/online-coaching` were merged into `/coaching` with anchors: with the verified information available each would be a few sentences. Split them once there is enough real content (session format, programme examples, photos).
- `/about` is a homepage section only. Without a verified bio, qualifications or photos a standalone page would be thin. Add `/about` once Alex supplies these.
- Membership is omitted entirely until defined.
- No contact form: it needs an email provider, spam protection and a privacy notice (Phase 2).

## Copy rules

- Use only verified wording for offers: "tailored to the individual", "personalised programming, support and progression".
- Benefits copy is hedged ("can build") and makes no medical or results claims.
- Don't use pronouns for Alex in site copy unless confirmed preferences are recorded here.

## Asset inventory

| Asset | Status | Needed at |
|---|---|---|
| Logo (AR monogram + ALEX.KBELLS + KETTLEBELL COACH) | **Missing** | `public/brand/logo.png` or `.svg`, then set `site.logo` with real pixel size and `onDark` |
| Favicon / app icon | Missing (derive from logo) | `src/app/icon.png`, `src/app/apple-icon.png` |
| Open Graph image | Missing (1200×630, derive from logo/photo) | `src/app/opengraph-image.png` |
| Hero photo of Alex coaching | Missing | `public/images/`, set `site.photos.hero` |
| About photo | Missing | `public/images/`, set `site.photos.about` |

## Questions for Alex (client approval required)

Classes
1. Confirm Mon 18:30, Wed 18:30, Sat 09:00 — every week? From what date?
2. Class duration? Maximum capacity?
3. Price per class (drop-in / packs)?
4. Is advance booking required? Can people turn up?
5. Is equipment provided? Anything to bring?
6. Suitable for complete beginners? Any minimum age?
7. Cancellation and refund rules?

Coaching
8. Reconfirm: one-to-one from £35/session; 4 sessions £130/month; online £79/month.
9. Session length; where one-to-one sessions take place (always Media House?).
10. How online coaching works day to day (app? check-ins? video review?).

About & trust
11. Short bio in Alex's words; qualifications/certifications (with names of issuing bodies).
12. Permission to use specific Instagram photos/videos on the site.
13. Any testimonials Alex has written permission to publish (name/initial consent).

Contact
14. Public email address and/or phone number? Preferred contact method?

## Approval log

| Date | Item | Approved by |
|---|---|---|
| — | — | — |
