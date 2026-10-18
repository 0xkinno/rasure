# RASURE_BUILD_INSTRUCTION.md

Build instruction for the coding agent. Event: **Arkiv: Global Tour Stop** (Devfolio). Builder: **0xkinno**.

Read this whole file before writing code. Then read `TASK.md` and work it top to bottom, ticking `[x]`
as each item is truly done (verified, committed). This file merges `ADVANCED_BUILD_STRATEGY.md` (wins
on any conflict), `NEW_INSTRUCTION.md` and `Enhanced_buildrules.md` into one plan for this event.

---

## 0. NON-NEGOTIABLES (read twice)

1. **Full scope, no simplification.** Every item in TASK.md is required and is sequenced by
   dependency, not by clock. Do not drop, stub or shrink any item. If an item is genuinely blocked
   (for example the RPC is down), record the blocker in PROGRESS.md, continue with the next
   unblocked item, then return to it. Submission timing is handled by Kinnoski.
2. **Author:** every commit and push is authored and committed by `0xkinno` only. Before the first
   commit run `KINNO_EMAIL=<email> sh scripts/setup-git.sh`. Never add `Co-Authored-By`, never add a
   Claude session trailer, never write "Generated with Claude Code". The repo ships
   `.claude/settings.json` (attribution off), `scripts/hooks/commit-msg` (strips trailers),
   `scripts/hooks/pre-commit` (refuses any other author) and
   `.github/workflows/no-claude-attribution.yml` (server-side gate for cloud sessions). Run
   `scripts/setup-git.sh` again in every new cloud session before committing.
3. **No competitor anywhere public.** Sample repos are cloned into `reference/` (gitignored). No
   competitor name, repo, sample, screenshot or phrase may appear in committed code, UI, docs, README,
   friction report, schema or video. Put every sample project name in `reference/banned.txt`;
   `scripts/check-copy.mjs` fails CI if any appears in tracked files.
4. **No smart contract.** Tiramisu is an Arkiv database chain. Every Arkiv write (`createEntity`,
   `executeBatch`, `extendEntity`, `deleteEntity`) **is** a real signed transaction to the Arkiv
   system address `0x4400000000000000000000000000000000000044`, visible on
   `https://tiramisu.explorer.arkiv.network`. That is our on-chain flow. Do not try to deploy a
   Solidity contract (other builders observed contract creation rejected on Tiramisu; record our own
   observation in friction.md only if we test it). No Arc, no Circle explorer: they do not apply here.
5. **No real personal data on Arkiv, plaintext or hashed.** All demo content is synthetic and every
   synthetic place string starts with `SYN-`. Never store keys, seeds or secrets in any entity.
6. **No silent fallback.** If the RPC rate-limits (HTTP 429 `ANON_COST_LIMITED`), the UI says so with
   the retry time. Fixtures are only used in tests and are labelled.
7. **House style:** no emoji, no em dashes or en dashes in any doc or UI string. No hype words
   (revolutionary, seamless, cutting-edge, world-class, military-grade, zero-trust, unbreakable).
   `scripts/check-copy.mjs` enforces it.
8. **Never claim what the deployed app cannot show.** Numbers come from `docs/FACTS.json`, generated
   by `scripts/facts.ts` from real runs. Never type a headline number by hand.
9. **Ask Kinnoski before:** deleting anything, force-pushing, deploying over an existing URL,
   publishing posts, submitting the form.

---

## 1. THE EVENT IN ONE SCREEN (Gate 0)

Canonical rules: `https://github.com/Arkiv-Network/global-tour-stop-pre-devcon` (RULES.md,
docs/scoring-rubric.md, docs/submission-checklist.md, AGENTS.md). Copy their relevant text verbatim
into `RULES_EXTRACT.md` as your first file.

- **Tracks we enter:** **Privacy** (primary), **Security**, **Open Source**, **Censorship
  Resistance**. Each gets its own fully reasoned "Why this pillar?" section. A team can win only one
  prize, so entering all four only adds chances. **Not** Best Indian Use
  Case: it requires a team member of Indian nationality, and our team has none.
- **Score:** four criteria x 25. (1) Why this pillar? scored per track. (2) Why Arkiv? (3) How you use
  Arkiv: "how and why, not how many; a feature claimed but not found counts against you". (4) Friction
  report: expected vs actual, versions, repro steps, what would fix it. Tie-break: Why Arkiv, then How
  you use Arkiv, then earlier submission time. So **submit early**.
- **Privacy pillar, exact ask:** "what is visible on the explorer exposes no personal data; few
  attributes, encrypted or hashed payloads, expiry the user controls."
- **Gates:** public deployment openable without access; reproducible steps + exact query; public MIT
  repo; `/arkiv/schema.md`; `/arkiv/friction.md`; creator wallet addresses; video <= 3:00; every
  required Devfolio question; built 9 to 18 Oct; evidence that survives expiry (creation tx hashes).
- **Network:** Tiramisu, chain id `7738577`. HTTP `https://rpc.tiramisu.db-chain.testnet.arkiv.network`.
  WS `wss://rpc.tiramisu.db-chain.testnet.arkiv.network`. Explorer
  `https://tiramisu.explorer.arkiv.network`. Faucet `https://hub.arkiv.network/faucet`. Access keys
  `https://hub.arkiv.network` (header `X-API-KEY`, or appended to the RPC path). SDK
  `@arkiv-network/sdk@0.8.1` (pin exactly). Docs `https://docs.arkiv.network`.
- **Vocabulary:** say "Entity Expiration", "Lifetime Extension", "Arkiv entities", "the Web3
  database". Never say "TTL".
- **Anonymous RPC budget:** each `arkiv_query` costs 100 of 10,000 units per hour per IP (about 100
  queries/hour). Design every page for 1 to 3 queries. Server-side read relay uses the access key.

---

## 2. THE IDEA

### 2.1 Five-line pitch (Gate 3)

