"use client";
// Hand-coded hero: a fanned stack of flat slips. Every 5 s the back slip scrapes out, the rest
// slide back one place and a new sealed ride drops in front. Static under prefers-reduced-motion.
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { reader } from "@/lib/chain";

const INK = "#0b1a5e";
const CARD = "#fbfcfe";
const LIME = "#d7f25a";

type Slip = { id: number; kind: "ride" | "claim" | "assign" | "old"; epoch: number };
const POS = [
  { x: 36, y: 22, r: -7 }, // back
  { x: 70, y: 48, r: -2.5 },
  { x: 104, y: 74, r: 2.5 },
  { x: 138, y: 100, r: -1 }, // front
];

function SlipBody({ s }: { s: Slip }) {
  const label = s.kind === "old" ? `epoch ${s.epoch} · key erased` : s.kind === "ride" ? `sealed · epoch ${s.epoch}` : `${s.kind} · epoch ${s.epoch}`;
  return (
    <>
      <rect width="230" height="150" rx="10" fill={CARD} stroke={INK} strokeWidth="2" />
      <text x="16" y="28" fontFamily="var(--font-geist-mono)" fontWeight="700" fontSize="13" fill={INK}>{s.kind === "old" ? "ride" : s.kind}</text>
      {s.kind === "old" ? (
        <g>
          <rect x="12" y="40" width="206" height="98" rx="6" fill="url(#hatch)" opacity="0.9" />
          <circle cx="198" cy="26" r="9" fill="#b8c0d4" stroke={INK} strokeWidth="1.5" />
        </g>
      ) : (
        <g>
          <circle cx="198" cy="26" r="9" fill={LIME} stroke={INK} strokeWidth="1.5" />
          <path d="M16 46 h42 v28 h-42 z M16 46 l21 15 l21 -15" fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <rect x="70" y="52" width="140" height="22" rx="4" fill="#dfe6f6" stroke={INK} strokeWidth="1" />
          <text x="78" y="68" fontFamily="var(--font-geist-mono)" fontSize="11" fill="#5b6a8a" style={{ filter: "blur(2.4px)" }}>SYN-gate-4 · 21:30</text>
        </g>
      )}
      <text x="16" y="130" fontFamily="var(--font-geist-mono)" fontSize="11.5" fill={INK}>{label}</text>
    </>
  );
}

export function RideSlipStack() {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  const [secs, setSecs] = useState(192);
  const [block, setBlock] = useState<string>("...");
  useEffect(() => {
    reader.getBlockNumber({ cacheTime: 0 }).then((b) => setBlock(b.toLocaleString("en-US"))).catch(() => setBlock("offline"));
  }, [tick]);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setTick((n) => n + 1), 5000);
    const c = setInterval(() => setSecs((s) => (s <= 1 ? 192 : s - 1)), 1000);
    return () => { clearInterval(t); clearInterval(c); };
  }, [reduce]);
  useEffect(() => { setSecs(192); }, [tick]);

  const epoch = 412 + tick;
  const slips: Slip[] = [
    { id: tick, kind: "old", epoch: epoch - 3 },
    { id: tick + 1, kind: "ride", epoch: epoch - 2 },
    { id: tick + 2, kind: "claim", epoch: epoch - 1 },
    { id: tick + 3, kind: "assign", epoch },
  ];
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return (
    <svg viewBox="0 0 520 470" role="img" aria-label="A stack of ride slips: an older slip scraped out and marked key erased, newer slips sealed under today's key" style={{ width: "100%", maxWidth: 600, height: "auto" }}>
      <defs>
        <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="7" fill="#eef1f8" />
          <line x1="0" y1="0" x2="0" y2="7" stroke="#9aa6c4" strokeWidth="2" />
        </pattern>
      </defs>
      {/* rotated lime chip */}
      <g transform="rotate(-5 120 28)">
        <rect x="22" y="8" width="250" height="34" rx="8" fill={LIME} stroke={INK} strokeWidth="2" />
        <path d="M38 26 l6 6 l11 -13" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <text x="66" y="30" fontFamily="var(--font-geist-mono)" fontWeight="700" fontSize="13" fill={INK}>sealed · key dies {mm}:{ss}</text>
      </g>
      {slips.map((s, i) => {
        const p = POS[i];
        const hard = (
          <rect x="5" y="5" width="230" height="150" rx="10" fill={INK} />
        );
        return (
          <motion.g
            key={s.id}
            initial={reduce ? false : i === 3 ? { x: p.x, y: p.y - 90, rotate: p.r, opacity: 0 } : false}
            animate={{ x: p.x, y: p.y, rotate: p.r, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ transformOrigin: "115px 75px" }}
          >
            {hard}
            <SlipBody s={s} />
            {i === 0 && !reduce && (
              <motion.rect key={`sc${tick}`} x="0" y="0" height="150" rx="10" fill={CARD} initial={{ width: 0, opacity: 0.9 }} animate={{ width: 230, opacity: 0 }} transition={{ duration: 1.1, delay: 0.1 }} />
            )}
          </motion.g>
        );
      })}
      {/* receipt bar */}
      <g transform="translate(24 300)">
        <rect x="5" y="5" width="470" height="150" rx="14" fill={INK} />
        <rect width="470" height="150" rx="14" fill={LIME} stroke={INK} strokeWidth="2" />
        <text x="22" y="30" fontFamily="var(--font-geist-mono)" fontSize="12" fill={INK}>one circle</text>
        <text x="22" y="66" fontFamily="var(--font-geist-mono)" fontWeight="700" fontSize="26" fill={INK}>tonight's key</text>
        <rect x="290" y="38" width="162" height="30" rx="8" fill={CARD} stroke={INK} strokeWidth="1.5" />
        <text x="302" y="58" fontFamily="var(--font-geist-mono)" fontSize="12" fill={INK}>block {block}</text>
        <line x1="22" y1="88" x2="448" y2="88" stroke={INK} strokeWidth="1.5" strokeDasharray="4 5" />
        <text x="22" y="118" fontFamily="var(--font-geist-mono)" fontSize="12.5" fill={INK}>Meera · post ride · sealed</text>
        <text x="448" y="118" textAnchor="end" fontFamily="var(--font-geist-mono)" fontSize="12.5" fill={INK}>allowed</text>
      </g>
    </svg>
  );
}
