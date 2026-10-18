// Phase 9 writes: cancel/withdraw (deleteEntity), shift handover (changeOwnership), rekey with a generation patch
// (patchEntity), the service tally (permissionlessExtension), and circle plus first ride in one popup.
// Every function returns a real Arkiv transaction. Pure builders take the head block from the caller.

import { ExpirationTime, type CreateEntityParameters } from "@arkiv-network/sdk";
import { i32, key, u64 } from "@arkiv-network/sdk/attr";
import type { Hex } from "viem";
import { keyDeathBlock, type KeyringState } from "./ratchet";
import { rekeyParams } from "./writes-rekey";
import { PROJECT, SCHEMA_VERSION, SEALED_CONTENT_TYPE, TYPES } from "./schema";
import { seal } from "./seal";
import { keyFor } from "./ratchet";
import { assertMargin, circleParams, rideParams } from "./writes";

/** Minimal writer surface used here (the SDK wallet client satisfies it). */
export interface MoreWriter {
  createEntity(p: CreateEntityParameters): Promise<{ entityKey: Hex; txHash: Hex; expiresAt: bigint }>;
  deleteEntity(p: { entityKey: Hex }): Promise<{ entityKey: Hex; txHash: Hex }>;
  extendEntity(p: { entityKey: Hex; expires: ReturnType<typeof ExpirationTime.atBlock> }): Promise<{ entityKey: Hex; txHash: Hex; expiresAt: bigint }>;
  executeBatch(p: {
    creates?: CreateEntityParameters[];
    patches?: { entityKey: Hex; set?: Record<string, unknown> }[];
    deletes?: { entityKey: Hex }[];
    ownershipChanges?: { entityKey: Hex; newOwner: Hex }[];
  }): Promise<{ txHash: Hex; createdEntities: Hex[]; patchedEntities?: Hex[]; deletedEntities?: Hex[]; ownershipChanges?: Hex[] }>;
}

/** The tally lives 90 days (Tiramisu: about 2 s per block). */
export const TALLY_BLOCKS = 90 * 24 * 60 * 30;

/** What the interface says after a delete: removed now, unreadable only when the key dies. */
export function deleteNotice(deathBlock: bigint): string {
  return `Removed from the board now. Its ciphertext still exists in the transaction; it becomes unreadable at block ${deathBlock.toString()}, when tonight's key dies.`;
}

/** Cancel a ride (dispatcher, before it is assigned) or withdraw a claim (volunteer): deleteEntity by the entity's owner. */
export const cancelRide = (w: MoreWriter, rideKey: Hex) => w.deleteEntity({ entityKey: rideKey });
export const withdrawClaim = (w: MoreWriter, claimKey: Hex) => w.deleteEntity({ entityKey: claimKey });

/** A sealed handover record: who the network goes to. Same epoch lifetime as any sealed record. */
export async function handoverParams(state: KeyringState, head: bigint, epoch: bigint, circleKey: Hex, newOwner: Hex): Promise<CreateEntityParameters> {
  assertMargin(state.clock, epoch, head);
  const ck = keyFor(state, epoch);
  if (!ck) throw new Error(`no key for epoch ${epoch} on this device`);
  return {
    attributes: { project: PROJECT, v: i32(SCHEMA_VERSION), type: TYPES.handover, circle: state.circle, epoch: u64(epoch), ref: key(circleKey) },
    payload: await seal(ck, { circle: state.circle, epoch, type: TYPES.handover }, { to: newOwner, note: "SYN-shift handover" }),
    contentType: SEALED_CONTENT_TYPE,
    expires: ExpirationTime.atBlock(keyDeathBlock(state.clock, epoch)),
    flags: { readonly: true },
  };
}

/** Shift handover: changeOwnership on the circle anchor plus the sealed handover record, one transaction. */
export async function handOver(w: MoreWriter, state: KeyringState, head: bigint, epoch: bigint, circleKey: Hex, newOwner: Hex) {
  return w.executeBatch({
    creates: [await handoverParams(state, head, epoch, circleKey, newOwner)],
    ownershipChanges: [{ entityKey: circleKey, newOwner }],
  });
}

/** A rekey is one batch: the rekey entity and a patch of the circle's public `gen`. Phones read `gen` from the anchor they already fetch. */
export async function rekeyAndPatch(
  w: MoreWriter,
  state: KeyringState,
  head: bigint,
  circleKey: Hex,
  effectEpoch: bigint,
  newChainKey: Uint8Array,
  members: Uint8Array[],
  nextGen: bigint,
) {
  return w.executeBatch({
    creates: [await rekeyParams(state, head, effectEpoch, newChainKey, members)],
    patches: [{ entityKey: circleKey, set: { gen: u64(nextGen) } }],
  });
}

/** One tally per closed epoch: a count and nothing else. Readonly plus permissionlessExtension, 90 days. */
export function tallyParams(circle: string, epoch: bigint, served: bigint): CreateEntityParameters {
  return {
    attributes: { project: PROJECT, v: i32(SCHEMA_VERSION), type: TYPES.tally, circle, epoch: u64(epoch), served: u64(served) },
    payload: new Uint8Array(),
    contentType: "application/octet-stream",
    expires: ExpirationTime.fromBlocks(TALLY_BLOCKS),
    flags: { readonly: true, permissionlessExtension: true },
  };
}
export const publishTally = (w: MoreWriter, circle: string, epoch: bigint, served: bigint) => w.createEntity(tallyParams(circle, epoch, served));

/** A funder or auditor keeps a tally alive without owning it. Only ever to a later block. */
export function extendTally(w: MoreWriter, tallyKey: Hex, head: bigint, currentExpiresAt: bigint) {
  const target = head + BigInt(TALLY_BLOCKS);
  if (target <= currentExpiresAt) throw new Error("tally already lives at least 90 more days");
  return w.extendEntity({ entityKey: tallyKey, expires: ExpirationTime.atBlock(target) });
}

/** "Open tonight's network": the circle and its first ride in one transaction, one wallet popup. */
export async function openNetwork(w: MoreWriter, state: KeyringState, head: bigint, epoch: bigint, body: unknown, zone: string) {
  return w.executeBatch({ creates: [circleParams(state.circle, state.clock), await rideParams(state, head, epoch, body, zone)] });
}
