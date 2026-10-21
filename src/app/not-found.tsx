import type { Metadata } from "next";
import { SitePage } from "@/components/ui/SitePage";
import { ButtonLink } from "@/components/ui/ButtonLink";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <SitePage>
    <div className="container-page py-24 sm:py-32">
      <p className="eyebrow text-muted-inverse">404</p>
      <h1 className="mt-4 font-display text-h1">Page not found</h1>
      <p className="mt-6 max-w-lg text-lede text-muted-inverse">
        That page doesn&apos;t exist. Try the class times or coaching options instead.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <ButtonLink href="/classes" tone="dark">Class times</ButtonLink>
        <ButtonLink href="/" tone="dark" variant="secondary">
          Home
        </ButtonLink>
      </div>
    </div>
    </SitePage>
  );
}
