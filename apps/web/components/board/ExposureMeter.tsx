"use client";
import { exposureOf, type KeyringState } from "@rasure/core";

const mmss = (s: number) => `${String(Math.floor(Math.max(0, s) / 60)).padStart(2, "0")}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
const span = (s: number) => (s >= 3600 ? `${(Math.round(s / 360) / 10).toString()} hours` : `${Math.max(1, Math.round(s / 60))} minutes`);

/**
 * The guarantee, shown to the person holding the phone: what a taker could open right now.
 * Counts come from the keys this phone actually holds (exposureOf in core). No Arkiv write.
 */
export function ExposureMeter({ ring, records, head, who = "This phone" }: { ring: Pick<KeyringState, "keys" | "clock">; records: { epoch: bigint }[]; head: bigint; who?: string }) {
  const x = exposureOf(ring, records, head);
  const erased = x.erasedAtBlocks;
  return (
    <section className="card" aria-label="If this phone were taken now" style={{ marginTop: 20 }}>
      <div className="label" style={{ color: "var(--cobalt)", letterSpacing: ".12em", fontWeight: 700 }}>IF THIS PHONE WERE TAKEN NOW</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16, marginTop: 10 }}>
        <div>
          <div className="mono" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.1 }} data-testid="exposure-open">{x.openable}</div>
          <div className="label">{who} can open {x.openable === 1 ? "1 ride" : `${x.openable} rides`} right now{x.openable > 0 ? `, all from the last ${span(x.windowSeconds)}` : ""}.</div>
        </div>
        <div>
          <div className="mono" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.1 }} data-testid="exposure-older">0</div>
          <div className="label">Rides older than that: 0 openable{erased.length ? ` (keys erased at block${erased.length === 1 ? "" : "s"} ${erased.map(String).join(", ")})` : ""}.</div>
        </div>
        <div>
          <div className="mono" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.1 }} data-testid="exposure-clock">{x.secondsToNone === null ? "00:00" : mmss(x.secondsToNone)}</div>
          <div className="label">{x.secondsToNone === null ? `${who} holds no key: it opens none.` : `In ${mmss(x.secondsToNone)} ${who.toLowerCase()} will open none of them.`}</div>
        </div>
      </div>
    </section>
  );
}
