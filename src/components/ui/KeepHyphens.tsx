import { Fragment } from "react";

/**
 * Stops browsers breaking hyphenated words such as "one-to-one" across lines,
 * which looks broken in large uppercase headings.
 */
export function KeepHyphens({ children }: { children: string }) {
  return (
    <>
      {children.split(/(\s+)/).map((part, i) =>
        part.includes("-") ? (
          <span key={i} className="whitespace-nowrap">
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
