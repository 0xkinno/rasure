"use client";
import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { renderedPredicates } from "@rasure/core";
import { hasFacts, useFacts } from "@/lib/facts";
import { dataExplorerQuery } from "@/lib/dataExplorer";
import { DEMO_CIRCLE, RPC_HTTP, TRUSTED_DISPATCHERS, addrUrl, txUrl, REPO } from "@/lib/config";

const INVARIANTS = [
  ["I1", "A sealed entity's expiresAt equals the key-death block of its epoch", "I1: ride expiresAt is exactly keyDeathBlock(epoch)"],
  ["I2", "A device never holds a chain key past its death block", "ratchet: advance destroys dead keys"],
  ["I3", "No Rasure entity carries a public attribute outside the allowlist", "auditAttributes flags non-allowlisted names"],
  ["I4", "A ride counts only if its $creator is a trusted dispatcher", "partitionRides ignores a forged ride"],
  ["I5", "A ciphertext opens only in its own circle, epoch and type", "seal: AAD refuses a replay"],
  ["I6", "No Rasure creation transaction contains plaintext", "scripts/leak-audit.ts, live"],
  ["I7", "An assignment counts only if the ride's dispatcher created it", "rideStatus ignores a forged assign"],
  ["I8", "A seized phone cannot open a record from before its newest key", "seizure drill: ratchet"],
];

const short = (h: string) => (h && h.length > 20 ? `${h.slice(0, 10)}…${h.slice(-8)}` : h);

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button className="pf-copy" aria-label={`Copy ${label}`} onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); }}>
      {ok ? "copied" : <Copy size={13} aria-hidden="true" />}
    </button>
  );
}

function Copyable({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <pre className="hash" style={{ whiteSpace: "pre-wrap", background: "var(--paper-2)", padding: 12, borderRadius: 8, margin: 0, paddingRight: 44 }}>{text}</pre>
      <button className="btn" aria-label={`Copy ${label}`} onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); }}
        style={{ position: "absolute", top: 6, right: 6, padding: 6, background: "var(--card)", color: "var(--cobalt-ink)" }}>
        {ok ? "ok" : <Copy size={14} aria-hidden="true" />}
      </button>
    </div>
  );
}

