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
      await expect(page.locator("main")).not.toContainText("£");
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
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Coaching" }).focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: "Menu" })).toBeFocused();

  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Classes" }).click();
  await expect(page).toHaveURL(/\/classes$/);
  await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
});

test("with the booking form configured, class CTAs open the on-site /book page", async ({ page }) => {
  await page.goto("/classes");
  const cta = page.getByRole("link", { name: /book your class/i }).first();
  await expect(cta).toHaveAttribute("href", "/book");
  await expect(cta).not.toHaveAttribute("target", "_blank");
  await cta.click();
  await expect(page).toHaveURL(/\/book$/);
  await expect(page.getByRole("button", { name: "Send booking request" })).toBeVisible();
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
  expect(types).toEqual(["video/webm", "video/mp4"]);
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);

  await page.getByRole("button", { name: "Pause background video" }).click();
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await expect(page.getByRole("button", { name: "Play background video" })).toBeVisible();
});

test("hero video does not autoplay for reduced-motion users", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.waitForTimeout(800);
  expect(await page.locator("main video").evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await expect(page.getByRole("button", { name: "Play background video" })).toBeVisible();
});

test("menu open on mobile has no accessibility violations and is keyboard operable", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Menu" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Close" })).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Classes" })).toBeFocused();
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

test("hero video downloads nothing for reduced-motion users", async ({ page }) => {
  const media: string[] = [];
  page.on("request", (req) => {
    if (/\/media\/hero\.(webm|mp4)/.test(req.url())) media.push(req.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "networkidle" });
  expect(media).toEqual([]);
  await expect(page.locator("main video")).toHaveAttribute("poster", "/media/hero-poster.jpg");
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

for (const [width, height] of [
  [1366, 768],
  [1440, 900],
  [1024, 768],
  [390, 844],
  [360, 800],
]) {
  test(`hero headline, booking button and video are in the first view at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const h1 = await page.locator("h1").boundingBox();
    const cta = await page.locator("main section").first().getByRole("link").first().boundingBox();
    const video = await page.locator("main video").boundingBox();
    expect(h1 && h1.y + h1.height).toBeLessThanOrEqual(height);
    expect(cta && cta.y + cta.height).toBeLessThanOrEqual(height);
    // Desktop: the whole video; phones: at least its first third.
    const visible = Math.min(video!.y + video!.height, height) - video!.y;
    expect(visible / video!.height, "share of video visible").toBeGreaterThanOrEqual(width >= 1024 ? 0.95 : 0.33);
  });
}

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

// Booking form: the e2e server points RESEND_API_URL at tests/e2e/mock-email-server.mjs.
const mockEmail = `http://localhost:${process.env.MOCK_EMAIL_PORT ?? 3299}`;

interface RecordedEmail {
  headers: { authorization?: string; idempotencyKey?: string };
  payload: { from: string; to: string[]; reply_to: string; subject: string; text: string };
}

async function recordedEmails(request: import("@playwright/test").APIRequestContext): Promise<RecordedEmail[]> {
  return (await (await request.get(`${mockEmail}/requests`)).json()) as RecordedEmail[];
}

async function fillBookingForm(page: import("@playwright/test").Page, name: string, email: string) {
  await page.getByLabel(/which class would you like to join/i).fill("A weekday evening");
  await page.getByLabel("New to kettlebells").check();
  await page.getByLabel(/your name/i).fill(name);
  await page.getByLabel(/^email/i).fill(email);
  await page.getByLabel(/i agree to alex using these details/i).check();
}

test.describe("booking request form", () => {
  test("does not expose delivery settings in the page HTML", async ({ page }) => {
    await page.goto("/book");
    const html = await page.content();
    for (const value of ["re_e2e_test_key", "alex-e2e@example.com", "bookings-e2e@example.com"]) {
      expect(html.includes(value), value).toBe(false);
    }
  });

  test("shows an error summary and field errors for an empty submission", async ({ page }) => {
    await page.goto("/book");
    await page.waitForTimeout(3200);
    await page.getByRole("button", { name: "Send booking request" }).click();
    const summary = page.locator("form [role=alert]");
    await expect(summary).toBeFocused();
    await expect(summary).toContainText("Enter your name.");
    await expect(summary).toContainText("Enter your email address");
    await expect(page.getByLabel(/your name/i)).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Request sent")).toHaveCount(0);
  });

  test("keeps typed values and flags an invalid email", async ({ page }) => {
    await page.goto("/book");
    await page.waitForTimeout(3200);
    await fillBookingForm(page, "Sam Example", "not-an-email");
    await page.getByRole("button", { name: "Send booking request" }).click();
    await expect(page.locator("form [role=alert]")).toContainText("Enter a valid email address");
    await expect(page.getByLabel(/your name/i)).toHaveValue("Sam Example");
  });

  test("rejects an instant (bot-speed) submission without claiming success", async ({ page, request }) => {
    const before = (await recordedEmails(request)).length;
    await page.goto("/book");
    await fillBookingForm(page, "Speedy Bot", "speedy@example.com");
    await page.getByRole("button", { name: "Send booking request" }).click();
    await expect(page.locator("form [role=alert]")).toContainText("Please wait a few seconds");
    await expect(page.getByText("Request sent")).toHaveCount(0);
    expect((await recordedEmails(request)).length).toBe(before);
  });

  test("sends a valid request to Alex and says it is not yet confirmed", async ({ page, request }) => {
    await page.goto("/book");
    await page.waitForTimeout(3200);
    await fillBookingForm(page, "Jordan Tester", "jordan@example.com");
    await page.getByRole("button", { name: "Send booking request" }).click();
    const status = page.getByRole("status");
    await expect(status).toContainText("Request sent");
    await expect(status).toContainText("jordan@example.com");
    await expect(status).toContainText("confirmed once Alex replies");

    const sent = (await recordedEmails(request)).find((e) => e.payload.subject.includes("Jordan Tester"));
    expect(sent).toBeDefined();
    expect(sent!.payload.to).toEqual(["alex-e2e@example.com"]);
    expect(sent!.payload.reply_to).toBe("jordan@example.com");
    expect(sent!.payload.text).toContain("not a confirmed booking");
    expect(sent!.headers.idempotencyKey).toMatch(/^booking-request\/[0-9a-f]{64}$/);
    expect(sent!.headers.authorization).toBe("Bearer re_e2e_test_key");
  });

  test("shows an error, not success, when the email provider fails", async ({ page }) => {
    await page.goto("/book");
    await page.waitForTimeout(3200);
    await fillBookingForm(page, "FAIL-TEST Person", "fail@example.com");
    await page.getByRole("button", { name: "Send booking request" }).click();
    await expect(page.locator("form [role=alert]")).toBeVisible();
    await expect(page.getByText("Request sent")).toHaveCount(0);
    await expect(page.getByLabel(/your name/i)).toHaveValue("FAIL-TEST Person");
  });
});
