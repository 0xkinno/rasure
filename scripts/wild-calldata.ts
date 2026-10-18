// Calldata on the wild set: for a sample of public entities that were live at a past block, find each creation transaction from the
// EntityCreated log and confirm recoverCreates returns the same payload the history read returned. Counts only; nothing is printed or stored
// about content, creators or projects. Usage: npx tsx scripts/wild-calldata.ts [--back=600] [--n=50]
import { and, gt, lte } from "@arkiv-network/sdk/query";
import { u64 } from "@arkiv-network/sdk/attr";
import { ENTITY_EVENTS_ABI } from "@arkiv-network/sdk";
import { decodeEventLog, type Hex } from "viem";
import { ARKIV_ADDRESS, recoverCreates } from "@rasure/core";
import { reader, today, writeResult } from "./lib";

const arg = (n: string, d: number) => Number(process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d);
const back = BigInt(arg("back", 600));
const want = arg("n", 50);
const c = reader();
const head = await c.getBlockNumber({ cacheTime: 0 });
const past = head - back;
const page = await c.select({ key: true, createdAt: true, payload: true }).where(and([gt("$expiresAt", u64(past)), lte("$expiresAt", u64(past + 40n))])).atBlock(past).limit(100).fetch();
const sample = (page.entities as unknown as { key: Hex; createdAt: bigint; payload?: Uint8Array }[]).filter((e) => e.payload && e.payload.length > 0).slice(0, want);
let found = 0;
let recovered = 0;
let matches = 0;
for (const e of sample) {
  const block = await c.getBlock({ blockNumber: BigInt(e.createdAt), includeTransactions: true });
  let tx: Hex | null = null;
  for (const t of block.transactions) {
    if (t.to?.toLowerCase() !== ARKIV_ADDRESS) continue;
    const rc = await c.getTransactionReceipt({ hash: t.hash });
    for (const log of rc.logs) {
      try {
        const ev = decodeEventLog({ abi: ENTITY_EVENTS_ABI, data: log.data, topics: log.topics as [Hex, ...Hex[]] });
        if (ev.eventName === "EntityCreated" && String((ev.args as { entityKey: string }).entityKey).toLowerCase() === e.key.toLowerCase()) tx = t.hash;
      } catch { /* not an entity event */ }
    }
    if (tx) break;
  }
  if (!tx) continue;
  found++;
  const input = (await c.getTransaction({ hash: tx })).input;
  const p = recoverCreates(input).find((x) => x.payload)?.payload;
  if (p) {
    recovered++;
    if (Buffer.from(p).equals(Buffer.from(e.payload!))) matches++;
  }
}
const out = { experiment: "calldata recovery on the wild set (aggregate)", date: today(), pastBlock: past, head, sampled: sample.length, creationTxFound: found, payloadRecovered: recovered, matchesHistory: matches, note: "Counts only." };
console.log(out);
writeResult(`wildcalldata-${today()}.json`, out);
