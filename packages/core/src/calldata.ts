// Recover every attribute, payload included, from an Arkiv write transaction's input data.
//
// Discovery D1 (read from @arkiv-network/sdk 0.8.1 source, to be confirmed live in Gate 2):
//   src/attr/attributes.ts  -> the payload travels as the `$payload` system attribute (raw bytes)
//   src/entity/operations.ts -> execute((uint8 operation, bytes operationData)[] ops)
//   src/consts.ts            -> sent to 0x4400000000000000000000000000000000000044
// So the payload of every entity ever created sits, uncompressed, in its creation transaction.
// Entity Expiration removes it from current state. It does not remove it from the chain.
//
// The ABI strings below are copied from SDK 0.8.1. If the SDK version changes, re-check them.

import { decodeAbiParameters, decodeFunctionData, hexToBytes, hexToString, parseAbi, parseAbiParameters, type Hex } from "viem";

export const ARKIV_ADDRESS = "0x4400000000000000000000000000000000000044" as const;
export const EXECUTE_ABI = parseAbi([
  "function execute((uint8 operation, bytes operationData)[] ops) external returns (bytes32[] keys)",
]);
const ATTRIBUTE_TUPLE = "(bytes32 name, uint8 typeId, bytes value)[]";
export const CREATE_PARAMS = parseAbiParameters(
  `(uint128 salt, uint64 expiresAt, uint64 minLifetime, uint8 creationFlags, ${ATTRIBUTE_TUPLE} attributes)`,
);
export const OP_CREATE = 1;

export interface RecoveredCreate {
  index: number;
  expiresAt: bigint;
  creationFlags: number;
  attributes: Record<string, Hex>;
  payload: Uint8Array | null;
}

function nameOf(b32: Hex): string {
  return hexToString(b32, { size: 32 }).replace(/\0+$/, "");
}

export function recoverCreates(input: Hex): RecoveredCreate[] {
  const { functionName, args } = decodeFunctionData({ abi: EXECUTE_ABI, data: input });
  if (functionName !== "execute") return [];
  const ops = args[0];
  const out: RecoveredCreate[] = [];
  ops.forEach((op, index) => {
    if (op.operation !== OP_CREATE) return;
    const [c] = decodeAbiParameters(CREATE_PARAMS, op.operationData);
    const attributes: Record<string, Hex> = {};
    let payload: Uint8Array | null = null;
    for (const a of c.attributes) {
      const name = nameOf(a.name);
      attributes[name] = a.value;
      if (name === "$payload") payload = hexToBytes(a.value);
    }
    out.push({ index, expiresAt: c.expiresAt, creationFlags: c.creationFlags, attributes, payload });
  });
  return out;
}
