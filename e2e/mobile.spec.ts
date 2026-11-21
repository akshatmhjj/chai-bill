import path from "node:path";
import { expect, test } from "@playwright/test";
import { addSharedExpense, createFlat, open, signIn, uniqueEmail } from "./helpers";

const SCREENSHOTS = path.join(process.cwd(), "docs", "screenshots");

/** Phone-sized viewport. Checks each page has no horizontal scroll and saves a screenshot. */
test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

test("every page fits a phone-width screen and captures a screenshot", async ({ page }) => {
  const context = page.context();
  await signIn(page, uniqueEmail("mobile"));
  await createFlat(page, `Mobile flat ${Date.now()}`, "Akshat");
  await addSharedExpense(page, "Mobile dinner", "600");

  const pages: { path: string; name: string; ready: string }[] = [
    { path: "/household", name: "household", ready: "Invite your roommate" },
    { path: "/expenses", name: "expenses", ready: "Mobile dinner" },
    { path: "/expenses/new", name: "expense-new", ready: "Split preview" },
    { path: "/balances", name: "balances", ready: "Where things stand" },
    { path: "/shopping", name: "shopping", ready: "Add to list" },
    { path: "/activity", name: "activity", ready: "Activity" },
  ];

  for (const target of pages) {
    await open(page, target.path);
    await expect(page.getByText(target.ready).first()).toBeVisible();
    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(widths.scroll, `${target.path} overflows horizontally`).toBeLessThanOrEqual(widths.client);
    await page.screenshot({ path: path.join(SCREENSHOTS, `${target.name}.png`), fullPage: true });
  }

  // The sign-in page is also shown at phone width.
  await context.clearCookies();
  await open(page, "/login");
  const loginWidths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(loginWidths.scroll).toBeLessThanOrEqual(loginWidths.client);
  await page.screenshot({ path: path.join(SCREENSHOTS, "login.png"), fullPage: true });

});
