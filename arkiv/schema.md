# Rasure data contract (schema v1)

Network: Arkiv Tiramisu, chain 7738577. SDK: `@arkiv-network/sdk` 0.8.1. Code: `packages/core/src/schema.ts` (constants), `queries.ts` (predicates), `writes.ts`, `writes-rekey.ts` and `writes-more.ts` (writes). Change a constant there and this file in the same commit.

There is no smart contract. Every write is a signed transaction to the Arkiv system address `0x4400000000000000000000000000000000000044`, visible on `https://tiramisu.explorer.arkiv.network`.

## Why Arkiv

On a database an operator controls, "this record expired" is a promise and the operator can read everything. Arkiv gives an Entity Expiration the network enforces at an exact block, an immutable `$creator`, typed queries and live events. Rasure uses the expiry block as the key-destruction block: the user-visible capability is a board whose records stop being served and stop being readable at the same moment. The trade-off: expiry alone does not erase a payload from its creation transaction, so every payload is encrypted. The Web2 alternative (Postgres or an API) loses the network-enforced clock and the unforgeable author.

## Entity types

All Arkiv entities carry `project = "rasure/v1"` (str) and `circle = <random 16 byte id as 32 hex chars>` (str). The circle id is never derived from a name. Every entity except `circle` also carries `v = 1` (i32); the `circle` entity omits it to stay within six public attributes.

| Type | Created by | Attributes (public) | Payload (sealed) | Entity Expiration | Flags |
|---|---|---|---|---|---|
| `circle` | dispatcher | `type`, `circle`, `epoch_blocks` (u64), `genesis` (u64), `gen` (u64, starts at 1) | empty | 30 days, renewed with Lifetime Extension by the current holder | none: the holder may extend, hand over (`changeOwnership`) and patch `gen` |
| `ride` | dispatcher | `type`, `circle`, `epoch` (u64), `tag` (str) | landmark code, window, seats, note | about 20 minutes with 300 block epochs (two epochs after its epoch starts, the absolute block `keyDeathBlock(epoch)`) | `readonly` |
| `claim` | volunteer | `type`, `circle`, `epoch` (u64), `ref` (key of the ride) | ETA, vehicle kind, the ride key, the claimant address | about 20 minutes, the same block as its ride | `readonly` |
| `assign` | dispatcher | `type`, `circle`, `epoch` (u64), `ref` (key of the ride) | which claim, short instruction | about 20 minutes, the same block as its ride | `readonly` |
| `closeout` | dispatcher | `type`, `circle`, `epoch` (u64), `ref` (key of the ride) | outcome code | about 20 minutes, the same block as its ride | `readonly` |
| `member` | volunteer (their wallet) | `type`, `circle`, `epoch` (u64) | a 33 byte compressed secp256k1 device public key (not the wallet key; public by definition) | 1 day (43,200 blocks) | `readonly` |
| `rekey` | dispatcher | `type`, `circle`, `epoch` (u64, the epoch the new chain takes effect) | a fresh chain key sealed to each remaining member's device key (ECIES), padded to 1 KiB steps | about 10 minutes with 300 block epochs (one epoch after it takes effect) | `readonly` |
| `handover` | outgoing dispatcher | `type`, `circle`, `epoch` (u64), `ref` (key of the circle) | the new holder and a note | about 20 minutes, the block `keyDeathBlock(epoch)` | `readonly` |
| `tally` | dispatcher | `type`, `circle`, `epoch` (u64), `served` (u64: rides closed in that epoch) | empty | 90 days (3,888,000 blocks) | `readonly` and `permissionlessExtension` |

Sealed payload content type: `application/vnd.rasure.sealed.v1`. Member payload: `application/vnd.rasure.devicekey.v1`. Rekey payload: `application/vnd.rasure.rekey.v1`.

Lifetime Extension is used on the `circle` and the `tally` and never called on sealed records. A `member` entity publicly links a wallet to a circle. That is metadata we cannot hide, because `$creator` is public; it is listed under Honest notes in the README.

## Entity Expiration per type

- `circle`: 30 days (1,296,000 blocks) from creation, extended by the holder with Lifetime Extension (a Renew lease button, and the night watch when fewer than 7 days remain). A network that stops operating disappears.
- `ride`, `claim`, `assign`, `closeout`, `handover`: the absolute block `keyDeathBlock(epoch) = genesis + (epoch + 2) * epoch_blocks`, which is two epochs after the epoch begins (about 20 minutes with 300 block epochs, about 12 hours with 10,800 block epochs).
- `member`: 1 day (43,200 blocks).
- `rekey`: the block `genesis + (r + 1) * epoch_blocks` for effect epoch `r`, one epoch after it takes effect.
- `tally`: 90 days (3,888,000 blocks), which any wallet may extend.

