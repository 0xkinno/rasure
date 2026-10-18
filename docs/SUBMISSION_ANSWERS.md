# Devfolio answers

Code links point at `https://github.com/0xkinno/rasure/blob/main/`. Every number is from `docs/FACTS.json` or a file in `proof/results/`.

## 1. Why Arkiv? (25%)

**Rasure is a dispatch board whose records have to die on schedule, in public, and stay dead.** A volunteer driver's pickup should be readable tonight and unreadable once the shift is over, even to someone who seizes a phone or runs a full node. That is a statement about expiry, and expiry is the one thing Arkiv does at the data layer.

**What breaks without it**

| If we used | What breaks |
|---|---|
| Postgres or our own API | Whoever runs the server decides when a row dies, and can keep a copy. A subpoena, a leaked backup or a curious admin defeats "forgets on schedule". The promise would be policy, not protocol. We would also be the one party the volunteers have to trust. |
| IPFS | Content is addressed by hash and has no clock. Nothing expires, pinned copies are permanent by design, and there is no queryable index: you cannot ask "rides in this zone that die in the next ten minutes". |
| A subgraph | It indexes a chain you already wrote to, so you still need contracts, an indexer to host, and a separate store for payloads. Entity expiry is not an event it can enforce. Two more services, none of them time-bound. |
| A custom smart contract | We would write and audit the expiry, ownership and query logic ourselves. Rasure has no contract at all. |

**What Arkiv gives us that nothing else does**

- **Expiry is part of the write.** Each sealed ride is created with `ExpirationTime.atBlock(keyDeathBlock(epoch))`, so the chain's clock and our key schedule are the same number (invariant I1, checked on 13 rides).
- **Queries over time.** `$expiresAt` ranges, `$creator` OR-lists, `NOT` filters and `atBlock` reads run in the node. The board, the "dies in 10 minutes" strip and the forged-ride panel are queries, not a backend.
- **Authorship you do not have to build.** `$creator` and `$owner` are set by the chain. A ride only counts if a trusted dispatcher wrote it, so a forgery is ignored without any server deciding. Shift handover is `changeOwnership`.
- **A history we could test, not assume.** We ran the discovery that decides the whole design: after an entity expires the payload is gone from the live state, but it is still in the creation transaction's calldata, and the node still answers history for 411 hours. We recovered the probe byte for byte, and recovered 39 of 39 creation transactions from a wild set of other people's expired records. Of 300 sampled wild records read from history, 294 to 300 still returned a payload at every window we tried. So "expired" does not mean "private". That finding is why Rasure encrypts and ratchets keys.

**Proof, not a claim.** In the seizure drill the attacker has a full Arkiv node and the seized phone. Over 32 rides: plaintext board 32 of 32 exposed, one-key board 32 of 32, Rasure 4 of 32 (only the current epoch), and after a rekey 0 of 2. The leak audit over 60 live entities found at most six public attributes each and zero transactions containing plaintext.

**In short:** Arkiv is the only layer where the lifetime, the author and the query are one object on chain. Remove it and the guarantee turns back into a promise.

## 2. How do you use Arkiv? (25%)

