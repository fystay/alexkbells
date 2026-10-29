/**
 * Single source of truth for brand, location and contact details.
 * Only add values here once they are verified (see CORE.md).
 */
export const site = {
  name: "RAENG",
  descriptor: "Fitness",
  /** "RAENG" is Thai (แรง) for strength. Shown on the logo; not used as page text. */
  thai: "แรง",
  /** Brand themes, shown together as "STRENGTH • COMMUNITY • DISCIPLINE" (as in Alex's launch post). */
  themes: ["Strength", "Community", "Discipline"] as const,
  description:
    "RAENG Fitness in Cumbernauld, Glasgow: group kettlebell classes with flexible memberships, plus 1:1 and small group coaching.",

  /**
   * The supplied logo (assets/brand/raeng-fitness-logo-source.jpg: RAENG FITNESS,
   * supplied by the owner 2026-10-22 as the exact logo; made with
   * scripts/logo_from_source.py), cut into transparent black PNGs for the cream
   * page. `header` is the top of the artwork (monogram with Thai, RAENG,
   * FITNESS and the line beneath it), cropped not retyped; `lockup` is the whole logo. Never recolour,
   * redraw or retype it.
   */
  logo: {
    header: { src: "/brand/raeng-header-black.png", width: 970, height: 676 },
    mark: { src: "/brand/raeng-mark-black.png", width: 406, height: 343 },
    lockup: {
      src: "/brand/raeng-lockup-black.png",
      width: 970,
      height: 740,
      alt: "RAENG Fitness. Strength, community, discipline.",
    },
  },

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

/**
 * Main navigation: Alex's five pages, in his layout (2026-10-29). Memberships
 * live on Classes; Online Coaching is off the site for now (the page redirects
 * to Coaching).
 */
export const mainNav = [
  { label: "Home", href: "/" },
  { label: "Classes", href: "/classes" },
  { label: "Coaching", href: "/coaching" },
  { label: "About", href: "/about" },
  { label: "FAQs & Contact", href: "/contact" },
] as const;

/** Extra pages listed in the phone menu and footer, after mainNav (none now: Contact is in mainNav). */
export const pageNav: readonly { label: string; href: string }[] = [];

/** Sign-in for members and anyone who has booked (2026-10-26; "Sign in" since 2026-10-28): in the menu and the footer, before Alex's. */
export const memberSignInNav = { label: "Sign in", href: "/account/sign-in" } as const;

/** Alex's sign-in: last in the phone menu and the footer. */
export const coachLoginNav = { label: "Coach login", href: "/coach/login" } as const;

/** Footer links: every page except Home (the logo links home), plus the member and coach sign-ins. */
export const footerNav = [
  ...mainNav.filter((item) => item.href !== "/"),
  ...pageNav,
  memberSignInNav,
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
