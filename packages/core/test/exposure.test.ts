import { describe, expect, it } from "vitest";
import { EPOCH_BLOCKS, advance, blocksAsTime, exposureOf, joinChain, newChain } from "../src";

const clock = { genesisBlock: 1000n, epochBlocks: 300n };
const recs = (...epochs: number[]) => epochs.map((e) => ({ epoch: BigInt(e) }));

describe("exposureOf", () => {
  it("no keys: nothing opens, everything is sealed forever, no countdown", () => {
    const e = exposureOf({ clock, keys: [] }, recs(0, 1, 2), 1700n);
    expect(e.openable).toBe(0);
    expect(e.sealedForever).toBe(3);
    expect(e.secondsToNone).toBeNull();
    expect(e.windowSeconds).toBe(0);
  });

  it("current and grace key: opens exactly those epochs, older are erased with their death blocks", () => {
    let ring = newChain("0xc", clock);
    ring = advance(ring, 1000n + 300n * 3n + 10n).state; // epoch 3 now, keys 2 and 3 live
    expect(ring.keys.map((k) => k.epoch)).toEqual([2n, 3n]);
    const head = 1000n + 300n * 3n + 10n;
    const e = exposureOf(ring, recs(0, 1, 2, 3), head);
    expect(e.openable).toBe(2);
    expect(e.sealedForever).toBe(2);
    expect(e.erasedAtBlocks).toEqual([1000n + 600n, 1000n + 900n]);
    // last held key (epoch 3) dies at the start of epoch 5
    expect(e.secondsToNone).toBe(Number(1000n + 300n * 5n - head) * 2);
    // window runs from the start of epoch 2 to the head
    expect(e.windowSeconds).toBe(Number(head - (1000n + 600n)) * 2);
  });

  it("after a key dies the count drops on the next block", () => {
    let ring = newChain("0xc", clock);
    const before = 1000n + 300n * 2n - 1n; // last block of epoch 1, keys 0 and 1 live
    ring = advance(ring, before).state;
    expect(exposureOf(ring, recs(0, 1), before).openable).toBe(2);
    const after = before + 1n; // epoch 2 starts, key 0 dies
    ring = advance(ring, after).state;
    const e = exposureOf(ring, recs(0, 1), after);
    expect(e.openable).toBe(1);
    expect(e.sealedForever).toBe(1);
  });

  it("after a rekey the old keys are replaced by the new chain only", () => {
    const old = advance(newChain("0xc", clock), 1000n + 300n * 3n).state;
    const head = 1000n + 300n * 3n + 5n;
    const rekeyed = joinChain("0xc", clock, 3n, new Uint8Array(32).fill(7));
    expect(exposureOf(old, recs(2, 3), head).openable).toBe(2);
    const e = exposureOf(rekeyed, recs(2, 3), head);
    expect(e.openable).toBe(1); // only the new chain's epoch
    expect(e.sealedForever).toBe(1);
  });
});

describe("blocksAsTime", () => {
  it("derives the production and demo epochs from the schema", () => {
    expect(blocksAsTime(EPOCH_BLOCKS.production)).toBe("6 hours");
    expect(blocksAsTime(EPOCH_BLOCKS.demo)).toBe("10 minutes");
    expect(blocksAsTime(EPOCH_BLOCKS.production * 2n)).toBe("12 hours");
  });
});

describe("epochGuarantee", () => {
  it("states the window in hours, from EPOCH_BLOCKS", async () => {
    const { epochGuarantee } = await import("../src");
    const g = epochGuarantee();
    expect(g.sentence).toBe("Production epochs are 6 hours. A taken phone can read at most the current and previous epoch: up to the last 12 hours, never older. The demo network uses 10-minute epochs so you can watch a key die.");
  });
});
