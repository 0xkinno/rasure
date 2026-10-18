import { describe, expect, it } from "vitest";
import { advance, claimParams, currentKey, i1Violations, i3Violations, keyDeathBlock, newChain, open, rideParams, seal, type ChainEntity } from "../src";

const clock = { genesisBlock: 1000n, epochBlocks: 300n };
const ent = (over: Partial<ChainEntity> & { attributes: ChainEntity["attributes"] }): ChainEntity => ({ key: "0x1", creator: "0xa", owner: "0xa", expiresAt: 0n, ...over });

describe("misbehaving clients are caught", () => {
  it("a client that posts with the wrong expiry (I1 broken) is flagged by the night watch check", () => {
    const good = ent({ key: "0xg", expiresAt: keyDeathBlock(clock, 1n), attributes: { project: "rasure/v1", type: "ride", epoch: 1n } });
    const bad = ent({ key: "0xb", expiresAt: keyDeathBlock(clock, 1n) + 5000n, attributes: { project: "rasure/v1", type: "ride", epoch: 1n } });
    const v = i1Violations([good, bad], clock);
    expect(v.map((x) => x.key)).toEqual(["0xb"]);
  });
  it("a client that writes an extra attribute is flagged by the leak audit check", () => {
    const e = ent({ attributes: { project: "rasure/v1", type: "ride", epoch: 1n, circle: "c", phone: "SYN" } });
    const v = i3Violations([e]);
    expect(v).toHaveLength(1);
    expect(v[0]?.detail).toContain("phone");
  });
  it("a seventh public attribute is flagged even if every name is allowed", () => {
    const e = ent({ attributes: { project: "rasure/v1", type: "ride", v: 1, circle: "c", epoch: 1n, tag: "t", ref: "0x1" } });
    expect(i3Violations([e])).toHaveLength(1);
  });
  it("a claim replayed into another epoch fails AAD", async () => {
    const st = advance(newChain("abc", clock), 1000n + 300n).state; // epoch 1, key for epoch 0 erased? still in grace
    const k = currentKey(st);
    const sealed = await seal(k.chainKey, { circle: "abc", epoch: k.epoch, type: "claim" }, { eta: "SYN" });
    const replay = await open(k.chainKey, { circle: "abc", epoch: k.epoch + 1n, type: "claim" }, sealed);
    expect(replay).toEqual({ ok: false, reason: "auth_failed" });
    void claimParams; void rideParams;
  });
});
