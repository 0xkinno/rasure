"use client";
// Read-only view of the live demo network for visitors who hold no key: public attributes, ciphertext size and the key-death countdown.
// Nothing here is decrypted. It is the same data a stranger sees on the explorer.
import { useEffect, useState } from "react";
import { epochAt, fetchAll, keyDeathBlock, q1OpenBoard, q6Circle, toChainEntity, type ChainEntity } from "@rasure/core";
import { readWithRelay, reader } from "@/lib/chain";
import { DEMO_CIRCLE, TRUSTED_DISPATCHERS, addrUrl, short } from "@/lib/config";
import { dataExplorerKey } from "@/lib/dataExplorer";

const mmss = (blocks: bigint) => {
  const s = Number(blocks < 0n ? 0n : blocks) * 2;
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export function DemoView() {
  const [state, setState] = useState<{ head: bigint; epoch: bigint; clock: { genesisBlock: bigint; epochBlocks: bigint }; rides: (ChainEntity & { bytes: number })[]; owner: string; gen: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [head, setHead] = useState<bigint | null>(null);

  useEffect(() => {
    let dead = false;
    const run = async () => {
      try {
        const { value: h } = await readWithRelay((c) => c.getBlockNumber({ cacheTime: 0 }));
        const run = async (where: any, sel: Record<string, true>) => {
          try { return await fetchAll(reader as any, sel, where, { atBlock: h }); } catch {
            const { relayReader } = await import("@/lib/chain");
            return fetchAll(relayReader() as any, sel, where, { atBlock: h });
          }
        };
        const a = await run(q6Circle(DEMO_CIRCLE), { key: true, creator: true, owner: true, expiresAt: true, attributes: true });
        const anchor = (a.entities as any[])[0];
        if (!anchor) throw new Error("The demo network was not found on Arkiv.");
        const at = toChainEntity(anchor).attributes;
        const clock = { genesisBlock: BigInt(at.genesis as string | bigint), epochBlocks: BigInt(at.epoch_blocks as string | bigint) };
        const epoch = epochAt(clock, h < clock.genesisBlock ? clock.genesisBlock : h);
        const holders = [String(anchor.creator), String(anchor.owner), ...TRUSTED_DISPATCHERS];
        const r = await run(q1OpenBoard(DEMO_CIRCLE, epoch, [...new Set(holders.map((x) => x.toLowerCase()))]), { key: true, creator: true, owner: true, createdAt: true, expiresAt: true, attributes: true, payload: true });
        const rides = (r.entities as any[]).map((e) => ({ ...toChainEntity(e), bytes: e.payload?.length ?? 0 }));
        if (!dead) { setState({ head: h, epoch, clock, rides, owner: String(anchor.owner), gen: String(at.gen ?? "1") }); setHead(h); }
      } catch (e) { if (!dead) setErr((e as Error).message.slice(0, 220)); }
    };
    void run();
    const t = setInterval(run, 30_000);
    return () => { dead = true; clearInterval(t); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setHead((h) => (h === null ? h : h + 1n)), 2000);
    return () => clearInterval(t);
  }, []);

  if (err) return <p className="notice err" role="alert">{err}</p>;
  if (!state) return <div className="skeleton" style={{ height: 160, marginTop: 20 }} />;
  const now = head ?? state.head;
  const oldestEpoch = state.epoch > 0n ? state.epoch - 1n : 0n;
  const death = keyDeathBlock(state.clock, oldestEpoch);
  return (
    <div style={{ marginTop: 24, color: "var(--ink)" }}>
      <div className="notice">
        <b>Live demo network</b> (read-only, no key needed). Epoch {state.epoch.toString()} now; the key for epoch {oldestEpoch.toString()} dies in <span className="mono">{mmss(death - now)}</span> (block {death.toString()}), when every phone erases it and Arkiv expires the records sealed under it. Held by <a className="hash" href={addrUrl(state.owner)} target="_blank" rel="noreferrer">{short(state.owner, 6)}</a>, generation {state.gen}. An automated night watch keeps it alive during judging.
      </div>
      <div className="grid g3" style={{ marginTop: 16 }}>
        {state.rides.length === 0 && <p className="notice">No live ride in this epoch yet; the watch posts one each epoch.</p>}
        {state.rides.map((r) => (
          <div key={r.key} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span className="chip sealed">sealed · epoch {String(r.attributes.epoch)}</span>
              <span className="chip">ciphertext {r.bytes} bytes</span>
            </div>
            <p className="label">Dies at block {r.expiresAt.toString()} (in {mmss(r.expiresAt - now)}).</p>
            <div className="label">written by ($creator) <a href={addrUrl(r.creator)} target="_blank" rel="noreferrer">{short(r.creator, 4)}</a> · held by ($owner) <a href={addrUrl(r.owner)} target="_blank" rel="noreferrer">{short(r.owner, 4)}</a></div>
            <div className="label"><a href={dataExplorerKey(r.key)} target="_blank" rel="noreferrer">Open in Arkiv Data Explorer</a></div>
          </div>
        ))}
      </div>
      <p className="label">To read the contents you need the circle key from a join link, handed over in person. Create your own network above to try the full flow.</p>
    </div>
  );
}
