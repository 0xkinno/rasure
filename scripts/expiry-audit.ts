// Wild-set expiry audit: public Tiramisu entities (any project) that were alive at a past block and
// are expired now. Counts only. Never prints or stores content, keys, creators or project names.
// Usage: npx tsx scripts/expiry-audit.ts [--back=3000] [--max=400]
import { and, gt, lte, QueryError } from "@arkiv-network/sdk/query";
import { u64 } from "@arkiv-network/sdk/attr";
import { reader, today, writeResult } from "./lib";

const arg = (n: string, d: number) => Number(process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d);
const back = BigInt(arg("back", 3000));
const max = arg("max", 400);
const c = reader();
const head = await c.getBlockNumber({ cacheTime: 0 });
const past = head - back;

function classify(p: Uint8Array): "empty" | "json" | "text" | "binary" {
  if (p.length === 0) return "empty";
  let s: string;
  try {
    s = new TextDecoder("utf-8", { fatal: true }).decode(p);
  } catch {
    return "binary";
  }
  try {
    JSON.parse(s);
    return "json";
  } catch {
    /* not json */
  }
  const printable = [...s].filter((ch) => ch >= " " || ch === "\n" || ch === "\t").length / s.length;
  return printable > 0.95 ? "text" : "binary";
}

let sampled = 0;
let stillReturnPayload = 0;
let readableText = 0; // json or text
let liveNow = 0;
let boundaryError: string | null = null;
let pages = 0;
const kinds: Record<string, number> = { empty: 0, json: 0, text: 0, binary: 0 };

// A single wide $expiresAt range over every entity makes the node answer 504 (recorded in friction.md),
// so the audit reads narrow expiry windows, each pinned to the same past block.
const win = BigInt(arg("win", 40));
const errors: string[] = [];
let windows = 0;
for (let lo = past; lo < head - 1n && sampled < max; lo += win) {
  const hi = lo + win < head ? lo + win : head - 1n;
  windows++;
  try {
    let page = await c
      .select({ key: true, expiresAt: true, payload: true })
      .where(and([gt("$expiresAt", u64(lo)), lte("$expiresAt", u64(hi))]))
      .atBlock(past)
      .limit(100)
      .fetch();
    for (;;) {
      pages++;
      for (const e of page.entities) {
        if (sampled >= max) break;
        sampled++;
        const p = e.payload ?? new Uint8Array();
        if (p.length > 0) stillReturnPayload++;
        const k = classify(p);
        kinds[k]++;
        if (k === "json" || k === "text") readableText++;
      }
      if (sampled >= max || !page.hasNextPage()) break;
      page = await page.next();
    }
  } catch (e) {
    errors.push(e instanceof QueryError ? `QueryError kind=${e.kind} code=${e.code}` : (e as Error).message.slice(0, 80).replace(/\s+/g, " "));
    if (errors.length >= 3) break;
  }
}
boundaryError = errors.length ? errors.join(" | ") : null;

const out = {
  experiment: "wild-set expiry audit (aggregate only)",
  date: today(),
  sdk: "@arkiv-network/sdk@0.8.1",
  head,
  pastBlock: past,
  windowBlocks: back,
  predicate: `$expiresAt > lo AND $expiresAt <= lo + ${win}, windows from past to head, read atBlock(past)`,
  windows,
  sampled,
  stillReturnPayload,
  readableText,
  kinds,
  pagesRead: pages,
  liveNow,
  error: boundaryError,
  note: "Counts only. No content, keys, creators or project names are printed or stored.",
};
console.log(JSON.stringify(out, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2));
console.log("wrote", writeResult(`wild-${today()}-${back}.json`, out));
