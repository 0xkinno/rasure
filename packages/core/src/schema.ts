// The Rasure data contract (v1). Every constant here is mirrored in /arkiv/schema.md.
// Change one, change the other in the same commit.

export const PROJECT = "rasure/v1" as const;
export const SCHEMA_VERSION = 1 as const;

/** Entity types written by Rasure. */
export const TYPES = {
  circle: "circle", // a dispatch network's public anchor (no members, no names)
  ride: "ride", // an encrypted ride request, written by a dispatcher
  claim: "claim", // a volunteer's encrypted offer to take a ride
  assign: "assign", // the dispatcher's confirmation of one claim
  closeout: "closeout", // the dispatcher's encrypted "ride done" note
  member: "member", // a device public key (secp256k1, not the wallet key) so the dispatcher can rekey
  rekey: "rekey", // a fresh chain key sealed to each remaining member device key
} as const;
export type EntityType = (typeof TYPES)[keyof typeof TYPES];

/**
 * The ONLY attribute names a Rasure entity may carry in public. The leak audit fails if any
 * Rasure entity on chain carries anything else. Nothing here can name a person or a place.
 */
export const PUBLIC_ATTRIBUTE_ALLOWLIST = [
  "project", // str  constant
  "type", // str  one of TYPES
  "v", // i32  schema version
  "circle", // str  random 16-byte id, not derived from any name
  "epoch", // u64  which ratchet key sealed the payload
  "tag", // str  rotating blind index (HMAC of zone under this epoch's index key)
  "ref", // key  the ride a claim/assign/closeout points at
  "epoch_blocks", // u64  circle entity only: epoch length
  "genesis", // u64  circle entity only: block of epoch 0
] as const;
export type PublicAttributeName = (typeof PUBLIC_ATTRIBUTE_ALLOWLIST)[number];

/** Payload content type for every sealed payload. */
export const SEALED_CONTENT_TYPE = "application/vnd.rasure.sealed.v1" as const;

/** Tiramisu produces a block about every 2 seconds. */
export const SECONDS_PER_BLOCK = 2;

/**
 * Epoch length in blocks. Production: 6 hours. Demo circles use 10 minutes so judges can watch a
 * key die. The epoch length is fixed per circle at creation and stored on the circle entity.
 */
export const EPOCH_BLOCKS = { production: 10_800n, demo: 300n } as const;
