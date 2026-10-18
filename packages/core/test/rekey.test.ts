import { describe, expect, it } from "vitest";
import { isValidDeviceKey, adoptRekey, advance, currentKey, deriveForward, epochStart, generateDeviceKey, keyFor, newChain, open, openRekey, rekeyExpiry, rekeyParams, seal, sealRekey, seizureDrill } from "../src";

const clock = { genesisBlock: 1000n, epochBlocks: 300n };

describe("rekey", () => {
  it("a remaining member opens its entry and a removed member cannot", async () => {
    const a = generateDeviceKey();
    const b = generateDeviceKey(); // removed
    const c = generateDeviceKey();
    const fresh = crypto.getRandomValues(new Uint8Array(32));
    const payload = await sealRekey("abc", 5n, fresh, [a.publicKey, c.publicKey]);
    const ra = await openRekey("abc", 5n, payload, a);
    expect(ra.ok).toBe(true);
    if (ra.ok) expect(Array.from(ra.chainKey)).toEqual(Array.from(fresh));
    expect(await openRekey("abc", 5n, payload, b)).toEqual({ ok: false, reason: "not_for_me" });
    expect((await openRekey("abc", 6n, payload, a)).ok).toBe(false); // AAD binds the epoch
    expect((await openRekey("other", 5n, payload, a)).ok).toBe(false); // and the circle
  });
  it("payload length hides the member count in 1 KiB steps", async () => {
    const k = crypto.getRandomValues(new Uint8Array(32));
    const p1 = await sealRekey("abc", 2n, k, [generateDeviceKey().publicKey]);
    const p3 = await sealRekey("abc", 2n, k, [1, 2, 3].map(() => generateDeviceKey().publicKey));
    expect(p1.length).toBe(1024);
    expect(p3.length).toBe(1024);
  });
  it("after a rekey the removed phone cannot read records sealed after it", async () => {
    const state0 = newChain("abc", clock);
    const seized = advance(state0, 1000n + 600n).state; // epoch 2
    const seizedKey = currentKey(seized);
    const fresh = crypto.getRandomValues(new Uint8Array(32));
    const dispatcher = adoptRekey(advance(state0, 1000n + 900n).state, 4n, fresh);
    const atEpoch4 = advance(dispatcher, 1000n + 1200n).state;
    const payload = await seal(keyFor(atEpoch4, 4n)!, { circle: "abc", epoch: 4n, type: "ride" }, { note: "SYN-after-rekey" });
    const attackerKey = deriveForward(seizedKey.chainKey, 2);
    expect((await open(attackerKey, { circle: "abc", epoch: 4n, type: "ride" }, payload)).ok).toBe(false);
    const out = await seizureDrill(
      [{ key: "k", txHash: "t", circle: "abc", epoch: 4n, type: "ride", policy: "ratchet", payload }],
      { ratchet: { epoch: seizedKey.epoch, chainKey: seizedKey.chainKey } },
    );
    expect(out[0]?.exposed).toBe(false);
  });
  it("rejects malformed member keys before sealing (anyone can post a member entity)", async () => {
    expect(isValidDeviceKey(new Uint8Array(33))).toBe(false);
    expect(isValidDeviceKey(new Uint8Array(10))).toBe(false);
    expect(isValidDeviceKey(generateDeviceKey().publicKey)).toBe(true);
    await expect(sealRekey("abc", 2n, new Uint8Array(32), [new Uint8Array(33)])).rejects.toThrow();
  });
  it("rekey entity expires at the start of the epoch after its effect epoch", async () => {
    expect(rekeyExpiry(clock, 4n)).toBe(epochStart(clock, 5n));
    const st = newChain("abc", clock);
    const p = await rekeyParams(st, 1000n + 900n, 4n, new Uint8Array(32), [generateDeviceKey().publicKey]);
    expect(p.contentType).toBe("application/vnd.rasure.rekey.v1");
    await expect(rekeyParams(st, epochStart(clock, 5n) - 5n, 4n, new Uint8Array(32), [])).rejects.toThrow();
  });
});
