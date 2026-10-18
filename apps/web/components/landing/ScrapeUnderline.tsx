"use client";
import { motion, useReducedMotion } from "framer-motion";

/** "forgets" in lime with a scrape-out underline that draws once. */
export function ScrapeUnderline({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <span className="lime" style={{ position: "relative", display: "inline-block" }}>
      {children}
      <svg viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: -6, width: "100%", height: 12 }}>
        <motion.path
          d="M2 9 L298 4"
          stroke="#d7f25a"
          strokeWidth="4"
          strokeLinecap="square"
          fill="none"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, delay: 0.4, ease: "easeOut" }}
        />
      </svg>
    </span>
  );
}
