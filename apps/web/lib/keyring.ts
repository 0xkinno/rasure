"use client";
// Keyring persistence: IndexedDB, one record per circle, overwritten on every advance.
// Old key bytes are not kept anywhere. Never localStorage, never a cookie, never a URL after joining.
import { get, set, del, keys } from "idb-keyval";
import { advance, currentKey, joinChain, newChain, type KeyringState } from "@rasure/core";

interface Stored {
  circle: string;
  genesisBlock: string;
  epochBlocks: string;
  dispatchers: string[];
  role: "dispatcher" | "member";
  keys: { epoch: string; chainKey: Uint8Array }[];
}
const id = (circle: string) => `rasure:ring:${circle}`;

export interface Ring {
  state: KeyringState;
  dispatchers: string[];
  role: "dispatcher" | "member";
}

function pack(r: Ring): Stored {
  return {
    circle: r.state.circle,
    genesisBlock: r.state.clock.genesisBlock.toString(),
    epochBlocks: r.state.clock.epochBlocks.toString(),
    dispatchers: r.dispatchers,
    role: r.role,
    keys: r.state.keys.map((k) => ({ epoch: k.epoch.toString(), chainKey: k.chainKey })),
  };
}
function unpack(s: Stored): Ring {
  return {
    state: {
      circle: s.circle,
      clock: { genesisBlock: BigInt(s.genesisBlock), epochBlocks: BigInt(s.epochBlocks) },
      keys: s.keys.map((k) => ({ epoch: BigInt(k.epoch), chainKey: k.chainKey })),
    },
    dispatchers: s.dispatchers,
    role: s.role,
  };
}

export async function loadRing(circle: string): Promise<Ring | null> {
  const s = await get<Stored>(id(circle));
  return s ? unpack(s) : null;
}
export async function saveRing(r: Ring): Promise<void> {
  await set(id(r.state.circle), pack(r));
}
export async function listCircles(): Promise<string[]> {
  return (await keys())
    .map(String)
    .filter((k) => k.startsWith("rasure:ring:"))
    .map((k) => k.slice("rasure:ring:".length));
}
export async function forgetCircle(circle: string) {
  await del(id(circle));
}

export function createDispatcherRing(circle: string, genesisBlock: bigint, epochBlocks: bigint, dispatcher: string): Ring {
  return { state: newChain(circle, { genesisBlock, epochBlocks }), dispatchers: [dispatcher], role: "dispatcher" };
}
export function joinRing(
  circle: string,
  genesisBlock: bigint,
  epochBlocks: bigint,
  epoch: bigint,
  chainKey: Uint8Array,
  dispatchers: string[],
): Ring {
  return { state: joinChain(circle, { genesisBlock, epochBlocks }, epoch, chainKey), dispatchers, role: "member" };
}

/** Advance to `head`, destroy dead keys, overwrite the stored record. Returns epochs erased now. */
export async function advanceAndSave(ring: Ring, head: bigint): Promise<{ ring: Ring; destroyed: bigint[] }> {
  const { state, destroyed } = advance(ring.state, head);
  const next = { ...ring, state };
  await saveRing(next);
  return { ring: next, destroyed };
}

/** Join fragment: c=circle g=genesis b=epochBlocks e=epoch k=chainKey(hex) d=dispatchers. */
export function encodeJoin(r: Ring): string {
  const k = currentKey(r.state);
  const hex = Array.from(k.chainKey)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return new URLSearchParams({
    c: r.state.circle,
    g: r.state.clock.genesisBlock.toString(),
    b: r.state.clock.epochBlocks.toString(),
    e: k.epoch.toString(),
    k: hex,
    d: r.dispatchers.join(","),
  }).toString();
}
export function decodeJoin(fragment: string) {
  const p = new URLSearchParams(fragment.replace(/^#/, ""));
  const c = p.get("c");
  const g = p.get("g");
  const b = p.get("b");
  const e = p.get("e");
  const k = p.get("k");
  const d = p.get("d");
  if (!c || !g || !b || !e || !k || k.length !== 64) return null;
  const chainKey = new Uint8Array(32);
  for (let i = 0; i < 32; i++) chainKey[i] = parseInt(k.slice(i * 2, i * 2 + 2), 16);
  return {
    circle: c,
    genesisBlock: BigInt(g),
    epochBlocks: BigInt(b),
    epoch: BigInt(e),
    chainKey,
    dispatchers: (d ?? "").split(",").filter(Boolean),
  };
}
