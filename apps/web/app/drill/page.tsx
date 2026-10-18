"use client";
import { useEffect, useState } from "react";
import { hexToBytes } from "viem";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { seizureDrill, recoverCreates, summarize, type DrillOutcome, type HistoricalRecord, type Policy, type SeizedDevice, nextChainKey } from "@rasure/core";
import { readWithRelay } from "@/lib/chain";
import { hasFacts, useFacts } from "@/lib/facts";
import { txUrl, short } from "@/lib/config";

interface ManifestRecord { key: string; txHash: string; circle: string; epoch: string; type: "ride" | "claim" | "assign" | "closeout" }
interface Scenario {
  id: string; title: string; blurb: string; policy: Policy;
  seized: { ratchet?: { epoch: string; keyHex: string }; staticKeyHex?: string };
  records: ManifestRecord[];
}
interface Manifest { generatedAt: string; head: string; scenarios: Scenario[] }

type Row = DrillOutcome & { txHash: string; error?: string };

export default function DrillPage() {
  const facts = useFacts();
  const [manifest, setManifest] = useState<Manifest | null | "missing">(null);
  const [rows, setRows] = useState<Record<string, Row[]>>({});
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [forward, setForward] = useState(false);
  const [relayUsed, setRelayUsed] = useState(false);

  useEffect(() => {
    fetch("/proof/drill-manifest.json").then((r) => (r.ok ? r.json() : Promise.reject())).then(setManifest).catch(() => setManifest("missing"));
  }, []);

  async function run() {
    if (!manifest || manifest === "missing") return;
    setRunning(true); setErr(null); setRows({}); setRelayUsed(false);
    try {
      for (const sc of manifest.scenarios) {
        const device: SeizedDevice = {};
        if (sc.seized.ratchet) device.ratchet = { epoch: BigInt(sc.seized.ratchet.epoch), chainKey: hexToBytes(`0x${sc.seized.ratchet.keyHex}`) };
        if (sc.seized.staticKeyHex) device.staticKey = hexToBytes(`0x${sc.seized.staticKeyHex}`);
        const recs: (HistoricalRecord & { txHash: string })[] = [];
        for (const m of sc.records) {
          const { value: tx, meta } = await readWithRelay((c) => c.getTransaction({ hash: m.txHash as `0x${string}` }));
          if (meta.viaRelay) setRelayUsed(true);
          const creates = recoverCreates(tx.input);
          const hit = creates.find((c) => c.payload);
          if (!hit?.payload) throw new Error(`no payload recovered from ${m.txHash}`);
          recs.push({ key: m.key, txHash: m.txHash, circle: m.circle, epoch: BigInt(m.epoch), type: m.type, policy: sc.policy, payload: hit.payload });
        }
        const out = await seizureDrill(recs, device);
        setRows((r) => ({ ...r, [sc.id]: out.map((o, i) => ({ ...o, txHash: recs[i].txHash })) }));
      }
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally { setRunning(false); }
  }

  const totals = (id: string) => (rows[id] ? summarize(rows[id]) : null);
  return (
    <>
      <section className="cobalt" style={{ padding: "56px 0" }}>
        <div className="wrap">
          <div className="chip" style={{ background: "var(--cobalt-deep)", color: "var(--on-cobalt)", borderColor: "var(--on-cobalt-2)" }}>no wallet needed</div>
          <h1 className="hero-h" style={{ fontSize: "clamp(34px,5vw,56px)", marginTop: 12 }}>The Seizure Drill</h1>
          <p style={{ fontSize: 19, maxWidth: 760 }}>
            It is 23:40. A volunteer's phone is gone. The attacker also has a full Arkiv node. The same synthetic rides were written to Tiramisu under three designs, plus one where the circle was rekeyed after the seizure. Press the button: this page fetches each creation transaction, recovers the payload from calldata, and tries to open it with only what the seized phone holds.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn btn-lime" onClick={run} disabled={running || manifest === null || manifest === "missing"}>{running ? "Running..." : "Run the seizure"}</button>
            <label className="label" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={forward} onChange={(e) => setForward(e.target.checked)} style={{ width: 18 }} />
              Attacker derives forward
            </label>
          </div>
        </div>
      </section>
      <section className="sec" style={{ paddingTop: 48 }}>
        <div className="wrap">
          {manifest === null && <div className="skeleton" style={{ height: 120 }} />}
          {manifest === "missing" && (
            <div className="notice">
              <b>The drill manifest has not been generated yet.</b> It is produced by <span className="mono">scripts/drill-run.ts</span> from a live run on Tiramisu, which needs funded wallets. Nothing on this page is simulated: until the run exists, no rows are shown.
            </div>
          )}
          {err && <p className="notice err" role="alert">{err}</p>}
          {relayUsed && <p className="notice">The anonymous RPC rate limit was reached; these reads were served through the read-only relay.</p>}
          {manifest && manifest !== "missing" && (
            <>
              <p className="label">History pinned at head {manifest.head}, manifest generated {manifest.generatedAt}.</p>
              <div className="grid g2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
                {manifest.scenarios.map((sc) => {
                  const t = totals(sc.id);
                  return (
                    <div key={sc.id} className="card">
                      <div className="mono" style={{ fontWeight: 700 }}>{sc.title}</div>
                      <p style={{ margin: "4px 0 10px", color: "var(--ink-2)", fontSize: 15, lineHeight: "22px" }}>{sc.blurb}</p>
                      <div className="mono" style={{ fontSize: 44, fontWeight: 700, color: t && t[sc.policy].exposed ? "var(--exposed-ink)" : "var(--cobalt-ink)" }}>
                        {t ? `${t[sc.policy].exposed}/${t[sc.policy].total}` : `?/${sc.records.length}`}
                      </div>
                      <div className="label">records exposed to the seized phone</div>
                      <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "grid", gap: 6 }}>
                        {(rows[sc.id] ?? sc.records.map((r) => null)).map((o, i) => {
                          const r = sc.records[i];
                          return (
                            <li key={r.key} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 8px", borderRadius: 8, border: "1.5px solid", borderColor: o ? (o.exposed ? "var(--exposed-ink)" : "var(--cobalt-ink)") : "var(--rule)", background: o ? (o.exposed ? "#fde7e2" : "#f3f9d6") : "transparent" }}>
                              {o ? (o.exposed ? <ShieldAlert size={16} color="#a3230f" aria-hidden="true" /> : <ShieldCheck size={16} aria-hidden="true" />) : null}
                              <span className="mono" style={{ fontSize: 12 }}>epoch {r.epoch} · {r.type}</span>
                              <span className="mono" style={{ fontSize: 12, marginLeft: "auto", fontWeight: 700 }}>{o ? (o.exposed ? "EXPOSED" : "SEALED") : "waiting"}</span>
                              <a className="label" href={txUrl(r.txHash)} target="_blank" rel="noreferrer" title={o?.why ?? ""}>{short(r.txHash, 3)}</a>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
              {forward && <ForwardPanel manifest={manifest} />}
              {hasFacts(facts) && facts.drill && (
                <p className="label" style={{ marginTop: 20 }}>
                  FACTS.json totals ({facts.generatedAt}): {Object.entries(facts.drill).map(([k, v]) => `${k} ${v.exposed}/${v.total}`).join(" · ")}. The live run above should match.
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}

/** Forward derivation works, backward does not exist: shown from the seized key itself. */
function ForwardPanel({ manifest }: { manifest: Manifest }) {
  const sc = manifest.scenarios.find((s) => s.seized.ratchet);
  if (!sc?.seized.ratchet) return null;
  const e0 = BigInt(sc.seized.ratchet.epoch);
  let k = hexToBytes(`0x${sc.seized.ratchet.keyHex}`);
  const fwd: string[] = [];
  for (let i = 1; i <= 3; i++) {
    k = nextChainKey(k);
    fwd.push(`epoch ${e0 + BigInt(i)}: key derived (future records, none exist yet)`);
  }
  return (
    <div className="card" style={{ marginTop: 22 }}>
      <div className="mono" style={{ fontWeight: 700 }}>Attacker derives forward</div>
      <p style={{ color: "var(--ink-2)" }}>From the seized epoch {e0.toString()} key the attacker can compute every later key with the public HKDF step:</p>
      <ul className="mono" style={{ fontSize: 13 }}>{fwd.map((f) => <li key={f}>{f}</li>)}</ul>
      <p style={{ color: "var(--ink-2)" }}>
        There is no function that runs the other way. HKDF is one-way, so epochs {(e0 - 1n).toString()} and earlier have no derivation path from this key. That is invariant I8, and it is why the Rasure column stays sealed.
      </p>
    </div>
  );
}
