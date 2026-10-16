import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { publicRoutes } from "../../src/lib/routes";

// Includes the 414–430px large phones and in-between tablet widths.
const widths = [320, 360, 375, 390, 414, 430, 480, 540, 600, 640, 700, 768, 900, 1024, 1280, 1600];

for (const route of publicRoutes) {
  test.describe(`route ${route}`, () => {
    test("responds, has one h1 and a title", async ({ page }) => {
      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page).toHaveTitle(/Alex K Bells/);
    });

    test("has no horizontal overflow at common widths", async ({ page }) => {
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow, `overflow at ${width}px`).toBeLessThanOrEqual(0);
        // Also catch controls pushed past the edge (even if clipped).
        const offscreen = await page.$$eval("main a, main button", (els) =>
          els
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && !el.classList.contains("sr-only") && r.right > window.innerWidth + 1;
            })
            .map((el) => el.textContent?.trim().slice(0, 30)),
        );
        expect(offscreen, `controls past the edge at ${width}px`).toEqual([]);
      }
    });

    test("has no detectable WCAG A/AA violations (desktop and mobile)", async ({ page }) => {
      for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.help}`), `at ${width}px`).toEqual([]);
      }
    });

    test("loads without console errors, CSP violations or failed requests", async ({ browser, baseURL }) => {
      const problems: string[] = [];
      // A fresh page per width: navigating one page twice cancels whatever the
      // first load still had in flight (e.g. lazy images revealed by a resize).
      for (const width of [390, 1280]) {
        const page = await browser.newPage({ baseURL, viewport: { width, height: 900 } });
        page.on("console", (msg) => {
          if (msg.type() === "error") problems.push(`console: ${msg.text()}`);
        });
        page.on("pageerror", (err) => problems.push(`pageerror: ${err.message}`));
        page.on("requestfailed", (req) => {
          // Expected cancellations: link prefetches (?_rsc=) and media aborted
          // when the page closes. Anything else is a real failure.
          const cancelled = /ERR_ABORTED/.test(req.failure()?.errorText ?? "");
          if (cancelled && (/[?&]_rsc=/.test(req.url()) || /\/media\//.test(req.url()))) return;
          problems.push(`failed: ${req.url()} ${req.failure()?.errorText ?? ""}`);
        });
        page.on("response", (res) => {
          if (res.status() >= 400 && new URL(res.url()).origin === new URL(page.url() || res.url()).origin) {
            problems.push(`${res.status()}: ${res.url()}`);
          }
        });
        await page.goto(route, { waitUntil: "networkidle" });
        page.removeAllListeners("requestfailed");
        await page.close();
      }
      expect(problems).toEqual([]);
    });

    test("has page-specific social preview and canonical metadata", async ({ page }) => {
      await page.goto(route);
      const meta = (sel: string) => page.locator(sel).first().getAttribute("content");
      const title = await page.title();
      expect(await meta('meta[property="og:title"]')).toBe(title);
      expect(await meta('meta[property="og:url"]')).toMatch(new RegExp(`${route === "/" ? "/?" : route}$`));
      expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toMatch(
        new RegExp(`${route === "/" ? "/?" : route}$`),
      );
      expect(await meta('meta[property="og:image"]')).toMatch(/\/og-image\.png$/);
      expect(await meta('meta[property="og:image:alt"]')).toBeTruthy();
      expect(await meta('meta[name="twitter:card"]')).toBe("summary_large_image");
      expect(await meta('meta[name="description"]')).toBeTruthy();
    });

    test("has 44px tap targets on phones and tablets (outside running text)", async ({ page }) => {
      for (const width of [390, 768]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        const small = await page.$$eval("a, button, summary", (els) =>
          els
            .filter((el) => {
              const box = el.getBoundingClientRect();
              if (!box.width || !box.height) return false; // hidden
              if (el.closest("p")) return false; // inline links in text are exempt
              if (el.classList.contains("sr-only")) return false; // skip link until focused
              return box.height < 44;
            })
            .map((el) => `${el.textContent?.trim().slice(0, 30)} (${Math.round(el.getBoundingClientRect().height)}px)`),
        );
        expect(small, `at ${width}px`).toEqual([]);
      }
    });

    test("heading levels do not skip", async ({ page }) => {
      await page.goto(route);
      const levels = await page.$$eval("h1, h2, h3, h4, h5, h6", (hs) => hs.map((h) => Number(h.tagName[1])));
      expect(levels[0]).toBe(1);
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i] - levels[i - 1], `heading ${i}`).toBeLessThanOrEqual(1);
      }
    });

    test("external links are safe and announce new tabs", async ({ page }) => {
      await page.goto(route);
      const bad = await page.$$eval("a[href^='http']", (as) =>
        as
          .filter(
            (a) =>
              a.getAttribute("target") !== "_blank" ||
              !/noopener/.test(a.getAttribute("rel") ?? "") ||
              !/opens in a new tab/i.test(a.textContent ?? ""),
          )
          .map((a) => a.getAttribute("href")),
      );
      expect(bad).toEqual([]);
    });

    test("in-page anchors point at existing ids", async ({ page }) => {
      await page.goto(route);
      const missing = await page.$$eval("a[href^='#']", (as) =>
        as.map((a) => a.getAttribute("href")!.slice(1)).filter((id) => !document.getElementById(id)),
      );
      expect(missing).toEqual([]);
    });

    test("shows no provisional content on a production build", async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("[data-provisional]")).toHaveCount(0);
      // Only the prices confirmed on 2026-10-15 may appear.
      const amounts = (await page.locator("main").innerText()).match(/£\d+/g) ?? [];
      for (const amount of amounts) expect(["£35", "£130", "£79"]).toContain(amount);
      // No unfilled placeholders anywhere.
      await expect(page.locator("main")).not.toContainText(/\[[A-Z][^\]]*\]/);
    });
  });
}

test("all internal links resolve", async ({ page, request }) => {
  const hrefs = new Set<string>();
  for (const route of publicRoutes) {
    await page.goto(route);
    for (const href of await page.locator("a[href^='/']").evaluateAll((as) =>
      as.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""),
    )) {
      hrefs.add(href.split("#")[0] || "/");
    }
  }
  for (const href of hrefs) {
    const res = await request.get(href);
    expect(res.status(), href).toBe(200);
  }
});

test("unknown routes return the 404 page", async ({ page }) => {
  const res = await page.goto("/does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText(/page not found/i);
});

test("skip link moves focus to main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("mobile menu opens, navigates, closes with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Menu" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(page.getByRole("button", { name: "Close" })).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "About Alex" }).focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: "Menu" })).toBeFocused();

  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Group classes" }).click();
  await expect(page).toHaveURL(/\/classes$/);
  await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
});

test("booking buttons lead to the right step of the on-site booking flow", async ({ page }) => {
  await page.goto("/classes");
  const cta = page.getByRole("link", { name: /book your class/i }).first();
  await expect(cta).toHaveAttribute("href", "/book/group-class");
  await expect(cta).not.toHaveAttribute("target", "_blank");
  await page.goto("/coaching");
  await expect(page.getByRole("link", { name: "Book a one-to-one" })).toHaveAttribute("href", "/book/one-to-one");
  await expect(page.getByRole("link", { name: /explore online coaching/i }).first()).toHaveAttribute("href", "/online-coaching");
  await page.goto("/");
  await expect(page.getByRole("banner").getByRole("link", { name: /book a session/i })).toHaveAttribute("href", "/book");
});

test("header logo, navigation and booking button never overlap", async ({ page }) => {
  for (const width of [320, 360, 390, 768, 900, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const logo = await page.locator("header a[aria-label$=', home']").evaluate((el) => {
      // The wordmark can be wider than its link box, so measure the visible content.
      const rects = [...el.querySelectorAll("img, span")].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 0);
      return Math.max(...rects.map((r) => r.right));
    });
    const firstControl = Math.min(
      ...(await page.locator("header nav a:visible, header button:visible, header .md\\:block > a:visible").evaluateAll((els) =>
        els.map((el) => el.getBoundingClientRect().left),
      )),
    );
    expect(logo, `logo overlaps navigation at ${width}px`).toBeLessThanOrEqual(firstControl);
  }
});

test("the menu answers Alex's four questions, each one tap away", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/contact");
  const nav = page.getByRole("banner").getByRole("navigation", { name: "Main" });
  for (const [label, id, heading] of [
    ["Ways to train", "ways-to-train", /choose how you train/i],
    ["Why kettlebells", "why-kettlebells", /stronger, fitter/i],
    ["About Alex", "about", /coached by alex/i],
    ["How to book", "how-to-book", /where and how to book/i],
  ] as const) {
    await nav.getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`/#${id}$`));
    const section = page.locator(`#${id}`);
    await expect(section.getByRole("heading", { level: 2 })).toHaveText(heading);
    await expect(section).toBeInViewport();
  }
  // "Where and how" gives the address, directions and a booking button together.
  const book = page.locator("#how-to-book");
  await expect(book).toContainText("1A Dunns Wood Road");
  await expect(book.getByRole("link", { name: /get directions/i })).toBeVisible();
  await expect(book.getByRole("link", { name: /book your session/i })).toBeVisible();
});

