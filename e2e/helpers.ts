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
    const message = (list.messages as { ID: string; To: { Address: string }[] }[]).find((m) =>
      m.To.some((t) => t.Address === email),
    );
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
 * Waits until React has attached to the page. Pages are server-rendered, so a click or fill
 * made before hydration does nothing (a form submit goes through natively instead).
 */
export async function ready(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => {
    const main = document.querySelector("main");
    return !!main && Object.keys(main).some((key) => key.startsWith("__reactFiber"));
  });
}

/** Navigates and waits for hydration. Use for every page the tests interact with. */
export async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await ready(page);
}

/** Signs in through the real magic-link flow and lands on /household. */
export async function signIn(page: Page, email: string): Promise<void> {
  await open(page, "/login");
  await page.getByLabel("Email").fill(email);
  await expect(async () => {
    await page.getByRole("button", { name: "Send sign-in link" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  await page.goto(await magicLinkFor(page.request, email));
  await page.waitForURL("**/household");
}

export async function createFlat(page: Page, flatName: string, yourName: string): Promise<void> {
  await ready(page);
  await expect(async () => {
    await page.getByPlaceholder("Flat name").fill(flatName);
    await page.getByPlaceholder("Your name").first().fill(yourName);
    await page.getByRole("button", { name: "Create flat" }).click();
    await expect(page.getByRole("heading", { name: flatName })).toBeVisible({ timeout: 4_000 });
  }).toPass({ timeout: 45_000 });
}

/** Creates an invite on the household page and returns the 32-character code. */
export async function createInvite(page: Page): Promise<string> {
  await ready(page);
  const button = page.getByRole("button", { name: "Create invite code" });
  const code = page.locator("p.font-mono").first();
  // The page is server-rendered: a click made before React hydrates does nothing, so retry.
  await expect(async () => {
    await button.click();
    await expect(code).toContainText(/[0-9a-f]{32}/, { timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  return ((await code.innerText()).split("\n")[0] ?? "").trim();
}

export async function joinFlat(page: Page, code: string, yourName: string): Promise<void> {
  await ready(page);
  await expect(async () => {
    await page.getByPlaceholder("Invite code").fill(code);
    await page.getByPlaceholder("Your name").last().fill(yourName);
    await page.getByRole("button", { name: "Join flat" }).click();
    await expect(page.getByText("Both roommates have joined.")).toBeVisible({ timeout: 4_000 });
  }).toPass({ timeout: 45_000 });
}

export interface Roommates {
  aliceContext: BrowserContext;
  bobContext: BrowserContext;
  alice: Page;
  bob: Page;
}

/** Two signed-in roommates in separate browser contexts, sharing one flat. */
export async function twoRoommates(browser: Browser): Promise<Roommates> {
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();
  const alice = await aliceContext.newPage();
  const bob = await bobContext.newPage();

  await signIn(alice, uniqueEmail("akshat"));
  await createFlat(alice, `Flat ${Date.now()}`, "Akshat");
  const code = await createInvite(alice);

  await signIn(bob, uniqueEmail("yash"));
  await joinFlat(bob, code, "Yashwardhan");
  await alice.reload();
  await expect(alice.getByText("Both roommates have joined.")).toBeVisible();

  return { aliceContext, bobContext, alice, bob };
}

/** Adds a shared expense paid by the signed-in user, split equally with the flat. */
export async function addSharedExpense(page: Page, description: string, amountRupees: string): Promise<void> {
  await open(page, "/expenses/new");
  await page.getByLabel("Description").fill(description);
  await page.getByLabel("Amount (₹)").fill(amountRupees);
  // The preview is computed after hydration, so wait for its totals before submitting.
  await expect(page.locator("section[aria-live]")).toContainText("Total");
  await page.getByRole("button", { name: "Save expense" }).click();
  await page.waitForURL("**/expenses");
  await expect(page.getByText(description)).toBeVisible();
}
