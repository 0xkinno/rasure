import Link from "next/link";
import { REPO, EXPLORER } from "@/lib/config";

export function Footer() {
  return (
    <footer className="cobalt" style={{ padding: "48px 0" }}>
      <div className="wrap" style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "space-between" }}>
        <div>
          <div className="mono" style={{ fontWeight: 700, fontSize: 18 }}>rasure<span className="lime">.</span></div>
          <p className="label" style={{ color: "var(--on-cobalt-2)", maxWidth: 420 }}>
            The dispatch board that forgets on schedule. Synthetic data only. Built on Arkiv, the Web3 database. MIT licence.
          </p>
        </div>
        <ul className="label" style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
          <li><a href={REPO}>Repository</a></li>
          <li><a href={`${REPO}/blob/main/arkiv/schema.md`}>Schema</a></li>
          <li><a href={`${REPO}/blob/main/arkiv/friction.md`}>Friction report</a></li>
          <li><a href={`${REPO}/blob/main/arkiv/evidence.md`}>Evidence</a></li>
          <li><Link href="/proof">Wallet addresses and queries</Link></li>
          <li><a href={EXPLORER}>Tiramisu explorer</a></li>
          <li><a href="/reader.html">One-file reader</a></li>
        </ul>
      </div>
    </footer>
  );
}
