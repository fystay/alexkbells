/**
 * Single source of truth for brand, location and contact details.
 * Only add values here once they are verified (see CORE.md).
 */
export const site = {
  name: "RAENG",
  descriptor: "Strength & Kettlebell Coaching",
  /** Brand themes, shown together as "STRENGTH · COMMUNITY · DISCIPLINE". */
  themes: ["Strength", "Community", "Discipline"] as const,
  description:
    "RAENG: purposeful strength training and coaching in Cumbernauld, Glasgow. Group kettlebell classes, one-to-one coaching and online coaching.",

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
      /** From his profile on 2026-10-15 (9,651). Update occasionally; never round up. */
      followers: "9.6k",
    },
    /**
     * Alex's Facebook page "Alex.kbells", supplied by the project owner
     * 2026-10-18 (share link → page id 61589486540520; the page links back to
     * @alex.kbells). The stable page URL, without the share link's tracking.
     */
    facebook: {
      name: "Alex.kbells",
      url: "https://www.facebook.com/profile.php?id=61589486540520",
    },
  },
} as const;

/** Main navigation: one real page each, in this order. */
export const mainNav = [
  { label: "Home", href: "/" },
  { label: "Classes", href: "/classes" },
  { label: "1:1 Coaching", href: "/coaching" },
  { label: "Online Coaching", href: "/online-coaching" },
  { label: "About RAENG", href: "/about" },
] as const;

/** Extra page listed in the phone menu and footer, after mainNav. */
export const pageNav = [{ label: "Contact", href: "/contact" }] as const;

/** Alex's sign-in: last in the phone menu and the footer. */
export const coachLoginNav = { label: "Coach login", href: "/coach/login" } as const;

/** Footer links: every page except Home (the logo links home), plus the coach sign-in. */
export const footerNav = [
  ...mainNav.filter((item) => item.href !== "/"),
  ...pageNav,
  coachLoginNav,
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
