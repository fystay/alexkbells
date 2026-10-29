import { expect, test, type Page } from "@playwright/test";

/** The hero's "Book a class" button on a phone (Alex's mockup, 2026-10-29): a plain link, no swipe and no intro screen. */
async function heroButton(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const link = page.locator("main").getByRole("link", { name: "Book a class" }).first();
  await expect(link).toHaveAttribute("href", "/book/group-class");
  return link;
}

test("tapping Book a class opens the booking page straight away", async ({ page }) => {
  const link = await heroButton(page);
  const box = (await link.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(48);
  expect(await link.getAttribute("draggable")).toBeNull();
  await link.tap().catch(() => link.click());
  await page.waitForURL(/\/book\/group-class$/, { timeout: 3000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/book/i);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("pressing Enter on it goes straight to booking too", async ({ page }) => {
  const link = await heroButton(page);
  await page.waitForLoadState("networkidle");
  await link.focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/book\/group-class$/, { timeout: 3000 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("every booking button on the pages is a plain link with no intro or swipe hint", async ({ page }) => {
  for (const path of ["/", "/classes", "/coaching"]) {
    await page.goto(path);
    const links = page.locator("main").getByRole("link", { name: /^Book (now|a class)/ });
    expect(await links.count(), path).toBeGreaterThan(0);
    for (const link of await links.all()) {
      await expect(link, path).not.toContainText("›››");
      expect(await link.getAttribute("href"), path).toMatch(/^\/(book|online-coaching|contact)/);
    }
  }
});

test("without JavaScript it is a plain link to the booking page", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/");
  await page.locator("main").getByRole("link", { name: "Book a class" }).first().click();
  await expect(page).toHaveURL(/\/book\/group-class$/);
  await context.close();
});
