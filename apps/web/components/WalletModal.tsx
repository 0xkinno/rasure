"use client";
import { useWallet } from "@/lib/wallet";
import { FAUCET } from "@/lib/config";

export function WalletModal() {
  const w = useWallet();
  if (!w.modalOpen) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Connect a wallet" onClick={w.closeModal}
      style={{ position: "fixed", inset: 0, background: "rgba(7,31,122,.72)", zIndex: 200, display: "grid", placeItems: "center", padding: 16 }}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "min(440px, 100%)" }}>
        <h2 className="story" style={{ fontSize: 32 }}>Connect a wallet</h2>
        <p style={{ color: "var(--ink-2)", margin: "8px 0 16px" }}>
          Your own wallet signs every write. Rasure never holds your key. Network: Arkiv Tiramisu (chain 7738577).
        </p>
        {w.wallets.length === 0 && (
          <div className="notice">No browser wallet detected. Install MetaMask or Rabby, then reload this page. You can still use the drill, stranger view and proof pages without one.</div>
        )}
        <div style={{ display: "grid", gap: 8 }}>
          {w.wallets.map((d) => (
            <button key={d.uuid} className="btn btn-ink" disabled={w.connecting} onClick={() => w.connect(d)} style={{ justifyContent: "flex-start" }}>
              {d.icon ? <img src={d.icon} alt="" width={22} height={22} /> : null}
              {d.name}
            </button>
          ))}
        </div>
        {w.error && <p className="notice err" role="alert" style={{ marginTop: 12 }}>{w.error}</p>}
        <p className="label" style={{ marginTop: 14 }}>
          Need test GLM? <a href={FAUCET} target="_blank" rel="noreferrer">Hub faucet</a>
        </p>
        <button className="btn" onClick={w.closeModal} style={{ marginTop: 10, background: "var(--paper-2)", color: "var(--cobalt-ink)" }}>Close</button>
      </div>
    </div>
  );
}
