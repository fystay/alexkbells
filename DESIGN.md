# DESIGN — RAENG

Tokens are defined once in `src/app/globals.css` (`@theme`). This file explains
how to use them.

## Current design system (2026-10-22 master brief) — read this first; older sections below are history

- **Four UI colours, nothing else:** ink #171717 (text, buttons), paper #F5F2EB (page), white #FFFFFF (alternate sections, cards, the selected surface), grey #777873 (borders, dividers, large type). No #000000, tints, opacities, gradients, extra greys or hover colours. Enforced by `src/palette.test.ts` (tokens and source) and checked in the browser (computed colours on every page).
- **Grey is never small text.** It measures 3.98:1 on paper and 4.45:1 on white, under the 4.5:1 AA threshold, so it appears only as borders, dividers and large type (≥24px, where 3:1 suffices; e.g. the second headline line). Secondary text is ink. `text-muted` therefore resolves to ink. Button hover inverts black and white (white on grey would fail contrast).
- **Light throughout.** Cream page with white bands for contrast; no dark sections. Header, footer and page all light. Utility pages (booking, enquiry, coach area) use the same tokens directly.
- **Shape:** 6–8px radii (`rounded-md` buttons, `rounded-lg` cards and pictures), 1px grey borders, no shadows. Buttons: black fill / white text; outline; underlined text link; split "action" bar (white arrow square).
- **Header (2026-10-22, owner feedback):** three parts at every width: Menu dropdown at the left, logo centred, Book now button at the right (the owner wrote "top left" for Book Now; the Menu is there, so it sits top right: to confirm). Navigation is only that dropdown; no link bar.
- **JD Gyms layout cues (2026-10-22, from the owner's screen recordings; layout only, no colours):** short hero with one action, a three-fact strip straight after it, headlines of 3–5 words and captions of about 8, paragraphs under about 25 words, a persistent Join/Book button in the header, six-link menu, collapsed footer groups on phones. Not copied: image carousels and member quotes (minimal imagery brief; no verified testimonials).
- **Header size B (2026-10-22, owner's pick):** bar 112px on desktop and 84px on phones, logo 92px / 68px so it reads clearly; the hero film is shorter to compensate (26rem tablet, up to 32rem desktop, full height under the header on phones).
- **Header logo with the line and tagline (2026-10-22):** the header logo image now includes the line beneath FITNESS, and STRENGTH · COMMUNITY · DISCIPLINE sits centred beneath it as in the artwork (live text, so it stays readable at header size; the logo image itself is untouched). Header is about 140px tall on desktop and 108px on phones.
- **Hero words (2026-10-22, owner):** "TRAIN WITH PURPOSE. BUILD WITH DISCIPLINE." only (no description line), laid out as option C: "TRAIN / WITH / PURPOSE." stacked large beside a thin white rule, "BUILD WITH DISCIPLINE." in small spaced capitals beneath, soft glow (`hero-glow`), then Book now and Explore coaching side by side.
- **Header selected state (2026-10-22):** the current item in the menu and Book now while in the booking flow get `ink-glow` (a soft dark halo). The home hero film has no pause/play button (owner's call); Reduce Motion still shows the still poster.
- **Menu reveal (2026-10-22):** the dropdown unrolls from the header line over 0.64 s, then each link rises into place 70 ms apart (about 1.3 s in all). Off for Reduce Motion.
- **Headings underlined (2026-10-22, owner):** every h1/h2/h3 in the page body has an ink underline (0.06em thick, 0.18em below), except in the site header and the home hero (globals.css, base layer).
- **Home memberships layout (2026-10-22):** one card per plan (Starter, Regular, Dedicated, Pay as you go): swipe sideways on phones and tablets with the next card peeking in, a "01 / 04" counter, segmented progress and Previous / Next (words, no arrows); four across from 1024px. Same content as before, only the layout changed.
- **Hero words have no box (2026-10-22, latest):** the headline, line and buttons sit straight on the film in white (white Book now button, white-outline Explore coaching), bottom-left; the film is graded lifted, contrasty and slightly cool (owner's pick C), with only the lower part of each frame darkened so the white text stays readable. No panel, tint or gradient.
- **Hero on phones (2026-10-22):** under 640px the film covers the screen edge to edge below the header (a vertical 9:16 cut, `hero-portrait.*`), with the cream panel at the bottom; from 640px the framed version below applies.
- **Hero (2026-10-22, supersedes full-bleed):** the film sits inside the page margins like a framed picture on a cream mat (rounded corners); the words are on a bordered cream panel that overlaps its lower edge, so film and text read as one piece. Full-bleed looked like it stood out. No tint, gradient or opacity.
- **Savings are the USP (2026-10-22):** memberships lead with "Save up to £59 every 4 weeks" (calculated, `maxSavingPence`); each plan shows its saving as a solid ink block (cards) or ink pill (home summary).
- **Swipe cards:** "Find your training" is a row of three cards (two with photographs, one solid ink): swipe sideways on phones and tablets, three across on desktop.
- **Home, short by design, in order:** hero (full-bleed film with a cream panel; "Train with purpose. Build with discipline.", Book a class / Explore coaching) → class statement (option D, white band: "3 classes a week", When / Where / From list, Book now; count, times, venue and price all from content) → find your training (group classes lead, 1:1 and online beside) → why kettlebells (four short items in a 2×2 / 4-up grid) → memberships summary (one row per plan with price, credits, per-class cost and saving, pay as you go, one "Compare and join" button; full cards stay on /memberships) → Alex (before/after) → practical information and booking (times, venue, one booking line, cancellation link). Roughly 4,000px on desktop and 5,700px on a phone, down from 6,000 and 8,400. Section padding is `py-12 sm:py-16 lg:py-20`.
- **Memberships:** three white cards side by side (stacked on phones); Regular has the heavier border (a style, no badge, no popularity claim); pay as you go is a plain row. Per-class cost, pay-as-you-go equivalent and saving are calculated (`lib/membership.ts`). Buttons are enquiries until per-plan sign-up URLs are set (`MEMBERSHIP_URL_STARTER/REGULAR/DEDICATED` or `MEMBERSHIP_URL`).
- **Imagery:** the hero film (natural colour), the before/after pair, and one photograph on /classes (desktop only).
- **Logo:** the supplied artwork recoloured to ink #171717 (header: top three lines; footer: the full logo).

- **Logo (2026-10-22, supersedes the notes below):** the owner's RAENG FITNESS artwork (`assets/brand/raeng-fitness-logo-source.jpg`: R monogram with Thai แรง inside it, RAENG, FITNESS, rule, STRENGTH · COMMUNITY · DISCIPLINE), cut with `scripts/logo_from_source.py` into ink-coloured transparent PNGs. Header = monogram, RAENG, FITNESS; footer, favicon, Apple icon and share image = the whole artwork. Never retyped or redrawn.

## Logo and colours, corrected (2026-10-22) — latest

- **Logo:** the supplied artwork only (`assets/brand/raeng-logo-source.jpg`, confirmed correct by the owner: monogram, arched RAENG, Thai แรง, KETTLEBELL CLUB, STRENGTH · COMMUNITY · DISCIPLINE). Header = its top three lines (monogram, RAENG, Thai), cropped from the artwork, not retyped (`public/brand/raeng-header-black.png`). Footer = the whole logo (`raeng-lockup-black.png`). Favicon and share image use the artwork on its own background. The earlier typeset "RAENG / KETTLEBELL CLUB" beside a monogram was wrong and is gone.
- **Colours (from the logo):** black #000000, the logo's own off-white background #FDF8F2 (page), white #FFFFFF (raised panels, cards), muted grey #6B6B6B (secondary text, 5.0:1 on the page). Hairlines are the grey faded over the off-white. No cream tints, no black tints.

## Cream minimalism (2026-10-21, latest) — supersedes every dark/black-surface note below

The client's intent (relayed 2026-10-21): a white or warm cream background with minimalist black and muted-grey writing, like his logo. So the public site is light:
- **Surface:** one plain off-white cream #FAF9F4 (`.site-surface`, no gradient), black type, muted grey #6B6B6B for secondary text (5.1:1 on cream), hairlines `line-inverse` (#DCDBD6). Black appears only as type, buttons, the logo and the highlighted membership card. No dark bands, no black header or footer.
- **How it is built:** components are written with role classes (`text-paper` main text, `text-muted-inverse` secondary, `bg-ink` surface, `bg-paper` black fills, `border-line-inverse` hairlines). `.theme-cream` maps those roles onto cream/black; it is applied by `SitePage` (public pages), the header and the footer. The booking pages and coach area sit outside it and use the default light tokens, so the whole site matches. Do not add literal colours to public components: use the role classes.
- **Logo:** black artwork everywhere (header monogram + live name; footer lockup). The cream artwork in `public/brand/` is spare.
- **Buttons:** black pills with a cream arrow circle; outline pills in black. Cards: barely-there tinted, rounded-3xl.
- **Hero picture:** no box or border: its four edges dissolve into the cream through an eased alpha mask (`.hero-feather`, wider on desktop, softer on phones). The pause/play control sits outside the fade.
- The hero, the short home page, the memberships layout and the one faint ring ornament are as described in the dark notes below; read "cream" for "dark".

## Dark minimalism (2026-10-21, latest) — supersedes the cream-led notes below

Reference: two "dark minimalism" interiors; palette black #000000, warm cream #FAF9F4, white #FFFFFF, muted grey #6B6B6B (tokens in `globals.css`, exact hex). Every other colour is a blend of those four (cream tints over black for surfaces, lines and secondary text); the grey itself is 3.9:1 on black, so on dark it is used for lines/large type and body secondary text uses a cream blend (`muted-inverse`, 9:1).
- **One continuous surface:** public pages are wrapped in `NightPage` (`.night-surface`): black at the top, drifting through faint cream-tinted blacks, with soft lamp-like glows, back to black at the footer. Sections have no background of their own (`Section` tone `plain`) or a feathered tint (`raised`, a vertical gradient that fades in and out), so there are no hard seams. No cream bands any more.
- **Shapes and type:** rounded-3xl glass cards (`bg-paper/[0.03–0.04]`, hairline `line-inverse`), pill buttons on dark (cream fill, black arrow circle), medium-weight expanded uppercase headings (`font-display` now weight 500), wide-tracked eyebrows. One ornament: a large faint ring behind the closing headline (`.night-ring`).
- **The one cream moment:** the highlighted membership card (Dedicated, "Best value") is cream with black text; its button is black.
- **Light theme kept for tools:** `/book*`, `/online-coaching/enquire` and the coach area stay on cream with white fields (forms need them); the header and footer are black throughout. Those pages set their own `bg-paper`; only the public marketing, contact, privacy and 404 pages use `NightPage`.
- `Section`, `SectionHeading`, `PriceList`, `Timetable`, `Steps`, `InstagramAlternative`, `Faq`, `Location`, `CtaBand`, `PageHeader` are dark-only (no `tone` prop except `Section` plain/raised).
- **Hero (checked against the owner's request, 2026-10-21):** one rounded picture (the owner's film, or a still until it is supplied) with the words beside it on desktop and beneath it on phones, so no text sits on the footage and its colours stay as filmed (no black-and-white). Phones: picture, headline, "Book now" all in the first screen. The header is solid black with a hairline.
- **Home is deliberately short:** hero, one statement, the coach and before-and-after (in colour), three numbered rows for the services, a compact memberships table with the savings, closing call to action. Full membership cards (and their buttons) live on `/memberships`. Three images in `main`, enforced by e2e.

## Kettlebell Club redesign (2026-10-21, later) — supersedes the dark-first notes below

- **Palette (four colours):** black (`ink`: header, footer, hero fade, contrast bands, the highlighted plan), warm cream (`paper`: the main surface), white (`white` section tone: the memberships section and one band on About), muted grey (`surface`/`muted`/`line`: secondary text, dividers, the pay-as-you-go card). No other colours.
- **Minimal imagery:** the hero (film or still), the coach's before-and-after pair, and one photograph on the Classes header (desktop only). Everything else is type on hairlines. All photos go through `PhotoFrame`; roles in `content/images.ts`; the film in `content/media.ts`.
- **Hero:** full-bleed, 100svh minus header (min 32 rem, max 60 rem), a dark fade, text low-left, "Book now" + "View memberships". `HeroVideo` (client): autoplay muted loop, visible pause control, poster for reduced motion.
- **Logo:** the supplied artwork. Header: cream monogram + live "RAENG / KETTLEBELL CLUB" text; footer: cream lockup. Black versions exist for light surfaces. Favicon: black monogram on cream.
- **Memberships:** `MembershipCards` (1 column phones, 2 tablets, 4 from `xl`). Each card: name, £ per 4 weeks, credits, cost per class, pay-as-you-go equivalent, saving, and a two-bar comparison (decorative; the figures are text). The one highlight ("Best value" on Dedicated) must be true of the figures (a test checks it is the lowest cost per class). Buttons say "Enquire" (accessible name "Enquire about Starter").
- **Navigation:** Home · Classes · Memberships · 1:1 Coaching · Online Coaching · About RAENG; the desktop bar shows from `xl`, below that the Menu button.
- **Home order:** hero → the club (paper) → coach and journey (ink) → find your training (paper) → memberships (white) → closing CTA (ink).

## RAENG rebrand (2026-10-21) — supersedes anything below that conflicts

- **Dark-first.** Pages are mostly `ink` bands with `paper` text; a cream (`paper`) or stone (`surface`) band breaks them up, and the closing CTA is cream so it stands out from the ink footer. Tokens are unchanged. Page order on home: hero (ink) → approach (paper) → find your training (ink) → community (surface) → coach (ink) → CTA (paper).
- **Wordmark:** "RAENG" set in the site face, extra-bold, 112% width, tracked 0.2em (`Logo.tsx` → `Wordmark`). No logo image exists. The footer adds the three themes. Favicon/apple icon are an "R" on ink; the share image is the wordmark and themes (generated once, `public/og-image.png`).
- **Photography:** colour, not greyscale. All photos go through `PhotoFrame` (`object-cover` around the focal point, rounded `rounded-xl` corners, ink fill while loading) and are listed by role in `src/content/images.ts` — swap files there, not in components. Square corners remain for full-bleed frames (phone hero).
- **Navigation:** Home · Classes · 1:1 Coaching · Online Coaching · About RAENG (+ Contact in the phone menu/footer, Coach login). Desktop nav from `lg`; below that a Menu button. Current page is `aria-current="page"`. The homepage section tracker was removed.
- **Pages:** `/` (hero, approach, find your training, community, coach, CTA), `/classes`, `/coaching` (1:1 only), `/online-coaching` (the service) with `/online-coaching/enquire` (the existing questionnaire; every "enquire" button points there), `/about`.
- **Home hero:** photo + headline "Built through movement. / Defined by discipline.", primary "Explore Training" (jumps to `#find-your-training`), secondary "About RAENG"; the oversized wordmark below is decorative. The hero video, carousel, sheen animation, `WaysToTrain`, `HowToBook` and `HeroVideo` were removed.
- Components `Hero`, `Philosophy`, `FindYourTraining`, `Community`, `CoachIntro` are in `src/components/home/`; `Steps`, `PhotoFrame` in `ui/`. `CtaBand` takes `tone` ("paper" default). `PageHeader` is now ink.
- The component table below still describes some removed pieces (`WaysToTrain`, `HowToBook`, hero video notes in Imagery): treat those as history.

## Principles

- Monochrome, editorial, athletic. Confidence comes from type and space, not effects.
- Rules (lines) and solid black bands structure the page; avoid card grids.
- Square corners. No pills, gradients, neon, glows, floating widgets or fake badges.
- Motion is limited to colour and small underline/arrow transitions (≤200 ms), scroll reveal (`data-reveal`, see below), the hero headline's sheen (`.hero-headline` in `globals.css`: a soft white halo on the video below `lg`, and a band of light that crosses the letters in about 2.5 s every 7 s, graphite on paper on desktop; monochrome, no flashing), a 220 ms fade-up when a booking step changes (`animate-step-in`; not on the first step at page load), and a slight press on primary buttons. Filled buttons move down 1 px while pressed. All of it is disabled under `prefers-reduced-motion`. The hero video autoplays and loops with a pause button, except under `prefers-reduced-motion`, where it shows the still poster until the visitor presses play.

## Colour

| Token | Hex | Use |
|---|---|---|
| `ink` | #0b0b0b | Text on light; header, dark bands, footer |
| `ink-soft` | #1c1c1b | Hover on ink buttons |
| `paper` | #f6f4ef | Default warm off-white background |
| `surface` | #ece9e2 | Alternating light band |
| `white` | #ffffff | Hover on light-on-dark buttons |
| `line` | #d6d2c9 | Decorative dividers on light (never text) |
| `line-inverse` | #333331 | Dividers on ink |
| `muted` | #57544e | Secondary text on light |
| `muted-inverse` | #a9a59d | Secondary text on ink |

Measured contrast: ink/paper 17.9:1 · muted/paper 6.9:1 · muted/surface 6.2:1 ·
muted-inverse/ink 8.0:1. All text pairs pass WCAG AA (most pass AAA).

The only non-monochrome colour is the amber preview marker (`#b45309`) shown
in `CONTENT_PREVIEW` builds — it must never appear on production.

## Typography

One variable family: **Archivo** (Google Fonts via `next/font`, self-hosted at build), weight + width axes.

| Utility | Use |
|---|---|
| `font-display` | 800 weight, 112% width, uppercase, -0.02em — all headings |
| `text-display` | Hero / closing CTA (30 → 84 px) |
| `text-display-split` | Hero headline beside media at `lg+` (40 → 60 px), sized so each sentence fits on one line in half the grid |
| `text-h1` | Inner page titles (28 → 64 px) |
| `text-h2` | Section titles (24 → 44 px) |
| `text-h3` | Sub-headings (20 → 24 px) |
| `text-lede` | Intro paragraphs (17 → 20 px, 1.55) |
| `eyebrow` | 12 px, 600, 0.16em tracking, uppercase labels |

Body: 16 px / 1.6, sentence case. Keep paragraphs ≤ ~65ch (`max-w-xl`/`max-w-2xl`).
Display sizes were tuned so the longest word ("CUMBERNAULD") fits at 320 px.

## Layout & spacing

- `container-page`: max 78rem; gutters 16 / 24 / 40 px.
- Section rhythm: `py-16 sm:py-24 lg:py-28`; compact `py-10 sm:py-14`.
- 12-column grid at `lg`; always declare `grid-cols-1` on mobile grids (prevents min-content blowout).
- Section tones alternate paper → ink → paper → surface; avoid two identical tones adjacent except CTA → footer.
- Breakpoints: Tailwind defaults plus `2xs` (22.5rem / 360px) and `xs` (26rem / 416px).

## Components

| Component | File | Notes |
|---|---|---|
| `SiteHeader` | `components/layout` | Sticky ink bar; logo, nav, one CTA. The homepage section being read is marked (2026-10-18): on desktop its link turns paper with the underline held; in the phone menu it is paper with a bar in the gutter and a dot at the right (`aria-current="location"`; pages use `aria-current="page"`). A section counts once its top passes 35% of the screen height. Nav = Alex's four questions in page order (Why kettlebells · Ways to train · About Alex · How to book → homepage anchors) from 1280 px; below that a Menu button, which also lists Group classes, One-to-one & online, Online coaching and Contact. All header targets ≥44 px |
| `DesktopNav` / `MobileNav` | `components/layout/NavLinks.tsx` | `aria-current`; full-height disclosure panel below the header; Esc closes and returns focus to the toggle; closes on navigation and on any link tap (same-page section links included) |
| `SiteFooter` | `components/layout` | Brand, nav, address, verified contact only. Explore lists the pages plus How to book (`footerNav`); no Home (the logo links home) and no homepage section links (they're in the header menu). Mobile: Explore column sized to content beside Contact + Find us; links ≥44 px below `lg` |
| `Logo` | `components/layout` | `variant="mark"` (header) or `"lockup"` (footer) from `site.logo`; plain-text name fallback if null |
| `Carousel` | `components/ui` | Client component. Swipe carousel below `lg`, three-column grid from `lg`. Native CSS scroll-snap (`snap-x snap-mandatory`, no `touch-action` override, so vertical page scroll still works over it; `overscroll-x-contain`); the list is focusable (arrow keys scroll it) and breaks out of the page gutters, scrolling inside itself so the page never overflows sideways. Dots and arrows mirror and move the scroll position; under `prefers-reduced-motion` they jump instead of gliding. `aria-roledescription="carousel"` only while it actually scrolls; a polite live region speaks the card name only after an arrow or dot is used |
| `StartTraining` | `components/ui` | Server component. Every "Book now". Since 2026-10-21 (owner's request) a plain link in the split-button style: a filled bar, label left, the arrow in an inverse 48 px square inset 4 px at the right (`bar`, ≥56 px tall, used on the pages), or the compact 36 px version in the desktop header (`button`). A tap, click or Enter goes straight to the destination: no swipe, no intro screen. The phone menu keeps the plain full-width paper button. Works without JavaScript |
| `ButtonLink` | `components/ui` | `primary` / `secondary` / `text` / `action` × `light` / `dark` tones. `action` (2026-10-18) is the split "Book now" button used everywhere it appears (header, phone menu, hero, How to book, /classes, /coaching, closing band): a filled bar, label left, and the arrow in an inverse 48 px square inset 4 px at the right (36 px in the header); min 44–48 px targets; external links announce new tab. Focus ring takes the surface colour (`ink` on light, `paper` on dark) so it shows outside filled buttons |
| `Section`, `SectionHeading` | `components/ui` | Tone + spacing; heading ids wire `aria-labelledby` |
| `Provisional` | `components/ui` | Content approval gate |
| `PageHeader` | `components/sections` | Inner-page h1 block. Optional `image` (`site.pageImages`): desktop only (lg+), 4:5, four columns on the right, sitting on the header's bottom rule; art-directed `<picture>`: eager and high priority on desktop (it is usually the largest element there), a 1×1 placeholder below lg so phones and tablets download nothing |
| `Timetable` | `components/sections` | Driven by `content/classes.ts`. `layout="row"` (three across), `"stack"` (one per row, for narrow columns) or `"compact"` (one slim line per session, day left and time right, for the offer cards). Day and time share one line on phones (both layouts) and in `stack`; in the narrow desktop card the part-of-day label is visually hidden (still read by screen readers) |
| `PriceList` | `components/sections` | Only publishable prices; otherwise "Get in touch for current pricing". `linkContact={false}` where a "Book now" button sits right below |
| `CtaBand` | `components/sections` | Closing ink band (option A, 2026-10-18): display headline ("Pick up a bell."), optional body, then a row of facts on hairlines (class times grouped by time, "Mon & Wed 6:30 pm · Sat 10:15 am", and the class price, from the confirmed timetable and prices), the full-width split "Book now" button, and "Message on Instagram ↗" as a quieter underlined text link |
| `Location`, `Faq`, `JsonLd` | `components/sections` | |
| `BookingWizard`, `OnlineOnboarding` | `components/booking` | Step journeys (every step has Back; the first returns to the previous page; each step forward adds a history entry, `#when` / `#details`, so the phone back gesture and browser Back move between steps with answers kept): `Stepper` (bar per step; on phones only the current step is named), one step at a time, `ActionBar` (Back + Continue; sticky at the bottom of the screen below `lg`; Continue disabled with a hint until the step is complete), summary with "Change" links (sticky aside on desktop, one-line list on phones) |
| `ChoiceGroup` | `components/booking/ui.tsx` | Native radios/checkboxes as square tiles: white with a `muted` border (≥3:1), ink border on hover, solid ink when selected, outline on keyboard focus. `list` rows (≥56 px) or wrapping `chips` (≥48 px) |
| `AvailabilityCalendar` | `components/booking` | Monday-first month grid in hairline `line` cells (48–56 px tall). Available: bold with a dot; fully booked: muted and struck through; no sessions: muted; selected: solid ink. Times listed beside (desktop) or below (phones). Disabled dates are skipped by arrow keys. The "Fully booked" key only appears when a date is full (real class dates never are). Below a chosen class, `ClassDetails` sets it out like Alex's listing: date, year and time range as an eyebrow, "Kettlebell Training · Saturday class" in display type, "1 hr · £10 per person · with Alex", the description and the payment note |
| `WaysToTrain` | `components/sections` | One ink landmark (`#ways-to-train`), heading included, after the warm-grey "Why kettlebells" band (moved above it 2026-10-18), so the page alternates light and dark. On phones the dark hero video now meets "Why kettlebells" on one clean dark-to-light edge. Heading ("What I offer" / "Choose how you train") with the one-line intro beside it on desktop (town from `site.location`), then a hairline. The three services are open columns, not boxed cards: a portrait photo (square on phones, 4:5 from `sm`; the existing greyscale training stills; online coaching reuses the single-bell hold until it has its own) with the number and name set over a decorative ink fade at its foot, then, kept minimal, one short line (paper), one line of small facts (muted: venue or what's included); the group column adds the class times as three small columns (`Timetable layout="mini"`: part of day, short day, time), a hairline, the lead price only (the detail pages list every price), an **Enquire →** button (named for the service for screen readers; goes to /contact) and a Details text link. Photos ease in 3% on hover (motion-safe only). Below `lg` the columns are a swipe carousel (`Carousel`): 86% of the screen wide (max 28 rem; 24 rem from `sm`) so the next one peeks in, native scroll-snap, pagination dots and previous/next arrows (all 44 px targets). From `lg` they are three equal columns with a 2 rem gap and no controls. |
| `HowToBook` | `components/sections` | "Where and how to book": three numbered steps (choose; send your request when `/book` is open, otherwise message Alex on Instagram; he confirms), "Book now" button, then Where (address, directions) and When (published times) |
| `Journey` | `components/sections` | Ink band: eyebrow, display headline and intro beside a before/after pair (4:5 frames, greyscale, paper "Before"/"After" tags), optional big-number highlights (currently none: the follower count is in About), then numbered chapters. Content in `content/journey.ts`; hidden until confirmed |
| `DemoNotice`, `DemoLabel` | `components/booking/ui.tsx` | Dashed ink frame or ink "DEMO" tag for demonstration content. Never on production |

## Coach portal (2026-10-19)

Same tokens and type, tuned for use on a phone between sessions:
- Section nav under the site header: one line of links that scrolls sideways on phones; the current section has an ink underline and `aria-current="page"`.
- Page head: eyebrow, `font-display` title, ink rule; main actions sit right under it (full-width-friendly, ≥44 px).
- Metrics: two columns on phones, four from `lg`; the key figure (money received) is an ink tile. Figures that aren't cash (outstanding, expected recurring) say so in their note.
- Status is shown as text badges (ink fill for "needs you", outline, muted outline), never by colour alone.
- Lists become stacked rows on phones; tables only for the ledger, inside a horizontal scroller.
- Revenue chart: stacked bars per month in ink / muted / muted-inverse / line with a text legend, plus a "Show the figures" table (the bars are decorative).
- Forms: labelled fields with "(optional)" where optional, hints and errors under the field, an error summary that takes focus, success messages as `role="status"`; destructive actions ask to confirm; values are kept when the server refuses.
- Empty states say what will appear and how to add it. No dummy figures.

## Imagery

- Only genuine photos of Alex, his coaching and the venue. No stock, no AI imagery presented as real.
- Hero video (`site.heroVideo`): 4:5, black and white, silent, ~8 s loop of genuine footage — the visual centrepiece. Desktop (lg+): the right half of the grid, width `min(100%, (100svh − 7rem) × 0.8, 44rem)` with the height from the 4:5 ratio (never cropped or stretched), so headline, "Book now" button and the whole video sit in the first view at 1024×768, 1366×768 and 1440×900 (564×705 px at 1440×900). The headline uses `text-display-split` at lg. Phones (<640 px): the video edge to edge directly under the header (it breaks out of the page gutters with `-mx-4`) at its full 4:5 frame, `object-fit: contain`, never cropped (390×488 on a 390 px phone). The headline (paper), the intro line beneath it (no eyebrow above it) (`site.location.town`: "Expert kettlebell coaching in Cumbernauld. Build strength, improve technique and move with confidence."; phones show only the first sentence, at 16 px with 12 px above and 20 px before the button, since a small two-line paragraph under the display headline read as cramped) and a paper "Book now" button sit over the lower part of the video on an ink fade (`from-ink/90 via-ink/70 via-65%`; on phones solid `ink` for the bottom 10%, so the video melts into the ink "What I offer" band with no visible edge), so the whole video, headline and button fit the first screen even with Safari's toolbar showing. On phones the headline may start as high as 40% down the video (at 320 px the intro wraps to three lines). The pause button moves to the top right. DOM order (headline, button, video) is unchanged. Below lg the top 22% of the frame fades from `ink` into the footage (`from-ink via-ink/40`), so the ink header and the video read as one block; on tablets a 1.5rem `ink` strip also fills the gap between the header and the video. Both are decorative, `aria-hidden` overlays that change no sizes, and desktop is untouched because the video sits on paper clear of the header. Tablets (640–1023 px) use the same overlay inside the gutters: the video spans the content width, capped at `(100svh − 6.5rem) × 0.8` so the whole frame fits the first screen (720×900 at 768×1024). If no source loads, the poster stays and the pause/play control is removed. Enforced by e2e. Starts on its own as soon as the page opens and loops continuously, except for visitors with Reduce Motion on (changed 2026-10-16 at the project owner's request; previously it played for everyone): they see the poster, painted behind the video and shown by CSS from the first paint, and the play button starts the video. Otherwise: `autoplay muted loop playsinline` are in the server HTML so it starts before JavaScript, and an `ended` handler restarts it in any browser that ignores `loop`. MP4 (H.264) is listed first for reliable looping on Safari/iOS, WebM second. The poster is identical to the first frame and is also the container's background, so a still shows if the video cannot load. A 44 px pause/play button is always shown (WCAG 2.2.2); once paused it stays paused. Devices that block autoplay outright (e.g. iPhone Low Power Mode) show the poster, and the button starts it. The video is decorative (`aria-hidden`); the page must make sense without it.
- Configure in `site.photos`; photos render in greyscale to sit within the monochrome system. Revisit if Alex prefers colour.
- Without photos, layouts are typographic by design (no empty boxes).
- About row: Alex's portrait (`site.photos.about`, supplied 2026-10-17) first, then the first two training stills, so it stays three photos.
- Training stills (`site.trainingStills`): three sharp frames from the hero reel in the About section, staggered on desktop; on phones a swipeable, keyboard-scrollable row (72% wide, the next one peeks in). Frames showing other gyms' branding are excluded. Replace with proper photography when available.
- Page header stills (`site.pageImages`): `/coaching` double-bell swing, `/contact` single-bell hold (cut from the hero loop by `scripts/video_stills.py`, which also repairs the caption-removal patch on the swing frame), `/classes` reuses the group front-rack still. Only sharp frames without other gyms' branding; motion-blurred clips and the "APEX" clips are excluded. Replace with proper photography when available.
- Logo: the supplied artwork is white on black, so the derived PNGs are transparent white (alpha = source luminance) and must sit on **dark surfaces only** (ink header/footer). On a light surface the `Logo` component frames them in an ink tile.
  - Header: monogram mark (36–40 px tall) + the name as written on the artwork, "ALEX.KBELLS" (`site.logo.wordmark`), over "KETTLEBELL COACH" between two short rules, echoing the lockup. Mark only below 360 px and at tablet widths (768–1023 px), where the navigation needs the space; an e2e test checks the header never overlaps.
  - Footer: full lockup, 192–224 px wide.
  - Never redraw, recolour or re-typeset the logo; regenerate from source with `scripts/brand_assets.py`.

## Accessibility requirements

- WCAG 2.2 AA. Semantic landmarks, one h1 per page, skip link, visible `:focus-visible` outline.
- Touch targets ≥ 44 px on phones and tablets (enforced in e2e at 390 and 768 px); inline links in running text are exempt. Native `<details>` for FAQ.
- Repeated "Find out more" links carry screen-reader-only context ("about online coaching").
- Test: axe (automated in e2e), keyboard pass, 320 px reflow, 200% zoom.

## Scroll reveal (foundation, 2026-10-18)

- Add `data-reveal` to any element and it fades up 24 px over 0.7 s the first time 12% of it enters the viewport (8% above the bottom edge). Stagger lists with `style={revealDelay(i)}` (80 ms apart, capped at 6) from `src/lib/reveal.ts`.
- Switched on by a tiny inline script in `<head>` (`REVEAL_SCRIPT`) before first paint: no flash, no dependence on React. Off, so content simply shows, under reduced motion, without IntersectionObserver or without JavaScript.
- Applied to: every `SectionHeading`, the "Why kettlebells" points, the offer cards, About stills, the journey photos, How-to-book steps, FAQ items and the closing band. Not used on the hero (first view and LCP) or on buttons and form controls.
- Put it on wrappers, not on elements with their own transform transitions.

