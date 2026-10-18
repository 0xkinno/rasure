// Live run of the Phase 9 Arkiv features on Tiramisu, one result file per feature (proof/results/<feature>-<date>.json):
//   openNetwork (circle + first ride, one batch), deleteEntity (cancel ride, withdraw claim), patchEntity (rekey batch + gen),
//   changeOwnership (shift handover, rule I9, both directions), permissionlessExtension (tally extended by an auditor),
//   ownedBy(), $expiresAt range, WebSocket OwnershipTransferred and EntityDeleted events.
// Wallets: dispatcher (night), volunteerA, volunteerB (morning dispatcher), auditor. Epochs are 90 blocks. About 8 minutes.
import { createPublicClient as arkivPublic } from "@arkiv-network/sdk";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { eq } from "@arkiv-network/sdk/query";
import { key } from "@arkiv-network/sdk/attr";
import { webSocket, type Hex } from "viem";
import {
  advance, claimRide, currentKey, deleteNotice, epochAt, epochStart, extendCircle, extendTally, fetchAll, generateDeviceKey, handOver, holders, joinChain,
  keyDeathBlock, keyFor, memberParams, newChain, open, openNetwork, q14Circles, partitionRidesAt, publishTally, q13DyingSoon, q1OpenBoard, recoverCreates,
  rekeyAndPatch, rideParams, toChainEntity, withdrawClaim, cancelRide, type KeyringState, type MoreWriter, type ArkivWriter,
} from "@rasure/core";
import { accountFor, reader, today, walletFor, writeResult } from "./lib";
import { hex16, synRide, waitForBlock } from "./helpers";

const c = reader();
const D = walletFor("dispatcher");
const A = walletFor("volunteerA");
const B = walletFor("volunteerB");
const AUD = walletFor("auditor");
const as = <T>(w: unknown) => w as T;
const addr = (r: Parameters<typeof accountFor>[0]) => accountFor(r).address;
const EB = 90n;
const out: Record<string, unknown> = {};
const bi = (v: unknown) => JSON.parse(JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x)));

// WebSocket events observed during the run (no fromBlock)
const events: { type: string; entityKey: string }[] = [];
const ws = arkivPublic({ chain: tiramisu, transport: webSocket("wss://rpc.tiramisu.db-chain.testnet.arkiv.network") });
const stopWs = ws.watchEntityEvents({
  onEntityDeleted: (e) => events.push({ type: "EntityDeleted", entityKey: e.entityKey }),
  onOwnershipTransferred: (e) => events.push({ type: "OwnershipTransferred", entityKey: e.entityKey }),
  onExpiryExtended: (e) => events.push({ type: "ExpiryExtended", entityKey: e.entityKey }),
  onError: () => undefined,
});

const head0 = await c.getBlockNumber({ cacheTime: 0 });
const clock = { genesisBlock: head0 + 3n, epochBlocks: EB };
const circle = hex16();
let sD: KeyringState = newChain(circle, clock);
const k0 = currentKey(sD);
let sA = joinChain(circle, clock, k0.epoch, k0.chainKey);
let sB = joinChain(circle, clock, k0.epoch, k0.chainKey);
let head = await waitForBlock(clock.genesisBlock, "(genesis)");
const adv = (s: KeyringState, h: bigint) => advance(s, h).state;
sD = adv(sD, head); sA = adv(sA, head); sB = adv(sB, head);
const ep = epochAt(clock, head);

// 1. openNetwork: circle + first ride, one transaction
const nr = await openNetwork(as<MoreWriter>(D), sD, head, ep, synRide(0), "SYN-zone-north");
const [circleKey, ride0] = nr.createdEntities;
out.openNetwork = { txHash: nr.txHash, entitiesCreated: nr.createdEntities.length, circleKey, rideKey: ride0 };
console.log("openNetwork", nr.txHash);

