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
| `/` | Conversion journey: hero ("Get stronger. Move better." + **Book your class** + video) → benefits (+ booking button) → group classes (+ booking button) → about → one-to-one & online (secondary) → location → FAQ → closing CTA |
| `/classes` | Booking button + "How to join", timetable (`#timetable`), 3-step how to join (`#book`), location |
| `/coaching` | One-to-one (`#one-to-one`) and online (`#online`) |
| `/contact` | Instagram (primary), email/phone when supplied, address, directions |

**Trade-offs taken**

- `/one-to-one` and `/online-coaching` were merged into `/coaching` with anchors: with the verified information available each would be a few sentences. Split them once there is enough real content (session format, programme examples, photos).
- `/about` is a homepage section only. Without a verified bio, qualifications or photos a standalone page would be thin. Add `/about` once Alex supplies these.
- Membership is omitted entirely until defined.
- No contact form: it needs an email provider, spam protection and a privacy notice (Phase 2).

## Copy rules

- Primary CTA text is "Book your class" (`BOOK_LABEL` in `src/lib/booking.ts`), shown only when `BOOKING_URL` is a valid https link. Without it, buttons honestly read "Enquire about classes" → /contact; never label the contact page as booking.
- Hero copy does not name Media House: much of the hero footage was filmed at other gyms.
- Benefits: build strength, improve fitness, train with confidence, stay consistent — hedged ("can"), no "expert" claims (qualifications unconfirmed), no weight-loss or transformation promises.

- Use only verified wording for offers: "tailored to the individual", "personalised programming, support and progression".
- Benefits copy is hedged ("can build") and makes no medical or results claims.
- Don't use pronouns for Alex in site copy unless confirmed preferences are recorded here.

## Asset inventory

| Asset | Status | Needed at |
|---|---|---|
| Logo source (1254×1254 JPG, white on black) | **Supplied 2026-10-15** | `assets/brand/alexkbells-logo-source.jpg` (not public) |
| Logo mark (monogram crop, transparent) | Generated | `public/brand/logo-mark.png` — header |
| Logo lockup (full crop, transparent) | Generated | `public/brand/logo-lockup.png` — footer |
| Favicon / apple icon | Generated (monogram on ink) | `src/app/icon.png`, `src/app/apple-icon.png` |
| Open Graph / social preview image | Generated (lockup on ink, 1200×630) | `public/og-image.png`, declared for every page in `src/lib/metadata.ts` |
| Vector (SVG) logo | Not available — the JPG is the only version | Don't request again; derived PNGs are the master web assets |
| Hero video (9 clips, 8.3 s, B&W, silent, 4:5; opens on the group class) | Generated 2026-10-15 from Alex's reel | `public/media/hero.webm`, `hero.mp4`, `hero-poster.jpg`; configured as `site.heroVideo`. Regenerate with `scripts/hero_video.py` (source reel not committed — 30 MB) |
| Hero photo of Alex coaching | Not needed while the video is set | `public/images/`, set `site.photos.hero` |
| About photo | Missing | `public/images/`, set `site.photos.about` |

Regenerate all derived logo files with `python3 scripts/brand_assets.py` (needs Pillow) if the source changes.

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

Hero video
- Confirm everyone identifiable in the clips is happy to appear on the website (it was already public on Instagram, but a website is a different use).
- Several clips were filmed at other gyms. Fine as "Alex coaching", but don't caption them as Media House.

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
