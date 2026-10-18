# PROOF_PLAN

Each proof can come out against us. We publish whichever way it lands.

| Proof | Method | Could it come out against us? | Status |
|---|---|---|---|
| D1 calldata recovery | `scripts/discovery/d1-calldata.ts`, synthetic probe entity, decode `tx.input` after expiry | Yes: if the payload were not recoverable, the premise dies | Script written, waiting for funded probe wallet |
| D2 historical queries | `scripts/discovery/d2-atblock.ts`, query the expired entity `atBlock` and binary search the retention boundary | Yes: the node may refuse history | Script written, waiting for D1 |
| Seizure Drill, counterfactual | Same synthetic rides written three ways as separate circles (plaintext, static key, ratchet) plus a rekeyed fourth, across at least 6 epochs. Attacker = newest chain key + static key + full history | Yes: a ratchet bug shows red rows | `scripts/drill-run.ts` |
| Both error directions | (a) attacker opens a past record, target 0. (b) a legitimate member is refused a current or grace record, target 0, over every live record of the run | Yes | in drill-run |
| Leak audit (I3, I6) | Every `rasure/v1` entity and its creation tx: attribute allowlist; payload fails UTF-8 JSON parse; entropy above 7.5 bits per byte | Yes | `scripts/leak-audit.ts` |
| Wild-set expiry audit | Public Tiramisu entities of any project alive at a past block and expired now; counts only, never content, keys, creators or project names | Yes: could show the problem is rare | Run once, see `proof/results/wild-2026-10-18.json` |
| Key-death timing | For every Rasure ride: `expiresAt == keyDeathBlock(epoch)` (I1), and seconds between that block and the card dissolving | Yes | facts.ts |
| Cost | Gas and GLM per ride from receipts; queries per page view | n/a | facts.ts |

## Honest notes (misses we will publish)

- The current and grace epoch are readable from a seized phone by design (two epochs at most).
- A leaked join link exposes the epoch it carries and every later one until the circle is rekeyed.
- Public metadata remains: wallet addresses, timing, rides per epoch, padded length bucket.
- Erasure is only as good as the phone's storage. We overwrite our copy; we cannot audit the operating system.
- The node's history retention window (D2) and permanent calldata are why encryption, not expiry, carries confidentiality.
