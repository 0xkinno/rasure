// Generates one key per role into .secrets/wallets.json (gitignored). Prints addresses only.
// Refuses to overwrite an existing file.
import { existsSync, mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { resolve } from "node:path";
import { generatePrivateKey, privateKeyToAddress } from "viem/accounts";
import { ROLES, ROOT } from "./lib";

const dir = resolve(ROOT, ".secrets");
const file = resolve(dir, "wallets.json");
if (existsSync(file)) {
  console.error("refusing to overwrite .secrets/wallets.json (delete it yourself if you mean it)");
  process.exit(1);
}
mkdirSync(dir, { recursive: true });
const keys = Object.fromEntries(ROLES.map((r) => [r, generatePrivateKey()]));
writeFileSync(file, JSON.stringify(keys, null, 2) + "\n", { mode: 0o600 });
try { chmodSync(file, 0o600); } catch { /* not supported on Windows */ }
for (const r of ROLES) console.log(r.padEnd(12), privateKeyToAddress(keys[r] as `0x${string}`));
console.log("keys written to .secrets/wallets.json (never commit, never paste)");
