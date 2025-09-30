"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "../wallet-provider";
import appConfig from "@/config/app.config";
import { FHEswapAbi } from "@/abi/FHEswap";
import { ensureRelayer, userDecryptEuint64, encryptEuint64 } from "@/fhevm/relayer";
import { ConfidentialZETHAbi } from "@/abi/ConfidentialZETH";
import { createPublicClient, http, formatEther, encodeFunctionData, parseEventLogs } from "viem";
import type { Abi } from "viem";
import { sepolia } from "viem/chains";

const FHE_ABI: readonly unknown[] = FHEswapAbi as readonly unknown[];

type Token = { symbol: string; name: string; chain: string; decimals: number };

const TOKENS: Token[] = [
  { symbol: "ETH", name: "Ethereum", chain: "Sepolia", decimals: 18 },
  { symbol: "zETHc", name: "Confidential ETH", chain: "FHE", decimals: 18 },
];

function TokenSelect({ value, onChange }: { value: Token; onChange: (t: Token) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 rounded-md border border-black/10 px-3 py-2 hover:bg-black/5"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-medium">{value.symbol}</span>
        <span className="text-xs text-black/60">{value.chain}</span>
      </button>
      {open && (
        <div className="absolute z-10 mt-2 w-56 rounded-lg border border-black/10 bg-background shadow">
          <ul className="max-h-64 overflow-auto py-1">
            {TOKENS.map((t) => (
              <li key={t.symbol}>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-black/5"
                  onClick={() => { onChange(t); setOpen(false); }}
                >
                  <div className="text-sm font-medium">{t.symbol}</div>
                  <div className="text-xs text-black/60">{t.name} · {t.chain}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function NumberInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      inputMode="decimal"
      value={value}
      onChange={(e) => {
        const next = e.target.value.replace(/[^0-9.]/g, "");
        if ((next.match(/\./g) || []).length <= 1) onChange(next);
      }}
      placeholder={placeholder}
      className="w-full bg-transparent text-3xl font-semibold outline-none"
    />
  );
}

export default function SwapCard() {
  const [sellToken, setSellToken] = useState<Token>(TOKENS[0]);
  const [buyToken, setBuyToken] = useState<Token>(TOKENS[1]);
  const [sellAmount, setSellAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [zethBalance, setZethBalance] = useState<string>("");
  const [decrypting, setDecrypting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string>("");
  const [toastPersist, setToastPersist] = useState<boolean>(false);
  const [, setRequestId] = useState<string>("");
  const [swapStep, setSwapStep] = useState<"idle" | "approve" | "swap">("idle");

  const { isConnected, address, chainId } = useWallet();
  const notConnected = !isConnected;
  const parsedSell = useMemo(() => Number(sellAmount || 0), [sellAmount]);
  const [ethBalance, setEthBalance] = useState<string>("");

  const buyPreview = useMemo(() => {
    if (!sellAmount || parsedSell <= 0) return "~";
    const isEthToZeth = sellToken.symbol === "ETH" && buyToken.symbol === "zETHc";
    const isZethToEth = sellToken.symbol === "zETHc" && buyToken.symbol === "ETH";
    if (isEthToZeth || isZethToEth) return sellAmount;
    return "~";
  }, [sellAmount, parsedSell, sellToken, buyToken]);

  useEffect(() => {
    if (!address) { setEthBalance(""); return; }
    const client = createPublicClient({ chain: sepolia, transport: http(appConfig.rpcUrl) });
    (async () => {
      try {
        const bal = await client.getBalance({ address: address as `0x${string}` });
        setEthBalance(formatEther(bal));
      } catch { setEthBalance(""); }
    })();
  }, [address, chainId]);

  function showToast(message: string, options?: { persist?: boolean; durationMs?: number }) {
    setToastMsg(message);
    const persist = !!options?.persist;
    setToastPersist(persist);
    if (persist) console.error("Error:", message);
    if (!persist) {
      const ms = options?.durationMs ?? 1000;
      window.setTimeout(() => { setToastMsg(""); setToastPersist(false); }, ms);
    }
  }
  function closeToast() { setToastMsg(""); setToastPersist(false); }

  async function refreshEthBalance(addr: `0x${string}`) {
    const client = createPublicClient({ chain: sepolia, transport: http(appConfig.rpcUrl) });
    try {
      const bal = await client.getBalance({ address: addr });
      setEthBalance(formatEther(bal));
    } catch {}
  }

  async function pollOutcomeOnce(userAddr: `0x${string}`, fromBlock: bigint) {
    const client = createPublicClient({ chain: sepolia, transport: http(appConfig.rpcUrl) });
    for (let i = 0; i < 120; i++) {
      try {
        const okLogs = await client.getContractEvents({ address: appConfig.launchAddress as `0x${string}`, abi: FHE_ABI, eventName: "SwapToEth", fromBlock, toBlock: 'latest' });
        const ok = okLogs.find((l: unknown) => { const ev = l as { args?: { user?: `0x${string}` } }; return ev.args?.user?.toLowerCase?.() === userAddr.toLowerCase(); });
        if (ok) { await refreshEthBalance(userAddr); showToast("Swap completed"); return; }
        const failLogs = await client.getContractEvents({ address: appConfig.launchAddress as `0x${string}`, abi: FHE_ABI, eventName: "SwapFailed", fromBlock, toBlock: 'latest' });
        const fail = failLogs.find((l: unknown) => { const ev = l as { args?: { user?: `0x${string}` } }; return ev.args?.user?.toLowerCase?.() === userAddr.toLowerCase(); }) as unknown as { args?: { reason?: string } } | undefined;
        if (fail) { const reason = fail.args?.reason ? String(fail.args.reason) : "Failed"; showToast(`Swap failed: ${reason}`, { persist: true }); return; }
      } catch {}
      await new Promise(r => setTimeout(r, 3000));
    }
    showToast("Processing, please check back later");
  }

  type DecodedLog = { address?: `0x${string}`; args?: { user?: `0x${string}`; requestId?: bigint } };
  async function extractRequestIdFromReceipt(txHash: `0x${string}`): Promise<string | null> {
    const client = createPublicClient({ chain: sepolia, transport: http(appConfig.rpcUrl) });
    const receipt = await client.waitForTransactionReceipt({ hash: txHash });
    const decoded = parseEventLogs({ abi: FHE_ABI as unknown as Abi, logs: receipt.logs, eventName: 'SwapDecryptRequested' }) as unknown as DecodedLog[];
    const hit = decoded.find((l: DecodedLog) => l.address?.toLowerCase?.() === (appConfig.launchAddress as string).toLowerCase());
    if (!hit || !hit.args?.requestId) return null;
    return String(hit.args.requestId);
  }

  async function onViewZethBalance() {
    if (!address) { showToast("Please connect your wallet first"); return; }
    setDecrypting(true);
    try {
      await ensureRelayer({ requireInstance: true }).catch(() => { throw new Error("Relayer SDK not initialized"); });
      const client = createPublicClient({ chain: sepolia, transport: http(appConfig.rpcUrl) });
      const onchainZethc = await client.readContract({ address: appConfig.launchAddress as `0x${string}`, abi: FHE_ABI, functionName: "zethc" }) as `0x${string}`;
      if (!onchainZethc || /^0x0+$/i.test(onchainZethc)) { showToast("FHEswap zETHc address not set", { persist: true }); return; }
      const cipher = await client.readContract({ address: onchainZethc, abi: ConfidentialZETHAbi as unknown as readonly unknown[], functionName: "encryptedBalanceOf", args: [address as `0x${string}`], account: address as `0x${string}` }) as `0x${string}` | string;
      if (typeof cipher === "string" && /^0x0+$/i.test(cipher)) { showToast("Balance is not initialized. Please deposit some ETH first."); return; }
      try {
        const v64 = await userDecryptEuint64(onchainZethc as string, cipher as string);
        const v = Number(v64) / 1e18; setZethBalance(v.toFixed(4)); showToast("Decryption successful"); return;
      } catch {}
      showToast("Missing relayer configuration or SDK does not support decryption. Please check the setup.", { persist: true });
    } catch (err) {
      const msg = (err as Error)?.message || String(err); showToast(`Failed: ${msg}`, { persist: true });
    } finally {
      setDecrypting(false);
    }
  }

  const actionLabel = useMemo(() => {
    if (notConnected) return "Connect Wallet";
    if (!sellAmount || parsedSell <= 0) return "Enter amount";
    return "Swap";
  }, [notConnected, sellAmount, parsedSell]);

  const canSubmit = useMemo(() => {
    if (notConnected) return false;
    if (!sellAmount || parsedSell <= 0) return false;
    if (!appConfig.launchAddress) return false;
    return true;
  }, [notConnected, sellAmount, parsedSell]);

  function flip() { setSellToken(buyToken); setBuyToken(sellToken); }

  function quick(percent: number) {
    let basis: number | null = null;
    if (sellToken.symbol === "ETH") basis = ethBalance ? Number(ethBalance) : null;
    else if (sellToken.symbol === "zETHc") basis = zethBalance ? Number(zethBalance) : null;
    if (basis !== null && !Number.isNaN(basis)) { const n = basis * percent; setSellAmount(n > 0 ? String(n) : ""); return; }
    if (!sellAmount) { if (sellToken.symbol === "zETHc") showToast("Please click 'View' to decrypt zETHc balance first"); return; }
    const n = Number(sellAmount) * percent; setSellAmount(String(n));
  }

  async function onSwap() {
    if (!canSubmit) return;
    try {
      setBusy(true); setTxHash(null);
      const amountWei = BigInt(Math.floor(Number(sellAmount) * 1e18));
      if (amountWei <= BigInt(0)) throw new Error("Invalid amount");
      const anyWindow = window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown> } };
      if (!anyWindow.ethereum) throw new Error("No wallet detected");
      const accountsResponse = await anyWindow.ethereum.request({ method: "eth_requestAccounts" });
      const accounts = Array.isArray(accountsResponse) ? accountsResponse as string[] : [];
      const from = accounts[0];
      if (!from) throw new Error("No wallet address");
      let tx: string;
      if (sellToken.symbol === "ETH" && buyToken.symbol === "zETHc") {
        const data = "0xd0e30db0";
        tx = await anyWindow.ethereum.request({ method: "eth_sendTransaction", params: [{ from, to: appConfig.launchAddress, value: `0x${amountWei.toString(16)}`, data }] }) as string;
      } else {
        try { await ensureRelayer({ requireInstance: true }); } catch { throw new Error("Relayer SDK is required for encryption"); }
        showToast("Starting swap..."); setSwapStep("approve"); showToast("Approving...");
        const clientAddr = createPublicClient({ chain: sepolia, transport: http(appConfig.rpcUrl) });
        const onchainZethc = await clientAddr.readContract({ address: appConfig.launchAddress as `0x${string}`, abi: FHE_ABI, functionName: "zethc" }) as `0x${string}`;
        if (!onchainZethc || /^0x0+$/i.test(onchainZethc)) { throw new Error("FHEswap zETHc address not set"); }
        const encForApprove = await encryptEuint64(onchainZethc as string, from, amountWei);
        const approveData = encodeFunctionData({ abi: ConfidentialZETHAbi as unknown as readonly unknown[], functionName: "encryptedApprove", args: [appConfig.launchAddress as `0x${string}`, encForApprove.data as `0x${string}`, encForApprove.proof as `0x${string}`] });
        const approveTx = await anyWindow.ethereum.request({ method: "eth_sendTransaction", params: [{ from, to: onchainZethc, value: "0x0", data: approveData }] }) as string;
        await clientAddr.waitForTransactionReceipt({ hash: approveTx as `0x${string}` });
        showToast("Approval complete. Starting swap..."); setSwapStep("swap");
        const encForSwap = await encryptEuint64(appConfig.launchAddress as string, from, amountWei);
        const swapData = encodeFunctionData({ abi: FHE_ABI, functionName: "swapToEth", args: [encForSwap.data as `0x${string}`, encForSwap.proof as `0x${string}`] });
        const client2 = createPublicClient({ chain: sepolia, transport: http(appConfig.rpcUrl) });
        const fromBlock = await client2.getBlockNumber();
        tx = await anyWindow.ethereum.request({ method: "eth_sendTransaction", params: [{ from, to: appConfig.launchAddress, value: "0x0", data: swapData }] }) as string;
        setTxHash(tx); showToast("Submitted. Waiting for completion"); setBusy(false); setSwapStep("idle");
        (async () => {
          try {
            const receiptBg = await client2.waitForTransactionReceipt({ hash: tx as `0x${string}` });
            const ridBg = await extractRequestIdFromReceipt(tx as `0x${string}`);
            if (ridBg && ridBg !== "0") { setRequestId(ridBg); showToast(`Decryption request submitted (requestId: ${ridBg})`); } else { showToast("Submitted. Waiting for callback..."); }
            await pollOutcomeOnce(from as `0x${string}`, receiptBg.blockNumber ?? fromBlock);
          } catch (e) { console.error("Background polling failed", e); }
        })();
      }
      setTxHash(tx);
    } catch (err) {
      const msg = (err as Error)?.message || String(err); showToast(`Transaction failed: ${msg}`, { persist: true });
    } finally { setBusy(false); setSwapStep("idle"); }
  }

  return (
    <div className="w-full rounded-2xl border border-black/10 bg-white/80 card-surface backdrop-blur p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-semibold">Swap</div>
        <div className="flex items-center gap-2">
          <button className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-black/10 hover:bg-black/5" onClick={() => setShowSettings(true)} aria-label="settings">⚙️</button>
        </div>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-black/10 p-3 bg-background/40">
          <div className="mb-2 flex items-center justify-between text-xs text-black/60">
            <span>Sell</span>
            <span>
              {sellToken.symbol === "ETH" && (<>Balance: {ethBalance ? `${Number(ethBalance).toFixed(4)} ETH` : "--"}</>)}
              {sellToken.symbol === "zETHc" && (<>
                Balance: {zethBalance ? `${zethBalance} zETHc` : "Private"}
                <button className="ml-2 inline-flex items-center h-6 px-2 rounded-md border border-black/10 hover:bg-black/5" onClick={onViewZethBalance} disabled={decrypting}>{decrypting ? "Decrypting..." : "View"}</button>
              </>)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <NumberInput value={sellAmount} onChange={setSellAmount} placeholder="0" />
            <TokenSelect value={sellToken} onChange={setSellToken} />
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <button className="px-2 py-1 rounded-md hover:bg-black/5" onClick={() => quick(0.25)}>25%</button>
            <button className="px-2 py-1 rounded-md hover:bg-black/5" onClick={() => quick(0.5)}>50%</button>
            <button className="px-2 py-1 rounded-md hover:bg-black/5" onClick={() => quick(1)}>MAX</button>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <button className="h-8 w-8 -my-2 rounded-md border border-black/10 bg-background hover:bg-black/5" onClick={flip} aria-label="flip">↓</button>
        </div>

        <div className="rounded-xl border border-black/10 p-3 bg-background/40">
          <div className="mb-2 flex items-center justify-between text-xs text-black/60">
            <span>Buy</span>
            <span>
              {buyToken.symbol === "ETH" && (<>Balance: {ethBalance ? `${Number(ethBalance).toFixed(4)} ETH` : "--"}</>)}
              {buyToken.symbol === "zETHc" && (<>
                Balance: {zethBalance ? `${zethBalance} zETHc` : "Private"}
                <button className="ml-2 inline-flex items-center h-6 px-2 rounded-md border border-black/10 hover:bg-black/5" onClick={onViewZethBalance} disabled={decrypting}>{decrypting ? "Decrypting..." : "View"}</button>
              </>)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-semibold">{buyPreview}</div>
            <div className="flex-1" />
            <TokenSelect value={buyToken} onChange={setBuyToken} />
          </div>
        </div>

        <button disabled={!canSubmit || busy} onClick={onSwap} className="w-full h-11 rounded-xl bg-foreground text-background disabled:opacity-50 disabled:cursor-not-allowed">
          {busy ? (swapStep === "approve" ? "Approving..." : swapStep === "swap" ? "Swapping..." : "Submitting...") : actionLabel}
        </button>

        {busy && swapStep !== "idle" && (
          <div className="mt-2 flex items-center justify-center text-xs select-none">
            <span className={swapStep === "approve" ? "font-semibold" : "text-black/60"}>Approving</span>
            <span className="mx-2">→</span>
            <span className={swapStep === "swap" ? "font-semibold" : "text-black/60"}>Swapping</span>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {txHash && (<div className="text-sm text-black/70">Tx: {txHash}</div>)}
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-20 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-black/10 bg-background p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-semibold">Settings</div>
              <button className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-black/5" onClick={() => setShowSettings(false)}>×</button>
            </div>
            <label className="block text-sm mb-1">Slippage tolerance (%)</label>
            <input className="w-full rounded-md border border-black/10 px-3 py-2 bg-transparent" value={slippage} onChange={(e) => setSlippage(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.5" />
            <div className="mt-3 flex items-center gap-2 text-xs">
              <button className="px-2 py-1 rounded-md border border-black/10" onClick={() => setSlippage("0.1")}>0.1%</button>
              <button className="px-2 py-1 rounded-md border border-black/10" onClick={() => setSlippage("0.5")}>0.5%</button>
              <button className="px-2 py-1 rounded-md border border-black/10" onClick={() => setSlippage("1")}>1%</button>
            </div>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="fixed top-4 right-4 z-30">
          <div className="rounded-md border border-black/10 bg-background px-3 py-2 shadow max-w-xs">
            <div className="text-sm break-all whitespace-pre-wrap">{toastMsg}</div>
            <div className="mt-2 flex items-center gap-2 justify-end">
              {toastPersist && (<button className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-black/5" onClick={closeToast} aria-label="close">×</button>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


