import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { demoAvailability } from "../../src/lib/availability/demo";
import { formatLongDate, toDateKey } from "../../src/lib/availability/dates";
import { dayStatus } from "../../src/lib/availability/types";

/**
 * Booking and online coaching journeys.
 * - Main server (baseURL): booking demo mode on, email wired to the mock.
 * - Production server: VERCEL_ENV=production with BOOKING_DEMO and
 *   CONTENT_PREVIEW set by mistake; both must be ignored.
 */
const PROD = `http://localhost:${process.env.E2E_PRODUCTION_PORT ?? 3201}`;
const MOCK = `http://localhost:${process.env.MOCK_EMAIL_PORT ?? 3299}`;

interface RecordedEmail {
  headers: { authorization?: string; idempotencyKey?: string };
  payload: { from: string; to: string[]; reply_to: string; subject: string; text: string };
}

async function emails(request: APIRequestContext): Promise<RecordedEmail[]> {
  return (await (await request.get(`${MOCK}/requests`)).json()) as RecordedEmail[];
}

const continueButton = (page: Page) => page.getByRole("button", { name: "Continue" });

/** Ticks a styled radio/checkbox tile by its visible text. */
async function choose(page: Page, label: string) {
  await page.locator("label").filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) }).first().click();
}

/** Clicks a calendar date the way a visitor does: on its cell. */
async function pickDate(page: Page, label: string) {
  const input = page.getByLabel(label);
  await page.locator("label").filter({ has: input }).click();
  await expect(input).toBeChecked();
}

/** The first demo date with a free slot, and the available dates shown in its month (the calendar opens there). */
function firstAvailable(service: "group-class" | "one-to-one") {
  const window = demoAvailability(service, toDateKey(new Date()));
  const day = window.days.find((d) => dayStatus(d) === "available")!;
  const shown = window.days.filter((d) => dayStatus(d) === "available" && d.date.slice(0, 7) === day.date.slice(0, 7));
  return { window, day, shown, slot: day.slots.find((s) => s.available)! };
}

