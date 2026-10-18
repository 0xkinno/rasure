// Splits GLM from the dispatcher wallet (funded by the faucet) to volunteerA, volunteerB, forger, probe.
// Usage: npx tsx scripts/fund.ts [--each=0.05]   default: 15% of the dispatcher balance each.
import { formatEther, parseEther } from "viem";
import { accountFor, reader, walletFor, EXPLORER } from "./lib";

const c = reader();
const from = accountFor("dispatcher").address;
const bal = await c.getBalance({ address: from });
console.log("dispatcher", from, formatEther(bal), "GLM");
if (bal === 0n) {
  console.error("dispatcher has no GLM yet: fund it from https://hub.arkiv.network/faucet first");
  process.exit(1);
}
const arg = process.argv.find((a) => a.startsWith("--each="));
const each = arg ? parseEther(arg.slice(7)) : (bal * 15n) / 100n;
const w = walletFor("dispatcher");
for (const r of ["volunteerA", "volunteerB", "forger", "probe"] as const) {
  const to = accountFor(r).address;
  const have = await c.getBalance({ address: to });
  if (have >= each) {
    console.log(r, "already holds", formatEther(have), "GLM, skipped");
    continue;
  }
  const hash = await w.sendTransaction({ to, value: each - have });
  await c.waitForTransactionReceipt({ hash });
  console.log(r.padEnd(12), "+", formatEther(each - have), "GLM", `${EXPLORER}/tx/${hash}`);
}