```text
NAME:       RASURE   (archival term: the scraping-out of writing from a manuscript)
MOMENT:     Meera (fictional) runs night dispatch for a survivor safe-transport network in Pune.
            At 23:40 a volunteer driver's phone is taken by the abuser of the woman she just drove.
            Everything that phone can read about past pickups is now in the wrong hands.
DISCOVERY:  everyone assumes Entity Expiration erases a record; in reality every payload travels
            uncompressed in its creation transaction and stays recoverable forever, and the node
            answers historical queries for expired entities. Expiry hides. It does not forget.
THESIS:     Rasure binds each record's Entity Expiration to the destruction of the only key that
            can read it: a one-way key ratchet erases yesterday's key on every phone at the same
            block that Arkiv expires yesterday's records. A seized phone reads tonight, never last week.
PROOF:      Seizure Drill on real Tiramisu history. Same rides, three designs. Plaintext: N/N past
            rides exposed. One static key: N/N exposed. Rasure: only the current epoch, 0 of the
            past. Plus a public expiry audit of other Tiramisu entities (aggregate, anonymous).
```

**One-line pitch (README, Devfolio tagline, video 0:00):**
> Rasure is a ride board for survivor safe-transport volunteers that truly forgets: a phone taken
> tonight cannot read last night's pickups, even with the whole chain in hand.

**Descriptor under the name:** *The dispatch board that forgets on schedule.*

**20-second judge formula (landing hero + video open):**
- 0 to 5 s, pain: "On Arkiv, an expired record is gone from the board, not from the chain."
- 5 to 10 s, product: "Rasure lets a shelter's volunteers share live pickups that become unreadable
  on every phone the moment they expire."
- 10 to 15 s, proof: "Seize a phone, replay all history: plaintext and static-key boards leak every
  past ride; Rasure leaks none." (numbers from FACTS.json)
- 15 to 20 s, why special: "Arkiv decides when a record dies. The ratchet makes it stay dead."

### 2.2 Why this wins (the judge's view)

- Every visible Privacy entry treats "encrypt the payload" or "short expiry" as the privacy answer.
  Rasure shows, with a reproducible script, that expiry alone is not erasure on Arkiv and that a
  single static key turns one lost phone into a full history leak. Then it fixes both, measurably.
- The rubric literally lists "expiry the user controls" as a privacy property. Rasure is the only
  design that makes that property true end to end, and it says so with evidence. That earns a 5 on
  Why this pillar, Why Arkiv and Friction (the discovery is itself a top friction finding).
- Expiry is not decoration here: the expiry block **is** the key-destruction block (invariant I1).
  Remove Arkiv's Entity Expiration and the board keeps showing dead rides whose keys are gone.
- Security pillar: rides count only when created by a trusted dispatcher wallet (`$creator`), an
  assignment counts only when created by that ride's dispatcher, and a forged ride is shown ignored.
- Open Source pillar: `@rasure/core` is a small library any Arkiv app can use for forward-secret
  payloads, plus a documented data contract and a one-file reader.

### 2.3 Human, moment, sources (Gate 1, `MOMENT.md`)

Persona (fictional, labelled so in UI and README): **Meera Kulkarni**, night dispatcher for a
network of volunteer drivers that takes survivors of domestic violence from a pickup landmark to a
shelter or a One Stop Centre. Pune, India. The same model applies to shelter transport anywhere.

The clock: rides are posted between 20:00 and 02:00 for pickups within hours. The cost: one exposed
pickup history can reveal where a survivor was taken.

Sources: **the agent must open each link, confirm the figure, and quote at most one short phrase per
source.** If a figure cannot be confirmed, drop it. Candidate sources to verify:

| Claim to verify | Where to look |
|---|---|
| NFHS-5 (2019 to 21): share of ever-married women 18 to 49 who experienced spousal violence (about 29%) | NFHS-5 India fact sheet / report, `rchiips.org/nfhs` |
| UNODC and UN Women femicide report (2024): women and girls killed by intimate partners or family members in 2023 (about 51,100) | `unodc.org` / `unwomen.org` press release, Nov 2024 |
| VAWA confidentiality: US victim-service providers may not disclose personally identifying information (34 U.S.C. 12291(b)(2)) | `law.cornell.edu/uscode/text/34/12291` |
| HUD rule: victim-service providers are prohibited from entering client PII into shared HMIS databases | HUD Exchange HMIS + VAWA guidance |
| Technology-facilitated abuse: abusers monitor phones; safety planning guidance for advocates | NNEDV Safety Net, `techsafety.org` |
| India: One Stop Centres (Sakhi) and 181 Women Helpline under Mission Shakti | `wcd.gov.in` |

The legal anchor is the strongest framing: the law already tells shelters that survivor data must
not sit in a shared database. Rasure is a shared board that holds nothing readable after it matters.

Theme verbs to measure (A6): **"expose as little user data as possible"** becomes three generated
numbers: public attributes per entity (target 6 or fewer, none naming a person or place), past
records exposed after seizure (target 0), and plaintext bytes in any Rasure creation transaction
(target 0).

Assumption vs reality: "Everyone building on Arkiv assumes an expired entity is gone. In reality its
payload lives in the creation transaction forever, and history queries return it inside the node's
retention window."

---

## 3. DISCOVERY (Gate 2, `DISCOVERY.md`). DO THIS BEFORE ANY UI.

### D1. Payloads live in calldata (read from SDK 0.8.1 source, confirm live)

Source evidence already found in `@arkiv-network/sdk@0.8.1`:
- `src/attr/attributes.ts`: the payload travels as the `$payload` system attribute, raw bytes.
- `src/entity/operations.ts`: `execute((uint8 operation, bytes operationData)[] ops)`, create =
  `(uint128 salt, uint64 expiresAt, uint64 minLifetime, uint8 creationFlags, (bytes32 name, uint8 typeId, bytes value)[] attributes)`.
- `src/consts.ts`: target `0x4400000000000000000000000000000000000044`.
- The SDK ships a brotli helper (`src/utils/compression.ts`) but it is **not** used on the write path.

`packages/core/src/calldata.ts` (already written, unit-tested) decodes any create from `tx.input`.

**Experiment `scripts/discovery/d1-calldata.ts`** (funded probe wallet, synthetic text only):
1. `createEntity` with payload `SYN-probe-<timestamp>`, `contentType: "text/plain"`,
   `expires: ExpirationTime.fromBlocks(30n)` (about 60 s), `attributes: { project: "rasure/probe" }`.
2. Record tx hash, entity key, `expiresAt`.
3. Wait until head > expiresAt. Confirm `getEntity(key)` throws `NoEntityFoundError`.
4. `publicClient.getTransaction({ hash })`, run `recoverCreates(tx.input)`, print the payload.
5. Write the full output to `proof/results/d1-<date>.json`. Expected: payload recovered byte for byte
   after expiry. If not, mark D1 UNKNOWN and tell Kinnoski before continuing.

