import { createPublicClient } from "@arkiv-network/sdk";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { http } from "viem";
import { RateLimitedError, detectRateLimit } from "@rasure/core";
import { RPC_HTTP } from "./config";

/** Direct anonymous reader. retryCount 0: a rate limit surfaces, it is never retried silently. */
export const reader = createPublicClient({ chain: tiramisu, transport: http(RPC_HTTP, { retryCount: 0 }) });

function relayUrl() {
  return typeof window === "undefined" ? "http://localhost:3000/api/rpc" : `${window.location.origin}/api/rpc`;
}

/** Same reads through the server relay, which adds the access key. Used only after a 429. */
export const relayReader = () => createPublicClient({ chain: tiramisu, transport: http(relayUrl(), { retryCount: 0 }) });

export interface ReadMeta {
  viaRelay: boolean;
  rateLimited: RateLimitedError | null;
}

/** Try direct first. On a 429, retry once through the relay and report that it happened. */
export async function readWithRelay<T>(fn: (c: typeof reader) => Promise<T>): Promise<{ value: T; meta: ReadMeta }> {
  try {
    return { value: await fn(reader), meta: { viaRelay: false, rateLimited: null } };
  } catch (e) {
    const rl = detectRateLimit(e);
    if (!rl) throw e;
    try {
      return { value: await fn(relayReader() as typeof reader), meta: { viaRelay: true, rateLimited: rl } };
    } catch (e2) {
      const rl2 = detectRateLimit(e2);
      if (rl2) throw rl2;
      throw e2;
    }
  }
}
