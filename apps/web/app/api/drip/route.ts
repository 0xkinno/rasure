// Test GLM drip. The server signs ONLY this transfer, never an Arkiv entity.
// One drip per address per hour; refuses when the balance is already above 0.005 GLM.
import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, isAddress, parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { tiramisu } from "@arkiv-network/sdk/chains";

export const dynamic = "force-dynamic";
const UPSTREAM = process.env.NEXT_PUBLIC_RPC_HTTP ?? "https://rpc.tiramisu.db-chain.testnet.arkiv.network";
const last = new Map<string, number>(); // best effort on serverless: per warm instance
const HOUR = 3_600_000;
const byIp = new Map<string, number[]>();
let dayStart = Date.now();
let dayCount = 0;
const DAILY_CAP = 200;
const PER_IP_PER_HOUR = 3;

export async function POST(req: Request) {
  const pk = process.env.DRIP_PRIVATE_KEY;
  if (!pk) return NextResponse.json({ error: "drip is not configured" }, { status: 503 });
  const { address } = (await req.json().catch(() => ({}))) as { address?: string };
  if (!address || !isAddress(address)) return NextResponse.json({ error: "invalid address" }, { status: 400 });
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const nowMs = Date.now();
  if (nowMs - dayStart > 24 * HOUR) { dayStart = nowMs; dayCount = 0; }
  if (dayCount >= DAILY_CAP) return NextResponse.json({ error: "daily drip cap reached; use the Hub faucet" }, { status: 429 });
  const recent = (byIp.get(ip) ?? []).filter((t) => nowMs - t < HOUR);
  if (recent.length >= PER_IP_PER_HOUR) return NextResponse.json({ error: "too many drips from this network in the last hour" }, { status: 429 });
  const k = address.toLowerCase();
  const t = last.get(k);
  if (t && Date.now() - t < HOUR) {
    const mins = Math.ceil((HOUR - (Date.now() - t)) / 60000);
    return NextResponse.json({ error: `one drip per address per hour; retry in ${mins} min` }, { status: 429 });
  }
  last.set(k, Date.now()); // reserve before any await so parallel requests cannot double-spend
  byIp.set(ip, [...recent, nowMs]);
  dayCount++;
  const headers = process.env.ARKIV_ACCESS_KEY ? { "X-API-KEY": process.env.ARKIV_ACCESS_KEY } : undefined;
  const transport = http(UPSTREAM, { retryCount: 0, fetchOptions: headers ? { headers } : undefined });
  const pub = createPublicClient({ chain: tiramisu, transport });
  const bal = await pub.getBalance({ address });
  if (bal > parseEther("0.005")) {
    last.delete(k);
    return NextResponse.json({ error: `balance is already ${formatEther(bal)} GLM; no drip needed` }, { status: 409 });
  }
  const account = privateKeyToAccount(pk as `0x${string}`);
  const w = createWalletClient({ chain: tiramisu, transport, account });
  try {
    const hash = await w.sendTransaction({ to: address, value: parseEther("0.02") });
    return NextResponse.json({ hash, amount: "0.02" });
  } catch (e) {
    last.delete(k);
    return NextResponse.json({ error: (e as Error).message.slice(0, 300) }, { status: 502 });
  }
}
