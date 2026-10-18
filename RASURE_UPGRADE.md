# RASURE_UPGRADE.md

Second-pass instruction for the build agent. Read it after `RASURE_BUILD_INSTRUCTION.md`. Every item
is required and ordered by dependency. Tick `[x]` in TASK.md as you go (append these items to
TASK.md as Phase 9 and Phase 10). Author rules are unchanged: 0xkinno only, no AI trailers, no
competitor names anywhere committed.

Why this pass exists: the core thesis and evidence are the deepest in the field. The gaps are
breadth of Arkiv use shown to the user, independent readers, an unattended run, scale of the drill,
and the README's "How we use Arkiv" section, which is currently a link. This pass closes all of them.
Every new feature must change something the user sees and must strengthen the primary guarantee
("a seized phone reads tonight, never last week"). Nothing is added for show.

---

## A. Hygiene first

- [ ] **Scrub history of the private instruction file.** Commits `4b29fc2` and `86318ee` contain
      `RASURE_BUILD_INSTRUCTION.md`, which names sample projects. Rewriting history is allowed
      before the deadline (only after it is disqualifying). Ask Kinnoski, then:
      ```bash
      pip install git-filter-repo
      git filter-repo --path RASURE_BUILD_INSTRUCTION.md --path RASURE_UPGRADE.md --invert-paths --force
      git remote add origin https://github.com/0xkinno/rasure.git
      git push --force origin main
      ```
      Then update the baseline SHA everywhere (README Disclosures, SUBMISSION_DEVFOLIO.md) with the
      new root commit (`git rev-list --max-parents=0 HEAD`). Keep both instruction files in
      `reference/` only.
- [ ] Delete `grep.exe.stackdump` and add `*.stackdump` to `.gitignore`.
- [ ] `arkiv/wallets.md`: remove the stale "no transaction yet" line; regenerate from `scripts/evidence.ts`
      with each wallet's entity count and first transaction.
- [ ] Remove the word "fictional" from every UI string (`Sections.tsx:114`, `judge/page.tsx:59`).
      Replace with: "Every place, ride and wallet in this product is synthetic test data." Keep the
      persona label in `MOMENT.md`.
- [ ] `check-copy.mjs`: also fail on the tokens `LIVE_URL`, `VIDEO_URL`, `PENDING`, `BASELINE_SHA` and `{{`.

## B. Seed and the live demo (needed by everything below)

- [ ] Finish `scripts/seed.ts`. It prints `NEXT_PUBLIC_DEMO_CIRCLE=<32 hex>`; that value is the
      random `circle` id of the seeded demo circle (also in `proof/seed-manifest.json` as `circle`).
      Put it in Vercel env and `.env.local`.
- [ ] **Night watch (unattended run, strategy B6).** `.github/workflows/night-watch.yml`, every 15
      minutes, secrets `DISPATCHER_KEY`, `VOLUNTEER_A_KEY`, `ARKIV_ACCESS_KEY`:
      1. if the demo circle has no ride in the current epoch, post one sealed ride and one claim (so a
         judge always sees a live board during 19 to 23 Oct);
      2. extend the circle lease when under 7 days remain;
      3. run `leak-audit` and an **I1 check** (every live Rasure entity: `expiresAt == keyDeathBlock(epoch)`);
      4. append one line to `proof/watch/<date>.jsonl` and commit it as 0xkinno via the workflow
         (`git config user.name 0xkinno`, noreply email).
      Disclose it in README ("kept alive on purpose") exactly as it is.

## C. Deeper Arkiv use, each tied to the guarantee

Add each to core with unit tests, wire it into the UI, run it once live, record the tx in
`proof/results/<feature>-<date>.json`, and add a row to SDK_SURFACE.md and the README tables.

- [ ] **`deleteEntity`: cancel a ride, withdraw a claim.** Dispatcher "Cancel ride" (before it is
      assigned) and volunteer "Withdraw claim" call `deleteEntity`. The card disappears from every
      board at once. The UI then shows, honestly: "Removed from the board now. Its ciphertext still
      exists in the transaction; it becomes unreadable at block N, when tonight's key dies." This
      demonstrates the thesis twice: delete hides, only key death forgets.
- [ ] **`changeOwnership`: dispatch shift handover.** The night dispatcher hands the circle anchor
      to the morning dispatcher (`changeOwnership` on the `circle` entity, in one `executeBatch`
      with a sealed `handover` record). Trust rule I9: a ride counts if its `$creator` is the
      circle's `$creator`, or was the circle's `$owner` **at the ride's creation block**, checked
      with an `atBlock` query on the circle anchor. A forged ride by the old dispatcher after the
      handover is ignored. UI: "Network held by 0x... since block N (handed over by 0x...)". The
      lease renewal moves with the owner. Test both directions.
- [ ] **`patchEntity`: chain generation on the circle.** Add public attribute `gen` (u64) to the
      circle entity (allowlist + schema). A rekey is one `executeBatch`: create the `rekey` entity
      and `patchEntity` the circle's `gen`. Phones detect a rekey from one attribute on the anchor
      they already read (no extra query) and the board shows "Circle rekeyed at block N, generation
      2". Leave rides readonly.
- [ ] **`permissionlessExtension`: the service tally, funder-verifiable without personal data.**
      New type `tally`: one per closed epoch, created by the dispatcher, public attributes `circle`,
      `epoch`, `served` (u64, rides closed in that epoch), empty payload, `readonly` +
      `permissionlessExtension`, Entity Expiration 90 days. A funder or auditor wallet (new role
      `auditor` in wallets.md) extends tallies it relies on, without owning them. The README story:
      shelters report rides served to funders; today that report is a spreadsheet the shelter
      controls. Here the count is signed by the dispatcher (`$creator`), immutable, and kept alive by
      the funder, and it carries no person, place or time finer than an epoch. Update schema.md to
      explain why rides refuse permissionless extension and tallies use it.
