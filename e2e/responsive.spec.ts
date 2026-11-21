import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { addExpense, completeProfile, createFlat, open, ready, signIn, twoRoommates, uniqueEmail } from "./helpers";

const SHOTS = path.join(process.cwd(), "docs", "screenshots");
fs.mkdirSync(SHOTS, { recursive: true });

const SCREENS = ["/", "/expenses", "/balances", "/shopping", "/activity", "/profile", "/expenses/new"];
const WIDTHS = [360, 390, 430, 768, 1280, 1728];

async function noSidewaysScroll(page: Page, label: string) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll, `${label} scrolls sideways (${scroll} > ${client})`).toBeLessThanOrEqual(client);
}

test("every screen fits every width, the nav adapts, and the README screenshots are captured", async ({ browser }) => {
  test.setTimeout(300_000);
  const { aContext, bContext, a, b } = await twoRoommates(browser, { flatName: "4B Koramangala" });

  // Realistic content, so the layouts are tested with real rows.
  await addExpense(a, { amount: "1840", description: "BigBasket groceries" });
  await addExpense(b, { amount: "24000", description: "November rent", category: "Rent" });
  await addExpense(a, { amount: "1860", description: "Dinner at Toit", category: "Chai & food" });
  await open(a, "/shopping");
  for (const [name, qty] of [["Milk", "2 L"], ["Eggs", "12"], ["Bread", ""]]) {
    await a.getByLabel("Item name").fill(name);
    if (qty) await a.getByLabel("Quantity").fill(qty);
    await a.getByRole("button", { name: "Add to list" }).click();
    await expect(a.getByText(name, { exact: true }).first()).toBeVisible();
  }
  await open(b, "/shopping");
  await b.getByLabel("Item name").fill("Filter coffee");
  await b.getByLabel("Quantity").fill("250 g");
  await b.getByRole("button", { name: "Add to list" }).click();
  await b.getByRole("button", { name: "Mark Milk as bought" }).click();
  await expect(b.getByRole("heading", { name: "Bought · 1" })).toBeVisible();

  await open(a, "/balances");
  await a.getByRole("button", { name: /Settle up/ }).first().click();
  const dialog = a.getByRole("dialog", { name: "Record a payment" });
  await dialog.getByLabel("Amount in rupees").fill("3000");
  await dialog.getByLabel("UPI reference").fill("UPI-4821-9937");
  await dialog.getByRole("button", { name: /^Record/ }).click();
  await expect(a.getByText("Payment recorded")).toBeVisible();

  for (const width of WIDTHS) {
    await a.setViewportSize({ width, height: width < 600 ? 844 : 900 });
    for (const screen of SCREENS) {
      await open(a, screen);
      await a.waitForTimeout(250);
      await noSidewaysScroll(a, `${screen} at ${width}px`);
    }
    // Phones and tablets get the bottom bar; desktop gets the sidebar.
    await open(a, "/");
    if (width < 1024) {
      await expect(a.getByRole("button", { name: "Add something" })).toBeVisible();
      await expect(a.getByRole("link", { name: "Chai Bill home" })).toBeHidden();
    } else {
      await expect(a.getByRole("link", { name: "Chai Bill home" })).toBeVisible();
      await expect(a.getByRole("button", { name: "Add something" })).toBeHidden();
    }
  }

  // Screenshots for the README: phone light and dark, desktop light.
  await a.setViewportSize({ width: 390, height: 844 });
  for (const [screen, name] of [["/", "home"], ["/expenses", "expenses"], ["/balances", "balances"], ["/shopping", "shopping"], ["/activity", "activity"], ["/profile", "profile"]] as const) {
    await open(a, screen);
    await a.waitForTimeout(700);
    await a.screenshot({ path: path.join(SHOTS, `${name}.png`) });
  }
  await open(a, "/expenses/new");
  await a.locator("#expense-amount").fill("1250");
  await a.locator("#expense-description").fill("Chai at Third Wave");
  await a.waitForTimeout(500);
  await a.screenshot({ path: path.join(SHOTS, "add-expense.png") });

  await a.emulateMedia({ colorScheme: "dark" });
  await open(a, "/");
  await a.waitForTimeout(700);
  await a.screenshot({ path: path.join(SHOTS, "home-dark.png") });
  await open(a, "/profile");
  await a.waitForTimeout(500);
  await a.screenshot({ path: path.join(SHOTS, "profile-dark.png") });
  await a.emulateMedia({ colorScheme: "light" });

  await a.setViewportSize({ width: 1280, height: 860 });
  for (const [screen, name] of [["/", "desktop-home"], ["/expenses", "desktop-expenses"], ["/balances", "desktop-balances"]] as const) {
    await open(a, screen);
    await a.waitForTimeout(700);
    await a.screenshot({ path: path.join(SHOTS, `${name}.png`) });
  }

  await aContext.close();
  await bContext.close();
});

test("the sign-in and onboarding screens fit a small phone", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();

  await open(page, "/login");
  await noSidewaysScroll(page, "login");
  await page.screenshot({ path: path.join(SHOTS, "login.png") });

  await signIn(page, uniqueEmail("small"));
  await noSidewaysScroll(page, "profile step");
  await page.getByRole("radio", { name: /^Fox/ }).click();
  await page.getByLabel("Your name").fill("Akshat");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SHOTS, "onboarding-avatar.png") });

  await completeProfile(page, "Akshat", "Fox");
  await noSidewaysScroll(page, "flat step");
  await createFlat(page, "4B Koramangala");
  await noSidewaysScroll(page, "invite step");
  await page.waitForTimeout(900); // let the entrance animation finish before the picture
  await page.screenshot({ path: path.join(SHOTS, "onboarding-invite.png") });
  await ready(page);

  await context.close();
});

test("on a phone the + opens quick actions that go straight to the right place", async ({ browser }) => {
  const { aContext, bContext, a } = await twoRoommates(browser, { phone: true });
  const fab = a.getByRole("button", { name: "Add something" });

  await fab.click();
  const sheet = a.getByRole("dialog", { name: "What's new?" });
  await expect(sheet.getByRole("button", { name: /Add an expense/ })).toBeVisible();
  await expect(sheet.getByRole("button", { name: /Record a payment/ })).toBeVisible();
  await expect(sheet.getByRole("button", { name: /Add to the shopping list/ })).toBeVisible();

  await a.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(fab).toBeFocused();

  await fab.click();
  await a.getByRole("dialog", { name: "What's new?" }).getByRole("button", { name: /Add to the shopping list/ }).click();
  await expect(a).toHaveURL(/\/shopping\?add=1/);
  await expect(a.getByLabel("Item name")).toBeFocused();

  // The full-screen expense form hides the bottom bar and has its own close button.
  await a.goto("/expenses/new");
  await ready(a);
  await expect(a.getByRole("button", { name: "Add something" })).toBeHidden();
  await a.getByRole("link", { name: "Close" }).click();
  await expect(a).toHaveURL(/\/expenses$/);

  await aContext.close();
  await bContext.close();
});
