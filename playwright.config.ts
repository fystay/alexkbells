import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3200);
/** Second server: configured as Vercel production, to prove demo data can't appear there. */
export const productionPort = Number(process.env.E2E_PRODUCTION_PORT ?? 3201);
export const mockEmailPort = Number(process.env.MOCK_EMAIL_PORT ?? 3299);
// Optional: point at a preinstalled Chromium (e.g. /opt/pw-browsers/chromium).
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

const emailEnv = {
  RESEND_API_KEY: "re_e2e_test_key",
  RESEND_API_URL: `http://localhost:${mockEmailPort}/emails`,
  BOOKING_NOTIFY_EMAIL: "alex-e2e@example.com",
  BOOKING_FROM_EMAIL: "Alex K Bells <bookings-e2e@example.com>",
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${port}`,
    launchOptions: { executablePath },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `node tests/e2e/mock-email-server.mjs`,
      url: `http://localhost:${mockEmailPort}/`,
      reuseExistingServer: !process.env.CI,
      env: { MOCK_EMAIL_PORT: String(mockEmailPort) },
    },
    // Main server: a production build without CONTENT_PREVIEW, with booking
    // demo mode on (as on a Vercel preview) and email wired to the mock.
    {
      command: `npm run build && npx next start -p ${port}`,
      url: `http://localhost:${port}`,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: { CONTENT_PREVIEW: "false", BOOKING_DEMO: "true", ...emailEnv },
    },
    // Vercel-production configuration, with BOOKING_DEMO set by mistake.
    {
      command: `npx next build && npx next start -p ${productionPort}`,
      url: `http://localhost:${productionPort}`,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: { NEXT_DIST_DIR: ".next-e2e-production", VERCEL_ENV: "production", BOOKING_DEMO: "true", CONTENT_PREVIEW: "true", ...emailEnv },
    },
  ],
});
