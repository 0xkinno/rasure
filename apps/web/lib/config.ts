export const CHAIN_ID = 7738577;
export const CHAIN_ID_HEX = "0x7614d1";
export const RPC_HTTP = process.env.NEXT_PUBLIC_RPC_HTTP ?? "https://rpc.tiramisu.db-chain.testnet.arkiv.network";
export const RPC_WS = process.env.NEXT_PUBLIC_RPC_WS ?? "wss://rpc.tiramisu.db-chain.testnet.arkiv.network";
export const EXPLORER = "https://tiramisu.explorer.arkiv.network";
export const FAUCET = "https://hub.arkiv.network/faucet";
export const DEMO_CIRCLE = process.env.NEXT_PUBLIC_DEMO_CIRCLE ?? "";
export const TRUSTED_DISPATCHERS = (process.env.NEXT_PUBLIC_TRUSTED_DISPATCHERS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
export const REPO = "https://github.com/0xkinno/rasure";
export const txUrl = (h: string) => `${EXPLORER}/tx/${h}`;
export const addrUrl = (a: string) => `${EXPLORER}/address/${a}`;
export const short = (s: string, n = 6) => (s.length > 2 * n + 2 ? `${s.slice(0, n + 2)}...${s.slice(-n)}` : s);
