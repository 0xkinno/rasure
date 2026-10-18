# PROGRESS

Last update: 2026-10-18.

## Done and verified on Tiramisu
- Phases 0, 1, 2 (except the demo seed, running), 3, and the app of Phase 4 and 5.
- D1 and D2, the seizure drill (4 scenarios), both error directions, leak audit, wild-set audit, rekey, executeBatch, Lifetime Extension, drip, relay, and an end to end write flow through the board UI. All hashes are in `arkiv/evidence.md`.
- Playwright QA: 6 devices by 7 routes, axe WCAG 2.2 AA, no console errors, hero and glow checks.
- Red team round 1 (rubric judge, skeptic, verifier): findings fixed in code and docs.

## In progress
- `scripts/seed.ts` demo circle (6 epochs of 300 blocks), then the second live spec (`npm run qa:live`).

## Not done (needs Kinnoski)
- Vercel deployment and the live URL in README and Devfolio.
- Demo video with real wallet popups (script in VIDEO_SCRIPT.md).
- History rewrite decision: an early commit contains the private instruction file with sample repo names.
- Devfolio form answers marked PENDING, tag `submission`, final submit.

## Live vs designed
- Live on Tiramisu: everything listed under done.
- Designed, not yet exercised live in a browser with a real wallet extension: the wallet modal (tested with an injected provider backed by a funded key).
