# For judges

Live app: the link is in the README once deployed (pending). All three walks use real Tiramisu data; until then, run the app locally.

## 60 seconds, no wallet

1. Open the landing page and read the one-line pitch.
2. Open `/drill` and press **Run the seizure**. Your browser fetches each creation transaction from the node, recovers the payload from calldata, and tries to open it with only what the seized phone holds. Totals match `docs/FACTS.json`.
3. Open `/explorer-view` and read the verdict line for a live entity, or paste the D1 creation transaction `0xf3f506c0140ad1b298c052ff3797d7ba9a9fa7a7651fd28643c9e54cca098ba6`: the entity is long expired, and its payload is still in the transaction input.

## 3 minutes, no wallet

1. Do the 60 second walk.
2. On `/proof`, copy a `curl` for one query and run it in a terminal.
3. Read `arkiv/schema.md` (entity types, attributes, Entity Expiration rules, queries).
4. Read `arkiv/friction.md`, item 3 and item 4, and reproduce them with `npx tsx scripts/discovery/d1-calldata.ts` and `d2-atblock.ts` (needs a funded probe wallet).
5. Read the board without the site: `npx tsx scripts/rasure.ts board <circle> <dispatcher>`, or open `/reader.html`.

## 10 minutes, with a wallet

1. On `/board` connect a wallet. The modal adds Tiramisu (chain 7738577). Use **Get test GLM** if the balance is zero.
2. Create a circle (one transaction). Show the join QR. Post a ride. Open the transaction on the explorer.
3. Open the join link in a second browser profile and claim the ride. Back as the dispatcher, assign it.
4. Press **Post as a stranger** from a second wallet. The forged ride appears under "Ignored" with its creator address.
5. Press **Replay a ciphertext into this epoch**. It is refused locally by the additional authenticated data.
6. Wait for key death (demo circles use 10 minute epochs, key death two epochs after the epoch start). The strip flips, the card dissolves, and the explorer shows the same block as the expiry.
7. Publish a device key as the volunteer, then rekey as the dispatcher while removing that member. Later rides stay sealed to the removed phone.

Persona and data are fictional and synthetic. Every place string starts with `SYN-`.
