// Forward-secret key schedule.
//
// k_{e+1} = HKDF-SHA256(ikm = k_e, salt = "rasure/v1", info = "ratchet")
// encKey_e = HKDF(k_e, info = "enc"), idxKey_e = HKDF(k_e, info = "idx")
//
// HKDF is one-way, so a device holding k_e can compute every later key and no earlier one.
// The keyring below is the only place chain keys live. It exposes no way to go backwards and it
// overwrites (zeroes) a key the moment its epoch's records have expired on Arkiv.

import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";

const SALT = new TextEncoder().encode("rasure/v1");
const enc = (s: string) => new TextEncoder().encode(s);

export function nextChainKey(k: Uint8Array): Uint8Array {
  return hkdf(sha256, k, SALT, enc("ratchet"), 32);
}
export function encKeyBytes(k: Uint8Array): Uint8Array {
  return hkdf(sha256, k, SALT, enc("enc"), 32);
}
export function idxKeyBytes(k: Uint8Array): Uint8Array {
  return hkdf(sha256, k, SALT, enc("idx"), 32);
}

export interface CircleClock {
  /** Block at which epoch 0 starts (the circle entity's creation block). */
  genesisBlock: bigint;
  /** Epoch length in blocks. */
  epochBlocks: bigint;
}

export function epochAt(clock: CircleClock, block: bigint): bigint {
  if (block < clock.genesisBlock) throw new Error("block is before circle genesis");
  return (block - clock.genesisBlock) / clock.epochBlocks;
}
export function epochStart(clock: CircleClock, epoch: bigint): bigint {
  return clock.genesisBlock + epoch * clock.epochBlocks;
}
/**
 * The block at which every device destroys the key of `epoch`, and the Entity Expiration of every
 * record sealed under it. One grace epoch lets a ride posted late in an epoch still be served.
 * INVARIANT I1: entity.expiresAt == keyDeathBlock(epoch it was sealed under).
 */
export function keyDeathBlock(clock: CircleClock, epoch: bigint): bigint {
  return epochStart(clock, epoch + 2n);
}

export interface KeyringState {
  circle: string;
  clock: CircleClock;
  /** Live chain keys, oldest first. At most two: the current epoch and the one in grace. */
  keys: { epoch: bigint; chainKey: Uint8Array }[];
}

/** Create a brand-new chain (dispatcher only, at circle creation). */
export function newChain(circle: string, clock: CircleClock, seed?: Uint8Array): KeyringState {
  const k0 = seed ?? crypto.getRandomValues(new Uint8Array(32));
  if (k0.length !== 32) throw new Error("seed must be 32 bytes");
  return { circle, clock, keys: [{ epoch: 0n, chainKey: k0 }] };
}

/** Join from a link that carries (epoch, chainKey). The joiner can never see earlier epochs. */
export function joinChain(circle: string, clock: CircleClock, epoch: bigint, chainKey: Uint8Array): KeyringState {
  return { circle, clock, keys: [{ epoch, chainKey: chainKey.slice() }] };
}

/**
 * Advance the keyring to the epoch of `headBlock`. Derives forward, then destroys every key whose
 * death block has passed. Returns the epochs destroyed so the UI can show "key for epoch N erased".
 */
export function advance(state: KeyringState, headBlock: bigint): { state: KeyringState; destroyed: bigint[] } {
  const target = epochAt(state.clock, headBlock);
  const keys = state.keys.map((k) => ({ epoch: k.epoch, chainKey: k.chainKey }));
  const last = keys[keys.length - 1];
  if (!last) throw new Error("empty keyring");
  let newest: { epoch: bigint; chainKey: Uint8Array } = last;
  while (newest.epoch < target) {
    const next: { epoch: bigint; chainKey: Uint8Array } = { epoch: newest.epoch + 1n, chainKey: nextChainKey(newest.chainKey) };
    keys.push(next);
    newest = next;
  }
  const destroyed: bigint[] = [];
  const kept = keys.filter((k) => {
    const dead = headBlock >= keyDeathBlock(state.clock, k.epoch);
    if (dead) {
      k.chainKey.fill(0); // best-effort wipe of the in-memory copy
      destroyed.push(k.epoch);
    }
    return !dead;
  });
  return { state: { ...state, keys: kept }, destroyed };
}

export function keyFor(state: KeyringState, epoch: bigint): Uint8Array | undefined {
  return state.keys.find((k) => k.epoch === epoch)?.chainKey;
}

/** The newest key: what a join link or a seized phone holds. */
export function currentKey(state: KeyringState): { epoch: bigint; chainKey: Uint8Array } {
  const k = state.keys[state.keys.length - 1];
  if (!k) throw new Error("empty keyring");
  return k;
}
