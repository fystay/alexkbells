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

    // The session cookie: httpOnly, site-wide since 2026-10-28 (the booking form fills in details).
    const cookie = (await page.context().cookies(PROD + "/")).find((c) => c.name === "akb_member_session");
    expect(cookie).toMatchObject({ httpOnly: true, path: "/", sameSite: "Lax" });

    // Book the furthest class this period (more than 24 hours away), with a credit.
    const options = page.locator("li").filter({ has: page.getByRole("button", { name: /^Book / }) });
    const label = (await options.last().locator("span").first().innerText()).trim();
    await options.last().getByRole("button", { name: /^Book / }).click();
    await expect(page.getByRole("status")).toHaveText("Booked. One credit used.");
    // The message stays, but the address goes back to /account (a refresh won't say it again).
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.locator("span.tabular-nums").first()).toHaveText("7");
    const booked = page.locator("li").filter({ hasText: label }).filter({ has: page.locator("summary", { hasText: "Cancel" }) });
    await expect(booked).toBeVisible();
    await expect(booked).toContainText("Just booked");
    await expect(booked).toContainText("Your credit comes back.");
    // It's the next class, with directions and the calendar.
    await expect(page.getByText("Your next class")).toBeVisible();
    await expect(page.getByRole("link", { name: /^Directions/ })).toHaveAttribute("href", /google\.com\/maps/);

    // Add to calendar: an .ics of this class, for this member only.
    const ics = await page.request.get(PROD + (await booked.getByRole("link", { name: /^Add to calendar/ }).getAttribute("href"))!);
    expect(ics.headers()["content-type"]).toContain("text/calendar");
    expect(await ics.text()).toMatch(/BEGIN:VEVENT[\s\S]*DTSTART:\d{8}T\d{6}Z[\s\S]*LOCATION:Media House/);
    expect((await request.get(`${PROD}/account/calendar?place=00000000-0000-0000-0000-000000000000`, { maxRedirects: 0 })).status()).toBe(307);

    // Cancel it in time: it asks first, then the credit comes back.
    await booked.locator("summary", { hasText: "Cancel" }).click();
    await booked.getByRole("button", { name: /^Cancel class/ }).click();
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

  test("an address with no account gets the same answer and no email", async ({ page, request }) => {
    const email = `not-a-member-${Date.now()}@example.com`;
    await askForLink(page, email);
    await expect(page.getByRole("status")).toContainText(`If ${email} has an account`);
    expect(await emailsTo(request, email)).toHaveLength(0);
  });

  test("pay as you go (2026-10-28): the paid booking is the account; cancel for a class credit, book with it, and the form fills in", async ({ page, request }) => {
    const email = `payg-${Date.now()}@example.com`;
    // A class booked and paid online 5 days from now (as Square's webhook would record it).
    const [booking] = await sql(
      request,
      `select akb_create_class_booking('Pay Go', $1, '07700 900123', 'mon-evening', akb_london_today() + 5,
         ((akb_london_today() + 5)::timestamp + time '18:30') at time zone 'Europe/London', 60, 1200, 'Group class', null, $2) as r`,
      [email, `e2e-${Date.now()}`],
    );
    // Not paid yet: no account, so no email.
    await askForLink(page, email);
    expect(await emailsTo(request, email)).toHaveLength(0);
    const chargeId = booking.r.charge_id as string;
    await sql(
      request,
      `select akb_record_payment((select client_id from akb_charges where id = $1), 'group', 1200, akb_london_today(), 'card', '', '', $2,
         jsonb_build_array(jsonb_build_object('charge_id', $1::uuid, 'amount_pence', 1200)))`,
      [chargeId, `e2e-pay-${Date.now()}`],
    );

    // Paid: the same email gets a link and signs in to "Your account".
    await askForLink(page, email);
    const sent = await emailsTo(request, email);
    expect(sent).toHaveLength(1);
    await page.goto(PROD + linkPath(sent[0]));
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Your account." })).toBeVisible();
    await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
    await expect(page.getByText("Pay as you go")).toBeVisible();
    const place = page.locator("li").filter({ hasText: "Paid" }).filter({ has: page.locator("summary", { hasText: "Cancel" }) });
    await expect(place).toContainText("You get a class credit for another class within 4 weeks.");

    // Cancel in time: a class credit, then book another class with it, nothing to pay.
    await place.locator("summary", { hasText: "Cancel" }).click();
    await place.getByRole("button", { name: /^Cancel class/ }).click();
    await expect(page.getByRole("status")).toHaveText("Cancelled. You have a class credit for another class within 4 weeks.");
    await expect(page.getByText("Class credits")).toBeVisible();
    const options = page.locator("li").filter({ has: page.getByRole("button", { name: /^Book / }) });
    await options.first().getByRole("button", { name: /^Book / }).click();
    await expect(page.getByRole("status")).toHaveText("Booked with your class credit. Nothing to pay.");
    await expect(page.getByRole("listitem").filter({ has: page.getByText("Class credit", { exact: true }) })).toHaveCount(1);
    await expect(page.getByText("Class credits")).toHaveCount(0);

    // The account page passes an accessibility scan.
    await page.waitForTimeout(1300);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    // Signed in, the booking form fills in their details.
    await page.goto(`${PROD}/book/group-class`);
    await page.evaluate(() => sessionStorage.clear());
    const response = await page.request.get(`${PROD}/api/account/details`);
    expect(await response.json()).toEqual({ name: "Pay Go", email, phone: "07700 900123" });
    // Signed out, the details API says nothing.
    const anon = await request.get(`${PROD}/api/account/details`);
    expect(await anon.json()).toEqual({});
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
    await expect(page.locator("footer").getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/account/sign-in");
    const robots = await (await request.get(`${PROD}/robots.txt`)).text();
    expect(robots).toContain("Disallow: /account");
    const sitemap = await (await request.get(`${PROD}/sitemap.xml`)).text();
    expect(sitemap).not.toContain("/account");
  });
});
