import { images } from "@/content/images";
import { site } from "@/content/site";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PhotoFrame } from "@/components/ui/PhotoFrame";

/**
 * Opening section. Phones: the photograph runs edge to edge under the
 * header and the text rises out of its dark foot. Desktop: text on the left,
 * the photograph tall on the right. The oversized wordmark below is
 * decorative (the header carries the real, linked one).
 */
export function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden bg-ink text-paper">
      <div className="lg:container-page lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-12 lg:py-12">
        <div className="relative lg:order-2 lg:col-span-5">
          <PhotoFrame
            photo={images.hero}
            sizes="(min-width: 1024px) 40vw, 100vw"
            priority
            square
            className="h-[min(30rem,42svh)] w-full sm:h-[34rem] lg:h-[min(46rem,calc(100svh-9rem))] lg:rounded-xl"
          />
          {/* Phones and tablets: the photo melts into the ink the text sits on. */}
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-ink via-ink/60 to-transparent lg:hidden" />
        </div>

        <div className="container-page relative -mt-24 pb-14 sm:-mt-28 lg:order-1 lg:col-span-7 lg:mt-0 lg:px-0 lg:pb-0">
          <p className="eyebrow text-muted-inverse">{site.themes.join(" · ")}</p>
          <h1 id="hero-heading" className="mt-4 font-display text-display text-balance lg:text-display-split">
            <span className="block">Built through movement.</span>
            <span className="block text-muted-inverse">Defined by discipline.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lede text-muted-inverse">
            Purposeful strength training. Expert coaching. A community built around getting stronger.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ButtonLink href="#find-your-training" tone="dark" variant="action" className="w-full sm:w-64">
              Explore Training
            </ButtonLink>
            <ButtonLink href="/about" tone="dark" variant="secondary" className="w-full sm:w-auto">
              About RAENG
            </ButtonLink>
          </div>
        </div>
      </div>

      {/* Generated content, so it is purely decoration: not read, not selectable, not a text-contrast target. */}
      <p
        aria-hidden="true"
        data-text={site.name}
        className="container-page select-none whitespace-nowrap font-extrabold uppercase leading-[0.8] tracking-[0.04em] text-line-inverse [font-stretch:112%] text-[clamp(3rem,19vw,15rem)] before:content-[attr(data-text)]"
      />
    </section>
  );
}
