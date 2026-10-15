import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3200);
export const mockEmailPort = Number(process.env.MOCK_EMAIL_PORT ?? 3299);
// Optional: point at a preinstalled Chromium (e.g. /opt/pw-browsers/chromium).
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${port}`,
    launchOptions: { executablePath },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Tests run against a production build without CONTENT_PREVIEW, with the
  // booking form wired to a local mock of the email API.
  webServer: [
    {
      command: `node tests/e2e/mock-email-server.mjs`,
      url: `http://localhost:${mockEmailPort}/`,
      reuseExistingServer: !process.env.CI,
      env: { MOCK_EMAIL_PORT: String(mockEmailPort) },
    },
    {
      command: `npm run build && npx next start -p ${port}`,
      url: `http://localhost:${port}`,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
      env: {
        CONTENT_PREVIEW: "false",
        RESEND_API_KEY: "re_e2e_test_key",
        RESEND_API_URL: `http://localhost:${mockEmailPort}/emails`,
        BOOKING_NOTIFY_EMAIL: "alex-e2e@example.com",
        BOOKING_FROM_EMAIL: "Alex K Bells <bookings-e2e@example.com>",
      },
    },
  ],
});
