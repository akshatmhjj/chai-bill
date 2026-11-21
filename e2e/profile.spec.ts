import { expect, test } from "@playwright/test";
import { open, ready, twoRoommates } from "./helpers";

test("changing your name and avatar updates your profile and reaches your roommate live", async ({ browser }) => {
  const { aContext, bContext, a, b } = await twoRoommates(browser);
  await open(b, "/profile");
  await expect(b.getByText("Akshat", { exact: true })).toBeVisible();

  await open(a, "/profile");
  await a.getByRole("button", { name: "Edit profile" }).click();
  const dialog = a.getByRole("dialog", { name: "Edit your profile" });
  await dialog.getByLabel("Your name").fill("Akshat M");
  await dialog.getByRole("radio", { name: /^Cat/ }).click();
  await dialog.getByRole("button", { name: "Save changes" }).click();

  await expect(a.getByText("Profile updated")).toBeVisible();
  await expect(a.getByRole("heading", { name: "Akshat M" })).toBeVisible();
  await expect(a.getByRole("main").getByText("Cat · Does what it likes")).toBeVisible();

  await expect(b.getByText("Akshat M", { exact: true })).toBeVisible({ timeout: 20_000 });

  await aContext.close();
  await bContext.close();
});

test("the theme can be set to dark or light, and is remembered after a reload", async ({ browser }) => {
  const { aContext, bContext, a } = await twoRoommates(browser);
  await open(a, "/profile");
  const main = a.getByRole("main");

  await main.getByRole("radio", { name: "Dark" }).click();
  await expect(a.locator("html")).toHaveAttribute("data-theme", "dark");
  await a.reload();
  await ready(a);
  await expect(a.locator("html")).toHaveAttribute("data-theme", "dark");

  await main.getByRole("radio", { name: "Light" }).click();
  await expect(a.locator("html")).toHaveAttribute("data-theme", "light");
  await a.reload();
  await ready(a);
  await expect(a.locator("html")).toHaveAttribute("data-theme", "light");

  await aContext.close();
  await bContext.close();
});

test("Auto follows the device's appearance", async ({ browser }) => {
  const { aContext, bContext, a } = await twoRoommates(browser);
  await open(a, "/profile");
  await a.getByRole("main").getByRole("radio", { name: "Auto" }).click();

  await a.emulateMedia({ colorScheme: "dark" });
  await expect(a.locator("html")).toHaveAttribute("data-theme", "dark");
  await a.emulateMedia({ colorScheme: "light" });
  await expect(a.locator("html")).toHaveAttribute("data-theme", "light");

  await aContext.close();
  await bContext.close();
});

test("a sheet traps focus, closes on Escape, and hands focus back", async ({ browser }) => {
  const { aContext, bContext, a } = await twoRoommates(browser);
  await open(a, "/profile");

  const opener = a.getByRole("button", { name: "Edit profile" });
  await opener.click();
  const dialog = a.getByRole("dialog", { name: "Edit your profile" });
  await expect(dialog).toBeVisible();

  // Tabbing never leaves the dialog.
  for (let i = 0; i < 20; i++) {
    await a.keyboard.press("Tab");
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }

  await a.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();

  await aContext.close();
  await bContext.close();
});

test("signing out returns to the sign-in page and protects the app", async ({ browser }) => {
  const { aContext, bContext, a } = await twoRoommates(browser);
  await open(a, "/profile");
  await a.getByRole("button", { name: "Sign out" }).click();
  await expect(a).toHaveURL(/\/login/);

  await a.goto("/expenses");
  await expect(a).toHaveURL(/\/login/);

  await aContext.close();
  await bContext.close();
});
