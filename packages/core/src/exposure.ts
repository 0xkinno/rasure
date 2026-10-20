// "If this phone were taken now": what a holder of this keyring can open, derived from the keys it
// actually holds. Pure counting, no I/O, so the board and the demo view can show the guarantee live.

import { EPOCH_BLOCKS, SECONDS_PER_BLOCK } from "./schema";
import { epochStart, keyDeathBlock, type KeyringState } from "./ratchet";

export interface Exposure {
  /** Records the held keys open right now. */
  openable: number;
  /** Records whose key is already erased on this phone. */
  sealedForever: number;
  /** Death blocks of the erased keys the older records were sealed under, ascending, unique. */
  erasedAtBlocks: bigint[];
  /** Seconds covered by the oldest held key up to the head: the most any record read here can be. */
  windowSeconds: number;
  /** Seconds until the last held key dies, or null when the phone holds no key. */
  secondsToNone: number | null;
}

/**
 * @param ring    the keyring (only epochs and the clock are read, never a key value)
 * @param records the records on the board, each with the epoch it was sealed under
 * @param head    the current head block
 */
export function exposureOf(ring: Pick<KeyringState, "keys" | "clock">, records: { epoch: bigint }[], head: bigint): Exposure {
  const live = ring.keys.filter((k) => head < keyDeathBlock(ring.clock, k.epoch));
  const held = new Set(live.map((k) => k.epoch));
  let openable = 0;
  const erased = new Set<bigint>();
  for (const r of records) {
    if (held.has(r.epoch)) openable++;
    else erased.add(keyDeathBlock(ring.clock, r.epoch));
  }
  const sealedForever = records.length - openable;
  if (live.length === 0) return { openable, sealedForever, erasedAtBlocks: [...erased].sort((a, b) => (a < b ? -1 : 1)), windowSeconds: 0, secondsToNone: null };
  const oldest = live.reduce((a, b) => (b.epoch < a.epoch ? b : a));
  const lastDeath = live.reduce((a, b) => { const d = keyDeathBlock(ring.clock, b.epoch); return d > a ? d : a; }, 0n);
  const from = epochStart(ring.clock, oldest.epoch);
  const span = head > from ? head - from : 0n;
  return {
    openable,
    sealedForever,
    erasedAtBlocks: [...erased].sort((a, b) => (a < b ? -1 : 1)),
    windowSeconds: Number(span) * SECONDS_PER_BLOCK,
    secondsToNone: Number(lastDeath - head) * SECONDS_PER_BLOCK,
  };
}

/** "6 hours", "12 hours", "10 minutes": a block count as time, derived from the schema, never typed. */
export function blocksAsTime(blocks: bigint): string {
  const s = Number(blocks) * SECONDS_PER_BLOCK;
  if (s % 3600 === 0) return `${s / 3600} hour${s === 3600 ? "" : "s"}`;
  if (s % 60 === 0) return `${s / 60} minute${s === 60 ? "" : "s"}`;
  return `${s} seconds`;
}

/** The guarantee in time, derived from EPOCH_BLOCKS. Used by the app and the README so the numbers are typed once. */
export function epochGuarantee() {
  const prod = blocksAsTime(EPOCH_BLOCKS.production);
  const window = blocksAsTime(EPOCH_BLOCKS.production * 2n);
  const demo = blocksAsTime(EPOCH_BLOCKS.demo).replace(/ (\w+?)s?$/, "-$1");
  return {
    prod,
    window,
    demo,
    sentence: `Production epochs are ${prod}. A taken phone can read at most the current and previous epoch: up to the last ${window}, never older. The demo network uses ${demo} epochs so you can watch a key die.`,
  };
}
