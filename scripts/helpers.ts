// Helpers shared by seed.ts, drill-run.ts and the CLI.
import { ExpirationTime, type CreateEntityParameters } from "@arkiv-network/sdk";
import { i32, u64 } from "@arkiv-network/sdk/attr";
import { PROJECT, SCHEMA_VERSION, SEALED_CONTENT_TYPE, keyDeathBlock, seal, type CircleClock, type EntityType } from "@rasure/core";
import { reader, sleep } from "./lib";

export const hex16 = () => Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, "0")).join("");
export const hex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
export const unhex = (s: string) => Uint8Array.from(s.match(/../g)!.map((h) => parseInt(h, 16)));

/** Wait until the chain head reaches `target`, logging every 20 s. */
export async function waitForBlock(target: bigint, label = "") {
  const c = reader();
  for (;;) {
    const head = await c.getBlockNumber({ cacheTime: 0 });
    if (head >= target) return head;
    const left = Number(target - head) * 2;
    if (left > 20) console.log(`  waiting ${left}s for block ${target} ${label}`);
    await sleep(Math.min(left, 20) * 1000);
  }
}

const common = (circle: string, type: EntityType, epoch: bigint) => ({ project: PROJECT, v: i32(SCHEMA_VERSION), type, circle, epoch: u64(epoch) });

/** Same attributes and Entity Expiration as a Rasure ride, but the payload is plaintext JSON (drill baseline). */
export function plaintextRide(circle: string, clock: CircleClock, epoch: bigint, tag: string, body: unknown): CreateEntityParameters {
  return {
    attributes: { ...common(circle, "ride", epoch), project: "rasure/baseline", tag },
    payload: new TextEncoder().encode(JSON.stringify(body)),
    contentType: "application/json",
    expires: ExpirationTime.atBlock(keyDeathBlock(clock, epoch)),
    flags: { readonly: true },
  };
}

/** Same as a Rasure ride, sealed under ONE static key that never changes (drill baseline). */
export async function staticKeyRide(circle: string, clock: CircleClock, epoch: bigint, tag: string, staticKey: Uint8Array, body: unknown): Promise<CreateEntityParameters> {
  return {
    attributes: { ...common(circle, "ride", epoch), tag },
    payload: await seal(staticKey, { circle, epoch, type: "ride" }, body),
    contentType: SEALED_CONTENT_TYPE,
    expires: ExpirationTime.atBlock(keyDeathBlock(clock, epoch)),
    flags: { readonly: true },
  };
}

export const SYN_LANDMARKS = ["SYN-gate-4", "SYN-temple-steps", "SYN-bus-bay-2", "SYN-clinic-side-door", "SYN-market-arch"];
export const synRide = (i: number) => ({
  landmark: SYN_LANDMARKS[i % SYN_LANDMARKS.length],
  window: `SYN-window-${20 + (i % 6)}:00`,
  seats: 1 + (i % 3),
  note: `SYN-ride-${i}`,
});
