import { expect, type APIRequestContext, type Browser, type BrowserContext, type Page } from "@playwright/test";

const MAILPIT = "http://127.0.0.1:54324/api/v1";
let counter = 0;

/** A fresh address per test, so runs never collide in the shared local database. */
export function uniqueEmail(label: string): string {
  counter += 1;
  return `${label}.${Date.now()}.${counter}@test.local`;
}

/** Reads the newest sign-in link for `email` from the local mail inbox. */
async function magicLinkFor(request: APIRequestContext, email: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const list = await (await request.get(`${MAILPIT}/messages`)).json();
    const message = (list.messages as { ID: string; To: { Address: string }[] }[]).find((m) => m.To.some((t) => t.Address === email));
    if (message) {
      const detail = await (await request.get(`${MAILPIT}/message/${message.ID}`)).json();
      const match = /href="([^"]*verify[^"]*)"/.exec(detail.HTML as string);
      if (match) return match[1].replace(/&amp;/g, "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`no sign-in email arrived for ${email}`);
}

/**
 * Waits until the page has loaded and React has attached. Pages are server-rendered, so a click
 * made before hydration does nothing.
 */
export async function ready(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => {
    const main = document.querySelector("main");
    return !!main && Object.keys(main).some((key) => key.startsWith("__reactFiber"));
  });
}

/** Navigates and waits for hydration. */
export async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await ready(page);
}

/** Signs in through the real magic-link flow. Lands wherever the app sends a new or returning person. */
export async function signIn(page: Page, email: string): Promise<void> {
  await open(page, "/login");
  await page.getByLabel("Email").fill(email);
  await expect(async () => {
    await page.getByRole("button", { name: /Send sign-in link/ }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  await page.goto(await magicLinkFor(page.request, email));
  await ready(page);
}

/** Step one of onboarding: name and avatar (matched by the start of its label, e.g. "Fox"). */
export async function completeProfile(page: Page, name: string, avatar: string): Promise<void> {
  await expect(page).toHaveURL(/\/onboarding\/profile/);
  await ready(page);
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("radio", { name: new RegExp(`^${avatar}`) }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page).toHaveURL(/\/onboarding\/flat/);
  await ready(page);
}

/** Step two: start a flat. Returns the invite code shown on step three. */
export async function createFlat(page: Page, flatName: string): Promise<string> {
  await page.getByLabel("Flat name").fill(flatName);
  await page.getByRole("button", { name: /Create flat/ }).click();
  await expect(page).toHaveURL(/\/onboarding\/invite/);
  await ready(page);
  const label = await page.locator('[aria-label^="Invite code "]').getAttribute("aria-label");
  return (label ?? "").replace("Invite code ", "");
}

/** Step two, the other way: join with a code. */
export async function joinFlat(page: Page, code: string): Promise<void> {
  await page.getByRole("radio", { name: "Join with a code" }).click();
  await page.getByLabel("Invite code").fill(code);
  await page.getByRole("button", { name: /Join flat/ }).click();
  await expect(page).toHaveURL(/\/\?welcome=1/);
  await ready(page);
}

export interface Roommates {
  aContext: BrowserContext;
  bContext: BrowserContext;
  /** Akshat, who created the flat (fox). */
  a: Page;
  /** Yashwardhan, who joined it (panda). */
  b: Page;
  flatName: string;
}

const DESKTOP = { width: 1280, height: 860 };
const PHONE = { width: 390, height: 844 };

/** Two signed-in roommates in separate browser contexts, both on Home, sharing one flat. */
export async function twoRoommates(browser: Browser, opts: { phone?: boolean; flatName?: string } = {}): Promise<Roommates> {
  const viewport = opts.phone ? PHONE : DESKTOP;
  const extra = opts.phone ? { isMobile: true, hasTouch: true } : {};
  const aContext = await browser.newContext({ viewport, ...extra });
  const bContext = await browser.newContext({ viewport, ...extra });
  const a = await aContext.newPage();
  const b = await bContext.newPage();
  const flatName = opts.flatName ?? `Flat ${Date.now()}`;

  await signIn(a, uniqueEmail("akshat"));
  await completeProfile(a, "Akshat", "Fox");
  const code = await createFlat(a, flatName);

  await signIn(b, uniqueEmail("yash"));
  await completeProfile(b, "Yashwardhan", "Panda");
  await joinFlat(b, code);

  // Akshat's waiting screen flips live and moves on to Home.
  await expect(a.getByText("Yashwardhan joined!")).toBeVisible({ timeout: 20_000 });
  await expect(a).toHaveURL(/\/$/, { timeout: 15_000 });
  await ready(a);
  return { aContext, bContext, a, b, flatName };
}

/** Adds a shared expense through the real form: amount, description, and everything else left at its defaults. */
export async function addExpense(
  page: Page,
  options: { amount: string; description: string; category?: string; personal?: boolean; paidBy?: string },
): Promise<void> {
  await open(page, "/expenses/new");
  await page.locator("#expense-amount").fill(options.amount);
  await page.locator("#expense-description").fill(options.description);
  if (options.category) {
    const chip = page.getByRole("button", { name: options.category, exact: true });
    // A category may already be suggested from the description; only tap it if it is not.
    if ((await chip.getAttribute("aria-pressed")) !== "true") await chip.click();
  }
  if (options.personal) await page.getByRole("radio", { name: "Just me" }).click();
  if (options.paidBy) await page.getByRole("radio", { name: new RegExp(options.paidBy) }).click();
  await page.getByRole("button", { name: /^Add .*expense$/ }).click();
  await expect(page).toHaveURL(/\/expenses$/);
  await ready(page);
  await expect(page.getByText(options.description).first()).toBeVisible();
}

/** The balance hero (the "Your balance" region). */
export function hero(page: Page) {
  return page.getByRole("region", { name: "Your balance" });
}

/** From the profile, make a fresh single-use invite code for the next flatmate. */
export async function newInviteFromProfile(page: Page): Promise<string> {
  await open(page, "/profile");
  await page.getByRole("button", { name: "New code" }).click();
  const code = page.locator('[aria-label^="Invite code "]');
  await expect(code).toBeVisible();
  return ((await code.getAttribute("aria-label")) ?? "").replace("Invite code ", "");
}
