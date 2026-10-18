import { describe, expect, it } from "vitest";
import { toChainEntity, visibleRecords, q2Zone, q3bRelated, advance, keyDeathBlock, newChain, renderedPredicates, rideParams, claimParams, assertMargin, EpochTooLateError, q1OpenBoard, q4Forged, render, circleParams, detectRateLimit, RateLimitedError, extendCircle, CIRCLE_LEASE_BLOCKS } from "../src";

const D1 = "0x0e02A09Fcdf1E2fe35F897Ab7A79b86B2a8B0771";
const D2 = "0x31740a981E6c793907b51B877e2FBe518137c173";
const clock = { genesisBlock: 1000n, epochBlocks: 300n };

describe("queries render exact predicates", () => {
  it("Q1 lists project, circle, type, two epochs and the creator OR-list", () => {
    const s = render(q1OpenBoard("abc", 5n, [D1, D2]));
    expect(s).toContain("project = str('rasure/v1')");
    expect(s).toContain("circle = str('abc')");
    expect(s).toContain("type = str('ride')");
    expect(s).toContain("epoch = u64(5)");
    expect(s).toContain("epoch = u64(4)");
    expect(s).toContain("$creator = addr(" + D1 + ") OR $creator = addr(" + D2 + ")");
  });
  it("Q1 at epoch 0 has no grace epoch", () => {
    expect(render(q1OpenBoard("abc", 0n, [D1]))).not.toContain("epoch = u64(4");
  });
  it("Q4 negates the trusted creators", () => {
    expect(render(q4Forged("abc", [D1]))).toContain("NOT");
  });
  it("refuses an empty trusted set", () => {
    expect(() => q1OpenBoard("abc", 1n, [])).toThrow();
  });
  it("renders all eight", () => {
    const p = renderedPredicates("abc", 5n, [D1], "t", "0x" + "11".repeat(32));
    expect(Object.keys(p)).toEqual(["Q1", "Q2", "Q3b", "Q3", "Q4", "Q5", "Q6", "Q9", "Q10", "Q7", "Q8"]);
  });
});

describe("writes", () => {
  it("I1: ride expiresAt is exactly keyDeathBlock(epoch)", async () => {
    const st = newChain("abc", clock);
    const p = await rideParams(st, 1010n, 0n, { note: "SYN-x" }, "SYN-zone");
    const exp = p.expires as any;
    expect(JSON.stringify(exp, (_k, v) => (typeof v === "bigint" ? v.toString() : v))).toContain(keyDeathBlock(clock, 0n).toString());
    expect(p.flags).toEqual({ readonly: true });
    expect(p.contentType).toBe("application/vnd.rasure.sealed.v1");
  });
  it("margin guard refuses the last 20 blocks before key death", async () => {
    const st = newChain("abc", clock);
    const death = keyDeathBlock(clock, 0n);
    await expect(rideParams(st, death - 19n, 0n, {}, "z")).rejects.toBeInstanceOf(EpochTooLateError);
    expect(() => assertMargin(clock, 0n, death - 20n)).not.toThrow();
  });
  it("circle anchor has the public attributes only", () => {
    const p = circleParams("abc", clock);
    expect(Object.keys(p.attributes as object).sort()).toEqual(["circle", "epoch_blocks", "genesis", "project", "type", "v"]);
    expect(p.flags).toBeUndefined();
  });
  it("a claim cannot be written for an epoch whose key this phone destroyed", async () => {
    const st0 = newChain("abc", clock);
    const { state } = advance(st0, 1000n + 600n); // epoch 2: epoch 0 is dead
    await expect(claimParams(state, 1600n, ("0x" + "22".repeat(32)) as any, 0n, {})).rejects.toThrow();
  });
  it("extending the lease refuses a no-op", () => {
    const w: any = { extendEntity: async (p: any) => p };
    expect(() => extendCircle(w, ("0x" + "33".repeat(32)) as any, 10n, 10n + CIRCLE_LEASE_BLOCKS + 5n)).toThrow();
  });
});

describe("rate limit detection", () => {
  it("finds ANON_COST_LIMITED anywhere in the chain", () => {
    const e = Object.assign(new Error("wrap"), { cause: { status: 429, message: "ANON_COST_LIMITED retry-after: 42" } });
    const r = detectRateLimit(e);
    expect(r).toBeInstanceOf(RateLimitedError);
    expect(r?.retryAfterSeconds).toBe(42);
  });
  it("ignores other errors", () => expect(detectRateLimit(new Error("boom"))).toBeNull());
});

describe("board visibility and zone query", () => {
  it("board hides records whose key is dead", () => {
    const recs = [
      { attributes: { epoch: 3n }, expiresAt: 900n },
      { attributes: { epoch: 1n }, expiresAt: 400n },
    ];
    const out = visibleRecords(recs, new Set([2n, 3n]), 500n);
    expect(out).toHaveLength(1);
    expect(out[0]?.attributes.epoch).toBe(3n);
  });
  it("a record past its expiry is hidden even with a key", () => {
    expect(visibleRecords([{ attributes: { epoch: 3n }, expiresAt: 100n }], new Set([3n]), 100n)).toHaveLength(0);
  });
  it("Q2 carries one (epoch, tag) pair per epoch", () => {
    const s = render(q2Zone("abc", [D1], [{ epoch: 5n, tag: "aa" }, { epoch: 4n, tag: "bb" }]));
    expect(s).toContain("tag = str('aa')");
    expect(s).toContain("tag = str('bb')");
  });
  it("Q3b covers claim, assign, closeout", () => {
    const s = render(q3bRelated("abc", 5n, [D1]));
    for (const t of ["claim", "assign", "closeout"]) expect(s).toContain(`type = str('${t}')`);
  });
});

describe("SDK entity shape", () => {
  it("unwraps typed attributes { type, value } to plain values", () => {
    const e = toChainEntity({
      key: "0x1", creator: "0xabc", owner: "0xabc", expiresAt: 9n,
      attributes: { type: { type: "str", value: "ride" }, epoch: { type: "u64", value: 5n }, v: { type: "i32", value: 1 } },
    });
    expect(e.attributes).toEqual({ type: "ride", epoch: 5n, v: 1 });
  });
});
