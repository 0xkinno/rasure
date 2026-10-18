"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, Power, X } from "lucide-react";
import { useWallet } from "@/lib/wallet";
import { short } from "@/lib/config";

const ITEMS = [
  { href: "/board", label: "Board" },
  { href: "/drill", label: "Drill" },
  { href: "/explorer-view", label: "Stranger view" },
  { href: "/proof", label: "Proof" },
  { href: "/judge", label: "Judges" },
];

export function Mark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <rect x="2" y="2" width="24" height="24" rx="5" fill="none" stroke="#eaf0ff" strokeWidth="2" />
      <path d="M6 22 L22 6" stroke="#d7f25a" strokeWidth="3" strokeLinecap="square" />
    </svg>
  );
}

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const w = useWallet();
  const capsule = (it: (typeof ITEMS)[number], mobile = false) => {
    const active = path === it.href;
    return (
      <Link
        key={it.href}
        href={it.href}
        onClick={() => setOpen(false)}
        aria-current={active ? "page" : undefined}
        className="mono"
        data-active={active}
        style={{
          position: "relative",
          padding: "8px 14px",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
          color: active ? "var(--signal)" : "var(--on-cobalt)",
          display: mobile ? "block" : "inline-block",
        }}
      >
        {active && (
          <motion.span
            layoutId="navglow"
            className="navglow"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 10,
              boxShadow: "0 0 0 1px var(--signal), 0 0 22px var(--signal-glow)",
            }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          />
        )}
        <span style={{ position: "relative" }}>{it.label}</span>
      </Link>
    );
  };
  return (
    <header className="cobalt" style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--cobalt)", borderBottom: "1px solid rgba(255,255,255,.14)" }}>
      <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 68, gap: 12 }}>
        <Link href="/" className="mono" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--on-cobalt)", fontWeight: 700, fontSize: 20 }}>
          <Mark />
          <span>
            rasure<span className="lime">.</span>
          </span>
        </Link>
        <nav aria-label="Primary" className="desk-nav" style={{ display: "flex", gap: 6 }}>
          {ITEMS.map((i) => capsule(i))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {w.account ? (
            <>
              <span className="chip" style={{ background: "var(--cobalt-deep)", color: "var(--on-cobalt)", borderColor: "var(--on-cobalt-2)" }}>
                {short(w.account, 4)}
              </span>
              <button className="btn btn-line" aria-label="Disconnect wallet" onClick={w.disconnect} style={{ padding: 9 }}>
                <Power size={16} aria-hidden="true" />
              </button>
            </>
          ) : (
            <button className="btn btn-lime" onClick={w.openModal}>
              Connect wallet
            </button>
          )}
          <button className="btn btn-line mob-btn" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)} style={{ padding: 9 }}>
            {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Mobile" className="wrap mob-sheet" style={{ display: "grid", gap: 6, paddingBottom: 14 }}>
          {ITEMS.map((i) => capsule(i, true))}
        </nav>
      )}
      <style>{`.mob-btn{display:none}@media(max-width:900px){.desk-nav{display:none!important}.mob-btn{display:inline-flex}}@media(min-width:901px){.mob-sheet{display:none!important}}`}</style>
    </header>
  );
}
