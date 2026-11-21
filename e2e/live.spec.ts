import { expect, test } from "@playwright/test";
import { addExpense, hero, open, ready, twoRoommates } from "./helpers";

test("an expense from your roommate reaches your open Home: a toast, the balance, a badge and a New tag", async ({ browser }) => {
  const { aContext, bContext, a, b } = await twoRoommates(browser);
  await open(a, "/");

  await addExpense(b, { amount: "800", description: "Pizza night" });

  await expect(a.getByText('Yashwardhan added "Pizza night" ₹800.00')).toBeVisible({ timeout: 20_000 });
  await expect(hero(a)).toContainText("You owe Yashwardhan", { timeout: 20_000 });
  await expect(hero(a)).toContainText("₹400");
  await expect(a.getByLabel("1 new").first()).toBeVisible();
  await expect(a.getByRole("heading", { name: "New since your last visit" })).toBeVisible();

  await aContext.close();
  await bContext.close();
});

test("your own actions are never counted as new for you, but are for your roommate", async ({ browser }) => {
  const { aContext, bContext, a, b } = await twoRoommates(browser);
  await open(b, "/");
  await addExpense(a, { amount: "500", description: "Cleaning supplies" });

  await open(a, "/");
  await expect(a.getByLabel(/\d+ new/)).toHaveCount(0);
  await expect(a.getByRole("heading", { name: /New since your last visit/ })).toHaveCount(0);

  await expect(b.getByLabel("1 new").first()).toBeVisible({ timeout: 20_000 });

  await aContext.close();
  await bContext.close();
});

test("opening the activity feed marks it read, and the marker survives a reload", async ({ browser }) => {
  const { aContext, bContext, a, b } = await twoRoommates(browser);
  await addExpense(b, { amount: "800", description: "Pizza night" });

  await open(a, "/activity");
  await expect(a.getByText("1 new since your last visit")).toBeVisible();
  await expect(a.getByText("New", { exact: true })).toBeVisible();

  // After a moment on screen the feed counts as read.
  await expect(a.getByLabel("1 new")).toHaveCount(0, { timeout: 15_000 });
  await a.reload();
  await ready(a);
  await expect(a.getByText(/new since your last visit/)).toHaveCount(0);
  await expect(a.getByLabel(/\d+ new/)).toHaveCount(0);
  await expect(a.getByText("Pizza night")).toBeVisible();

  // Something new after that is unread again, and only that.
  await addExpense(b, { amount: "100", description: "Chai" });
  await expect(a.getByLabel("1 new").first()).toBeVisible({ timeout: 20_000 });

  await aContext.close();
  await bContext.close();
});

test("the activity feed tells each kind of event apart and can be filtered", async ({ browser }) => {
  const { aContext, bContext, a, b } = await twoRoommates(browser);
  await addExpense(a, { amount: "1000", description: "Groceries" });
  await open(b, "/shopping");
  await b.getByLabel("Item name").fill("Milk");
  await b.getByRole("button", { name: "Add to list" }).click();
  await expect(b.getByText("Milk", { exact: true }).first()).toBeVisible();

  await open(a, "/activity");
  // Scope to the page itself: the toast for Yashwardhan's change also says "Milk".
  const feed = a.getByRole("main");
  await expect(feed.getByText("Groceries", { exact: true })).toBeVisible();
  await expect(feed.getByText("Milk", { exact: true })).toBeVisible();

  await a.getByRole("radio", { name: "Shopping" }).click();
  await expect(feed.getByText("Milk", { exact: true })).toBeVisible();
  await expect(feed.getByText("Groceries", { exact: true })).toHaveCount(0);

  await a.getByRole("radio", { name: "Money" }).click();
  await expect(feed.getByText("Groceries", { exact: true })).toBeVisible();
  await expect(feed.getByText("Milk", { exact: true })).toHaveCount(0);

  await aContext.close();
  await bContext.close();
});
