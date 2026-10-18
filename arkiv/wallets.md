# Wallets

Addresses that create or sign for Rasure on Tiramisu. Private keys live only in `.secrets/wallets.json` and `.env.local` (both gitignored), never in the repo.

| Role | Address | What it does |
|---|---|---|
| dispatcher | 0x0e02A09Fcdf1E2fe35F897Ab7A79b86B2a8B0771 | Creates `circle`, `ride`, `assign`, `closeout` entities; the trusted dispatcher |
| volunteerA | 0x31740a981E6c793907b51B877e2FBe518137c173 | Creates `claim` entities |
| volunteerB | 0x9257991047D23e58EF1b90e893924f9eB5AB25e3 | Creates `claim` entities |
| forger | 0xEa7b820BC735D519D2927658CD71bc1363578cAA | Writes a forged ride and a forged assign that must be ignored |
| probe | 0x03a85A77ee3b49d9DC59451279620426c26879Fe | Discovery experiments D1 and D2 (synthetic probe) |
| drip | 0x4efb9C1bFC33b2079F117f05EB6a5CCdAd38a970 | Sends test GLM to new visitors; signs no entity |

Browser wallets of judges and visitors sign their own writes. The server signs only the test GLM drip.

Status on 2026-10-18: no transaction has been made by these addresses yet (all balances 0 GLM). Evidence appears in `evidence.md` once funded.
