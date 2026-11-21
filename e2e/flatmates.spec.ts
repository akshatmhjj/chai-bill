import { expect, test } from "@playwright/test";
import { addExpense, completeProfile, hero, joinFlat, newInviteFromProfile, open, signIn, twoRoommates, uniqueEmail } from "./helpers";

test("three flatmates split an expense three ways, and each person's balance is worked out against the others", async ({ browser }) => {
  const { aContext, bContext, a, b } = await twoRoommates(browser);

  // Akshat invites a third flatmate from his profile, and Meera joins.
  const code = await newInviteFromProfile(a);
  const cContext = await browser.newContext();
  const c = await cContext.newPage();
  await signIn(c, uniqueEmail("meera"));
  await completeProfile(c, "Meera", "Sunny");
  await joinFlat(c, code);

  // ₹1,000 split equally three ways: 33333 paise each, the odd paisa with the payer (Akshat).
  await addExpense(a, { amount: "1000", description: "Three-way dinner" });

  // Akshat is owed by the other two, in total ₹666.66.
  await open(a, "/");
  await expect(hero(a)).toContainText("2 people owe you");
  await expect(hero(a)).toContainText("₹666.66");

  // Yashwardhan and Meera each owe Akshat ₹333.33 and nobody else.
  await open(b, "/");
  await expect(hero(b)).toContainText("You owe Akshat");
  await expect(hero(b)).toContainText("₹333.33");

  await open(c, "/");
  await expect(hero(c)).toContainText("You owe Akshat");
  await expect(hero(c)).toContainText("₹333.33");

  // The balances page lists the whole flat, not just the two people in the first pair.
  await open(a, "/balances");
  await expect(a.getByText("Where everyone stands")).toBeVisible();
  await expect(a.getByRole("main").getByText("Meera", { exact: true }).first()).toBeVisible();
  await expect(a.getByRole("main").getByText("Yashwardhan", { exact: true }).first()).toBeVisible();

  await aContext.close();
  await bContext.close();
  await cContext.close();
});

test("a flat is not capped at two, and the header lists the people in it", async ({ browser }) => {
  const { aContext, bContext, a } = await twoRoommates(browser);
  const code = await newInviteFromProfile(a);
  const cContext = await browser.newContext();
  const c = await cContext.newPage();
  await signIn(c, uniqueEmail("third-header"));
  await completeProfile(c, "Meera", "Sunny");
  await joinFlat(c, code);

  await open(a, "/expenses");
  await expect(a.getByRole("main").getByText("Akshat, Yashwardhan and Meera")).toBeVisible();

  await aContext.close();
  await bContext.close();
  await cContext.close();
});
