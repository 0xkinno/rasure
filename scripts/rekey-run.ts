// Live rekey run on Tiramisu (Phase 3). Two member devices join a circle; volunteerB's phone is "seized"; the dispatcher
// rekeys to the remaining member only; rides sealed after the rekey must be readable by A and not by the seized phone.
// Appends a fourth scenario ("seized, then rekeyed") to proof/drill-manifest.json. Epochs are 30 blocks.
// Usage: npx tsx scripts/rekey-run.ts
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "@arkiv-network/sdk/query";
import {
  adoptRekey, advance, circleParams, currentKey, deriveForward, epochAt, epochStart, fetchAll, generateDeviceKey, keyFor, memberParams, newChain, open,
  openRekey, q10Rekeys, q9Members, recoverCreates, rekeyParams, rideParams, joinChain, seizureDrill, summarize, ARKIV_ADDRESS, type KeyringState,
} from "@rasure/core";
import { ROOT, accountFor, reader, today, walletFor, writeResult } from "./lib";
import { hex, hex16, synRide, waitForBlock } from "./helpers";

const c = reader();
const D = walletFor("dispatcher");
const VA = walletFor("volunteerA");
const VB = walletFor("volunteerB");
const EB = 30n;
const head0 = await c.getBlockNumber({ cacheTime: 0 });
const clock = { genesisBlock: head0 + 4n, epochBlocks: EB };
const circle = hex16();
const dispatcherState0 = newChain(circle, clock);
const k0 = currentKey(dispatcherState0);
const records: { key: string; txHash: string; circle: string; epoch: string; type: string }[] = [];
const note = (type: string, epoch: bigint, r: { entityKey: string; txHash: string }) => {
  records.push({ key: r.entityKey, txHash: r.txHash, circle, epoch: epoch.toString(), type });
  console.log(type, "epoch", epoch.toString(), r.txHash);
};

const anchor = await D.createEntity(circleParams(circle, clock));
note("circle", 0n, anchor);

// epoch 0: both members publish device keys and join with the epoch 0 chain key
await waitForBlock(epochStart(clock, 0n), "(epoch 0)");
const devA = generateDeviceKey();
const devB = generateDeviceKey();
const mA = await VA.createEntity(memberParams(circle, devA.publicKey, 0n));
note("member", 0n, mA);
const mB = await VB.createEntity(memberParams(circle, devB.publicKey, 0n));
note("member", 0n, mB);
let dState: KeyringState = dispatcherState0;
let aState: KeyringState = joinChain(circle, clock, k0.epoch, k0.chainKey);
let bState: KeyringState = joinChain(circle, clock, k0.epoch, k0.chainKey);

// epoch 1: volunteerB's phone is seized. The dispatcher rekeys to A only, effective epoch 2.
let head = await waitForBlock(epochStart(clock, 1n), "(epoch 1)");
dState = advance(dState, head).state;
aState = advance(aState, head).state;
bState = advance(bState, head).state;
const seizedB = currentKey(bState);
const seizedEpoch = seizedB.epoch;
const seizedKeyHex = hex(seizedB.chainKey);
const live = await fetchAll(c as never, { key: true, creator: true, payload: true }, q9Members(circle), { atBlock: head });
const memberKeys = (live.entities as any[]).map((e) => ({ creator: String(e.creator).toLowerCase(), pub: e.payload as Uint8Array }));
const remaining = memberKeys.filter((m) => m.creator !== accountFor("volunteerB").address.toLowerCase()).map((m) => m.pub);
console.log(`members read from Arkiv: ${memberKeys.length}; remaining after removing volunteerB: ${remaining.length}`);
const fresh = crypto.getRandomValues(new Uint8Array(32));
const rk = await D.createEntity(await rekeyParams(dState, head, 2n, fresh, remaining));
note("rekey", 2n, rk);

// epoch 2: the new chain takes effect
head = await waitForBlock(epochStart(clock, 2n), "(epoch 2)");
dState = adoptRekey(advance(dState, head).state, 2n, fresh);
const rides: { key: string; txHash: string; payload: Uint8Array }[] = [];
for (let i = 0; i < 2; i++) {
  const now = await c.getBlockNumber({ cacheTime: 0 });
  const r = await D.createEntity(await rideParams(advance(dState, now).state, now, 2n, synRide(i), "SYN-zone-north"));
  note("ride", 2n, r);
  const tx = await c.getTransaction({ hash: r.txHash });
  if (tx.to?.toLowerCase() !== ARKIV_ADDRESS) throw new Error("not an Arkiv tx");
  const p = recoverCreates(tx.input).find((x) => x.payload)?.payload;
  if (!p) throw new Error("no payload");
  rides.push({ key: r.entityKey, txHash: r.txHash, payload: p });
}

