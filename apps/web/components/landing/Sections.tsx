"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { hasFacts, useFacts } from "@/lib/facts";
import { reader } from "@/lib/chain";
import { auditAttributes, detectRateLimit, recoverCreates, toChainEntity } from "@rasure/core";
import { eq } from "@arkiv-network/sdk/query";
import { REPO, EXPLORER } from "@/lib/config";
import { Lock, Clock, KeyRound } from "lucide-react";

export function HowARideMoves() {
  const steps = [
    { n: 1, t: "Dispatcher posts, sealed under tonight's key", d: "The ride is encrypted on the dispatcher's phone before it leaves. Only ciphertext and six public attributes are written." },
    { n: 2, t: "Arkiv stores ciphertext, expiry set to the key's death block", d: "Entity Expiration is the key-death block of the ride's epoch. The expiry block is the key-destruction block." },
    { n: 3, t: "Phones open it; at the death block every key is erased", d: "Volunteers' phones decrypt locally. At the death block each phone erases the key and Arkiv expires the record together." },
  ];
  return (
    <div className="card" style={{ background: "var(--card)", padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "2px solid var(--cobalt-ink)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span className="mono" style={{ fontWeight: 700 }}>how a ride moves</span>
        <span className="label" style={{ color: "var(--ink-2)" }}>
          <span style={{ display: "inline-block", width: 10, height: 10, background: "var(--signal)", border: "1.5px solid var(--cobalt-ink)", marginRight: 6 }} />a sealed record
        </span>
      </div>
      <div style={{ padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, alignItems: "stretch" }}>
        {["Dispatcher", "Volunteer A", "Volunteer B"].map((n) => (
          <div key={n} className="card" style={{ padding: 12, boxShadow: "3px 3px 0 var(--cobalt-ink)" }}>
            <div className="mono" style={{ fontWeight: 700 }}>{n}</div>
            <div className="label" style={{ color: "var(--ink-2)" }}>phone, own key ring</div>
          </div>
        ))}
        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 0 }}>
          <div style={{ flex: 1, height: 2, background: "var(--cobalt-ink)" }} />
          <span style={{ width: 14, height: 14, background: "var(--signal)", border: "2px solid var(--cobalt-ink)" }} />
          <div style={{ flex: 1, height: 2, background: "var(--cobalt-ink)" }} />
        </div>
        <div style={{ gridColumn: "1 / -1", background: "var(--signal)", border: "2px solid var(--cobalt-ink)", borderRadius: 12, boxShadow: "var(--hard-shadow)", padding: "18px 20px", textAlign: "center" }}>
          <div className="mono" style={{ fontWeight: 700, fontSize: 22, color: "var(--cobalt-ink)", display: "inline-flex", gap: 10, alignItems: "center" }}><KeyRound size={22} aria-hidden="true" />tonight's key</div>
          <div className="label" style={{ color: "var(--cobalt-ink)" }}>dies at block = epoch start + 2 epochs</div>
        </div>
      </div>
      <ol style={{ listStyle: "none", margin: 0, padding: "0 24px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
        {steps.map((s) => (
          <li key={s.n} style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: 12 }}>
            <span className="mono" style={{ width: 34, height: 34, borderRadius: 999, background: "var(--cobalt)", color: "var(--on-cobalt)", display: "grid", placeItems: "center", fontWeight: 700 }}>{s.n}</span>
            <div>
              <div className="mono" style={{ fontWeight: 700, fontSize: 14 }}>{s.t}</div>
              <p style={{ margin: "4px 0 0", color: "var(--ink-2)", fontSize: 15, lineHeight: "24px" }}>{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ThreeBoards() {
  const facts = useFacts();
  const ok = hasFacts(facts) && facts.drill;
  const cards = [
    { k: "plaintext", t: "Plaintext board", s: "Every payload readable from the creation transaction." },
    { k: "static_key", t: "One-key board", s: "One key on the phone opens every past ride." },
    { k: "ratchet", t: "Rasure", s: "Only the current and grace epoch, by design." },
  ];
  return (
    <div>
      <div className="grid g3">
        {cards.map((c) => {
          const v = ok ? (facts as any).drill[c.k] : null;
          const good = c.k === "ratchet";
          return (
            <div key={c.k} className="card" style={{ minHeight: 230 }}>
              <div className="mono" style={{ fontWeight: 700 }}>{c.t}</div>
              <div className="mono" style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, color: good ? "var(--cobalt-ink)" : "var(--exposed-ink)" }}>
                {v ? `${v.exposed}/${v.total}` : "..."}
              </div>
              <div className="label">past rides exposed</div>
              <div style={{ height: 8, background: "var(--paper-2)", borderRadius: 4, margin: "12px 0", border: "1px solid var(--rule)" }}>
                <div style={{ height: "100%", width: v && v.total ? `${(100 * v.exposed) / v.total}%` : 0, background: good ? "var(--signal)" : "var(--exposed)", borderRadius: 4, outline: good ? "1px solid var(--cobalt-ink)" : undefined }} />
              </div>
              <p style={{ margin: 0, color: "var(--ink-2)", fontSize: 15, lineHeight: "24px" }}>{c.s}</p>
            </div>
          );
        })}
      </div>
      {!ok && (
        <p className="notice" style={{ marginTop: 18 }}>
          These totals come only from <span className="mono">docs/FACTS.json</span>, which is generated from a live run on Tiramisu. It has not been generated yet, so no number is shown. See <Link href="/drill">the drill</Link>.
        </p>
      )}
    </div>
  );
}

export function MeerasNight() {
  const beats = [
    { t: "20:10", h: "Rides go up", d: "Meera posts three pickups for the evening. Each is sealed on her phone under tonight's key. The board shows landmark codes only to members." },
    { t: "21:30", h: "Drivers claim", d: "Volunteers open the board, filter by zone with a blind tag, and claim. Meera assigns one claim per ride. Nobody else's assignment counts." },
    { t: "23:40", h: "A phone is gone", d: "A volunteer's phone is taken. The person holding it also has a full Arkiv node.", link: true },
    { t: "00:00", h: "The key dies", d: "At the death block the old epoch's key is erased on every phone and its records expire. What the taken phone can read is tonight, not last week." },
  ];
  return (
    <div style={{ position: "relative", paddingLeft: 28, maxWidth: 760 }}>
      <div style={{ position: "absolute", left: 6, top: 6, bottom: 6, width: 2, background: "var(--cobalt-ink)" }} />
      {beats.map((b) => (
        <div key={b.t} style={{ position: "relative", marginBottom: 34 }}>
          <span style={{ position: "absolute", left: -28, top: 8, width: 14, height: 14, background: b.link ? "var(--exposed)" : "var(--signal)", border: "2px solid var(--cobalt-ink)" }} />
          <div className="mono" style={{ fontWeight: 700 }}>{b.t}</div>
          <div className="story" style={{ fontSize: 30 }}>{b.h}</div>
          <p style={{ margin: "6px 0 0", fontFamily: "var(--font-story)", fontSize: 20, lineHeight: "30px", color: "var(--ink-2)" }}>{b.d}</p>
          {b.link && <Link className="btn btn-ink" href="/drill" style={{ marginTop: 10 }}>Replay this moment in the drill</Link>}
        </div>
      ))}
      <p className="label">Meera Kulkarni is a fictional dispatcher. Every place and ride in this product is synthetic.</p>
    </div>
  );
}

export function StrangerPreview() {
  const [state, setState] = useState<{ status: "loading" } | { status: "none" } | { status: "error"; msg: string } | { status: "ok"; e: any; input?: any; verdict: string }>({ status: "loading" });
  useEffect(() => {
    (async () => {
      try {
        const r = await reader.select({ key: true, creator: true, expiresAt: true, attributes: true, payload: true }).where(eq("project", "rasure/v1")).limit(1).fetch();
        const e = r.entities[0];
        if (!e) return setState({ status: "none" });
        const ce = toChainEntity(e);
        const n = Object.keys(ce.attributes).length;
        const bytes = e.payload ? e.payload.length : 0;
        setState({ status: "ok", e, verdict: `Public attributes: ${n}. Names, phones, places: none. Payload: ${bytes} bytes of ciphertext. Outside the allowlist: ${auditAttributes(ce).length}.` });
      } catch (err) {
        const rl = detectRateLimit(err);
        setState({ status: "error", msg: rl ? rl.message : (err as Error).message.slice(0, 200) });
      }
    })();
  }, []);
  void recoverCreates;
  return (
    <div className="grid g2">
      <div className="card" style={{ background: "var(--card)", color: "var(--ink)" }}>
        <div className="mono" style={{ fontWeight: 700, marginBottom: 8 }}>a live Rasure entity, read from Arkiv in your browser</div>
        {state.status === "loading" && <div className="skeleton" style={{ height: 160 }} />}
        {state.status === "none" && <p className="notice">No live Rasure entity exists on Tiramisu right now. Entities expire at key death; post a ride on the board to create one.</p>}
        {state.status === "error" && <p className="notice err" role="alert">{state.msg}</p>}
        {state.status === "ok" && (
          <div>
            <div className="hash">key {state.e.key}</div>
            <div className="hash">creator {state.e.creator}</div>
            <pre className="hash" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(toChainEntity(state.e).attributes, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2)}</pre>
            <div className="hash">payload 0x{Array.from((state.e.payload as Uint8Array).slice(0, 48)).map((b) => b.toString(16).padStart(2, "0")).join("")}...</div>
            <p className="mono" style={{ fontWeight: 700 }}>{state.verdict}</p>
          </div>
        )}
        <Link className="btn btn-ink" href="/explorer-view" style={{ marginTop: 10 }}>Open the stranger view</Link>
      </div>
      <div className="card" style={{ background: "var(--card)", color: "var(--ink)" }}>
        <div className="mono" style={{ fontWeight: 700, marginBottom: 8 }}>What never touches Arkiv</div>
        <ul style={{ margin: 0, paddingLeft: 20, color: "var(--ink-2)" }}>
          <li>Names, phone numbers, plates, addresses, landmarks in plaintext</li>
          <li>Any chain key, seed or secret</li>
          <li>The zone of a ride (only a tag that changes every epoch)</li>
          <li>Which volunteer is a member of a circle</li>
          <li>Plaintext of any record, in any transaction</li>
        </ul>
      </div>
    </div>
  );
}

export function BuiltOnArkiv() {
  const rows = [
    ["Entity Expiration per type", "Rides, claims and assigns die at the key-death block. The circle is a 30 day lease.", "Cards dissolve at key death; a countdown strip."],
    ["Lifetime Extension", "The dispatcher's login extends the circle lease.", "A network badge; a silent network vanishes."],
    ["Creation flags", "readonly on every sealed record; no permissionless extension, on purpose.", "Only the dispatcher sets lifetimes."],
    ["Attributes vs payload", "Six or fewer public attributes; the zone is a rotating blind tag; content is sealed.", "The stranger view shows nothing personal."],
    ["Queries", "Compound predicates, $creator OR-lists, NOT for forgeries, createdBy, cursor pagination pinned with atBlock.", "Board, Ignored panel, audit."],
    ["$creator", "Trust for rides and assignments.", "Ignored: not written by a trusted dispatcher."],
    ["WebSocket events", "watchEntityEvents plus block heads drive the live board and key death.", "The board updates and the key dies without refresh."],
    ["Batch writes", "Assign plus close a previous ride, or circle plus first ride, in one transaction.", "One popup; both land or neither."],
    ["Historical queries (atBlock)", "The drill and the audit read the past on purpose.", "Drill rows."],
  ];
  return (
    <div style={{ overflowX: "auto" }}>
      <table>
        <thead><tr><th>Feature</th><th>How and why</th><th>What the user sees</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r[0]}><td className="mono" style={{ fontWeight: 600 }}>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody>
      </table>
      <p className="label"><a href={`${REPO}/blob/main/SDK_SURFACE.md`}>SDK surface with file and line</a> · <a href={EXPLORER}>explorer</a></p>
    </div>
  );
}

export const PillarIcons = { Lock, Clock, KeyRound };
