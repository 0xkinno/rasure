# Friction report

Builder: 0xkinno. Event: Arkiv Global Tour Stop. Network: Tiramisu (chain 7738577).
Versions used: `@arkiv-network/sdk` 0.8.1, `viem` 2.57.7, Node 24.14.1, Windows 10, Chrome. Dates are 2026.

Every item below was hit or measured by us. Items that depend on a funded write are marked NOT YET RUN and carry the script that will produce the evidence. Nothing here is invented.

## 1. A wide `$expiresAt` range query over all entities returns HTTP 504

- **Surface:** `arkiv_query` through the SDK `select().where().atBlock()`.
- **Expected:** a page of entities, or a `QueryError` that says the query is too broad.
- **Actual:** with `$expiresAt > past AND $expiresAt <= head - 1` pinned `atBlock(past)` over the whole public set (past = head - 2000 and head - 300), the gateway answered `HTTP 504` after about 40 seconds. With viem's default 10 s timeout the same call fails earlier with "The request took too long to respond". Narrow windows of 40 blocks (`$expiresAt > lo AND <= lo + 40`) pinned to the same past block worked: 300 entities were read across 8 pages, then one window returned 504 again.
- **Reproduce:** `npx tsx scripts/expiry-audit.ts --back=600 --max=300`; raw output in `proof/results/wild-2026-10-18.json`.
- **What would fix it:** return a typed `QueryError` (for example kind `"cost"` or `"timeout"`) with the node's budget, or document a maximum range width for `$expiresAt` on history reads. The SDK could expose a `timeout` option on the select builder, since the 10 s transport default is below what these reads need.

## 2. The Tiramisu faucet failed with insufficient funds on its own sending wallet

- **Surface:** Hub faucet at `https://hub.arkiv.network/faucet`.
- **Expected:** test GLM arrives at the requested address.
- **Actual:** the faucet reported "Could not send tokens: insufficient funds for gas * price + value: have 9995400999990802000 want 10000000000000000000". The sending address held 9.9954 and tried to send 10 (the message labels the unit ETH; the chain currency is GLM).
- **Observed:** 2026-10-18, browser wallet session, viem 2.51.3 shown in the error footer. No script; this is a UI error report.
- **Impact:** a builder cannot create a first entity until a transfer arrives from elsewhere.
- **What would fix it:** a smaller drip amount that the faucet wallet can always cover, a visible faucet balance on the page, and an alert to the Arkiv team when it falls below one drip.

## 3. Expiry is not erasure: payload recoverable from calldata (D1)

- **Surface:** Entity Expiration, `getEntity`, `eth_getTransactionByHash`.
- **Expected:** an expired entity's payload is gone.
- **Actual:** the entity was absent from live state (`getEntity` threw `NoEntityFoundError`) and its payload was recovered byte for byte from the creation transaction input. The transaction target was the Arkiv system address `0x4400000000000000000000000000000000000044`.
- **Run:** 2026-10-18. Probe wallet `0x03a85A77ee3b49d9DC59451279620426c26879Fe` created a synthetic entity (`SYN-probe-...`, 30 blocks) in transaction `0xf3f506c0140ad1b298c052ff3797d7ba9a9fa7a7651fd28643c9e54cca098ba6`, block 739910, expiry block 739940. After head 739942 `getEntity` returned nothing and the decoded calldata payload matched.
- **Reproduce:** `npx tsx scripts/discovery/d1-calldata.ts`. Output: `proof/results/d1-2026-10-18.json`.
- **What would fix it:** a callout on the Entity Expiration docs page saying expiry removes live state only, and an optional SDK helper for sealed payloads.

## 4. Historical queries return an entity up to its last live block; no retention limit observed (D2)

- **Surface:** `select(...).where(eq("$key", key)).atBlock(n)`.
- **Expected:** history may be unavailable or short; a query after expiry may still return the entity.
- **Actual on the D1 entity:** `atBlock` 739910, 739911 and 739939 (before expiry) returned the entity with its payload. `atBlock` 739940 (the expiry block), 739941 and the head returned no entity. So history reads return a payload for every block up to `expiresAt - 1`, and nothing from `expiresAt` on, matching the "live while `queryBlock < expiresAt`" rule.
- **Retention:** block 1 answered a historical query (no `QueryError` of kind `"block"`), so the node held the full history of about 411 hours at the time of the run. We did not find a retention boundary. The boundary may exist on other nodes or later.
- **Reproduce:** `npx tsx scripts/discovery/d2-atblock.ts` after D1. Output: `proof/results/d2-2026-10-18.json`.
- **Reading:** an expired entity is readable at any earlier block, and always from calldata. Confidentiality therefore needs encryption, not expiry.

## 5. Wild-set measurement of item 3 on other builders' entities

- **Surface:** history reads on Tiramisu.
- **Measured (aggregate only, no content, keys, creators or project names kept):** 300 entities that were alive at block 738,949 and had expired by block 739,549 were read `atBlock(738949)` on 2026-10-18; 294 returned a non-empty payload, 12 of those parsed as JSON or readable text, 282 were binary or encrypted, 6 were empty. See `proof/results/wild-2026-10-18.json`.
- **Reading:** history queries do return payloads of entities that have expired, and some are plaintext. Expiry removes live state only.

## 6. `ExpirationTime.fromBlocks` takes a number, not a bigint

- **Expected:** `fromBlocks(bigint)`, since block heights and `atBlock` are bigint.
- **Actual:** `fromBlocks(1296000n)` throws `InvalidExpiryError: a lifetime must be a positive whole number of blocks, got 1296000`, and TypeScript reports `bigint` not assignable to `number`. The error text does not say the argument must be a `number`.
- **Reproduce:** `packages/core/src/writes.ts` before the fix; unit test `circle anchor has the public attributes only`.
- **What would fix it:** accept `number | bigint`, or word the error as "expected a number".

## 7. `watchBlockNumber` is not on the Arkiv public client

- **Expected:** one client with both entity events and head blocks for the live board.
- **Actual:** the SDK public client has `watchEntityEvents` but no `watchBlockNumber`; TypeScript reports the property does not exist. We create a viem public client on the same WebSocket URL for heads.
- **Reproduce:** `apps/web/components/board/BoardClient.tsx`.
- **What would fix it:** re-export viem's public actions on the Arkiv public client, or document the pairing.

## Paths that worked, tested with the same rigour

| Path | Expected | Result |
|---|---|---|
| Direct `arkiv_query` by curl with the Hub key in `X-API-KEY` | A JSON-RPC result | `{"result":{"data":[],"blockNumber":"0xb47b6"}}` for `project = str('rasure/v1')` before any Rasure entity existed |
| Predicate rendering | A string the node accepts | `render()` produced `project = str('rasure/v1') AND ... AND ($creator = addr(0x..) OR $creator = addr(0x..))` and the node parsed it |
| Public RPC reachability | Head block | `eth_blockNumber` answered, head about 739,500 on 2026-10-18, blocks about 2 s apart |
| WebSocket heads in the browser | Live updates | `watchBlockNumber` over `wss://rpc.tiramisu.db-chain.testnet.arkiv.network` updated the board header without reload |
| Official Arkiv MCP (`https://mcp.arkiv.network/devfolio`) | Docs and rubric retrieval | `initialize`, `tools/list` and `search_knowledge` answered; it has no faucet or funding tool |
