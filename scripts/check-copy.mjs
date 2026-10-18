// House style and safety gate over tracked files:
//  - no em dash or en dash, no emoji, no hype words
//  - no competitor names (reads reference/banned.txt when present)
//  - no secrets (private keys, access keys)
// Usage: node scripts/check-copy.mjs
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const SKIP = new Set(["RULES_EXTRACT.md", "scripts/check-copy.mjs", "package-lock.json"]);
// Files that legitimately mention the placeholder tokens (templates, task lists, workflow syntax).
const TOKEN_SKIP = (f) => f.startsWith(".github/") || f.startsWith("docs/templates/") || f === "TASK.md" || f === "PROGRESS.md";
const SKIP_EXT = /\.(png|jpg|jpeg|webp|gif|ico|mp4|woff2?|zip|pdf)$/i;
const HYPE = ["revolutionary", "seamless", "cutting-edge", "world-class", "military-grade", "zero-trust", "unbreakable"];
const banned = existsSync("reference/banned.txt")
  ? readFileSync("reference/banned.txt", "utf8").split("\n").map((s) => s.trim()).filter(Boolean)
  : [];
const emoji = /\p{Extended_Pictographic}/u;
const secrets = [
  [/(PRIVATE_KEY|SECRET|SEED)\s*[=:]\s*["']?(0x)?[0-9a-fA-F]{64}/, "private key assignment"],
  [/ARKIV_ACCESS_KEY\s*=\s*[A-Za-z0-9_\-]{12,}/, "access key assignment"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "PEM private key"],
];

const files = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean);
let failures = 0;
const fail = (f, line, msg) => {
  failures++;
  console.error(`${f}:${line}: ${msg}`);
};
for (const f of files) {
  if (SKIP.has(f) || SKIP_EXT.test(f) || !existsSync(f)) continue;
  let text;
  try {
    text = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  const lines = text.split("\n");
  lines.forEach((ln, i) => {
    const n = i + 1;
    if (ln.includes("—")) fail(f, n, "em dash");
    if (ln.includes("–")) fail(f, n, "en dash");
    if (emoji.test(ln)) fail(f, n, "emoji");
    const low = ln.toLowerCase();
    for (const h of HYPE) if (low.includes(h)) fail(f, n, `hype word "${h}"`);
    for (const b of banned) if (low.includes(b.toLowerCase())) fail(f, n, "banned name");
    for (const [re, why] of secrets) if (re.test(ln)) fail(f, n, `secret: ${why}`);
    if (!TOKEN_SKIP(f)) for (const tok of ["LIVE_URL", "VIDEO_URL", "PENDING", "BASELINE_SHA", ...(f.endsWith(".md") ? ["{{"] : [])]) if (ln.includes(tok)) fail(f, n, `unfilled token ${tok}`);
    if (/\bTTL\b/.test(ln)) fail(f, n, 'say "Entity Expiration", not TTL');
  });
}
if (failures) {
  console.error(`check-copy: ${failures} problem(s)`);
  process.exit(1);
}
console.log(`check-copy: ${files.length} tracked files clean`);
