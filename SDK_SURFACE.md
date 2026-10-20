# SDK surface

`@arkiv-network/sdk` 0.8.1 on Tiramisu. Every row changes something the user sees and has a transaction or result file that shows it ran live (see [arkiv/evidence.md](arkiv/evidence.md)). Links are file and line at the time of writing.

| Feature | How and why | Code | What the user sees | Live proof |
|---|---|---|---|---|
| Entity Expiration per type | sealed records expire at `keyDeathBlock(epoch)` with `ExpirationTime.atBlock`; the circle is a 30 day lease with `fromBlocks`; tally 90 days; member and rekey have their own lifetimes | [writes.ts:66](packages/core/src/writes.ts), [writes.ts:45](packages/core/src/writes.ts), [writes-more.ts:49](packages/core/src/writes-more.ts), [writes-rekey.ts](packages/core/src/writes-rekey.ts) | cards dissolve at key death; countdown strip | `seed-manifest.json`, `proof/results/cost-*.json` (I1 on 13 rides) |
| Lifetime Extension | `extendEntity` renews the circle lease (a button, and the night watch when under 7 days remain); only to a later block | [writes.ts:120](packages/core/src/writes.ts), [night-watch.ts](scripts/night-watch.ts) | "Network active until block N", Renew lease | `proof/results/extend-*.json` |
| Creation flags (`readonly`) | on every sealed record; no permissionless extension on them, on purpose | [writes.ts:67](packages/core/src/writes.ts) | "Fixed since creation (readonly)" | seed rides |
| `permissionlessExtension` | tallies only: a funder extends the service record without owning it | [writes-more.ts:86](packages/core/src/writes-more.ts), [writes-more.ts:95](packages/core/src/writes-more.ts) | "Keep alive" on a tally | `proof/results/tally-*.json` |
| Attributes vs payload | at most six public attributes, `epoch` and `served` as u64, zone only as a rotating blind tag | [writes.ts:42](packages/core/src/writes.ts), [schema.ts](packages/core/src/schema.ts) | stranger view shows nothing personal | `leak-audit-*.json` |
| Queries | compound predicates, `$creator` OR-lists, `NOT` for forgeries, ranges on `epoch` and `$expiresAt` | [queries.ts](packages/core/src/queries.ts), [BoardClient.tsx:220](apps/web/components/board/BoardClient.tsx) | board, Ignored panel, "dies in the next 10 minutes" | `expiresRange-*.json` |
| `createdBy()` | circle anchor and "my claims" filtered by the SDK `createdBy()` | [read.ts:102](packages/core/src/read.ts), [BoardClient.tsx:183](apps/web/components/board/BoardClient.tsx), [BoardClient.tsx:234](apps/web/components/board/BoardClient.tsx) | network badge; "your live claims" | board runs |
| `ownedBy()` | "Networks I hold" uses `.ownedBy(me)` on circle anchors | [read.ts:103](packages/core/src/read.ts), [BoardClient.tsx:228](apps/web/components/board/BoardClient.tsx) | "Networks I hold" | `handover-*.json` (held counts) |
| `$creator` and `$owner` | trust for rides (I4, I9) and assignments (I7); the holder at the ride's block via `atBlock` | [decide.ts:76](packages/core/src/decide.ts), [decide.ts:81](packages/core/src/decide.ts), [decide.ts:32](packages/core/src/decide.ts) | "written by" and "held by", Ignored panel | `handover-*.json` (old holder's ride ignored) |
| `changeOwnership` | shift handover, batched with a sealed handover record | [writes-more.ts:58](packages/core/src/writes-more.ts), [BoardClient.tsx:414](apps/web/components/board/BoardClient.tsx) | handover banner | `handover-*.json` |
| `patchEntity` | a rekey patches the circle's public `gen`, in one batch with the rekey entity | [writes-more.ts:75](packages/core/src/writes-more.ts), [BoardClient.tsx:438](apps/web/components/board/BoardClient.tsx) | "Circle rekeyed, generation N" | `gen-*.json` |
| `deleteEntity` | cancel a ride, withdraw a claim | [writes-more.ts:37](packages/core/src/writes-more.ts), [BoardClient.tsx:380](apps/web/components/board/BoardClient.tsx), [BoardClient.tsx:390](apps/web/components/board/BoardClient.tsx) | the card leaves every board; honest note that only key death makes it unreadable | `delete-*.json` |
| Batch writes | assign plus close; circle plus first ride; rekey plus patch; handover plus transfer | [writes.ts:111](packages/core/src/writes.ts), [writes-more.ts:99](packages/core/src/writes-more.ts), [BoardClient.tsx:401](apps/web/components/board/BoardClient.tsx) | one popup, both land or neither | `batch-*.json`, `openNetwork-*.json` |
| Cursor pagination pinned with `atBlock` | every page of a walk is read at one block | [read.ts:104](packages/core/src/read.ts) | consistent board | leak audit and CLI |
| WebSocket entity events | `watchEntityEvents` on a WebSocket, no `fromBlock`; deletes and ownership transfers move the board | [BoardClient.tsx:119](apps/web/components/board/BoardClient.tsx) | the board updates without refresh | `events-*.json` (network-wide events observed) |
| Historical queries (`atBlock`) | the drill, the audits and D2 read the past on purpose | [d2-atblock.ts:24](scripts/discovery/d2-atblock.ts), [leak-audit.ts:23](scripts/leak-audit.ts) | drill rows | `d2-*.json` |
| `arkiv-encryption@0.1.0` (evaluated, not used) | its envelope has no additional authenticated data, so it cannot bind a ciphertext to circle, epoch and type (I5); we kept AES-256-GCM with AAD and suggested an optional `aad` parameter | [scripts/repro/aad-replay.mjs](scripts/repro/aad-replay.mjs), [friction.md](arkiv/friction.md) | nothing: a replayed record is refused | `node scripts/repro/aad-replay.mjs` |
| Direct JSON-RPC | calldata recovery with `eth_getTransactionByHash`; the drill with no SDK | [calldata.ts](packages/core/src/calldata.ts), [examples/raw-drill.mjs](examples/raw-drill.mjs) | drill, stranger view, proof | `d1-*.json` |

## Not used, so not claimed

- `createCircleWithRide` in `packages/core/src/writes.ts` is superseded by `openNetwork` (same batch, used by the UI).
- The reader's Rewind lives in the static `apps/web/public/reader.html`, not in the app UI.
- Lifetime Extension is simply never called on sealed records; `readonly` does not by itself forbid an owner extension.

## Surfaces used (for the Devfolio form)

TypeScript SDK, Direct JSON-RPC, WebSocket events, Docs, Hub (access key), Faucet (see friction item 2), Block Explorer, Data Explorer, Arkiv MCP, Arkiv skills, and the `arkiv-encryption` package (evaluated).

What each did:

- **Arkiv skills:** guided the SDK calls while building (entity creation, queries, expiry); nothing from them ships in the product.
- **Arkiv MCP:** `scripts/mcp-verify.mjs` asked it to confirm our demo transactions and entities independently. It agreed on 34 of 34 receipts and returns metadata only ([friction 10](arkiv/friction.md)). Outside the product.
- **Data Explorer:** deep links from the proof page, the explorer view and the drill open the same entity or query in Arkiv's own tool, so a judge can check us against it.
- **`arkiv-encryption`:** evaluated and not adopted, see [friction 13](arkiv/friction.md).
