import { expect, test } from "@playwright/test";
import { open, twoRoommates } from "./helpers";

async function addItem(page: import("@playwright/test").Page, name: string, quantity?: string) {
  await page.getByLabel("Item name").fill(name);
  if (quantity) await page.getByLabel("Quantity").fill(quantity);
  await page.getByRole("button", { name: "Add to list" }).click();
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
}

test("a new list is empty and inviting, and the add button needs a name", async ({ browser }) => {
  const { aContext, bContext, a } = await twoRoommates(browser);
  await open(a, "/shopping");
  await expect(a.getByText("Looks like you're all stocked up")).toBeVisible();
  await expect(a.getByRole("button", { name: "Add to list" })).toBeDisabled();

  await aContext.close();
  await bContext.close();
});

test("items can be added, bought, undone, and removed with an undo", async ({ browser }) => {
  const { aContext, bContext, a } = await twoRoommates(browser);
  await open(a, "/shopping");

  await addItem(a, "Milk", "2 L");
  await expect(a.getByText("2 L")).toBeVisible();
  await expect(a.getByText("1 to buy")).toBeVisible();

  // Buy it: it moves to Bought, with an Undo in the toast.
  await a.getByRole("button", { name: "Mark Milk as bought" }).click();
  await expect(a.getByRole("heading", { name: "Bought · 1" })).toBeVisible();
  await expect(a.getByText("Milk bought")).toBeVisible();
  await a.getByRole("button", { name: "Undo" }).click();
  await expect(a.getByText("1 to buy")).toBeVisible();
  await expect(a.getByRole("heading", { name: /Bought/ })).toHaveCount(0);

  // Remove it, then bring it back from the toast.
  await a.getByRole("button", { name: "Remove Milk" }).click();
  await expect(a.getByText("Removed Milk")).toBeVisible();
  await expect(a.getByText("Looks like you're all stocked up")).toBeVisible();
  await a.getByRole("button", { name: "Undo" }).click();
  await expect(a.getByText("Milk", { exact: true }).first()).toBeVisible();

  await aContext.close();
  await bContext.close();
});

test("an item put back from the bought list returns to the top of what is left to buy", async ({ browser }) => {
  const { aContext, bContext, a } = await twoRoommates(browser);
  await open(a, "/shopping");
  await addItem(a, "Eggs");
  await addItem(a, "Bread");

  await a.getByRole("button", { name: "Mark Eggs as bought" }).click();
  await expect(a.getByRole("heading", { name: "Bought · 1" })).toBeVisible();
  await a.getByRole("button", { name: "Put back Eggs" }).click();
  await expect(a.getByText("2 to buy")).toBeVisible();

  await aContext.close();
  await bContext.close();
});

test("what your roommate adds and buys shows up live, with who did it", async ({ browser }) => {
  const { aContext, bContext, a, b } = await twoRoommates(browser);
  await open(a, "/shopping");
  await open(b, "/shopping");

  await addItem(a, "Eggs", "12");
  await expect(b.getByText("Eggs", { exact: true }).first()).toBeVisible({ timeout: 20_000 });
  await expect(b.getByText("added by Akshat")).toBeVisible();
  await expect(b.getByText("New", { exact: true })).toBeVisible();

  await b.getByRole("button", { name: "Mark Eggs as bought" }).click();
  await expect(a.getByRole("heading", { name: "Bought · 1" })).toBeVisible({ timeout: 20_000 });
  await expect(a.getByText("bought by Yashwardhan")).toBeVisible();

  await aContext.close();
  await bContext.close();
});
