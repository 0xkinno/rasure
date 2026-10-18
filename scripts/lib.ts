// Shared helpers for scripts. Reads keys from .secrets/wallets.json (gitignored). Never prints keys.
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient } from "@arkiv-network/sdk";
import { http } from "viem";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { privateKeyToAccount } from "viem/accounts";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Load .env.local (gitignored) into process.env without overriding real environment variables.
const envFile = resolve(ROOT, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && m[2] !== "" && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
export const RPC_HTTP = process.env.ARKIV_RPC ?? "https://rpc.tiramisu.db-chain.testnet.arkiv.network";
export const EXPLORER = "https://tiramisu.explorer.arkiv.network";
export const ROLES = ["dispatcher", "volunteerA", "volunteerB", "forger", "probe", "drip", "auditor"] as const;
export type Role = (typeof ROLES)[number];

export function loadKeys(): Record<Role, `0x${string}`> {
  // Per role: the ROLE_PRIVATE_KEY environment variable wins; otherwise .secrets/wallets.json. A role may be absent
  // (CI holds only the keys it needs); asking for it then throws.
  const p = resolve(ROOT, ".secrets/wallets.json");
  const file: Record<string, string> = existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {};
  const out: Partial<Record<Role, `0x${string}`>> = {};
  for (const r of ROLES) {
    const v = process.env[`${r.toUpperCase()}_PRIVATE_KEY`] || file[r];
    if (v) out[r] = v as `0x${string}`;
  }
  return new Proxy(out, {
    get(t, k: string) {
      if (!t[k as Role]) throw new Error(`no key for role ${k}: set ${k.toUpperCase()}_PRIVATE_KEY or run npx tsx scripts/keys.ts`);
      return t[k as Role];
    },
  }) as Record<Role, `0x${string}`>;
}

export function accountFor(role: Role) {
  return privateKeyToAccount(loadKeys()[role]);
}

/** Optional Hub access key, from env ARKIV_ACCESS_KEY, sent as X-API-KEY. Never logged. */
export function transport() {
  const key = process.env.ARKIV_ACCESS_KEY;
  return http(RPC_HTTP, key ? { retryCount: 3, retryDelay: 1500, timeout: 60_000, fetchOptions: { headers: { "X-API-KEY": key } } } : { retryCount: 3, retryDelay: 1500, timeout: 60_000 });
}

export const reader = () => createPublicClient({ chain: tiramisu, transport: transport() });
export const walletFor = (role: Role) =>
  createWalletClient({ chain: tiramisu, transport: transport(), account: accountFor(role) });

export function writeResult(name: string, data: unknown) {
  const dir = resolve(ROOT, "proof/results");
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, name);
  writeFileSync(file, JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2) + "\n");
  return file;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const today = () => new Date().toISOString().slice(0, 10);
