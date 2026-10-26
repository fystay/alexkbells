import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { TitleBar } from "@/components/ui/TitleBar";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <>
    <div className="container-page py-24 sm:py-32">
      <p className="eyebrow ">404</p>
      <h1 className="mt-4 font-display text-h1">Page not found.</h1>
      <TitleBar />
      <p className="mt-6 max-w-lg text-lede ">
        That page doesn&apos;t exist. Try the class times or coaching options instead.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <ButtonLink href="/classes">Class times</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Home
        </ButtonLink>
      </div>
    </div>
    </>
  );
}
