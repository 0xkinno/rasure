// Live check of executeBatch: assign one ride and close another in ONE transaction ("both land or neither").
// Uses the probe wallet on a throwaway circle with 30 block epochs. Writes proof/results/batch-<date>.json.
import { advance, assignAndClosePrevious, circleParams, currentKey, epochAt, epochStart, newChain, rideParams } from "@rasure/core";
import { eq } from "@arkiv-network/sdk/query";
import { reader, today, walletFor, writeResult } from "./lib";
import { hex16, synRide, waitForBlock } from "./helpers";

const c = reader();
const w = walletFor("probe");
const head0 = await c.getBlockNumber({ cacheTime: 0 });
const clock = { genesisBlock: head0 + 3n, epochBlocks: 30n };
const circle = hex16();
let st = newChain(circle, clock);
const anchor = await w.createEntity(circleParams(circle, clock));
const head = await waitForBlock(epochStart(clock, 0n));
st = advance(st, head).state;
const ep = epochAt(clock, head);
const r1 = await w.createEntity(await rideParams(st, head, ep, synRide(0), "SYN-zone-north"));
const r2 = await w.createEntity(await rideParams(st, head, ep, synRide(1), "SYN-zone-north"));
const now = await c.getBlockNumber({ cacheTime: 0 });
const batch = await assignAndClosePrevious(
  w as never,
  st,
  now,
  { rideKey: r1.entityKey, epoch: ep, body: { claim: "SYN-claim", instruction: "SYN-wait at the landmark" } },
  { rideKey: r2.entityKey, epoch: ep, body: { outcome: "SYN-done" } },
);
const rc = await c.getTransactionReceipt({ hash: batch.txHash });
const live = await c.select({ key: true, attributes: true }).where(eq("circle", circle)).fetch();
const types = (live.entities as unknown as { attributes: Record<string, { value: string }> }[]).map((e) => e.attributes.type?.value);
const out = {
  experiment: "executeBatch: assign + closeout in one transaction",
  date: today(),
  circle,
  anchorTx: anchor.txHash,
  batchTx: batch.txHash,
  entitiesCreatedByBatch: batch.createdEntities.length,
  receiptStatus: rc.status,
  typesLiveForCircle: types.sort(),
  pass: batch.createdEntities.length === 2 && rc.status === "success",
  currentKeyEpoch: currentKey(st).epoch,
};
console.log(JSON.stringify(out, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2));
writeResult(`batch-${today()}.json`, out);
if (!out.pass) process.exitCode = 2;
