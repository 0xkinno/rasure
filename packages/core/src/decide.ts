// Trust and board state. Every rule reads `$creator`, never a writable attribute.

import { PUBLIC_ATTRIBUTE_ALLOWLIST, PROJECT, TYPES } from "./schema";

export interface ChainEntity {
  key: string;
  creator: string; // $creator, set by the chain
  owner: string;
  expiresAt: bigint;
  attributes: Record<string, string | bigint | number>;
  /** Block the entity was created in, when selected. */
  createdAt?: bigint;
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

/**
 * I7: an assignment counts only if the dispatcher that created the ride created it. With a handover timeline (I9) the rule is
 * relaxed to: its creator held the circle at the assignment's own block, so a morning dispatcher can close a night ride.
 */
export function rideStatus(ride: ChainEntity, related: ChainEntity[], timeline?: OwnerTimeline): { status: RideStatus; assignedClaim?: string } {
  const ofRide = related.filter((e) => String(e.attributes.ref) === ride.key);
  const byRideOwner = (t: string) =>
    ofRide.filter((e) => {
      if (e.attributes.type !== t) return false;
      if (timeline && e.createdAt !== undefined) return lc(e.creator) === ownerAt(timeline, e.createdAt);
      return lc(e.creator) === lc(ride.creator);
    });
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

/**
 * The board shows a record only if this device still holds the key for its epoch and the record
 * has not expired. A record whose key every phone has destroyed is hidden, never shown as junk.
 * Guarded by the test "board hides records whose key is dead".
 */
export function visibleRecords<T extends { attributes: Record<string, string | bigint | number>; expiresAt: bigint }>(
  records: T[],
  liveEpochs: ReadonlySet<bigint>,
  head: bigint,
): T[] {
  return records.filter((r) => liveEpochs.has(BigInt(r.attributes.epoch as string | bigint | number)) && r.expiresAt > head);
}

/**
 * I9 (shift handover): a ride counts only if its `$creator` held the circle (`$owner` of the anchor) at the ride's creation block.
 * `creator` is the anchor's `$creator` (the first holder); each change is the block a `changeOwnership` took effect and the new holder.
 * A forged ride by the previous holder after a handover is ignored; so is a ride by the next holder written before it.
 */
export interface OwnerTimeline {
  creator: string;
  changes: { block: bigint; owner: string }[];
}
export function ownerAt(t: OwnerTimeline, block: bigint): string {
  let owner = t.creator;
  for (const c of [...t.changes].sort((a, b) => (a.block < b.block ? -1 : 1))) if (c.block <= block) owner = c.owner;
  return owner.toLowerCase();
}
export function partitionRidesAt(rides: ChainEntity[], t: OwnerTimeline) {
  const counted: ChainEntity[] = [];
  const ignored: ChainEntity[] = [];
  for (const r of rides) {
    const block = r.createdAt;
    const ok = block !== undefined && lc(r.creator) === ownerAt(t, block);
    (ok ? counted : ignored).push(r);
  }
  return { counted, ignored };
}
/** Every wallet that held the circle, used to build the `$creator` OR-list for queries. */
export function holders(t: OwnerTimeline): string[] {
  return [...new Set([t.creator, ...t.changes.map((c) => c.owner)].map(lc))];
}