test.describe("booking prototype (demo availability)", () => {
  test("/book → group class → sample date → clearly labelled prototype outcome", async ({ page, request }) => {
    // The flow is no longer linked from public pages (bookings go via /contact); open it directly.
    await page.goto("/book");
    await expect(page.getByRole("note", { name: "Demonstration" })).toContainText("Prototype booking page");

    // Step 1: nothing chosen → can't continue.
    await expect(continueButton(page)).toBeDisabled();
    await expect(page.getByText("Choose a service to continue.")).toBeVisible();
    await choose(page, "Group class");
    await continueButton(page).click();

    // Step 2: labelled sample availability; full and empty dates can't be chosen.
    await expect(page.getByRole("heading", { name: "Choose a class" })).toBeFocused();
    await expect(page.getByText("Sample availability, not Alex's real timetable")).toBeVisible();
    const { day, shown, slot } = firstAvailable("group-class");
    await expect(page.locator('[data-status="available"]')).toHaveCount(shown.length);
    // Fully booked and session-free dates can't be chosen.
    for (const input of await page.locator('[data-status="full"] input, [data-status="none"] input').all()) {
      await expect(input).toBeDisabled();
    }
    await expect(continueButton(page)).toBeDisabled();
    await pickDate(page, `${formatLongDate(day.date)}, available`);
    await expect(continueButton(page)).toBeDisabled();
    await page.locator("#times label").filter({ hasNotText: "Full" }).first().click();
    await expect(page.getByRole("complementary", { name: "Your selection (demonstration)" })).toContainText("Group class");
    await continueButton(page).click();

    // Step 3: validation, then the demo outcome.
    await expect(page.getByRole("heading", { name: "Your details" })).toBeFocused();
    await page.getByRole("button", { name: "Finish demo" }).click();
    await expect(page.getByText("Enter your name.")).toBeVisible();
    await expect(page.getByText("Enter your email address so Alex can reply.")).toBeVisible();
    await expect(page.locator("#experience")).toBeFocused();
    await choose(page, "I've trained with Alex before");
    await page.getByRole("textbox", { name: "Name" }).fill("Demo Visitor");
    await page.getByRole("textbox", { name: "Email" }).fill("not-an-email");
    await page.getByRole("button", { name: "Finish demo" }).click();
    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await page.getByRole("textbox", { name: "Email" }).fill("demo@example.com");
    await page.getByRole("button", { name: "Finish demo" }).click();

    const outcome = page.getByRole("status");
    await expect(outcome).toContainText("Demonstration complete");
    await expect(outcome).toContainText("No booking has been made");
    await expect(outcome).toContainText(formatLongDate(day.date));
    await expect(page.getByText(/booking (is )?confirmed/i)).toHaveCount(0);
    expect(slot.available).toBe(true);
    // Nothing is sent for demonstration selections.
    expect((await emails(request)).some((e) => e.payload.text.includes("Demo Visitor"))).toBe(false);
  });

  test("one-to-one starts at its own availability, different from classes", async ({ page }) => {
    await page.goto("/book/one-to-one");
    await expect(page.getByRole("heading", { name: "Choose a date and time" })).toBeVisible();
    const { window, shown } = firstAvailable("one-to-one");
    await expect(page.locator('[data-status="available"]')).toHaveCount(shown.length);
    const group = firstAvailable("group-class").window.days.map((d) => d.date);
    expect(window.days.map((d) => d.date)).not.toEqual(group);

    // Taken one-to-one times show as full and can't be chosen.
    const withTaken = shown.find((d) => d.slots.some((s) => !s.available));
    if (withTaken) {
      await pickDate(page, `${formatLongDate(withTaken.date)}, available`);
      await expect(page.locator("#times label").filter({ hasText: "Full" }).locator("input")).toBeDisabled();
    }
  });

  test("back, stepper and summary edits keep or reset choices sensibly", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/book/group-class");
    const { day } = firstAvailable("group-class");
    await pickDate(page, `${formatLongDate(day.date)}, available`);
    await page.locator("#times label").filter({ hasNotText: "Full" }).first().click();
    await continueButton(page).click();
    await page.getByRole("textbox", { name: "Name" }).fill("Kept Name");

    // Back keeps the chosen date and time.
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByLabel(`${formatLongDate(day.date)}, available`)).toBeChecked();
    await continueButton(page).click();
    await expect(page.getByRole("textbox", { name: "Name" })).toHaveValue("Kept Name");

    // Changing the service from the summary clears the old date.
    const summary = page.getByRole("complementary", { name: "Your selection (demonstration)" });
    await summary.getByRole("button", { name: "Change service" }).click();
    await expect(page.getByRole("heading", { name: "Choose a service" })).toBeFocused();
    await choose(page, "One-to-one");
    await continueButton(page).click();
    await expect(summary).toContainText("One-to-one");
    await expect(summary.getByText("Not chosen yet")).toBeVisible();

    // Completed steps in the stepper can be revisited.
    await page.getByRole("navigation", { name: "Booking steps" }).getByRole("button", { name: /Service/ }).click();
    await expect(page.getByRole("heading", { name: "Choose a service" })).toBeVisible();
  });

  test("works from the keyboard with visible focus", async ({ page }) => {
    await page.goto("/book");
    await page.locator("#service").focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("radio", { name: /One-to-one/ })).toBeChecked();
    const tile = page.locator("label").filter({ has: page.getByRole("radio", { name: /One-to-one/ }) });
    expect(await tile.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("solid");
    await continueButton(page).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Choose a date and time" })).toBeFocused();

    // Arrow keys move between dates that can be chosen.
    const dates = page.locator('input[name="date"]:not([disabled])');
    await dates.first().focus();
    await page.keyboard.press("Space");
    await expect(dates.first()).toBeChecked();
    await page.keyboard.press("ArrowRight");
    await expect(dates.nth(1)).toBeChecked();
  });

  test("step changes are not animated for reduced-motion users", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/book");
    await choose(page, "Group class");
    await continueButton(page).click();
    const duration = await page.locator(".animate-step-in").first().evaluate((el) => getComputedStyle(el).animationDuration);
    expect(parseFloat(duration)).toBeLessThan(0.001);
  });

  for (const width of [320, 360, 390, 768, 1024, 1366, 1440]) {
    test(`calendar and summary fit without overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/book/group-class");
      await expect(page.getByTestId("calendar-grid")).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      const offscreen = await page.$$eval("main a, main button, main label", (els) =>
        els.filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1).length,
      );
      expect(offscreen).toBe(0);
      // Calendar dates are tall enough to tap.
      const cell = await page.locator('[data-status="available"]').first().boundingBox();
      expect(cell!.height).toBeGreaterThanOrEqual(44);
      // The next step stays in reach on phones.
      if (width < 1024) await expect(continueButton(page)).toBeInViewport();
    });
  }

  test("the calendar step has no accessibility violations", async ({ page }) => {
    await page.goto("/book/group-class");
    await expect(page.getByTestId("calendar-grid")).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

test.describe("online coaching onboarding", () => {
  test("site navigation → tailored questions → review → sent to Alex", async ({ page, request }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Footer" }).getByRole("link", { name: "Online coaching" }).click();
    await expect(page).toHaveURL(/\/online-coaching$/);
    await expect(page.getByRole("radio", { name: /Get stronger/ })).toBeVisible();
    // Not a calendar booking.
    await expect(page.getByTestId("calendar-grid")).toHaveCount(0);

    // Progressive disclosure: "Something else" asks for detail.
    await expect(continueButton(page)).toBeDisabled();
    await choose(page, "Something else");
    await expect(continueButton(page)).toBeDisabled();
    await page.getByLabel("Tell Alex what you'd like to achieve").fill("Prepare for a kettlebell sport event");
    await continueButton(page).click();

    await expect(page.getByRole("heading", { name: "Your training" })).toBeFocused();
    await choose(page, "Some experience");
    await continueButton(page).click();

    // Phone is only asked for when chosen, and then required.
    await expect(page.getByRole("textbox", { name: "Phone" })).toHaveCount(0);
    await page.getByRole("textbox", { name: "Name" }).fill("Online Tester");
    await page.getByRole("textbox", { name: "Email" }).fill("online@example.com");
    await choose(page, "Phone");
    await page.getByRole("button", { name: "Review" }).click();
    await expect(page.getByText("Enter your phone number.")).toBeVisible();
    await page.getByRole("textbox", { name: "Phone" }).fill("07700 900123");
    await page.getByRole("button", { name: "Review" }).click();

    await expect(page.getByRole("heading", { name: "Review and send" })).toBeFocused();
    await expect(page.getByText("Prepare for a kettlebell sport event")).toBeVisible();
    // Edit an answer and come back.
    await page.getByRole("button", { name: "Edit training" }).click();
    await choose(page, "I train with kettlebells regularly");
    await continueButton(page).click();
    await page.getByRole("button", { name: "Review" }).click();
    await expect(page.getByText("I train with kettlebells regularly")).toBeVisible();

    await page.waitForTimeout(3100);
    await page.getByRole("button", { name: "Send to Alex" }).click();
    await expect(page.getByRole("status")).toContainText("Alex will reply personally");

    const sent = (await emails(request)).find((e) => e.payload.subject === "Online coaching enquiry: Online Tester");
    expect(sent).toBeDefined();
    expect(sent!.payload.reply_to).toBe("online@example.com");
    expect(sent!.payload.text).toContain("Main goal: Something else: Prepare for a kettlebell sport event");
    expect(sent!.payload.text).toContain("Prefers contact by: Phone (07700 900123)");
  });

  test("an email-service failure is reported, never shown as sent", async ({ page }) => {
    await page.goto("/online-coaching");
    await choose(page, "Get stronger");
    await continueButton(page).click();
    await choose(page, "New to kettlebells");
    await continueButton(page).click();
    await page.getByRole("textbox", { name: "Name" }).fill("FAIL-TEST Online");
    await page.getByRole("textbox", { name: "Email" }).fill("fail@example.com");
    await page.getByRole("button", { name: "Review" }).click();
    await page.waitForTimeout(3100);
    await page.getByRole("button", { name: "Send to Alex" }).click();
    await expect(page.locator("main [role=alert]")).toContainText("couldn't be sent");
    await expect(page.getByText("Enquiry sent")).toHaveCount(0);
  });
});

test.describe("production configuration", () => {
  for (const path of ["/", "/book", "/book/group-class", "/book/one-to-one", "/online-coaching", "/classes"]) {
    test(`${path} shows no demonstration availability or provisional content`, async ({ page }) => {
      await page.goto(PROD + path);
      await page.waitForLoadState("networkidle");
      const text = await page.locator("body").innerText();
      expect(text).not.toMatch(/\bdemo\b|demonstration|sample availability|prototype/i);
      expect(text).not.toMatch(/awaiting confirmation/i);
      await expect(page.getByTestId("calendar-grid")).toHaveCount(0);
    });
  }

  test("a group class request is emailed to Alex as a request, not a booking", async ({ page, request }) => {
    await page.goto(`${PROD}/book/group-class`);
    await expect(page.getByRole("heading", { name: "When suits you?" })).toBeVisible();
    // The confirmed weekly class times are offered as choices.
    await expect(page.getByText("Choose the class you'd like to join")).toBeVisible();
    await expect(continueButton(page)).toBeDisabled();
    for (const time of ["Monday 6:30 pm", "Wednesday 6:30 pm", "Saturday 9:00 am"]) {
      await expect(page.getByRole("radio", { name: time })).toBeVisible();
    }
    await choose(page, "Wednesday 6:30 pm");
    await continueButton(page).click();

    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText("Choose the option that best describes you.")).toBeVisible();
    await choose(page, "New to kettlebells");
    await page.getByRole("textbox", { name: "Name" }).fill("Prod Booker");
    await page.getByRole("textbox", { name: "Email" }).fill("prod@example.com");
    await page.getByRole("button", { name: /add a note/i }).click();
    await page.getByLabel(/^Note/).fill("First class");
    await page.waitForTimeout(3100);
    await page.getByRole("button", { name: "Send request" }).click();

    const status = page.getByRole("status");
    await expect(status).toContainText("Request sent");
    await expect(status).toContainText("prod@example.com");
    await expect(status).toContainText("booked once he confirms");

    const sent = (await emails(request)).find((e) => e.payload.subject === "Group class booking request: Prod Booker");
    expect(sent).toBeDefined();
    expect(sent!.payload.to).toEqual(["alex-e2e@example.com"]);
    expect(sent!.payload.text).toContain("Class: Wednesday 6:30 pm");
    expect(sent!.payload.text).toContain("not a confirmed booking");
    expect(sent!.headers.idempotencyKey).toMatch(/^booking-request\/[0-9a-f]{64}$/);
  });

  test("an email-service failure shows an error, not success", async ({ page }) => {
    await page.goto(`${PROD}/book/one-to-one`);
    await choose(page, "Mon");
    await continueButton(page).click();
    await choose(page, "I've trained with Alex before");
    await page.getByRole("textbox", { name: "Name" }).fill("FAIL-TEST Booker");
    await page.getByRole("textbox", { name: "Email" }).fill("fail@example.com");
    await page.waitForTimeout(3100);
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.locator("main [role=alert]")).toContainText("couldn't be sent");
    await expect(page.getByText("Request sent")).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Name" })).toHaveValue("FAIL-TEST Booker");
  });

  test("a bot-speed submission is rejected without claiming success", async ({ page, request }) => {
    await page.goto(`${PROD}/book/one-to-one`);
    await choose(page, "Tue");
    await continueButton(page).click();
    await choose(page, "New to kettlebells");
    await page.getByRole("textbox", { name: "Name" }).fill("Speedy Bot");
    await page.getByRole("textbox", { name: "Email" }).fill("bot@example.com");
    await page.locator('input[name="startedAt"]').evaluate((el: HTMLInputElement) => (el.value = String(Date.now())));
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.locator("main [role=alert]")).toContainText("Please wait a few seconds");
    await expect(page.getByText("Request sent")).toHaveCount(0);
    expect((await emails(request)).some((e) => e.payload.subject.includes("Speedy Bot"))).toBe(false);
  });

  test("the server refuses demonstration selections even if posted directly", async ({ page }) => {
    // Posting a demo slot id through the real form must never become a request.
    await page.goto(`${PROD}/book/one-to-one`);
    await choose(page, "Thu");
    await continueButton(page).click();
    await choose(page, "New to kettlebells");
    await page.getByRole("textbox", { name: "Name" }).fill("Slot Poster");
    await page.getByRole("textbox", { name: "Email" }).fill("slot@example.com");
    await page.locator("form").evaluate((form) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "slot";
      input.value = "demo-one-to-one-2026-10-20-07:00";
      form.appendChild(input);
    });
    await page.waitForTimeout(3100);
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.locator("main [role=alert]")).toContainText("Demonstration times can't be booked");
  });

  test("the demonstration data is downloaded only in demo mode", async ({ browser }) => {
    // The demo pattern's class time (19:00) appears nowhere else in the site's code.
    const loadsDemo = async (url: string) => {
      const page = await browser.newPage();
      const bodies: Promise<string>[] = [];
      page.on("response", (res) => {
        if (res.url().endsWith(".js")) bodies.push(res.text().catch(() => ""));
      });
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      const found = (await Promise.all(bodies)).some((b) => b.includes('"19:00"'));
      await page.close();
      return found;
    };
    expect(await loadsDemo("http://localhost:" + (process.env.E2E_PORT ?? 3200) + "/book/group-class")).toBe(true);
    expect(await loadsDemo(`${PROD}/book/group-class`)).toBe(false);
  });
});
