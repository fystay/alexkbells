import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { site } from "@/content/site";
import { isIndexable, siteUrl } from "@/lib/env";
import { DEFAULT_TITLE, baseOpenGraph } from "@/lib/metadata";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { JsonLd } from "@/components/sections/JsonLd";
import { INTRO_SCRIPT, REVEAL_SCRIPT } from "@/lib/reveal";
import "./globals.css";

// One variable family; the width axis gives the expanded display headings.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: { ...baseOpenGraph, title: DEFAULT_TITLE, description: site.description },
  twitter: { card: "summary_large_image", images: ["/og-image.png"] },
  // Previews and review builds must never be indexed (see lib/env.ts).
  ...(isIndexable() ? {} : { robots: { index: false, follow: false } }),
};

export const viewport: Viewport = {
  themeColor: "#f5f2eb",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${archivo.variable} antialiased`} suppressHydrationWarning>
      <head>
        {/* Scroll reveal: switched on before first paint; see lib/reveal.ts. */}
        <script dangerouslySetInnerHTML={{ __html: REVEAL_SCRIPT }} />
        {/* Opening curtain, first visit only; see lib/reveal.ts. */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <div className="intro" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative, shown for a second on first visit; a plain img avoids next/image's lazy wrapper */}
          <img src={site.logo.lockup.src} width={site.logo.lockup.width} height={site.logo.lockup.height} alt="" />
        </div>
        <a
          href="#main"
          className="sr-only z-50 bg-paper px-4 py-3 text-sm font-semibold text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <SiteFooter />
        <JsonLd />
      </body>
    </html>
  );
}
