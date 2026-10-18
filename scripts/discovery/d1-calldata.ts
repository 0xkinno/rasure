// D1: an expired Arkiv entity's payload is still recoverable from its creation transaction.
// Synthetic text only. Writes proof/results/d1-<date>.json.
import { ExpirationTime, NoEntityFoundError } from "@arkiv-network/sdk";
import { recoverCreates, ARKIV_ADDRESS } from "@rasure/core";
import { EXPLORER, reader, today, walletFor, writeResult, sleep, accountFor } from "../lib";

const c = reader();
const w = walletFor("probe");
const text = `SYN-probe-${Date.now()}`;
const payload = new TextEncoder().encode(text);

console.log("creating probe entity from", accountFor("probe").address);
const created = await w.createEntity({
  attributes: { project: "rasure/probe" },
  payload,
  contentType: "text/plain",
  expires: ExpirationTime.fromBlocks(30),
});
const receipt = await c.getTransactionReceipt({ hash: created.txHash });
console.log("tx", created.txHash, "block", receipt.blockNumber, "expiresAt", created.expiresAt);

// Wait until the head is past expiry, then confirm the entity is gone from live state.
for (;;) {
  const head = await c.getBlockNumber({ cacheTime: 0 });
  if (head > created.expiresAt) {
    console.log("head", head, "is past expiry");
    break;
  }
  await sleep(4000);
}
let liveAfterExpiry = true;
try {
  await c.getEntity(created.entityKey);
} catch (e) {
  if (e instanceof NoEntityFoundError) liveAfterExpiry = false;
  else throw e;
}
console.log("getEntity after expiry returns an entity:", liveAfterExpiry);

// Recover the payload from the creation transaction input.
const tx = await c.getTransaction({ hash: created.txHash });
const creates = recoverCreates(tx.input);
const recovered = creates[0]?.payload ? new TextDecoder().decode(creates[0].payload) : null;
const match = recovered === text;
console.log("target", tx.to, "recovered payload:", recovered, "match:", match);

const out = {
  experiment: "D1 payload lives in calldata",
  date: today(),
  sdk: "@arkiv-network/sdk@0.8.1",
  chainId: 7738577,
  prober: accountFor("probe").address,
  txHash: created.txHash,
  txUrl: `${EXPLORER}/tx/${created.txHash}`,
  entityKey: created.entityKey,
  createdBlock: receipt.blockNumber,
  expiresAt: created.expiresAt,
  txTarget: tx.to,
  targetIsArkivSystemAddress: tx.to?.toLowerCase() === ARKIV_ADDRESS,
  liveAfterExpiry,
  payloadSent: text,
  payloadRecoveredFromCalldata: recovered,
  recoveredByteForByte: match,
  recoveredAttributeNames: creates[0] ? Object.keys(creates[0].attributes) : [],
  inputBytes: (tx.input.length - 2) / 2,
  verdict:
    !liveAfterExpiry && match
      ? "CONFIRMED: expired, gone from live state, payload still readable from calldata"
      : "UNKNOWN: see fields",
};
console.log("wrote", writeResult(`d1-${today()}.json`, out));
console.log(out.verdict);
if (liveAfterExpiry || !match) process.exitCode = 2;
