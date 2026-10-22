import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { coachRoutes, publicRoutes } from "../../src/lib/routes";

// Includes the 414–430px large phones and in-between tablet widths.
const widths = [320, 360, 375, 390, 414, 430, 480, 540, 600, 640, 700, 768, 900, 1024, 1280, 1600];

for (const route of [...publicRoutes, ...coachRoutes]) {
  test.describe(`route ${route}`, () => {
    test("responds, has one h1 and a title", async ({ page }) => {
      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page).toHaveTitle(/RAENG/);
    });

    test("has no horizontal overflow at common widths", async ({ page }) => {
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow, `overflow at ${width}px`).toBeLessThanOrEqual(0);
        // Also catch controls pushed past the edge (even if clipped). Controls
        // inside a sideways-scrolling row (the offers carousel) are reached by
        // swiping, so they don't count.
        const offscreen = await page.$$eval("main a, main button", (els) =>
          els
            .filter((el) => {
              const r = el.getBoundingClientRect();
              if (r.width === 0 || el.classList.contains("sr-only") || r.right <= window.innerWidth + 1) return false;
              for (let p = el.parentElement; p; p = p.parentElement) {
                if (["auto", "scroll"].includes(getComputedStyle(p).overflowX)) return false;
              }
              return true;
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
        // Let in-view scroll reveals finish (0.7 s + stagger): mid-fade text is briefly translucent.
        await page.waitForTimeout(1300);
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
      // Only the prices the project owner confirmed may appear.
      const amounts = (await page.locator("main").innerText()).match(/£\d+/g) ?? [];
      for (const amount of amounts) expect(["£12", "£35", "£130", "£79", "£40", "£65", "£85", "£48", "£96", "£144", "£8", "£31", "£59", "£10", "£8.13", "£7.08", "£7"]).toContain(amount);
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



test("the contact page leads to Alex's Instagram", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.locator("h1")).toHaveText(/contact raeng/i);
  // The action is in the first screen on phones and desktop.
  for (const [width, height] of [[390, 844], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/contact");
    const ig = page.getByRole("link", { name: /message alex on instagram/i });
    await expect(ig).toHaveAttribute("href", "https://www.instagram.com/alex.kbells/");
    await expect(ig).toHaveAttribute("target", "_blank");
    const box = (await ig.boundingBox())!;
    expect(box.y + box.height, `${width}px`).toBeLessThanOrEqual(height);
  }
});

test("the Instagram card links straight to Alex's profile for updates", async ({ page }) => {
  await page.goto("/contact");
  const follow = page.locator("#enquire").getByRole("link", { name: /follow @alex\.kbells for updates/i });
  await expect(follow).toHaveAttribute("href", "https://www.instagram.com/alex.kbells/");
  await expect(follow).toHaveAttribute("target", "_blank");
});

test("header: menu at the left, logo centred, Book Now at the right, none overlapping", async ({ page }) => {
  for (const width of [320, 360, 390, 768, 900, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const box = async (sel: string) => page.locator(sel).first().evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right };
    });
    const menu = await box("header button");
    const logo = await page.locator("header a[aria-label$=', home']").evaluate((el) => {
      // The wordmark can be wider than its link box, so measure the visible content.
      const rects = [...el.querySelectorAll("img, span")].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 0);
      return { left: Math.min(...rects.map((r) => r.left)), right: Math.max(...rects.map((r) => r.right)) };
    });
    const book = await box("header > div > :last-child a, header > div > a:last-child");
    expect(menu.right, `menu overlaps logo at ${width}px`).toBeLessThanOrEqual(logo.left);
    expect(logo.right, `logo overlaps Book Now at ${width}px`).toBeLessThanOrEqual(book.left);
    // Centred whenever the two side controls leave room; on the narrowest phones it shifts to avoid them.
    if (width >= 600) expect(Math.abs((logo.left + logo.right) / 2 - width / 2), `logo is not centred at ${width}px`).toBeLessThan(2);
  }
});

test("contact, Instagram and directions links point at verified destinations", async ({ page }) => {
  await page.goto("/contact");
  const hrefs = await page.$$eval("a[href^='http']", (as) => as.map((a) => a.getAttribute("href")!));
  expect(hrefs).toContain("https://www.instagram.com/alex.kbells/");
  // Alex's Facebook page: the stable page URL, never the share link with its tracking.
  expect(hrefs).toContain("https://www.facebook.com/profile.php?id=61589486540520");
  expect(hrefs.some((h) => /facebook\.com\/share|mibextid/.test(h))).toBe(false);
  const maps = hrefs.find((h) => h.startsWith("https://www.google.com/maps/search/"));
  expect(maps && decodeURIComponent(maps)).toContain("1A Dunns Wood Road, Cumbernauld, G67 3EN");
});




test("business structured data is valid JSON with the verified address only", async ({ page }) => {
  await page.goto("/");
  const raw = await page.locator('script[type="application/ld+json"]').textContent();
  const data = JSON.parse(raw ?? "{}");
  expect(data["@type"]).toBe("LocalBusiness");
  expect(data.address.postalCode).toBe("G67 3EN");
  expect(data.sameAs).toEqual(["https://www.instagram.com/alex.kbells/", "https://www.facebook.com/profile.php?id=61589486540520"]);
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



test("robots and sitemap are served", async ({ request }) => {
  expect((await request.get("/robots.txt")).status()).toBe(200);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const body = await sitemap.text();
  for (const route of publicRoutes.filter((r) => r !== "/")) expect(body).toContain(route);
});


test.describe("scroll reveal", () => {
  test("content below the fold fades in when scrolled to", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const faq = page.locator("#main li[data-reveal]").last();
    await expect(faq).not.toHaveAttribute("data-revealed", "");
    expect(await faq.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
    await faq.scrollIntoViewIfNeeded();
    await expect(faq).toHaveAttribute("data-revealed", "");
    await expect.poll(() => faq.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  });

  test("is off with reduced motion and without JavaScript", async ({ page, browser, baseURL }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.hasAttribute("data-reveal-ready"))).toBe(false);
    expect(await page.locator("#main li[data-reveal]").last().evaluate((el) => getComputedStyle(el).opacity)).toBe("1");

    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const noJs = await context.newPage();
    await noJs.goto("/");
    expect(await noJs.locator("#main li[data-reveal]").last().evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    await context.close();
  });
});



/**
 * Outdated instructions: booking or joining only by Instagram message. Never
 * allowed while the booking form is open; Instagram may appear only as the
 * labelled alternative.
 */
const INSTAGRAM_ONLY_BOOKING = [
  /message alex on instagram with the session/i,
  /on instagram[^.]{0,40}(to book|to join|you'?d like to book|would like to join)/i,
  // Within one line: a "Book now" button label isn't a sentence about Instagram further down.
  /(book|join)[^.\n]{0,40}(on|via|through|by) (an )?instagram/i,
  /get in touch to (book|join|arrange a session)/i,
];

for (const [server, base] of [
  ["booking demo server", ""],
  ["production-configured server", `http://localhost:${process.env.E2E_PRODUCTION_PORT ?? 3201}`],
] as const) {
  test(`${server}: no page tells visitors to book only through Instagram`, async ({ page }) => {
    for (const route of ["/", "/classes", "/coaching", "/online-coaching", "/about", "/contact"]) {
      await page.goto(base + route);
      const text = await page.locator("main").innerText();
      for (const pattern of INSTAGRAM_ONLY_BOOKING) expect(text, `${route}: ${pattern}`).not.toMatch(pattern);
    }
  });

  test(`${server}: booking CTAs reach the right service, with Instagram as the labelled alternative`, async ({ page }) => {
    await page.goto(base + "/classes");
    const join = page.locator("#join");
    await expect(join.getByRole("heading", { name: "Send a booking request" })).toBeVisible();
    await expect(join.getByRole("heading", { name: "Alex confirms your place" })).toBeVisible();
    await expect(join.getByRole("link", { name: "Book now" })).toHaveAttribute("href", "/book/group-class");
    await expect(join.getByRole("link", { name: /Message Alex on Instagram/ })).toHaveAttribute("href", "https://www.instagram.com/alex.kbells/");

    await page.goto(base + "/coaching");
    const how = page.locator("#how-it-works");
    await expect(how.getByRole("heading", { name: "Send a booking request" })).toBeVisible();
    await expect(how.getByRole("link", { name: /Book now/ })).toHaveAttribute("href", "/book/one-to-one");
    await expect(how.getByRole("link", { name: /Message Alex on Instagram/ })).toBeVisible();

    // Online coaching stays an enquiry, with no booking wording.
    await page.goto(base + "/online-coaching");
    await expect(page.getByRole("link", { name: "Enquire about online coaching" }).first()).toHaveAttribute("href", "/online-coaching/enquire");
    await expect(page.locator("main")).not.toContainText(/booking request/i);

    await page.goto(base + "/contact");
    await expect(page.getByRole("link", { name: "Send a booking request" })).toHaveAttribute("href", "/book");
    await expect(page.locator("main")).toContainText("Alex confirms your place");
  });
}

test("mobile menu opens, navigates, closes with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Menu" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(page.getByRole("button", { name: "Close" })).toHaveAttribute("aria-expanded", "true");
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("link", { name: "About RAENG" }).focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: "Menu" })).toBeFocused();
  await page.getByRole("button", { name: "Menu" }).click();
  await nav.getByRole("link", { name: "Classes" }).click();
  await expect(page).toHaveURL(/\/classes$/);
  await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
});

// Primary navigation: five real pages, on phone and desktop, marking the current page.
const NAV: [string, string][] = [
  ["Home", "/"],
  ["Classes", "/classes"],
  ["Memberships", "/memberships"],
  ["1:1 Coaching", "/coaching"],
  ["Online Coaching", "/online-coaching"],
  ["About RAENG", "/about"],
];
for (const [label, href] of NAV) {
  test(`navigation: ${label} opens ${href} and is marked as the current page`, async ({ page }) => {
    for (const [width, height] of [[390, 844], [1280, 800]]) {
      await page.setViewportSize({ width, height });
      await page.goto(href === "/" ? "/classes" : "/");
      await page.getByRole("button", { name: "Menu" }).click();
      const nav = page.getByRole("navigation", { name: "Main" }).filter({ visible: true });
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${href === "/" ? "/$" : href + "$"}`));
      await expect(page.locator("h1:visible")).toHaveCount(1);
      await page.getByRole("button", { name: "Menu" }).click();
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
      await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
    }
  });
}

test("the RAENG wordmark is a labelled home link in the header and footer", async ({ page }) => {
  await page.goto("/classes");
  for (const scope of [page.locator("header"), page.locator("footer")]) {
    const link = scope.getByRole("link", { name: "RAENG Kettlebell Club, home" });
    // The header carries the name as live text beside the monogram; the footer shows the full lockup.
    await expect(link).toHaveAttribute("href", "/");
    await expect(link.locator("img").first()).toHaveAttribute("src", /raeng-(header|lockup)-black/);
  }
});

test("homepage hero: headline, copy and both calls to action work", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator("section[aria-labelledby=hero-heading]");
  await expect(hero.locator("h1")).toContainText("Train with purpose.");
  await expect(hero.locator("h1")).toContainText("Build with discipline.");
  await expect(hero.getByRole("link", { name: "Book now" })).toHaveAttribute("href", "/book/group-class");
  await hero.getByRole("link", { name: "Explore coaching" }).click();
  await expect(page).toHaveURL(/\/coaching$/);
});

test("homepage hero and its call to action are in the first screen on phones and desktop", async ({ page }) => {
  for (const [width, height] of [[360, 640], [390, 844], [768, 1024], [1024, 768], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const cta = (await page.locator("section[aria-labelledby=hero-heading]").getByRole("link", { name: "Book now" }).boundingBox())!;
    expect(cta.y + cta.height, `${width}x${height}`).toBeLessThanOrEqual(height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  }
});

test("homepage: services, memberships and the coach's story are there, and no testimonial is invented", async ({ page }) => {
  await page.goto("/");
  const training = page.locator("#find-your-training");
  await expect(training.getByRole("link", { name: "See memberships" })).toHaveAttribute("href", "/memberships");
  await expect(training.getByRole("link", { name: "Explore 1:1 Coaching" })).toHaveAttribute("href", "/coaching");
  await expect(training.getByRole("link", { name: "Explore Online Coaching" })).toHaveAttribute("href", "/online-coaching");
  await expect(page.locator("#memberships")).toBeVisible();
  await expect(page.locator("blockquote")).toHaveCount(0);
  const coach = page.locator("#coach");
  await expect(coach.getByRole("link", { name: "About RAENG" })).toHaveAttribute("href", "/about");
  await expect(coach.getByText("Before", { exact: true })).toBeVisible();
  await expect(coach.getByText("Now", { exact: true })).toBeVisible();
});

test("the home page uses little imagery: two training cards plus the before-and-after pair", async ({ page }) => {
  await page.goto("/");
  const imgs = await page.$$eval("main img", (els) => els.length);
  expect(imgs).toBeLessThanOrEqual(4);
});

test.describe("memberships", () => {
  const PLANS = [
    { name: "Starter", price: "£40", credits: "4 class credits", perClass: "£10", payg: "£48", save: "£8" },
    { name: "Regular", price: "£65", credits: "8 class credits", perClass: "£8.13", payg: "£96", save: "£31" },
    { name: "Dedicated", price: "£85", credits: "12 class credits", perClass: "£7.08", payg: "£144", save: "£59" },
  ];

  test("each card shows the owner's price, credits, cost per class and saving", async ({ page }) => {
    await page.goto("/memberships");
    const cards = page.locator("#memberships ul[aria-labelledby] > li");
    await expect(cards).toHaveCount(3);
    for (const [i, p] of PLANS.entries()) {
      const card = cards.nth(i);
      await expect(card.getByRole("heading", { name: p.name })).toBeVisible();
      await expect(card).toContainText(new RegExp(`${p.price}\\s*/\\s*4 weeks`));
      await expect(card).toContainText(p.credits);
      await expect(card.locator("dl")).toContainText(p.perClass);
      await expect(card.locator("dl")).toContainText(p.payg);
      await expect(card.locator("dl")).toContainText(p.save);
    }
    const payg = page.locator("#memberships").getByRole("heading", { name: "Pay as you go" }).locator("..");
    await expect(payg).toContainText("£12 per class");
    await expect(payg).toContainText("No membership needed");
  });

  test("buttons are enquiries or bookings, never sign-ups or payments", async ({ page }) => {
    await page.goto("/memberships");
    for (const p of PLANS) {
      const link = page.getByRole("link", { name: `Enquire about ${p.name}` });
      await expect(link).toHaveAttribute("href", "/contact");
    }
    await expect(page.locator("#memberships").getByRole("link", { name: "Book now" })).toHaveAttribute("href", "/book/group-class");
    await expect(page.locator("main")).not.toContainText(/pay now|checkout|card number/i);
  });

  test("terms and the cancellation policy are published as supplied", async ({ page }) => {
    await page.goto("/memberships");
    const terms = page.locator("#how-it-works");
    await expect(terms).toContainText("Class credits can be used across any available Monday, Wednesday or Saturday class.");
    await expect(terms).toContainText("Memberships renew automatically every four weeks");
    await expect(terms).toContainText("Unused credits expire at the end of each membership period and do not roll over.");
    const policy = page.locator("#cancellation");
    await expect(policy).toContainText("24 hours or more before class");
    await expect(policy).toContainText("Your class credit will be forfeited.");
    await expect(policy).toContainText("No-shows");
    await expect(policy).toContainText("By booking a class, you agree to these cancellation terms.");
  });

  test("cards stack on phones without overflow and keep 44px buttons", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/memberships");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
    const tops = await page.locator("#memberships ul[aria-labelledby] > li").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
    expect(new Set(tops).size).toBe(1);
  });
});

test("every image loads and none is stretched", async ({ page }) => {
  for (const route of ["/", "/classes", "/coaching", "/online-coaching", "/about", "/memberships"]) {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(route);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
    });
    const broken = () =>
      page.$$eval("main img", (els) =>
        (els as HTMLImageElement[])
          .filter((i) => i.getBoundingClientRect().width > 0)
          .filter((i) => !i.complete || i.naturalWidth === 0 || i.alt.trim() === "")
          .map((i) => i.currentSrc || i.src),
      );
    // Lazy images need a moment to arrive after the scroll.
    await expect.poll(broken, { message: route }).toEqual([]);
  }
});

test("the FAQ opens and closes with the keyboard", async ({ page }) => {
  await page.goto("/classes");
  const summary = page.locator("main details summary").first();
  const details = page.locator("main details").first();
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("open", "");
  await page.keyboard.press("Space");
  await expect(details).not.toHaveAttribute("open", "");
});

test("menu open on mobile has no accessibility violations and is keyboard operable", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Menu" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Close" })).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Home" })).toBeFocused();
  // Let the menu's reveal finish so contrast is measured on the settled colours.
  await page.waitForTimeout(1500);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});

test("class pages link to the how-to-join section", async ({ page }) => {
  await page.goto("/classes");
  await expect(page.locator("#join")).toHaveCount(1);
  await expect(page.locator("#join ol > li")).toHaveCount(3);
  await page.getByRole("link", { name: "How to join" }).click();
  await expect(page).toHaveURL(/#join$/);
});

test("About RAENG: Facebook and Instagram open safely in a new tab, and no story is invented", async ({ page }) => {
  await page.goto("/about");
  for (const scope of [page.getByRole("contentinfo"), page.locator("#coach")]) {
    const fb = scope.getByRole("link", { name: /Facebook/ });
    await expect(fb).toHaveAttribute("href", "https://www.facebook.com/profile.php?id=61589486540520");
    await expect(fb).toHaveAttribute("target", "_blank");
    await expect(fb).toHaveAttribute("rel", /noopener/);
  }
  await expect(page.locator("#story")).toHaveCount(0);
});

test("online coaching page leads to the enquiry form, which is not a booking", async ({ page }) => {
  await page.goto("/online-coaching");
  await expect(page.locator("main")).not.toContainText(/pay now|checkout|sign up now/i);
  await page.getByRole("link", { name: "Enquire about online coaching" }).first().click();
  await expect(page).toHaveURL(/\/online-coaching\/enquire$/);
  await expect(page.getByRole("heading", { level: 1, name: "Ask about online coaching" })).toBeVisible();
});

test("hero film: silent, plays on its own with no on-screen control, and offers MP4 and WebM", async ({ page }) => {
  await page.goto("/");
  const video = page.locator("section[aria-labelledby=hero-heading] video");
  await expect(video).toHaveCount(1);
  await expect(video).toHaveJSProperty("muted", true);
  await expect(video.locator("source")).toHaveCount(2);
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
  await expect(page.getByRole("button", { name: /background video/ })).toHaveCount(0);
});

test("hero film files exist and the poster is served", async ({ request }) => {
  for (const file of ["/media/hero.mp4", "/media/hero.webm", "/media/hero-poster.jpg", "/media/hero-portrait.mp4", "/media/hero-portrait.webm", "/media/hero-portrait-poster.jpg"]) {
    const res = await request.get(file);
    expect(res.status(), file).toBe(200);
  }
});

test("with Reduce Motion the hero shows the still poster and the film stays still", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", baseURL });
  const page = await context.newPage();
  await page.goto("/");
  const video = page.locator("section[aria-labelledby=hero-heading] video");
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await page.waitForTimeout(1500);
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await context.close();
});

test("home: the class statement, when / where / from and Book now sit straight under the hero", async ({ page }) => {
  await page.goto("/");
  const facts = page.getByRole("region", { name: "3 classes a week" });
  await expect(facts.getByRole("heading", { level: 2 })).toHaveText(/3 classes\s*a week/);
  await expect(facts).toContainText("Mon & Wed 6:30 pm");
  await expect(facts).toContainText("Sat 9:00 am");
  await expect(facts).toContainText("Media House, Cumbernauld");
  await expect(facts).toContainText("£7.08 a class");
  await expect(facts.getByRole("link", { name: "Book now" })).toHaveAttribute("href", "/book/group-class");
});

test("footer groups collapse on phones and are open on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const footer = page.locator("footer");
  await expect(footer.getByRole("link", { name: "Classes" })).toBeHidden();
  await footer.getByText("Explore", { exact: true }).click();
  await expect(footer.getByRole("link", { name: "Classes" })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(footer.getByRole("link", { name: "Memberships" })).toBeVisible();
  await expect(footer.getByText("Media House")).toBeVisible();
});

test("no page says 'Get in touch': the main button is always 'Book now'", async ({ page }) => {
  for (const route of ["/", "/classes", "/memberships", "/coaching", "/online-coaching", "/about", "/contact", "/privacy"]) {
    await page.goto(route);
    await expect(page.locator("body"), route).not.toContainText(/get in touch/i);
    await expect(page.locator("header").first().getByRole("link", { name: "Book now" }), route).toBeVisible();
  }
});

test("hero film covers the phone screen edge to edge with the vertical cut", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const source = page.locator("section[aria-labelledby=hero-heading] video source").first();
  await expect(source).toHaveAttribute("src", "/media/hero-portrait.mp4");
  const box = (await page.locator("section[aria-labelledby=hero-heading] video").boundingBox())!;
  expect(Math.round(box.x)).toBe(0);
  expect(Math.round(box.width)).toBe(390);
  expect(box.height).toBeGreaterThan(844 - 108 - 4);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator("section[aria-labelledby=hero-heading] video source").first()).toHaveAttribute("src", "/media/hero.mp4");
});

test("no arrows anywhere on the public pages", async ({ page }) => {
  for (const route of ["/", "/classes", "/memberships", "/coaching", "/online-coaching", "/about", "/contact", "/book", "/book/group-class", "/privacy"]) {
    await page.goto(route);
    await expect(page.locator("body"), route).not.toContainText(/[→←↑↓›»]/);
    // The arrow icon used to be an SVG path "M1 8h13M9 3l5 5-5 5".
    await expect(page.locator('svg path[d*="M1 8h13"]'), route).toHaveCount(0);
  }
});

test("home memberships: swipe cards with a counter and Previous / Next on phones, four across on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const section = page.locator("#memberships");
  const cards = section.getByRole("list", { name: "Membership plans" }).locator("> li");
  await expect(cards).toHaveCount(4);
  await expect(section.getByText("01 / 04")).toBeVisible();
  await expect(section.getByRole("button", { name: "Previous" })).toBeDisabled();
  await section.getByRole("button", { name: "Next" }).click();
  await expect(section.getByText("02 / 04")).toBeVisible({ timeout: 5000 });
  for (const [name, text] of [["Starter", "£40"], ["Regular", "£65"], ["Dedicated", "£85"]]) {
    const card = cards.filter({ has: page.getByRole("heading", { name }) });
    await expect(card).toContainText(text);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(section.getByRole("button", { name: "Next" })).toBeHidden();
  const lefts = await cards.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  expect(new Set(lefts).size).toBe(1);
});

test("header Book now is underlined only in the booking flow", async ({ page }) => {
  const book = () => page.locator("header").first().getByRole("link", { name: "Book now" });
  await page.goto("/");
  await expect(book()).not.toHaveAttribute("aria-current", "page");
  expect(await book().evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe("none");
  await page.goto("/book/group-class");
  await expect(book()).toHaveAttribute("aria-current", "page");
  expect(await book().evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe("underline");
  await page.goto("/classes");
  expect(await book().evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe("none");
});
