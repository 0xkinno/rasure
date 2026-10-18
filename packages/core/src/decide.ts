// Trust and board state. Every rule reads `$creator`, never a writable attribute.

import { PUBLIC_ATTRIBUTE_ALLOWLIST, PROJECT, TYPES } from "./schema";

export interface ChainEntity {
  key: string;
  creator: string; // $creator, set by the chain
  owner: string;
  expiresAt: bigint;
  attributes: Record<string, string | bigint | number>;
}

const lc = (s: string) => s.toLowerCase();

/** I4: a ride counts only if a trusted dispatcher wallet created it. */
export function partitionRides(rides: ChainEntity[], dispatchers: string[]) {
  const trusted = new Set(dispatchers.map(lc));
  const counted: ChainEntity[] = [];
  const ignored: ChainEntity[] = [];
  for (const r of rides) (trusted.has(lc(r.creator)) ? counted : ignored).push(r);
  return { counted, ignored };
}

export type RideStatus = "open" | "claimed" | "assigned" | "closed";

/** I7: an assignment counts only if the dispatcher that created the ride created it. */
export function rideStatus(ride: ChainEntity, related: ChainEntity[]): { status: RideStatus; assignedClaim?: string } {
  const ofRide = related.filter((e) => String(e.attributes.ref) === ride.key);
  const byRideOwner = (t: string) => ofRide.filter((e) => e.attributes.type === t && lc(e.creator) === lc(ride.creator));
  if (byRideOwner(TYPES.closeout).length) return { status: "closed" };
  const assign = byRideOwner(TYPES.assign)[0];
  if (assign) return { status: "assigned", assignedClaim: String(assign.key) };
  if (ofRide.some((e) => e.attributes.type === TYPES.claim)) return { status: "claimed" };
  return { status: "open" };
}

/** I3: a Rasure entity carries no attribute outside the allowlist. Used by the leak audit. */
export function auditAttributes(e: ChainEntity): string[] {
  if (e.attributes.project !== PROJECT) return [];
  const allowed = new Set<string>(PUBLIC_ATTRIBUTE_ALLOWLIST);
  return Object.keys(e.attributes).filter((n) => !n.startsWith("$") && !allowed.has(n));
}
