import Link from "next/link";
import { RideSlipStack } from "@/components/hero/RideSlipStack";
import { TodayVsRasure } from "@/components/landing/TodayVsRasure";
import { HowARideMoves, ThreeBoards, MeerasNight, StrangerPreview, BuiltOnArkiv } from "@/components/landing/Sections";
import { ScrapeUnderline } from "@/components/landing/ScrapeUnderline";

export default function Landing() {
  return (
    <>
      <section className="cobalt" style={{ overflow: "hidden" }}>
        <div className="wrap" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 40, alignItems: "center", padding: "72px 16px 84px" }}>
          <div>
            <h1 className="hero-h">
              The ride board that<br />
              <ScrapeUnderline>forgets</ScrapeUnderline>.
            </h1>
            <p style={{ fontSize: 19, marginTop: 22, maxWidth: 560 }}>
              Rasure is a ride board for survivor safe-transport volunteers that truly forgets: a phone taken tonight cannot read last night's pickups, even with the whole chain in hand.
            </p>
            <p style={{ color: "var(--on-cobalt-2)", maxWidth: 560 }}>A seized phone reads tonight. Never last week.</p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 26 }}>
              <Link href="/drill" className="btn btn-lime">Run the seizure drill</Link>
              <Link href="/board" className="btn btn-line">Open the board</Link>
            </div>
          </div>
          <div style={{ display: "grid", justifyItems: "center" }}>
            <RideSlipStack />
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <h2>Expiry hides. It does not forget.</h2>
          <p style={{ maxWidth: 720, color: "var(--ink-2)", margin: "14px 0 28px" }}>
            On Arkiv, an expired record is gone from the board, not from the chain. Rasure lets a shelter's volunteers share live pickups that become unreadable on every phone the moment they expire.
          </p>
          <TodayVsRasure />
        </div>
      </section>

      <section className="cobalt" style={{ padding: "88px 0" }}>
        <div className="wrap">
          <h2 className="story" style={{ marginBottom: 28 }}>How a ride moves</h2>
          <div style={{ color: "var(--ink)" }}><HowARideMoves /></div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <h2>Same night, three boards</h2>
          <p style={{ maxWidth: 720, color: "var(--ink-2)", margin: "14px 0 28px" }}>
            The same synthetic rides, written to Arkiv three ways. The attacker holds one seized phone and the full history.
          </p>
          <ThreeBoards />
        </div>
      </section>

      <section className="sec" style={{ background: "var(--paper-2)" }}>
        <div className="wrap">
          <h2 style={{ marginBottom: 32 }}>Meera's night</h2>
          <MeerasNight />
        </div>
      </section>

      <section className="cobalt" style={{ padding: "88px 0" }}>
        <div className="wrap">
          <h2 className="story" style={{ marginBottom: 28 }}>What a stranger sees</h2>
          <StrangerPreview />
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <h2 style={{ marginBottom: 28 }}>Built on Arkiv</h2>
          <BuiltOnArkiv />
        </div>
      </section>
    </>
  );
}
