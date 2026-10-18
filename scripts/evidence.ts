// Generates, from files and the node, with no hand-typed hash:
//   arkiv/evidence.md            every transaction in the manifests and results
//   arkiv/wallets.md             each wallet's role, transaction count (nonce) and first known transaction
//   docs/txfeatures.md           one transaction per Arkiv feature, with what it shows (embedded in the README)
//   apps/web/public/proof/evidence.json, apps/web/public/proof/mcp.json, apps/web/public/proof/wallets.json
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROLES, ROOT, accountFor, reader } from "./lib";

const EXPLORER = "https://tiramisu.explorer.arkiv.network";
const link = (tx: string) => `[${tx.slice(0, 12)}...](${EXPLORER}/tx/${tx})`;
const rd = (p: string) => (existsSync(resolve(ROOT, p)) ? JSON.parse(readFileSync(resolve(ROOT, p), "utf8")) : null);
const resDir = resolve(ROOT, "proof/results");
const results = existsSync(resDir) ? readdirSync(resDir).filter((f) => f.endsWith(".json")).sort() : [];
const newest = (prefix: string) => {
  const f = results.filter((x) => x.startsWith(prefix)).pop();
  return f ? { file: f, d: rd(`proof/results/${f}`) } : null;
};

const rows: { label: string; tx?: string; key?: string }[] = [];
const byRole: Record<string, string[]> = {};
const tag = (role: string, tx?: string) => {
  if (tx) (byRole[role] ??= []).push(tx);
};

for (const f of results.filter((x) => x.startsWith("d1-"))) {
  const d = rd(`proof/results/${f}`);
  rows.push({ label: "D1 probe entity (expired; payload recovered from this transaction)", tx: d.txHash, key: d.entityKey });
  tag("probe", d.txHash);
}
const seed = rd("proof/seed-manifest.json");
for (const r of seed?.records ?? []) {
  rows.push({ label: `demo circle ${r.type} by ${r.role}, epoch ${r.epoch}`, tx: r.txHash, key: r.key });
  tag(r.role, r.txHash);
}
const drill = rd("proof/drill-manifest.json");
for (const s of drill?.scenarios ?? []) for (const r of s.records) {
  rows.push({ label: `drill ${s.id} ${r.type}, epoch ${r.epoch}`, tx: r.txHash, key: r.key });
  tag("dispatcher", r.txHash);
}
const rekeyM = rd("proof/rekey-manifest.json");
for (const r of rekeyM?.records ?? []) rows.push({ label: `rekey run ${r.type}`, tx: r.txHash, key: r.key });
for (const f of results.filter((x) => x.startsWith("e2e-"))) {
  const d = rd(`proof/results/${f}`);
  for (const t of d.transactions) {
    rows.push({ label: `board UI end-to-end run (${t.who} wallet signed through the app)`, tx: t.hash });
    tag(t.who, t.hash);
  }
}

