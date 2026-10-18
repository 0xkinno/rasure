// The Seizure Drill: what an attacker learns from one seized phone plus the full chain history.
// Pure function. The UI, the CLI and scripts/facts.ts all call this; nobody re-implements it.

import { open } from "./seal";
import type { EntityType } from "./schema";
import { nextChainKey } from "./ratchet";

export type Policy = "plaintext" | "static_key" | "ratchet";

export interface HistoricalRecord {
  key: string; // entity key
  txHash: string; // creation transaction, where the payload still lives
  circle: string;
  epoch: bigint;
  type: EntityType;
  policy: Policy;
  payload: Uint8Array; // recovered from calldata, not from current state
}

export interface SeizedDevice {
  /** What the phone holds at seizure time. For `ratchet` this is the newest chain key only. */
  ratchet?: { epoch: bigint; chainKey: Uint8Array };
  /** The single key a static-key app keeps forever. */
  staticKey?: Uint8Array;
}

export interface DrillOutcome {
  key: string;
  policy: Policy;
  epoch: bigint;
  exposed: boolean;
  why: string;
}

export async function seizureDrill(records: HistoricalRecord[], device: SeizedDevice): Promise<DrillOutcome[]> {
  const out: DrillOutcome[] = [];
  for (const r of records) {
    const ctx = { circle: r.circle, epoch: r.epoch, type: r.type };
    if (r.policy === "plaintext") {
      out.push({ key: r.key, policy: r.policy, epoch: r.epoch, exposed: true, why: "payload is plaintext in the creation transaction" });
      continue;
    }
    if (r.policy === "static_key") {
      const res = await open(device.staticKey, ctx, r.payload);
      out.push({ key: r.key, policy: r.policy, epoch: r.epoch, exposed: res.ok, why: res.ok ? "the phone's one key opens every past record" : `refused: ${res.reason}` });
      continue;
    }
    // ratchet: the attacker may derive FORWARD from the seized key as far as they like.
    // There is no backward step. Records sealed under an earlier epoch stay shut.
    let exposed = false;
    let why = "sealed under an epoch whose key was erased; no backward derivation exists";
    if (device.ratchet && r.epoch >= device.ratchet.epoch) {
      let k = device.ratchet.chainKey;
      for (let e = device.ratchet.epoch; e < r.epoch; e++) k = nextChainKey(k);
      const res = await open(k, ctx, r.payload);
      exposed = res.ok;
      why = res.ok ? "sealed under the current or a later epoch: readable, as designed" : `refused: ${res.reason}`;
    }
    out.push({ key: r.key, policy: r.policy, epoch: r.epoch, exposed, why });
  }
  return out;
}

export function summarize(outcomes: DrillOutcome[]) {
  const by = (p: Policy) => outcomes.filter((o) => o.policy === p);
  const count = (p: Policy) => ({ exposed: by(p).filter((o) => o.exposed).length, total: by(p).length });
  return { plaintext: count("plaintext"), static_key: count("static_key"), ratchet: count("ratchet") };
}
