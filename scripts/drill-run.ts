// Writes the same synthetic rides to Tiramisu three ways (plaintext, static key, ratchet), each as its own
// circle, across several epochs. Waits until the older epochs are dead, then runs the seizure drill from
// calldata only. Writes proof/drill-manifest.json (+ copy for the web app) and proof/results/drill-<date>.json.
// Usage: npx tsx scripts/drill-run.ts [--epochs=6] [--per=2] [--epoch-blocks=30]
// Epoch length 30 blocks (1 minute) keeps the run to a few minutes; key death is two epochs after epoch start.
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  ARKIV_ADDRESS, advance, circleParams, currentKey, epochAt, epochStart, keyDeathBlock, keyFor, newChain, open, recoverCreates,
  rideParams, seizureDrill, summarize, zoneTag, type HistoricalRecord, type KeyringState, type Policy,
} from "@rasure/core";
import { ROOT, reader, today, walletFor, writeResult } from "./lib";
import { hex, hex16, plaintextRide, staticKeyRide, synRide, waitForBlock } from "./helpers";

const arg = (n: string, d: number) => Number(process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d);
const EPOCHS = arg("epochs", 6);
const PER = arg("per", 2);
const EB = BigInt(arg("epoch-blocks", 30));
const ZONE = "SYN-zone-north";

const c = reader();
const w = walletFor("dispatcher");
const head0 = await c.getBlockNumber({ cacheTime: 0 });
const genesis = head0 + 4n;
const clock = { genesisBlock: genesis, epochBlocks: EB };
const staticKey = crypto.getRandomValues(new Uint8Array(32));
const ratchetState0 = newChain(hex16(), clock);
const circles: Record<Policy, string> = { plaintext: hex16(), static_key: hex16(), ratchet: ratchetState0.circle };

console.log(`drill genesis block ${genesis}, epochs ${EPOCHS}, ${PER} rides per epoch per scenario`);
for (const p of ["plaintext", "static_key", "ratchet"] as Policy[]) {
  const r = await w.createEntity(circleParams(circles[p], clock));
  console.log("circle", p, r.txHash);
}

type Rec = { key: string; txHash: string; circle: string; epoch: bigint; policy: Policy; type: "ride" };
const recs: Rec[] = [];
let member: KeyringState = ratchetState0; // a legitimate device that keeps advancing
const memberChecks: { epoch: bigint; opened: boolean; live: boolean }[] = [];
let n = 0;

for (let e = 0n; e < BigInt(EPOCHS); e++) {
  const start = epochStart(clock, e);
  const head = await waitForBlock(start, `(epoch ${e} start)`);
  if (head - start > EB - 5n) console.log(`  warning: late into epoch ${e}`);
  member = advance(member, head).state;
  for (let i = 0; i < PER; i++) {
    const body = synRide(n++);
    const now = await c.getBlockNumber({ cacheTime: 0 });
    const ep = epochAt(clock, now);
    // plaintext
    const pt = plaintextRide(circles.plaintext, clock, ep, "plain", body);
    const a = await w.createEntity(pt);
    recs.push({ key: a.entityKey, txHash: a.txHash, circle: circles.plaintext, epoch: ep, policy: "plaintext", type: "ride" });
    // static key
    const sk = await staticKeyRide(circles.static_key, clock, ep, "static", staticKey, body);
    const b = await w.createEntity(sk);
    recs.push({ key: b.entityKey, txHash: b.txHash, circle: circles.static_key, epoch: ep, policy: "static_key", type: "ride" });
    // ratchet
    const st = advance(member, now).state;
    const rp = await rideParams(st, now, ep, body, ZONE);
    const d = await w.createEntity(rp);
    recs.push({ key: d.entityKey, txHash: d.txHash, circle: circles.ratchet, epoch: ep, policy: "ratchet", type: "ride" });
    console.log(`epoch ${ep} ride ${i + 1}/${PER} written (3 scenarios)`);
  }
}

// Seizure time: the newest epoch is current; records of epochs two or more behind are dead (expired).
const headNow = await c.getBlockNumber({ cacheTime: 0 });
member = advance(member, headNow).state;
console.log(`seizure at head ${headNow}, epoch ${epochAt(clock, headNow)}`);

// The seized phone holds only its newest key. Rebuild it from the continuously advancing member device.
const seizedRing = currentKey(member);
const device = { ratchet: { epoch: seizedRing.epoch, chainKey: seizedRing.chainKey.slice() }, staticKey };

