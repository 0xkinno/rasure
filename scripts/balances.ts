// Prints the GLM balance of every Rasure wallet. Addresses and balances only.
import { formatEther } from "viem";
import { ROLES, accountFor, reader } from "./lib";

const c = reader();
const head = await c.getBlockNumber({ cacheTime: 0 });
console.log("tiramisu head", head.toString());
for (const r of ROLES) {
  const a = accountFor(r).address;
  const bal = await c.getBalance({ address: a });
  console.log(r.padEnd(12), a, formatEther(bal), "GLM");
}
