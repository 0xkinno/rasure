// Q1 to Q8: every query Rasure runs. Each returns an SDK Expression; `render()` gives the exact
// predicate string that goes into /arkiv/schema.md and the curl on /proof. Trust is by $creator.

import { and, eq, not, or, render, type Expression } from "@arkiv-network/sdk/query";
import { addr, key, str, u64 } from "@arkiv-network/sdk/attr";
import { PROJECT, TYPES } from "./schema";

export { render };

const base = (circle: string, type: string): Expression[] => [
  eq("project", PROJECT),
  eq("circle", circle),
  eq("type", type),
];

function creatorsOf(dispatchers: readonly string[]): Expression {
  if (dispatchers.length === 0) throw new Error("at least one trusted dispatcher is required");
  return or(dispatchers.map((d) => eq("$creator", addr(d as `0x${string}`))));
}

function epochs(epoch: bigint): Expression {
  // The current epoch and the grace epoch (the epoch before it).
  return epoch === 0n ? eq("epoch", u64(0n)) : or(eq("epoch", u64(epoch)), eq("epoch", u64(epoch - 1n)));
}

/** Q1 open board: this epoch and the grace epoch, trusted dispatchers only. */
export function q1OpenBoard(circle: string, epoch: bigint, dispatchers: readonly string[]): Expression {
  return and([...base(circle, TYPES.ride), epochs(epoch), creatorsOf(dispatchers)]);
}

/**
 * Q2 board filtered by zone: Q1 plus the blind tag. The tag is derived under each epoch's index
 * key, so the predicate carries one (epoch, tag) pair per epoch on screen.
 */
export function q2Zone(circle: string, dispatchers: readonly string[], pairs: readonly { epoch: bigint; tag: string }[]): Expression {
  if (pairs.length === 0) throw new Error("at least one (epoch, tag) pair is required");
  const perEpoch = pairs.map((p) => and([eq("epoch", u64(p.epoch)), eq("tag", str(p.tag))]));
  return and([...base(circle, TYPES.ride), or(perEpoch), creatorsOf(dispatchers)]);
}

/** Q3b everything pointing at any ride of this epoch pair, one query for the whole board. */
export function q3bRelated(circle: string, epoch: bigint): Expression {
  return and([
    eq("project", PROJECT),
    eq("circle", circle),
    or([eq("type", TYPES.claim), eq("type", TYPES.assign), eq("type", TYPES.closeout)]),
    epochs(epoch),
  ]);
}

/** Q3 everything that points at one ride (claims, assigns, closeouts). */
export function q3PointingAt(circle: string, rideKey: string): Expression {
  return and([eq("project", PROJECT), eq("circle", circle), eq("ref", key(rideKey as `0x${string}`))]);
}

/** Q4 forged rides for the Security panel: ride entities NOT created by a trusted dispatcher. */
export function q4Forged(circle: string, dispatchers: readonly string[]): Expression {
  return and([...base(circle, TYPES.ride), not(creatorsOf(dispatchers))]);
}

/** Q5 my claims. The caller adds `.createdBy(me)` on the builder. */
export function q5Claims(circle: string): Expression {
  return and(base(circle, TYPES.claim));
}

/** Q6 circle anchor. The caller adds `.createdBy(dispatcher)` on the builder. */
export function q6Circle(circle: string): Expression {
  return and(base(circle, TYPES.circle));
}

/** Q9 member device keys of a circle (the dispatcher builds the rekey from these). */
export function q9Members(circle: string): Expression {
  return and(base(circle, TYPES.member));
}

/** Q10 rekeys taking effect at the given epoch or the next two, trusted dispatchers only. */
export function q10Rekeys(circle: string, fromEpoch: bigint, dispatchers: readonly string[]): Expression {
  return and([
    ...base(circle, TYPES.rekey),
    or(eq("epoch", u64(fromEpoch)), eq("epoch", u64(fromEpoch + 1n)), eq("epoch", u64(fromEpoch + 2n))),
    creatorsOf(dispatchers),
  ]);
}

/** Q7 leak audit: every Rasure entity (cursor-paginated, pinned with `.atBlock(head)`). */
export function q7Audit(): Expression {
  return eq("project", PROJECT);
}

/** Q8 history replay for the drill: Q7 read `.atBlock(past)`; creation txs fetched per entity. */
export const q8History = q7Audit;

/** Every predicate, rendered, in the order schema.md lists them. */
export function renderedPredicates(circle: string, epoch: bigint, dispatchers: readonly string[], tag: string, rideKey: string) {
  return {
    Q1: render(q1OpenBoard(circle, epoch, dispatchers)),
    Q2: render(q2Zone(circle, dispatchers, [{ epoch, tag }, ...(epoch > 0n ? [{ epoch: epoch - 1n, tag }] : [])])),
    Q3b: render(q3bRelated(circle, epoch)),
    Q3: render(q3PointingAt(circle, rideKey)),
    Q4: render(q4Forged(circle, dispatchers)),
    Q5: render(q5Claims(circle)),
    Q6: render(q6Circle(circle)),
    Q9: render(q9Members(circle)),
    Q10: render(q10Rekeys(circle, epoch, dispatchers)),
    Q7: render(q7Audit()),
    Q8: render(q8History()),
  };
}
