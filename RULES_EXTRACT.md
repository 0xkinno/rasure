# RULES_EXTRACT

Verbatim copy of the canonical rules from github.com/Arkiv-Network/global-tour-stop-pre-devcon (RULES.md, docs/scoring-rubric.md, docs/submission-checklist.md, AGENTS.md). Third-party text, kept as published; check-copy skips this file.

---

<!-- source: RULES.md -->

# Official Rules & Terms

> [!NOTE]
> **Frozen since 9 October 2026.** Only dated clarifications may be added. Weights, gates, eligibility and prizes do not change after the opening.

## 1. Overview

Arkiv: Global Tour Stop ("Challenge"), a builder challenge, is organized by Golem Factory GmbH, doing business as "Arkiv Network" ("Organizer"), and distributed through Devfolio. By submitting an entry, participants agree to these rules in full.

This repository is the only canonical source of the rules. It holds the full rules, rubric and submission checklist. If the Devfolio page ([arkiv.devfolio.co](https://arkiv.devfolio.co/overview)) differs, this repository applies.

## 2. Eligibility

- Open to individuals and teams worldwide. Fully online.
- Participants must be 18 or older at the time of submission.
- No purchase necessary.
- Employees of Arkiv / Golem Network and their immediate families are not eligible for prizes.
- Teams have up to 5 members. The roster is frozen when submissions close: members cannot be added or removed afterwards.
- Multiple submissions are allowed only if they are distinct projects. A team wins at most one prize across all its entries.

### Best Indian Use Case

A real-world application built on Arkiv that people in India can use. It does not need to follow a CROPS pillar. To compete, choose the Best Indian Use Case track. Your team must include **at least one person of Indian nationality**. Teams declare it when they register and again in the Devfolio submission form, and KYC for this prize is done with that person.

## 3. Challenge period

All times are London time (BST, UTC+1).

| Date | |
|---|---|
| 7 October 2026 | Registration opens on Devfolio |
| 9 October 2026, 12:00 | Opening, live at Network School Astana; submissions open |
| 18 October 2026, 23:59 (22:59 UTC) | Submissions and registration close |
| 19 to 22 October 2026 | Judging |
| 23 October 2026, 18:00 | Winners announced |
| 25 October 2026 | Deadline for winners to accept their prize |
| 3 to 6 November 2026 | Devcon 8, Mumbai |

Late submissions are not accepted. At the deadline we record each repo's commit SHA and judge that commit; rewriting history after the deadline disqualifies the entry. Deployments stay up until 23 October. The Organizer may adjust these dates; changes are announced on Devfolio and the Arkiv Discord.

## 4. Submission requirements

Submissions are made on Devfolio, the only valid method. What is asked at registration and at submission is listed in [docs/submission-checklist.md](docs/submission-checklist.md).

Every submission must pass these gates to be scored:

| Requirement | Details |
|---|---|
| Working app | Public deployment, connected to the Tiramisu testnet, usable without asking for access |
| Reproducible | Steps and the exact query that produce what the submission claims |
| Public repo | MIT licence, setup instructions in the README |
| `/arkiv/schema.md` | Entity types, attributes, expiration per type, queries |
| On-chain evidence | The wallet addresses that create your Arkiv entities on Tiramisu |
| `/arkiv/friction.md` | Feedback on building with Arkiv |
| Demo video | 3 minutes or less |
| One or more tracks | A CROPS pillar (Censorship Resistance, Open Source, Privacy, Security) or Best Indian Use Case, chosen on Devfolio |
| Submission questions | Every required question on the Devfolio project form answered (listed in the [checklist](docs/submission-checklist.md)) |

### Valid submissions

- Use Arkiv as the primary data layer, through the official SDK (`@arkiv-network/sdk` 0.8.x) or direct RPC.
- Original work created between 9 and 18 October 2026. Libraries, frameworks and boilerplate are allowed; the Arkiv integration and the core logic must be new. Pre-existing work is disclosed in the submission with its baseline commit SHA and the components reused.
- AI coding assistants are allowed.

### Disqualified submissions

- Plagiarised work or code copied from another participant.
- No meaningful Arkiv use (the SDK installed but never queried, or a conventional database app with Arkiv branding).
- Private keys or secrets stored in Arkiv, or real personal data stored in plaintext or hashed form (hashes of emails or phone numbers can be reversed). Use synthetic data; encrypted payloads of test data are fine.
- Malicious code or intentionally introduced vulnerabilities.
- No working app, or submitted after the deadline.

## 5. Prizes

| Prize | Reward |
|---|---|
| Best Indian Use Case | Devcon 8 ticket + $2,000 USDC |
| Censorship Resistance (Global) | Devcon 8 ticket + $750 USDC |
| Open Source (Global) | Devcon 8 ticket + $750 USDC |
| Privacy (Global) | Devcon 8 ticket + $750 USDC |
| Security (Global) | Devcon 8 ticket + $750 USDC |

**Total: $5,000 USDC and five Devcon 8 tickets.**

### Prize conditions

- **Attending Devcon is not required to win.** Each winning team gets one Devcon 8 ticket (Mumbai, 3 to 6 November 2026) to use if it wants to attend.
- **Payment:** prizes are paid within 14 days after the winner completes KYC.
- **One ticket per winning team.** Travel, visa and accommodation are the winner's responsibility.
- **One prize per team.** You can enter more than one track, but your team wins at most one prize. If you win Best Indian Use Case, you cannot also win a Global prize. If you win one Global prize, you cannot win another. Allocation is described in the [rubric](docs/scoring-rubric.md#3-ranking-and-prizes).
- **Minimum score.** A project needs at least 50/100 to win. If a Global prize has no eligible project, it goes to the highest-ranked project that has not won, ranked by its highest track total. Best Indian Use Case only goes to a team with at least one member of Indian nationality; if no such team qualifies, it is not awarded.
- **Currency:** USDC, sent to an EVM wallet address.
- **KYC is required to claim a prize, not to enter.**
- Prizes are non-transferable, except as described in Section 6.
- Taxes are the winner's sole responsibility. The Organizer does not withhold taxes or give tax advice.

## 6. Confirmation and runner-up policy

1. Winners are notified by email and Telegram on 23 October.
2. Each winning team accepts the prize by replying to the notification email within **48 hours** of it being sent. A replacement winner gets its own 48-hour window from its own notification.
3. If a team does not accept, declines, or cannot complete KYC, the prize passes to the next-ranked eligible team:
   - a Global prize goes to the next team in that pillar;
   - Best Indian Use Case goes to the next team in that track with at least one member of Indian nationality;
   - if no eligible team remains, Section 5 (minimum score) applies.
4. Replacements are offered until 28 October 2026. After that, a prize that is declined stays unawarded.

## 7. KYC

Winners complete KYC before payout. The Organizer shares the process with each winning team after the announcement. For Best Indian Use Case, KYC is done with the team member of Indian nationality.

## 8. Judging

The Arkiv team judges every submission against the published [scoring rubric](docs/scoring-rubric.md): gates first, then four criteria at 25 points each. Judges with a conflict of interest recuse themselves. Ties are broken as described in the rubric. Judges' decisions are final and not subject to appeal.

## 9. Intellectual property

- Participants keep full ownership of their submissions, which must be published under the MIT licence.
- By entering, participants grant the Organizer a non-exclusive, royalty-free, worldwide licence to showcase the submission, reference it as an example of Arkiv usage, and fork the repository for educational purposes.
- Teams that plan to attend Devcon 8 can say so in the submission form, so we can showcase their project at the Arkiv booth. It does not affect judging.

## 10. Code of conduct

Treat everyone with respect. No harassment, discrimination, sabotage of other teams, or illegal or harmful content in any Challenge channel. Violations may lead to disqualification at the Organizer's discretion.

## 11. Liability

- The Organizer is not responsible for technical failures, network issues or testnet downtime.
- The Organizer is not responsible for travel, visas, accommodation or any cost beyond the stated prizes.
- The Organizer may extend deadlines or cancel the Challenge if circumstances require, and may add dated clarifications. Changes never apply retroactively against a team, and are announced on Devfolio and the Arkiv Discord.
- The Organizer's total liability is limited to the stated prizes.

## 12. Privacy

- Personal data collected at registration and submission is used only to run the Challenge.
- With the participant's consent at registration, contact details are shared between Arkiv and Devfolio for this Challenge.
- Participants are not added to marketing lists without explicit consent.

## 13. Governing law

These rules are governed by the laws of Switzerland. Disputes are resolved through good-faith negotiation.

## 14. Contact

Questions: the [Arkiv Discord](https://discord.gg/arkiv).

---

<!-- source: docs/scoring-rubric.md -->

# Scoring rubric

Every submission is judged by the Arkiv team in two steps: **gates**, then **score**.

## 1. Gates (pass or fail)

A submission that fails any gate is not scored.

- [ ] **It works.** A public deployment judges can open without asking for access. This applies to every track: a library, CLI or dataset ships with a deployed app or product that shows how it is used and the value it adds.
- [ ] **It can be reproduced.** The steps and the exact query in the submission produce what the submission says.
- [ ] **Public repo under the MIT licence.**
- [ ] **`/arkiv/schema.md`** in the repo: entity types, attributes, expiration per type, the queries the app runs.
- [ ] **On-chain evidence on Tiramisu:** the wallet addresses that create the project's Arkiv entities. Judges find the entities and their creation transactions from them.
- [ ] **`/arkiv/friction.md`** in the repo.
- [ ] **Demo video**, 3 minutes or less.
- [ ] **Every required question** on the Devfolio project form answered (see the [checklist](submission-checklist.md)).
- [ ] **At least one track** chosen on Devfolio: a CROPS pillar or Best Indian Use Case.
- [ ] **Built between 9 and 18 October 2026.** The Arkiv integration and the core logic are new. Pre-existing work is disclosed with the baseline commit SHA and a list of reused components.
- [ ] **Evidence that survives expiry.** If Arkiv entities expire before judging, judges verify their creation transactions on the explorer and review the demo video.

**Not eligible:** the SDK installed but never queried · a Postgres app with an Arkiv logo · private keys, secrets, or real personal data stored in Arkiv in plaintext or hashed.

## 2. Score (100 points)

Four criteria, **25 points each**. Each is scored 0 to 5 and weighted: `points = 25 × (score / 5)`.

A project can enter more than one track. The first criterion depends on the track: "Why this pillar?" for a CROPS pillar, "Why India?" for Best Indian Use Case. It is scored once for each track the project enters; the other three criteria are scored once. A project's **track total** is the sum of its points for that first criterion in that track and for the other three criteria.

| Score | Meaning |
|---|---|
| 0 | Absent |
| 1 | A slogan with no substance |
| 2 | Mentioned, but generic |
| 3 | Solid and specific to this project |
| 4 | Good: thoughtful and clearly reasoned |
| 5 | Excellent: specific enough that another builder could follow it |

### Why this pillar? · 25 (CROPS tracks)

The problem side. Who is harmed today if this data is censored, shut down, leaked or forged, and does the project actually help them?

| 1 | 3 | 5 |
|---|---|---|
| The pillar is named, but no affected user or problem is identified | A real user with a real problem, and the pillar is why today's solution fails them | Names who is censored, exposed or misled today, and what changes for them from day one |

What each pillar asks for:

- **Censorship Resistance:** someone outside the team can read and query the data from Arkiv without the team's backend.
- **Open Source:** another team can build on the dataset or tool without asking permission, from a documented data contract.
- **Privacy:** what is visible on the explorer exposes no personal data; few attributes, encrypted or hashed payloads, expiry the user controls.
- **Security:** the app shows or filters Arkiv entities by their on-chain creator (`$creator`), not by a field anyone can write.

### Why India? · 25 (Best Indian Use Case)

Replaces "Why this pillar?" for this track. It does not need to follow a CROPS pillar. Who in India uses it, and what real problem does it solve for them?

| 1 | 3 | 5 |
|---|---|---|
| India is named, but no user or problem is identified | A real group of users in India with a real problem the app addresses | Names who in India uses it and what changes for them, and the app works for them today |

### Why Arkiv? · 25

The solution side. What breaks on a database an operator controls, on IPFS, a subgraph or your own API?

| 1 | 3 | 5 |
|---|---|---|
| "It's on-chain" is the whole argument | Names at least one property the project loses without Arkiv | The project falls apart without the Arkiv property it relies on, and it says what deliberately stays off Arkiv |

### How you use Arkiv · 25

**We judge how and why you use a feature, not how many you use.** We check usage on chain and in the code; a feature claimed but not found counts against you.

| Feature | Use that scores |
|---|---|
| Attributes vs payload | What you query lives in typed attributes (numbers where you need ranges); the rest in the payload |
| Queries | Compound predicates, ranges, `createdBy()` / `ownedBy()`, cursor pagination |
| Entity Expiration | Lifetimes that differ per entity type and follow product logic |
| Lifetime Extension | `extendEntity` as a lease renewed by activity |
| Creation flags | For example, permissionless extension so a community can keep data alive |
| `$creator` / `$owner` | Verifiable authorship surfaced in the UX; ownership transfer |
| WebSocket entity events | `watchEntityEvents` over a WebSocket transport (no `fromBlock`, which forces polling); the UI reacts without a refresh loop |
| Batch writes | Atomic batches when several writes must land together |

| 1 | 3 | 5 |
|---|---|---|
| A blob in the payload read by key, or features added for show | The features used are correct and tied to the product | Every feature used changes something the user sees, and the team explains why it chose it. One feature used this way can score 5 |

### Friction report · 25

`/arkiv/friction.md`: what got in your way while building with Arkiv.

| 1 | 3 | 5 |
|---|---|---|
| Praise, or "everything was great" | Real issues, or tested paths that worked, each with the surface involved | Each issue has expected vs actual, versions and steps to reproduce, and points at what would fix it. A smooth integration documented with the same rigour (what you tested, what you expected, what happened) scores the same. Invented complaints score 0 |

## 3. Ranking and prizes

- Each total is the average of the judges' totals, unrounded.
- **Minimum score:** 50/100 to win.
- **One prize per team.** A team that has already won is skipped, and the prize goes to the next eligible team.
- **Best Indian Use Case** is allocated first: the highest track total in that track, from a team with at least one member of Indian nationality. That team cannot also win a Global prize.
- **Global prizes (one per pillar):** each pillar ranks the projects that entered it by their track total. If one team tops more than one pillar, it receives the pillar where its track total is highest (ties: in the order Censorship Resistance, Open Source, Privacy, Security), and the other pillars go to their next team.
- **No eligible project for a Global prize:** it goes to the highest-ranked project that has not won, ranked by its highest track total.
- **Best Indian Use Case** only goes to a team with at least one member of Indian nationality. If no such team reaches the minimum score, it is not awarded.
- **Ties:** higher "Why Arkiv?" wins, then higher "How you use Arkiv", then the earlier submission timestamp.
- Judges with a personal or professional connection to a team disclose it and recuse themselves from that entry.
- Judges' decisions are final.

---

<!-- source: docs/submission-checklist.md -->

# Submission checklist

Everything happens on Devfolio, in two moments: when you **register** and when you **submit** your project. Questions marked * are required.

## 1. When you register (each person)

Devfolio asks for your name, email and GitHub, plus:

- Telegram handle (we use it to reach you during the challenge)
- Country of residence (statistics only, it does not affect eligibility)
- Does any team member hold Indian nationality? (to compete for Best Indian Use Case you need at least one; KYC for that prize is done with that person)
- Builder communities you are part of
- Background (Web2, Web3, Databases, Other) and whether you had used Arkiv before
- How you heard about the challenge
- Optional: whether you plan to attend Devcon 8 in Mumbai (not required to win)
- **USDC payout wallet:** an EVM address. It can differ from the wallets your app uses.
- Acknowledgement that winners complete KYC before payout
- Consent to Arkiv and Devfolio using your contact details for this challenge

## 2. When you submit (once per team)

### In your repo

- [ ] Public, MIT licence, setup instructions in the README
- [ ] `/arkiv/schema.md`: entity types, attributes, expiration per type, the queries your app runs
- [ ] `/arkiv/friction.md`: for each Arkiv surface you used, expected vs actual, versions and steps to reproduce

### On the Devfolio project form

The standard fields: project name, tagline, project media, project links (your repo and a demo video of 3 minutes or less), builders, **The problem it solves** \* and **Challenges I ran into** \*, and **tracks**: pick every track you compete in, a CROPS pillar (Censorship Resistance, Open Source, Privacy, Security) or Best Indian Use Case.

Then our questions. Your answers are private: only organizers and judges see them. Files in your repo, including `/arkiv/schema.md` and `/arkiv/friction.md`, are public.

1. **Live app URL** \* Where judges can try your project right now.
2. **Does any team member hold Indian nationality?** \*
3. **Why Arkiv?** \* What would break if you used Postgres, IPFS, a subgraph or your own API instead? Why did you choose Arkiv, and which advantages do you get only from using it?
4. **How do you use Arkiv?** \* For each Arkiv feature you use, tell us how and why you use it, with a link to the code.
5. **Friction report: link to `/arkiv/friction.md`** \* A GitHub link to the file. For each issue, cover what you expected, what actually happened, the versions you used, and steps to reproduce.
6. **Wallet addresses that create your Arkiv entities** \* List each address and the role it plays in your app.
7. **Link to `/arkiv/schema.md`** \* A GitHub link to the file in your repo.
8. **How can judges reproduce your Arkiv usage?** \* Step-by-step instructions judges can follow to see how your project uses Arkiv.
9. **Pre-existing work you reused** \* Anything you made before 9 October and reused here, like starter code, templates or parts of past projects. Write "None" if you built everything during the hackathon.
10. **Arkiv surfaces you used** \* TypeScript SDK, Direct JSON-RPC, WebSocket events, Docs, Hub, Faucet, Access keys, Block Explorer, Data Explorer, Arkiv MCP, Arkiv skills, Arkiv Plugin, Other.
11. If you selected Other, name it
12. **How long after you started did you write your first Arkiv entity?** \* 2 hours or less · 2 to 24 hours · More than a day
13. **Which LLMs did you use?** \* Write "None" if you didn't use any.
14. **What is the one thing Arkiv should improve first?** \*
15. **Open to a 20-minute feedback call with the Arkiv team?** \*
16. **This is our team's work, built between 9 and 18 October. Any pre-existing or third-party work is disclosed.** \*
17. **Our repo is public under the MIT licence, and every link is accessible to judges.** \*
18. I plan to attend Devcon 8 in Mumbai (optional, not required to win)

Never paste private keys, seed phrases, access key secrets or RPC URLs with credentials into any answer.

## At the deadline

At the deadline we record your repo's commit SHA, and that is what we judge. A force-push that rewrites history after the deadline disqualifies the entry. Keep your deployment up until winners are announced on 23 October. You can edit your Devfolio submission until it closes.

---

<!-- source: AGENTS.md -->

# AGENTS.md: Arkiv: Global Tour Stop

Context for AI coding agents (Claude Code, Cursor, Copilot, Codex…) helping a builder in this challenge.

## What this repo is

The official rules and resources for a 10-day online build on Arkiv, the Web3 database (9 to 18 October 2026), themed on CROPS (censorship resistant, open source, private, secure), plus a Best Indian Use Case track for real-world applications people in India can use. This repository is the only canonical source of the rules, rubric and submission checklist. If the Devfolio page (https://arkiv.devfolio.co/overview) differs, this repository applies. Rules have been frozen since 9 October 2026.

| Question | File |
|---|---|
| What is the challenge? | [README.md](README.md) |
| Rules, eligibility, prizes, KYC | [RULES.md](RULES.md) |
| How is it scored? | [docs/scoring-rubric.md](docs/scoring-rubric.md) |
| What do I submit? | [docs/submission-checklist.md](docs/submission-checklist.md) |

## Key facts

- One or more tracks per project: the four CROPS pillars and Best Indian Use Case; one prize per team. Same rubric for all: Why this pillar? or Why India? 25 (scored per track entered) · Why Arkiv? 25 · How you use Arkiv 25 · Friction report 25.
- Gates before scoring: working deployment, reproducible, public MIT repo, `/arkiv/schema.md`, `/arkiv/friction.md`, at least one track on Devfolio, every required question on the Devfolio project form, the wallet addresses that create your Arkiv entities on Tiramisu, demo video ≤ 3 min, built 9 to 18 October.
- Attending Devcon is not required to win. Winners get a Devcon 8 ticket; USDC is paid after KYC.
- Network: Tiramisu testnet, chain ID `7738577`, RPC `https://rpc.tiramisu.db-chain.testnet.arkiv.network`, WebSocket `wss://rpc.tiramisu.db-chain.testnet.arkiv.network`.
- SDK: `@arkiv-network/sdk` 0.8.x. Docs: https://docs.arkiv.network

## Hard rules for the SDK (0.8)

Do not reinvent these; check the installed package when unsure.

- **Queries:** `client.select().where(...).limit(...).fetch()`, plus `ownedBy()`, `createdBy()`, `cursor()`. There is **no server-side ordering** (no `orderBy`); sort on the client, or range-filter on `$createdAt`. Max 200 results per page.
- **Ranges only on numeric attributes.** Store timestamps, amounts and scores as numbers.
- **The payload is not queryable.** Anything you filter on goes in attributes.
- **Everything expires.** Set an expiry per entity type. Lifetime Extension (`extendEntity`) **sets** a new expiry; it reverts if the new one is not later.
- **Trust comes from `$creator`** (immutable). `$owner` is mutable and controls writes.
- **Live updates:** `watchEntityEvents` opens a real socket only with a WebSocket transport and no `fromBlock`; over HTTP it silently polls.
- All Arkiv entities are publicly readable. Privacy means encrypting or hashing the payload, never a private toggle.
- Never put private keys, secrets or real personal data (plaintext or hashed) in an Arkiv entity. Use synthetic data.

## Vocabulary

Call the expiry primitive "Entity Expiration" and its renewal "Lifetime Extension". Describe Arkiv as "the Web3 database" and its data items as "Arkiv entities". Never say TTL.

## What to ask the builder before coding

1. Which track? For a CROPS pillar, who is harmed today without this project? For Best Indian Use Case, who in India uses it?
2. Why does it need Arkiv instead of Postgres, IPFS, a subgraph or an API, and what stays off Arkiv?
3. A funded test wallet on Tiramisu (never paste its private key into chat or code; use an env var).
4. The product's entity types and the 2 or 3 questions the app must answer, so the schema is designed before the UI.

Write `/arkiv/schema.md` and keep `/arkiv/friction.md` updated while building: both are required. Before the deadline, help the builder draft answers to the Devfolio form questions listed in `docs/submission-checklist.md`.
