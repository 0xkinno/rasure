// Sealed payloads: AES-256-GCM (WebCrypto) with Additional Authenticated Data that binds the
// ciphertext to its circle, epoch and entity type. A ciphertext copied into another circle,
// epoch or type fails to open. Plaintext is padded to a fixed bucket so length leaks nothing finer.
//
// Envelope layout (bytes): 0x01 | iv(12) | ciphertext+tag

import { encKeyBytes } from "./ratchet";
import type { EntityType } from "./schema";

const VERSION = 0x01;
export const BUCKETS = [256, 512, 1024, 2048] as const;

export function aad(circle: string, epoch: bigint, type: EntityType): Uint8Array {
  return new TextEncoder().encode(`rasure/v1|${circle}|${epoch.toString()}|${type}`);
}

export function pad(plain: Uint8Array): Uint8Array {
  const need = plain.length + 4;
  const size = BUCKETS.find((b) => b >= need);
  if (!size) throw new Error(`payload too large: ${plain.length} bytes`);
  const out = new Uint8Array(size);
  new DataView(out.buffer).setUint32(0, plain.length);
  out.set(plain, 4);
  return out;
}

export function unpad(padded: Uint8Array): Uint8Array {
  if (padded.length < 4) throw new Error("bad padding");
  const len = new DataView(padded.buffer, padded.byteOffset, padded.byteLength).getUint32(0);
  if (len > padded.length - 4) throw new Error("bad padding");
  return padded.slice(4, 4 + len);
}

async function aesKey(chainKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encKeyBytes(chainKey), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function seal(
  chainKey: Uint8Array,
  ctx: { circle: string; epoch: bigint; type: EntityType },
  body: unknown,
): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = pad(new TextEncoder().encode(JSON.stringify(body)));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: aad(ctx.circle, ctx.epoch, ctx.type) },
      await aesKey(chainKey),
      plain,
    ),
  );
  const out = new Uint8Array(1 + 12 + ct.length);
  out[0] = VERSION;
  out.set(iv, 1);
  out.set(ct, 13);
  return out;
}

export type OpenResult<T> = { ok: true; body: T } | { ok: false; reason: "no_key" | "auth_failed" | "malformed" };

export async function open<T = unknown>(
  chainKey: Uint8Array | undefined,
  ctx: { circle: string; epoch: bigint; type: EntityType },
  envelope: Uint8Array,
): Promise<OpenResult<T>> {
  if (!chainKey) return { ok: false, reason: "no_key" };
  if (envelope.length < 1 + 12 + 16 || envelope[0] !== VERSION) return { ok: false, reason: "malformed" };
  try {
    const plain = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: envelope.slice(1, 13), additionalData: aad(ctx.circle, ctx.epoch, ctx.type) },
        await aesKey(chainKey),
        envelope.slice(13),
      ),
    );
    return { ok: true, body: JSON.parse(new TextDecoder().decode(unpad(plain))) as T };
  } catch {
    return { ok: false, reason: "auth_failed" };
  }
}