test("cross-page section anchors exist", async ({ page }) => {
  await page.goto("/coaching");
  await expect(page.locator("#one-to-one")).toHaveCount(1);
  await expect(page.locator("#online")).toHaveCount(1);
});

test("contact, Instagram and directions links point at verified destinations", async ({ page }) => {
  await page.goto("/contact");
  const hrefs = await page.$$eval("a[href^='http']", (as) => as.map((a) => a.getAttribute("href")!));
  expect(hrefs).toContain("https://www.instagram.com/alex.kbells/");
  const maps = hrefs.find((h) => h.startsWith("https://www.google.com/maps/search/"));
  expect(maps && decodeURIComponent(maps)).toContain("1A Dunns Wood Road, Cumbernauld, G67 3EN");
});

test("supplied logo renders in header and footer as labelled home links", async ({ page, request }) => {
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/classes");
    const header = page.locator("header").getByRole("link", { name: "Alex K Bells, home" });
    await expect(header.locator('img[src*="logo-mark"]')).toBeVisible();
    const footer = page.locator("footer").getByRole("link", { name: "Alex K Bells, home" });
    await expect(footer.locator('img[src*="logo-lockup"]')).toBeVisible();
  }
  for (const path of ["/icon.png", "/apple-icon.png", "/og-image.png"]) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
});

