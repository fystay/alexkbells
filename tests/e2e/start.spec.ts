import { expect, test, type Page } from "@playwright/test";

/** The hero's "Start your training" swipe button on a phone. */
async function heroButton(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const link = page.locator("main").getByRole("link", { name: "Start your training" }).first();
  await expect(link).toHaveAttribute("href", "/book");
  // Wait for hydration: the swipe handle only responds once React is running.
  await page.waitForLoadState("networkidle");
  return link;
}

async function drag(page: Page, link: import("@playwright/test").Locator, distance: number) {
  const box = (await link.boundingBox())!;
  const x = box.x + 28;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + distance, y, { steps: 10 });
  await page.mouse.up();
}

test("swiping Start your training plays the intro, then opens the booking page", async ({ page }) => {
  const link = await heroButton(page);
  await drag(page, link, 400);
  const intro = page.getByRole("dialog", { name: "Opening the booking page" });
  await expect(intro).toBeVisible();
  await expect(intro).toContainText("1% better, every day.");
  await expect(intro.getByRole("button", { name: "Skip" })).toBeFocused();
  await page.waitForURL(/\/book$/, { timeout: 8000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/book your session/i);
  await expect(intro).toHaveCount(0);
});

test("a short swipe springs back and goes nowhere", async ({ page }) => {
  const link = await heroButton(page);
  await drag(page, link, 80);
  await page.waitForTimeout(600);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("tapping or pressing Enter works too, and Skip goes straight to booking", async ({ page }) => {
  const link = await heroButton(page);
  await link.focus();
  await page.keyboard.press("Enter");
  const intro = page.getByRole("dialog", { name: "Opening the booking page" });
  await expect(intro).toBeVisible();
  await intro.getByRole("button", { name: "Skip" }).click();
  await page.waitForURL(/\/book$/, { timeout: 3000 });
});

test("with reduced motion there is no intro", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const link = await heroButton(page);
  await link.click();
  await page.waitForURL(/\/book$/, { timeout: 3000 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("without JavaScript it is a plain link to the booking page", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/");
  await page.locator("main").getByRole("link", { name: "Start your training" }).first().click();
  await expect(page).toHaveURL(/\/book$/);
  await context.close();
});
