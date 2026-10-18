# SDK surface

`@arkiv-network/sdk` 0.8.1 on Tiramisu. Every row changes something the user sees. Links are file and line in this repository at the time of writing.

| Feature | How and why | Code | What the user sees |
|---|---|---|---|
| Entity Expiration per type | rides, claims, assigns, closeouts expire at `keyDeathBlock(epoch)` with `ExpirationTime.atBlock`; the circle is a 30 day lease with `fromBlocks`; rekey and member entities have their own lifetimes | [writes.ts:65](packages/core/src/writes.ts), [writes.ts:44](packages/core/src/writes.ts), [writes-rekey.ts](packages/core/src/writes-rekey.ts) | cards dissolve at key death; countdown strip |
| Lifetime Extension | `extendEntity` renews the circle lease, only to a later block | [writes.ts:122](packages/core/src/writes.ts) | "Network active until block N", Renew lease button |
| Creation flags | `readonly: true` on every sealed record; no permissionless extension, on purpose | [writes.ts:66](packages/core/src/writes.ts) | "Fixed since creation (readonly)" on each card |
| Attributes vs payload | at most 6 public attributes, `epoch` as u64 for ranges, zone only as a rotating blind tag, all content sealed | [writes.ts:39](packages/core/src/writes.ts), [schema.ts](packages/core/src/schema.ts) | stranger view shows nothing personal |
| Queries | compound predicates, OR-lists of `$creator`, `NOT` for forgeries, ranges on `epoch` and `$expiresAt` | [queries.ts](packages/core/src/queries.ts) | board, Ignored panel, audits |
| `createdBy()` | the circle anchor (Q6) and "my claims" (Q5) are filtered by the SDK `createdBy()` | [read.ts:101](packages/core/src/read.ts), [BoardClient.tsx:167](apps/web/components/board/BoardClient.tsx) | network badge; "your live claims" |
| `$creator` | trust for rides (I4) and assignments (I7) | [decide.ts:16](packages/core/src/decide.ts), [decide.ts:27](packages/core/src/decide.ts) | "Ignored: not written by a trusted dispatcher" |
| Cursor pagination pinned with `atBlock` | every page of a walk is read at one block; a changed snapshot aborts | [read.ts:101](packages/core/src/read.ts) | consistent board |
| WebSocket entity events | `watchEntityEvents` on a WebSocket transport, no `fromBlock` | [BoardClient.tsx:105](apps/web/components/board/BoardClient.tsx) | the board updates without refresh |
| Batch writes | `executeBatch` assigns one claim and closes a previous ride in one transaction | [writes.ts:110](packages/core/src/writes.ts) | one wallet popup, both land or neither |
| Historical queries (`atBlock`) | the drill, the leak audit and D2 read the past on purpose | [d2-atblock.ts:24](scripts/discovery/d2-atblock.ts), [leak-audit.ts:23](scripts/leak-audit.ts) | drill rows |
| Direct JSON-RPC | calldata recovery with `eth_getTransactionByHash`, curl for every query | [calldata.ts](packages/core/src/calldata.ts) | drill, stranger view, proof page |

## Not used, so not claimed

- `patchEntity`, `deleteEntity`, `changeOwnership`: no Rasure type is edited, deleted early or transferred.
- `permissionlessExtension`: refused on purpose (see schema.md).
- `createCircleWithRide` (circle plus first ride in one batch) exists in `packages/core/src/writes.ts` and is unit-tested for shape, but the app UI does not call it.
- Arkiv MCP, Arkiv plugin, Data Explorer: not used by the product. The Devfolio MCP was read for rules during the build.

## Surfaces used (for the Devfolio form)

TypeScript SDK, Direct JSON-RPC, WebSocket events, Docs, Hub (access key), Faucet (see friction item 2), Block Explorer, Arkiv skills.
