import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Member accounts (2026-10-26) on the production configuration: one-time
 * email links, the account page, booking and cancelling with credits,
 * signing out. The member is seeded straight into the stand-in database.
 */
const PROD = `http://localhost:${process.env.E2E_PRODUCTION_PORT ?? 3201}`;
const MOCK = `http://localhost:${process.env.MOCK_EMAIL_PORT ?? 3299}`;
const SUPABASE = `http://localhost:${process.env.MOCK_SUPABASE_PORT ?? 3298}`;

interface RecordedEmail {
  payload: { to: string[]; reply_to: string; subject: string; text: string };
}

async function sql(request: APIRequestContext, query: string, params: unknown[] = []) {
  const response = await request.post(`${SUPABASE}/test/sql`, { data: { sql: query, params } });
  expect(response.ok(), await response.text()).toBe(true);
  return response.json();
}

async function emailsTo(request: APIRequestContext, to: string): Promise<RecordedEmail[]> {
  const all = (await (await request.get(`${MOCK}/requests`)).json()) as RecordedEmail[];
  return all.filter((e) => e.payload.to.includes(to));
}

/** A client with a Regular membership starting today. */
async function seedMember(request: APIRequestContext, email: string) {
  const [client] = await sql(request, "insert into akb_clients (full_name, email, status) values ($1, $2, 'active') returning id", ["Member Tester", email]);
  await sql(request, "select akb_start_membership($1, 'regular', 'Regular', 6500, 8, akb_london_today())", [client.id]);
}

async function askForLink(page: Page, email: string) {
  await page.goto(`${PROD}/account/sign-in`);
  await page.getByRole("textbox", { name: "Your email" }).fill(email);
  await page.waitForTimeout(3100);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("status")).toContainText("Check your email");
}

function linkPath(email: RecordedEmail): string {
  const url = /https?:\/\/\S+\/account\/confirm\?token=[A-Za-z0-9_-]{43}/.exec(email.payload.text)?.[0];
  expect(url).toBeDefined();
  return new URL(url!).pathname + new URL(url!).search;
}

test.describe("member accounts", () => {
  test("a member signs in with an emailed link, books and cancels with credits, and signs out", async ({ page, request }) => {
    const email = `member-${Date.now()}@example.com`;
    await seedMember(request, email);

    // Signed out, the account page sends you to sign in.
    await page.goto(`${PROD}/account`);
    await expect(page).toHaveURL(/\/account\/sign-in$/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    await askForLink(page, email);
    const sent = await emailsTo(request, email);
    expect(sent).toHaveLength(1);
    expect(sent[0].payload.subject).toBe("Your RAENG sign-in link");
    expect(sent[0].payload.text).toContain("It works once, for the next 15 minutes.");
    const path = linkPath(sent[0]);

    // Opening the link doesn't sign in on its own (email scanners open links): the button does.
    await page.goto(PROD + path);
    await expect(page.getByRole("heading", { level: 1, name: "Sign in." })).toBeVisible();
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole("heading", { level: 1, name: "Your membership." })).toBeVisible();
    await expect(page.getByText("Regular · £65 / 4 weeks")).toBeVisible();
    await expect(page.getByText("left of 8")).toBeVisible();
    await expect(page.getByText("No classes booked yet.")).toBeVisible();

    // The session cookie: httpOnly, only for /account.
    const cookie = (await page.context().cookies(PROD + "/account")).find((c) => c.name === "akb_member_session");
    expect(cookie).toMatchObject({ httpOnly: true, path: "/account", sameSite: "Lax" });

    // Book the furthest class this period (more than 24 hours away), with a credit.
    const options = page.locator("li").filter({ has: page.getByRole("button", { name: /^Book / }) });
    const label = (await options.last().locator("span").first().innerText()).trim();
    await options.last().getByRole("button", { name: /^Book / }).click();
    await expect(page.getByRole("status")).toHaveText("Booked. One credit used.");
    await expect(page.locator("span.tabular-nums").first()).toHaveText("7");
    const booked = page.locator("li").filter({ hasText: label }).filter({ has: page.getByRole("button", { name: /^Cancel/ }) });
    await expect(booked).toBeVisible();
    await expect(booked).toContainText("Your credit comes back.");

    // Cancel it in time: the credit comes back.
    await booked.getByRole("button", { name: /^Cancel/ }).click();
    await expect(page.getByRole("status")).toHaveText("Cancelled. Your credit is back.");
    await expect(page.locator("span.tabular-nums").first()).toHaveText("8");

    // The account page passes an accessibility scan.
    await page.waitForTimeout(1300);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    // The link works once only.
    await page.goto(PROD + path);
    await page.getByRole("button", { name: "Sign in" }).click();
    // Still signed in from before, so the sign-in page sends them back to the account; sign out first to see the message.
    await page.goto(`${PROD}/account`);
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/account\/sign-in\?signed=out$/);
    await expect(page.getByRole("status")).toHaveText("You're signed out.");
    await page.goto(`${PROD}/account`);
    await expect(page).toHaveURL(/\/account\/sign-in$/);
    await page.goto(PROD + path);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/link=invalid/);
    await expect(page.getByRole("status")).toContainText("expired or has already been used");
  });

  test("an address that isn't a member's gets the same answer and no email", async ({ page, request }) => {
    const email = `not-a-member-${Date.now()}@example.com`;
    await askForLink(page, email);
    await expect(page.getByRole("status")).toContainText(`If ${email} is a member's email`);
    expect(await emailsTo(request, email)).toHaveLength(0);
  });

  test("a made-up or broken link signs nobody in", async ({ page }) => {
    await page.goto(`${PROD}/account/confirm?token=nope`);
    await expect(page.getByRole("heading", { level: 1, name: "Link not valid." })).toBeVisible();
    await page.goto(`${PROD}/account/confirm?token=${"A".repeat(43)}`);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/link=invalid/);
  });

  test("the menu and footer link to member sign-in, and robots keep /account out", async ({ page, request }) => {
    await page.goto(PROD);
    await expect(page.locator("footer").getByRole("link", { name: "Member sign-in" })).toHaveAttribute("href", "/account/sign-in");
    const robots = await (await request.get(`${PROD}/robots.txt`)).text();
    expect(robots).toContain("Disallow: /account");
    const sitemap = await (await request.get(`${PROD}/sitemap.xml`)).text();
    expect(sitemap).not.toContain("/account");
  });
});
