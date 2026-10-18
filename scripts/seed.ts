// Seeds the demo circle: rides across several epochs, claims by two volunteers, assigns, a closeout, and one forged
// ride and one forged assign from the forger. All content is synthetic (SYN-). Real transactions on Tiramisu.
// Writes proof/seed-manifest.json, proof/results/seed-<date>.json (cost from receipts), and prints the env line
// for NEXT_PUBLIC_DEMO_CIRCLE. Usage: npx tsx scripts/seed.ts [--epochs=6] [--epoch-blocks=300]
// With 300-block epochs six epochs take about an hour; run it in the background shortly before recording.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  advance, assignParams, circleParams, claimParams, closeoutParams, epochAt, epochStart, joinChain, newChain, rideParams,
  currentKey, type KeyringState,
} from "@rasure/core";
import { ROOT, accountFor, reader, today, walletFor, writeResult } from "./lib";
import { hex16, synRide, waitForBlock } from "./helpers";

const arg = (n: string, d: number) => Number(process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d);
const EPOCHS = arg("epochs", 6);
const EB = BigInt(arg("epoch-blocks", 300));
const c = reader();
const D = walletFor("dispatcher");
const VA = walletFor("volunteerA");
const VB = walletFor("volunteerB");
const F = walletFor("forger");

const head0 = await c.getBlockNumber({ cacheTime: 0 });
const clock = { genesisBlock: head0 + 3n, epochBlocks: EB };
const circle = hex16();
let dispatcherState: KeyringState = newChain(circle, clock);
const k0 = currentKey(dispatcherState);
const volunteerState = (): KeyringState => joinChain(circle, clock, k0.epoch, k0.chainKey);
let sa = volunteerState();
let sb = volunteerState();

const records: { key: string; txHash: string; circle: string; epoch: string; type: string; role: string }[] = [];
const gas: bigint[] = [];
const price: bigint[] = [];
async function track(role: string, type: string, epoch: bigint, r: { entityKey: string; txHash: string }) {
  records.push({ key: r.entityKey, txHash: r.txHash, circle, epoch: epoch.toString(), type, role });
  const rc = await c.getTransactionReceipt({ hash: r.txHash as `0x${string}` });
  if (type === "ride") { gas.push(rc.gasUsed); price.push(rc.effectiveGasPrice ?? 0n); }
}

console.log("demo circle", circle, "genesis", clock.genesisBlock.toString(), "epoch blocks", EB.toString());
const anchor = await D.createEntity(circleParams(circle, clock));
console.log("circle anchor", anchor.txHash);
records.push({ key: anchor.entityKey, txHash: anchor.txHash, circle, epoch: "0", type: "circle", role: "dispatcher" });

let n = 0;
let lastRide: { key: `0x${string}`; epoch: bigint } | null = null;
for (let e = 0n; e < BigInt(EPOCHS); e++) {
  const head = await waitForBlock(epochStart(clock, e), `(epoch ${e})`);
  dispatcherState = advance(dispatcherState, head).state;
  sa = advance(sa, head).state;
  sb = advance(sb, head).state;
  const epoch = epochAt(clock, head);
  const posted: { key: `0x${string}`; epoch: bigint }[] = [];
  for (let i = 0; i < 2; i++) {
    const now = await c.getBlockNumber({ cacheTime: 0 });
    const r = await D.createEntity(await rideParams(dispatcherState, now, epoch, synRide(n++), "SYN-zone-north"));
    await track("dispatcher", "ride", epoch, r);
    posted.push({ key: r.entityKey, epoch });
  }
  // volunteer A claims the first ride, volunteer B the second; the dispatcher assigns the first.
  const nowA = await c.getBlockNumber({ cacheTime: 0 });
  const ca = await VA.createEntity(await claimParams(sa, nowA, posted[0].key, epoch, { eta: "SYN-eta-15min", vehicle: "SYN-hatchback" }));
  await track("volunteerA", "claim", epoch, ca);
  const cb = await VB.createEntity(await claimParams(sb, nowA, posted[1].key, epoch, { eta: "SYN-eta-20min", vehicle: "SYN-van" }));
  await track("volunteerB", "claim", epoch, cb);
  const asg = await D.createEntity(await assignParams(dispatcherState, nowA, posted[0].key, epoch, { claim: ca.entityKey, instruction: "SYN-wait at the landmark" }));
  await track("dispatcher", "assign", epoch, asg);
  if (lastRide && e === BigInt(EPOCHS) - 1n) {
    const co = await D.createEntity(await closeoutParams(dispatcherState, nowA, lastRide.key, lastRide.epoch, { outcome: "SYN-done" }));
    await track("dispatcher", "closeout", lastRide.epoch, co);
  }
  lastRide = posted[0];
  console.log(`epoch ${epoch}: 2 rides, 2 claims, 1 assign`);
}

// Forgeries, written near the end so they are live when the demo runs.
const now = await c.getBlockNumber({ cacheTime: 0 });
const ownChain = advance(newChain(circle, clock), now).state; // the forger's own key, not the circle's
const ep = epochAt(clock, now);
const fr = await F.createEntity(await rideParams(ownChain, now, ep, { landmark: "SYN-forged", window: "n/a", seats: 0, note: "SYN-forged ride" }, "SYN-zone-north"));
await track("forger", "ride", ep, fr);
if (lastRide) {
  const fa = await F.createEntity(await assignParams(ownChain, now, lastRide.key, ep, { claim: "0x00", instruction: "SYN-forged assignment" }));
  await track("forger", "assign", ep, fa);
}

const avgGas = gas.length ? gas.reduce((a, b) => a + b, 0n) / BigInt(gas.length) : 0n;
const avgPrice = price.length ? price.reduce((a, b) => a + b, 0n) / BigInt(price.length) : 0n;
const manifest = { generatedAt: new Date().toISOString(), circle, genesis: clock.genesisBlock.toString(), epochBlocks: EB.toString(), dispatcher: accountFor("dispatcher").address, records };
mkdirSync(resolve(ROOT, "proof"), { recursive: true });
mkdirSync(resolve(ROOT, "apps/web/public/proof"), { recursive: true });
const text = JSON.stringify(manifest, null, 2) + "\n";
writeFileSync(resolve(ROOT, "proof/seed-manifest.json"), text);
writeFileSync(resolve(ROOT, "apps/web/public/proof/seed-manifest.json"), text);
writeResult(`seed-${today()}.json`, { date: today(), circle, records: records.length, cost: { gasPerRide: Number(avgGas), glmPerRide: (Number(avgGas * avgPrice) / 1e18).toFixed(8) } });
console.log(`\nNEXT_PUBLIC_DEMO_CIRCLE=${circle}`);
