// Read-only relay. Used by the browser only after the anonymous RPC answers 429.
// Forwards four read methods and adds the server-side access key. Everything else is refused.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const UPSTREAM = process.env.NEXT_PUBLIC_RPC_HTTP ?? "https://rpc.tiramisu.db-chain.testnet.arkiv.network";
const ALLOWED = new Set(["arkiv_query", "eth_getTransactionByHash", "eth_blockNumber", "eth_getBlockByNumber"]);

export async function POST(req: Request) {
  const key = process.env.ARKIV_ACCESS_KEY;
  if (!key) return NextResponse.json({ error: "relay not configured" }, { status: 503 });
  if (Number(req.headers.get("content-length") ?? 0) > 16_384) return NextResponse.json({ error: "body too large" }, { status: 413 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const calls = Array.isArray(body) ? body : [body];
  if (calls.length === 0 || calls.length > 20) return NextResponse.json({ error: "bad batch" }, { status: 400 });
  for (const c of calls) {
    const m = (c as { method?: string })?.method;
    if (!m || !ALLOWED.has(m)) return NextResponse.json({ error: `method not allowed: ${m}` }, { status: 403 });
  }
  const r = await fetch(UPSTREAM, {
    method: "POST",
    headers: { "content-type": "application/json", "X-API-KEY": key },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await r.text();
  return new NextResponse(text, { status: r.status, headers: { "content-type": r.headers.get("content-type") ?? "application/json" } });
}
