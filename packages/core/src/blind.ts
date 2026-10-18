// Rotating blind index. Members filter rides by zone without the zone ever appearing on chain.
// tag = hex(HMAC-SHA256(idxKey_e, "zone:" + normalized zone))[0..32]
// The index key rotates with the ratchet, so the same zone gets a different tag every epoch and
// an outsider cannot link "the same place" across epochs. A seized phone cannot rebuild old tags.

import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import { idxKeyBytes } from "./ratchet";

export function normalizeZone(zone: string): string {
  return zone.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

export function zoneTag(chainKey: Uint8Array, zone: string): string {
  const mac = hmac(sha256, idxKeyBytes(chainKey), new TextEncoder().encode(`zone:${normalizeZone(zone)}`));
  return bytesToHex(mac).slice(0, 32);
}
