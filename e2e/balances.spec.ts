import { expect, test } from "@playwright/test";
import { addExpense, hero, open, twoRoommates } from "./helpers";

test("the balance reads correctly from both sides, with the arithmetic behind it", async ({ browser }) => {
  const { aContext, bContext, a, b } = await twoRoommates(browser);
  await addExpense(a, { amount: "1000", description: "Internet bill" });

  await open(a, "/");
  await expect(hero(a)).toContainText("Yashwardhan owes you");
  await expect(hero(a)).toContainText("₹500");
  await expect(a.getByRole("button", { name: /Settle up/ })).toHaveCount(0);

  await open(b, "/balances");
  await expect(hero(b)).toContainText("You owe Akshat");
  await expect(hero(b)).toContainText("₹500");
  const why = b.getByText("Why your balance is this").locator("..").locator("..");
  await expect(why).toContainText("Your share of everything");
  await expect(why).toContainText("You owe overall");

  await aContext.close();
  await bContext.close();
});

test("a partial payment updates both screens live, shows its UPI reference, and can be deleted", async ({ browser }) => {
  const { aContext, bContext, a, b } = await twoRoommates(browser);
  await addExpense(a, { amount: "1000", description: "Internet bill" });
  await open(a, "/balances");
  await open(b, "/balances");

  await b.getByRole("button", { name: /Settle up/ }).first().click();
  const dialog = b.getByRole("dialog", { name: "Record a payment" });
  await expect(dialog.getByLabel("Amount in rupees")).toHaveValue("500");
  await dialog.getByLabel("Amount in rupees").fill("200");
  await dialog.getByLabel("UPI reference").fill("UPI-E2E-77");
  await dialog.getByRole("button", { name: "Record ₹200 to Akshat" }).click();

  await expect(b.getByText("Payment recorded")).toBeVisible();
  await expect(hero(b)).toContainText("₹300");
  await expect(b.getByText("UPI-E2E-77")).toBeVisible();

  // Akshat's open page followed along without a reload.
  await expect(hero(a)).toContainText("₹300", { timeout: 20_000 });
  await expect(a.getByText("UPI-E2E-77")).toBeVisible();

  // Only the person who paid can delete it.
  await expect(a.getByRole("button", { name: "Delete this payment" })).toHaveCount(0);
  await b.getByRole("button", { name: "Delete this payment" }).click();
  await b.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(hero(b)).toContainText("₹500");
  await expect(b.getByText("UPI-E2E-77")).toHaveCount(0);

  await aContext.close();
  await bContext.close();
});

test("settling in full ends in an all-settled state for both people", async ({ browser }) => {
  const { aContext, bContext, a, b } = await twoRoommates(browser);
  await addExpense(a, { amount: "1000", description: "Internet bill" });
  await open(a, "/balances");
  await open(b, "/balances");

  await b.getByRole("button", { name: /Settle up/ }).first().click();
  await b.getByRole("dialog", { name: "Record a payment" }).getByRole("button", { name: "Record ₹500 to Akshat" }).click();

  await expect(b.getByText("All settled up")).toBeVisible();
  await expect(hero(b)).toContainText("You two are all settled");
  await expect(hero(a)).toContainText("You two are all settled", { timeout: 20_000 });

  await aContext.close();
  await bContext.close();
});

test("the payment sheet checks the amount, hides the reference for cash, and notes an overpayment", async ({ browser }) => {
  const { aContext, bContext, a, b } = await twoRoommates(browser);
  await addExpense(a, { amount: "1000", description: "Internet bill" });
  await open(b, "/balances");
  await b.getByRole("button", { name: /Settle up/ }).first().click();
  const dialog = b.getByRole("dialog", { name: "Record a payment" });
  const amount = dialog.getByLabel("Amount in rupees");

  await amount.fill("abc");
  await expect(dialog.getByText("Enter an amount like 250 or 249.50.")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Enter an amount" })).toBeDisabled();

  await amount.fill("0");
  await expect(dialog.getByText("Enter an amount above zero.")).toBeVisible();

  await amount.fill("600");
  await expect(dialog.getByText(/more than you owe/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Record ₹600 to Akshat" })).toBeEnabled();

  await dialog.getByRole("button", { name: /^Half/ }).click();
  await expect(amount).toHaveValue("250");

  await dialog.getByRole("radio", { name: "Cash" }).click();
  await expect(dialog.getByLabel("UPI reference")).toHaveCount(0);
  await dialog.getByRole("radio", { name: "UPI" }).click();
  await expect(dialog.getByLabel("UPI reference")).toBeVisible();

  await b.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await aContext.close();
  await bContext.close();
});
