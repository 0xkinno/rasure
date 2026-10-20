# TASK.md

Work top to bottom. Every item is required. Order is by dependency. Tick `[x]` only when the item
is done, verified and committed by 0xkinno. If an item is blocked, write the blocker in PROGRESS.md,
continue with the next unblocked item, and come back to it. Update PROGRESS.md after every phase:
done, in progress, next, live vs designed.

## Phase 0. Setup and rules
- [x] Read RASURE_BUILD_INSTRUCTION.md fully
- [x] `KINNO_EMAIL=<email> sh scripts/setup-git.sh`; `git init`; confirm `git config user.name` is `0xkinno`
- [x] Clone every repo in instruction section 14 into `reference/`; write `reference/banned.txt`; write a private `reference/notes.md` with each sample's mechanism, Arkiv features, evidence and gaps
- [x] Write `RULES_EXTRACT.md` (rules, rubric, checklist, every Devfolio question)
- [x] Monorepo root `package.json` (npm workspaces `packages/*`, `apps/*`), LICENSE (MIT, 0xkinno)
- [x] `cd packages/core && npm install && npm test` (12 tests) and `npm run typecheck` pass
- [x] First commit and push to `github.com/0xkinno/rasure`; attribution workflow runs green

## Phase 1. Discovery gate (no UI before this passes)
- [x] `scripts/keys.ts`: dispatcher, volunteerA, volunteerB, forger, probe, drip keys into `.secrets/wallets.json` (mode 600), print addresses only
- [x] Kinnoski funds dispatcher and drip from the faucet; `scripts/fund.ts` splits GLM to the others
- [x] `scripts/discovery/d1-calldata.ts` live: payload recovered from the creation tx after expiry; `proof/results/d1-*.json`
- [x] `scripts/discovery/d2-atblock.ts` live: history query result and the node's retention boundary recorded
- [x] `DISCOVERY.md` (primitive, constraint, evidence, why others fail, capability, invariant, failure mode, reproduction)
- [x] `MOMENT.md` with every source opened and verified (drop any unconfirmed figure)
- [x] `THESIS.md` (five lines, name rationale, primary guarantee, I1 to I8)
- [x] `PROOF_PLAN.md`
- [x] Start `arkiv/friction.md` with D1 and D2 (expected, actual, versions, steps, fix)

## Phase 2. Mechanism on chain
- [x] `packages/core/src/queries.ts` (Q1 to Q8) + unit tests that render each predicate string
- [x] `packages/core/src/writes.ts`: createCircle, postRide, claimRide, assignClaim (batch where two writes must land together), closeRide, extendCircle; every sealed write uses `ExpirationTime.atBlock(keyDeathBlock)` with a 20-block margin guard
- [x] `packages/core/src/read.ts`: retryCount 0, 429 detection with retry time, cursor pagination pinned by `atBlock`
- [x] `scripts/seed.ts` (demo circle, 300-block epochs): rides across at least 6 epochs, claims, assigns, a closeout, one forged ride and one forged assign (forger); `proof/seed-manifest.json`
- [x] `scripts/drill-run.ts`: same synthetic rides written three ways (plaintext, static key, ratchet) as separate circles; keys and tx hashes in `proof/drill-manifest.json`; wait until older epochs are dead; run `seizureDrill` from calldata; `proof/results/drill-*.json`
- [x] Both error directions measured: attacker opens a past record (target 0) and a legitimate member is refused a current or grace record (target 0)
- [x] `scripts/leak-audit.ts` (I3, I6) over every rasure/v1 entity and its creation tx
- [x] `scripts/expiry-audit.ts` wild set: public Tiramisu entities alive at a past block and expired now; counts only, never print content, creators or project names
- [x] `scripts/facts.ts` writes `docs/FACTS.json` from `proof/results/*.json`
- [x] CLI `scripts/rasure.ts`: `board`, `verify <key>`, `drill`, `audit`, all reading Arkiv without the site

