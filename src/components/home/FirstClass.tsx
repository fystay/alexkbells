import { firstClass } from "@/content/firstClass";
import { isPublishable } from "@/lib/publish";
import { Provisional } from "@/components/ui/Provisional";
import { Section } from "@/components/ui/Section";

/** Beginner reassurance. Renders nothing until Alex confirms the words (content/firstClass.ts). */
export function FirstClass() {
  if (!firstClass || !isPublishable(firstClass.status)) return null;
  return (
    <Provisional status={firstClass.status}>
      <Section tone="white" labelledBy="first-class-heading" spacing="compact">
        <h2 id="first-class-heading" className="font-display text-h2">
          {firstClass.title}
        </h2>
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {firstClass.points.map((p) => (
            <li key={p} className="rounded-lg border border-grey p-4">
              {p}
            </li>
          ))}
        </ul>
      </Section>
    </Provisional>
  );
}