test("hero video plays silently, can be paused, and offers WebM + MP4", async ({ page }) => {
  await page.goto("/");
  const video = page.locator("main video");
  await expect(video).toHaveAttribute("aria-hidden", "true");
  expect(await video.evaluate((v: HTMLVideoElement) => v.muted && v.loop && v.playsInline)).toBe(true);
  const types = await video.locator("source").evaluateAll((els) => els.map((e) => e.getAttribute("type")));
  expect(types).toEqual(['video/mp4; codecs="avc1.64001F"', 'video/webm; codecs="vp9"']);
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);

  await page.getByRole("button", { name: "Pause background video" }).click();
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await expect(page.getByRole("button", { name: "Play background video" })).toBeVisible();
});

test("hero video loops back to the start instead of stopping on a blank frame", async ({ page }) => {
  await page.goto("/");
  const video = page.locator("main video");
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused && v.readyState >= 2)).toBe(true);
  // Native loop.
  await video.evaluate((v: HTMLVideoElement) => (v.currentTime = v.duration - 0.3));
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 5000 }).toBeLessThan(2);
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused || v.ended)).toBe(false);
  // Fallback for browsers that ignore `loop`: the ended handler restarts it.
  await video.evaluate((v: HTMLVideoElement) => {
    v.loop = false;
    v.currentTime = v.duration - 0.3;
  });
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.ended && !v.paused && v.currentTime < 2), { timeout: 5000 }).toBe(true);
});

test("hero video starts on its own for everyone, even before JavaScript runs", async ({ page, browser, baseURL }) => {
  // Visitors with Reduce Motion switched on (common on iPhones) see it play too.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const video = page.locator("main video");
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 0)).toBe(true);
  await expect(page.getByRole("button", { name: "Pause background video" })).toBeVisible();

  // The autoplay attributes are in the server HTML, so it doesn't wait for scripts.
  const noJs = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const plain = await noJs.newPage();
  await plain.goto("/");
  const attrs = await plain.locator("main video").evaluate((v) => ["autoplay", "muted", "loop", "playsinline"].map((a) => v.hasAttribute(a)));
  expect(attrs).toEqual([true, true, true, true]);
  await expect.poll(() => plain.locator("main video").evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
  await noJs.close();
});

test("menu open on mobile has no accessibility violations and is keyboard operable", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Menu" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Close" })).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Ways to train" })).toBeFocused();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});

test("FAQ items open and close with the keyboard", async ({ page }) => {
  await page.goto("/");
  const summary = page.locator("main details summary").first();
  const details = page.locator("main details").first();
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("open", "");
  await page.keyboard.press("Space");
  await expect(details).not.toHaveAttribute("open", "");
});

test("business structured data is valid JSON with the verified address only", async ({ page }) => {
  await page.goto("/");
  const raw = await page.locator('script[type="application/ld+json"]').textContent();
  const data = JSON.parse(raw ?? "{}");
  expect(data["@type"]).toBe("LocalBusiness");
  expect(data.address.postalCode).toBe("G67 3EN");
  expect(data.sameAs).toEqual(["https://www.instagram.com/alex.kbells/"]);
  // Nothing unconfirmed: no prices, hours, ratings or phone numbers.
  for (const key of ["priceRange", "openingHours", "openingHoursSpecification", "aggregateRating", "telephone"]) {
    expect(data[key], key).toBeUndefined();
  }
});

