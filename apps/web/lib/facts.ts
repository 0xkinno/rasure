"use client";
import { useEffect, useState } from "react";

export interface Facts {
  generated?: boolean;
  reason?: string;
  generatedAt?: string;
  d1?: { txHash: string; entityKey: string; recoveredByteForByte: boolean; liveAfterExpiry: boolean };
  d2?: { retentionHours: number; payloadReturnedAfterExpiry: boolean };
  drill?: Record<string, { exposed: number; total: number }>;
  errorDirections?: { attackerOpenedPast: number; memberRefused: number; liveRecords: number };
  leakAudit?: { entities: number; maxPublicAttributes: number; plaintextTx: number; minEntropy: number };
  wild?: { sampled: number; stillReturnPayload: number; readableText: number };
  cost?: { gasPerRide: number; glmPerRide: string };
  [k: string]: unknown;
}

/** Numbers only ever come from FACTS.json. When it is not generated yet, pages say so. */
export function useFacts() {
  const [facts, setFacts] = useState<Facts | null>(null);
  useEffect(() => {
    fetch("/api/facts").then((r) => r.json()).then(setFacts).catch(() => setFacts({ generated: false, reason: "could not load /api/facts" }));
  }, []);
  return facts;
}
export const hasFacts = (f: Facts | null): f is Facts => !!f && f.generated !== false;
