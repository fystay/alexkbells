# DESIGN — Alex K Bells

Tokens are defined once in `src/app/globals.css` (`@theme`). This file explains
how to use them.

## Principles

- Monochrome, editorial, athletic. Confidence comes from type and space, not effects.
- Rules (lines) and solid black bands structure the page; avoid card grids.
- Square corners. No pills, gradients, neon, glows, floating widgets or fake badges.
- Motion is limited to colour and small underline/arrow transitions (≤200 ms) and is disabled under `prefers-reduced-motion`.

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

## Imagery

- Only genuine photos of Alex, his coaching and the venue. No stock, no AI imagery presented as real.
- Configure in `site.photos`; photos render in greyscale to sit within the monochrome system. Revisit if Alex prefers colour.
- Without photos, layouts are typographic by design (no empty boxes).
- Logo: the supplied artwork is white on black, so the derived PNGs are transparent white (alpha = source luminance) and must sit on **dark surfaces only** (ink header/footer). On a light surface the `Logo` component frames them in an ink tile.
  - Header: monogram mark (36–40 px tall) + brand name text from 360 px; mark only below 360 px.
  - Footer: full lockup, 192–224 px wide.
  - Never redraw, recolour or re-typeset the logo; regenerate from source with `scripts/brand_assets.py`.

## Accessibility requirements

- WCAG 2.2 AA. Semantic landmarks, one h1 per page, skip link, visible `:focus-visible` outline.
- Touch targets ≥ 44 px on phones and tablets (enforced in e2e at 390 and 768 px); inline links in running text are exempt. Native `<details>` for FAQ.
- Repeated "Find out more" links carry screen-reader-only context ("about online coaching").
- Test: axe (automated in e2e), keyboard pass, 320 px reflow, 200% zoom.