// ---- one transaction per Arkiv feature
const feat: { feature: string; tx?: string; shows: string }[] = [];
const ride0 = seed?.records?.find((r: { type: string }) => r.type === "ride");
if (ride0) {
  feat.push({ feature: "Entity Expiration per type", tx: ride0.txHash, shows: "A sealed ride whose expiry block equals the key-death block (invariant I1)." });
  feat.push({ feature: "Creation flags (`readonly`)", tx: ride0.txHash, shows: "The same ride is created `readonly` with no permissionless extension." });
  feat.push({ feature: "Attributes vs payload", tx: ride0.txHash, shows: "Six public attributes and a padded ciphertext payload; open it in the stranger view." });
}
const d1 = newest("d1-");
if (d1) feat.push({ feature: "Direct JSON-RPC and calldata", tx: d1.d.txHash, shows: "An expired probe whose payload is recovered from this transaction's input." });
const ext = newest("extend-");
if (ext) feat.push({ feature: "Lifetime Extension", tx: ext.d.extendTx, shows: "The circle lease moved to a later block, read back from the node." });
const batch = newest("batch-");
if (batch) feat.push({ feature: "Batch writes (`executeBatch`)", tx: batch.d.batchTx, shows: "Assign and closeout created in one transaction: both land or neither." });
const open = newest("openNetwork-");
if (open) feat.push({ feature: "Batch: circle plus first ride", tx: open.d.txHash, shows: "\"Open tonight's network\": the circle and the first ride in one transaction." });
const del = newest("delete-");
if (del) {
  feat.push({ feature: "`deleteEntity` (cancel a ride)", tx: del.d.cancelRideTx, shows: "The ride leaves live state at once; its ciphertext stays in the creation transaction until the key dies." });
  feat.push({ feature: "`deleteEntity` (withdraw a claim)", tx: del.d.withdrawClaimTx, shows: "A volunteer removes their own claim." });
}
const gen = newest("gen-");
if (gen) feat.push({ feature: "`patchEntity` (circle `gen`)", tx: gen.d.batchTx, shows: "A rekey entity is created and the circle's public `gen` patched in one transaction." });
const ho = newest("handover-");
if (ho) {
  feat.push({ feature: "`changeOwnership` (shift handover)", tx: ho.d.batchTx, shows: "The circle anchor moves to the morning dispatcher with a sealed handover record (rule I9)." });
  feat.push({ feature: "`$creator` and `$owner` (rule I9)", tx: ho.d.rideByOldHolderAfterHandoverTx, shows: "A ride by the previous holder after the handover: on chain, and ignored by the board." });
}
const tl = newest("tally-");
if (tl) {
  feat.push({ feature: "`permissionlessExtension` (tally)", tx: tl.d.auditorExtendTx, shows: "An auditor wallet that does not own the tally extends it; the same wallet is refused on a ride." });
}
const wsr = newest("events-");
if (wsr) feat.push({ feature: "WebSocket entity events", tx: undefined, shows: `\`watchEntityEvents\` observed ${wsr.d.deleted} EntityDeleted and ${wsr.d.ownershipTransferred} OwnershipTransferred events network-wide while the feature run executed (not filtered to our entities).` });
const d2 = newest("d2-");
if (d2) feat.push({ feature: "Historical queries (`atBlock`)", tx: undefined, shows: `Reads at blocks ${d2.d.samples?.[0]?.block}, ${d2.d.samples?.[1]?.block}, ${d2.d.samples?.[2]?.block} returned the entity; at the expiry block and after it did not (read-only, no transaction).` });
const er = newest("expiresRange-");
if (er) feat.push({ feature: "`$expiresAt` range query", tx: undefined, shows: `Q13 found ${er.d.ridesDyingSoon} rides dying within ${er.d.withinBlocks} blocks (read-only).` });
const mcp = newest("mcp-");
if (mcp) feat.push({ feature: "Arkiv MCP (outside the product)", tx: undefined, shows: `The Arkiv MCP confirmed ${mcp.d.transactionsReportedSuccess} of ${mcp.d.transactionsChecked} transactions and agreed with our reader on ${mcp.d.agreementWithOurReader} of ${mcp.d.entitiesChecked} entities.` });

for (const [k, label] of [["delete", "deleteEntity"], ["gen", "patchEntity batch"], ["handover", "changeOwnership batch"], ["openNetwork", "circle plus first ride"], ["tally", "tally"], ["extend", "Lifetime Extension"]] as const) {
  const r = newest(`${k}-`);
  if (!r) continue;
  for (const [name, v] of Object.entries(r.d as Record<string, unknown>)) if (/Tx$|^txHash$/.test(name) && typeof v === "string" && v.startsWith("0x")) rows.push({ label: `${label}: ${name}`, tx: v });
}