- [ ] **`createCircleWithRide` in the UI.** "Open tonight's network" creates the circle and the first
      ride in one popup. Record the tx.
- [ ] **`$owner` vs `$creator` surfaced.** Every card and the stranger view show "written by"
      (`$creator`) and "held by" (`$owner`) separately, with explorer links.
- [ ] **`ownedBy()` query.** "Networks I hold" on the board uses `.ownedBy(me)` on `type=circle`.
- [ ] **WebSocket `OwnershipTransferred` and `EntityDeleted`** events move the board live (handover
      banner, cancelled card disappears) without a refetch.
- [ ] **`$expiresAt` range query on the board.** "Dies in the next 10 minutes" filter: rides whose
      `$expiresAt` is below `head + 300`. One query, shown as a strip.

## D. Independent readers and observers (Censorship Resistance and Open Source)

- [ ] `examples/raw-drill.mjs`: the seizure drill with **no SDK and no install**: plain JSON-RPC
      (`eth_getTransactionByHash`, `arkiv_query`), the ABI decode written by hand from schema.md,
      WebCrypto HKDF and AES-GCM. Same totals as FACTS. Linked from README and `/proof`.
- [ ] `reader.html`: add "Rewind" (read the demo circle at a past block with `atBlock`) and show
      what a stranger can and cannot open. Works opened from disk, `?rpc=` override.
- [ ] **Arkiv Data Explorer.** Every entity row on `/explorer-view`, `/proof` and the board gets
      "Open in Arkiv Data Explorer" (`https://data.arkiv.network`, deep link if it supports one,
      otherwise the predicate copied to clipboard with instructions). The point for the user: an
      independent Arkiv tool shows the same six attributes and ciphertext, not our renderer.
- [ ] **Arkiv MCP as a third observer.** `scripts/mcp-verify.mjs` connects to the Arkiv MCP server
      (endpoint from `https://hub.arkiv.network/ai-tools`), calls its entity verification tool on
      every key in `proof/seed-manifest.json` and writes `proof/results/mcp-<date>.json`: entity
      exists, expiry block, matches our reader. Show the result on `/proof` as "Confirmed by Arkiv
      MCP". If the tool returns fewer fields than our reader, say which, in friction.md.
- [ ] **Arkiv plugin and skills.** If the Arkiv Claude Code plugin is installed for the build, list
      it under surfaces used with what it was used for. Do not claim it in the product.
- [ ] Publish `@rasure/core` to npm under 0xkinno (or keep as workspace and say so). README shows a
      12-line "forward-secret payloads in your own Arkiv app" example that imports it.

## E. Evidence at scale (strategy D1 to D6)

- [ ] **Bigger drill.** Rerun `drill-run.ts` with 8 epochs x 4 rides x 3 policies (96 records) plus
      the rekey scenario. FACTS regenerates. Keep the 12-record run as `drill-small` for history.
- [ ] **Wild set, three windows.** Run `expiry-audit.ts` at 1 hour, 6 hours and 24 hours back
      (300 entities each, access key). Report per window: sampled, still return payload, readable
      text. Counts only, nothing printed about content, creators or projects. This turns "partial
      run" into the headline: how long expired data stays readable on Tiramisu.
- [ ] **Calldata on the wild set.** For 50 sampled wild entities, find the creation tx from the
      `EntityCreated` log and confirm `recoverCreates` returns the payload. Report the rate.
- [ ] **Key-death timing.** For every demo ride: seconds between the death block and the board's
      dissolve, and `expiresAt == keyDeathBlock` (I1). Median and max in FACTS.
- [ ] **Cost.** GLM and gas per ride, per batch, per rekey, from receipts. In FACTS and README.
- [ ] **One transaction per feature table** (generated by `scripts/evidence.ts`): one row per Arkiv
      feature with the tx link and what it shows.
- [ ] **Misbehaving-client tests:** a client that posts with the wrong expiry (I1 broken) is flagged
      by the night watch; a client that writes an extra attribute is flagged by the leak audit; a
      claim replayed into another epoch fails AAD. Each as a test with its name in README.

## F. README

- [ ] Replace `README.md` with the supplied upgraded README. Fill only from files: live URL, video
      URL, every number from `docs/FACTS.json` via the facts markers, every tx from `arkiv/evidence.md`.
      Remove any table row whose feature is not live yet; never leave a claim the deployed app cannot
      show. `check-copy` must pass.
- [ ] Extend `scripts/facts.ts` to fill the `headline`, `wild` (all three windows) and `facts`
      marker blocks, and `scripts/evidence.ts` to fill `txfeatures`. Replace `BASELINE_SHA` with the
      root commit after the history scrub. `check-copy` also fails on `BASELINE_SHA`.
- [ ] Badges, exactly five: Live (links to the URL), CI (the real Actions badge for `ci.yml`), MIT,
      Arkiv Tiramisu `7738577`, `@arkiv-network/sdk` 0.8.1.
- [ ] Regenerate screenshots after the UI changes (Playwright), including the handover banner and
      the cancel message.

## G. Then

Deploy, second live Playwright spec, red-team round with all five roles (Appendix B), REDTEAM_LOG.md,
then the video. Submit early: ties go to the earlier submission.
