// Member and rekey writes (Phase 3). Kept beside writes.ts so the Phase 2 surface stays small.
import { ExpirationTime, type CreateEntityParameters } from "@arkiv-network/sdk";
import { i32, u64 } from "@arkiv-network/sdk/attr";
import { rekeyExpiry, sealRekey } from "./rekey";
import type { KeyringState } from "./ratchet";
import { PROJECT, SCHEMA_VERSION, TYPES } from "./schema";
import { EpochTooLateError, MIN_BLOCKS_BEFORE_DEATH, type ArkivWriter } from "./writes";

/** Member entities live one day: long enough for the dispatcher to rekey, short enough to vanish. */
export const MEMBER_BLOCKS = 43_200;

const common = (circle: string, type: string) => ({ project: PROJECT, v: i32(SCHEMA_VERSION), type, circle });

/** A member publishes its device public key (not the wallet key). Public by definition, 33 bytes. */
export function memberParams(circle: string, devicePublicKey: Uint8Array, epoch: bigint): CreateEntityParameters {
  return {
    attributes: { ...common(circle, TYPES.member), epoch: u64(epoch) },
    payload: devicePublicKey,
    contentType: "application/vnd.rasure.devicekey.v1",
    expires: ExpirationTime.fromBlocks(MEMBER_BLOCKS),
    flags: { readonly: true },
  };
}

/** The dispatcher seals `newChainKey` to every remaining member device key. Takes effect at `effectEpoch`. */
export async function rekeyParams(
  state: KeyringState,
  head: bigint,
  effectEpoch: bigint,
  newChainKey: Uint8Array,
  memberDeviceKeys: Uint8Array[],
): Promise<CreateEntityParameters> {
  const exp = rekeyExpiry(state.clock, effectEpoch);
  if (exp - head < MIN_BLOCKS_BEFORE_DEATH) throw new EpochTooLateError(effectEpoch, exp - head);
  return {
    attributes: { ...common(state.circle, TYPES.rekey), epoch: u64(effectEpoch) },
    payload: await sealRekey(state.circle, effectEpoch, newChainKey, memberDeviceKeys),
    contentType: "application/vnd.rasure.rekey.v1",
    expires: ExpirationTime.atBlock(exp),
    flags: { readonly: true },
  };
}

export const postMember = (w: ArkivWriter, circle: string, devicePublicKey: Uint8Array, epoch: bigint) =>
  w.createEntity(memberParams(circle, devicePublicKey, epoch));

export async function postRekey(
  w: ArkivWriter,
  state: KeyringState,
  head: bigint,
  effectEpoch: bigint,
  newChainKey: Uint8Array,
  members: Uint8Array[],
) {
  return w.createEntity(await rekeyParams(state, head, effectEpoch, newChainKey, members));
}
