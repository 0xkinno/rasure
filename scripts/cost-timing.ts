// Cost per ride, batch and rekey from receipts, and the I1 check (expiresAt == keyDeathBlock) over every seeded ride, read from calldata.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { keyDeathBlock, recoverCreates } from "@rasure/core";
import { ROOT, reader, today, writeResult } from "./lib";

const rd = (p: string) => JSON.parse(readFileSync(resolve(ROOT, p), "utf8"));
const res = (n: string) => rd(`proof/results/${n}-${today()}.json`);
const c = reader();
const cost = async (tx: string) => {
  const rc = await c.getTransactionReceipt({ hash: tx as `0x${string}` });
  return { gas: Number(rc.gasUsed), glm: Number(rc.gasUsed * rc.effectiveGasPrice) / 1e18 };
};
const seed = rd("proof/seed-manifest.json");
const clock = { genesisBlock: BigInt(seed.genesis), epochBlocks: BigInt(seed.epochBlocks) };
const rides = seed.records.filter((r: { type: string }) => r.type === "ride");
let pass = 0;
const fails: string[] = [];
for (const r of rides) {
  const tx = await c.getTransaction({ hash: r.txHash });
  const cr = recoverCreates(tx.input)[0];
  const epochBytes = cr?.attributes["epoch"];
  if (!cr || !epochBytes) continue;
  const epoch = BigInt(epochBytes);
  if (cr.expiresAt === keyDeathBlock(clock, epoch)) pass++;
  else fails.push(r.key);
}
const ride = await cost(rides[0].txHash);
const batch = await cost(res("batch").batchTx);
const rekey = await cost(res("gen").batchTx);
const out = {
  date: today(),
  cost: { gasPerRide: ride.gas, glmPerRide: ride.glm.toFixed(8), gasPerBatch: batch.gas, glmPerBatch: batch.glm.toFixed(8), gasPerRekey: rekey.gas, glmPerRekey: rekey.glm.toFixed(8) },
  keyDeathTiming: { checked: rides.length, i1Pass: pass, failures: fails },
};
console.log(JSON.stringify(out, null, 1));
writeResult(`cost-${today()}.json`, out);
