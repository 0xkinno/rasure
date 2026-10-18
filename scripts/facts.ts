// Builds docs/FACTS.json (and apps/web/public/facts.json) from proof/results/*.json. Numbers are never typed by hand:
// a section appears only when the run that produces it exists.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "./lib";

const dir = resolve(ROOT, "proof/results");
const newest = (prefix: string) => {
  if (!existsSync(dir)) return null;
  const f = readdirSync(dir).filter((n) => n.startsWith(prefix) && /^[a-zA-Z0-9]+-d{4}-/.test(n) && n.endsWith(".json")).sort().pop();
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
  facts.d2 = { retentionHours: x.retention.approxHours, payloadReturnedAtLastLiveBlock: x.payloadReturnedAfterExpiryAtLastLiveBlock };
  src.d2 = d2.file;
}
if (drill) {
  const t = drill.data.totals as Record<string, { exposed: number; total: number }>;
  facts.drill = { ...t, ...(rekey?.data.rekeyTotals ? { rekey: rekey.data.rekeyTotals } : {}) };
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

// Fill the "Measured" block of README.md from the same facts (never typed by hand).
const f = facts as any;
const lines: string[] = [];
if (f.d1) lines.push(`- D1: expired entity absent from live state, payload recovered from calldata byte for byte: ${f.d1.recoveredByteForByte} (tx \`${f.d1.txHash}\`).`);
if (f.d2) lines.push(`- D2: node answered a history query at block 1; payload returned at the last live block: ${f.d2.payloadReturnedAtLastLiveBlock}.`);
if (f.drill) for (const [k, v] of Object.entries(f.drill as Record<string, { exposed: number; total: number }>)) lines.push(`- Seizure drill, ${k}: ${v.exposed} of ${v.total} records exposed.`);
if (f.errorDirections) lines.push(`- Error directions: attacker opened ${f.errorDirections.attackerOpenedPast} past records; legitimate member refused ${f.errorDirections.memberRefused} of ${f.errorDirections.liveRecords} live records.`);
if (f.leakAudit) lines.push(`- Leak audit: ${f.leakAudit.entities} entities, at most ${f.leakAudit.maxPublicAttributes} public attributes, ${f.leakAudit.plaintextTx} plaintext creation transactions, pass: ${f.leakAudit.pass}.`);
if (f.wild) lines.push(`- Wild-set audit (aggregate, partial run): ${f.wild.sampled} public entities that were live at block ${f.wild.pastBlock} and have since expired were read at that block; ${f.wild.stillReturnPayload} returned a payload; ${f.wild.readableText} parse as readable text or JSON.`);
if (f.cost) lines.push(`- Cost: about ${f.cost.gasPerRide} gas and ${f.cost.glmPerRide} GLM per ride.`);
const rp = resolve(ROOT, "README.md");
if (existsSync(rp) && lines.length) {
  const r = readFileSync(rp, "utf8");
  writeFileSync(rp, r.replace(/<!-- facts:start -->[\s\S]*?<!-- facts:end -->/, `<!-- facts:start -->\n${lines.join("\n")}\n<!-- facts:end -->`));
}
