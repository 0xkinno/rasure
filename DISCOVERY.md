# DISCOVERY

Status: source evidence read, live confirmation NOT YET RUN (needs a funded probe wallet). The wild-set measurement below is live.

## Primitive

Arkiv Entity Expiration. An entity is live only while `queryBlock < expiresAt`; after that `getEntity` throws `NoEntityFoundError`.

## Constraint

Every write is a transaction to `0x4400000000000000000000000000000000000044` whose input data carries the payload. SDK 0.8.1 evidence:
- `src/attr/attributes.ts`: the payload travels as the `$payload` system attribute, raw bytes.
- `src/entity/operations.ts`: `execute((uint8 operation, bytes operationData)[] ops)`; create = `(uint128 salt, uint64 expiresAt, uint64 minLifetime, uint8 creationFlags, (bytes32 name, uint8 typeId, bytes value)[] attributes)`.
- The SDK ships a brotli helper (`src/utils/compression.ts`) that is not used on the write path.

So the payload of every entity ever created sits uncompressed in its creation transaction. Expiry removes it from live state, not from the chain.

## Evidence

- D1 (`scripts/discovery/d1-calldata.ts`): create a synthetic probe, wait past expiry, confirm absent from live state, recover the payload from `tx.input`. Result file `proof/results/d1-<date>.json`. NOT YET RUN.
- D2 (`scripts/discovery/d2-atblock.ts`): query the expired entity `atBlock`, record whether the payload returns and the oldest block the node answers. NOT YET RUN.
- Wild set, live on 2026-10-18 (`scripts/expiry-audit.ts`, `proof/results/wild-2026-10-18.json`): 300 public entities alive at block 738,949 and expired by block 739,549, read `atBlock(738949)`: 294 returned a payload, 12 were readable JSON or text. Aggregate only.

## Why other designs fail

A design that sets a short expiry and encrypts with one static key loses everything when one device is lost, because the ciphertext and the key both survive. A design that relies on expiry alone loses everything to anyone who reads history or calldata.

## Capability

Bind each record's Entity Expiration to the destruction of the only key that can read it. A one-way ratchet erases the key on every phone at the block where Arkiv expires the record.

## Invariant

I1: `expiresAt == keyDeathBlock(epoch)`. See THESIS.md for I1 to I8.

## Failure mode

The current and grace epoch are readable from a seized phone by design. A leaked join link exposes its epoch and later ones until the circle is rekeyed.

## Reproduction

```bash
npx tsx scripts/keys.ts                 # once
npx tsx scripts/balances.ts             # fund the probe from the faucet first
npx tsx scripts/discovery/d1-calldata.ts
npx tsx scripts/discovery/d2-atblock.ts
npx tsx scripts/expiry-audit.ts --back=600 --max=300
```

Textbook check: hash ratchets and forward secrecy are known (Signal's symmetric ratchet). The claim here is the measured behaviour on Arkiv and the binding of Entity Expiration to key death.
