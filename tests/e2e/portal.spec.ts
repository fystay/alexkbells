import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { addDays, londonToday, weekday } from "../../src/lib/coach/time";

/**
 * The coach portal against the Supabase stand-in (real migrations on an
 * in-process Postgres). Tests run in parallel on one database, so each uses
 * its own names and emails and never assumes it is alone.
 */
const SUPABASE = `http://localhost:${process.env.MOCK_SUPABASE_PORT ?? 3298}`;
const coach = { email: "coach-e2e@example.com", password: "correct-horse" };

async function signIn(page: Page) {
  await page.goto("/coach/login");
  await page.getByLabel("Email").fill(coach.email);
  await page.getByLabel("Password").fill(coach.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/coach$/);
}

async function sql<T = Record<string, unknown>>(request: APIRequestContext, query: string, params: unknown[] = []): Promise<T[]> {
  const response = await request.post(`${SUPABASE}/test/sql`, { data: { sql: query, params } });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as T[];
}

let counter = 0;
function unique(label: string) {
  counter += 1;
  const id = `${Date.now().toString(36)}${counter}${Math.floor(Math.random() * 1e4)}`;
  return { name: `${label} ${id}`, email: `${label.toLowerCase().replace(/\W+/g, "-")}-${id}@example.com` };
}

const today = londonToday();
/** The next date (after today) on a weekday, 0 = Monday. */
function next(dayIndex: number, weeksAhead = 0): string {
  let d = addDays(today, 1);
  while (weekday(d) !== dayIndex) d = addDays(d, 1);
  return addDays(d, weeksAhead * 7);
}

async function seedRequest(request: APIRequestContext, person: { name: string; email: string; phone?: string }, opts: { service?: string; summary?: string; details?: Record<string, string> } = {}) {
  const [row] = await sql<{ id: string }>(
    request,
    `insert into akb_booking_requests (idempotency_key, kind, service, summary, name, email, phone, message, details)
     values ($1, 'booking', $2, $3, $4, $5, $6, 'Looking forward to it', $7::jsonb) returning id`,
    [`e2e-${person.email}-${Math.random()}`, opts.service ?? "Group class", opts.summary ?? "", person.name, person.email, person.phone ?? "", JSON.stringify({ experience: "ROOKIE MODE", ...opts.details })],
  );
  return row.id;
}

async function seedClient(request: APIRequestContext, person: { name: string; email: string; phone?: string }) {
  const [row] = await sql<{ id: string }>(request, "insert into akb_clients (full_name, email, phone, status) values ($1, $2, $3, 'active') returning id", [person.name, person.email, person.phone ?? ""]);
  return row.id;
}

