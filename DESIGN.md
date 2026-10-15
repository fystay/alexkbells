# DESIGN — Alex K Bells

Tokens are defined once in `src/app/globals.css` (`@theme`). This file explains
how to use them.

## Principles

- Monochrome, editorial, athletic. Confidence comes from type and space, not effects.
- Rules (lines) and solid black bands structure the page; avoid card grids.
- Square corners. No pills, gradients, neon, glows, floating widgets or fake badges.
- Motion is limited to colour and small underline/arrow transitions (≤200 ms), a 220 ms fade-up when a booking step changes (`animate-step-in`), and a slight press on primary buttons. All of it is disabled under `prefers-reduced-motion`. Exception: the hero video autoplays for everyone (Alex's choice) and always has a pause button.

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
| `SiteHeader` | `components/layout` | Sticky ink bar; logo, nav, one CTA. All header targets ≥44 px |
| `DesktopNav` / `MobileNav` | `components/layout/NavLinks.tsx` | `aria-current`; full-height disclosure panel below the header; Esc closes and returns focus to the toggle; closes on navigation |
| `SiteFooter` | `components/layout` | Brand, nav, address, verified contact only. Mobile: Explore column sized to content beside Contact + Find us; links ≥44 px below `lg` |
| `Logo` | `components/layout` | `variant="mark"` (header) or `"lockup"` (footer) from `site.logo`; plain-text name fallback if null |
| `ButtonLink` | `components/ui` | `primary` / `secondary` / `text` × `light` / `dark` tones; min 44–48 px targets; external links announce new tab |
| `Section`, `SectionHeading` | `components/ui` | Tone + spacing; heading ids wire `aria-labelledby` |
| `Provisional` | `components/ui` | Content approval gate |
| `PageHeader` | `components/sections` | Inner-page h1 block |
| `Timetable` | `components/sections` | Driven by `content/classes.ts` |
| `PriceList` | `components/sections` | Only publishable prices; otherwise "Get in touch for current pricing" |
| `Location`, `Faq`, `CtaBand`, `JsonLd` | `components/sections` | |
| `BookingWizard`, `OnlineOnboarding` | `components/booking` | Step journeys: `Stepper` (bar per step; on phones only the current step is named), one step at a time, `ActionBar` (Back + Continue; sticky at the bottom of the screen below `lg`; Continue disabled with a hint until the step is complete), summary with "Change" links (sticky aside on desktop, one-line list on phones) |
| `ChoiceGroup` | `components/booking/ui.tsx` | Native radios/checkboxes as square tiles: white with a `muted` border (≥3:1), ink border on hover, solid ink when selected, outline on keyboard focus. `list` rows (≥56 px) or wrapping `chips` (≥48 px) |
| `AvailabilityCalendar` | `components/booking` | Monday-first month grid in hairline `line` cells (48–56 px tall). Available: bold with a dot; fully booked: muted and struck through; no sessions: muted; selected: solid ink. Times listed beside (desktop) or below (phones). Disabled dates are skipped by arrow keys |
| `WaysToTrain` | `components/sections` | Ink band: the three services side by side (number, name, one line, price list, own booking button, Details link), then a three-step "Getting started" row |
| `MobileBookBar` | `components/sections` | Phones only: fixed booking bar once the hero scrolls away; hidden while the hero, closing CTA or footer is on screen; `inert` when hidden |
| `Journey` | `components/sections` | Ink band: eyebrow, display headline and intro beside a before/after pair (4:5 frames, greyscale, paper "Before"/"After" tags), optional big-number highlights, then three numbered chapters. Content in `content/journey.ts`; hidden until confirmed |
| `DemoNotice`, `DemoLabel` | `components/booking/ui.tsx` | Dashed ink frame or ink "DEMO" tag for demonstration content. Never on production |

## Imagery

- Only genuine photos of Alex, his coaching and the venue. No stock, no AI imagery presented as real.
- Hero video (`site.heroVideo`): 4:5, black and white, silent, ~8 s loop of genuine footage — the visual centrepiece. Desktop (lg+): the right half of the grid, width `min(100%, (100svh − 7rem) × 0.8, 44rem)` with the height from the 4:5 ratio (never cropped or stretched), so headline, booking button and the whole video sit in the first view at 1024×768, 1366×768 and 1440×900 (564×705 px at 1440×900). The headline uses `text-display-split` at lg. Phones and tablets: eyebrow, headline and full-width booking button, then the WHOLE video in the remaining height of the first screen (`100svh`, so browser toolbars never hide it; container-query units keep the 4:5 frame, e.g. 320×400 on a 390×664 iPhone view). The intro line and secondary links follow below. Enforced by e2e from 320×568 to 1440×900. Enforced by e2e. Starts on its own as soon as the page opens, for every visitor (Alex's decision, including people with Reduce Motion or data saver on), and loops continuously: `autoplay muted loop playsinline` are in the server HTML so it starts before JavaScript, and an `ended` handler restarts it in any browser that ignores `loop`. MP4 (H.264) is listed first for reliable looping on Safari/iOS, WebM second. The poster is identical to the first frame. A 44 px pause/play button is always shown (WCAG 2.2.2); once paused it stays paused. Devices that block autoplay outright (e.g. iPhone Low Power Mode) show the poster, and the button starts it. The video is decorative (`aria-hidden`); the page must make sense without it.
- Configure in `site.photos`; photos render in greyscale to sit within the monochrome system. Revisit if Alex prefers colour.
- Without photos, layouts are typographic by design (no empty boxes).
- Training stills (`site.trainingStills`): three sharp frames from the hero reel in the About section, staggered on desktop. Frames showing other gyms' branding are excluded. Replace with proper photography when available.
- Logo: the supplied artwork is white on black, so the derived PNGs are transparent white (alpha = source luminance) and must sit on **dark surfaces only** (ink header/footer). On a light surface the `Logo` component frames them in an ink tile.
  - Header: monogram mark (36–40 px tall) + the name as written on the artwork, "ALEX.KBELLS" (`site.logo.wordmark`), over "KETTLEBELL COACH" between two short rules, echoing the lockup. Mark only below 360 px and at tablet widths (768–1023 px), where the navigation needs the space; an e2e test checks the header never overlaps.
  - Footer: full lockup, 192–224 px wide.
  - Never redraw, recolour or re-typeset the logo; regenerate from source with `scripts/brand_assets.py`.

## Accessibility requirements

- WCAG 2.2 AA. Semantic landmarks, one h1 per page, skip link, visible `:focus-visible` outline.
- Touch targets ≥ 44 px on phones and tablets (enforced in e2e at 390 and 768 px); inline links in running text are exempt. Native `<details>` for FAQ.
- Repeated "Find out more" links carry screen-reader-only context ("about online coaching").
- Test: axe (automated in e2e), keyboard pass, 320 px reflow, 200% zoom.
