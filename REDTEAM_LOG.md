# Red team log

## Round 1 (2026-10-18, three roles)
- Rubric judge: scored the four criteria and flagged missing live proof for Lifetime Extension (since added: `proof/results/extend-*.json`), two wrong line numbers in SDK_SURFACE.md (fixed) and the unfinished deployment (done).
- Skeptic: found claims that history queries return payloads after expiry (D2 shows only up to `expiresAt - 1`; all copy corrected), the wild-set framing (corrected, partial runs labelled) and sample names in git history (left in place by decision of Kinnoski).
- Verifier: found a static device key that could unwrap past rekeys (device secret now deleted on adoption), unauthenticated member entities (opt-in keep list, key validation), claim replay and spam claims (claim body binds ride and claimant), an unfiltered Q3b (assign and closeout restricted to holders), drip and relay hardening, join link validation. All fixed with tests.

## Round 2 (2026-10-18, two roles on the live URL and repository)
Results recorded below after the reviewers finished.

Round 2 findings and fixes:
- Judge on the live URL: empty /board (now a read-only live demo view with countdown), "[object Object]" in the stranger view (fixed), stale JUDGE.md text and a /judge page that did not match it (fixed), wild-set row mislabelled as partial (now one row per window).
- Maintainer: SDK_SURFACE.md understated the product and had stale line numbers (rewritten with live proof per row), README said the lease renews on activity (now: a button, plus the night watch), "MCP confirms every entity" (now: observed and agreed with our reader), WebSocket events were network-wide (wording corrected).
- QA after the fixes: 18 of 18 on the changed routes against https://rasure.vercel.app; the earlier full run passed 52 of 54, the other two were a DNS blip and a stale build.
