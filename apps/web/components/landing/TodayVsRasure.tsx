"use client";
// Hand-built SVG: what a seized phone plus a full node can reach, on Arkiv today and with Rasure.
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X as XIcon } from "lucide-react";

const COLS = 5;
const ROWS = 3;
const W = 1000;
const H = 420;

export function TodayVsRasure() {
  const [mode, setMode] = useState<"today" | "rasure">("today");
  const phone = { x: 880, y: 210 };
  const slips: { c: number; r: number; x: number; y: number }[] = [];
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r < ROWS; r++) slips.push({ c, r, x: 40 + c * 128, y: 70 + r * 90 });
  const reachable = (c: number) => mode === "today" || c >= COLS - 2; // current and grace epoch only
  return (
    <div>
      <div role="group" aria-label="Compare" style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {(["today", "rasure"] as const).map((m) => (
          <button
            key={m}
            className="chip"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            style={{
              cursor: "pointer",
              padding: "8px 14px",
              fontSize: 13,
              background: mode === m ? (m === "today" ? "var(--exposed-ink)" : "var(--cobalt-ink)") : "var(--paper-2)",
              color: mode === m ? (m === "today" ? "#fff" : "var(--signal)") : "var(--cobalt-ink)",
            }}
          >
            {m === "today" ? "on Arkiv today" : "with Rasure"}
          </button>
        ))}
      </div>
      <div className="card" style={{ padding: 12 }}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={mode === "today" ? "Seized phone with lines reaching every past slip" : "With Rasure the phone reaches only the current and grace epoch"} style={{ width: "100%", height: "auto" }}>
          {Array.from({ length: COLS }).map((_, c) => (
            <text key={c} x={40 + c * 128 + 50} y={40} textAnchor="middle" fontFamily="var(--font-geist-mono)" fontSize="13" fill="#0b1a5e">
              {c === COLS - 1 ? "now" : c === COLS - 2 ? "grace" : `epoch -${COLS - 1 - c}`}
            </text>
          ))}
          {slips.map((s, i) => {
            const ok = reachable(s.c);
            const x2 = s.x + 100;
            const y2 = s.y + 24;
            return (
              <g key={i}>
                <motion.path
                  d={`M ${phone.x - 40} ${phone.y} C ${phone.x - 260} ${phone.y}, ${x2 + 200} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="#0a2fb3"
                  strokeWidth="1.2"
                  strokeOpacity={ok ? 0.55 : 0.18}
                  strokeDasharray={ok ? undefined : "3 5"}
                  initial={false}
                  animate={{ pathLength: 1 }}
                />
                {!ok && mode === "rasure" && (
                  <g transform={`translate(${x2 + 28} ${y2 - 8})`}>
                    <line x1="0" y1="14" x2="14" y2="0" stroke="#0b1a5e" strokeWidth="2.4" />
                  </g>
                )}
                <rect x={s.x + 5} y={s.y + 5} width="100" height="48" rx="6" fill="#0b1a5e" />
                <rect x={s.x} y={s.y} width="100" height="48" rx="6" fill={ok ? "#fbfcfe" : "#e9eff8"} stroke="#0b1a5e" strokeWidth="1.6" />
                <text x={s.x + 10} y={s.y + 20} fontFamily="var(--font-geist-mono)" fontSize="11" fill="#0b1a5e">ride</text>
                <text x={s.x + 10} y={s.y + 38} fontFamily="var(--font-geist-mono)" fontSize="10" fill={ok ? "#0b1a5e" : "#8a96b3"}>{ok ? "sealed" : "key erased"}</text>
                <rect x={x2 - 4} y={y2 - 4} width="9" height="9" fill={ok ? (mode === "today" ? "#f0533a" : "#d7f25a") : "#cbd6ea"} stroke="#0b1a5e" strokeWidth="1.2" />
              </g>
            );
          })}
          <rect x={phone.x - 42} y={phone.y - 60} width="96" height="120" rx="14" fill="#0b1a5e" />
          <rect x={phone.x - 48} y={phone.y - 66} width="96" height="120" rx="14" fill="#fbfcfe" stroke="#0b1a5e" strokeWidth="2.4" />
          <text x={phone.x} y={phone.y - 20} textAnchor="middle" fontFamily="var(--font-geist-mono)" fontSize="12" fontWeight="700" fill="#0b1a5e">seized phone</text>
          <text x={phone.x} y={phone.y + 0} textAnchor="middle" fontFamily="var(--font-geist-mono)" fontSize="12" fontWeight="700" fill="#0b1a5e">+ full node</text>
        </svg>
        <p className="label" style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "8px 6px 4px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, background: "#f0533a", border: "1.5px solid #0b1a5e", display: "inline-block" }} />readable from history</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, background: "#d7f25a", border: "1.5px solid #0b1a5e", display: "inline-block" }} />readable by design (current and grace epoch)</span>
        </p>
      </div>
      <div className="grid g2" style={{ marginTop: 24 }}>
        <div>
          <h3 className="mono" style={{ fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}><XIcon size={18} color="#a3230f" aria-hidden="true" /> What happens today</h3>
          <p style={{ color: "var(--ink-2)" }}>
            Entity Expiration removes a record from the board. The payload still sits, uncompressed, in the transaction that created it, and a historical query at any block before the expiry still returns the entity and its payload. Add one static key and one lost phone opens every past pickup.
          </p>
        </div>
        <div>
          <h3 className="mono" style={{ fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}><Check size={18} aria-hidden="true" /> What changes with Rasure</h3>
          <p style={{ color: "var(--ink-2)" }}>
            Each record is sealed under an epoch key. A one-way ratchet erases that key on every phone at the same block that Arkiv expires the record. Arkiv decides when a record dies. The ratchet makes it stay dead.
          </p>
        </div>
      </div>
    </div>
  );
}
