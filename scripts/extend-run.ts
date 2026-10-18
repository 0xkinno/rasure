// Live check of Lifetime Extension: the circle anchor is a lease that only ever moves later.
// Creates a throwaway circle with the probe wallet, shortens nothing, extends it, and reads the new deadline back.
import { circleParams, extendCircle, CIRCLE_LEASE_BLOCKS } from "@rasure/core";
import { ExpirationTime } from "@arkiv-network/sdk";
import { eq } from "@arkiv-network/sdk/query";
import { key } from "@arkiv-network/sdk/attr";
import { reader, today, walletFor, writeResult } from "./lib";
import { hex16 } from "./helpers";

const c = reader();
const w = walletFor("probe");
const head = await c.getBlockNumber({ cacheTime: 0 });
const clock = { genesisBlock: head, epochBlocks: 300n };
const circle = hex16();
// Create with a short lease (1 day) so extending to head + 30 days is a real extension.
const base = circleParams(circle, clock);
const created = await w.createEntity({ ...base, expires: ExpirationTime.fromBlocks(43_200) });
const now = await c.getBlockNumber({ cacheTime: 0 });
const ext = await extendCircle(w as never, created.entityKey, now, created.expiresAt);
const after = await c.select({ key: true, expiresAt: true }).where(eq("$key", key(created.entityKey))).fetch();
const newExp = after.entities[0]?.expiresAt as bigint | undefined;
const out = {
  experiment: "Lifetime Extension of the circle lease",
  date: today(),
  circle,
  createTx: created.txHash,
  extendTx: ext.txHash,
  expiresAtBefore: created.expiresAt,
  expiresAtAfterReceipt: ext.expiresAt,
  expiresAtReadBack: newExp,
  leaseBlocks: CIRCLE_LEASE_BLOCKS,
  pass: !!newExp && newExp > created.expiresAt && newExp === ext.expiresAt,
};
console.log(JSON.stringify(out, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2));
writeResult(`extend-${today()}.json`, out);
if (!out.pass) process.exitCode = 2;
