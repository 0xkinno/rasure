// Sends GLM from the dispatcher to one role. Usage: npx tsx scripts/fund-one.ts auditor 0.05
import { parseEther } from "viem";
import { accountFor, reader, walletFor, type Role } from "./lib";
const role = process.argv[2] as Role;
const amt = parseEther(process.argv[3] ?? "0.05");
const c = reader();
const hash = await walletFor("dispatcher").sendTransaction({ to: accountFor(role).address, value: amt });
await c.waitForTransactionReceipt({ hash });
console.log(role, "funded", hash);
