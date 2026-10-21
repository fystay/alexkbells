import { images } from "@/content/images";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { Section, SectionHeading } from "@/components/ui/Section";
import { revealDelay } from "@/lib/reveal";

// Principles of training, not promises of results.
const principles = [
  { title: "Consistency", body: "Progress comes from turning up. Sessions that repeat week after week add up." },
  { title: "Purposeful movement", body: "Every rep has a reason. Training is planned, not random." },
  { title: "Progressive strength", body: "Start where you are. Add load as your technique earns it." },
  { title: "Good technique", body: "Quality of movement comes first, so the strength you build lasts." },
  { title: "Long-term development", body: "Training for the years ahead, not only the next session." },
  { title: "Community and accountability", body: "Training alongside others keeps you honest and keeps you coming back." },
];

export function Philosophy() {
  return (
    <Section tone="paper" id="philosophy" labelledBy="philosophy-heading">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <SectionHeading
            id="philosophy-heading"
            eyebrow="The RAENG approach"
            title="Strength is built through consistency."
            intro="We train with purpose and build with discipline. Kettlebells are the main tool: simple, demanding and good for the whole body."
          />
          <PhotoFrame
            photo={images.discipline}
            sizes="(min-width: 1024px) 36vw, 100vw"
            className="mt-10 aspect-[4/3] w-full lg:aspect-[4/5]"
          />
        </div>
        <ol className="grid grid-cols-1 content-start gap-x-10 gap-y-8 sm:grid-cols-2 lg:col-span-7 lg:pt-3">
          {principles.map((p, i) => (
            <li key={p.title} data-reveal style={revealDelay(i)} className="border-t border-ink pt-4">
              <p className="eyebrow text-muted" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 font-display text-h3">{p.title}</h3>
              <p className="mt-2 text-muted">{p.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
