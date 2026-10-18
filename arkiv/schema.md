# Rasure data contract (schema v1)

Network: Arkiv Tiramisu, chain 7738577. SDK: `@arkiv-network/sdk` 0.8.1. Code: `packages/core/src/schema.ts` (constants), `queries.ts` (predicates), `writes.ts` (writes). Change a constant there and this file in the same commit.

There is no smart contract. Every write is a signed transaction to the Arkiv system address `0x4400000000000000000000000000000000000044`, visible on `https://tiramisu.explorer.arkiv.network`.

## Entity types

All entities carry `project = "rasure/v1"` (str), `v = 1` (i32) and `circle = <random 16 byte id as 32 hex chars>` (str). The circle id is never derived from a name.

| Type | Created by | Attributes (public) | Payload (sealed) | Entity Expiration | Flags |
|---|---|---|---|---|---|
| `circle` | dispatcher | `type`, `circle`, `epoch_blocks` (u64), `genesis` (u64) | empty | 30 days (1,296,000 blocks), renewed by the dispatcher with Lifetime Extension | none (owner-only extension: a network that stops operating disappears) |
| `ride` | dispatcher | `type`, `circle`, `epoch` (u64), `tag` (str) | landmark code, window, seats, note | absolute block `keyDeathBlock(epoch)` | `readonly` |
| `claim` | volunteer | `type`, `circle`, `epoch` (u64), `ref` (key of the ride) | ETA, vehicle kind (no plate) | same block as its ride | `readonly` |
| `assign` | dispatcher of that ride | `type`, `circle`, `epoch` (u64), `ref` (key of the ride) | which claim, short instruction | same block as its ride | `readonly` |
| `closeout` | dispatcher of that ride | `type`, `circle`, `epoch` (u64), `ref` (key of the ride) | outcome code | same block as its ride | `readonly` |

Sealed payload content type: `application/vnd.rasure.sealed.v1`.

## Entity Expiration rules

- `epoch = (block - genesis) / epoch_blocks` (integer division). Demo circles use 300 blocks (10 minutes); production uses 10,800 blocks (6 hours). Tiramisu makes a block about every 2 seconds.
- `keyDeathBlock(e) = genesis + (e + 2) * epoch_blocks`. One grace epoch lets a ride posted late still be served.
- Invariant I1: for `ride`, `claim`, `assign` and `closeout`, `expiresAt == keyDeathBlock(epoch)`. A claim, assign or closeout uses the epoch of the ride it points at, so it dies in the same block as the ride.
- Writes are refused client-side when fewer than 20 blocks remain before key death, because an absolute `ExpirationTime.atBlock` must still be in the future at inclusion.
- The `circle` anchor is a lease: Lifetime Extension sets a deadline 30 days after the current head, and only ever to a later block.

## Flags and why

- `readonly` on every sealed record: attributes and payload are fixed after creation ("Fixed since block N").
- No `permissionlessExtension` on any type. Anyone extending a ride past its key death would only keep ciphertext that nobody can read, so the option is refused on purpose. The dispatcher controls expiry and no one else can stretch it.

## What is public and what is not

Allowed public attribute names (any other name on a Rasure entity fails the leak audit, invariant I3): `project`, `type`, `v`, `circle`, `epoch`, `tag`, `ref`, `epoch_blocks`, `genesis`. The last two appear on the `circle` entity only.

`tag` is `hex(HMAC-SHA256(idxKey_e, "zone:" + normalized zone))` truncated to 32 hex characters. `idxKey_e` is derived from the epoch's chain key, so the same zone has a different tag every epoch and an outsider cannot link the same place across epochs.

Never on Arkiv: names, phone numbers, plates, addresses, landmarks or zones in plaintext, any chain key or seed, membership lists, plaintext of any record. All demo content is synthetic and every synthetic place string starts with `SYN-`.

## Seal format

`0x01 | iv(12) | AES-256-GCM ciphertext+tag`. Additional authenticated data: `rasure/v1|<circle>|<epoch>|<type>`. Plaintext is JSON, padded to 256, 512, 1024 or 2048 bytes. Key schedule: `k(e+1) = HKDF-SHA256(k(e), salt "rasure/v1", info "ratchet")`, `enc = HKDF(k, info "enc")`, `idx = HKDF(k, info "idx")`.

## Trust rules

- I4: a ride counts only if its `$creator` is in the circle's trusted dispatcher list.
- I7: an assign or closeout counts only if its `$creator` equals the `$creator` of the ride it points at.
- A third party reading without the app should apply exactly these two rules and treat every other entity as untrusted data.

## Queries

Rendered by `render()` from the same code the app runs. `C` is the circle id, `E` the current epoch, `D1`, `D2` the trusted dispatcher addresses, `T` a blind tag, `R` a ride key.

```text
Q1  open board, this epoch and the grace epoch, trusted dispatchers only
    project = str('rasure/v1') AND circle = str('C') AND type = str('ride')
    AND (epoch = u64(E) OR epoch = u64(E-1))
    AND ($creator = addr(D1) OR $creator = addr(D2))

Q2  board filtered by zone (one (epoch, tag) pair per epoch on screen)
    Q1 base AND ((epoch = u64(E) AND tag = str('T_E')) OR (epoch = u64(E-1) AND tag = str('T_E-1')))
    AND ($creator = addr(D1) OR $creator = addr(D2))

Q3b everything pointing at any ride of the epoch pair (one query for the whole board)
    project = str('rasure/v1') AND circle = str('C')
    AND (type = str('claim') OR type = str('assign') OR type = str('closeout'))
    AND (epoch = u64(E) OR epoch = u64(E-1))

Q3  everything pointing at one ride
    project = str('rasure/v1') AND circle = str('C') AND ref = key(R)

Q4  forged rides (Security panel)
    project = str('rasure/v1') AND circle = str('C') AND type = str('ride')
    AND NOT ($creator = addr(D1) OR $creator = addr(D2))

Q5  my claims (builder adds .createdBy(me))
    project = str('rasure/v1') AND circle = str('C') AND type = str('claim')

Q6  circle anchor (builder adds .createdBy(dispatcher))
    project = str('rasure/v1') AND circle = str('C') AND type = str('circle')

Q7  leak audit, every Rasure entity, cursor-paginated, pinned with .atBlock(head)
    project = str('rasure/v1')

Q8  history replay for the drill: Q7 read .atBlock(past), plus eth_getTransactionByHash for each creation transaction
    project = str('rasure/v1')
```

The `/proof` page shows these with real values and a copyable `curl` for each.

Example read without Rasure:

```bash
curl -s -X POST https://rpc.tiramisu.db-chain.testnet.arkiv.network -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"arkiv_query","params":["project = str('"'"'rasure/v1'"'"')",{"select":{"key":true,"creator":true,"expiresAt":true,"attributes":true},"limit":"0x64"}]}'
```

## Conformance notes for third-party readers

- Entities expire at their key-death block. A missing ride is normal, not an error.
- `payload` is ciphertext. Without a circle join link you can read attributes only. That is the privacy property, not a defect.
- Page with the cursor and pin every page to one block with `atBlock`; the node returns at most 200 entities per page.
- Anonymous queries cost 100 of 10,000 units per hour per IP. The app issues 3 to 5 queries per board load.
- `reader.html` in `apps/web/public` is a one-file reader written from this document alone.
