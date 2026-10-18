// Serves docs/FACTS.json (copied to public/facts.json by scripts/facts.ts so Vercel can read it).
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const txt = await readFile(join(process.cwd(), "public", "facts.json"), "utf8");
    return new NextResponse(txt, { headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ generated: false, reason: "facts.json has not been generated: run `npx tsx scripts/facts.ts` after the live runs" });
  }
}