// 2. deleteEntity: cancel a ride; withdraw a claim. Honest note: the ciphertext stays in the creation transaction.
head = await c.getBlockNumber({ cacheTime: 0 });
const r1 = await D.createEntity(await rideParams(sD, head, ep, synRide(1), "SYN-zone-north"));
const del = await cancelRide(as<MoreWriter>(D), r1.entityKey);
const goneRide = (await c.select({ key: true }).where(eq("$key", key(r1.entityKey))).fetch()).entities.length === 0;
const tx1 = await c.getTransaction({ hash: r1.txHash });
const pay1 = recoverCreates(tx1.input).find((x) => x.payload)?.payload;
const opened1 = pay1 ? await open(keyFor(sD, ep), { circle, epoch: ep, type: "ride" }, pay1) : { ok: false };
const claim = await claimRide(as<ArkivWriter>(A), sA, head, ride0, ep, { eta: "SYN-eta-15min", vehicle: "SYN-hatchback", ride: ride0, by: addr("volunteerA") });
const wd = await withdrawClaim(as<MoreWriter>(A), claim.entityKey);
const goneClaim = (await c.select({ key: true }).where(eq("$key", key(claim.entityKey))).fetch()).entities.length === 0;
out.delete = {
  cancelRideTx: del.txHash, withdrawClaimTx: wd.txHash, rideGoneFromLiveState: goneRide, claimGoneFromLiveState: goneClaim,
  ciphertextStillInCreationTx: !!pay1, payloadStillOpensWithLiveKey: opened1.ok, unreadableAtBlock: keyDeathBlock(clock, ep),
  uiNotice: deleteNotice(keyDeathBlock(clock, ep)),
};
console.log("delete", del.txHash, wd.txHash);

// 3. patchEntity: a rekey is one batch (rekey entity + circle gen patch)
head = await c.getBlockNumber({ cacheTime: 0 });
const dev = generateDeviceKey();
const mem = await A.createEntity(memberParams(circle, dev.publicKey, ep));
const fresh = crypto.getRandomValues(new Uint8Array(32));
const rk = await rekeyAndPatch(as<MoreWriter>(D), sD, head, circleKey, ep + 1n, fresh, [dev.publicKey], 2n);
const anchor = await c.select({ key: true, owner: true, creator: true, attributes: true }).where(eq("$key", key(circleKey))).fetch();
const ca = toChainEntity(anchor.entities[0]);
out.gen = { memberTx: mem.txHash, batchTx: rk.txHash, entitiesCreated: rk.createdEntities.length, entitiesPatched: rk.patchedEntities?.length ?? 0, genReadFromAnchor: String(ca.attributes.gen), expected: "2" };
console.log("gen", rk.txHash, "gen=", ca.attributes.gen);

// 4. changeOwnership: shift handover with the sealed handover record, one batch; rule I9 both directions
head = await c.getBlockNumber({ cacheTime: 0 });
const ho = await handOver(as<MoreWriter>(D), sD, head, ep, circleKey, addr("volunteerB"));
const hoRc = await c.getTransactionReceipt({ hash: ho.txHash });
const H = hoRc.blockNumber;
const ownerBefore = toChainEntity((await c.select({ key: true, owner: true, creator: true }).where(eq("$key", key(circleKey))).atBlock(H - 1n).fetch()).entities[0]);
const ownerAfter = toChainEntity((await c.select({ key: true, owner: true, creator: true }).where(eq("$key", key(circleKey))).atBlock(H).fetch()).entities[0]);
const timeline = { creator: addr("dispatcher"), changes: [{ block: H, owner: addr("volunteerB") }] };
// B (new holder) posts a ride; D (old holder) posts a ride AFTER the handover: must be ignored (I9)
head = await c.getBlockNumber({ cacheTime: 0 });
const rB = await B.createEntity(await rideParams(adv(sB, head), head, ep, synRide(2), "SYN-zone-north"));
const rDold = await D.createEntity(await rideParams(sD, head, ep, synRide(3), "SYN-zone-north"));
const holderList = holders(timeline);
const pageRides = await fetchAll(c as never, { key: true, creator: true, owner: true, createdAt: true, expiresAt: true, attributes: true }, q1OpenBoard(circle, epochAt(clock, head), holderList), { atBlock: await c.getBlockNumber({ cacheTime: 0 }) });
const part = partitionRidesAt((pageRides.entities as unknown[]).map(toChainEntity), timeline);
const keyOf = (r: { key: string }) => r.key.toLowerCase();
const counted = new Set(part.counted.map(keyOf));
const ignored = new Set(part.ignored.map(keyOf));
// lease renewal moves with the owner
head = await c.getBlockNumber({ cacheTime: 0 });
const anchorNow = toChainEntity((await c.select({ key: true, owner: true, expiresAt: true }).where(eq("$key", key(circleKey))).fetch()).entities[0]);
let oldHolderExtend = "accepted (unexpected)";
try { await extendCircle(as<ArkivWriter>(D), circleKey, head, 0n); } catch (e) { oldHolderExtend = `refused: ${(e as Error).message.slice(0, 140)}`; }
const newHolderExtend = await extendCircle(as<ArkivWriter>(B), circleKey, head, anchorNow.expiresAt - BigInt(30 * 24 * 60 * 30) - 1000n).then((r) => r.txHash, (e) => `failed: ${(e as Error).message.slice(0, 140)}`);
const owned = await fetchAll(c as never, { key: true, owner: true }, q14Circles(), { ownedBy: addr("volunteerB"), atBlock: await c.getBlockNumber({ cacheTime: 0 }) });
const ownedOld = await fetchAll(c as never, { key: true, owner: true }, q14Circles(), { ownedBy: addr("dispatcher"), atBlock: await c.getBlockNumber({ cacheTime: 0 }) });
out.handover = {
  batchTx: ho.txHash, handoverBlock: H, entitiesCreated: ho.createdEntities.length, ownershipChanges: ho.ownershipChanges?.length ?? 0,
  ownerBefore: ownerBefore.owner, ownerAfter: ownerAfter.owner, creatorUnchanged: ownerAfter.creator,
  rideByNewHolderTx: rB.txHash, rideByOldHolderAfterHandoverTx: rDold.txHash,
  rideByNewHolderCounted: counted.has(rB.entityKey.toLowerCase()), rideByOldHolderAfterHandoverIgnored: ignored.has(rDold.entityKey.toLowerCase()),
  rideBeforeHandoverStillCounted: counted.has(ride0.toLowerCase()),
  oldHolderLeaseExtend: oldHolderExtend, newHolderLeaseExtendTx: newHolderExtend,
  networksHeldByNewHolder: owned.entities.length, networksHeldByOldHolder: ownedOld.entities.length,
};
console.log("handover", ho.txHash, "H=", H);

