import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Joining a membership and paying online (owner, 2026-10-26: no confirmation
 * by Alex), on a build with Square in Sandbox mode against the Square
 * stand-in (tests/e2e/mock-square.mjs). Paying on the stand-in's checkout
 * page sends a signed webhook, as Square does; the site records the payment
 * only after re-reading it from "Square", and only then starts the membership.
 */
const PAY = `http://localhost:${process.env.E2E_PAY_PORT ?? 3202}`;
const MOCK = `http://localhost:${process.env.MOCK_EMAIL_PORT ?? 3299}`;
const SUPABASE = `http://localhost:${process.env.MOCK_SUPABASE_PORT ?? 3298}`;
const SQUARE = `http://localhost:${process.env.MOCK_SQUARE_PORT ?? 3297}`;

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

const continueButton = (page: Page) => page.getByRole("button", { name: "Continue" });

/** Plan → skip the first class → details → the check step. */
async function toCheckStep(page: Page, plan: string, name: string, email: string) {
  await page.goto(`${PAY}/memberships/join?plan=${plan}`);
  await continueButton(page).click();
  await page.getByRole("button", { name: "Skip: I'll book my first class later" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill(name);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await continueButton(page).click();
  // The form's anti-spam check refuses anything sent within 3 seconds of opening it.
  await page.waitForTimeout(3100);
}

test.beforeAll(async ({ request }) => {
  // The stand-in database is a test database (Square Sandbox records allowed), as DEPLOYMENT.md sets up.
  await sql(request, "insert into akb_database_role (role) select 'test' where not exists (select 1 from akb_database_role)");
});

test.describe("joining and paying online", () => {
  test("pay on Square's page, come back, and the membership has started: nothing for Alex to confirm", async ({ page, request }) => {
    const email = `payer-${Date.now()}@example.com`;
    await toCheckStep(page, "regular", "Online Payer", email);
    await expect(page.getByRole("heading", { name: "Check and pay" })).toBeVisible();
    await expect(page.getByText("Square's secure page takes £65 for your first 4 weeks")).toBeVisible();
    // The agreement is still required before paying.
    await page.getByRole("button", { name: "Pay £65" }).click();
    await expect(page.locator("#agree-error")).toBeVisible();
    await page.getByLabel(/I've read and agree to the membership terms/).check();
    await page.getByRole("button", { name: "Pay £65" }).click();

    // Square's (stand-in) checkout: the plan and the price come from the server, not the form.
    await expect(page).toHaveURL(new RegExp(`^${SQUARE}/checkout/`));
    await expect(page.getByRole("heading", { name: "Regular membership, first 4 weeks" })).toBeVisible();
    await page.getByRole("button", { name: "Pay £65.00" }).click();

    await expect(page).toHaveURL(new RegExp(`^${PAY}/memberships/join/done\\?signup=`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("You're in.", { timeout: 15_000 });
    await expect(page.getByRole("link", { name: "Sign in to your account" })).toHaveAttribute("href", "/account/sign-in");

    // In the database: an online-paying membership on the paid charge, and a card payment from Square.
    const [m] = await sql(request, "select m.pay_online, m.plan, m.credits from akb_memberships m join akb_clients c on c.id = m.client_id where c.email = $1", [email]);
    expect(m).toEqual({ pay_online: true, plan: "regular", credits: 8 });
    const pays = await sql(request, "select p.method, p.provider, p.amount_pence from akb_payments p join akb_clients c on c.id = p.client_id where c.email = $1", [email]);
    expect(pays).toEqual([{ method: "card", provider: "square_sandbox", amount_pence: 6500 }]);

    // Alex is told it's done (not asked to confirm), and the member is welcomed.
    await expect.poll(async () => (await emailsTo(request, "alex-e2e@example.com")).filter((e) => e.payload.subject.includes("Online Payer")).length).toBe(1);
    const [alex] = (await emailsTo(request, "alex-e2e@example.com")).filter((e) => e.payload.subject.includes("Online Payer"));
    expect(alex.payload.subject).toBe("New member: Online Payer (Regular, paid online)");
    expect(alex.payload.text).toContain("nothing to confirm");
    const [welcome] = await emailsTo(request, email);
    expect(welcome.payload.subject).toBe("Welcome to RAENG: your Regular membership has started");
  });

  test("leaving Square's page without paying starts nothing, and the page says it's waiting", async ({ page, request }) => {
    const email = `leaver-${Date.now()}@example.com`;
    await toCheckStep(page, "starter", "Not Paying", email);
    await page.getByLabel(/I've read and agree to the membership terms/).check();
    await page.getByRole("button", { name: "Pay £40" }).click();
    await expect(page).toHaveURL(new RegExp(`^${SQUARE}/checkout/`));
    const [signup] = await sql(request, "select s.id from akb_membership_signups s join akb_clients c on c.id = s.client_id where c.email = $1", [email]);
    // Coming back by the address alone proves nothing.
    await page.goto(`${PAY}/memberships/join/done?signup=${signup.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Waiting for Square to confirm.");
    await expect(page.getByRole("link", { name: "Go back to Square to pay" })).toHaveAttribute("href", new RegExp(`^${SQUARE}/checkout/`));
    expect(await sql(request, "select count(*)::int as n from akb_memberships m join akb_clients c on c.id = m.client_id where c.email = $1", [email])).toEqual([{ n: 0 }]);
    expect(await emailsTo(request, email)).toEqual([]);
  });

  test("an unknown sign-up says so", async ({ page }) => {
    await page.goto(`${PAY}/memberships/join/done?signup=00000000-0000-4000-8000-000000000000`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("We couldn't find that sign-up.");
    await page.goto(`${PAY}/memberships/join/done?signup=not-a-uuid`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("We couldn't find that sign-up.");
  });

  test("the plan list and the join page say you pay with Square, and the check step is accessible", async ({ page }) => {
    await page.goto(`${PAY}/memberships`);
    await page.locator("#memberships").getByRole("list", { name: "Membership plans" }).locator("> li").first().click({ position: { x: 120, y: 20 } });
    await expect(page.locator("#memberships")).toContainText("Next, your first class and details, then pay with Square.");
    await toCheckStep(page, "dedicated", "Axe Payer", "axe-payer@example.com");
    await page.waitForTimeout(1300);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
});
