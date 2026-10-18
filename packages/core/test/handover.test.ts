import { describe, expect, it } from "vitest";
import { deleteNotice, extendTally, holders, ownerAt, partitionRidesAt, tallyParams, TALLY_BLOCKS, toChainEntity, type OwnerTimeline } from "../src";

const OLD = "0x0e02A09Fcdf1E2fe35F897Ab7A79b86B2a8B0771";
const NEW = "0x9257991047D23e58EF1b90e893924f9eB5AB25e3";
const T: OwnerTimeline = { creator: OLD, changes: [{ block: 1000n, owner: NEW }] };
const ride = (creator: string, createdAt: bigint) => ({ key: `0x${createdAt}`, creator, owner: creator, expiresAt: 9999n, attributes: { type: "ride" }, createdAt });

describe("I9 shift handover (both directions)", () => {
  it("ownerAt follows the handover block", () => {
    expect(ownerAt(T, 999n)).toBe(OLD.toLowerCase());
    expect(ownerAt(T, 1000n)).toBe(NEW.toLowerCase());
  });
  it("a ride by the previous holder after the handover is ignored", () => {
    const { counted, ignored } = partitionRidesAt([ride(OLD, 1001n)], T);
    expect(counted).toHaveLength(0);
    expect(ignored).toHaveLength(1);
  });
  it("a ride by the next holder written before the handover is ignored", () => {
    expect(partitionRidesAt([ride(NEW, 900n)], T).ignored).toHaveLength(1);
  });
  it("rides by the holder at their own block count", () => {
    const r = partitionRidesAt([ride(OLD, 900n), ride(NEW, 1500n)], T);
    expect(r.counted).toHaveLength(2);
  });
  it("a ride without a creation block never counts", () => {
    expect(partitionRidesAt([{ ...ride(OLD, 1n), createdAt: undefined }], T).counted).toHaveLength(0);
  });
  it("holders lists every wallet that ever held the circle", () => {
    expect(holders(T)).toEqual([OLD.toLowerCase(), NEW.toLowerCase()]);
  });
});

describe("tally, delete notice", () => {
  it("a tally is a count with permissionless extension and readonly, no payload", () => {
    const p = tallyParams("abc", 3n, 7n);
    expect(p.flags).toEqual({ readonly: true, permissionlessExtension: true });
    expect(p.payload.length).toBe(0);
    expect(Object.keys(p.attributes as object).sort()).toEqual(["circle", "epoch", "project", "served", "type", "v"]);
  });
  it("extending a tally only moves it later", async () => {
    const w: any = { extendEntity: async (x: any) => x };
    expect(() => extendTally(w, "0x01" as any, 10n, 10n + BigInt(TALLY_BLOCKS) + 5n)).toThrow();
    await expect(Promise.resolve(extendTally(w, "0x01" as any, 10n, 20n))).resolves.toBeTruthy();
  });
  it("the delete notice says removed now, unreadable at the key death block", () => {
    expect(deleteNotice(123n)).toContain("becomes unreadable at block 123");
  });
  it("createdAt survives toChainEntity", () => {
    expect(toChainEntity({ key: "0x1", creator: "0xa", owner: "0xa", expiresAt: 1n, createdAt: 77n, attributes: {} }).createdAt).toBe(77n);
  });
});