Rasure is built only from Arkiv entities: no contract, no database, no indexer. Every feature below is exercised on Tiramisu, with transaction hashes in [`docs/txfeatures.md`](https://github.com/0xkinno/rasure/blob/main/docs/txfeatures.md) and run files in [`proof/results/`](https://github.com/0xkinno/rasure/tree/main/proof/results). The full table with line links is [`SDK_SURFACE.md`](https://github.com/0xkinno/rasure/blob/main/SDK_SURFACE.md).

| Feature | How and why | Code |
|---|---|---|
| **Entity Expiration** | Sealed rides expire at the key-death block of their epoch; the circle is a 30 day lease; tallies 90 days; member and rekey have their own lifetimes. This is the product. | [writes.ts](https://github.com/0xkinno/rasure/blob/main/packages/core/src/writes.ts), [writes-more.ts](https://github.com/0xkinno/rasure/blob/main/packages/core/src/writes-more.ts), [writes-rekey.ts](https://github.com/0xkinno/rasure/blob/main/packages/core/src/writes-rekey.ts) |
| **Lifetime Extension** | The circle lease is renewed by a button and by the night watch when under seven days remain; only ever to a later block. | [writes.ts](https://github.com/0xkinno/rasure/blob/main/packages/core/src/writes.ts), [night-watch.ts](https://github.com/0xkinno/rasure/blob/main/scripts/night-watch.ts) |
| **Creation flags** | Every sealed record is `readonly` with no permissionless extension, so nobody can keep a record alive past its key. | [writes.ts](https://github.com/0xkinno/rasure/blob/main/packages/core/src/writes.ts) |
| **`permissionlessExtension`** | Only on tallies: a funder keeps the service record alive without owning it. The same wallet is refused on a ride. | [writes-more.ts](https://github.com/0xkinno/rasure/blob/main/packages/core/src/writes-more.ts) |
| **Attributes vs payload** | At most six public attributes (epoch and served as u64, zone only as a rotating blind tag); everything else is an AES-256-GCM ciphertext payload. | [writes.ts](https://github.com/0xkinno/rasure/blob/main/packages/core/src/writes.ts), [schema.ts](https://github.com/0xkinno/rasure/blob/main/packages/core/src/schema.ts) |
| **Queries** | Compound predicates, `$creator` OR-lists, `NOT` for forgeries, ranges on `epoch` and `$expiresAt`. | [queries.ts](https://github.com/0xkinno/rasure/blob/main/packages/core/src/queries.ts), [BoardClient.tsx](https://github.com/0xkinno/rasure/blob/main/apps/web/components/board/BoardClient.tsx) |
| **`createdBy()` and `ownedBy()`** | Circle anchor, "my claims" and "Networks I hold". | [read.ts](https://github.com/0xkinno/rasure/blob/main/packages/core/src/read.ts) |
| **`$creator` and `$owner`** | Trust for rides (I4, I9) and assignments (I7); the holder at the ride's block via `atBlock`. | [decide.ts](https://github.com/0xkinno/rasure/blob/main/packages/core/src/decide.ts) |
| **`changeOwnership`** | Shift handover, batched with a sealed handover record. | [writes-more.ts](https://github.com/0xkinno/rasure/blob/main/packages/core/src/writes-more.ts) |
| **`patchEntity`** | A rekey patches the circle's public `gen` in the same batch as the rekey entity. | [writes-more.ts](https://github.com/0xkinno/rasure/blob/main/packages/core/src/writes-more.ts) |
| **`deleteEntity`** | Cancel a ride, withdraw a claim. The UI states plainly that only key death makes the ciphertext unreadable. | [writes-more.ts](https://github.com/0xkinno/rasure/blob/main/packages/core/src/writes-more.ts) |
| **Batch writes** | Assign plus close, circle plus first ride, rekey plus patch, handover plus transfer: both land or neither, one wallet popup. | [writes.ts](https://github.com/0xkinno/rasure/blob/main/packages/core/src/writes.ts), [writes-more.ts](https://github.com/0xkinno/rasure/blob/main/packages/core/src/writes-more.ts) |
| **Pagination at `atBlock`** | Every page of a walk reads one block, so the board never tears. | [read.ts](https://github.com/0xkinno/rasure/blob/main/packages/core/src/read.ts) |
| **WebSocket events** | `watchEntityEvents` moves the board on deletes and ownership changes without a refresh. | [BoardClient.tsx](https://github.com/0xkinno/rasure/blob/main/apps/web/components/board/BoardClient.tsx) |
| **Historical queries** | The drill, the audits and the history-reach discovery read the past on purpose. | [d2-atblock.ts](https://github.com/0xkinno/rasure/blob/main/scripts/discovery/d2-atblock.ts), [leak-audit.ts](https://github.com/0xkinno/rasure/blob/main/scripts/leak-audit.ts) |
| **Direct JSON-RPC** | Calldata recovery with `eth_getTransactionByHash`, and a drill with no SDK at all. | [calldata.ts](https://github.com/0xkinno/rasure/blob/main/packages/core/src/calldata.ts), [raw-drill.mjs](https://github.com/0xkinno/rasure/blob/main/examples/raw-drill.mjs) |

**Around the SDK:** Hub access key and faucet, Block Explorer and Data Explorer deep links on the proof page, and the Arkiv MCP server, which independently confirmed 34 of 34 demo receipts as successful (`scripts/mcp-verify.mjs`).

**Honest limits.** The MCP returns metadata only, so it cross-checks existence and expiry, not contents. The reader's Rewind lives in a static page, not the app UI. Lifetime Extension is never called on sealed records on purpose. The full "not used, so not claimed" list is in `SDK_SURFACE.md`.

## 3. The one thing Arkiv should improve first

**Say plainly what expiry does, and let a builder see the retention horizon.**

Expiry removes an entity from live state. It does not remove the creation transaction, whose calldata still holds the payload, and the node we tested answered history reads for about 411 hours. We recovered an expired probe byte for byte, and in a wild set of 300 other expired records the payloads were still readable at every window we tried. None of this is a bug. It is how a chain works. But the word "expiry" makes people assume erasure, and anyone storing something sensitive will assume wrong.

The first fix is small and cheap:

- **State it where builders read:** one clear page and a line in the SDK docs saying expiry ends liveness, not history.
- **Expose the horizon:** an RPC or SDK call that returns the oldest block the node will answer, so apps can show the real window instead of guessing.
- **Then, as a roadmap item:** a create option that stores a commitment, not the payload, in calldata.

We built Rasure around the gap, with encryption and key death. The next builder should not have to discover it by experiment.

## 4. Privacy

**What we protect.** The shape of a domestic violence transport network: who needs a ride, from where, when, and which volunteer is carrying them. Exposure here is physical danger. The risk is not only a hacker. It is a seized volunteer phone, a node operator, or a stranger reading public chain data years later.

**How.** Every record is sealed with AES-256-GCM under a key that changes each epoch and is destroyed when the epoch ends (a one-way ratchet). Associated data binds each ciphertext to its circle, epoch and type, so it cannot be replayed elsewhere. Public attributes are capped at six, and the zone is only a rotating blind tag. Payloads are padded to one size. Rekeying uses ECIES, so a removed member cannot read forward.

**Evidence.** In the seizure drill an attacker holding a full node and a seized phone opened 32 of 32 plaintext records, 32 of 32 under a single static key, 4 of 32 under Rasure (the current epoch only), and 0 of 2 after a rekey. The live leak audit across 60 entities found at most six public attributes each and zero creation transactions containing plaintext. Everything in the demo is synthetic.

## 5. Open source

- **MIT licensed**, public from the first commit at https://github.com/0xkinno/rasure.
- **No lock-in:** `packages/core` is a standalone library with 51 unit tests; the same reads work from `npx tsx scripts/rasure.ts board`, from a static `reader.html`, and from a 40 line raw JSON-RPC example with no SDK (`examples/raw-drill.mjs`).
- **Reproducible claims:** every number on the proof page comes from a checked-in run file in `proof/results/`, regenerated by `scripts/facts.ts`. CI runs the tests and a night-watch job keeps the demo network's lease alive.
- **A real contribution back:** `SDK_SURFACE.md` documents what each SDK feature actually did on Tiramisu, including what we did not use, and `REDTEAM_LOG.md` records the attacks we ran on ourselves and the fixes.

## 6. Best Indian use case

**Night transport for survivors of domestic violence, run by shelters and volunteer networks.** Across Indian cities, small NGOs and informal volunteer groups move women and children at night, usually over WhatsApp groups and shared sheets. Those hold names, pickup points and times, forever, on phones that get lost, borrowed, inspected or taken in a family dispute. A single leaked chat can end a safe house.

Rasure fits how this is actually done. It needs only a phone and a wallet, with no accounts and no central server for anyone to pressure. Volunteers join by an in-person link, so trust stays human. The demo is a synthetic Pune dispatch night, but the pattern extends to disaster relief, blood and medicine runs, and legal aid escorts: places where the record must exist tonight and be unreadable tomorrow.

## 7. Tracks we are entering

| Track | Why Rasure belongs |
|---|---|
| **Privacy** | Sealed payloads, a destroyed-key ratchet, blind tags, padding, and a measured seizure drill (4 of 32 exposed, 0 after rekey). |
| **Security** | Authorship and ownership enforced by `$creator` and `$owner`; forged rides and assignments ignored; nine invariants with tests; two red-team rounds with fixes logged. |
| **Censorship Resistance** | No server, no database, no contract. The board is readable with a curl or a static page, so there is nothing to take down or subpoena. |
| **Open Source** | MIT, a reusable core library, reproducible evidence, a raw SDK-free example and public notes on where the SDK surprised us. |
| **Best Indian Use Case** | A real, hard problem for Indian shelters and volunteer networks, demonstrated on a synthetic Pune night. |
