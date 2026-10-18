import { ENTITY_EVENTS_ABI } from "@arkiv-network/sdk";
import { decodeEventLog, type Hex } from "viem";
import { ARKIV_ADDRESS } from "@rasure/core";
import { reader } from "./chain";

/**
 * Finds the transaction that created `entityKey` by scanning the creation block for Arkiv
 * transactions and matching the EntityCreated event in each receipt. Returns null if not found.
 */
export async function findCreationTx(entityKey: string, createdAtBlock: bigint): Promise<Hex | null> {
  const block = await reader.getBlock({ blockNumber: createdAtBlock, includeTransactions: true });
  for (const tx of block.transactions) {
    if (!tx.to || tx.to.toLowerCase() !== ARKIV_ADDRESS) continue;
    const rc = await reader.getTransactionReceipt({ hash: tx.hash });
    for (const log of rc.logs) {
      if (log.address.toLowerCase() !== ARKIV_ADDRESS) continue;
      try {
        const ev = decodeEventLog({ abi: ENTITY_EVENTS_ABI, data: log.data, topics: log.topics as [Hex, ...Hex[]] });
        if (ev.eventName === "EntityCreated" && String((ev.args as { entityKey: string }).entityKey).toLowerCase() === entityKey.toLowerCase()) {
          return tx.hash;
        }
      } catch {
        /* not an entity event */
      }
    }
  }
  return null;
}

export const toHex = (b: Uint8Array, max?: number) =>
  "0x" + Array.from(max ? b.slice(0, max) : b).map((x) => x.toString(16).padStart(2, "0")).join("");

/** Shannon entropy in bits per byte. Ciphertext sits near 8; JSON text sits near 4 to 5. */
export function entropy(b: Uint8Array): number {
  if (b.length === 0) return 0;
  const f = new Array(256).fill(0);
  for (const x of b) f[x]++;
  return -f.reduce((s, n) => (n ? s + (n / b.length) * Math.log2(n / b.length) : s), 0);
}
