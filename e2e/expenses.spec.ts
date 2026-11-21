import { expect, test } from "@playwright/test";
import { addExpense, open, ready, twoRoommates } from "./helpers";

test("an equal split previews each share, and the odd paisa goes to the payer", async ({ browser }) => {
  const { aContext, bContext, a } = await twoRoommates(browser);
  await open(a, "/expenses/new");

  await a.locator("#expense-amount").fill("100.01");
  await a.locator("#expense-description").fill("Odd paisa lunch");
  // Akshat pays by default, so he carries the extra paisa: 10001 paise split two ways.
  await expect(a.getByText("₹50.01")).toBeVisible();
  await expect(a.getByText("₹50", { exact: true })).toBeVisible();
  await expect(a.getByRole("button", { name: "Add ₹100.01 expense" })).toBeEnabled();

  await aContext.close();
  await bContext.close();
});

test("a category is suggested from the description until you choose one yourself", async ({ browser }) => {
  const { aContext, bContext, a } = await twoRoommates(browser);
  await open(a, "/expenses/new");

  await a.locator("#expense-description").fill("BigBasket order");
  await expect(a.getByRole("button", { name: "Groceries", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(a.getByText("Suggested from what you typed")).toBeVisible();

  await a.getByRole("button", { name: "Fun", exact: true }).click();
  await expect(a.getByRole("button", { name: "Fun", exact: true })).toHaveAttribute("aria-pressed", "true");
  // Once chosen, typing more no longer overrides it.
  await a.locator("#expense-description").fill("Swiggy dinner");
  await expect(a.getByRole("button", { name: "Fun", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(a.getByText("Suggested from what you typed")).toHaveCount(0);

  await aContext.close();
  await bContext.close();
});

test("exact amounts must add up, with a live hint until they do", async ({ browser }) => {
  const { aContext, bContext, a } = await twoRoommates(browser);
  await open(a, "/expenses/new");

  await a.locator("#expense-amount").fill("1000");
  await a.locator("#expense-description").fill("Dinner");
  await a.getByRole("radio", { name: "Amounts", exact: true }).click();
  await a.getByLabel("Akshat's amount").fill("600");
  await a.getByLabel("Yashwardhan's amount").fill("300");

  await expect(a.getByText("₹100 still to assign")).toBeVisible();
  await expect(a.getByRole("button", { name: /^Add/ })).toBeDisabled();

  await a.getByLabel("Yashwardhan's amount").fill("500");
  await expect(a.getByText("₹100 over the total")).toBeVisible();

  await a.getByLabel("Yashwardhan's amount").fill("400");
  await expect(a.getByRole("button", { name: "Add ₹1,000 expense" })).toBeEnabled();

  await aContext.close();
  await bContext.close();
});

test("percentages must total 100, and each person's rupee share is shown", async ({ browser }) => {
  const { aContext, bContext, a } = await twoRoommates(browser);
  await open(a, "/expenses/new");

  await a.locator("#expense-amount").fill("1180");
  await a.locator("#expense-description").fill("Wifi");
  await a.getByRole("radio", { name: "Percent", exact: true }).click();
  await a.getByLabel("Akshat's percentage").fill("30");
  await a.getByLabel("Yashwardhan's percentage").fill("60");
  await expect(a.getByText("10% still to assign")).toBeVisible();
  await expect(a.getByRole("button", { name: /^Add/ })).toBeDisabled();

  await a.getByLabel("Yashwardhan's percentage").fill("70");
  await expect(a.getByText("₹354")).toBeVisible();
  await expect(a.getByText("₹826")).toBeVisible();
  await expect(a.getByRole("button", { name: "Add ₹1,180 expense" })).toBeEnabled();

  await aContext.close();
  await bContext.close();
});

test("a shared expense appears for both roommates with the right share, and the details show the split", async ({ browser }) => {
  const { aContext, bContext, a, b } = await twoRoommates(browser);
  await addExpense(a, { amount: "1000", description: "Weekly groceries" });

  await expect(a.getByText("your share ₹500")).toBeVisible();
  await a.getByText("Weekly groceries").first().click();
  const dialog = a.getByRole("dialog", { name: "Weekly groceries" });
  await expect(dialog.getByText("Split equally")).toBeVisible();
  await expect(dialog.getByText("You paid")).toBeVisible();
  await expect(dialog.getByText("₹500", { exact: true })).toHaveCount(2);
  await a.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await open(b, "/expenses");
  await expect(b.getByText("Weekly groceries")).toBeVisible();
  await expect(b.getByText("Akshat paid")).toBeVisible();
  await expect(b.getByText("your share ₹500")).toBeVisible();

  await aContext.close();
  await bContext.close();
});

test("editing an expense updates the list, and the edit shows in the activity feed", async ({ browser }) => {
  const { aContext, bContext, a, b } = await twoRoommates(browser);
  await addExpense(a, { amount: "1000", description: "Groceries" });

  await a.getByText("Groceries").first().click();
  await a.getByRole("link", { name: "Edit" }).click();
  await expect(a).toHaveURL(/\/expenses\/.+\/edit/);
  await ready(a);
  await a.locator("#expense-amount").fill("1200");
  await a.getByRole("button", { name: "Save changes" }).click();
  await expect(a).toHaveURL(/\/expenses$/);
  await expect(a.getByText("your share ₹600")).toBeVisible();

  await open(b, "/activity");
  await expect(b.getByText("edited")).toBeVisible();

  await aContext.close();
  await bContext.close();
});

test("deleting an expense asks first, then removes it and updates the balance", async ({ browser }) => {
  const { aContext, bContext, a } = await twoRoommates(browser);
  await addExpense(a, { amount: "1000", description: "Mistaken entry" });

  await a.getByText("Mistaken entry").first().click();
  await a.getByRole("button", { name: "Delete expense" }).click();
  await a.getByRole("button", { name: "Keep it" }).click();
  await expect(a.getByRole("dialog", { name: "Mistaken entry" })).toBeVisible();

  await a.getByRole("button", { name: "Delete expense" }).click();
  await a.getByRole("button", { name: "Yes, delete" }).click();
  await expect(a.getByText("Expense deleted")).toBeVisible();
  await expect(a.getByText("Mistaken entry")).toHaveCount(0);

  await open(a, "/");
  await expect(a.getByText("Nothing to settle yet")).toBeVisible();

  await aContext.close();
  await bContext.close();
});

test("a personal expense is marked, counted only for its owner, and invisible to the roommate", async ({ browser }) => {
  const { aContext, bContext, a, b } = await twoRoommates(browser);
  await addExpense(a, { amount: "300", description: "Birthday card", personal: true });

  await expect(a.getByText("Only you")).toBeVisible();
  // Personal spending never touches what the roommates owe each other.
  await open(a, "/");
  await expect(a.getByText("Nothing to settle yet")).toBeVisible();

  await open(b, "/expenses");
  await expect(b.getByText("Birthday card")).toHaveCount(0);
  await open(b, "/activity");
  await expect(b.getByText("Birthday card")).toHaveCount(0);

  await aContext.close();
  await bContext.close();
});
