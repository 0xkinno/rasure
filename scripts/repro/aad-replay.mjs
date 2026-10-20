// Repro: a valid arkiv-encryption@0.1.0 envelope can be replayed into another entity, network or context.
// Rasure binds each ciphertext to its circle, epoch and type with AES-GCM additionalData, so the same replay is refused.
//   node scripts/repro/aad-replay.mjs        (Node 22+, nothing else to install after npm ci)
import { generateKey, importKey, encryptPayload, decryptPayload } from "arkiv-encryption";

const text = (u8) => new TextDecoder().decode(u8);
const key = await importKey(generateKey());

// 1. Package envelope: sealed "for" entity A, replayed as entity B. There is no context to check, so it opens.
const env = await encryptPayload(key, "pickup: SYN-gate-4, 21:30");
console.log("arkiv-encryption: replayed envelope opens ->", text(await decryptPayload(key, env)));

// 2. Rasure's primitive: the same AES-256-GCM, plus additionalData = circle | epoch | type (invariant I5).
const raw = crypto.getRandomValues(new Uint8Array(32));
const aesKey = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
const aad = (circle, epoch, type) => new TextEncoder().encode(`rasure/v1|${circle}|${epoch}|${type}`);
const iv = crypto.getRandomValues(new Uint8Array(12));
const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad("circle-A", 5, "ride") }, aesKey, new TextEncoder().encode("pickup: SYN-gate-4, 21:30"));
const open = (c, e, t) => crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: aad(c, e, t) }, aesKey, sealed).then((b) => text(new Uint8Array(b)), () => "REFUSED");
console.log("rasure, same circle, epoch, type ->", await open("circle-A", 5, "ride"));
console.log("rasure, replayed into circle B   ->", await open("circle-B", 5, "ride"));
console.log("rasure, replayed into epoch 6    ->", await open("circle-A", 6, "ride"));
console.log("rasure, replayed as type claim   ->", await open("circle-A", 5, "claim"));
