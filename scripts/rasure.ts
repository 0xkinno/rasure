// Reads Arkiv without the site.
//   npx tsx scripts/rasure.ts board <circle> <dispatcher,...>        counted and ignored rides, attributes only
//   npx tsx scripts/rasure.ts verify <entityKey>                      attributes, creator, expiry, creation tx decode
//   npx tsx scripts/rasure.ts drill                                   re-run the seizure drill from proof/drill-manifest.json
//   npx tsx scripts/rasure.ts audit                                   leak audit (same as scripts/leak-audit.ts)
// Uses ARKIV_ACCESS_KEY from .env.local when present; anonymous otherwise.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "@arkiv-network/sdk/query";
import { key } from "@arkiv-network/sdk/attr";
import { ENTITY_EVENTS_ABI } from "@arkiv-network/sdk";
import { decodeEventLog, type Hex } from "viem";
import {
  ARKIV_ADDRESS, epochAt, fetchAll, partitionRides, q1OpenBoard, q4Forged, q6Circle, recoverCreates, render, seizureDrill, summarize, toChainEntity,
  type HistoricalRecord,
} from "@rasure/core";
import { ROOT, reader } from "./lib";
import { unhex } from "./helpers";

const [cmd, ...rest] = process.argv.slice(2);
const c = reader();
const json = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x), 2);

async function board(circle: string, dispatchers: string[]) {
  const head = await c.getBlockNumber({ cacheTime: 0 });
  const anchor = await fetchAll(c as never, { key: true, creator: true, attributes: true }, q6Circle(circle), { atBlock: head });
  const a = (anchor.entities as any[]).find((e) => dispatchers.map((d) => d.toLowerCase()).includes(String(e.creator).toLowerCase()));
  if (!a) return console.log("no circle anchor created by a trusted dispatcher at head", head.toString());
  const at = toChainEntity(a).attributes;
  const clock = { genesisBlock: BigInt(at.genesis as string), epochBlocks: BigInt(at.epoch_blocks as string) };
  const epoch = epochAt(clock, head);
  const sel = { key: true, creator: true, owner: true, expiresAt: true, attributes: true } as const;
  console.log("Q1", render(q1OpenBoard(circle, epoch, dispatchers)));
  const rides = await fetchAll(c as never, sel, q1OpenBoard(circle, epoch, dispatchers), { atBlock: head });
  const forged = await fetchAll(c as never, sel, q4Forged(circle, dispatchers), { atBlock: head });
  const { counted } = partitionRides((rides.entities as any[]).map(toChainEntity), dispatchers);
  console.log(`head ${head} epoch ${epoch}: ${counted.length} counted ride(s) (payloads are ciphertext), ${forged.entities.length} ignored`);
  for (const r of counted) console.log("  counted", r.key, "epoch", String(r.attributes.epoch), "expiresAt", r.expiresAt.toString());
  for (const f of forged.entities as any[]) console.log("  ignored (not a trusted creator)", f.key, "creator", f.creator);
}

async function verify(entityKey: string) {
  const r = await c.select({ key: true, creator: true, owner: true, createdAt: true, expiresAt: true, attributes: true, payload: true }).where(eq("$key", key(entityKey as Hex))).fetch();
  const e = r.entities[0] as any;
  if (!e) return console.log("not live (expired, deleted or never existed). Use a creation tx hash with `verify-tx`.");
  console.log(json({ key: e.key, creator: e.creator, expiresAt: e.expiresAt, attributes: toChainEntity(e).attributes, payloadBytes: e.payload?.length ?? 0 }));
  const block = await c.getBlock({ blockNumber: BigInt(e.createdAt), includeTransactions: true });
  for (const tx of block.transactions) {
    if (tx.to?.toLowerCase() !== ARKIV_ADDRESS) continue;
    const rc = await c.getTransactionReceipt({ hash: tx.hash });
    for (const log of rc.logs) {
      try {
        const ev = decodeEventLog({ abi: ENTITY_EVENTS_ABI, data: log.data, topics: log.topics as [Hex, ...Hex[]] });
        if (ev.eventName === "EntityCreated" && String((ev.args as { entityKey: string }).entityKey).toLowerCase() === entityKey.toLowerCase()) {
          console.log("creation tx", tx.hash);
          for (const x of recoverCreates(tx.input)) console.log("  decoded create", json({ expiresAt: x.expiresAt, attributes: Object.keys(x.attributes), payloadBytes: x.payload?.length }));
          return;
        }
      } catch { /* not an entity event */ }
    }
  }
  console.log("creation tx not found in block", e.createdAt);
}

async function drill() {
  const m = JSON.parse(readFileSync(resolve(ROOT, "proof/drill-manifest.json"), "utf8"));
  for (const sc of m.scenarios) {
    const hist: HistoricalRecord[] = [];
    for (const r of sc.records) {
      const tx = await c.getTransaction({ hash: r.txHash });
      const p = recoverCreates(tx.input).find((x) => x.payload)?.payload;
      if (!p) throw new Error(`no payload in ${r.txHash}`);
      hist.push({ key: r.key, txHash: r.txHash, circle: r.circle, epoch: BigInt(r.epoch), type: r.type, policy: sc.policy, payload: p });
    }
    const out = await seizureDrill(hist, {
      ratchet: sc.seized.ratchet ? { epoch: BigInt(sc.seized.ratchet.epoch), chainKey: unhex(sc.seized.ratchet.keyHex) } : undefined,
      staticKey: sc.seized.staticKeyHex ? unhex(sc.seized.staticKeyHex) : undefined,
    });
    const t = summarize(out)[sc.policy as "plaintext" | "static_key" | "ratchet"];
    console.log(`${sc.title}: ${t.exposed}/${t.total} exposed`);
  }
}

switch (cmd) {
  case "board": await board(rest[0], (rest[1] ?? "").split(",").filter(Boolean)); break;
  case "verify": await verify(rest[0]); break;
  case "drill": await drill(); break;
  case "audit": await import("./leak-audit"); break;
  default: console.log("usage: rasure.ts board <circle> <dispatchers> | verify <entityKey> | drill | audit");
}