const md = [
  "# Evidence",
  "",
  "Generated by `scripts/evidence.ts` from the manifests and result files in `proof/`. Each transaction is an Arkiv write to `0x4400000000000000000000000000000000000044` on Tiramisu (chain 7738577).",
  "",
  "## One transaction per feature",
  "",
  "| Arkiv feature | Transaction | What it shows |",
  "|---|---|---|",
  ...feat.map((f) => `| ${f.feature} | ${f.tx ? link(f.tx) : "read-only"} | ${f.shows} |`),
  "",
  "## Every recorded transaction",
  "",
  rows.length === 0 ? "No on-chain run exists yet." : "| What | Transaction | Entity key |\n|---|---|---|",
  ...rows.map((r) => `| ${r.label} | ${r.tx ? link(r.tx) : ""} | ${r.key ? "`" + r.key.slice(0, 14) + "...`" : ""} |`),
  "",
].join("\n");
writeFileSync(resolve(ROOT, "arkiv/evidence.md"), md);
mkdirSync(resolve(ROOT, "docs"), { recursive: true });
writeFileSync(
  resolve(ROOT, "docs/txfeatures.md"),
  ["| Arkiv feature | Transaction | What it shows |", "|---|---|---|", ...feat.map((f) => `| ${f.feature} | ${f.tx ? link(f.tx) : "read-only"} | ${f.shows} |`), ""].join("\n"),
);
mkdirSync(resolve(ROOT, "apps/web/public/proof"), { recursive: true });
writeFileSync(resolve(ROOT, "apps/web/public/proof/evidence.json"), JSON.stringify(rows, null, 2) + "\n");
if (mcp) copyFileSync(resolve(resDir, mcp.file), resolve(ROOT, "apps/web/public/proof/mcp.json"));

// ---- wallets.md from the node: transaction count (nonce) and the earliest known transaction per role
const c = reader();
const roleNote: Record<string, string> = {
  dispatcher: "Creates `circle`, `ride`, `assign`, `closeout`, `rekey`, `handover` entities; the night dispatcher",
  volunteerA: "Creates `claim` and `member` entities",
  volunteerB: "Creates `claim` entities; the morning dispatcher in the handover run",
  forger: "Writes a forged ride and a forged assign that must be ignored",
  probe: "Discovery experiments D1 and D2 (synthetic probe) and the live board runs",
  drip: "Sends test GLM to new visitors; also used as a volunteer in live board runs",
  auditor: "Funder role: extends `tally` entities it does not own (`permissionlessExtension`)",
};
const wrows: string[] = [];
const wjson: { role: string; address: string; note: string; transactions: number; firstTx: string | null }[] = [];
for (const r of ROLES) {
  const address = accountFor(r).address;
  const count = await c.getTransactionCount({ address });
  let first: { tx: string; block: bigint } | null = null;
  for (const tx of byRole[r] ?? []) {
    const rc = await c.getTransactionReceipt({ hash: tx as `0x${string}` }).catch(() => null);
    if (rc && (!first || rc.blockNumber < first.block)) first = { tx, block: rc.blockNumber };
  }
  wrows.push(`| ${r} | ${address} | ${count} | ${first ? link(first.tx) : "n/a"} | ${roleNote[r] ?? ""} |`);
  wjson.push({ role: r, address, note: roleNote[r] ?? "", transactions: count, firstTx: first?.tx ?? null });
}
writeFileSync(
  resolve(ROOT, "arkiv/wallets.md"),
  [
    "# Wallets",
    "",
    "Addresses that create or sign for Rasure on Tiramisu. Private keys live only in `.secrets/wallets.json` and `.env.local` (both gitignored), never in the repo. Generated by `scripts/evidence.ts` from the node (transaction count is the account nonce).",
    "",
    "| Role | Address | Transactions sent | First known transaction | What it does |",
    "|---|---|---|---|---|",
    ...wrows,
    "",
    "Browser wallets of judges and visitors sign their own writes. The server signs only the test GLM drip.",
    "",
  ].join("\n"),
);
writeFileSync(resolve(ROOT, "apps/web/public/proof/wallets.json"), JSON.stringify(wjson, null, 2) + "\n");
console.log(`evidence: ${rows.length} rows, ${feat.length} features, ${wjson.length} wallets`);