// Member A reads the rekey entity from Arkiv (live query), adopts it, and opens the rides.
const now = await c.getBlockNumber({ cacheTime: 0 });
const rekeyPage = await fetchAll(c as never, { key: true, creator: true, attributes: true, payload: true }, q10Rekeys(circle, 2n, [accountFor("dispatcher").address]), { atBlock: now });
const rkEntity = (rekeyPage.entities as any[])[0];
const opened = rkEntity ? await openRekey(circle, 2n, rkEntity.payload as Uint8Array, devA) : { ok: false as const, reason: "not_found" };
if (opened.ok) aState = adoptRekey(advance(aState, now).state, opened.epoch, opened.chainKey);
let aOpened = 0;
for (const r of rides) if ((await open(keyFor(aState, 2n), { circle, epoch: 2n, type: "ride" }, r.payload)).ok) aOpened++;

// Removed member B: its stored rekey lookup finds no entry, and forward derivation from the seized key fails.
const bTry = rkEntity ? await openRekey(circle, 2n, rkEntity.payload as Uint8Array, devB) : { ok: false as const, reason: "not_found" };
const bKey = deriveForward(seizedB.chainKey, Number(2n - seizedEpoch));
const hist = rides.map((r) => ({ key: r.key, txHash: r.txHash, circle, epoch: 2n, type: "ride" as const, policy: "ratchet" as const, payload: r.payload }));
const outcomes = await seizureDrill(hist, { ratchet: { epoch: seizedEpoch, chainKey: seizedB.chainKey } });
const exposed = outcomes.filter((o) => o.exposed).length;
let bOpens = 0;
for (const r of rides) if ((await open(bKey, { circle, epoch: 2n, type: "ride" }, r.payload)).ok) bOpens++;

const result = {
  experiment: "rekey on Tiramisu: seized then rekeyed",
  date: today(), circle, epochBlocks: EB, seizedEpoch, effectEpoch: 2n,
  membersReadFromArkiv: memberKeys.length, remainingMembers: remaining.length,
  memberAAdopted: opened.ok, memberAOpenedRides: aOpened, ridesAfterRekey: rides.length,
  removedMemberRekeyEntry: bTry.ok ? "FOUND (bad)" : (bTry as { reason: string }).reason,
  removedMemberOpenedAfterForwardDerivation: bOpens,
  totals: summarize(outcomes),
  rekeyTotals: { exposed, total: outcomes.length },
  pass: opened.ok && aOpened === rides.length && !bTry.ok && bOpens === 0 && exposed === 0,
  records,
};
console.log(JSON.stringify(result, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2).slice(0, 900));
writeResult(`rekey-${today()}.json`, result);
writeFileSync(resolve(ROOT, "proof/rekey-manifest.json"), JSON.stringify({ generatedAt: new Date().toISOString(), circle, records }, null, 2) + "\n");

// Append the fourth scenario to the drill manifest (repo copy and web copy).
for (const rel of ["proof/drill-manifest.json", "apps/web/public/proof/drill-manifest.json"]) {
  const p = resolve(ROOT, rel);
  const m = JSON.parse(readFileSync(p, "utf8"));
  m.scenarios = m.scenarios.filter((s: { id: string }) => s.id !== "rekey");
  m.scenarios.push({
    id: "rekey", title: "Seized, then rekeyed", policy: "ratchet",
    blurb: "The same phone was seized, then the dispatcher rekeyed to the remaining member. Records sealed after the rekey stay shut to the old phone.",
    seized: { ratchet: { epoch: seizedEpoch.toString(), keyHex: seizedKeyHex } },
    records: rides.map((r) => ({ key: r.key, txHash: r.txHash, circle, epoch: "2", type: "ride" })),
  });
  writeFileSync(p, JSON.stringify(m, null, 2) + "\n");
}
console.log(result.pass ? "REKEY PASS" : "REKEY FAIL");
if (!result.pass) process.exitCode = 2;
void eq; void epochAt;
