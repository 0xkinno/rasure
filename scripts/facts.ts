// Builds docs/FACTS.json (and apps/web/public/facts.json) from proof/results/*.json. Numbers are never typed by hand:
// a section appears only when the run that produces it exists.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "./lib";

const dir = resolve(ROOT, "proof/results");
const newest = (prefix: string) => {
  if (!existsSync(dir)) return null;
  const f = readdirSync(dir).filter((n) => n.startsWith(prefix) && /^[a-zA-Z0-9]+-\d{4}-/.test(n) && n.endsWith(".json")).sort().pop();
  return f ? { file: f, data: JSON.parse(readFileSync(resolve(dir, f), "utf8")) } : null;
};

const d1 = newest("d1-");
const d2 = newest("d2-");
const drill = newest("drill-");
const leak = newest("leak-audit-");
const wildFiles = existsSync(dir) ? readdirSync(dir).filter((n) => /^wild-\d{4}-/.test(n)).sort() : [];
const wildAll = wildFiles.map((f) => ({ file: f, data: JSON.parse(readFileSync(resolve(dir, f), "utf8")) })).filter((w) => w.data.sampled > 0).sort((a, b) => Number(a.data.windowBlocks) - Number(b.data.windowBlocks));
const wild = wildAll.length ? wildAll[wildAll.length - 1] : null;
const wildCalldata = newest("wildcalldata-");
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
const costR = newest("cost-");
if (costR) { facts.cost = costR.data.cost; facts.keyDeathTiming = costR.data.keyDeathTiming; src.cost = costR.file; } else if (seed?.data.cost) { facts.cost = seed.data.cost; src.seed = seed.file; }

if (wildAll.length) facts.wildWindows = wildAll.map((w) => ({ windowBlocks: w.data.windowBlocks, approxMinutes: Math.round((Number(w.data.windowBlocks) * 2) / 60), sampled: w.data.sampled, stillReturnPayload: w.data.stillReturnPayload, readableText: w.data.readableText, partial: !!w.data.error }));
if (wildCalldata) { facts.wildCalldata = { sampled: wildCalldata.data.sampled, creationTxFound: wildCalldata.data.creationTxFound, payloadRecoveredFromCalldata: wildCalldata.data.payloadRecovered, payloadMatchesHistoryRead: wildCalldata.data.matchesHistory }; src.wildCalldata = wildCalldata.file; }
const text = JSON.stringify(facts, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2) + "\n";
mkdirSync(resolve(ROOT, "docs"), { recursive: true });
writeFileSync(resolve(ROOT, "docs/FACTS.json"), text);
copyFileSync(resolve(ROOT, "docs/FACTS.json"), resolve(ROOT, "apps/web/public/facts.json"));
console.log(text);

// Blocks the README generator embeds (never typed by hand).
const f = facts as any;
const lines: string[] = [];
if (f.d1) lines.push(`- D1: expired entity absent from live state, payload recovered from calldata byte for byte: ${f.d1.recoveredByteForByte} (tx \`${f.d1.txHash}\`).`);
if (f.d2) lines.push(`- D2: node answered a history query at block 1; payload returned at the last live block: ${f.d2.payloadReturnedAtLastLiveBlock}.`);
if (f.drill) for (const [k, v] of Object.entries(f.drill as Record<string, { exposed: number; total: number }>)) lines.push(`- Seizure drill, ${k}: ${v.exposed} of ${v.total} records exposed.`);
if (f.errorDirections) lines.push(`- Error directions: attacker opened ${f.errorDirections.attackerOpenedPast} past records; legitimate member refused ${f.errorDirections.memberRefused} of ${f.errorDirections.liveRecords} live records.`);
if (f.leakAudit) lines.push(`- Leak audit: ${f.leakAudit.entities} entities, at most ${f.leakAudit.maxPublicAttributes} public attributes, ${f.leakAudit.plaintextTx} plaintext creation transactions, pass: ${f.leakAudit.pass}.`);
if (f.wildCalldata) lines.push(`- Calldata on the wild set: of ${f.wildCalldata.sampled} sampled public entities, ${f.wildCalldata.creationTxFound} creation transactions were found and ${f.wildCalldata.payloadRecoveredFromCalldata} payloads were recovered from calldata, ${f.wildCalldata.payloadMatchesHistoryRead} identical to the history read.`);
if (f.cost) lines.push(`- Cost: about ${f.cost.gasPerRide} gas and ${f.cost.glmPerRide} GLM per ride${f.cost.glmPerBatch ? `; ${f.cost.glmPerBatch} GLM per batch` : ""}${f.cost.glmPerRekey ? `; ${f.cost.glmPerRekey} GLM per rekey` : ""}.`);
if (f.keyDeathTiming) lines.push(`- Key-death timing: ${f.keyDeathTiming.checked} demo rides checked, expiresAt equals keyDeathBlock for ${f.keyDeathTiming.i1Pass} (I1).`);
const NL = "\n";
writeFileSync(resolve(ROOT, "docs/facts-block.md"), lines.join(NL) + NL);
const ww = (f.wildWindows ?? []) as { approxMinutes: number; sampled: number; stillReturnPayload: number; readableText: number; partial: boolean }[];
const ago = (m: number) => (m >= 120 ? `about ${Math.round(m / 60)} hours` : m >= 60 ? "about 1 hour" : `about ${m} minutes`);
const wildRows = ww.map((w) => `| ${ago(w.approxMinutes)}${w.partial ? " (partial run)" : ""} | ${w.sampled} | ${w.stillReturnPayload} | ${w.readableText} |`);
writeFileSync(
  resolve(ROOT, "docs/wild-table.md"),
  ww.length ? ["| Read from history this long ago | Sampled | Returned their payload | Readable as plain text or JSON |", "|---|---|---|---|", ...wildRows, ""].join(NL) : "",
);
const big = ww.length ? ww.reduce((a, b) => (b.approxMinutes > a.approxMinutes ? b : a)) : null;
writeFileSync(
  resolve(ROOT, "docs/headline.md"),
  big ? `On Tiramisu, **${big.stillReturnPayload} of ${big.sampled}** public entities that have since expired returned their full payload when read from history. An expired record is gone from the board. It is not gone from the chain.` + NL : "",
);
