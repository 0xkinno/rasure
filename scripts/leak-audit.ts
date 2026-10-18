// Leak audit, invariants I3 and I6, over every live `rasure/v1` entity and its creation transaction.
//   I3: no public attribute outside the allowlist; at most 6 public attributes per entity.
//   I6: the creation transaction carries no plaintext: the payload is not valid UTF-8 JSON or text and its
//       byte entropy is near the maximum for its size. (Entropy of a short sample cannot reach 8 bits per byte:
//       256 random bytes measure about 7.2. Thresholds below are per length bucket and printed in the result.)
// Creation transactions come from proof/*.json manifests when present, else from a scan of the creation block.
// Usage: npx tsx scripts/leak-audit.ts
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "@arkiv-network/sdk/query";
import { ENTITY_EVENTS_ABI } from "@arkiv-network/sdk";
import { decodeEventLog, type Hex } from "viem";
import { ARKIV_ADDRESS, PUBLIC_ATTRIBUTE_ALLOWLIST, auditAttributes, fetchAll, recoverCreates, toChainEntity } from "@rasure/core";
import { ROOT, reader, today, writeResult } from "./lib";

const c = reader();
const head = await c.getBlockNumber({ cacheTime: 0 });
const { entities, pages } = await fetchAll(
  c as never,
  { key: true, creator: true, createdAt: true, expiresAt: true, attributes: true, payload: true },
  eq("project", "rasure/v1"),
  { atBlock: head },
);

const txByKey = new Map<string, string>();
for (const f of ["proof/seed-manifest.json", "proof/drill-manifest.json"]) {
  const p = resolve(ROOT, f);
  if (!existsSync(p)) continue;
  const m = JSON.parse(readFileSync(p, "utf8"));
  const recs: { key: string; txHash: string }[] = [...(m.records ?? []), ...((m.scenarios ?? []).flatMap((s: { records: { key: string; txHash: string }[] }) => s.records))];
  for (const r of recs) txByKey.set(r.key.toLowerCase(), r.txHash);
}

async function creationTx(key: string, createdAt: bigint): Promise<Hex | null> {
  const known = txByKey.get(key.toLowerCase());
  if (known) return known as Hex;
  const block = await c.getBlock({ blockNumber: createdAt, includeTransactions: true });
  for (const tx of block.transactions) {
    if (tx.to?.toLowerCase() !== ARKIV_ADDRESS) continue;
    const rc = await c.getTransactionReceipt({ hash: tx.hash });
    for (const log of rc.logs) {
      try {
        const ev = decodeEventLog({ abi: ENTITY_EVENTS_ABI, data: log.data, topics: log.topics as [Hex, ...Hex[]] });
        if (ev.eventName === "EntityCreated" && String((ev.args as { entityKey: string }).entityKey).toLowerCase() === key.toLowerCase()) return tx.hash;
      } catch { /* not an entity event */ }
    }
  }
  return null;
}

function entropy(b: Uint8Array) {
  const f = new Array(256).fill(0);
  for (const x of b) f[x]++;
  return -f.reduce((s, n) => (n ? s + (n / b.length) * Math.log2(n / b.length) : s), 0);
}
const threshold = (len: number) => (len >= 1024 ? 7.7 : len >= 512 ? 7.4 : 6.9);
function isTextual(p: Uint8Array) {
  try {
    const s = new TextDecoder("utf-8", { fatal: true }).decode(p);
    try { JSON.parse(s); return true; } catch { /* not json */ }
    return [...s].filter((ch) => ch >= " " || ch === "\n").length / s.length > 0.95;
  } catch { return false; }
}

let maxPublicAttributes = 0;
const attributeViolations: { key: string; extra: string[] }[] = [];
const txFindings: { key: string; reason: string }[] = [];
let plaintextTx = 0;
let checkedTx = 0;
let notFoundTx = 0;
let minEntropy = 8;
const perBucket: Record<string, { n: number; minEntropy: number }> = {};

for (const e of entities as any[]) {
  const ce = toChainEntity(e);
  const names = Object.keys(ce.attributes).filter((n) => !n.startsWith("$"));
  maxPublicAttributes = Math.max(maxPublicAttributes, names.length);
  const extra = auditAttributes(ce);
  if (extra.length || names.length > 6) attributeViolations.push({ key: e.key, extra });
  const t = String(ce.attributes.type);
  if (t === "circle") continue; // anchor has an empty payload by design
  const tx = await creationTx(e.key, BigInt(e.createdAt));
  if (!tx) { notFoundTx++; continue; }
  const input = (await c.getTransaction({ hash: tx })).input;
  const created = recoverCreates(input).find((x) => x.payload);
  checkedTx++;
  const p = created?.payload;
  if (!p) { txFindings.push({ key: e.key, reason: "no payload recovered" }); continue; }
  const en = entropy(p);
  const b = String(p.length);
  perBucket[b] = { n: (perBucket[b]?.n ?? 0) + 1, minEntropy: Math.min(perBucket[b]?.minEntropy ?? 8, en) };
  minEntropy = Math.min(minEntropy, en);
  if (isTextual(p)) { plaintextTx++; txFindings.push({ key: e.key, reason: "payload is readable text" }); }
  else if (en < threshold(p.length)) txFindings.push({ key: e.key, reason: `entropy ${en.toFixed(2)} below ${threshold(p.length)} for ${p.length} bytes` });
}

const out = {
  experiment: "leak audit I3 and I6",
  date: today(), head, pages,
  allowlist: PUBLIC_ATTRIBUTE_ALLOWLIST,
  entities: entities.length,
  maxPublicAttributes,
  attributeViolations,
  creationTxChecked: checkedTx,
  creationTxNotFound: notFoundTx,
  plaintextTx,
  minEntropy,
  entropyThresholds: { "256": 6.9, "512": 7.4, "1024+": 7.7 },
  perLengthBucket: perBucket,
  findings: txFindings,
  pass: attributeViolations.length === 0 && txFindings.length === 0 && notFoundTx === 0,
};
console.log(JSON.stringify(out, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2));
console.log("wrote", writeResult(`leak-audit-${today()}.json`, out));
if (!out.pass) process.exitCode = 2;
