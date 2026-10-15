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
   * The supplied logo. Place the file at public/brand/ and fill this in with
   * its real pixel dimensions. While null, the header shows the brand name as
   * plain text (no imitation of the monogram).
   * `onDark` must be true if the artwork has a black background.
   */
  logo: null as (Logo & { onDark: boolean }) | null,

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
