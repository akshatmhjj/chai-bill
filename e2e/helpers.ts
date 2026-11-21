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
    // Some pages (such as the front page) have no <main>; fall back to the React root's first element.
    const main = document.querySelector("main") ?? document.body.querySelector("div");
    return !!main && Object.keys(main).some((key) => key.startsWith("__reactFiber"));
  });
}

/** The nest each page is working in. Set by createNest / joinNest; nest pages live under /n/<id>. */
const nestOf = new WeakMap<Page, string>();
const NEST_PAGES = ["/expenses", "/balances", "/shopping", "/activity", "/invite", "/settings"];

/**
 * Navigates and waits for hydration. Nest paths ("/", "/expenses", "/balances", "/shopping",
 * "/activity", "/invite") are resolved inside the page's current nest; everything else is literal.
 */
export async function open(page: Page, path: string): Promise<void> {
  const nestId = nestOf.get(page);
  let target = path;
  if (nestId) {
    if (path === "/") target = `/n/${nestId}`;
    else if (NEST_PAGES.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`))) target = `/n/${nestId}${path}`;
  }
  await page.goto(target);
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

/** Step one of onboarding: name and avatar (matched by the start of its label, e.g. "Fox"). Lands on the front page. */
export async function completeProfile(page: Page, name: string, avatar: string): Promise<void> {
  await expect(page).toHaveURL(/\/onboarding\/profile/);
  await ready(page);
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("radio", { name: new RegExp(`^${avatar}`) }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await ready(page);
}

/** From the front page, make a nest. Returns its id and the short invite code shown on the invite screen. */
export async function createNest(page: Page, nestName: string): Promise<{ nestId: string; code: string }> {
  await open(page, "/nests/new");
  await page.getByLabel("Nest name").fill(nestName);
  await page.getByRole("button", { name: /Make the nest/ }).click();
  await expect(page).toHaveURL(/\/n\/[0-9a-f-]+\/invite/);
  const nestId = /\/n\/([0-9a-f-]+)\//.exec(page.url())?.[1] ?? "";
  nestOf.set(page, nestId);
  await ready(page);
  const label = await page.locator('[aria-label^="Invite code "]').getAttribute("aria-label");
  return { nestId, code: (label ?? "").replace("Invite code ", "") };
}

/** Joins a nest with its code, through the join link (the same path a QR scan takes). */
export async function joinNest(page: Page, code: string): Promise<void> {
  await open(page, `/join/${code.replace(/[^a-zA-Z0-9]/g, "")}`);
  await page.getByRole("button", { name: "Join this nest" }).click();
  await expect(page).toHaveURL(/\/n\/[0-9a-f-]+\?welcome=1/);
  nestOf.set(page, /\/n\/([0-9a-f-]+)\?/.exec(page.url())?.[1] ?? "");
  await ready(page);
}

export interface Roommates {
  aContext: BrowserContext;
  bContext: BrowserContext;
  /** Akshat, who made the nest (fox). */
  a: Page;
  /** Yashwardhan, who joined it (panda). */
  b: Page;
  nestName: string;
  nestId: string;
}

const DESKTOP = { width: 1280, height: 860 };
const PHONE = { width: 390, height: 844 };

/** Two signed-in housemates in separate browser contexts, both on the nest's Home, sharing one nest. */
export async function twoRoommates(browser: Browser, opts: { phone?: boolean; nestName?: string } = {}): Promise<Roommates> {
  const viewport = opts.phone ? PHONE : DESKTOP;
  const extra = opts.phone ? { isMobile: true, hasTouch: true } : {};
  const aContext = await browser.newContext({ viewport, ...extra });
  const bContext = await browser.newContext({ viewport, ...extra });
  const a = await aContext.newPage();
  const b = await bContext.newPage();
  const nestName = opts.nestName ?? `Nest ${Date.now()}`;

  await signIn(a, uniqueEmail("akshat"));
  await completeProfile(a, "Akshat", "Fox");
  const { nestId, code } = await createNest(a, nestName);

  await signIn(b, uniqueEmail("yash"));
  await completeProfile(b, "Yashwardhan", "Panda");
  await joinNest(b, code);

  // Akshat's Home lists the joiner. Reload until the join is visible (the join may land after the first load).
  await expect(async () => {
    await open(a, "/");
    await expect(a.locator("main").getByText(/Yashwardhan/).first()).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  return { aContext, bContext, a, b, nestName, nestId };
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

/** On the nest's invite screen, make a fresh code (the old one and its QR stop working). Returns the new code. */
export async function newInvite(page: Page): Promise<string> {
  await open(page, "/invite");
  const code = page.locator('[aria-label^="Invite code "]');
  const before = await code.getAttribute("aria-label");
  await page.getByRole("button", { name: "Make a new code" }).click();
  // Wait for the server to issue the new code; the old one stays on screen until then.
  await expect(code).not.toHaveAttribute("aria-label", before ?? "");
  return ((await code.getAttribute("aria-label")) ?? "").replace("Invite code ", "");
}

/** The front page (the list of nests), reached directly rather than through a nest. */
export async function front(page: Page): Promise<void> {
  await page.goto("/");
  await ready(page);
}
