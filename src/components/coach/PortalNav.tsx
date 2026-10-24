"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/coach", label: "Dashboard" },
  { href: "/coach/requests", label: "Requests" },
  { href: "/coach/clients", label: "Clients" },
  { href: "/coach/classes", label: "Classes" },
  { href: "/coach/memberships", label: "Memberships" },
  { href: "/coach/sessions", label: "PT sessions" },
  { href: "/coach/online", label: "Online coaching" },
  { href: "/coach/finances", label: "Finances" },
] as const;

/** The portal's sections. Scrolls sideways on phones; the current section is marked. */
export function PortalNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Coach portal" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1">
        {ITEMS.map((item) => {
          const current = item.href === "/coach" ? pathname === "/coach" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-12 items-center border-b-2 px-3 text-sm font-semibold whitespace-nowrap transition-colors",
                  current ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
