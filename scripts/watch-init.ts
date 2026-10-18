// Creates the night-watch demo circle and prints the values for GitHub (secrets and variables) and Vercel.
// Writes .secrets/watch.json (gitignored). The epoch-0 chain key is the one secret: DEMO_CHAIN_KEY.
// Usage: npx tsx scripts/watch-init.ts [--epoch-blocks=600]
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { circleParams, currentKey, newChain } from "@rasure/core";
import { ROOT, reader, walletFor, writeResult, today } from "./lib";
import { hex, hex16 } from "./helpers";

const eb = BigInt(process.argv.find((a) => a.startsWith("--epoch-blocks="))?.split("=")[1] ?? 600);
const c = reader();
const head = await c.getBlockNumber({ cacheTime: 0 });
const clock = { genesisBlock: head, epochBlocks: eb };
const circle = hex16();
const st = newChain(circle, clock);
const created = await walletFor("dispatcher").createEntity(circleParams(circle, clock));
mkdirSync(resolve(ROOT, ".secrets"), { recursive: true });
writeFileSync(resolve(ROOT, ".secrets/watch.json"), JSON.stringify({ circle, genesis: head.toString(), epochBlocks: eb.toString(), chainKeyHex: hex(currentKey(st).chainKey) }, null, 2) + "\n", { mode: 0o600 });
writeResult(`watch-init-${today()}.json`, { date: today(), circle, genesis: head, epochBlocks: eb, circleTx: created.txHash });
console.log("watch circle", circle, "tx", created.txHash);
console.log("GitHub repository variables: WATCH_CIRCLE, WATCH_GENESIS, WATCH_EPOCH_BLOCKS ->", circle, head.toString(), eb.toString());
console.log("GitHub secrets: DEMO_CHAIN_KEY (see .secrets/watch.json), DISPATCHER_KEY, VOLUNTEER_A_KEY, ARKIV_ACCESS_KEY");
