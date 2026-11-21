import { expect, test } from "@playwright/test";
import { completeProfile, createNest, front, newInvite, open, ready, signIn, twoRoommates, uniqueEmail } from "./helpers";

test("signed-out visitors are sent to the sign-in page", async ({ page }) => {
  await page.goto("/expenses");
  await expect(page).toHaveURL(/\/login/);

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

test("a wrong code gets a friendly error, and a code that is too short is not sent", async ({ page }) => {
  await signIn(page, uniqueEmail("wrongcode"));
  await completeProfile(page, "Test", "Cat");

  const field = page.locator("#join-code");
  const join = page.getByRole("button", { name: "Join nest" });
  await field.fill("abc");
  await expect(join).toBeDisabled();

  await field.fill("zzzzzzzz");
  await join.click();
  await expect(page.getByText("That code doesn't work any more. Ask for a fresh one.")).toBeVisible();
  await expect(field).toBeVisible();
});

test("two housemates join with a code, and the joiner gets a welcome", async ({ browser }) => {
  const { aContext, bContext, a, b, nestName } = await twoRoommates(browser);

  // Akshat (who made it) is on Home with the nest's name and his housemate.
  await expect(a.getByText(new RegExp(`${nestName}.*Yashwardhan`)).first()).toBeVisible();

  // Yashwardhan (who joined) sees a welcome that says who is here.
  await expect(b.getByRole("heading", { name: `Welcome to ${nestName}` })).toBeVisible();
  await expect(b.getByText("Akshat & Yashwardhan")).toBeVisible();
  await b.getByRole("button", { name: "Got it" }).click();
  await expect(b.getByRole("heading", { name: `Welcome to ${nestName}` })).toHaveCount(0);

  await aContext.close();
  await bContext.close();
});

test("a nest with one person shows the invite instead of a balance, and the front page lists every nest", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, uniqueEmail("solo"));
  await completeProfile(page, "Solo", "Monstera");
  await createNest(page, "Solo nest");

  await open(page, "/");
  await expect(page.getByRole("heading", { name: "Your nest is ready" })).toBeVisible();
  // There is no balance to show yet, and nothing to settle with.
  await expect(page.getByRole("region", { name: "Your balance" })).toHaveCount(0);

  // The same person can belong to more than one nest; the front page lists both.
  await createNest(page, "Second nest");
  await front(page);
  await expect(page.getByRole("link", { name: /Solo nest/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Second nest/ })).toBeVisible();

  await context.close();
});

test("someone already in one nest can join another by code from the front page", async ({ browser }) => {
  const { aContext, bContext, a, nestName } = await twoRoommates(browser);
  const code = await newInvite(a);

  const other = await browser.newContext();
  const c = await other.newPage();
  await signIn(c, uniqueEmail("cross"));
  await completeProfile(c, "Meera", "Sunny");
  await createNest(c, "Meera's own nest");

  // Meera now joins Akshat and Yashwardhan's nest from the front page, next to her own.
  await front(c);
  await c.locator("#join-code").fill(code);
  await c.getByRole("button", { name: "Join nest" }).click();
  await expect(c).toHaveURL(/\/n\/[0-9a-f-]+\?welcome=1/);
  await front(c);
  await expect(c.getByRole("link", { name: new RegExp(nestName) })).toBeVisible();
  await expect(c.getByRole("link", { name: /Meera's own nest/ })).toBeVisible();

  await aContext.close();
  await bContext.close();
  await other.close();
});
