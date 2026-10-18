// Builds docs/FACTS.json (and apps/web/public/facts.json) from proof/results/*.json. Numbers are never typed by hand:
// a section appears only when the run that produces it exists.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "./lib";

const dir = resolve(ROOT, "proof/results");
const newest = (prefix: string) => {
  if (!existsSync(dir)) return null;
  const f = readdirSync(dir).filter((n) => n.startsWith(prefix) && n.endsWith(".json")).sort().pop();
  return f ? { file: f, data: JSON.parse(readFileSync(resolve(dir, f), "utf8")) } : null;
};

const d1 = newest("d1-");
const d2 = newest("d2-");
const drill = newest("drill-");
const leak = newest("leak-audit-");
const wild = newest("wild-");
const seed = newest("seed-");
const rekey = newest("rekey-");

const facts: Record<string, unknown> = { generated: true, generatedAt: new Date().toISOString(), sources: {} as Record<string, string> };
const src = facts.sources as Record<string, string>;
if (d1) {
  const x = d1.data;
  facts.d1 = { txHash: x.txHash, entityKey: x.entityKey, recoveredByteForByte: x.recoveredByteForByte, liveAfterExpiry: x.liveAfterExpiry };
  src.d1 = d1.file;
}
if (d2) {
  const x = d2.data;
  facts.d2 = { retentionHours: x.retention.approxHours, payloadReturnedAfterExpiry: x.payloadReturnedAfterExpiryAtLastLiveBlock };
  src.d2 = d2.file;
}
if (drill) {
  const t = drill.data.totals as Record<string, { exposed: number; total: number }>;
  facts.drill = { ...t, ...(drill.data.rekeyTotals ? { rekey: drill.data.rekeyTotals } : {}) };
  facts.errorDirections = drill.data.errorDirections;
  src.drill = drill.file;
}
if (rekey) src.rekey = rekey.file;
if (leak) {
  const x = leak.data;
  facts.leakAudit = { entities: x.entities, maxPublicAttributes: x.maxPublicAttributes, plaintextTx: x.plaintextTx, minEntropy: x.minEntropy, pass: x.pass };
  src.leakAudit = leak.file;
}
if (wild) {
  const x = wild.data;
  facts.wild = { sampled: x.sampled, stillReturnPayload: x.stillReturnPayload, readableText: x.readableText, pastBlock: x.pastBlock, head: x.head };
  src.wild = wild.file;
}
if (seed?.data.cost) { facts.cost = seed.data.cost; src.seed = seed.file; }

const text = JSON.stringify(facts, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2) + "\n";
mkdirSync(resolve(ROOT, "docs"), { recursive: true });
writeFileSync(resolve(ROOT, "docs/FACTS.json"), text);
copyFileSync(resolve(ROOT, "docs/FACTS.json"), resolve(ROOT, "apps/web/public/facts.json"));
console.log(text);