Rules behind these:
- `epoch = (block - genesis) / epoch_blocks` (integer division). Demo circles use 300 blocks (10 minutes); production uses 10,800 blocks (6 hours). Tiramisu makes a block about every 2 seconds.
- Invariant I1: for every sealed type, `expiresAt == keyDeathBlock(epoch)`. A claim, assign or closeout uses the epoch of the ride it points at, so it dies in the same block as the ride.
- Writes are refused client-side when fewer than 20 blocks remain before key death, because an absolute `ExpirationTime.atBlock` must still be in the future at inclusion.
- Lifetime Extension only ever sets a later block.

## Flags and why

- `readonly` on every sealed record, member, rekey and tally: attributes and payload are fixed after creation.
- No `permissionlessExtension` on rides, claims, assigns, closeouts, members, rekeys or handovers. Anyone extending a ride past its key death would only keep ciphertext nobody can read, so the option is refused on purpose. The dispatcher controls expiry and no one else can stretch it.
- `permissionlessExtension` on `tally`, on purpose: a tally is a count with no person, place or time finer than an epoch. A funder or auditor wallet can keep the service record alive without owning it, so the report cannot be quietly dropped by the shelter. This is the one place where letting a third party extend a lifetime helps the user.
- The `circle` entity carries no flags so the holder can patch `gen`, extend it and hand it over.

## What stays off Arkiv

Names, phone numbers, plates, addresses, landmarks or zones in plaintext, exact times, any chain key or seed, the member list, and the plaintext of any record. All demo content is synthetic and every synthetic place string starts with `SYN-`.

Allowed public attribute names (any other name on a Rasure entity fails the leak audit, invariant I3): `project`, `type`, `v`, `circle`, `epoch`, `tag`, `ref`, `epoch_blocks`, `genesis`, `gen`, `served`. `epoch_blocks`, `genesis` and `gen` appear on the `circle` entity only; `served` on `tally` only. No entity carries more than six.

`tag` is `hex(HMAC-SHA256(idxKey_e, "zone:" + normalized zone))` truncated to 32 hex characters. `idxKey_e` is derived from the epoch's chain key, so the same zone has a different tag every epoch and an outsider cannot link the same place across epochs.

## Seal format and keys

`0x01 | iv(12) | AES-256-GCM ciphertext+tag`. Additional authenticated data: `rasure/v1|<circle>|<epoch>|<type>`. Plaintext is JSON, padded to 256, 512, 1024 or 2048 bytes. Key schedule: `k(e+1) = HKDF-SHA256(k(e), salt "rasure/v1", info "ratchet")`, `enc = HKDF(k, info "enc")`, `idx = HKDF(k, info "idx")`.

Rekey: the dispatcher draws a fresh 32 byte chain key `K`, then for each remaining member derives `HKDF-SHA256(ECDH(ephemeral, devicePub), salt "rasure/v1/rekey", info "entry")` and seals `epoch (u64) | K` with AES-256-GCM, AAD `rasure/v1|<circle>|<epoch>|rekey`. Entry layout: `fingerprint(8) | ephemeralPub(33) | iv(12) | ciphertext+tag(56)`. The rekey is one batch: the `rekey` entity is created and the circle's `gen` is patched, so a phone sees the rekey from one attribute on the anchor it already reads.

## Trust rules

- I4: a ride counts only if its `$creator` held the circle (`$owner` of the circle anchor) at the ride's creation block. Before any handover the holder is the anchor's `$creator`.
- I9 (shift handover): `changeOwnership` on the anchor, written in one batch with a `handover` record, moves the holder from that block on. Rides by the previous holder after the handover, and by the next holder before it, do not count. The block of a change is the creation block of the `handover` record, verified by reading the anchor's `$owner` with `atBlock`.
- I7: an assign or closeout counts only if its `$creator` held the circle at the assign's own block (before any handover: the ride's dispatcher).
- A claim counts only if it opens in the circle and epoch AND its sealed body names the ride key and the claimant address that equals the claim's `$creator`. A copied ciphertext or an unreadable spam claim changes nothing.
- The dispatcher seals a rekey only to member wallets it ticks in the UI. A `member` entity can be posted by anyone, so unknown wallets are never included by default, and keys are validated as 33 byte curve points first.
- A third party reading without the app applies exactly these rules and treats every other entity as untrusted data.

## Queries the app runs

The app builds each query with the SDK and sends it through `arkiv_query`. The simplest form, reading every Arkiv entity of the project:

```typescript
const result = await client.select().where(eq('project', 'rasure/v1')).fetch()
```

Q1 with every filter, as SDK code:

