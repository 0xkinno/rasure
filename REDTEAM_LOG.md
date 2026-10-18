# Red team log

## Round 1 (2026-10-18, three roles)
- Rubric judge: scored the four criteria and flagged missing live proof for Lifetime Extension (since added: `proof/results/extend-*.json`), two wrong line numbers in SDK_SURFACE.md (fixed) and the unfinished deployment (done).
- Skeptic: found claims that history queries return payloads after expiry (D2 shows only up to `expiresAt - 1`; all copy corrected), the wild-set framing (corrected, partial runs labelled) and sample names in git history (left in place by decision of Kinnoski).
- Verifier: found a static device key that could unwrap past rekeys (device secret now deleted on adoption), unauthenticated member entities (opt-in keep list, key validation), claim replay and spam claims (claim body binds ride and claimant), an unfiltered Q3b (assign and closeout restricted to holders), drip and relay hardening, join link validation. All fixed with tests.

## Round 2 (2026-10-18, two roles on the live URL and repository)
Results recorded below after the reviewers finished.
