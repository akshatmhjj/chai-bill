import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against the local Supabase stack (`supabase start`) and a production build
 * of the app, which Playwright builds and starts itself on port 3000.
 * Sign-in emails are read from the local mail inbox (Mailpit, port 54324).
 */
export default defineConfig({
  testDir: "./e2e",
  // Tests share one database and one dev server; run them one at a time.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    // A production build is stable under test; the dev server rebuilds its manifests mid-run.
    command: "npm run build && npm run start -- -p 3000",
    // Playwright sets NODE_ENV=test, which would build the app as a non-production bundle. Test the real thing.
    env: { NODE_ENV: "production" },
    url: "http://localhost:3000/login",
    reuseExistingServer: false,
    timeout: 300_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
