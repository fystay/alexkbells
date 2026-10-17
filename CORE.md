# CORE — Alex K Bells

Source of truth for the business, goals, constraints and open decisions.
Values that appear on the website live in code (`src/content/`) — this file
records *status*, not duplicate values.

Last reviewed: 2026-10-15

## Business

| | |
|---|---|
| Brand | Alex K Bells (logo wordmark: ALEX.KBELLS) |
| Descriptor | Kettlebell Coach |
| Services | Group classes, one-to-one coaching, online coaching |
| Venue | Media House, 1A Dunns Wood Road, Cumbernauld, Glasgow, G67 3EN, Scotland |
| Instagram | https://www.instagram.com/alex.kbells/ |
| Previous site | https://alexkbells-coaching.lovable.app (reference only) |
| Project terms | Free build for the client; client pays hosting and running costs. Portfolio case study. |

## Objectives

1. Let visitors (often arriving from Instagram on mobile) find class times, location and how to get in touch within seconds.
2. Present a premium, monochrome, athletic brand — not a gym template.
3. Grow into booking, payments, membership and admin only when each is defined.

## Audience

- Local adults (Cumbernauld / North Lanarkshire / Glasgow) interested in group kettlebell classes.
- People wanting one-to-one coaching.
- People outside the area wanting online coaching.

## Fact register

Legend: **C** confirmed · **P** provisional (needs client approval) · **U** unknown

| Item | Status | Notes |
|---|---|---|
| Brand name, descriptor, venue address | C | From brief |
| Instagram URL | C | Tracking parameter removed |
| Class times Mon 18:30, Wed 18:30, Sat 09:00 | C | Confirmed for publication by the project owner 2026-10-15 (times from the original brief); shown across the site and offered as booking choices. Alex to tell us if any session changes |
| Group class price £10 per person | C | Confirmed by the project owner 2026-10-17; shown on the homepage and /classes |
| Class duration, capacity, equipment, booking requirement | U | Do not publish |
| Cancellation / refund rules | U | Do not publish |
| One-to-one from £35/session; 4 sessions £130/month | C | Confirmed by the project owner 2026-10-15 (figures from the original brief); shown on the site |
| Online coaching £79/month | C | Confirmed by the project owner 2026-10-15; shown on the site |
| Alex's journey (story, before/after photos) | C | Published 2026-10-15 at the owner's request: before/after photos replaced 2026-10-17 with photos supplied by the project owner as Alex's own (`assets/journey/`, cut by `scripts/supplied_photos.py`; no dates, timeframe or figures given, so none are shown), short text written from his reel motto ("1% everyday") and bio. Swap in Alex's own story when supplied |
| Coach's name | C | Alex Robertson (Instagram profile, 2026-10-15) |
| Instagram followers | C | 9,651 on 2026-10-15, shown as "9.6k" (rounded down). Update occasionally |
| Testimonials / client numbers | U | None supplied; never invent |
| FAQ: beginners, first session, what to bring, class length (~45 min), kettlebells provided | P→C | Industry-standard answers published at the owner's request 2026-10-15; **Alex to check, especially class length and equipment** |
| Session duration, availability, contract terms | U | |
| Membership | U | Under consideration; not on the site |
| Email, phone | U | `site.contact` is null; not rendered |
| Logo artwork | C | Supplied 2026-10-15 (`assets/brand/alexkbells-logo-source.jpg`). Monogram "AR" with kettlebell (confirmed intentional); wordmark ALEX.KBELLS; descriptor KETTLEBELL COACH. This JPG is the only version — no vector exists |
| Photography of Alex / coaching | U | No stills supplied |
| Training stills | C | Three frames from the same reel (`public/images/training/`), plus two header stills cut from the hero loop on 2026-10-16 (`double-swing.jpg`, `bell-hold.jpg`, `scripts/video_stills.py`); same permission caveat as the hero footage (the bell-hold frame shows another person in the background) |
| Hero footage | C | Alex's own Instagram reel (supplied 2026-10-15), used for the homepage hero loop. Filmed at several gyms, some visibly not Media House (e.g. "APEX" signage), and shows other people training. Confirm Alex is happy for it to represent his coaching and that people shown are fine appearing on the website |
| Bio, qualifications, history, testimonials | U | Do not invent |
| Bookings | — | Previously Setmore; payments cash / bank transfer. Bookings are arranged by messaging Alex on Instagram; every public button is "Start your training" → /contact, except on Vercel previews, where it opens /book to try the prototype (2026-10-16). The guided `/book` request flow (emails Alex; he confirms by reply) is kept but unlisted (not linked, not in the sitemap, noindex); `/online-coaching` enquiry is still linked. Both are off until Resend + his inbox are configured. Calendar availability is a labelled prototype only (previews) |
| Live availability (dates, times, capacity, one-to-one slots, session length) | U | Not connected; nothing invented. Demo data is sample only |
| Booking-request inbox / Resend account | U | Needed to switch on `/book`; must be Alex's own |
| Privacy notice | P | `/privacy` drafted 2026-10-15 for booking requests and online enquiries; Alex to review |
| Square | P | Account created. Rate quoted as 1.4% + 25p per online card payment — unverified. Enabled products unknown |
| Domain | U | Not chosen |
| Hosting account | P | Vercel project `alexkbells` exists in the developer's personal Hobby account; Alex's own account (likely Pro for commercial use) recommended before launch — see DEPLOYMENT.md |

## Constraints

- Never fabricate testimonials, qualifications, prices, durations, capacity, policies or social proof.
- No production payment system and no card-data collection in Phase 1.
- UK English, GBP.
- Provisional content is never shown on production (see CONTENT.md → Approval workflow).

## Phases

1. **Public website** — this release.
2. **Booking & payments** — after provider, prices, capacity, cancellation policy are confirmed.
3. **Membership & accounts** — after the membership product is defined.
4. **Admin & hardening** — only functions Alex actually needs.

## Open decisions

1. Booking: keep the on-site request form (built), or move to Setmore / Square Appointments / custom booking with payments?
2. Which Square products are enabled (Online Checkout, Appointments, Subscriptions)?
3. Membership structure and price.
4. Domain name and who owns the Vercel / domain accounts.
5. Contact channels beyond Instagram (email address? phone? contact form?).
