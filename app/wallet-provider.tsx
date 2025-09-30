"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, handler: (data: unknown) => void) => void;
  removeListener?: (event: string, handler: (data: unknown) => void) => void;
};

// EIP-6963 multi-wallet discovery types
type Eip6963ProviderInfo = { uuid: string; name: string; icon: string; rdns: string };
type Eip6963AnnounceEvent = CustomEvent<{ info: Eip6963ProviderInfo; provider: EthereumProvider }>;

type WalletState = {
  provider: EthereumProvider | null;
  address: string | null;
  chainId: string | null; // hex string like 0x1
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletState | null>(null);

function detectProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  const anyWindow = window as { ethereum?: EthereumProvider };
  // Check multiple times as MetaMask may inject asynchronously
  if (anyWindow.ethereum) return anyWindow.ethereum as EthereumProvider;
  // Check again after a brief delay for async injection
  return null;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<EthereumProvider | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const accountsHandlerRef = useRef<((data: unknown) => void) | null>(null);
  const chainHandlerRef = useRef<((data: unknown) => void) | null>(null);
  const discoveredRef = useRef<Map<string, EthereumProvider> | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const detected = detectProvider();
    if (detected) {
      setProvider(detected);
      try { (window as unknown as { ethereum?: EthereumProvider }).ethereum = (window as unknown as { ethereum?: EthereumProvider }).ethereum || detected; } catch {}
      return;
    }
    
    const handleEthereumDetected = () => {
      if (mounted) {
        const provider = detectProvider();
        if (provider) {
          setProvider(provider);
          try { (window as unknown as { ethereum?: EthereumProvider }).ethereum = (window as unknown as { ethereum?: EthereumProvider }).ethereum || provider; } catch {}
        }
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('ethereum#initialized', handleEthereumDetected, { once: true });

      // EIP-6963 discovery: collect providers and pick the first if no window.ethereum
      discoveredRef.current = new Map<string, EthereumProvider>();
      const onAnnounce = (evt: Event) => {
        const e = evt as Eip6963AnnounceEvent;
        const key = e.detail.info?.rdns || e.detail.info?.uuid;
        if (key && e.detail.provider && discoveredRef.current) {
          discoveredRef.current.set(key, e.detail.provider);
          if (!provider && mounted) {
            setProvider(e.detail.provider);
            try { (window as unknown as { ethereum?: EthereumProvider }).ethereum = (window as unknown as { ethereum?: EthereumProvider }).ethereum || e.detail.provider; } catch {}
          }
        }
      };
      window.addEventListener('eip6963:announceProvider', onAnnounce as EventListener);
      // Request providers to announce themselves
      try { window.dispatchEvent(new Event('eip6963:requestProvider')); } catch {}
      
      const timers = [100, 500, 1000, 2000].map(delay => 
        setTimeout(() => {
          if (mounted) {
            const detected = detectProvider();
            if (detected) setProvider(detected);
          }
        }, delay)
      );
      
      return () => {
        mounted = false;
        window.removeEventListener('ethereum#initialized', handleEthereumDetected);
        window.removeEventListener('eip6963:announceProvider', onAnnounce as EventListener);
        timers.forEach(t => clearTimeout(t));
      };
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!provider) return;
    try {
      const [cid, accounts] = await Promise.all([
        provider.request({ method: "eth_chainId" }),
        provider.request({ method: "eth_accounts" }),
      ]);
      setChainId((cid as string) || null);
      const accsArray = accounts as string[];
      setAddress(accsArray && accsArray.length > 0 ? accsArray[0] : null);
    } catch {
      // Silently handle refresh errors
    }
  }, [provider]);

  useEffect(() => {
    if (!provider) return;
    refresh();

    const onAccountsChanged = (data: unknown) => {
      const accs = data as string[];
      setAddress(accs && accs.length > 0 ? accs[0] : null);
    };
    const onChainChanged = (data: unknown) => {
      const cid = data as string;
      setChainId(cid);
    };
    accountsHandlerRef.current = onAccountsChanged;
    chainHandlerRef.current = onChainChanged;

    provider.on?.("accountsChanged", onAccountsChanged);
    provider.on?.("chainChanged", onChainChanged);
    return () => {
      if (accountsHandlerRef.current) provider.removeListener?.("accountsChanged", accountsHandlerRef.current);
      if (chainHandlerRef.current) provider.removeListener?.("chainChanged", chainHandlerRef.current);
    };
  }, [provider, refresh]);

  const connect = useCallback(async () => {
    // Re-detect provider in case it was injected after initial load
    let currentProvider = provider || detectProvider();
    // If not found, try EIP-6963 request and wait briefly
    if (!currentProvider && typeof window !== 'undefined') {
      try { window.dispatchEvent(new Event('eip6963:requestProvider')); } catch {}
      await new Promise((r) => setTimeout(r, 300));
      if (discoveredRef.current && discoveredRef.current.size > 0) {
        const first = discoveredRef.current.values().next().value as EthereumProvider | undefined;
        if (first) currentProvider = first;
      }
    }
    if (!currentProvider) {
      throw new Error("Ethereum wallet not found");
    }
    if (!provider) {
      setProvider(currentProvider);
    }
    const accounts = await currentProvider.request({ method: "eth_requestAccounts" }) as string[];
    setAddress(accounts && accounts.length > 0 ? accounts[0] : null);
    const cid = await currentProvider.request({ method: "eth_chainId" }) as string;
    setChainId(cid || null);
  }, [provider]);

  const disconnect = useCallback(() => {
    setAddress(null);
  }, []);

  const value = useMemo<WalletState>(() => ({
    provider,
    address,
    chainId,
    isConnected: Boolean(provider && address),
    connect,
    disconnect,
  }), [provider, address, chainId, connect, disconnect]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

export function HeaderWallet() {
  const { isConnected, connect, address, chainId, provider } = useWallet();

  function chainNameFromId(id: string | null): string {
    if (!id) return "Not connected";
    const hex = id.toLowerCase();
    switch (hex) {
      case "0x1":
        return "Ethereum";
      case "0xaa36a7":
        return "Sepolia";
      case "0xa":
        return "Optimism";
      case "0xa4b1":
        return "Arbitrum";
      case "0x2105":
        return "Base";
      case "0x89":
        return "Polygon";
      case "0x38":
        return "BSC";
      case "0xa86a":
        return "Avalanche";
      case "0xc4":
        return "OKX X Layer";
      default:
        return `ID ${id}`;
    }
  }

  async function handleConnect() {
    try {
      await connect();
    } catch (err) {
      console.error("Connect wallet failed:", err);
    }
  }

  async function switchToSepolia() {
    if (!provider) return;
    const target = "0xaa36a7"; // Sepolia
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: target }] });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && ((err as { code?: number }).code === 4902 || (err as { message?: string }).message?.includes("Unrecognized chain ID"))) {
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: target,
              chainName: "Sepolia",
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://rpc.sepolia.org"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            }],
          });
        } catch (addErr) {
          console.error("wallet_addEthereumChain failed", addErr);
        }
      } else {
        console.error("wallet_switchEthereumChain failed", err);
      }
    }
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-black/70 min-w-[160px] truncate">
        {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)} · ${chainNameFromId(chainId)}` : "Not connected"}
      </span>
      <button
        className="h-9 px-3 inline-flex items-center justify-center rounded-md border border-black/10 hover:bg-black/5"
        onClick={() => (isConnected ? undefined : handleConnect())}
      >
        {isConnected ? "Connected" : "Connect Wallet"}
      </button>
      {isConnected && chainId?.toLowerCase() !== "0xaa36a7" && (
        <button
          className="h-9 px-3 inline-flex items-center justify-center rounded-md border border-black/10 hover:bg-black/5"
          onClick={switchToSepolia}
        >
          Switch to Sepolia
        </button>
      )}
    </div>
  );
}


