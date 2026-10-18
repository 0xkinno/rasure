// A third observer: the Arkiv MCP server (https://mcp.arkiv.network/devfolio, Streamable HTTP, no key) independently confirms
// every demo transaction and entity in proof/seed-manifest.json, and we compare it with our own reader.
// Writes proof/results/mcp-<date>.json. No dependencies; Node 20+.
//   node scripts/mcp-verify.mjs [manifest.json]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(process.argv[2] ?? resolve(ROOT, "proof/seed-manifest.json"), "utf8"));
const MCP = "https://mcp.arkiv.network/devfolio";
const RPC = process.env.ARKIV_RPC ?? "https://rpc.tiramisu.db-chain.testnet.arkiv.network";
const KEY = process.env.ARKIV_ACCESS_KEY;
let sid;
let id = 1;

async function mcp(method, params) {
  const headers = { "content-type": "application/json", accept: "application/json, text/event-stream" };
  if (sid) headers["mcp-session-id"] = sid;
  const r = await fetch(MCP, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: id++, method, params }) });
  sid = r.headers.get("mcp-session-id") ?? sid;
  const text = await r.text();
  const body = text.startsWith("{") ? text : (text.split("\n").find((l) => l.startsWith("data:")) ?? "data: {}").slice(5);
  const j = JSON.parse(body);
  if (j.error) throw new Error(JSON.stringify(j.error));
  return j.result;
}
const tool = async (name, args) => {
  const res = await mcp("tools/call", { name, arguments: args });
  const t = res.content?.[0]?.text ?? "{}";
  try { return JSON.parse(t); } catch { return { raw: t }; }
};
async function rpc(method, params) {
  const headers = { "content-type": "application/json", ...(KEY ? { "X-API-KEY": KEY } : {}) };
  const r = await fetch(RPC, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: id++, method, params }) });
  return (await r.json()).result;
}

await mcp("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "rasure-mcp-verify", version: "1" } });
const status = await tool("server_status", {});

const rows = [];
const mcpFields = new Set();
for (const rec of manifest.records) {
  const tx = await tool("verify_tx", { txHash: rec.txHash, publicEvidenceReviewed: true });
  const ent = await tool("verify_entity", { entityKey: rec.key, publicEvidenceReviewed: true });
  for (const k of Object.keys(ent)) mcpFields.add(k);
  for (const k of Object.keys(tx)) mcpFields.add(`tx.${k}`);
  const mine = await rpc("arkiv_query", [`$key = key(${rec.key})`, { select: { key: true, expiresAt: true }, limit: "0x1" }]);
  const readerLive = (mine?.data?.length ?? 0) > 0;
  // MCP shape: { status: "observed", data: { kind: "entity_metadata", createdAt, updatedAt, expiresAt, creationFlags } } when the entity is live.
  const mcpLive = ent.status === "observed" && ent.data?.kind === "entity_metadata";
  const txReceipt = tx.data ?? {};
  rows.push({ key: rec.key, type: rec.type, txObserved: tx.status === "observed", txReceiptStatus: txReceipt.status ?? txReceipt.receiptStatus ?? null, txBlock: txReceipt.blockNumber ?? null, mcpExpiresAt: ent.data?.expiresAt ?? null, mcp: ent, tx, readerLive, mcpLive });
}
const txOk = rows.filter((r) => r.txObserved && /success|0x1|^1$/i.test(String(r.txReceiptStatus))).length;
const agree = rows.filter((r) => r.readerLive === r.mcpLive).length;
const schemaText = readFileSync(resolve(ROOT, "arkiv/schema.md"), "utf8").slice(0, 19000);
const schemaCheck = await tool("check_schema", { text: schemaText });

const out = {
  experiment: "Arkiv MCP as a third observer",
  date: new Date().toISOString().slice(0, 10),
  endpoint: MCP,
  profile: status.profile ?? status.campaign ?? null,
  transactionsChecked: rows.length,
  transactionsReportedSuccess: txOk,
  entitiesChecked: rows.length,
  entitiesLiveAccordingToReader: rows.filter((r) => r.readerLive).length,
  entitiesLiveAccordingToMcp: rows.filter((r) => r.mcpLive).length,
  agreementWithOurReader: agree,
  fieldsReturnedByMcp: [...mcpFields].sort(),
  fieldsOurReaderReturns: ["key", "creator", "owner", "expiresAt", "attributes", "payload"],
  schemaCheck: { blockers: schemaCheck.blockers ?? schemaCheck.blockerCount ?? null, warnings: schemaCheck.warnings ?? schemaCheck.warningCount ?? null, raw: schemaCheck },
  txSampleShape: rows[0]?.tx ?? null,
  sample: rows.slice(0, 3),
};
mkdirSync(resolve(ROOT, "proof/results"), { recursive: true });
writeFileSync(resolve(ROOT, `proof/results/mcp-${out.date}.json`), JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify({ ...out, sample: undefined, schemaCheck: { blockers: out.schemaCheck.blockers, warnings: out.schemaCheck.warnings } }, null, 2));
