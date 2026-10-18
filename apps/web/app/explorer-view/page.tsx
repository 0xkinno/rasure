"use client";
import { useEffect, useState } from "react";
import { eq } from "@arkiv-network/sdk/query";
import { auditAttributes, detectRateLimit, recoverCreates, toChainEntity } from "@rasure/core";
import { reader, readWithRelay } from "@/lib/chain";
import { entropy, findCreationTx, toHex } from "@/lib/creationTx";
import { txUrl, EXPLORER } from "@/lib/config";

interface Detail {
  key: string;
  creator: string;
  attributes: Record<string, string>;
  payloadHex: string;
  payloadBytes: number;
  entropy: number;
  outside: string[];
  tx?: string | null;
  decoded?: { index: number; expiresAt: string; flags: number; attributeNames: string[]; payloadBytes: number }[];
}
const json = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x), 2);

export default function StrangerView() {
  const [list, setList] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [txInput, setTxInput] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { value } = await readWithRelay((c) =>
          c.select({ key: true, creator: true, createdAt: true, expiresAt: true, attributes: true, payload: true }).where(eq("project", "rasure/v1")).limit(20).fetch(),
        );
        setList(value.entities as any[]);
      } catch (e) {
        const rl = detectRateLimit(e);
        setErr(rl ? rl.message : (e as Error).message.slice(0, 300));
        setList([]);
      }
    })();
  }, []);

  async function inspect(e: any) {
    setBusy(true);
    setDetail(null);
    try {
      const ce = toChainEntity(e);
      const payload = (e.payload ?? new Uint8Array()) as Uint8Array;
      const attrs: Record<string, string> = {};
      for (const [k, v] of Object.entries(ce.attributes)) attrs[k] = String(v);
      const d: Detail = { key: e.key, creator: e.creator, attributes: attrs, payloadHex: toHex(payload), payloadBytes: payload.length, entropy: entropy(payload), outside: auditAttributes(ce) };
      setDetail(d);
      try {
        const tx = await findCreationTx(e.key, BigInt(e.createdAt));
        d.tx = tx;
        if (tx) {
          const t = await reader.getTransaction({ hash: tx });
          d.decoded = recoverCreates(t.input).map((c) => ({ index: c.index, expiresAt: c.expiresAt.toString(), flags: c.creationFlags, attributeNames: Object.keys(c.attributes), payloadBytes: c.payload?.length ?? 0 }));
        }
        setDetail({ ...d });
      } catch (er) {
        setErr(`creation transaction lookup failed: ${(er as Error).message.slice(0, 200)}`);
      }
    } finally { setBusy(false); }
  }

  async function inspectTx() {
    setErr(null); setBusy(true); setDetail(null);
    try {
      const t = await reader.getTransaction({ hash: txInput.trim() as `0x${string}` });
      const decoded = recoverCreates(t.input);
      const c = decoded[0];
      const payload = c?.payload ?? new Uint8Array();
      setDetail({
        key: "(from transaction)", creator: t.from, attributes: Object.fromEntries(Object.keys(c?.attributes ?? {}).filter((n) => n !== "$payload").map((n) => [n, "(value in calldata)"])),
        payloadHex: toHex(payload), payloadBytes: payload.length, entropy: entropy(payload), outside: [], tx: t.hash,
        decoded: decoded.map((x) => ({ index: x.index, expiresAt: x.expiresAt.toString(), flags: x.creationFlags, attributeNames: Object.keys(x.attributes), payloadBytes: x.payload?.length ?? 0 })),
      });
    } catch (e) { setErr((e as Error).message.slice(0, 300)); } finally { setBusy(false); }
  }

  const verdict = detail
    ? `Public attributes: ${Object.keys(detail.attributes).length}. Names, phones, places: none. Payload: ${detail.payloadBytes} bytes of ${detail.entropy > 7 ? "ciphertext" : "low-entropy data"} (${detail.entropy.toFixed(2)} bits per byte).`
    : "";
  return (
    <>
      <section className="cobalt" style={{ padding: "56px 0" }}>
        <div className="wrap">
          <div className="chip" style={{ background: "var(--cobalt-deep)", color: "var(--on-cobalt)", borderColor: "var(--on-cobalt-2)" }}>no wallet needed</div>
          <h1 className="hero-h" style={{ fontSize: "clamp(34px,5vw,56px)", marginTop: 12 }}>What a stranger sees</h1>
          <p style={{ fontSize: 19, maxWidth: 760 }}>Anyone can read these entities on the explorer. Pick a live Rasure entity: the raw attributes, the raw payload bytes, and the creation transaction decoded from its input.</p>
        </div>
      </section>
      <section className="sec" style={{ paddingTop: 40 }}>
        <div className="wrap grid g2" style={{ alignItems: "start" }}>
          <div>
            <h2 className="story" style={{ fontSize: 30, marginBottom: 12 }}>Live Rasure entities</h2>
            {list === null && <div className="skeleton" style={{ height: 160 }} />}
            {err && <p className="notice err" role="alert">{err}</p>}
            {list && list.length === 0 && !err && <p className="notice">No live Rasure entity exists on Tiramisu right now. Entities expire at key death. You can still paste any creation transaction hash on the right.</p>}
            <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
              {list?.map((e) => (
                <li key={e.key}>
                  <button className="btn" style={{ width: "100%", justifyContent: "space-between", background: "var(--card)", color: "var(--ink)" }} onClick={() => inspect(e)}>
                    <span className="mono" style={{ fontSize: 12 }}>{String(e.key).slice(0, 18)}...</span>
                    <span className="chip">{String((e.attributes?.type ?? e.attributes?.find?.((a: any) => a.key === "type")?.value) ?? "entity")}</span>
                  </button>
                </li>
              ))}
            </ul>
            <h3 className="mono" style={{ margin: "24px 0 8px" }}>Or decode any creation transaction</h3>
            <input aria-label="Creation transaction hash" placeholder="0x... transaction hash" value={txInput} onChange={(e) => setTxInput(e.target.value)} />
            <button className="btn btn-ink" style={{ marginTop: 8 }} disabled={busy || !/^0x[0-9a-fA-F]{64}$/.test(txInput.trim())} onClick={inspectTx}>Decode</button>
          </div>
          <div>
            {busy && !detail && <div className="skeleton" style={{ height: 240 }} />}
            {detail && (
              <div className="card">
                <p className="mono" style={{ fontWeight: 700, marginTop: 0 }}>{verdict}</p>
                <div className="hash">key {detail.key}</div>
                <div className="hash">creator {detail.creator}</div>
                <h4 className="mono" style={{ marginBottom: 4 }}>raw attributes</h4>
                <pre className="hash" style={{ whiteSpace: "pre-wrap", margin: 0 }}>{json(detail.attributes)}</pre>
                {detail.outside.length > 0 && <p className="notice err">Attributes outside the allowlist: {detail.outside.join(", ")}</p>}
                <h4 className="mono" style={{ marginBottom: 4 }}>raw payload ({detail.payloadBytes} bytes)</h4>
                <div className="hash" style={{ maxHeight: 140, overflow: "auto" }}>{detail.payloadHex}</div>
                <h4 className="mono" style={{ marginBottom: 4 }}>creation transaction input, decoded</h4>
                {detail.tx ? <a className="hash" href={txUrl(detail.tx)} target="_blank" rel="noreferrer">{detail.tx}</a> : <span className="label">creation transaction not found in its block</span>}
                {detail.decoded && <pre className="hash" style={{ whiteSpace: "pre-wrap" }}>{json(detail.decoded)}</pre>}
                <p className="label">Explorer: <a href={EXPLORER}>{EXPLORER}</a></p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
