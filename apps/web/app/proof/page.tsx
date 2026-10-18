"use client";
import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { renderedPredicates } from "@rasure/core";
import { hasFacts, useFacts } from "@/lib/facts";
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
  const [evidence, setEvidence] = useState<{ label: string; tx?: string; key?: string }[] | null>(null);
  useEffect(() => {
    fetch("/proof/wallets.json").then((r) => r.json()).then(setWallets).catch(() => setWallets([]));
    fetch("/proof/evidence.json").then((r) => (r.ok ? r.json() : [])).then(setEvidence).catch(() => setEvidence([]));
  }, []);
  const circle = DEMO_CIRCLE || "<circle id>";
  const disp = TRUSTED_DISPATCHERS.length ? TRUSTED_DISPATCHERS : ["0x<dispatcher>"];
  let preds: Record<string, string> = {};
  try { preds = renderedPredicates(circle, 5n, disp, "<tag>", "0x<ride key>"); } catch { /* shown below */ }
  const curl = (q: string) =>
    `curl -s -X POST ${RPC_HTTP} -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"arkiv_query","params":["${q.replace(/"/g, '\\"')}",{"select":{"key":true,"creator":true,"expiresAt":true,"attributes":true},"limit":"0x64"}]}'`;
  const d1 = hasFacts(facts) ? facts.d1 : undefined;
  return (
    <>
      <section className="cobalt" style={{ padding: "56px 0" }}>
        <div className="wrap">
          <h1 className="hero-h" style={{ fontSize: "clamp(34px,5vw,56px)" }}>Proof</h1>
          <p style={{ fontSize: 19, maxWidth: 760 }}>Facts from real runs, the invariants with the test that guards each, wallet addresses with explorer links, and every query with a copyable curl. Nothing here is typed by hand.</p>
        </div>
      </section>
      <div className="wrap">
        <section className="sec" style={{ paddingBottom: 24 }}>
          <h2>Facts</h2>
          {!hasFacts(facts) && <p className="notice">{(facts as { reason?: string } | null)?.reason ?? "Loading facts..."} Until then this table is empty on purpose.</p>}
          {hasFacts(facts) && (
            <div style={{ overflowX: "auto" }}><table>
              <tbody>
                <tr><th>Generated</th><td className="mono">{facts.generatedAt}</td></tr>
                {d1 && <tr><th>D1: payload recovered from calldata after expiry</th><td className="mono">{String(d1.recoveredByteForByte)} · <a href={txUrl(d1.txHash)}>{d1.txHash}</a></td></tr>}
                {facts.d2 && <tr><th>D2: node history retention</th><td className="mono">{facts.d2.retentionHours} h · payload returned after expiry: {String(facts.d2.payloadReturnedAfterExpiry)}</td></tr>}
                {facts.drill && Object.entries(facts.drill).map(([k, v]) => <tr key={k}><th>Drill: {k}</th><td className="mono">{v.exposed}/{v.total} exposed</td></tr>)}
                {facts.errorDirections && <tr><th>Error directions</th><td className="mono">attacker opened past: {facts.errorDirections.attackerOpenedPast} · member refused: {facts.errorDirections.memberRefused} of {facts.errorDirections.liveRecords}</td></tr>}
                {facts.leakAudit && <tr><th>Leak audit</th><td className="mono">{facts.leakAudit.entities} entities · max public attributes {facts.leakAudit.maxPublicAttributes} · plaintext transactions {facts.leakAudit.plaintextTx}</td></tr>}
                {facts.wild && <tr><th>Wild-set expiry audit (aggregate)</th><td className="mono">{facts.wild.sampled} sampled · {facts.wild.stillReturnPayload} still return a payload · {facts.wild.readableText} parse as text</td></tr>}
              </tbody>
            </table></div>
          )}
          {evidence && evidence.length > 0 && (
            <ul>{evidence.map((e) => <li key={e.label} className="label">{e.label}: {e.tx ? <a href={txUrl(e.tx)}>{e.tx}</a> : null} {e.key}</li>)}</ul>
          )}
        </section>

        <section className="sec" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <h2>Invariants</h2>
          <div style={{ overflowX: "auto" }}><table>
            <thead><tr><th>Id</th><th>Invariant</th><th>Guarded by</th></tr></thead>
            <tbody>{INVARIANTS.map((r) => <tr key={r[0]}><td className="mono">{r[0]}</td><td>{r[1]}</td><td className="mono" style={{ fontSize: 13 }}>{r[2]}</td></tr>)}</tbody>
          </table></div>
        </section>

        <section className="sec" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <h2>Wallets</h2>
          {wallets === null ? <div className="skeleton" style={{ height: 80 }} /> : (
            <div style={{ overflowX: "auto" }}><table>
              <thead><tr><th>Role</th><th>Address</th><th>What it does</th></tr></thead>
              <tbody>{wallets.map((w) => <tr key={w.address}><td className="mono">{w.role}</td><td className="hash"><a href={addrUrl(w.address)} target="_blank" rel="noreferrer">{w.address}</a></td><td>{w.note}</td></tr>)}</tbody>
            </table></div>
          )}
        </section>

        <section className="sec" style={{ paddingTop: 24 }}>
          <h2>Every query, with a curl</h2>
          <p style={{ color: "var(--ink-2)" }}>Predicates are rendered by the same code the app runs (<a href={`${REPO}/blob/main/packages/core/src/queries.ts`}>queries.ts</a>). Placeholders appear until a demo circle is configured.</p>
          <div style={{ display: "grid", gap: 18 }}>
            {Object.entries(preds).map(([k, q]) => (
              <div key={k}>
                <div className="mono" style={{ fontWeight: 700, marginBottom: 4 }}>{k}</div>
                <Copyable text={q} label={`${k} predicate`} />
                <div style={{ height: 6 }} />
                <Copyable text={curl(q)} label={`${k} curl`} />
              </div>
            ))}
          </div>
          <p className="label" style={{ marginTop: 24 }}>Read the whole board without this site: <span className="mono">npx tsx scripts/rasure.ts board</span></p>
        </section>
      </div>
    </>
  );
}
