# Demo video script (2:50 maximum)

Record from the deployed app, with a real browser wallet so the signing popups show. Prepare two browser profiles (dispatcher and volunteer) and a second funded wallet for the forged ride. Run `npx tsx scripts/seed.ts` about an hour earlier so the demo circle has live rides, and keep `/proof` open in a tab for the numbers. Read every number off the screen from `docs/FACTS.json`; do not say a figure that is not on screen.

| Time | On screen | Voiceover |
|---|---|---|
| 0:00 | Paper title card: "23:40. A volunteer's phone is gone." Meera (fictional) in one line. | "Meera runs night dispatch for a volunteer driver network in Pune. She is fictional. The risk is not." |
| 0:12 | `/explorer-view`: paste the D1 transaction `0xf3f506c0140ad1b298c052ff3797d7ba9a9fa7a7651fd28643c9e54cca098ba6`. Show the decoded payload text. | "On Arkiv, expiry hides a record. It does not forget it. This entity expired long ago and its payload is still in the transaction that created it." |
| 0:35 | `/board`: connect the wallet (popup), create a circle (popup), post a ride (popup). Open the transaction on the explorer. | "Rasure seals each ride on the dispatcher's phone and writes only ciphertext and six attributes to Arkiv." |
| 0:55 | Volunteer profile: open the join QR link, claim (popup). Dispatcher: assign (popup). | "A volunteer joins from a link handed over in person, claims, and the dispatcher assigns." |
| 1:15 | The key-death strip counting down, then flipping at the death block; cards dissolve. Explorer shows the expiry block equals the key-death block. | "The expiry block is the key-destruction block. Every phone erases the key as Arkiv expires the record." |
| 1:40 | `/drill`: press Run the seizure. Three columns, then the rekeyed fourth. Point at the totals. | "Same rides, written four ways. A seized phone reads the current epoch and nothing older. After a rekey it reads nothing new." |
| 2:05 | Dispatcher board, Ignored panel: the forged ride with its creator address. Press Replay a ciphertext: refused. | "Trust comes from `$creator`, not from a field anyone can write. A copied ciphertext does not open in another epoch." |
| 2:20 | `/explorer-view` on a live Rasure entity: six attributes, ciphertext, the verdict line. | "A stranger on the explorer sees six attributes and bytes. Nothing personal." |
| 2:35 | `/proof` with a `curl` copied and run in a terminal; `/reader.html`. | "Read it without us." |
| 2:45 | Landing hero. | "Rasure. The board that forgets on schedule." |

Keep the wallet popups visible for at least one second each. Captions on for every line. No music over the voiceover. If you use text to speech, say so in the Devfolio form.
