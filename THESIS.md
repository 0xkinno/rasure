# THESIS

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
PROOF:      Seizure Drill on real Tiramisu history. Same rides, three designs (plus a rekeyed fourth).
            Plaintext: N/N past rides exposed. One static key: N/N exposed. Rasure: only the current
            epoch, 0 of the past. Plus a public expiry audit of other Tiramisu entities (aggregate).
```

## Name

Rasure is the archival term for scraping writing off a manuscript. The product scrapes a record out of every phone at the moment Arkiv expires it.

## Primary guarantee

A phone seized at time T can read records sealed in the current and grace epoch, and no record sealed earlier, even with the whole chain history in hand.

## What is and is not new

Hash ratchets and forward secrecy are known (Signal's symmetric ratchet). They are not claimed as inventions. The headline is the measured discovery on Arkiv, plus the binding of Entity Expiration to key death, so that the expiry block is the key-destruction block.

## Invariants

| Id | Invariant |
|---|---|
| I1 | A sealed entity's `expiresAt` equals the key-death block of its epoch |
| I2 | A device never holds a chain key past its death block |
| I3 | No Rasure entity carries a public attribute outside the allowlist |
| I4 | A ride counts only if its `$creator` is a trusted dispatcher |
| I5 | A ciphertext opens only in its own circle, epoch and type |
| I6 | No Rasure creation transaction contains plaintext |
| I7 | An assignment counts only if the ride's dispatcher created it |
| I8 | A seized phone cannot open any record from an epoch before its newest key |

## Test for the dependency on Arkiv

If Entity Expiration is removed, the board shows rides whose keys every phone has destroyed, and the test `board hides records whose key is dead` fails. If the ratchet is removed, `seizure drill: ratchet` fails because history becomes readable.