### D2. Historical queries return expired entities

**Experiment `scripts/discovery/d2-atblock.ts`:** for the D1 entity, query
`select({key,creator,expiresAt,attributes,payload}).where([eq("$key", key)])` with
`.atBlock(createdBlock + 1n)` after expiry. Record whether the payload comes back, and the oldest
block the node still answers (binary search a few points; an out-of-range block throws a `QueryError`
of kind `"block"`). Record retention window in friction.md. Expected (other builders reported it):
payload returned while inside retention.

### D3. Delete test

"If Arkiv Entity Expiration is removed, the board shows rides whose keys every phone has destroyed,
and the test `board hides records whose key is dead` fails. If the ratchet is removed, `seizure
drill: ratchet` fails because history becomes readable."

### D4. Textbook check

Hash ratchets and forward secrecy are known (Signal's symmetric ratchet). Never headline "forward
secrecy" as our invention. The headline is the **discovery on Arkiv** plus the **binding of Entity
Expiration to key death**, which no Arkiv app does.

---

## 4. THE MECHANISM

### 4.1 Key schedule (in `packages/core/src/ratchet.ts`, done)

- Circle = one dispatch network. Random 16-byte `circle` id (never derived from a name).
- `k_{e+1} = HKDF-SHA256(k_e, salt "rasure/v1", info "ratchet")`. `encKey_e`, `idxKey_e` derived
  with info `"enc"` and `"idx"`.
- Epoch from block: `epoch = (block - genesisBlock) / epochBlocks`. Demo circles: 300 blocks (10 min).
  Production: 10,800 blocks (6 h).
- **keyDeathBlock(e) = epochStart(e + 2)**: one grace epoch so a ride posted late can still be served.
- Every device runs `advance(keyring, head)` on load, on every new block tick (from the WebSocket),
  and before every read. Destroyed epochs are logged in the UI: "Key for epoch 412 erased on this phone".
- Keyring persistence: IndexedDB, one record per circle, overwritten on every advance (the old key
  bytes are not kept anywhere). Never localStorage, never a cookie, never a URL after joining.

### 4.2 Payloads (`seal.ts`, done)

AES-256-GCM via WebCrypto. AAD = `rasure/v1|circle|epoch|type`. Padded to 256/512/1024/2048 bytes.
Content type `application/vnd.rasure.sealed.v1`.

### 4.3 Blind index (`blind.ts`, done)

`tag = HMAC(idxKey_e, "zone:" + zone)[0..32 hex]`. Members filter by zone, outsiders see a random
string that changes every epoch.

### 4.4 Entity model (write this table into `/arkiv/schema.md` verbatim)

All entities: `project = "rasure/v1"`, `v = i32(1)`, `circle = str(id)`.

| Type | Created by | Attributes (public) | Payload (sealed) | Entity Expiration | Flags |
|---|---|---|---|---|---|
| `circle` | dispatcher | `type`, `circle`, `epoch_blocks` (u64), `genesis` (u64) | empty | 30 days, renewed by the dispatcher on every login (Lifetime Extension as a lease) | none (owner-only extension: a network that stops operating disappears) |
| `ride` | dispatcher | `type`, `circle`, `epoch` (u64), `tag` (str) | landmark code, window, seats, note | `atBlock(keyDeathBlock(epoch))` | `readonly` |
| `claim` | volunteer | `type`, `circle`, `epoch`, `ref` (key of ride) | ETA, vehicle kind (no plate) | same block as its ride | `readonly` |
| `assign` | dispatcher of that ride | `type`, `circle`, `epoch`, `ref` (key of claim's ride) | which claim, short instruction | same block as its ride | `readonly` |
| `closeout` | dispatcher of that ride | `type`, `circle`, `epoch`, `ref` | outcome code | same block as its ride | `readonly` |

`epoch_blocks` and `genesis` are already in `PUBLIC_ATTRIBUTE_ALLOWLIST` (circle entity only).

Why no `permissionlessExtension` on rides: anyone extending a ride past its key death would only
keep ciphertext nobody can read, so we refuse the option and say why in schema.md. This is a
deliberate privacy choice: **the user (dispatcher) controls expiry, and no one else can stretch it.**
The `circle` entity is the one lease.

### 4.5 Invariants (name them in code comments, tests and README)

| Id | Invariant | Enforced in | Test |
|---|---|---|---|
| I1 | A sealed entity's `expiresAt` equals the key-death block of its epoch | `writes.ts` builds `expires` only from `keyDeathBlock` | unit + live check in `facts.ts` |
| I2 | A device never holds a chain key past its death block | `advance()` | `ratchet` tests |
| I3 | No Rasure entity carries a public attribute outside the allowlist | `auditAttributes()` + leak audit script | unit + live audit |
| I4 | A ride counts only if its `$creator` is a trusted dispatcher | `partitionRides()` | unit + forged ride on chain |
| I5 | A ciphertext opens only in its own circle, epoch and type | AAD in `seal.ts` | unit |
| I6 | No Rasure creation transaction contains plaintext | `seal()` is the only payload path | live: decode every Rasure tx and test UTF-8/JSON |
| I7 | An assignment counts only if the ride's dispatcher created it | `rideStatus()` | unit + forged assign on chain |
| I8 | A seized phone cannot open any record from an epoch before its newest key | no backward derivation | seizure drill |

### 4.6 Queries (`packages/core/src/queries.ts`, write it; list every one in schema.md with the
exact predicate string)

```ts
import { eq, or, and } from "@arkiv-network/sdk/query";
import { str, u64, key } from "@arkiv-network/sdk/attr";
// Q1 open board for this epoch and the grace epoch, trusted dispatchers only
//   project = 'rasure/v1' AND circle = C AND type = 'ride' AND (epoch = e OR epoch = e-1)
//   AND ($creator = D1 OR $creator = D2)
// Q2 board filtered by zone: Q1 AND tag = zoneTag(k_e, zone)
// Q3 everything pointing at a ride: project AND circle AND ref = key(R)
// Q4 forged rides (Security panel): project AND circle AND type='ride' AND NOT ($creator = D1 OR ...)
// Q5 my claims: project AND circle AND type='claim' with .createdBy(me)
// Q6 circle anchor: project AND type='circle' AND circle = C with .createdBy(dispatcher)
// Q7 leak audit: project = 'rasure/v1' (cursor-paginated, all pages, pinned with .atBlock(head))
// Q8 history replay for the drill: Q7 at .atBlock(past) plus getTransaction for each creation tx
```

Use `client.select({ key: true, creator: true, owner: true, expiresAt: true, attributes: true, payload: true })`
only where the payload is needed; the board list does not need payloads until a card opens.

### 4.7 Live updates

`watchEntityEvents` on a `webSocket()` transport, **no `fromBlock`**. Events carry no attributes, so
refetch only when the event key is on screen or the event creator is a trusted dispatcher. Use the
same socket's new-block heads to drive `advance()` (key death happens live, on screen).

### 4.8 Wallet writes (`apps/web/lib/writes.ts`)

```ts
import { createWalletClient, createPublicClient, ExpirationTime } from "@arkiv-network/sdk";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { u64, i32, key } from "@arkiv-network/sdk/attr";
import { custom, http, webSocket } from "viem";

export const reader = createPublicClient({ chain: tiramisu, transport: http(RPC_URL, { retryCount: 0 }) });
export function walletFor(provider: EIP1193Provider, account: `0x${string}`) {
  return createWalletClient({ chain: tiramisu, transport: custom(provider), account });
}

// Post a ride: one transaction, wallet popup, real tx on the explorer.
export async function postRide(w, ring, clock, circle, body, zone) {
  const head = await reader.getBlockNumber({ cacheTime: 0 });
  const { state } = advance(ring, head);
  const { epoch, chainKey } = currentKey(state);
  const payload = await seal(chainKey, { circle, epoch, type: "ride" }, body);
  return w.createEntity({
    attributes: { project: "rasure/v1", v: i32(1), type: "ride", circle, epoch: u64(epoch), tag: zoneTag(chainKey, zone) },
    payload, contentType: "application/vnd.rasure.sealed.v1",
    expires: ExpirationTime.atBlock(keyDeathBlock(clock, epoch)),   // I1
    flags: { readonly: true },
  });
}
// Assign + closeout use executeBatch when they must land together
// (e.g. assign one claim and close a previous ride in one transaction).
```

SDK README notes (0.8.x): pass `select({...})` inline or `as const` (a selection stored in a plain
variable widens to `{}` and breaks types); walk all pages with
`for await (const e of client.select({ key: true }).where(...))` or `result.hasNextPage()` and
`result.next()`; `ExpirationTime` and `jsonToPayload` are exported from the package root (also
`@arkiv-network/sdk/utils`); bare strings become `str`, use `u64()`, `i32()`, `key()` from
`@arkiv-network/sdk/attr` for typed values. Debug with `DEBUG=arkiv:*`.

Verify every signature against the installed SDK types before use (`node_modules/@arkiv-network/sdk/src`).
`ExpirationTime.atBlock` must still be in the future at inclusion; guard with a margin and refuse to
post into an epoch with fewer than 20 blocks left before key death.

---

## 5. ARCHITECTURE

```
rasure/
  packages/core/        forward-secret payloads, ratchet, blind index, calldata recovery, drill, trust rules (DONE, tested)
  apps/web/             Next.js 15 App Router, TypeScript, Framer Motion, wagmi-free custom EIP-6963 wallet modal
    app/(site)/page.tsx           landing (magazine editorial)
    app/board/page.tsx            dispatcher + volunteer board (live)
    app/drill/page.tsx            Seizure Drill (no wallet needed)
    app/explorer-view/page.tsx    "What a stranger sees" (no wallet needed)
    app/proof/page.tsx            FACTS, invariants, tx links, exact queries + curl
    app/judge/page.tsx            60-second / 3-minute / 10-minute walk
    app/join/page.tsx             join a circle from a QR or link fragment
    app/api/drip/route.ts         sends 0.02 test GLM to a fresh address (rate-limited, server key)
    app/api/rpc/route.ts          read-only relay: forwards only arkiv_query / eth_* reads, adds X-API-KEY, used only after a 429
    app/api/facts/route.ts        serves docs/FACTS.json
  scripts/
    discovery/d1-calldata.ts, d2-atblock.ts
    seed.ts                       demo circle, 3 dispatchers? no: 1 dispatcher + 2 volunteers + 1 forger, rides across 6+ epochs
    drill-run.ts                  builds the three-policy history on chain and runs the drill
    leak-audit.ts                 I3 + I6 over every rasure/v1 entity and its creation tx
    expiry-audit.ts               wild set: public Tiramisu entities that expired recently (aggregate only)
    facts.ts                      writes docs/FACTS.json from proof/results/*.json
    check-copy.mjs                house style + banned names + secrets scan
  arkiv/schema.md, arkiv/friction.md, arkiv/wallets.md, arkiv/evidence.md
  proof/results/*.json            raw outputs, dated
  docs/FACTS.json
  README.md  RULES_EXTRACT.md  MOMENT.md  DISCOVERY.md  THESIS.md  PROOF_PLAN.md  SDK_SURFACE.md
  PROGRESS.md  JUDGE.md  REDTEAM_LOG.md  SUBMISSION_DEVFOLIO.md  TASK.md
```

Hosting: **Vercel only** (Next.js pages + API routes). No Render needed. Root directory `apps/web`,
or a root `vercel.json` pointing at it. Server-only env vars (never `NEXT_PUBLIC_`):
`ARKIV_ACCESS_KEY`, `DRIP_PRIVATE_KEY`. Public: `NEXT_PUBLIC_RPC_HTTP`, `NEXT_PUBLIC_RPC_WS`,
`NEXT_PUBLIC_DEMO_CIRCLE`, `NEXT_PUBLIC_TRUSTED_DISPATCHERS`.

"Who signs": the user's own wallet signs every write (dispatcher, volunteer). The server signs only
the test-GLM drip, never an entity. Say this in the README.

---

## 6. PRODUCT FLOWS (what the user sees)

**F1 Dispatcher (Meera):** connect wallet, create circle (one tx), show join QR (fragment carries
circle, epoch, current chain key; warn: hand it over in person). Post ride: landmark code (select from
synthetic list `SYN-...`), zone (select), window, seats, note. Wallet popup. Card appears live on all
members' boards. When a volunteer claims, the dispatcher sees the claim, presses Assign (wallet popup).
After pickup: Close out (popup).

**F2 Volunteer:** open join link, connect wallet (or "Get test GLM" via drip), board shows rides of the
current and grace epoch, decrypted locally. Filter by zone (blind tag). Claim (popup). Sees "Assigned
to you" only when the assign entity's `$creator` is the ride's dispatcher.

**F3 Key death, live:** a strip at the top of the board: "Epoch 412 key dies in 03:12". At the death
block the strip flips: "Key for epoch 411 erased on this phone. 6 records are now unreadable to
everyone, here and on chain." Cards from that epoch dissolve (Framer Motion) and the same block marks
them expired on Arkiv. This is the signature moment.

**F4 Seizure Drill (no wallet):** "It is 23:40. A volunteer's phone is gone. The attacker also has a
full Arkiv node." Three columns: Plaintext board, One-key board, Rasure. Press **Run the seizure**:
the page loads the demo history from `proof/drill-manifest.json` (entity keys + creation tx hashes),
fetches each creation tx via `eth_getTransactionByHash`, recovers the payload with `recoverCreates`,
then tries to open it with what the seized phone holds. Rows turn red (exposed) or stay sealed.
Totals at the bottom come from the live run, and match FACTS.json. A toggle "Attacker derives
forward" shows forward derivation works and backward does not exist.

**F5 What a stranger sees (no wallet):** pick any live Rasure entity: show the raw attributes, the
raw payload hex, the creation tx input decoded by `recoverCreates`, and a verdict line: "Public
attributes: 6. Names, phones, places: none. Payload: 304 bytes of ciphertext."

**F6 Proof:** FACTS table, invariants table with test names, wallet addresses with explorer links,
every query predicate with a copyable `curl`.

**F7 Failure button:** on the board, "Post as a stranger" writes a ride from an untrusted wallet
(forger key is server-free: the judge's own wallet). It appears in "Ignored: not written by a
trusted dispatcher" with the creator address. Second failure: "Replay a ciphertext into this epoch"
(local, no tx) shows AAD refusal.

---

## 7. PROOF PLAN (Gate 4, `PROOF_PLAN.md`)

| Proof | Method | Could it come out against us? |
|---|---|---|
| D1 calldata recovery | live script, synthetic probe | yes: if the payload were not recoverable, our premise dies |
| Seizure Drill, counterfactual | same synthetic rides written three ways on chain (`policy` known only from the manifest, not an attribute): plaintext, static key, Rasure ratchet, across at least 6 epochs. Attacker = newest chain key + static key + full history | yes: a bug in the ratchet shows red rows |
| Both error directions | (a) attacker opens past records: target 0. (b) legitimate member wrongly refused a current or grace-epoch record: target 0, measured over every live record in the run | yes |
| Leak audit (I3, I6) | every `rasure/v1` entity + its creation tx: attribute allowlist, payload must fail UTF-8 JSON parse and have entropy > 7.5 bits/byte | yes |
| Expiry audit, wild set | sample public Tiramisu entities of any project that were alive at a past block and are expired now (`$expiresAt` range at `.atBlock(past)`); count how many still return a payload, and how many of those parse as readable text/JSON. Report counts only. Never print content, keys, creators or project names | yes: could show the problem is rare |
| Key-death timing | for every Rasure ride: `expiresAt == keyDeathBlock(epoch)` (I1), and measured seconds between the block and the UI dissolving the card | yes |
| Cost | gas and GLM per ride (from receipts), queries per page view | n/a |

**Misses we will publish honestly (Honest notes):**
- The current and grace epoch are readable from a seized phone by design (2 epochs at most).
- A leaked join link exposes the epoch it carries and every later one until the circle is rotated
  (Rasure ships on-chain rekey in TASK.md Phase 3; until a rekey, a leaked link stays dangerous).
- Public metadata remains: wallet addresses, timing, number of rides per epoch, padded length bucket.
- Erasure is only as good as the phone's storage; we overwrite our copy, we cannot audit the OS.
- History retention window of the node (from D2) and permanent calldata: why encryption, not expiry,
  carries confidentiality.

---

## 8. HOW WE USE ARKIV (each row must change something the user sees; link file:line in README)

| Feature | How and why | What the user sees |
|---|---|---|
| Entity Expiration per type | rides/claims/assigns die at `keyDeathBlock`; circle is a 30-day lease | cards dissolve exactly at key death; countdown strip |
| Lifetime Extension | dispatcher's login extends the circle (lease renewed by activity) | "Network active until ..." badge; a silent network vanishes |
| Creation flags | `readonly` on every sealed record; no permissionless extension (privacy choice, explained) | "Fixed since block N", "Only the dispatcher sets lifetimes" |
| Attributes vs payload | 6 or fewer public attributes; `epoch` u64 for ranges; zone only as rotating blind tag; all content sealed | stranger view proves it |
| Queries | compound predicates, `$creator` OR-lists, `NOT` for forgeries, `createdBy()`, cursor pagination pinned with `atBlock`, `$expiresAt` ranges in the audit | board, ignored panel, audit |
| `$creator` | trust for rides (I4) and assignments (I7) | "Ignored: not written by a trusted dispatcher" |
| WebSocket events | `watchEntityEvents` + block heads drive live board and key death | board updates and key dies without refresh |
| Batch writes | assign + close previous ride, or circle create + first ride, in one tx | one popup, both land or neither |
| Historical queries (`atBlock`) | the drill and the audit read the past on purpose, to prove the attack | drill rows |

`SDK_SURFACE.md`: same table plus file:line, and "Not used, so not claimed" (e.g. `changeOwnership`,
`patchEntity`, if unused).

---

## 9. UI MASTER PROMPT (sub-instruction)

**Concept: "two voices".** The human story speaks in a serif on luminous blue-white paper. The chain
speaks in a monospace on deep cobalt. Every screen makes it obvious which voice is talking. One
signal colour (acid lime) means *sealed, live, allowed*; one warning colour (vermilion) means
*exposed, refused, dead*. Nothing else is coloured. The result must read as a premium printed
report that came alive: exact, calm, expensive, and instantly legible to a judge in 5 seconds.

Design references to study for structure only (never copy assets, copy or brand): a developer
tool landing that uses a cobalt hero band with a lime accent, a tilted stack of flat illustrated
cards in the hero, a "today vs with the product" toggle diagram, and a numbered "how a call moves"
flow diagram. We adopt those four structural ideas and execute them in our own system, adding the
paper surfaces, serif editorial layer and glow that it lacks.

### 9.1 Tokens (`apps/web/app/tokens.css`)
```css
:root{
  --cobalt:#0A2FB3; --cobalt-deep:#071F7A; --cobalt-ink:#0B1A5E;
  --paper:#F4F7FC; --paper-2:#E9EFF8; --card:#FBFCFE; --rule:#CBD6EA;
  --ink:#0B1626; --ink-2:#3A4A60; --on-cobalt:#EAF0FF; --on-cobalt-2:#AFC0F2;
  --signal:#D7F25A;            /* sealed, live, allowed, primary CTA */
  --signal-glow:rgba(215,242,90,.45);
  --exposed:#F0533A;           /* exposed, refused, key dead */
  --radius:12px; --radius-sm:8px;
  --shadow-card:0 1px 0 rgba(11,22,38,.05),0 18px 44px -22px rgba(7,31,122,.35);
  --hard-shadow:4px 4px 0 var(--cobalt-ink); /* flat offset shadow on illustrated cards and CTAs */
}
body{background:var(--paper);color:var(--ink)}
```
Paper grain: inline SVG `feTurbulence` noise at 3 to 4% opacity, fixed, `pointer-events:none`. Cobalt
bands get a very faint blueprint grid (1 px lines every 32 px at 6% opacity).

### 9.2 Type (self-hosted via `next/font`, three families, each with one job)
- **Story voice:** `Instrument Serif` (section headlines on paper, pull quotes, Meera's timeline).
- **Chain voice:** `Geist Mono` weight 600 to 700 (hero headline on cobalt, nav, labels, chips,
  block numbers, hashes, numerals in the drill).
- **Reading:** `Geist` 400/500 (body, forms, buttons).
If Kinnoski supplies licensed font files, put them in `apps/web/public/fonts/` and swap only the
three CSS variables. Scale: hero 76/80 px desktop, 40/44 px mobile, tracking -0.02em; paper
section headlines 52 px serif; body 17/28; mono labels 13 px, letter-spacing .02em.

### 9.3 Navbar
Cobalt bar, sticky, full width, content max 1200 px. Left: Rasure mark (a small square seal with a
diagonal scrape) + wordmark `rasure` in mono with `.` in lime. Centre: Board, Drill, Stranger view,
Proof, Judges. Each item is a **square capsule** (radius 10 px). The active item: lime 1 px outline,
lime text, outer glow `0 0 0 1px var(--signal), 0 0 22px var(--signal-glow)`, moved between items
with Framer Motion `layoutId`. Right: wallet button (lime fill, cobalt text, hard shadow). Connected:
short address chip + a small `Power` icon button (lucide) that disconnects. Mobile: menu collapses
into a sheet with the same capsules stacked.

### 9.4 Landing sections (scroll order)
1. **Hero (cobalt band).** Left: mono headline over two lines, "The ride board that" / "*forgets*."
   with "forgets" in lime and a scrape-out underline that animates once. Below: the one-line pitch
   (Geist, `--on-cobalt`), a second line in `--on-cobalt-2`: "A seized phone reads tonight. Never
   last week." Buttons: **Run the seizure drill** (lime, hard shadow) and **Open the board**
   (outline). Right: the hero SVG (9.5). Behind the right column only, the optional hero image at
   20% opacity masked by a radial gradient, never under text.
2. **"Expiry hides. It does not forget." (paper).** Toggle chips `on Arkiv today` / `with Rasure`
   (one active chip in vermilion or lime). Diagram, full width, hand-built SVG:
   - *Today:* on the left, five epoch columns of ride slips (past to present). On the right, one
     "seized phone + full node" node. Thin cobalt curves run from the phone to **every** past slip;
     each line ends in a small vermilion square. Legend: vermilion square "readable from history".
   - *With Rasure:* the same layout; lines reach only the current and grace epoch (lime squares);
     every older column shows its key glyph burnt out and its lines cut with a small scrape mark.
   - Underneath, two columns of copy: what happens today, what changes with Rasure.
3. **"How a ride moves" (paper card on cobalt band).** Numbered flow diagram like a circuit:
   (1) Dispatcher posts, sealed under tonight's key; (2) Arkiv stores ciphertext with Entity
   Expiration set to the key's death block; (3) volunteers' phones open it; at the death block
   every phone erases the key and Arkiv expires the record together. Numbered cobalt discs, lime
   connector squares, a lime centre node "tonight's key / dies at block N". Three captions below.
4. **"Same night, three boards" (paper).** Three tall stat cards: Plaintext board, One-key board,
   Rasure. Each shows "past rides exposed" as a big mono numeral from `FACTS.json`, a thin bar, and
   one sentence. Vermilion for exposed totals, lime for Rasure.
5. **"Meera's night" (paper, serif).** Four timestamped beats (20:10, 21:30, 23:40, 00:00) on a
   vertical rule, labelled fictional. The 23:40 beat links to the drill.
6. **"What a stranger sees" (cobalt).** A live entity card fetched from Arkiv: attributes in mono,
   payload hex, and the verdict line. Next to it, the list of what never touches Arkiv.
7. **"Built on Arkiv" (paper).** Compact table of features and what each changes for the user.
   Footer on cobalt: links, MIT, evidence, wallet addresses.

### 9.5 Hero SVG (hand-coded, `components/hero/RideSlipStack.tsx`)
A fanned stack of four flat illustrated cards (cream-white `#FBFCFE`, 2 px cobalt-ink border, hard
offset shadow), each tilted a few degrees like slips on a desk:
- Front card: "ride" label, a sealed envelope icon, mono line `sealed · epoch 412`, a small lime
  wax-seal circle, and `SYN-gate-4 · 21:30` blurred behind a frosted strip.
- Second and third cards: "claim", "assign" with small icons (hand, check).
- Back card: an older ride whose surface is scraped away with fine diagonal hatching; its seal grey;
  label `epoch 409 · key erased`.
- A rotated lime chip above the stack: `sealed · key dies 03:12` with a tick drawn in SVG (no emoji, no text glyph).
- Under the stack, a wide lime panel (like a receipt bar): small mono caption `one circle`, big mono
  `tonight's key`, a `block 1,284,330` pill, a dashed rule, and a status row `Meera · post ride ·
  sealed` with `allowed` right-aligned.
Animation (Framer Motion, every 5 s): the back card scrapes out left to right and fades, the other
cards slide back one place, a new front card drops in sealed, the countdown in the lime chip
resets. `prefers-reduced-motion`: static. Size: max 600 px wide, right column, vertically aligned
with the headline. Mobile: below the buttons at 92% width; no overlap at any breakpoint.

### 9.6 Optional hero image (raster)
Claude Code cannot generate raster images. Kinnoski can generate one with this prompt and save it
to `apps/web/public/hero/night-city.webp` (2400x1600, under 400 KB):
> Cinematic wide shot of an Indian city street at night from a slightly elevated angle, deep cobalt
> blue hour light, wet asphalt reflecting distant warm street lamps, one small car with headlights
> far down the road, no people, no faces, no text or signs, shallow depth of field, cobalt and
> ivory palette with a single acid-lime highlight, editorial magazine photography, calm and
> protective mood, 35mm.
Without it, the cobalt band, blueprint grid and SVG carry the hero on their own.

### 9.7 App pages
- **Board:** paper background, ride cards as flat illustrated slips (hard shadow), lime "sealed"
  seal, mono epoch and block labels. A cobalt key-death strip pinned under the nav:
  `epoch 412 key dies in 03:12`; at death it flashes vermilion, says which epoch was erased, and
  the affected cards play the scrape-out dissolve (blur to 6 px, mask sweep left to right, 900 ms).
  Night dispatch toggle switches the board to cobalt surfaces with the same tokens.
- **Drill:** three columns on paper; rows turn vermilion (exposed, with icon and word) or stay lime
  (sealed). Totals as big mono numerals. "Attacker derives forward" toggle.
- **Stranger view, Proof, Judges:** cobalt headers, paper bodies, mono for every chain value, copy
  buttons for queries and curl.

### 9.8 Interaction and glow
Cards: hover lifts 2 px, hard shadow grows to 6 px, a pointer-tracking radial glow (lime at 14% on
cobalt, cobalt at 10% on paper) follows the cursor via `--mx --my`. Buttons: hard shadow collapses
on press. States never rely on colour alone: icon + word every time. Page transitions 220 ms
ease-out. No bounce.

### 9.9 Wallet modal (no Reown, no WalletConnect project id)
Custom modal, paper card on a cobalt scrim. Lists injected wallets found via **EIP-6963**
(`eip6963:announceProvider`) with their icons; fallback `window.ethereum`. On connect:
`wallet_switchEthereumChain` to `0x7614d1`; on error 4902, `wallet_addEthereumChain` with
`chainName: "Arkiv Tiramisu"`, `nativeCurrency: { name: "GLM", symbol: "GLM", decimals: 18 }`,
the HTTP RPC and explorer URL. Show balance; if zero, "Get test GLM" (drip) and the faucet link.
Every write opens a pending sheet: tx hash, explorer link, then confirmed block and entity key.

### 9.10 QA (Playwright Chromium, required)
Devices: iPhone SE 375, iPhone 15 Pro 393, Pixel 7 412, iPad Mini 768, laptop 1280, desktop 1440.
For every route: no horizontal scroll; hero text boxes (`h1, p, a, button`) never intersect the
SVG's bounding box; active nav capsule has the glow; hovering a card adds the glow; zero console
errors; WCAG 2.2 AA via `@axe-core/playwright` (lime is never used for text on paper, only on
cobalt, where it passes contrast); screenshots to `docs/screens/<route>-<device>.png`.

---

## 10. REPO DOCS TO WRITE

**`/arkiv/schema.md`:** entity table (4.4), every attribute with type, every Entity Expiration rule
with the formula, flags with reasons, every query predicate verbatim (4.6), what stays off Arkiv,
the trust rules (I4, I7), conformance notes for third-party readers.

**`/arkiv/friction.md`:** each item: surface, versions (SDK 0.8.1, viem, Node, browser), expected,
actual, steps to reproduce (script path), what would fix it. Candidates, include only what we
actually hit or tested:
1. Expiry is not erasure: payload in calldata (D1) and history queries (D2). Expected vs actual.
   Fix: docs callout in Entity Expiration page; optional SDK helper for sealed payloads.
2. Node history retention window, the `QueryError` kind `"block"` boundary, measured.
3. Events carry no attributes: cost of filtering foreign creates on a busy testnet.
4. Anonymous query budget behaviour and `Retry-After` with viem's default retry.
5. `ExpirationTime.atBlock` must be in the future at inclusion: our margin guard.
6. Wallet add-chain details (currency symbol, decimals) if anything was unclear.
Also tested paths that worked, with the same rigour.

**`/arkiv/wallets.md`:** each address and role (dispatcher, volunteer A, volunteer B, forger, probe,
drip). **`/arkiv/evidence.md`:** tx hashes for every claim, generated by script.

**`README.md`** (structure below, story-led, no em dashes):

```
<img banner: docs/screens/landing-desktop.png>
# Rasure
**The dispatch board that forgets on schedule.**
img.shields: Live | CI | MIT   (three badges only)
One-line pitch.
Short description (3 sentences: who, what, the discovery).
Links table: Live app | For judges (/judge) | Seizure Drill | Demo video (2:50) | Schema | Friction | Evidence | Tracks: Privacy, Security, Open Source
Screenshots 2x2 (board, drill, stranger view, proof) from docs/screens
## 23:40, Pune (story, fictional, 5 sentences)
## The problem (+ "What is true / Source" table, 4 rows)
## What we found on Arkiv (D1 and D2 in plain words + the 6-line reproduction)
## The solution (what Rasure does, numbered 1 to 5, in Meera's words)
## Explore it in 2 minutes (numbered judge path, no wallet needed for steps 1 to 3)
## How it works (mermaid architecture + ASCII timeline of epochs, keys and expiry)
## Product flow (mermaid sequence: dispatcher, volunteer, Arkiv, seized phone)
## Why Privacy / Why Security / Why Open Source / Why Censorship Resistance (one block each: who is harmed today, what changes day one)
## Why Arkiv (what breaks on Postgres, IPFS, a subgraph, our own API; what stays off Arkiv)
## How we use Arkiv (table from section 8 with file:line links)
## Measured (from FACTS.json; drill, both error directions, leak audit, wild-set expiry audit, cost; misses named)
## Invariants (I1 to I8 with test names)
## What Rasure will not do (refusals)
## Read it without us (curl + `npx tsx scripts/drill-run.ts --read-only`)
## Honest notes
## Disclosures (AI assistant: Claude, coding assistance; pre-existing work: none; synthetic data)
## Run it locally
## Repository map
## License (MIT)
```

---

## 11. VIDEO (2:50 max, record from the deployed app)

| Time | Beat |
|---|---|
| 0:00 | Black-on-paper title: "23:40. A volunteer's phone is gone." Meera (fictional) one line. |
| 0:12 | "On Arkiv, expiry hides a record. It does not forget it." Show D1: expired entity, then the payload recovered from its creation tx. |
| 0:35 | Rasure in one sentence. Board: post a ride (wallet popup), volunteer sees it live, claims, dispatcher assigns. |
| 1:15 | Key death live: countdown, flip, cards dissolve, explorer shows expiry block equals key death. |
| 1:40 | Seizure Drill: three columns, run it, red vs sealed totals. |
| 2:05 | Failure: forged ride ignored by `$creator`; replay refused by AAD. |
| 2:20 | Stranger view: six attributes, ciphertext, nothing personal. |
| 2:35 | Proof page and the curl. "Read it without us." |
| 2:45 | Close: "Rasure. The board that forgets on schedule." |

If Kinnoski's local video skills (`hackathon-demo-video`, `hackathon-film-pipeline`) are available
on his machine, use them; otherwise a clean screen recording with captions.

---

## 12. DEVFOLIO FORM (draft in `SUBMISSION_DEVFOLIO.md`, field by field from section 2 of the
official checklist): project name, tagline, problem it solves, challenges, tracks, live URL, Indian
nationality (No), Why Arkiv, How do you use Arkiv (with code links), friction link, wallet addresses
with roles, schema link, reproduction steps, pre-existing work ("None"; if anything was reused,
disclose with SHA), surfaces used (TypeScript SDK, Direct JSON-RPC, WebSocket events, Docs, Hub,
Faucet, Access keys, Block Explorer, Arkiv skills), time to first entity, LLMs used (state honestly),
one thing Arkiv should improve first (answer: "say plainly in the Entity Expiration docs that expiry
does not remove the payload from history, and ship a sealed-payload helper"), feedback call, the two
confirmations.

---

## 13. RED TEAM (Gate 7, `REDTEAM_LOG.md`)

After deploy, spawn fresh reviewer agents with Appendix B of the strategy file: rubric judge (score
each of the 4 criteria 0 to 5 with quotes), ten-minute judge (follow JUDGE.md on the live URL),
Arkiv maintainer (verify every feature claim at file:line, flag decoration), verifier (try to read a
past ride, forge a ride, forge an assign, replay ciphertext), skeptic (unsourced numbers, overclaims,
em dashes, competitor names). Fix and re-run until a clean round.

---

## 14. REFERENCE MATERIAL (clone into `reference/`, gitignored)

Official: `https://github.com/Arkiv-Network/global-tour-stop-pre-devcon`,
`https://github.com/Arkiv-Network/skills` (read: arkiv-encryption, arkiv-security-trust,
arkiv-entity-expiration, arkiv-entity-lifecycle, arkiv-query, arkiv-indexing, arkiv-write-safety,
arkiv-troubleshooting, arkiv-app-integration), `https://docs.arkiv.network`,
`https://unpkg.com/@arkiv-network/sdk@0.8.1/` source.

Event samples to study for strengths and gaps only (never cite publicly):
```
https://github.com/winsznx/imprimatur
https://github.com/amannx21/Tolmol
https://github.com/Minkhanov/tacho-arkiv
https://github.com/RaYYeR220/on-the-clock
https://github.com/GuTS805/Nexora
https://github.com/s21v1d9p/abhichahiye
https://github.com/erdemasik001/arkify
https://github.com/mohitt31/jalsaakshya
https://github.com/avishrakshe/Turn---Arkiv-
https://github.com/agent3-666/handoff-lens-arkiv-2026
https://github.com/sumplus-real/sumplus-receipt-lens
https://github.com/alhassanmohammederc3643-cmyk/arkiv-receipt-log
https://github.com/rubberpirate/intrnet-arkive
https://github.com/Shivangi-Sharma06/krix
https://github.com/ifeohsun/arkiv-canary
https://gitlab.com/davidj-builds/arkiv-canary
https://github.com/hackerjose25/Arkiv-Hack
https://github.com/0xkinno/parallax   (our own earlier ideathon entry; reuse ideas only, no code)
```
What to take from them (as patterns, implemented our own way): a judge path with exact queries and
curl; a CLI or script that reads without our site; `executeBatch` + ownership patterns; 429 handling
that fails fast with the retry time; generated evidence files; a forged-record demonstration.
What they leave open, which Rasure owns: none of them treats expiry as non-erasure, none binds expiry
to key destruction, none measures what a seized device reveals from history.

---

## 15. WHAT KINNOSKI PROVIDES (the human)

1. **GitHub repo** `0xkinno/rasure` (public, MIT) and the email for `KINNO_EMAIL`.
2. **Arkiv Hub access key** (hub.arkiv.network): for scripts and the server read relay only.
3. **Funded wallets on Tiramisu** (faucet needs a browser wallet + CAPTCHA, so this is manual):
   dispatcher, volunteer A, volunteer B, forger, probe, drip. The agent generates keys with
   `scripts/keys.ts` (prints addresses only, writes `.secrets/` gitignored); Kinnoski funds the
   dispatcher and drip addresses from the faucet; `scripts/fund.ts` splits GLM to the rest.
4. **MetaMask** (or Rabby) in Chrome for the live wallet popups in the video.
5. **Vercel account**: import the repo, root `apps/web`, add env vars from section 5.
6. **Optional hero image** from the prompt in section 9.
7. **Video recording and voice** (or TTS, disclosed), and the **Devfolio submission** itself.
8. Optional: licensed font files if he wants a specific typeface.

---

## 16. DEFINITION OF DONE

Every item in TASK.md ticked; live URL works without a wallet for landing, drill, stranger view,
proof, judge; a judge with a wallet can post or claim and see the tx on the explorer; FACTS.json is
generated from real runs; README, schema, friction, wallets, evidence complete; `check-copy` passes;
attribution gate passes; video under 3:00; Devfolio form submitted; commit tagged `submission`.
