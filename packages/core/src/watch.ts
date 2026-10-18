// Checks the night watch and the audits run on every live Rasure entity.
// I1: a sealed record's `expiresAt` equals the key-death block of its epoch.
// I3: no public attribute outside the allowlist (see auditAttributes in decide.ts).

import { auditAttributes, type ChainEntity } from "./decide";
import { keyDeathBlock, type CircleClock } from "./ratchet";
import { PROJECT, TYPES } from "./schema";

const SEALED = new Set<string>([TYPES.ride, TYPES.claim, TYPES.assign, TYPES.closeout, TYPES.handover]);

export interface Violation {
  key: string;
  rule: "I1" | "I3";
  detail: string;
}

/** Every sealed entity must expire exactly at keyDeathBlock(epoch). A client that posts with another expiry is flagged. */
export function i1Violations(entities: ChainEntity[], clock: CircleClock): Violation[] {
  const out: Violation[] = [];
  for (const e of entities) {
    if (e.attributes.project !== PROJECT || !SEALED.has(String(e.attributes.type))) continue;
    const epoch = BigInt(e.attributes.epoch as string | number | bigint);
    const want = keyDeathBlock(clock, epoch);
    if (e.expiresAt !== want) out.push({ key: e.key, rule: "I1", detail: `expiresAt ${e.expiresAt} but key death of epoch ${epoch} is ${want}` });
  }
  return out;
}

/** An entity carrying an attribute outside the allowlist, or more than six public attributes, is flagged. */
export function i3Violations(entities: ChainEntity[]): Violation[] {
  const out: Violation[] = [];
  for (const e of entities) {
    if (e.attributes.project !== PROJECT) continue;
    const extra = auditAttributes(e);
    const n = Object.keys(e.attributes).filter((k) => !k.startsWith("$")).length;
    if (extra.length) out.push({ key: e.key, rule: "I3", detail: `attributes outside the allowlist: ${extra.join(", ")}` });
    else if (n > 6) out.push({ key: e.key, rule: "I3", detail: `${n} public attributes (limit 6)` });
  }
  return out;
}
