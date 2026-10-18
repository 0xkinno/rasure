// Live end-to-end: closeout, zone filter by blind tag, a forged ride shown as ignored with its creator, ciphertext replay
// refusal, a member publishing a device key, and the dispatcher rekeying (removing that member). Real signed transactions.
// Wallets: probe = dispatcher, drip = volunteer (member), forger = stranger who joined the circle and writes a ride.
// Run after scripts/seed.ts has finished (the seed also uses the forger wallet). Run: npm run qa:live
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { createWalletClient, createPublicClient, http, type Hex } from "viem";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { accountFor, RPC_HTTP, writeResult, today, type Role } from "../../scripts/lib";

const hashes: { who: string; hash: string }[] = [];

async function withWallet(ctx: BrowserContext, role: Role) {
  const account = accountFor(role);
  const pub = createPublicClient({ chain: tiramisu, transport: http(RPC_HTTP) });
  const wc = createWalletClient({ chain: tiramisu, transport: http(RPC_HTTP), account });
  await ctx.exposeFunction("__rpc", async (method: string, params: unknown[]) => {
    if (method === "eth_requestAccounts" || method === "eth_accounts") return [account.address];
    if (method === "wallet_switchEthereumChain") return null;
    if (method === "eth_chainId") return "0x7614d1";
    if (method === "eth_sendTransaction") {
      const tx = (params[0] ?? {}) as { to: Hex; data?: Hex; value?: Hex; gas?: Hex };
      const hash = await wc.sendTransaction({ to: tx.to, data: tx.data, value: tx.value ? BigInt(tx.value) : undefined, gas: tx.gas ? BigInt(tx.gas) : undefined });
      hashes.push({ who: role, hash });
      return hash;
    }
    return await pub.request({ method: method as never, params: params as never });
  });
  await ctx.addInitScript(() => {
    (window as any).ethereum = { request: ({ method, params }: { method: string; params?: unknown[] }) => (window as any).__rpc(method, params ?? []), on() {}, removeListener() {} };
  });
}
async function connect(page: Page) {
  await page.getByRole("button", { name: "Connect wallet" }).first().click();
  await page.getByRole("button", { name: /Browser wallet/ }).click();
  await expect(page.locator("header .chip").first()).toBeVisible({ timeout: 20_000 });
}
const confirmed = (p: Page, what: string) => expect(p.getByText(new RegExp(`${what} confirmed`))).toBeVisible({ timeout: 90_000 });
const ride = (p: Page) => p.locator(".card .mono", { hasText: "SYN-gate-4" }).first();

test("closeout, zone filter, forged ride ignored, replay refused, rekey", async ({ browser }) => {
  test.setTimeout(900_000);
  const mk = async (role: Role) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await withWallet(ctx, role);
    return { ctx, page: await ctx.newPage() };
  };
  const D = await mk("probe");
  await D.page.goto("/board", { waitUntil: "networkidle" });
  await connect(D.page);
  await D.page.getByRole("button", { name: "Create circle" }).click();
  await confirmed(D.page, "Create circle");
  await D.page.getByRole("button", { name: /Post ride/ }).click();
  await confirmed(D.page, "Post ride");
  await expect(ride(D.page)).toBeVisible({ timeout: 60_000 });
  await D.page.getByRole("button", { name: "Show join QR" }).click();
  const joinUrl = (await D.page.locator(".card .hash", { hasText: "/join#" }).first().textContent())!.trim();

  // member joins, publishes a device key, claims
  const V = await mk("drip");
  await V.page.goto(joinUrl, { waitUntil: "networkidle" });
  await V.page.waitForURL(/\/board\?circle=/, { timeout: 30_000 });
  await connect(V.page);
  await expect(ride(V.page)).toBeVisible({ timeout: 60_000 });
  await V.page.getByRole("button", { name: /Publish my device key/ }).click();
  await confirmed(V.page, "Publish device key");
  await V.page.getByRole("button", { name: /Claim/ }).first().click();
  await confirmed(V.page, "Claim ride");

  // stranger joins the same circle but is not a trusted dispatcher: forged ride
  const S = await mk("forger");
  await S.page.goto(joinUrl, { waitUntil: "networkidle" });
  await S.page.waitForURL(/\/board\?circle=/, { timeout: 30_000 });
  await connect(S.page);
  await S.page.getByRole("button", { name: "Post as a stranger" }).click();
  await confirmed(S.page, "Post as a stranger");

  // dispatcher: sees the claim, assigns, closes out, filters by zone, sees the forged ride ignored, replay refused, rekeys
  await D.page.reload({ waitUntil: "networkidle" });
  await connect(D.page);
  await expect(D.page.getByText(/claim by/)).toBeVisible({ timeout: 90_000 });
  await D.page.getByRole("button", { name: /^Assign/ }).first().click();
  await confirmed(D.page, "Assign claim");
  await D.page.reload({ waitUntil: "networkidle" });
  await connect(D.page);
  await D.page.getByRole("button", { name: "Close out" }).first().click();
  await confirmed(D.page, "Close out");

  await D.page.getByLabel("Zone filter (blind tag)").or(D.page.locator("select").filter({ hasText: "all zones" })).first().selectOption("SYN-zone-south");
  await expect(D.page.getByText(/No live rides/)).toBeVisible({ timeout: 60_000 });
  await D.page.locator("select").filter({ hasText: "all zones" }).first().selectOption("SYN-zone-north");
  await expect(ride(D.page)).toBeVisible({ timeout: 60_000 });
  await D.page.locator("select").filter({ hasText: "all zones" }).first().selectOption("");

  await D.page.reload({ waitUntil: "networkidle" });
  await connect(D.page);
  await expect(D.page.getByText(/forged ride/)).toBeVisible({ timeout: 90_000 });
  await D.page.screenshot({ path: "docs/screens/live-board-ignored.png" });
  await D.page.getByRole("button", { name: /Replay a ciphertext/ }).click();
  await expect(D.page.getByText(/Refused \(auth_failed\)/)).toBeVisible({ timeout: 30_000 });

  // Members are opt-in: tick nobody to remove everyone, so an unknown wallet that published a key gets nothing.
  await expect(D.page.getByText(/keep 0x/).first()).toBeVisible({ timeout: 60_000 });
  await D.page.getByRole("button", { name: /Rekey now/ }).click();
  await confirmed(D.page, "Rekey");
  await expect(D.page.getByText(/Rekey posted/)).toBeVisible();
  await D.page.screenshot({ path: "docs/screens/live-board-rekeyed.png" });

  writeResult(`e2e-forgery-rekey-${today()}.json`, { date: today(), note: "real signed transactions through the board UI", transactions: hashes });
  await D.ctx.close();
  await V.ctx.close();
  await S.ctx.close();
});