test.describe("access", () => {
  const routes = [
    "/coach",
    "/coach/requests",
    "/coach/requests/00000000-0000-4000-8000-000000000000",
    "/coach/clients",
    "/coach/clients/new",
    "/coach/clients/00000000-0000-4000-8000-000000000000",
    "/coach/classes",
    `/coach/classes/${next(5)}/sat-morning`,
    "/coach/sessions",
    "/coach/sessions/new",
    "/coach/online",
    "/coach/finances",
    "/coach/finances/payments/new",
  ];
  for (const route of routes) {
    test(`${route} needs the coach login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/coach\/login$/);
    });
  }

  test("the CSV export needs the coach login", async ({ request }) => {
    const response = await request.get("/coach/finances/export?from=2026-01-01&to=2026-12-31", { maxRedirects: 0 });
    expect(response.status()).toBeGreaterThanOrEqual(300);
    expect(response.headers()["content-type"] ?? "").not.toContain("text/csv");
  });

  test("the database refuses requests without the secret key", async ({ request }) => {
    for (const table of ["akb_clients", "akb_payments", "akb_booking_requests"]) {
      const response = await request.get(`${SUPABASE}/rest/v1/${table}?select=*`, { headers: { apikey: "sb_publishable_wrong" } });
      expect(response.status(), table).toBe(401);
    }
  });
});

test("confirming a class request creates the client, books the place, and payments settle it", async ({ page, request }) => {
  const person = unique("Cara Class");
  const date = next(5, 1);
  const id = await seedRequest(request, person, { summary: `Saturday ${date}, 10:15 am`, details: { classDate: date, classSlot: "sat-morning" } });
  await signIn(page);

  // The dashboard lists it as needing attention, linking to it.
  await expect(page.getByRole("link", { name: new RegExp(`New request: ${person.name}`) })).toBeVisible();

  await page.goto("/coach/requests");
  await page.getByRole("link", { name: new RegExp(person.name) }).click();
  await expect(page).toHaveURL(new RegExp(`/coach/requests/${id}$`));
  await expect(page.getByText("No client has this email address yet.")).toBeVisible();
  await expect(page.getByLabel("Class", { exact: true })).toHaveValue(`${date}|sat-morning`);
  await page.getByRole("button", { name: "Confirm request" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Confirmed" })).toBeVisible();
  await expect(page.getByText("Confirmed", { exact: true }).first()).toBeVisible();

  // Nothing tells them they're booked until Alex sends it: a prefilled message to send.
  const mail = page.getByRole("link", { name: "Open in email" });
  await expect(mail).toHaveAttribute("href", new RegExp(`^mailto:${encodeURIComponent(person.email)}`));
  await expect(page.getByLabel("Message")).toHaveValue(/You're booked in: Kettlebell Training/);
  await page.getByRole("button", { name: "Mark as told" }).click();
  await expect(page.getByText(/^Told /)).toBeVisible();

  // One client, linked; one place on the class.
  const clients = await sql<{ id: string }>(request, "select id from akb_clients where email = $1", [person.email]);
  expect(clients).toHaveLength(1);
  const clientId = clients[0].id;

  await page.goto(`/coach/classes/${date}/sat-morning`);
  const row = page.getByRole("listitem").filter({ hasText: person.name });
  await expect(row.getByText("Booked", { exact: true })).toBeVisible();
  await expect(row.getByText("Unpaid")).toBeVisible();
  await row.getByRole("button", { name: "Attended" }).click();
  await expect(row.getByText("Attended", { exact: true })).toBeVisible();

  // A £5 part payment, then the rest.
  await row.getByRole("link", { name: "Record payment" }).click();
  await expect(page.getByLabel("Amount received")).toHaveValue("10");
  await page.getByLabel("Amount received").fill("5");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByText("Payment recorded.")).toBeVisible();

  await page.goto(`/coach/clients/${clientId}?tab=payments`);
  await expect(page.getByText("£5.00 left")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Outstanding" }).getByText("£0.00")).toBeVisible(); // not due yet
  await expect(page.getByRole("listitem").filter({ hasText: "Due later" }).getByText("£5.00")).toBeVisible();
  await page.getByRole("link", { name: "Pay", exact: true }).click();
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByText("Payment recorded.")).toBeVisible();

  // Refund £5 of that second payment for the class (it's owed again).
  const refund = page.getByRole("form", { name: "Record a refund" });
  await refund.getByLabel("Amount refunded").fill("5");
  await refund.getByLabel(/^Refund for/).selectOption({ index: 1 });
  await refund.getByLabel("Reason").fill("Overpaid by mistake");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Record refund" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Refund recorded." })).toBeVisible();

  await page.goto(`/coach/clients/${clientId}?tab=payments`);
  await expect(page.getByRole("listitem").filter({ hasText: "Total received" }).getByText("£5.00")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Due later" }).getByText("£5.00")).toBeVisible();
});

test("a returning client's request is linked by email and reuses their record", async ({ page, request }) => {
  const person = unique("Ray Return");
  const clientId = await seedClient(request, person);
  const id = await seedRequest(request, { ...person, email: person.email.toUpperCase() }, { service: "One-to-one", summary: "Preferred: Mon, Tue" });
  await signIn(page);
  await page.goto("/coach/requests");
  await expect(page.getByRole("link", { name: new RegExp(person.name) }).getByText("Returning client")).toBeVisible();
  await page.goto(`/coach/requests/${id}`);
  await expect(page.getByText(/Linked to client/)).toBeVisible();
  await expect(page.getByRole("radio", { name: new RegExp(`${person.name} \\(existing client\\)`) })).toBeChecked();

  // Confirm with a one-to-one at a date and time.
  const date = next(1, 2);
  await page.getByRole("radio", { name: "A one-to-one session" }).check();
  await page.getByLabel("Date", { exact: true }).fill(date);
  await page.getByLabel("Start", { exact: true }).fill("07:00");
  await page.getByRole("button", { name: "Confirm request" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Confirmed" })).toBeVisible();
  expect(await sql(request, "select id from akb_clients where lower(email) = lower($1)", [person.email])).toEqual([{ id: clientId }]);
  expect(await sql(request, "select count(*)::int as n from akb_pt_sessions where client_id = $1", [clientId])).toEqual([{ n: 1 }]);
});

test("a phone-only match is offered, never linked, and the coach must choose", async ({ page, request }) => {
  const existing = unique("Pia Phone");
  const phone = `07700 9${String(Math.floor(Math.random() * 1e5)).padStart(5, "0")}`;
  await seedClient(request, { ...existing, phone });
  const visitor = unique("Pia Other");
  const id = await seedRequest(request, { ...visitor, phone: phone.replace("07700", "+44 7700") }, { details: { classDate: next(0, 1), classSlot: "mon-evening" } });
  await signIn(page);
  await page.goto(`/coach/requests/${id}`);
  await expect(page.getByText("Possibly the same person (not linked automatically):")).toBeVisible();
  await expect(page.getByRole("link", { name: existing.name })).toBeVisible();
  await page.getByRole("button", { name: "Confirm request" }).click();
  await expect(page.locator("form [role=alert]")).toContainText("Please check");
  await expect(page.getByText("Choose an existing client or create a new one.")).toBeVisible();
  // Nothing was changed.
  expect(await sql(request, "select status, client_id from akb_booking_requests where id = $1", [id])).toEqual([{ status: "new", client_id: null }]);
});

test("declining needs a reason; cancelling a confirmed request cancels its class place", async ({ page, request }) => {
  const a = unique("Dan Decline");
  const declineId = await seedRequest(request, a);
  const b = unique("Cat Cancel");
  const date = next(2, 1);
  const cancelId = await seedRequest(request, b, { details: { classDate: date, classSlot: "wed-evening" } });
  await signIn(page);

  await page.goto(`/coach/requests/${declineId}`);
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Decline" }).click();
  await expect(page.getByText("Enter the note.")).toBeVisible();
  await page.getByRole("form", { name: "Decline request" }).getByLabel("Reason").fill("No spaces that week");
  await page.getByRole("button", { name: "Decline" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Declined" })).toBeVisible();
  await expect(page.getByLabel("Message")).toHaveValue(/can't confirm it this time/);

  await page.goto(`/coach/requests/${cancelId}`);
  await page.getByRole("button", { name: "Confirm request" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Confirmed" })).toBeVisible();
  await page.getByRole("form", { name: "Cancel booking" }).getByLabel("Reason").fill("Injured, will rebook");
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Cancelled, with its booking." })).toBeVisible();
  const places = await sql(request, "select a.status from akb_class_attendance a where a.request_id = $1", [cancelId]);
  expect(places).toEqual([{ status: "cancelled" }]);
  // Its unpaid charge was cancelled with it.
  const charges = await sql<{ voided: boolean }>(request, "select voided_at is not null as voided from akb_charges c join akb_class_attendance a on a.id = c.attendance_id where a.request_id = $1", [cancelId]);
  expect(charges).toEqual([{ voided: true }]);
});

test("class pages exist only for real timetable dates", async ({ page }) => {
  await signIn(page);
  const saturday = next(5);
  await page.goto(`/coach/classes/${saturday}/sat-morning`);
  await expect(page.getByRole("heading", { level: 2, name: "Attendees" })).toBeVisible();
  // The page streams after the session check, so a bad date shows the not-found page (status already sent).
  for (const path of [`/coach/classes/${addDays(saturday, 1)}/sat-morning`, `/coach/classes/${saturday}/no-such-class`, "/coach/classes/2026-02-30/mon-evening"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" }), path).toBeVisible();
    await expect(page.getByRole("heading", { name: "Attendees" })).toHaveCount(0);
  }
});

test("class capacity: not full until a capacity is set and reached", async ({ page, request }) => {
  const date = next(0, 3);
  const p1 = unique("Cap One");
  const p2 = unique("Cap Two");
  await seedClient(request, p1);
  await seedClient(request, p2);
  await signIn(page);
  await page.goto(`/coach/classes/${date}/mon-evening`);
  // Other tests may book this class too: set a capacity just above whatever is booked now.
  const booked = Number((await page.locator("h1 + p").innerText()).match(/· (\d+)/)?.[1] ?? 0);
  await expect(page.getByText("Full", { exact: true })).toHaveCount(0);
  await page.getByLabel("Capacity").fill(String(booked + 1));
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/Capacity: \d+/)).toBeVisible();
  const add = page.getByRole("form", { name: "Add someone to this class" });
  await add.getByLabel("Client").selectOption({ label: p1.name });
  await add.getByRole("button", { name: "Add to class" }).click();
  await expect(page.getByRole("status").filter({ hasText: `${p1.name} added` })).toBeVisible();
  await expect(page.getByText("Full", { exact: true })).toBeVisible();
  await add.getByLabel("Client").selectOption({ label: p2.name });
  await add.getByRole("button", { name: "Add to class" }).click();
  await expect(add.getByRole("alert")).toContainText("That class is full");
});

test("one-to-one: overlapping times are refused; reschedule and cancel keep the history", async ({ page, request }) => {
  const person = unique("Sam Session");
  const clientId = await seedClient(request, person);
  const date = next(3, 6);
  const hour = String(6 + Math.floor(Math.random() * 12)).padStart(2, "0");
  await signIn(page);
  await page.goto(`/coach/sessions/new?client=${clientId}`);
  await page.getByLabel("Date").fill(date);
  await page.getByLabel("Start").fill(`${hour}:00`);
  await page.getByLabel("Agreed price").fill("40");
  await page.getByRole("button", { name: "Book session" }).click();
  await expect(page).toHaveURL(/\/coach\/sessions\/[0-9a-f-]{36}$/);
  const sessionUrl = page.url();

  await page.goto(`/coach/sessions/new?client=${clientId}`);
  await page.getByLabel("Date").fill(date);
  await page.getByLabel("Start").fill(`${hour}:30`);
  await page.getByRole("button", { name: "Book session" }).click();
  await expect(page.locator("form [role=alert]")).toContainText("overlaps another one-to-one session");

  await page.goto(sessionUrl);
  await page.getByRole("form", { name: "Reschedule" }).getByLabel("Start").fill(`${hour}:15`);
  await page.getByRole("button", { name: "Move session" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Moved" })).toBeVisible();
  await expect(page.getByText(/^Moved from /)).toBeVisible();

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Cancel session" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Marked cancelled" })).toBeVisible();
  const charges = await sql<{ voided: boolean }>(request, "select voided_at is not null as voided from akb_charges where client_id = $1", [clientId]);
  expect(charges).toEqual([{ voided: true }]);
});

test("packages count sessions used and give a cancelled one back", async ({ page, request }) => {
  const person = unique("Kim Package");
  const clientId = await seedClient(request, person);
  await signIn(page);
  await page.goto(`/coach/clients/${clientId}?tab=packages`);
  const form = page.getByRole("form", { name: "Add a package" });
  await form.getByLabel("Name").fill("2 sessions");
  await form.getByLabel("Sessions").fill("2");
  await form.getByLabel("Price").fill("70");
  await form.getByRole("button", { name: "Add package" }).click();
  await expect(page.getByText("2 of 2 left")).toBeVisible();

  const urls: string[] = [];
  for (const [i, time] of ["08:00", "09:00"].entries()) {
    await page.goto(`/coach/sessions/new?client=${clientId}`);
    await page.getByLabel("Date").fill(next(4, 8 + i));
    await page.getByLabel("Start").fill(time);
    await page.getByLabel("Use a package").selectOption({ label: `2 sessions: ${2 - i} left` });
    await page.getByRole("button", { name: "Book session" }).click();
    await expect(page).toHaveURL(/\/coach\/sessions\/[0-9a-f-]{36}$/);
    urls.push(page.url());
  }
  // No package left to choose, and the package shows none left.
  await page.goto(`/coach/sessions/new?client=${clientId}`);
  await expect(page.getByText("No package with sessions left.")).toBeVisible();
  await page.goto(`/coach/clients/${clientId}?tab=packages`);
  await expect(page.getByText("0 of 2 left")).toBeVisible();

  await page.goto(urls[1]);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Cancel session" }).click();
  await expect(page.getByRole("status").filter({ hasText: "The package place is given back." })).toBeVisible();
  await page.goto(`/coach/clients/${clientId}?tab=packages`);
  await expect(page.getByText("1 of 2 left")).toBeVisible();
});

test("online coaching: plan, check-in schedule and a period charge", async ({ page, request }) => {
  const person = unique("Oli Online");
  const clientId = await seedClient(request, person);
  await signIn(page);
  await page.goto(`/coach/online/new?client=${clientId}`);
  await page.getByLabel("Start date").fill(today);
  await page.getByLabel("Next renewal").fill(today);
  await page.getByRole("button", { name: "Save plan" }).click();
  await expect(page).toHaveURL(/\/coach\/online\/[0-9a-f-]{36}$/);

  await page.getByLabel("How it went").fill("Hit every session this week");
  await page.getByRole("textbox", { name: /^Agreed actions/ }).fill("Add a heavier swing day");
  await page.getByRole("button", { name: "Log check-in" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Check-in logged" })).toBeVisible();
  await expect(page.getByText("Agreed: Add a heavier swing day")).toBeVisible();
  const [{ next_check_in_on }] = await sql<{ next_check_in_on: string }>(request, "select to_char(next_check_in_on, 'YYYY-MM-DD') as next_check_in_on from akb_subscriptions where client_id = $1", [clientId]);
  expect(next_check_in_on).toBe(addDays(today, 7));

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Charge period from/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Charge added" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "£79.00" }).getByText("Unpaid")).toBeVisible();

  await page.goto("/coach/online");
  await expect(page.getByRole("link", { name: new RegExp(person.name) })).toBeVisible();
  await expect(page.getByText("Forecast from active plans, not money received")).toBeVisible();
});

test("finances: totals by period and service, and a safe CSV export", async ({ page, request }) => {
  const person = { ...unique("Fin"), name: `=HYPERLINK("http://evil.example") ${Date.now()}` };
  const clientId = await seedClient(request, person);
  await signIn(page);
  await page.goto(`/coach/finances/payments/new?client=${clientId}`);
  await page.getByLabel("Amount received").fill("12.50");
  await page.getByLabel("For", { exact: true }).selectOption({ label: "One-to-one" });
  await page.getByRole("radio", { name: /Nothing for now/ }).check();
  await page.getByLabel("Reference").fill("BACS 123");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByText("Payment recorded.")).toBeVisible();
  await expect(page.getByText("£12.50").first()).toBeVisible();

  await page.goto(`/coach/finances?period=custom&from=${today}&to=${today}&service=pt`);
  await expect(page.getByRole("status").filter({ hasText: "One-to-one only" })).toBeVisible();
  await expect(page.getByRole("cell", { name: person.name })).toBeVisible();

  const csv = await page.request.get(`/coach/finances/export?from=${today}&to=${today}&service=pt`);
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(csv.headers()["cache-control"]).toContain("no-store");
  const text = await csv.text();
  expect(text).toContain("Date,Type,Client,Service,Method,Status,Amount (GBP)");
  expect(text).toContain("12.50");
  expect(text).toContain(`"'=HYPERLINK(""http://evil.example"")`);

  // A day with nothing in it.
  await page.goto("/coach/finances?period=custom&from=2020-01-01&to=2020-01-31");
  await expect(page.getByText("No payments in this period.")).toBeVisible();
});

test("a database outage shows an error, not empty data", async ({ page }) => {
  await signIn(page);
  await page.goto("/coach/clients?q=FAIL-TEST");
  await expect(page.locator("main [role=alert]")).toContainText("couldn't be loaded");
  await expect(page.getByText("No clients match.")).toHaveCount(0);
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("portal pages fit the screen and pass accessibility checks", async ({ page, request }) => {
    const person = unique("Phone Check");
    const clientId = await seedClient(request, person);
    const requestId = await seedRequest(request, unique("Phone Request"), { details: { classDate: next(5, 1), classSlot: "sat-morning" } });
    await signIn(page);
    for (const path of ["/coach", "/coach/requests", `/coach/requests/${requestId}`, "/coach/clients", `/coach/clients/${clientId}`, `/coach/classes/${next(5)}/sat-morning`, "/coach/sessions", "/coach/online", "/coach/finances", "/coach/finances/payments/new"]) {
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), path).toEqual([]);
    }
    // The section nav scrolls sideways and marks where you are.
    await page.goto("/coach/finances");
    await expect(page.getByRole("navigation", { name: "Coach portal" }).getByRole("link", { name: "Finances" })).toHaveAttribute("aria-current", "page");
  });
});
