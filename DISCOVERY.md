# DISCOVERY

Status: D1 and D2 confirmed live on Tiramisu on 2026-10-18, plus a wild-set measurement.

## Primitive

Arkiv Entity Expiration. An entity is live only while `queryBlock < expiresAt`; after that `getEntity` throws `NoEntityFoundError`.

## Constraint

Every write is a transaction to `0x4400000000000000000000000000000000000044` whose input data carries the payload. SDK 0.8.1 evidence:
- `src/attr/attributes.ts`: the payload travels as the `$payload` system attribute, raw bytes.
- `src/entity/operations.ts`: `execute((uint8 operation, bytes operationData)[] ops)`; create = `(uint128 salt, uint64 expiresAt, uint64 minLifetime, uint8 creationFlags, (bytes32 name, uint8 typeId, bytes value)[] attributes)`.
- The SDK ships a brotli helper (`src/utils/compression.ts`) that is not used on the write path.

So the payload of every entity ever created sits uncompressed in its creation transaction. Expiry removes it from live state, not from the chain.

## Evidence

- D1 (`scripts/discovery/d1-calldata.ts`): CONFIRMED. Probe entity created in tx `0xf3f506c0140ad1b298c052ff3797d7ba9a9fa7a7651fd28643c9e54cca098ba6` (block 739910, expiry 739940). After expiry `getEntity` found nothing; the payload `SYN-probe-1792329579632` was recovered byte for byte from the transaction input (target `0x4400...0044`). `proof/results/d1-2026-10-18.json`.
- D2 (`scripts/discovery/d2-atblock.ts`): `atBlock` 739910, 739911, 739939 returned the entity and payload; 739940 and later returned none. Block 1 answered, so no retention boundary was found (about 411 hours of history). `proof/results/d2-2026-10-18.json`.
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
npx tsx scripts/balances.ts             # fund the probe first
npx tsx scripts/discovery/d1-calldata.ts
npx tsx scripts/discovery/d2-atblock.ts
npx tsx scripts/expiry-audit.ts --back=600 --max=300
```

Textbook check: hash ratchets and forward secrecy are known (Signal's symmetric ratchet). The claim here is the measured behaviour on Arkiv and the binding of Entity Expiration to key death.