test("security headers are sent", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("default-src 'self'");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["strict-transport-security"]).toContain("max-age=");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("browser JavaScript contains no server-only configuration names", async ({ page, request }) => {
  const scripts = new Set<string>();
  for (const route of publicRoutes) {
    await page.goto(route);
    for (const src of await page.locator("script[src]").evaluateAll((els) => els.map((e) => e.getAttribute("src")!))) {
      scripts.add(src);
    }
  }
  expect(scripts.size).toBeGreaterThan(0);
  for (const src of scripts) {
    const body = await (await request.get(src)).text();
    for (const name of [
      "CONTENT_PREVIEW",
      "BOOKING_URL",
      "SITE_URL",
      "VERCEL_ENV",
      "BOOKING_DEMO",
      "RESEND_API_KEY",
      "RESEND_API_URL",
      "BOOKING_NOTIFY_EMAIL",
      "BOOKING_FROM_EMAIL",
      "re_e2e_test_key",
      "alex-e2e@example.com",
      "bookings-e2e@example.com",
    ]) {
      expect(body.includes(name), `${name} in ${src}`).toBe(false);
    }
  }
});

test("a paused hero video stays paused after scrolling away and back", async ({ page }) => {
  await page.goto("/");
  const video = page.locator("main video");
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
  await page.getByRole("button", { name: "Pause background video" }).click();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
});

// Tablets and desktop: headline, booking button and the whole video in the first view.
for (const [width, height] of [
  [1440, 900],
  [1366, 768],
  [1024, 768],
  [768, 1024],
]) {
  test(`hero headline, booking button and the whole video are in the first view at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const h1 = await page.locator("h1").boundingBox();
    const cta = await page.locator("main section").first().getByRole("link").first().boundingBox();
    const video = await page.locator("main video").boundingBox();
    expect(h1 && h1.y + h1.height).toBeLessThanOrEqual(height);
    expect(cta && cta.y + cta.height).toBeLessThanOrEqual(height);
    expect(video!.y).toBeGreaterThanOrEqual(0);
    expect(video!.y + video!.height, "bottom of the video").toBeLessThanOrEqual(height);
    expect(Math.abs(video!.width / video!.height - 0.8)).toBeLessThan(0.01);
  });
}

// Phones: the video runs edge to edge at its full 4:5 frame, never cropped,
// with the headline and booking button over its lower part, so the whole
// video, headline and button fit the first screen, even with Safari's toolbar.
for (const [width, height] of [
  [430, 932],
  [393, 852],
  [390, 664],
  [360, 640],
  [320, 568],
] as const) {
  test(`hero video runs edge to edge with the headline and button on it at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const video = page.locator("main video");
    const box = (await video.boundingBox())!;
    const h1 = (await page.locator("h1").boundingBox())!;
    const cta = (await page.locator("main section").first().getByRole("link").first().boundingBox())!;
    expect(box.x).toBe(0);
    expect(box.x + box.width).toBe(width);
    expect(Math.abs(box.width / box.height - 0.8)).toBeLessThan(0.01);
    expect(await video.evaluate((v) => getComputedStyle(v).objectFit)).toBe("contain");
    expect(box.y + box.height, "bottom of the video").toBeLessThanOrEqual(height);
    // Headline and button sit on the lower part of the video.
    for (const el of [h1, cta]) {
      expect(el.y).toBeGreaterThan(box.y + box.height / 2);
      expect(el.y + el.height).toBeLessThanOrEqual(box.y + box.height);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  });
}

test("phones get a booking bar once the hero scrolls away, hidden near the closing call to action", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto("/");
  const bar = page.getByTestId("mobile-book-bar");
  await expect(bar).toHaveAttribute("aria-hidden", "true");
  await page.locator("#why-kettlebells").scrollIntoViewIfNeeded();
  await expect(bar).toHaveAttribute("aria-hidden", "false");
  await expect(bar.getByRole("link")).toBeInViewport();
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(bar).toHaveAttribute("aria-hidden", "true");
  // Never on desktop.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.locator("#ways-heading").scrollIntoViewIfNeeded();
  await expect(bar).toBeHidden();
});

test("class pages link to the how-to-join section", async ({ page }) => {
  await page.goto("/classes");
  await expect(page.locator("#book")).toHaveCount(1);
  await expect(page.locator("#book ol > li")).toHaveCount(3);
  await page.getByRole("link", { name: "How to join" }).click();
  await expect(page).toHaveURL(/#book$/);
});

test("robots and sitemap are served", async ({ request }) => {
  expect((await request.get("/robots.txt")).status()).toBe(200);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const body = await sitemap.text();
  for (const route of publicRoutes.filter((r) => r !== "/")) expect(body).toContain(route);
});
