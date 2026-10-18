import { describe, expect, it } from "vitest";
import { encodeAbiParameters, encodeFunctionData, toHex } from "viem";
import {
  advance, currentKey, keyDeathBlock, keyFor, newChain, nextChainKey, joinChain,
  seal, open, pad, unpad, zoneTag, recoverCreates, EXECUTE_ABI, CREATE_PARAMS,
  seizureDrill, summarize, partitionRides, rideStatus, auditAttributes, PROJECT,
  type HistoricalRecord,
} from "../src/index";

const clock = { genesisBlock: 1000n, epochBlocks: 300n };
const circle = "c0ffee00c0ffee00c0ffee00c0ffee00";

describe("ratchet keyring", () => {
  it("derives forward and destroys keys at their death block", () => {
    let s = newChain(circle, clock, new Uint8Array(32).fill(7));
    const k0 = keyFor(s, 0n)!.slice();
    let r = advance(s, 1000n + 300n * 1n); // epoch 1
    expect(r.state.keys.map((k) => k.epoch)).toEqual([0n, 1n]);
    expect(Buffer.from(keyFor(r.state, 1n)!).equals(Buffer.from(nextChainKey(k0)))).toBe(true);
    r = advance(r.state, keyDeathBlock(clock, 0n)); // epoch 2 starts, key 0 dies
    expect(r.destroyed).toEqual([0n]);
    expect(keyFor(r.state, 0n)).toBeUndefined();
    expect(r.state.keys.length).toBeLessThanOrEqual(2);
  });
  it("a joiner holds only the epoch it was given", () => {
    const s = joinChain(circle, clock, 5n, new Uint8Array(32).fill(1));
    expect(currentKey(s).epoch).toBe(5n);
    expect(keyFor(s, 4n)).toBeUndefined();
  });
});

describe("sealed payloads", () => {
  const k = new Uint8Array(32).fill(9);
  const ctx = { circle, epoch: 3n, type: "ride" as const };
  it("round trips and pads to a bucket", async () => {
    const env = await seal(k, ctx, { landmark: "SYN-gate-4", window: "21:30" });
    expect(env.length).toBe(1 + 12 + 256 + 16);
    const res = await open<{ landmark: string }>(k, ctx, env);
    expect(res.ok && res.body.landmark).toBe("SYN-gate-4");
  });
  it("refuses replay into another epoch, circle or type (AAD)", async () => {
    const env = await seal(k, ctx, { a: 1 });
    expect((await open(k, { ...ctx, epoch: 4n }, env)).ok).toBe(false);
    expect((await open(k, { ...ctx, circle: "x" }, env)).ok).toBe(false);
    expect((await open(k, { ...ctx, type: "claim" }, env)).ok).toBe(false);
  });
  it("refuses a flipped byte and a wrong key", async () => {
    const env = await seal(k, ctx, { a: 1 });
    env[20] = (env[20] ?? 0) ^ 1;
    expect((await open(k, ctx, env)).ok).toBe(false);
    expect((await open(new Uint8Array(32), ctx, await seal(k, ctx, { a: 1 }))).ok).toBe(false);
  });
  it("pad/unpad is exact", () => {
    const p = new TextEncoder().encode("hello");
    expect(Buffer.from(unpad(pad(p))).toString()).toBe("hello");
  });
});

describe("blind index", () => {
  it("is stable within an epoch, rotates across epochs, ignores case/space", () => {
    const k0 = new Uint8Array(32).fill(2);
    const k1 = nextChainKey(k0);
    expect(zoneTag(k0, "Kothrud  East")).toBe(zoneTag(k0, "kothrud east"));
    expect(zoneTag(k0, "kothrud east")).not.toBe(zoneTag(k1, "kothrud east"));
  });
});

describe("calldata recovery (discovery D1)", () => {
  it("recovers the $payload of a create from execute() input", () => {
    const payload = new TextEncoder().encode('{"secret":"SYN-shelter-address"}');
    const attr = (name: string, typeId: number, value: `0x${string}`) => ({ name: toHex(name, { size: 32 }), typeId, value });
    const opData = encodeAbiParameters(CREATE_PARAMS, [{
      salt: 1n, expiresAt: 5000n, minLifetime: 0n, creationFlags: 1,
      attributes: [attr("$payload", 9, toHex(payload)), attr("project", 1, toHex("rasure/v1"))],
    }]);
    const input = encodeFunctionData({ abi: EXECUTE_ABI, functionName: "execute", args: [[{ operation: 1, operationData: opData }]] });
    const [c] = recoverCreates(input);
    expect(new TextDecoder().decode(c!.payload!)).toContain("SYN-shelter-address");
    expect(c!.expiresAt).toBe(5000n);
  });
});

describe("seizure drill: baseline, control, intervention", () => {
  it("plaintext and static key expose history; the ratchet does not", async () => {
    const seed = new Uint8Array(32).fill(4);
    const staticKey = new Uint8Array(32).fill(5);
    const keys = [seed];
    for (let i = 1; i < 6; i++) keys.push(nextChainKey(keys[i - 1]!));
    const recs: HistoricalRecord[] = [];
    for (let e = 0; e < 6; e++) {
      const ctx = { circle, epoch: BigInt(e), type: "ride" as const };
      recs.push({ key: `r${e}`, txHash: "0x", ...ctx, policy: "ratchet", payload: await seal(keys[e]!, ctx, { e }) });
      recs.push({ key: `s${e}`, txHash: "0x", ...ctx, policy: "static_key", payload: await seal(staticKey, ctx, { e }) });
      recs.push({ key: `p${e}`, txHash: "0x", ...ctx, policy: "plaintext", payload: new TextEncoder().encode(`{"e":${e}}`) });
    }
    const out = summarize(await seizureDrill(recs, { ratchet: { epoch: 5n, chainKey: keys[5]! }, staticKey }));
    expect(out.plaintext).toEqual({ exposed: 6, total: 6 });
    expect(out.static_key).toEqual({ exposed: 6, total: 6 });
    expect(out.ratchet).toEqual({ exposed: 1, total: 6 }); // only the current epoch
  });
});

describe("trust and audit", () => {
  const D = "0xD15Pa7c4e400000000000000000000000000000a".toLowerCase();
  const ride = { key: "0xr", creator: D, owner: D, expiresAt: 1n, attributes: { project: PROJECT, type: "ride" } };
  it("ignores rides not created by a trusted dispatcher", () => {
    const forged = { ...ride, key: "0xf", creator: "0xbad" };
    const p = partitionRides([ride, forged], [D]);
    expect(p.counted.map((r) => r.key)).toEqual(["0xr"]);
    expect(p.ignored.map((r) => r.key)).toEqual(["0xf"]);
  });
  it("an assignment by anyone but the ride's dispatcher does not count", () => {
    const fakeAssign = { key: "0xa", creator: "0xbad", owner: "0xbad", expiresAt: 1n, attributes: { type: "assign", ref: "0xr" } };
    const claim = { key: "0xc", creator: "0xv", owner: "0xv", expiresAt: 1n, attributes: { type: "claim", ref: "0xr" } };
    expect(rideStatus(ride, [fakeAssign, claim]).status).toBe("claimed");
    expect(rideStatus(ride, [{ ...fakeAssign, creator: D }, claim]).status).toBe("assigned");
  });
  it("flags any attribute outside the allowlist", () => {
    expect(auditAttributes({ ...ride, attributes: { ...ride.attributes, phone: "x" } })).toEqual(["phone"]);
  });
});