## Phase 3. Rekey (post-compromise recovery)
- [x] Member device keys: each member publishes a `member` entity with a device public key (secp256k1, generated in the browser, not the wallet key); add `member`, `rekey` to TYPES and schema.md
- [x] `rekey` entity by the dispatcher: a fresh chain key sealed to each remaining member's device key (ECIES with `@noble/curves` + HKDF + AES-GCM), Entity Expiration one epoch
- [x] Phones adopt the new chain at the rekey's epoch; a removed member's phone cannot read anything sealed after it
- [x] Unit tests + a live run recorded in `proof/results/rekey-*.json`; add to the drill as a fourth scenario ("seized, then rekeyed")

## Phase 4. App core
- [x] `apps/web` Next.js 15 + TypeScript, fonts via next/font (Instrument Serif, Geist, Geist Mono), tokens.css, paper grain, blueprint grid
- [x] EIP-6963 wallet modal (no Reown), add/switch chain `0x7614d1`, balance, drip button, power-icon disconnect
- [x] `/api/drip` (server key, one drip per address per hour, refuses when balance is already above 0.005 GLM)
- [x] `/api/rpc` read relay (only `arkiv_query`, `eth_getTransactionByHash`, `eth_blockNumber`, `eth_getBlockByNumber`; adds `X-API-KEY`; used only after a 429)
- [x] Keyring in IndexedDB; `advance()` on load, on each WebSocket head, before each read
- [x] `/join` from a fragment, then strip the fragment from the address bar
- [x] `/board`: create circle + QR, post ride, live cards, claim, assign, close out, rekey, zone filter by blind tag, Ignored panel (forged ride, forged assign), night dispatch theme
- [x] Key-death strip with countdown and live scrape-out dissolve at the death block
- [x] `/drill` (no wallet): four scenarios, live run from manifest and calldata, totals equal FACTS
- [x] `/explorer-view` (no wallet): raw attributes, payload hex, decoded creation tx, verdict line
- [x] `/proof`: FACTS, invariants with test names, wallets with explorer links, every query + curl
- [x] `/judge` and `JUDGE.md`: 60-second, 3-minute and 10-minute walks
- [x] `apps/web/public/reader.html`: one-file reader built only from schema.md (Open Source and Censorship Resistance evidence)
- [ ] Deploy to Vercel, set env vars, open every route on the live URL