// Read every record's payload back from calldata (not from live state), exactly as the UI will.
const hist: (HistoricalRecord & { txHash: string })[] = [];
for (const r of recs) {
  const tx = await c.getTransaction({ hash: r.txHash as `0x${string}` });
  if (tx.to?.toLowerCase() !== ARKIV_ADDRESS) throw new Error("creation tx not sent to the Arkiv address");
  const created = recoverCreates(tx.input).find((x) => x.payload);
  if (!created?.payload) throw new Error(`no payload in ${r.txHash}`);
  hist.push({ key: r.key, txHash: r.txHash, circle: r.circle, epoch: r.epoch, type: r.type, policy: r.policy, payload: created.payload });
}
const outcomes = await seizureDrill(hist, device);
const totals = summarize(outcomes);

// Error direction (b): a legitimate member that kept advancing must open every record of the current and grace epoch.
const finalHead = await c.getBlockNumber({ cacheTime: 0 });
member = advance(member, finalHead).state;
const nowEpoch = epochAt(clock, finalHead);
for (const h of hist.filter((x) => x.policy === "ratchet")) {
  const live = h.epoch >= nowEpoch - 1n;
  if (!live) continue;
  const res = await open(keyFor(member, h.epoch), { circle: h.circle, epoch: h.epoch, type: "ride" }, h.payload);
  memberChecks.push({ epoch: h.epoch, opened: res.ok, live });
}
const attackerOpenedPast = outcomes.filter((o) => o.policy === "ratchet" && o.epoch < seizedRing.epoch && o.exposed).length;
const memberRefused = memberChecks.filter((m) => !m.opened).length;

const manifest = {
  generatedAt: new Date().toISOString(),
  head: finalHead.toString(),
  epochBlocks: EB.toString(),
  genesis: genesis.toString(),
  seizedEpoch: seizedRing.epoch.toString(),
  note: "Synthetic demo circles. The keys below belong to throwaway drill circles that hold only SYN- data.",
  scenarios: ([
    ["plaintext", "Plaintext board", "Every payload is readable text in the creation transaction. Expiry hides the card, not the bytes."],
    ["static_key", "One-key board", "Payloads are encrypted, but one key on the phone never changes, so one seized phone opens all of history."],
    ["ratchet", "Rasure", "Each epoch has its own key, erased on every phone at the epoch's key-death block. The seized phone holds only the newest key."],
  ] as [Policy, string, string][]).map(([id, title, blurb]) => ({
    id, title, blurb, policy: id,
    seized: id === "ratchet" ? { ratchet: { epoch: seizedRing.epoch.toString(), keyHex: hex(seizedRing.chainKey) } } : id === "static_key" ? { staticKeyHex: hex(staticKey) } : {},
    records: recs.filter((r) => r.policy === id).map((r) => ({ key: r.key, txHash: r.txHash, circle: r.circle, epoch: r.epoch.toString(), type: r.type })),
  })),
};
mkdirSync(resolve(ROOT, "proof"), { recursive: true });
mkdirSync(resolve(ROOT, "apps/web/public/proof"), { recursive: true });
const text = JSON.stringify(manifest, null, 2) + "\n";
writeFileSync(resolve(ROOT, "proof/drill-manifest.json"), text);
writeFileSync(resolve(ROOT, "apps/web/public/proof/drill-manifest.json"), text);

const result = {
  experiment: "seizure drill on Tiramisu history",
  date: today(), sdk: "@arkiv-network/sdk@0.8.1", chainId: 7738577,
  dispatcher: "dispatcher", genesis, epochBlocks: EB, epochs: EPOCHS, ridesPerEpoch: PER,
  seizedEpoch: seizedRing.epoch, headAtDrill: finalHead,
  totals,
  errorDirections: { attackerOpenedPast, memberRefused, liveRecords: memberChecks.length },
  outcomes: outcomes.map((o) => ({ key: o.key, policy: o.policy, epoch: o.epoch, exposed: o.exposed, why: o.why })),
  zoneTagExample: zoneTag(seizedRing.chainKey, ZONE),
};
console.log("totals", JSON.stringify(totals), "attackerOpenedPast", attackerOpenedPast, "memberRefused", memberRefused);
console.log("wrote", writeResult(`drill-${today()}.json`, result));
