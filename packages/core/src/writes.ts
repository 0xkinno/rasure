// Every Arkiv write Rasure makes. Each is a real signed transaction to the Arkiv system address.
// INVARIANT I1: a sealed record's Entity Expiration is built ONLY from keyDeathBlock(epoch).
// The caller supplies the head block so this module stays pure and testable.

import { ExpirationTime, type CreateEntityParameters } from "@arkiv-network/sdk";
import { i32, key, u64 } from "@arkiv-network/sdk/attr";
import { type Hex } from "viem";
import { keyDeathBlock, keyFor, type CircleClock, type KeyringState } from "./ratchet";
import { PROJECT, SCHEMA_VERSION, SEALED_CONTENT_TYPE, TYPES, type EntityType } from "./schema";
import { seal } from "./seal";
import { zoneTag } from "./blind";

/** Refuse to post into an epoch with fewer than this many blocks left before key death. */
export const MIN_BLOCKS_BEFORE_DEATH = 20n;
/** The circle anchor is a 30 day lease (Tiramisu: about 2 s per block). */
export const CIRCLE_LEASE_BLOCKS = 30n * 24n * 60n * 60n / 2n;

export interface ArkivWriter {
  createEntity(p: CreateEntityParameters): Promise<{ entityKey: Hex; txHash: Hex; expiresAt: bigint }>;
  executeBatch(p: { creates?: CreateEntityParameters[]; extensions?: { entityKey: Hex; expires: ReturnType<typeof ExpirationTime.atBlock> }[] }): Promise<{ txHash: Hex; createdEntities: Hex[] }>;
  extendEntity(p: { entityKey: Hex; expires: ReturnType<typeof ExpirationTime.atBlock> }): Promise<{ entityKey: Hex; txHash: Hex; expiresAt: bigint }>;
}

export class EpochTooLateError extends Error {
  constructor(public readonly epoch: bigint, public readonly blocksLeft: bigint) {
    super(`epoch ${epoch} has ${blocksLeft} blocks before key death; minimum is ${MIN_BLOCKS_BEFORE_DEATH}`);
    this.name = "EpochTooLateError";
  }
}

/** Throws if the epoch's key dies too soon for a write to be included safely. */
export function assertMargin(clock: CircleClock, epoch: bigint, head: bigint): void {
  const left = keyDeathBlock(clock, epoch) - head;
  if (left < MIN_BLOCKS_BEFORE_DEATH) throw new EpochTooLateError(epoch, left);
}

const common = (circle: string, type: EntityType) => ({ project: PROJECT, v: i32(SCHEMA_VERSION), type, circle });

export function circleParams(circle: string, clock: CircleClock): CreateEntityParameters {
  return {
    // Six public attributes: project, type, circle, epoch_blocks, genesis, gen. `v` is carried by project "rasure/v1".
    attributes: { project: PROJECT, type: TYPES.circle, circle, epoch_blocks: u64(clock.epochBlocks), genesis: u64(clock.genesisBlock), gen: u64(1n) },
    payload: new Uint8Array(),
    contentType: "application/octet-stream",
    expires: ExpirationTime.fromBlocks(Number(CIRCLE_LEASE_BLOCKS)),
    // No readonly: the dispatcher may extend the lease; no permissionless extension (owner-only lease).
  };
}

async function sealedParams(
  state: KeyringState,
  head: bigint,
  epoch: bigint,
  type: EntityType,
  body: unknown,
  extra: Record<string, unknown>,
): Promise<CreateEntityParameters> {
  assertMargin(state.clock, epoch, head);
  const chainKey = keyFor(state, epoch);
  if (!chainKey) throw new Error(`no key for epoch ${epoch} on this device`);
  const payload = await seal(chainKey, { circle: state.circle, epoch, type }, body);
  return {
    attributes: { ...common(state.circle, type), epoch: u64(epoch), ...extra } as CreateEntityParameters["attributes"],
    payload,
    contentType: SEALED_CONTENT_TYPE,
    expires: ExpirationTime.atBlock(keyDeathBlock(state.clock, epoch)), // I1
    flags: { readonly: true },
  };
}

export const rideParams = async (state: KeyringState, head: bigint, epoch: bigint, body: unknown, zone: string) => {
  const chainKey = keyFor(state, epoch);
  if (!chainKey) throw new Error(`no key for epoch ${epoch} on this device`);
  return sealedParams(state, head, epoch, TYPES.ride, body, { tag: zoneTag(chainKey, zone) });
};
export const claimParams = (state: KeyringState, head: bigint, rideKey: Hex, rideEpoch: bigint, body: unknown) =>
  sealedParams(state, head, rideEpoch, TYPES.claim, body, { ref: key(rideKey) });
export const assignParams = (state: KeyringState, head: bigint, rideKey: Hex, rideEpoch: bigint, body: unknown) =>
  sealedParams(state, head, rideEpoch, TYPES.assign, body, { ref: key(rideKey) });
export const closeoutParams = (state: KeyringState, head: bigint, rideKey: Hex, rideEpoch: bigint, body: unknown) =>
  sealedParams(state, head, rideEpoch, TYPES.closeout, body, { ref: key(rideKey) });

export const createCircle = (w: ArkivWriter, circle: string, clock: CircleClock) => w.createEntity(circleParams(circle, clock));

/** Circle create + first ride in ONE transaction: both land or neither. */
export async function createCircleWithRide(w: ArkivWriter, state: KeyringState, head: bigint, epoch: bigint, body: unknown, zone: string) {
  return w.executeBatch({ creates: [circleParams(state.circle, state.clock), await rideParams(state, head, epoch, body, zone)] });
}

export async function postRide(w: ArkivWriter, state: KeyringState, head: bigint, epoch: bigint, body: unknown, zone: string) {
  return w.createEntity(await rideParams(state, head, epoch, body, zone));
}
export async function claimRide(w: ArkivWriter, state: KeyringState, head: bigint, rideKey: Hex, rideEpoch: bigint, body: unknown) {
  return w.createEntity(await claimParams(state, head, rideKey, rideEpoch, body));
}
export async function assignClaim(w: ArkivWriter, state: KeyringState, head: bigint, rideKey: Hex, rideEpoch: bigint, body: unknown) {
  return w.createEntity(await assignParams(state, head, rideKey, rideEpoch, body));
}
export async function closeRide(w: ArkivWriter, state: KeyringState, head: bigint, rideKey: Hex, rideEpoch: bigint, body: unknown) {
  return w.createEntity(await closeoutParams(state, head, rideKey, rideEpoch, body));
}

/** Assign one claim and close a previous ride in one transaction (one popup, both land or neither). */
export async function assignAndClosePrevious(
  w: ArkivWriter,
  state: KeyringState,
  head: bigint,
  assign: { rideKey: Hex; epoch: bigint; body: unknown },
  close: { rideKey: Hex; epoch: bigint; body: unknown },
) {
  return w.executeBatch({
    creates: [
      await assignParams(state, head, assign.rideKey, assign.epoch, assign.body),
      await closeoutParams(state, head, close.rideKey, close.epoch, close.body),
    ],
  });
}

/** Lifetime Extension as a lease: only ever later than the current deadline. */
export function extendCircle(w: ArkivWriter, circleKey: Hex, head: bigint, currentExpiresAt: bigint) {
  const target = head + CIRCLE_LEASE_BLOCKS;
  if (target <= currentExpiresAt) throw new Error("lease already covers the next 30 days; nothing to extend");
  return w.extendEntity({ entityKey: circleKey, expires: ExpirationTime.atBlock(target) });
}
