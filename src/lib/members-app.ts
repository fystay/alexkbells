/**
 * The signed-in members area (owner's members design, 2026-10-28): these
 * pages have their own app header, menu and tab bar instead of the public
 * site's header and footer. Sign-in and confirm keep the site's.
 */
export const MEMBERS_APP_PATHS = ["/account", "/account/book", "/account/plan"] as const;

export type MembersView = "home" | "book" | "plan";

export const MEMBERS_VIEW_PATH: Record<MembersView, string> = {
  home: "/account",
  book: "/account/book",
  plan: "/account/plan",
};

export function isMembersApp(pathname: string | null): boolean {
  return pathname !== null && (MEMBERS_APP_PATHS as readonly string[]).includes(pathname.replace(/\/$/, "") || "/");
}