// 5. permissionlessExtension: the tally. B (holder) publishes; the auditor (not the owner) extends it. A ride refuses.
head = await c.getBlockNumber({ cacheTime: 0 });
const tl = await publishTally(as<MoreWriter>(B), circle, ep, 1n);
const tBefore = toChainEntity((await c.select({ key: true, owner: true, creator: true, expiresAt: true, attributes: true }).where(eq("$key", key(tl.entityKey))).fetch()).entities[0]);
await waitForBlock((await c.getBlockNumber({ cacheTime: 0 })) + 10n, "(let the tally age a few blocks)");
head = await c.getBlockNumber({ cacheTime: 0 });
const te = await extendTally(as<MoreWriter>(AUD), tl.entityKey, head, tBefore.expiresAt);
const tAfter = toChainEntity((await c.select({ key: true, owner: true, creator: true, expiresAt: true }).where(eq("$key", key(tl.entityKey))).fetch()).entities[0]);
let rideExtend = "accepted (unexpected)";
try { await AUD.extendEntity({ entityKey: ride0, expires: (await import("@arkiv-network/sdk")).ExpirationTime.atBlock(head + 100_000n) }); } catch (e) { rideExtend = `refused: ${(e as Error).message.slice(0, 160)}`; }
out.tally = {
  publishTx: tl.txHash, auditorExtendTx: te.txHash, auditor: addr("auditor"), creator: tBefore.creator, ownerBefore: tBefore.owner, ownerAfter: tAfter.owner,
  expiresAtBefore: tBefore.expiresAt, expiresAtAfter: tAfter.expiresAt, served: String(tBefore.attributes.served),
  auditorExtendRefusedOnRide: rideExtend,
};
console.log("tally", tl.txHash, te.txHash);

// 6. $expiresAt range: rides that die in the next 10 minutes (300 blocks)
head = await c.getBlockNumber({ cacheTime: 0 });
const dying = await fetchAll(c as never, { key: true, expiresAt: true }, q13DyingSoon(circle, epochAt(clock, head), holderList, head + 300n), { atBlock: head });
out.expiresRange = { predicate: "Q13", withinBlocks: 300, head, ridesDyingSoon: dying.entities.length };

// 7. WebSocket events
await waitForBlock((await c.getBlockNumber({ cacheTime: 0 })) + 4n);
stopWs();
out.events = { observed: events, deleted: events.filter((e) => e.type === "EntityDeleted").length, ownershipTransferred: events.filter((e) => e.type === "OwnershipTransferred").length };

for (const [k, v] of Object.entries(out)) writeResult(`${k}-${today()}.json`, { date: today(), circle, ...(bi(v) as object) });
console.log(JSON.stringify(bi(out), null, 1).slice(0, 3500));
void epochStart; void reader;
