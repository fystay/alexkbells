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
| Class times Mon 18:30, Wed 18:30, Sat 09:00 | P | Supplied by client after a Setmore Saturday listing. Start date, weekly frequency unconfirmed. `timetable.status` in `src/content/classes.ts` |
| Class duration, capacity, price, equipment, booking requirement | U | Do not publish |
| Cancellation / refund rules | U | Do not publish |
| One-to-one from £35/session; 4 sessions £130/month | P | Previously published; reconfirm |
| Online coaching £79/month | P | Previously published; reconfirm |
| Session duration, availability, contract terms | U | |
| Membership | U | Under consideration; not on the site |
| Email, phone | U | `site.contact` is null; not rendered |
| Logo artwork | U | Not yet in repo — needed at `public/brand/` |
| Photography of Alex / coaching | U | None supplied |
| Bio, qualifications, history, testimonials | U | Do not invent |
| Bookings | — | Previously Setmore; payments cash / bank transfer |
| Square | P | Account created. Rate quoted as 1.4% + 25p per online card payment — unverified. Enabled products unknown |
| Domain | U | Not chosen |

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

1. Booking provider: stay on Setmore, move to Square Appointments, or custom build?
2. Which Square products are enabled (Online Checkout, Appointments, Subscriptions)?
3. Membership structure and price.
4. Domain name and who owns the Vercel / domain accounts.
5. Contact channels beyond Instagram (email address? phone? contact form?).
