# PROGRESS

Last update: 2026-10-18.

## Done
- Phase 0 except first push (repo `0xkinno/rasure` must exist; see Blockers).

## In progress
- Phase 1: keys generated (.secrets/wallets.json); scripts/fund.ts, d1-calldata.ts, d2-atblock.ts written, not yet run (wallets hold 0 GLM).

## Next
- Kinnoski funds dispatcher and drip; then `npx tsx scripts/fund.ts`, D1, D2.

## Wallet addresses (public)
- dispatcher 0x0e02A09Fcdf1E2fe35F897Ab7A79b86B2a8B0771
- drip 0x4efb9C1bFC33b2079F117f05EB6a5CCdAd38a970
- volunteerA 0x31740a981E6c793907b51B877e2FBe518137c173
- volunteerB 0x9257991047D23e58EF1b90e893924f9eB5AB25e3
- forger 0xEa7b820BC735D519D2927658CD71bc1363578cAA
- probe 0x03a85A77ee3b49d9DC59451279620426c26879Fe

## Live vs designed
- Nothing live yet. `packages/core` is implemented and unit tested (12 tests, typecheck clean).

## Blockers
- GitHub repo `0xkinno/rasure` does not exist yet (HTTP 404): Kinnoski creates it (public, MIT, empty).
- Faucet funding is manual (browser wallet + CAPTCHA).
- Calendar: official submission close is 18 October 2026 23:59 London time. Today is 18 October.
  Full scope is being built regardless; Kinnoski decides what is submitted by the deadline.
