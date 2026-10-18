// Night watch: keeps the demo circle alive during judging, on purpose, and checks it.
//   1. if the demo circle has no ride in the current epoch, post one sealed ride and one claim;
//   2. extend the circle lease when under 7 days remain;
//   3. check invariants I1 and I3 over every live entity of the circle;
//   4. append one line to proof/watch/<date>.jsonl (the workflow commits it as 0xkinno).
// Env: WATCH_CIRCLE, WATCH_GENESIS, WATCH_EPOCH_BLOCKS, DEMO_CHAIN_KEY (hex epoch-0 chain key of the demo circle),
//      DISPATCHER_PRIVATE_KEY, VOLUNTEERA_PRIVATE_KEY, ARKIV_ACCESS_KEY. Disclosed in the README: the runner is a long-lived
//      member device of the DEMO circle only, so it can derive any epoch of that one circle.
import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "@arkiv-network/sdk/query";
import {
  advance, claimRide, epochAt, extendCircle, fetchAll, i1Violations, i3Violations, joinChain, q1OpenBoard, q6Circle, rideParams, toChainEntity,
  type ArkivWriter,
} from "@rasure/core";
import { ROOT, accountFor, reader, today, walletFor } from "./lib";
import { synRide, unhex } from "./helpers";

const need = (n: string) => {
  const v = process.env[n];
  if (!v) throw new Error(`missing env ${n}`);
  return v;
};
const circle = need("WATCH_CIRCLE");
const clock = { genesisBlock: BigInt(need("WATCH_GENESIS")), epochBlocks: BigInt(need("WATCH_EPOCH_BLOCKS")) };
const k0 = unhex(need("DEMO_CHAIN_KEY"));
const c = reader();
const D = walletFor("dispatcher");
const A = walletFor("volunteerA");
const dispatcher = accountFor("dispatcher").address;
const line: Record<string, unknown> = { at: new Date().toISOString() };

const head = await c.getBlockNumber({ cacheTime: 0 });
line.head = head.toString();
const epoch = epochAt(clock, head);
line.epoch = epoch.toString();
let state = advance(joinChain(circle, clock, 0n, k0), head).state;

// current rides of the epoch pair, trusted dispatcher only
const sel = { key: true, creator: true, owner: true, createdAt: true, expiresAt: true, attributes: true } as const;
const rides = await fetchAll(c as never, sel, q1OpenBoard(circle, epoch, [dispatcher]), { atBlock: head });
const inEpoch = (rides.entities as unknown[]).map(toChainEntity).filter((e) => BigInt(e.attributes.epoch as string | bigint) === epoch);
line.ridesThisEpoch = inEpoch.length;

if (inEpoch.length === 0) {
  const now = await c.getBlockNumber({ cacheTime: 0 });
  state = advance(state, now).state;
  const ride = await D.createEntity(await rideParams(state, now, epoch, synRide(Number(epoch % 5n)), "SYN-zone-north"));
  const claim = await claimRide(A as unknown as ArkivWriter, state, now, ride.entityKey, epoch, {
    eta: "SYN-eta-15min", vehicle: "SYN-hatchback", ride: ride.entityKey, by: accountFor("volunteerA").address,
  });
  line.posted = { rideTx: ride.txHash, claimTx: claim.txHash };
} else line.posted = null;

// lease: extend when under 7 days remain
const anchorPage = await fetchAll(c as never, { key: true, creator: true, owner: true, expiresAt: true, attributes: true }, q6Circle(circle), { atBlock: head, createdBy: dispatcher });
const anchor = (anchorPage.entities as { key: `0x${string}`; expiresAt: bigint }[])[0];
if (!anchor) throw new Error("demo circle anchor not found");
const remaining = BigInt(anchor.expiresAt) - head;
line.leaseBlocksRemaining = remaining.toString();
if (remaining < 7n * 43_200n) {
  const ext = await extendCircle(D as unknown as ArkivWriter, anchor.key, head, BigInt(anchor.expiresAt));
  line.leaseExtended = ext.txHash;
} else line.leaseExtended = null;

// invariants over every live entity of the circle
const all = await fetchAll(c as never, sel, eq("circle", circle), { atBlock: head });
const ents = (all.entities as unknown[]).map(toChainEntity);
const v = [...i1Violations(ents, clock), ...i3Violations(ents)];
line.liveEntities = ents.length;
line.violations = v;
line.ok = v.length === 0;

const dir = resolve(ROOT, "proof/watch");
mkdirSync(dir, { recursive: true });
appendFileSync(resolve(dir, `${today()}.jsonl`), JSON.stringify(line) + "\n");
console.log(JSON.stringify(line));
if (v.length) process.exitCode = 2;
