// Live end-to-end write flow on Tiramisu with REAL signed transactions. A node-side EIP-1193 provider (backed by a
// funded test key from .secrets) is injected as window.ethereum so the real board UI creates a circle, posts a ride,
// a second profile joins from the QR link, claims, and the dispatcher assigns. Spends a few cents of test GLM.
// Run: npx playwright test -c playwright.live.config.ts
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
    const provider = { request: ({ method, params }: { method: string; params?: unknown[] }) => (window as any).__rpc(method, params ?? []), on() {}, removeListener() {} };
    (window as any).ethereum = provider;
  });
}

async function connect(page: Page) {
  await page.getByRole("button", { name: "Connect wallet" }).first().click();
  await page.getByRole("button", { name: /Browser wallet/ }).click();
  await expect(page.locator("header .chip").first()).toBeVisible({ timeout: 20_000 });
}

test("dispatcher creates a circle and posts a ride; volunteer joins and claims; dispatcher assigns", async ({ browser }) => {
  test.setTimeout(420_000);
  const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await withWallet(dctx, "probe");
  const d = await dctx.newPage();
  await d.goto("/board", { waitUntil: "networkidle" });
  await connect(d);
  await d.getByRole("button", { name: "Create circle" }).click();
  await expect(d.getByText(/Create circle confirmed/)).toBeVisible({ timeout: 90_000 });

  await d.getByRole("button", { name: /Post ride/ }).click();
  await expect(d.getByText(/Post ride confirmed/)).toBeVisible({ timeout: 90_000 });
  await expect(d.locator(".card .mono", { hasText: "SYN-gate-4" }).first()).toBeVisible({ timeout: 60_000 });
  await d.screenshot({ path: "docs/screens/live-board-dispatcher.png" });

  await d.getByRole("button", { name: "Show join QR" }).click();
  const joinUrl = (await d.locator(".card .hash", { hasText: "/join#" }).first().textContent())!.trim();
  expect(joinUrl).toContain("/join#");

  const vctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await withWallet(vctx, "drip");
  const v = await vctx.newPage();
  await v.goto(joinUrl, { waitUntil: "networkidle" });
  await v.waitForURL(/\/board\?circle=/, { timeout: 30_000 });
  expect(v.url()).not.toContain("#"); // the fragment is gone from the address bar
  await connect(v);
  await expect(v.locator(".card .mono", { hasText: "SYN-gate-4" }).first()).toBeVisible({ timeout: 60_000 });
  await v.getByRole("button", { name: /Claim/ }).first().click();
  await expect(v.getByText(/Claim ride confirmed/)).toBeVisible({ timeout: 90_000 });

  await d.reload({ waitUntil: "networkidle" });
  await connect(d);
  await expect(d.getByText(/claim by/)).toBeVisible({ timeout: 90_000 });
  await d.getByRole("button", { name: /^Assign/ }).first().click();
  await expect(d.getByText(/Assign claim confirmed/)).toBeVisible({ timeout: 90_000 });
  await d.screenshot({ path: "docs/screens/live-board-assigned.png" });

  writeResult(`e2e-write-${today()}.json`, { date: today(), note: "real signed transactions through the board UI", transactions: hashes });
  await dctx.close();
  await vctx.close();
});
