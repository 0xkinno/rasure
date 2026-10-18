// Generates one key per role into .secrets/wallets.json (gitignored). Prints addresses only.
// Adds any missing role to an existing file and never overwrites an existing key.
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { resolve } from "node:path";
import { generatePrivateKey, privateKeyToAddress } from "viem/accounts";
import { ROLES, ROOT } from "./lib";

const dir = resolve(ROOT, ".secrets");
const file = resolve(dir, "wallets.json");
const existing: Record<string, string> = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
mkdirSync(dir, { recursive: true });
const keys: Record<string, string> = { ...existing };
for (const r of ROLES) if (!keys[r]) keys[r] = generatePrivateKey();
writeFileSync(file, JSON.stringify(keys, null, 2) + "\n", { mode: 0o600 });
try {
  chmodSync(file, 0o600);
} catch {
  /* not supported on Windows */
}
for (const r of ROLES) console.log(r.padEnd(12), privateKeyToAddress(keys[r] as `0x${string}`), existing[r] ? "" : "(new)");
console.log("keys are in .secrets/wallets.json (never commit, never paste)");
