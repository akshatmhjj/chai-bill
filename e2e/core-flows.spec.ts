import { expect, test, type Page } from "@playwright/test";
import { addSharedExpense, open, signIn, twoRoommates, uniqueEmail } from "./helpers";

test("signed-out visitors are sent to the sign-in page", async ({ page }) => {
  await open(page, "/expenses");
  await page.waitForURL("**/login");
  await expect(page.getByRole("button", { name: "Send sign-in link" })).toBeVisible();
});

test("a new user signs in and sees the flat setup", async ({ page }) => {
  await signIn(page, uniqueEmail("newuser"));
  await expect(page.getByRole("heading", { name: "Set up your flat" })).toBeVisible();
});

test("two roommates share a flat, and the invite goes away once it is full", async ({ browser }) => {
  const { aliceContext, bobContext, alice, bob } = await twoRoommates(browser);

  await expect(alice.getByText("Yashwardhan")).toBeVisible();
  await expect(bob.getByText("Akshat")).toBeVisible();
  await expect(alice.getByRole("button", { name: "Create invite code" })).toHaveCount(0);

  await aliceContext.close();
  await bobContext.close();
});

test("a shared expense is split, then edited, and personal expenses stay private", async ({ browser }) => {
  const { aliceContext, bobContext, alice, bob } = await twoRoommates(browser);

  await open(alice, "/expenses/new");
  await alice.getByLabel("Description").fill("Groceries");
  await alice.getByLabel("Amount (₹)").fill("1000");
  await expect(alice.locator("section[aria-live]")).toContainText("₹500.00");
  await alice.getByRole("button", { name: "Save expense" }).click();
  await alice.waitForURL("**/expenses");
  await expect(alice.getByText("Groceries")).toBeVisible();
  await open(bob, "/expenses");
  await expect(bob.getByText("Groceries")).toBeVisible();

  // Edit to exact amounts: 700 for Akshat and 300 for Yashwardhan.
  await alice.getByRole("link", { name: "Edit" }).first().click();
  await alice.getByLabel("Split").selectOption("amount");
  const exactInputs = alice.locator('input[name^="exact_"]');
  await exactInputs.nth(0).fill("700");
  await exactInputs.nth(1).fill("300");
  await expect(alice.locator("section[aria-live]")).toContainText("₹700.00");
  await alice.getByRole("button", { name: "Save changes" }).click();
  await alice.waitForURL("**/expenses");

  // A personal expense is visible to its creator only.
  await addPersonalExpense(alice, "Birthday card", "50");
  await expect(alice.getByText("Birthday card")).toBeVisible();
  await bob.reload();
  await expect(bob.getByText("Birthday card")).toHaveCount(0);

  await aliceContext.close();
  await bobContext.close();
});

test("balances update after a partial payment and when it is deleted", async ({ browser }) => {
  const { aliceContext, bobContext, alice, bob } = await twoRoommates(browser);
  await addSharedExpense(alice, "Internet bill", "1000");

  await open(bob, "/balances");
  await expect(bob.getByText("You owe ₹500.00")).toBeVisible();

  await bob.getByLabel("Amount (₹)").fill("200");
  await bob.getByLabel("UPI reference (optional)").fill("UPI-E2E-1");
  await bob.getByRole("button", { name: "Record payment" }).click();
  await bob.waitForURL("**/balances");
  await expect(bob.getByText("You owe ₹300.00")).toBeVisible();

  await open(alice, "/balances");
  await expect(alice.getByText("You are owed ₹300.00")).toBeVisible();

  await bob.getByRole("button", { name: "Delete" }).first().click();
  await expect(bob.getByText("You owe ₹500.00")).toBeVisible();

  await aliceContext.close();
  await bobContext.close();
});

test("the shopping list works end to end and shows in the activity feed", async ({ browser }) => {
  const { aliceContext, bobContext, alice } = await twoRoommates(browser);

  await open(alice, "/shopping");
  await alice.getByPlaceholder("Add an item").fill("Milk");
  await alice.getByPlaceholder("Qty").fill("1 L");
  await alice.getByRole("button", { name: "Add to list" }).click();
  await expect(alice.getByText("Milk · 1 L")).toBeVisible();

  await alice.getByRole("button", { name: "Bought" }).click();
  await expect(alice.getByText("Bought recently")).toBeVisible();
  await alice.getByRole("button", { name: "Put back" }).click();
  await expect(alice.getByText("Milk · 1 L")).toBeVisible();

  await alice.getByRole("button", { name: "Delete" }).first().click();
  await expect(alice.getByText("Nothing on the list.")).toBeVisible();

  await open(alice, "/activity");
  await expect(alice.getByText('You removed "Milk" from the shopping list')).toBeVisible();

  await aliceContext.close();
  await bobContext.close();
});

test("a change by one roommate appears on the other's open page without a reload", async ({ browser }) => {
  const { aliceContext, bobContext, alice, bob } = await twoRoommates(browser);

  await open(alice, "/expenses");
  await addSharedExpense(bob, "Live lunch", "400");
  await expect(alice.getByText("Live lunch")).toBeVisible({ timeout: 20_000 });

  await open(alice, "/shopping");
  await open(bob, "/shopping");
  await bob.getByPlaceholder("Add an item").fill("Eggs");
  await bob.getByRole("button", { name: "Add to list" }).click();
  await expect(alice.getByText("Eggs")).toBeVisible({ timeout: 20_000 });

  await aliceContext.close();
  await bobContext.close();
});

async function addPersonalExpense(page: Page, description: string, amount: string) {
  await open(page, "/expenses/new");
  await page.getByLabel("Type").selectOption("personal");
  await page.getByLabel("Description").fill(description);
  await page.getByLabel("Amount (₹)").fill(amount);
  await expect(page.locator("section[aria-live]")).toContainText("Total");
  await page.getByRole("button", { name: "Save expense" }).click();
  await page.waitForURL("**/expenses");
}