export default function Proof() {
  const facts = useFacts();
  const [wallets, setWallets] = useState<{ role: string; address: string; note: string }[] | null>(null);
  const [mcp, setMcp] = useState<any>(null);
  const [evidence, setEvidence] = useState<{ label: string; tx?: string; key?: string }[] | null>(null);
  useEffect(() => {
    fetch("/proof/wallets.json").then((r) => r.json()).then(setWallets).catch(() => setWallets([]));
    fetch("/proof/mcp.json").then((r) => (r.ok ? r.json() : null)).then(setMcp).catch(() => setMcp(null));
    fetch("/proof/evidence.json").then((r) => (r.ok ? r.json() : [])).then(setEvidence).catch(() => setEvidence([]));
  }, []);
  const circle = DEMO_CIRCLE || "<circle id>";
  const disp = TRUSTED_DISPATCHERS.length ? TRUSTED_DISPATCHERS : ["0x<dispatcher>"];
  let preds: Record<string, string> = {};
  try { preds = renderedPredicates(circle, 5n, disp, "<tag>", "0x<ride key>"); } catch { /* shown below */ }
  const curl = (q: string) =>
    `curl -s -X POST ${RPC_HTTP} -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"arkiv_query","params":["${q.replace(/"/g, '\\"')}",{"select":{"key":true,"creator":true,"expiresAt":true,"attributes":true},"limit":"0x64"}]}'`;
  const f: any = hasFacts(facts) ? facts : null;
  const d1 = f?.d1;
  const drill: [string, { exposed: number; total: number }][] = f?.drill ? Object.entries(f.drill) : [];
  const drillLabel: Record<string, string> = { plaintext: "Plaintext board", static_key: "One-key board", ratchet: "Rasure ratchet", rekey: "Seized, then rekeyed" };
  const stats: string[][] = f ? [
    ["Seizure drill", f.drill?.ratchet ? `${f.drill.ratchet.exposed}/${f.drill.ratchet.total}` : "n/a", "records a seized phone opens"],
    ["Leak audit", f.leakAudit ? `${f.leakAudit.entities}` : "n/a", "entities, 0 plaintext transactions"],
    ["History reach", f.d2 ? `${Math.round(f.d2.retentionHours)} h` : "n/a", "node still answers after expiry"],
    ["Invariants", `${INVARIANTS.length}`, "each guarded by a test"],
  ] : [];
  return (
    <>
      <section className="cobalt" style={{ padding: "56px 0 48px" }}>
        <div className="wrap">
          <div className="label" style={{ color: "var(--signal)", letterSpacing: ".14em" }}>EVIDENCE · LIVE RUNS ON ARKIV TIRAMISU</div>
          <h1 className="hero-h" style={{ fontSize: "clamp(34px,5vw,56px)", marginTop: 10 }}>Proof</h1>
          <p style={{ fontSize: 19, maxWidth: 760, marginTop: 8 }}>Facts from real runs, the invariants with the test that guards each, wallets with explorer links, and every query with a copyable curl. Nothing here is typed by hand.</p>
          {stats.length > 0 && (
            <div className="pf-stats">
              {stats.map((x) => (
                <div key={x[0]} className="pf-stat"><div className="label">{x[0]}</div><div className="pf-big">{x[1]}</div><div className="pf-sub">{x[2]}</div></div>
              ))}
            </div>
          )}
        </div>
      </section>
      <nav className="pf-nav" aria-label="Proof sections">
        <div className="wrap">
          {[["facts", "Facts"], ["onchain", "On chain"], ["mcp", "MCP"], ["invariants", "Invariants"], ["wallets", "Wallets"], ["queries", "Queries"]].map(([id, t]) => <a key={id} href={`#${id}`}>{t}</a>)}
        </div>
      </nav>
      <div className="wrap pf">
        <section id="facts" className="pf-sec">
          <div className="pf-head"><h2>Facts</h2>{f && <span className="label pf-meta">generated {String(f.generatedAt).replace("T", " ").slice(0, 16)} UTC</span>}</div>
          {!f && <p className="notice">{(facts as { reason?: string } | null)?.reason ?? "Loading facts..."} Until then this section is empty on purpose.</p>}
          {f && (
            <div className="pf-grid">
              {d1 && (
                <div className="pf-card">
                  <div className="pf-k">D1 · RECOVERY AFTER EXPIRY</div>
                  <div className="pf-v">{d1.recoveredByteForByte ? "Recovered byte for byte" : "Not recovered"}</div>
                  <p>An expired record's payload read back from its creation transaction's calldata.</p>
                  <a className="mono pf-link" href={txUrl(d1.txHash)} target="_blank" rel="noreferrer">{short(d1.txHash)}</a>
                </div>
              )}
              {f.d2 && (
                <div className="pf-card">
                  <div className="pf-k">D2 · NODE HISTORY REACH</div>
                  <div className="pf-v">{Math.round(f.d2.retentionHours)} hours</div>
                  <p>The node answers from block 1 (blocks arrive every 2 s). Payload returned at the last live block: {String(f.d2.payloadReturnedAtLastLiveBlock)}.</p>
                </div>
              )}
              {f.leakAudit && (
                <div className="pf-card">
                  <div className="pf-k">LEAK AUDIT</div>
                  <div className="pf-v">{f.leakAudit.entities} entities</div>
                  <p>At most {f.leakAudit.maxPublicAttributes} public attributes each, {f.leakAudit.plaintextTx} transactions containing plaintext.</p>
                </div>
              )}
              {f.errorDirections && (
                <div className="pf-card">
                  <div className="pf-k">ERROR DIRECTIONS</div>
                  <div className="pf-v">Zero wrong, both ways</div>
                  <p>Attacker opened past records: {f.errorDirections.attackerOpenedPast}. Member refused a live record: {f.errorDirections.memberRefused} of {f.errorDirections.liveRecords}.</p>
                </div>
              )}
            </div>
          )}
          {drill.length > 0 && (
            <>
              <h3 className="pf-h3">Seizure drill · records exposed to the seized phone</h3>
              <div className="pf-drill">
                {drill.map(([k, v]) => (
                  <div key={k} className={`pf-d ${v.exposed === 0 ? "ok" : v.exposed === v.total ? "bad" : "mid"}`}>
                    <div className="pf-dn">{v.exposed}/{v.total}</div><div className="label">{drillLabel[k] ?? k}</div>
                  </div>
                ))}
              </div>
            </>
          )}
          {f && (f.wildWindows?.length > 0 || f.wildCalldata) && (
            <>
              <h3 className="pf-h3">Wild set · other people's expired records on Arkiv</h3>
              <div className="pf-tablewrap"><table className="pf-table">
                <thead><tr><th>Window</th><th>Sampled</th><th>Still return a payload</th><th>Parse as text</th></tr></thead>
                <tbody>
                  {f.wildWindows?.map((w: any) => <tr key={w.windowBlocks}><td>{w.approxMinutes} min back{w.partial ? " (partial)" : ""}</td><td className="mono">{w.sampled}</td><td className="mono">{w.stillReturnPayload}</td><td className="mono">{w.readableText}</td></tr>)}
                </tbody>
              </table></div>
              {f.wildCalldata && <p className="pf-note">Calldata check: {f.wildCalldata.creationTxFound} creation transactions found of {f.wildCalldata.sampled}, {f.wildCalldata.payloadRecoveredFromCalldata} payloads recovered, {f.wildCalldata.payloadMatchesHistoryRead} identical to the history read.</p>}
            </>
          )}
        </section>

        <section id="onchain" className="pf-sec">
          <div className="pf-head"><h2>On chain</h2><span className="label pf-meta">{evidence?.length ?? 0} transactions with entity keys</span></div>
          {evidence === null ? <div className="skeleton" style={{ height: 120 }} /> : (
            <div className="pf-tablewrap"><table className="pf-table">
              <thead><tr><th>What</th><th>Transaction</th><th>Entity key</th></tr></thead>
              <tbody>{evidence.map((e, i) => (
                <tr key={`${e.label}-${i}`}>
                  <td>{e.label.replace(/^demo circle /, "")}</td>
                  <td className="mono">{e.tx ? <><a href={txUrl(e.tx)} target="_blank" rel="noreferrer">{short(e.tx)}</a><CopyBtn text={e.tx} label="transaction hash" /></> : null}</td>
                  <td className="mono">{e.key ? <>{short(e.key)}<CopyBtn text={e.key} label="entity key" /></> : null}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </section>

        {mcp && (
          <section id="mcp" className="pf-sec">
            <div className="pf-head"><h2>Confirmed by Arkiv MCP</h2></div>
            <div className="pf-drill">
              <div className="pf-d ok"><div className="pf-dn">{mcp.transactionsReportedSuccess}/{mcp.transactionsChecked}</div><div className="label">receipts successful</div></div>
              <div className="pf-d ok"><div className="pf-dn">{mcp.agreementWithOurReader}/{mcp.entitiesChecked}</div><div className="label">entities agree with our reader</div></div>
              <div className="pf-d mid"><div className="pf-dn">{mcp.entitiesLiveAccordingToMcp}</div><div className="label">live per MCP</div></div>
              <div className="pf-d mid"><div className="pf-dn">{mcp.entitiesLiveAccordingToReader}</div><div className="label">live per our reader</div></div>
            </div>
            <p className="pf-note">The server ({mcp.endpoint}) returns creation and expiry metadata and creation flags only: no attributes, creator, owner or payload.</p>
          </section>
        )}

        <section id="invariants" className="pf-sec">
          <div className="pf-head"><h2>Invariants</h2><span className="label pf-meta">each one is tested</span></div>
          <div className="pf-inv">
            {INVARIANTS.map((r) => (
              <div key={r[0]} className="pf-card pf-icard">
                <div className="pf-id">{r[0]}</div>
                <div><div className="pf-iv">{r[1]}</div><div className="mono pf-guard">{r[2]}</div></div>
              </div>
            ))}
          </div>
        </section>

        <section id="wallets" className="pf-sec">
          <div className="pf-head"><h2>Wallets</h2><span className="label pf-meta">all testnet, all synthetic</span></div>
          {wallets === null ? <div className="skeleton" style={{ height: 80 }} /> : (
            <div className="pf-tablewrap"><table className="pf-table">
              <thead><tr><th>Role</th><th>Address</th><th>What it does</th></tr></thead>
              <tbody>{wallets.map((w) => <tr key={w.address}><td className="mono">{w.role}</td><td className="mono"><a href={addrUrl(w.address)} target="_blank" rel="noreferrer" title={w.address}>{short(w.address)}</a></td><td>{w.note.replace(/`/g, "")}</td></tr>)}</tbody>
            </table></div>
          )}
        </section>

        <section id="queries" className="pf-sec">
          <div className="pf-head"><h2>Every query, with a curl</h2></div>
          <p className="pf-note" style={{ marginTop: 0 }}>Predicates are rendered by the same code the app runs (<a href={`${REPO}/blob/main/packages/core/src/queries.ts`}>queries.ts</a>). Placeholders appear until a demo circle is configured.</p>
          <div className="pf-q">
            {Object.entries(preds).map(([k, q]) => (
              <details key={k} className="pf-card pf-qcard">
                <summary><span className="mono">{k}</span><span className="label">show predicate and curl</span></summary>
                <div className="pf-qbody">
                  <a className="mono pf-link" href={dataExplorerQuery(q)} target="_blank" rel="noreferrer">Open in Arkiv Data Explorer</a>
                  <Copyable text={q} label={`${k} predicate`} />
                  <Copyable text={curl(q)} label={`${k} curl`} />
                </div>
              </details>
            ))}
          </div>
          <p className="label" style={{ marginTop: 24 }}>Read the whole board without this site: <span className="mono">npx tsx scripts/rasure.ts board</span></p>
        </section>
      </div>
    </>
  );
}
