import type { Logo, Photo } from "./types";

/**
 * Single source of truth for brand, location and contact details.
 * Only add values here once they are verified (see CORE.md).
 */
export const site = {
  name: "Alex K Bells",
  descriptor: "Kettlebell Coach",
  description:
    "Kettlebell coaching in Cumbernauld: group classes, one-to-one coaching and online coaching with Alex K Bells.",

  /**
   * The supplied logo (source: assets/brand/alexkbells-logo-source.jpg),
   * cropped by scripts/brand_assets.py into transparent white artwork.
   * These PNGs are for dark surfaces only. Set to null to fall back to the
   * plain-text brand name.
   */
  logo: {
    /** AR monogram with kettlebell — header. */
    mark: { src: "/brand/logo-mark.png", width: 741, height: 368, alt: "" },
    /** Full lockup: monogram, ALEX.KBELLS, KETTLEBELL COACH — footer. */
    lockup: {
      src: "/brand/logo-lockup.png",
      width: 978,
      height: 554,
      alt: "Alex K Bells, Kettlebell Coach",
    },
    /** Name as written on the logo artwork; shown beside the mark in the header. */
    wordmark: "ALEX.KBELLS",
  } as { mark: Logo; lockup: Logo; wordmark: string } | null,

  location: {
    venue: "Media House",
    street: "1A Dunns Wood Road",
    town: "Cumbernauld",
    city: "Glasgow",
    postcode: "G67 3EN",
    region: "Scotland",
    country: "United Kingdom",
    countryCode: "GB",
  },

  contact: {
    /** Not yet supplied. Leave null until verified; null values are not rendered. */
    email: null as string | null,
    phone: null as string | null,
  },

  social: {
    instagram: {
      handle: "@alex.kbells",
      url: "https://www.instagram.com/alex.kbells/",
    },
  },

  /**
   * Homepage hero loop cut from Alex's own Instagram reel by
   * scripts/hero_video.py (his caption/handle overlays removed, black and
   * white, silent, 4:5). Takes priority over photos.hero. Null to disable.
   */
  heroVideo: {
    // Browsers use the first format they can play. H.264 MP4 comes first:
    // Safari/iOS loop it reliably (their WebM looping can stall on a black
    // frame). Exact codecs let browsers without H.264 skip to the WebM.
    sources: [
      { src: "/media/hero.mp4", type: 'video/mp4; codecs="avc1.64001F"' },
      { src: "/media/hero.webm", type: 'video/webm; codecs="vp9"' },
    ],
    poster: "/media/hero-poster.jpg",
  } as { sources: { src: string; type: string }[]; poster: string } | null,

  /** Genuine photos of Alex / his coaching only. Empty until supplied. */
  photos: {
    hero: null as Photo | null,
    about: null as Photo | null,
  },
} as const;

export const mainNav = [
  { label: "Classes", href: "/classes" },
  { label: "Coaching", href: "/coaching" },
  { label: "Contact", href: "/contact" },
] as const;

export function formatAddressLines(): string[] {
  const l = site.location;
  return [l.venue, l.street, `${l.town}, ${l.city}`, l.postcode];
}

export function mapsUrl(): string {
  const l = site.location;
  const query = [l.venue, l.street, l.town, l.postcode].join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
