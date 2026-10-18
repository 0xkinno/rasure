"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { custom, formatEther, type Hex } from "viem";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { createWalletClient } from "@arkiv-network/sdk";
import { CHAIN_ID_HEX, EXPLORER, RPC_HTTP } from "./config";

export interface Eip1193 {
  request(a: { method: string; params?: unknown[] | object }): Promise<any>;
  on?(e: string, f: (...a: any[]) => void): void;
}
export interface Discovered {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
  provider: Eip1193;
}

interface Ctx {
  wallets: Discovered[];
  account: Hex | null;
  balance: bigint | null;
  connecting: boolean;
  error: string | null;
  modalOpen: boolean;
  openModal(): void;
  closeModal(): void;
  connect(w: Discovered): Promise<void>;
  disconnect(): void;
  refreshBalance(): Promise<void>;
  writer(): ReturnType<typeof createWalletClient> | null;
}
const WalletCtx = createContext<Ctx | null>(null);
export const useWallet = () => {
  const c = useContext(WalletCtx);
  if (!c) throw new Error("WalletProvider missing");
  return c;
};

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<Discovered[]>([]);
  const [active, setActive] = useState<Discovered | null>(null);
  const [account, setAccount] = useState<Hex | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // EIP-6963 discovery, with window.ethereum as the fallback.
  useEffect(() => {
    const found = new Map<string, Discovered>();
    const onAnnounce = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d?.info?.uuid) return;
      found.set(d.info.uuid, { uuid: d.info.uuid, name: d.info.name, icon: d.info.icon, rdns: d.info.rdns, provider: d.provider });
      setWallets([...found.values()]);
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    const t = setTimeout(() => {
      const eth = (window as any).ethereum as Eip1193 | undefined;
      if (eth && found.size === 0) setWallets([{ uuid: "injected", name: "Browser wallet", icon: "", rdns: "injected", provider: eth }]);
    }, 400);
    return () => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      clearTimeout(t);
    };
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!active || !account) return;
    const hex = await active.provider.request({ method: "eth_getBalance", params: [account, "latest"] });
    setBalance(BigInt(hex));
  }, [active, account]);

  const connect = useCallback(async (w: Discovered) => {
    setConnecting(true);
    setError(null);
    try {
      const accounts: string[] = await w.provider.request({ method: "eth_requestAccounts" });
      try {
        await w.provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID_HEX }] });
      } catch (e: any) {
        if (e?.code === 4902 || /unrecognized|not added/i.test(String(e?.message))) {
          await w.provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: CHAIN_ID_HEX,
                chainName: "Arkiv Tiramisu",
                nativeCurrency: { name: "GLM", symbol: "GLM", decimals: 18 },
                rpcUrls: [RPC_HTTP],
                blockExplorerUrls: [EXPLORER],
              },
            ],
          });
        } else throw e;
      }
      setActive(w);
      setAccount(accounts[0] as Hex);
      setModalOpen(false);
      const hex = await w.provider.request({ method: "eth_getBalance", params: [accounts[0], "latest"] });
      setBalance(BigInt(hex));
      w.provider.on?.("accountsChanged", (a: string[]) => {
        if (!a[0]) {
          setAccount(null);
          setActive(null);
        } else setAccount(a[0] as Hex);
      });
    } catch (e: any) {
      setError(e?.message ?? "wallet connection failed");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setActive(null);
    setBalance(null);
  }, []);
  const writer = useCallback(
    () => (active && account ? createWalletClient({ chain: tiramisu, transport: custom(active.provider), account }) : null),
    [active, account],
  );

  const value = useMemo<Ctx>(
    () => ({
      wallets,
      account,
      balance,
      connecting,
      error,
      modalOpen,
      openModal: () => setModalOpen(true),
      closeModal: () => setModalOpen(false),
      connect,
      disconnect,
      refreshBalance,
      writer,
    }),
    [wallets, account, balance, connecting, error, modalOpen, connect, disconnect, refreshBalance, writer],
  );
  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>;
}
export const fmtGlm = (b: bigint | null) => (b === null ? "..." : Number(formatEther(b)).toFixed(4));