## Phase 5. Landing and polish
- [x] Cobalt navbar with square capsules, layoutId lime glow on the active item, wallet button
- [x] Hero: mono headline, pitch, buttons, `RideSlipStack.tsx` animation, optional hero image masked behind
- [x] Landing sections 2 to 7 (today vs with Rasure diagram, how a ride moves, three boards, Meera's night, stranger view, built on Arkiv); numbers only from FACTS.json
- [x] Card hover glow, loading skeletons, error states that show the retry time
- [x] Playwright suite on 6 devices (instruction 9.10), screenshots to `docs/screens/`
- [x] axe WCAG 2.2 AA passes on every route
- [x] `scripts/check-copy.mjs` passes (no em or en dashes, no emoji, no hype words, no banned names, no secrets)

## Phase 6. Docs and evidence
- [x] `arkiv/schema.md` complete
- [x] `arkiv/friction.md` complete (every item with versions and repro; tested paths that worked too)
- [x] `arkiv/wallets.md` and `arkiv/evidence.md` (generated)
- [x] `SDK_SURFACE.md` with file:line and "Not used, so not claimed"
- [ ] `README.md` per instruction section 10, banner + 2x2 real screenshots, all four pillar sections
- [x] `SUBMISSION_DEVFOLIO.md`, every field drafted

## Phase 7. Red team, video, freeze
- [ ] Red-team rounds (5 roles) until a clean round; `REDTEAM_LOG.md`
- [ ] Video (2:50 or less) on the live URL with real wallet popups; uploaded
- [ ] Video link in README and Devfolio draft
- [ ] Tag commit `submission`; freeze the deployment

## Phase 8. Submit
- [ ] Kinnoski reviews and submits on Devfolio: Privacy, Security, Open Source, Censorship Resistance
- [ ] Repo public; every link opens without access

## Phase 9. Upgrade pass (RASURE_UPGRADE.md A to D)
- [x] A: instruction files moved to `reference/` and ignored (history scrub declined by Kinnoski; sample names stay in two old commits)
- [x] A: delete `grep.exe.stackdump`, ignore `*.stackdump`
- [x] A: `arkiv/wallets.md` regenerated by `scripts/evidence.ts` with entity counts and first tx
- [x] A: remove "fictional" from every UI string
- [x] A: `check-copy.mjs` fails on `LIVE_URL`, `VIDEO_URL`, `PENDING`, `BASELINE_SHA`, `{{`
- [x] B: demo circle id in `.env.local` and Vercel env
- [x] B: `.github/workflows/night-watch.yml` and `scripts/night-watch.ts` (post, claim, lease, leak audit, I1 check, `proof/watch/<date>.jsonl`)
- [x] C: `deleteEntity` (cancel ride, withdraw claim), live
- [x] C: `changeOwnership` handover with I9 (owner at block), live
- [x] C: `patchEntity` chain generation `gen`, rekey as one batch, live
- [x] C: `tally` type with `permissionlessExtension`, auditor role, live
- [x] C: `createCircleWithRide` in the UI, live
- [x] C: `$owner` vs `$creator` shown on cards and stranger view
- [x] C: `ownedBy()` "Networks I hold"
- [x] C: WebSocket `OwnershipTransferred` and `EntityDeleted` move the board
- [x] C: `$expiresAt` range "dies in the next 10 minutes" strip
- [x] D: `examples/raw-drill.mjs` (no SDK)
- [x] D: `reader.html` Rewind and stranger view, `?rpc=` override
- [x] D: Arkiv Data Explorer links on `/explorer-view`, `/proof` and the board
- [x] D: `scripts/mcp-verify.mjs` and `/proof` "Confirmed by Arkiv MCP"
- [ ] D: Arkiv plugin and skills listed under surfaces used (if used)
- [x] D: `@rasure/core` publish decision and 12-line README example

## Phase 10. Evidence, README, deploy (UPGRADE E to G)
- [x] E: bigger drill 8 epochs x 4 rides x 3 policies (96 records) plus rekey; keep `drill-small`
- [x] E: wild set at 1 h, 6 h and 24 h (300 each)
- [x] E: calldata recovery on 50 wild entities
- [x] E: key-death timing median and max in FACTS
- [x] E: cost per ride, batch, rekey in FACTS and README
- [x] E: one transaction per feature table generated by `scripts/evidence.ts`
- [x] E: misbehaving-client tests (wrong expiry, extra attribute, replayed claim)
- [x] F: README from template with markers filled and then stripped; five badges; rows for features not live removed
- [x] F: `scripts/facts.ts` fills headline, wild, facts; `scripts/evidence.ts` fills txfeatures; baseline SHA set
- [x] F: screenshots regenerated
- [x] G: deploy with `vercel --prod`, open every route on the live URL
- [ ] G: second live Playwright spec against the live URL
- [ ] G: red-team round with five roles, `REDTEAM_LOG.md`
- [ ] G: video only after deploy, seed, night watch and one red-team round

## Phase 11: Final pass
- [x] 1. `apps/web/lib/facts.ts` bakes `public/facts.json` into the build; no-JavaScript Playwright test for `/`, `/proof` and `/drill` (`tests/e2e/nojs.spec.ts`); live check with curl
- [x] 2. Human first: README quote under the pitch, same three sentences as a mono caption in the landing hero
- [x] 3. The guarantee in hours, derived from `EPOCH_BLOCKS` (`epochGuarantee()` in core): README, landing, drill page
- [x] 4. Exposure meter (`ExposureMeter.tsx`, `exposureOf` with tests): board and demo view; README step 4
- [x] 5. Positioning paragraph in README "The problem"
- [x] 6. `arkiv-encryption@0.1.0` evaluated: `scripts/repro/aad-replay.mjs`, friction item 13, README and SDK_SURFACE rows, surfaces used
- [ ] 7. History scrub: skipped by decision of Kinnoski