```typescript
import { and, eq, or } from "@arkiv-network/sdk/query";
import { addr, u64 } from "@arkiv-network/sdk/attr";

const page = await client
  .select({ key: true, creator: true, owner: true, createdAt: true, expiresAt: true, attributes: true, payload: true })
  .where(
    and([
      eq("project", "rasure/v1"),
      eq("circle", circle),
      eq("type", "ride"),
      or([eq("epoch", u64(epoch)), eq("epoch", u64(epoch - 1n))]),
      or(holders.map((h) => eq("$creator", addr(h)))),
    ]),
  )
  .atBlock(head)
  .limit(100)
  .fetch();
```

Every predicate, rendered by `render()` from `packages/core/src/queries.ts`. `C` is the circle id, `E` the current epoch, `H1`, `H2` the wallets that held the circle, `T` a blind tag, `R` a ride key.

```text
Q1  open board, this epoch and the grace epoch, holders only
    project = str('rasure/v1') AND circle = str('C') AND type = str('ride')
    AND (epoch = u64(E) OR epoch = u64(E-1))
    AND ($creator = addr(H1) OR $creator = addr(H2))

Q2  board filtered by zone (one (epoch, tag) pair per epoch on screen)
    Q1 base AND ((epoch = u64(E) AND tag = str('T_E')) OR (epoch = u64(E-1) AND tag = str('T_E-1')))

Q3b everything pointing at any ride of the epoch pair (one query for the whole board)
    project = str('rasure/v1') AND circle = str('C')
    AND (epoch = u64(E) OR epoch = u64(E-1))
    AND (type = str('claim') OR ((type = str('assign') OR type = str('closeout')) AND ($creator = addr(H1) OR ...)))

Q3  everything pointing at one ride
    project = str('rasure/v1') AND circle = str('C') AND ref = key(R)

Q4  forged rides (Security panel)
    project = str('rasure/v1') AND circle = str('C') AND type = str('ride')
    AND NOT ($creator = addr(H1) OR $creator = addr(H2))

Q5  my claims (builder adds .createdBy(me))
    project = str('rasure/v1') AND circle = str('C') AND type = str('claim')

Q6  circle anchor (builder adds .createdBy(dispatcher))
    project = str('rasure/v1') AND circle = str('C') AND type = str('circle')

Q9  member device keys of a circle (the dispatcher builds the rekey from these)
    project = str('rasure/v1') AND circle = str('C') AND type = str('member')

Q10 rekeys taking effect at the given epoch or the next two, holders only
    project = str('rasure/v1') AND circle = str('C') AND type = str('rekey')
    AND (epoch = u64(E) OR epoch = u64(E+1) OR epoch = u64(E+2)) AND ($creator = addr(H1) OR ...)

Q11 handover records of a circle (their creation block marks a changeOwnership)
    project = str('rasure/v1') AND circle = str('C') AND type = str('handover')

Q12 service tallies, holders only
    project = str('rasure/v1') AND circle = str('C') AND type = str('tally') AND ($creator = addr(H1) OR ...)

Q13 rides that die within N blocks (a $expiresAt range on top of Q1)
    Q1 AND $expiresAt <= u64(head + 300)

Q14 networks I hold (builder adds .ownedBy(me))
    project = str('rasure/v1') AND type = str('circle')

Q7  leak audit, every Rasure entity, cursor-paginated, pinned with .atBlock(head)
    project = str('rasure/v1')

Q8  history replay for the drill: Q7 read .atBlock(past), plus eth_getTransactionByHash for each creation transaction
    project = str('rasure/v1')
```

The `/proof` page shows these with real values and a copyable `curl` for each. The same Q1 over raw JSON-RPC:

```bash
curl -s -X POST https://rpc.tiramisu.db-chain.testnet.arkiv.network -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"arkiv_query","params":["project = str('"'"'rasure/v1'"'"') AND type = str('"'"'ride'"'"')",{"select":{"key":true,"creator":true,"owner":true,"expiresAt":true,"attributes":true},"limit":"0x64"}]}'
```

## Conformance notes for third-party readers

- Entities expire at their key-death block. A missing ride is normal, not an error.
- `payload` is ciphertext. Without a circle join link you can read attributes only. That is the privacy property, not a defect.
- Over the SDK, attributes come back as `{ type, value }`; over raw JSON-RPC they come back as an array of `{ name, type, value }` with u64 values as hex strings. `apps/web/public/reader.html` and `examples/raw-drill.mjs` show the raw handling.
- Page with the cursor and pin every page to one block with `atBlock`; the node returns at most 200 entities per page.
- Anonymous queries cost 100 of 10,000 units per hour per IP. The app issues 6 to 9 queries per board load and falls back to a read-only relay after a rate limit.
- `apps/web/public/reader.html` is a one-file reader written from this document alone; `examples/raw-drill.mjs` reruns the seizure drill with no SDK.
