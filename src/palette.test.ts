import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The UI uses exactly four colours (client brief, 2026-10-22). This keeps it that way.
const PALETTE = ["#171717", "#f5f2eb", "#ffffff", "#777873"];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(tsx?|css)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

describe("four-colour palette", () => {
  const css = readFileSync("src/app/globals.css", "utf8");

  it("defines only the four approved colours as theme tokens", () => {
    const values = [...css.matchAll(/--color-[a-z-]+:\s*(#[0-9a-fA-F]{3,8})/g)].map((m) => m[1].toLowerCase());
    expect(values.length).toBeGreaterThan(0);
    for (const v of values) expect(PALETTE, v).toContain(v);
    expect(new Set(values)).toEqual(new Set(PALETTE));
  });

  it("uses no other colour anywhere in the source", () => {
    for (const file of files("src")) {
      // The hero's edge fade is an alpha mask, not a colour: it alone may use rgb().
      const text = readFileSync(file, "utf8").replace(/\.hero-feather[\s\S]*?\n\}\n/, "");
      const hex = [...text.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)].map((m) => m[0].toLowerCase());
      // Strip hex that is part of the token block or comments quoting the palette.
      for (const h of hex) {
        if (file.endsWith("globals.css") || /^\s*(\*|\/\/)/.test(text)) {
          if (PALETTE.includes(h)) continue;
        }
        expect(PALETTE, `${file}: ${h}`).toContain(h);
      }
      expect(text, `${file}: rgb()/hsl() colour`).not.toMatch(/(?<![-\w])(rgba?|hsla?)\(/);
      // Opacity modifiers (bg-ink/60, border-paper/20) and gradients create colours that are not in the palette.
      expect(text, `${file}: opacity colour`).not.toMatch(/\b(?:bg|text|border|outline|ring|decoration|divide|fill|stroke|from|via|to)-(?:ink|paper|white|grey|muted|line|surface)\/[\d[]/);
      expect(text, `${file}: gradient`).not.toMatch(/bg-linear-|bg-gradient-|radial-gradient/);
    }
  });
});
