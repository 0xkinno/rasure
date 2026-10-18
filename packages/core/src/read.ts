// Reads. No silent retry: viem retryCount is 0. A 429 from the anonymous budget is surfaced with
// the retry time. Pagination is cursor based and every page is pinned to one block with atBlock.

import { QueryError, type Expression } from "@arkiv-network/sdk/query";
import type { Hex } from "viem";
import { auditAttributes, type ChainEntity } from "./decide";

export class RateLimitedError extends Error {
  constructor(public readonly retryAfterSeconds: number | null, public readonly code = "ANON_COST_LIMITED") {
    super(
      retryAfterSeconds === null
        ? `RPC rate limit reached (${code}). Retry later.`
        : `RPC rate limit reached (${code}). Retry in ${retryAfterSeconds} s.`,
    );
    this.name = "RateLimitedError";
  }
}

/** Looks through a thrown error chain for an HTTP 429 or the ANON_COST_LIMITED code. */
export function detectRateLimit(err: unknown): RateLimitedError | null {
  const seen = new Set<unknown>();
  let cur: unknown = err;
  while (cur && typeof cur === "object" && !seen.has(cur)) {
    seen.add(cur);
    const o = cur as Record<string, unknown>;
    const text = `${String(o.message ?? "")} ${String(o.details ?? "")} ${JSON.stringify(o.data ?? "")}`;
    const status = o.status ?? (o as { response?: { status?: number } }).response?.status;
    if (status === 429 || /ANON_COST_LIMITED|429/.test(text)) {
      const headers = o.headers as { get?: (k: string) => string | null } | undefined;
      const fromHeader = headers?.get?.("retry-after");
      const m = /retry[- ]?after"?[:=\s]+(\d+)/i.exec(text) ?? /in (\d+) ?s/i.exec(text);
      const secs = fromHeader ? Number(fromHeader) : m ? Number(m[1]) : null;
      return new RateLimitedError(Number.isFinite(secs as number) ? (secs as number) : null);
    }
    cur = o.cause;
  }
  return null;
}

/** Run a read; convert a rate limit into RateLimitedError, pass everything else through. */
export async function guarded<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const rl = detectRateLimit(e);
    if (rl) throw rl;
    throw e;
  }
}

export function isRetentionError(e: unknown): boolean {
  return e instanceof QueryError && e.kind === "block";
}

/** The minimal reader surface this module needs, so tests can pass a stub. */
export interface ArkivReader {
  getBlockNumber(opts?: { cacheTime?: number }): Promise<bigint>;
  select(sel: Record<string, true>): {
    where(e: Expression): any;
  };
}
interface PageLike {
  entities: any[];
  blockNumber?: bigint;
  hasNextPage(): boolean;
  next(): Promise<PageLike>;
}

export function toChainEntity(e: any): ChainEntity {
  const attributes: ChainEntity["attributes"] = {};
  const raw = e.attributes ?? {};
  const list: [string, any][] = Array.isArray(raw) ? raw.map((a: any) => [a.key ?? a.name, a.value]) : Object.entries(raw);
  for (const [k, raw] of list) {
    // The SDK returns typed attributes as { type, value }. Unwrap to the plain value.
    const v = raw && typeof raw === "object" && "value" in raw ? (raw as { value: unknown }).value : raw;
    attributes[k] = typeof v === "bigint" || typeof v === "number" ? v : String(v);
  }
  return {
    key: String(e.key),
    creator: String(e.creator ?? ""),
    owner: String(e.owner ?? ""),
    expiresAt: BigInt(e.expiresAt ?? 0),
    attributes,
    ...(e.createdAt !== undefined ? { createdAt: BigInt(e.createdAt) } : {}),
  };
}

/**
 * Walk every page of a query, all pinned to one block. If a page reports another block the walk
 * stops with an error rather than mixing snapshots.
 */
export async function fetchAll(
  c: ArkivReader,
  sel: Record<string, true>,
  where: Expression,
  opts: { atBlock?: bigint; pageSize?: number; maxPages?: number; createdBy?: string; ownedBy?: string } = {},
): Promise<{ atBlock: bigint; entities: any[]; pages: number }> {
  const head = opts.atBlock ?? (await guarded(() => c.getBlockNumber({ cacheTime: 0 })));
  const maxPages = opts.maxPages ?? 50;
  const build = () => {
    let b = c.select(sel).where(where);
    if (opts.createdBy) b = b.createdBy(opts.createdBy as `0x${string}`); // SDK createdBy(): immutable $creator filter
    if (opts.ownedBy) b = b.ownedBy(opts.ownedBy as `0x${string}`); // SDK ownedBy(): current $owner filter
    return b.atBlock(head).limit(opts.pageSize ?? 100).fetch() as Promise<PageLike>;
  };
  let page = await guarded(build);
  const entities = [...page.entities];
  let pages = 1;
  while (page.hasNextPage()) {
    if (pages >= maxPages) throw new Error("page budget exhausted; narrow the query");
    const prev: PageLike = page;
    page = await guarded(() => prev.next());
    if (page.blockNumber !== undefined && page.blockNumber !== head) throw new Error("snapshot block changed between pages");
    pages += 1;
    entities.push(...page.entities);
  }
  return { atBlock: head, entities, pages };
}

/** I3 over a result set: names of non-allowlisted public attributes, by entity key. */
export function leakFindings(entities: any[]): { key: string; extra: string[] }[] {
  return entities
    .map((e) => ({ key: String(e.key) as Hex, extra: auditAttributes(toChainEntity(e)) }))
    .filter((f) => f.extra.length > 0);
}
