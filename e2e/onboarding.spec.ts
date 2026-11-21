import { expect, test } from "@playwright/test";
import { completeProfile, createFlat, ready, signIn, twoRoommates, uniqueEmail } from "./helpers";

test("signed-out visitors are sent to the sign-in page", async ({ page }) => {
  await page.goto("/expenses");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: /Your flat.s little ledger/ })).toBeVisible();

  // The design-system gallery is a development tool: in production it is not reachable at all.
  await page.goto("/design");
  await expect(page).toHaveURL(/\/login/);
});

test("a new person lands on the profile step, and the avatar picker previews each choice", async ({ page }) => {
  await signIn(page, uniqueEmail("fresh"));
  await expect(page).toHaveURL(/\/onboarding\/profile/);
  await expect(page.getByRole("heading", { name: "Who's this?" })).toBeVisible();

  await page.getByRole("radio", { name: /^Panda/ }).click();
  await expect(page.getByRole("radio", { name: /^Panda/ })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("Snack-driven")).toBeVisible();

  await page.getByRole("radio", { name: /^Moon/ }).click();
  await expect(page.getByRole("radio", { name: /^Panda/ })).toHaveAttribute("aria-checked", "false");
  await expect(page.getByText("Night owl")).toBeVisible();
});

test("the profile step needs a name", async ({ page }) => {
  await signIn(page, uniqueEmail("noname"));
  await ready(page);
  await page.getByLabel("Your name").fill("   ");
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByText("Enter your name")).toBeVisible();
  await expect(page).toHaveURL(/\/onboarding\/profile/);
});

test("a wrong invite code gets a friendly error", async ({ page }) => {
  await signIn(page, uniqueEmail("wrongcode"));
  await completeProfile(page, "Test", "Cat");
  await page.getByRole("radio", { name: "Join with a code" }).click();
  await page.getByLabel("Invite code").fill("0".repeat(32));
  await page.getByRole("button", { name: /Join flat/ }).click();
  await expect(page.getByText(/invalid, already used, or expired/)).toBeVisible();
  await expect(page.getByLabel("Invite code")).toBeVisible();
});

test("a code that is not a code is caught before it is sent", async ({ page }) => {
  await signIn(page, uniqueEmail("shortcode"));
  await completeProfile(page, "Test", "Cat");
  await page.getByRole("radio", { name: "Join with a code" }).click();
  await page.getByLabel("Invite code").fill("abc");
  await page.getByRole("button", { name: /Join flat/ }).click();
  await expect(page.getByText("That invite code doesn't look right")).toBeVisible();
});

test("two roommates onboard, the waiting screen flips live, and the joiner gets a welcome", async ({ browser }) => {
  const { aContext, bContext, a, b, flatName } = await twoRoommates(browser);

  // Akshat (who waited) is on Home with the flat's name and his roommate.
  await expect(a.getByText(new RegExp(`${flatName}.*with Yashwardhan`))).toBeVisible();

  // Yashwardhan (who joined) sees a welcome that says who is here and how it works.
  await expect(b.getByRole("heading", { name: `Welcome to ${flatName}` })).toBeVisible();
  await expect(b.getByText("Akshat & Yashwardhan")).toBeVisible();
  await b.getByRole("button", { name: "Got it" }).click();
  await expect(b.getByRole("heading", { name: `Welcome to ${flatName}` })).toHaveCount(0);
  await expect(b).toHaveURL(/\/$/);

  await aContext.close();
  await bContext.close();
});

test("a flat with one person shows the invite on Home instead of a balance", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, uniqueEmail("solo"));
  await completeProfile(page, "Solo", "Monstera");
  await createFlat(page, "Solo flat");

  await page.getByRole("button", { name: "Continue to my flat" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Your flat is ready" })).toBeVisible();
  await expect(page.locator('[aria-label^="Invite code "]')).toBeVisible();
  // There is no balance to show yet, and nothing to settle with.
  await expect(page.getByRole("region", { name: "Your balance" })).toHaveCount(0);

  await context.close();
});
