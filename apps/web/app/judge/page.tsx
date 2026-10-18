import Link from "next/link";
import { REPO } from "@/lib/config";

const walks = [
  {
    t: "60 seconds, no wallet",
    steps: [
      ["Open the landing page and read the one-line pitch.", "/"],
      ["Press Run the seizure on the drill. Read the red and sealed totals.", "/drill"],
      ["Open the stranger view and read the verdict line for a live entity.", "/explorer-view"],
    ],
  },
  {
    t: "3 minutes, no wallet",
    steps: [
      ["Do the 60 second walk.", "/"],
      ["On the proof page, copy one curl and run it in a terminal. The answer is the same entities the board shows.", "/proof"],
      ["Paste the D1 creation transaction 0xf3f506c0140ad1b298c052ff3797d7ba9a9fa7a7651fd28643c9e54cca098ba6 in the stranger view: the entity is long expired and its payload is still in the transaction input.", "/explorer-view"],
      ["Read the schema: every entity type, attribute, Entity Expiration rule and query.", `${REPO}/blob/main/arkiv/schema.md`],
      ["Open the friction report: the discovery that expiry is not erasure, with the script that reproduces it.", `${REPO}/blob/main/arkiv/friction.md`],
    ],
  },
  {
    t: "10 minutes, with a wallet",
    steps: [
      ["Connect a wallet on the board. The modal adds the Tiramisu chain for you. Use Get test GLM if your balance is zero.", "/board"],
      ["Create a circle, post a ride, and watch the transaction on the explorer.", "/board"],
      ["Open the join link in a second browser profile, claim the ride, then assign it as the dispatcher.", "/board"],
      ["Press Post as a stranger from a second wallet. It lands in the Ignored panel with its creator address.", "/board"],
      ["Wait for key death. The strip flips, the cards dissolve, and the explorer shows the same block as the expiry.", "/board"],
      ["Wait for key death on a demo circle (10 minute epochs): the strip flips, the card dissolves, and the explorer shows the same block as the expiry.", "/board"],
      ["Publish a device key as the volunteer, then rekey as the dispatcher without that member: later rides stay sealed to the removed phone.", "/board"],
      ["Read it without the site: run the CLI.", `${REPO}/blob/main/scripts/rasure.ts`],
    ],
  },
];

export default function Judge() {
  return (
    <>
      <section className="cobalt" style={{ padding: "56px 0" }}>
        <div className="wrap">
          <h1 className="hero-h" style={{ fontSize: "clamp(34px,5vw,56px)" }}>For judges</h1>
          <p style={{ fontSize: 19, maxWidth: 760 }}>Three walks of increasing depth. The first two need no wallet and no faucet. Every number comes from a script you can run.</p>
        </div>
      </section>
      <div className="wrap" style={{ padding: "48px 16px" }}>
        <div className="grid g3">
          {walks.map((w) => (
            <div key={w.t} className="card">
              <h2 className="story" style={{ fontSize: 28 }}>{w.t}</h2>
              <ol style={{ paddingLeft: 20, color: "var(--ink-2)" }}>
                {w.steps.map(([s, href]) => (
                  <li key={s} style={{ marginBottom: 8 }}>
                    {href.startsWith("http") ? <a href={href}>{s}</a> : <Link href={href}>{s}</Link>}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <p className="label" style={{ marginTop: 28 }}>The same walks are in <a href={`${REPO}/blob/main/JUDGE.md`}>JUDGE.md</a>. Every place, ride and wallet in this product is synthetic test data.</p>
      </div>
    </>
  );
}
