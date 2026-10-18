// Rekey: post-compromise recovery. The dispatcher seals a FRESH chain key to each remaining member's device key
// (ECIES on secp256k1: ephemeral ECDH, HKDF-SHA256, AES-256-GCM). A removed member's phone never receives an
// entry, so it cannot derive anything sealed after the rekey epoch. Device keys are generated in the browser and
// are NOT the wallet key.

import { secp256k1 } from "@noble/curves/secp256k1";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import { nextChainKey, type CircleClock, type KeyringState } from "./ratchet";

const enc = (s: string) => new TextEncoder().encode(s);
const SALT = enc("rasure/v1/rekey");
const ENTRY_PLAIN = 8 + 32; // epoch (u64) + chain key
const PAD_TO = 1024;

export interface DeviceKey {
  secret: Uint8Array; // 32 bytes, stays on the device
  publicKey: Uint8Array; // 33 bytes compressed, published in the member entity payload
}
export function generateDeviceKey(): DeviceKey {
  const secret = secp256k1.utils.randomPrivateKey();
  return { secret, publicKey: secp256k1.getPublicKey(secret, true) };
}

/** Short public fingerprint so a member can find its own entry without trial-decrypting every one. */
export function fingerprint(publicKey: Uint8Array): Uint8Array {
  return sha256(publicKey).slice(0, 8);
}

function aadFor(circle: string, epoch: bigint) {
  return enc(`rasure/v1|${circle}|${epoch.toString()}|rekey`);
}
async function aesKey(raw: Uint8Array) {
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
function u64be(n: bigint) {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, n);
  return b;
}

/** Entry layout: fp(8) | ephPub(33) | iv(12) | ciphertext(40) + tag(16) = 109 bytes. */
const ENTRY_LEN = 8 + 33 + 12 + ENTRY_PLAIN + 16;

export async function sealRekey(
  circle: string,
  epoch: bigint,
  newChainKey: Uint8Array,
  memberDeviceKeys: Uint8Array[],
): Promise<Uint8Array> {
  if (newChainKey.length !== 32) throw new Error("chain key must be 32 bytes");
  const entries: Uint8Array[] = [];
  for (const devicePub of memberDeviceKeys) {
    const eph = secp256k1.utils.randomPrivateKey();
    const ephPub = secp256k1.getPublicKey(eph, true);
    const shared = secp256k1.getSharedSecret(eph, devicePub, true).slice(1);
    const k = hkdf(sha256, shared, SALT, enc("entry"), 32);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plain = new Uint8Array(ENTRY_PLAIN);
    plain.set(u64be(epoch), 0);
    plain.set(newChainKey, 8);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aadFor(circle, epoch) }, await aesKey(k), plain));
    const e = new Uint8Array(ENTRY_LEN);
    e.set(fingerprint(devicePub), 0);
    e.set(ephPub, 8);
    e.set(iv, 41);
    e.set(ct, 53);
    entries.push(e);
  }
  const body = new Uint8Array(entries.length * ENTRY_LEN);
  entries.forEach((e, i) => body.set(e, i * ENTRY_LEN));
  // Pad with random bytes to a multiple of PAD_TO so the member count is not read off the length.
  const total = Math.max(PAD_TO, Math.ceil((body.length + 2) / PAD_TO) * PAD_TO);
  const out = crypto.getRandomValues(new Uint8Array(total));
  new DataView(out.buffer).setUint16(0, entries.length);
  out.set(body, 2);
  return out;
}

export type OpenRekey = { ok: true; epoch: bigint; chainKey: Uint8Array } | { ok: false; reason: "not_for_me" | "auth_failed" | "malformed" };

export async function openRekey(circle: string, epoch: bigint, payload: Uint8Array, device: DeviceKey): Promise<OpenRekey> {
  if (payload.length < 2) return { ok: false, reason: "malformed" };
  const n = new DataView(payload.buffer, payload.byteOffset, payload.byteLength).getUint16(0);
  if (2 + n * ENTRY_LEN > payload.length) return { ok: false, reason: "malformed" };
  const fp = bytesToHex(fingerprint(device.publicKey));
  for (let i = 0; i < n; i++) {
    const e = payload.slice(2 + i * ENTRY_LEN, 2 + (i + 1) * ENTRY_LEN);
    if (bytesToHex(e.slice(0, 8)) !== fp) continue;
    try {
      const shared = secp256k1.getSharedSecret(device.secret, e.slice(8, 41), true).slice(1);
      const k = hkdf(sha256, shared, SALT, enc("entry"), 32);
      const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: e.slice(41, 53), additionalData: aadFor(circle, epoch) }, await aesKey(k), e.slice(53)));
      const got = new DataView(plain.buffer).getBigUint64(0);
      if (got !== epoch) return { ok: false, reason: "auth_failed" };
      return { ok: true, epoch: got, chainKey: plain.slice(8, 40) };
    } catch {
      return { ok: false, reason: "auth_failed" };
    }
  }
  return { ok: false, reason: "not_for_me" };
}

/**
 * Adopt a rekey: from `epoch` on, the chain is the new one. Keys for epochs at or after `epoch` are replaced;
 * older keys stay until their own death block. The device then derives forward from the new key.
 */
export function adoptRekey(state: KeyringState, epoch: bigint, chainKey: Uint8Array): KeyringState {
  const older = state.keys.filter((k) => k.epoch < epoch);
  return { ...state, keys: [...older, { epoch, chainKey: chainKey.slice() }] };
}

/**
 * A rekey for effect-epoch r is posted during epoch r-1 and lives one epoch after it takes effect:
 * Entity Expiration at the start of epoch r+1.
 */
export function rekeyExpiry(clock: CircleClock, effectEpoch: bigint): bigint {
  return clock.genesisBlock + (effectEpoch + 1n) * clock.epochBlocks;
}

/** The chain key a device holds at `epoch` if it adopted nothing: derived forward from `from`. */
export function deriveForward(from: Uint8Array, steps: number): Uint8Array {
  let k = from;
  for (let i = 0; i < steps; i++) k = nextChainKey(k);
  return k;
}
