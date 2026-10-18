// D2: historical queries (atBlock) return an expired entity and its payload; find the node's retention boundary.
// Reads the newest proof/results/d1-*.json. Writes proof/results/d2-<date>.json.
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { eq, QueryError } from "@arkiv-network/sdk/query";
import { key } from "@arkiv-network/sdk/attr";
import { ROOT, reader, today, writeResult } from "../lib";

const dir = resolve(ROOT, "proof/results");
const d1file = readdirSync(dir).filter((f) => f.startsWith("d1-")).sort().pop();
if (!d1file) throw new Error("run d1-calldata.ts first");
const d1 = JSON.parse(readFileSync(resolve(dir, d1file), "utf8"));
const entityKey = d1.entityKey as `0x${string}`;
const createdBlock = BigInt(d1.createdBlock);
const expiresAt = BigInt(d1.expiresAt);
const c = reader();
const head = await c.getBlockNumber({ cacheTime: 0 });

async function probeAt(block: bigint) {
  try {
    const r = await c
      .select({ key: true, creator: true, expiresAt: true, attributes: true, payload: true })
      .where([eq("$key", key(entityKey))])
      .atBlock(block)
      .fetch();
    const e = r.entities[0];
    return {
      block: block.toString(),
      answered: true,
      found: !!e,
      payloadText: e?.payload ? new TextDecoder().decode(e.payload) : null,
      expiresAt: e?.expiresAt?.toString() ?? null,
    };
  } catch (err) {
    if (err instanceof QueryError) return { block: block.toString(), answered: false, errorKind: err.kind, code: err.code };
    throw err;
  }
}

const points = [createdBlock, createdBlock + 1n, expiresAt - 1n, expiresAt, expiresAt + 1n, head];
const samples = [];
for (const b of points) {
  const s = await probeAt(b);
  samples.push(s);
  console.log(s);
}

// Retention boundary: smallest block the node still answers, binary search over [1, head].
let lo = 1n;
let hi = head;
const answers = async (b: bigint) => (await probeAt(b)).answered;
let steps = 0;
if (await answers(lo)) {
  hi = lo;
} else {
  while (hi - lo > 1n) {
    const mid = (lo + hi) / 2n;
    steps++;
    if (await answers(mid)) hi = mid;
    else lo = mid;
  }
}
const secs = Number(head - hi) * 2;
console.log("oldest answered block", hi.toString(), "window blocks", (head - hi).toString(), `(~${(secs / 3600).toFixed(1)} h)`);

const lastLive = samples[2];
const out = {
  experiment: "D2 historical queries return expired entities",
  date: today(),
  sdk: "@arkiv-network/sdk@0.8.1",
  chainId: 7738577,
  d1Source: d1file,
  entityKey,
  createdBlock,
  expiresAt,
  headAtRun: head,
  samples,
  payloadReturnedAfterExpiryAtLastLiveBlock: "payloadText" in lastLive && !!lastLive.payloadText,
  retention: { oldestAnsweredBlock: hi, windowBlocks: head - hi, approxHours: secs / 3600, binarySearchSteps: steps },
};
console.log("wrote", writeResult(`d2-${today()}.json`, out));
