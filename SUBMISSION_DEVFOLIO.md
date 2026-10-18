# Devfolio submission draft

Every field below is drafted from the repository. Items marked PENDING depend on the deployment, the video or Kinnoski. Never paste keys, seed phrases or RPC URLs with credentials into any answer.

## Standard fields

- **Project name:** Rasure
- **Tagline:** The dispatch board that forgets on schedule.
- **Project media:** screenshots in `docs/screens/` (landing, board, drill, stranger view, proof).
- **Project links:** repository `https://github.com/0xkinno/rasure`; demo video PENDING (2:50 or less).
- **Builders:** 0xkinno.
- **The problem it solves:** Survivor safe-transport volunteers share live pickups, and one lost phone can expose every past pickup. On Arkiv an expired entity is gone from the board but its payload stays in its creation transaction and in history queries, so expiry alone does not protect anyone, and one static encryption key turns one lost phone into a full history leak. Rasure binds each record's Entity Expiration to the destruction of the only key that can read it, so a seized phone reads tonight, never last week.
- **Challenges I ran into:** the faucet's sending wallet ran dry on the first day; a wide `$expiresAt` range query over all entities returned HTTP 504; `ExpirationTime.fromBlocks` takes a number while every other block value is a bigint; the SDK public client has no block watcher; the SDK returns typed attributes as `{ type, value }` objects, which silently broke our first trust filter until a live read exposed it. Each is in `arkiv/friction.md` or fixed in code.
- **Tracks:** Privacy, Security, Open Source, Censorship Resistance.

## Questions

1. **Live app URL:** PENDING (set after the Vercel deployment).
2. **Does any team member hold Indian nationality?** No.
3. **Why Arkiv?** On Postgres or our own API the operator holds the clock and the data, and nobody can show that expired means expired or that a ride was written by the dispatcher. IPFS has no expiry. A subgraph indexes forever. Arkiv gives Entity Expiration that the user sets and that the app binds to key destruction (the expiry block is the key-death block), immutable `$creator` for trust, typed attributes for queries, and live events. Without Arkiv's expiry the board would show rides whose keys are gone, and without `$creator` any wallet could forge a ride. What stays off Arkiv: names, places, keys, membership, plaintext.
4. **How do you use Arkiv?** See `SDK_SURFACE.md` for each feature with a file and line: Entity Expiration per type, Lifetime Extension of the circle lease, `readonly` flags with no permissionless extension (on purpose), typed attributes with `epoch` as u64, compound queries with `$creator` OR-lists and `NOT`, `createdBy()`, cursor pagination pinned with `atBlock`, `watchEntityEvents` on a WebSocket, `executeBatch` for assign plus close, historical queries for the drill.
5. **Friction report:** `https://github.com/0xkinno/rasure/blob/main/arkiv/friction.md`
6. **Wallet addresses that create entities:** dispatcher `0x0e02A09Fcdf1E2fe35F897Ab7A79b86B2a8B0771` (circle, ride, assign, closeout, rekey); volunteerA `0x31740a981E6c793907b51B877e2FBe518137c173` (claim, member); volunteerB `0x9257991047D23e58EF1b90e893924f9eB5AB25e3` (claim, member); forger `0xEa7b820BC735D519D2927658CD71bc1363578cAA` (forged ride and assign that must be ignored); probe `0x03a85A77ee3b49d9DC59451279620426c26879Fe` (discovery experiment); drip `0x4efb9C1bFC33b2079F117f05EB6a5CCdAd38a970` (test GLM transfers only). Judges' own wallets sign their writes.
7. **Schema:** `https://github.com/0xkinno/rasure/blob/main/arkiv/schema.md`
8. **How can judges reproduce your Arkiv usage?** (1) Open `/drill` and press Run the seizure: it fetches the creation transactions from the node and prints the totals in `docs/FACTS.json`. (2) Run `npx tsx scripts/discovery/d1-calldata.ts` (needs a funded probe wallet) and see the payload recovered from calldata after expiry; or paste `0xf3f506c0140ad1b298c052ff3797d7ba9a9fa7a7651fd28643c9e54cca098ba6` in `/explorer-view`. (3) Run the exact query: `curl` from `/proof` or `npx tsx scripts/rasure.ts board <circle> <dispatcher>`. (4) With a wallet, create a circle on `/board`, post a ride, open the transaction on the explorer, and press Post as a stranger from a second wallet.
9. **Pre-existing work reused:** None. (The core library, scripts and app were written between 9 and 18 October 2026. Earlier ideathon ideas were reused as concepts only, no code.) Baseline commit: the first commit of this repository.
10. **Arkiv surfaces used:** TypeScript SDK, Direct JSON-RPC, WebSocket events, Docs, Hub, Faucet, Access keys, Block Explorer, Arkiv skills.
11. **Other:** n/a.
12. **Time to first entity:** More than a day was not the case; PENDING exact answer from Kinnoski's timeline (the first funded write, the D1 probe, happened on 18 October 2026 after the faucet problem in friction item 2).
13. **LLMs used:** Claude (coding assistance). 
14. **One thing Arkiv should improve first:** Say plainly in the Entity Expiration docs that expiry does not remove the payload from the creation transaction or from history queries, and ship a sealed-payload helper.
15. **Open to a 20-minute feedback call:** PENDING (Kinnoski).
16. **Team's work, built 9 to 18 October, third-party work disclosed:** confirm.
17. **Repo is public under MIT and every link is accessible:** confirm after the repository is public.
18. **Attending Devcon 8:** optional, Kinnoski.
