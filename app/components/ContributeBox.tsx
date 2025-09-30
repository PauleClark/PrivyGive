"use client";

import { useState, useEffect } from "react";
import { createWalletClient, custom, createPublicClient, http, parseEventLogs, formatEther } from "viem";
import { sepolia } from "viem/chains";
import type { Abi } from "viem";
import { IDOPoolAbi } from "@/abi/IDOPool";
import { ConfidentialZETHAbi } from "@/abi/ConfidentialZETH";
import appConfig from "@/config/app.config";
import { encryptEuint64 } from "@/fhevm/relayer";
import { useWallet } from "@/app/wallet-provider";

interface ContributeBoxProps {
  poolAddress: string;
  actionLabel?: string; // Contribute/Donate/Sponsor/Tip
  amountLabelPrivate?: string; // Private contribution label
  amountLabelPublic?: string;  // Public contribution label
}

export default function ContributeBox({ poolAddress, actionLabel = "Participate", amountLabelPrivate = "Amount (zETHc)", amountLabelPublic = "Amount (ETH)" }: ContributeBoxProps) {
  const { provider, address } = useWallet();
  const [amount, setAmount] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [zethcBalance, setZethcBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [ethBalance, setEthBalance] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<string>("");

  function shortAddress(addr?: string): string {
    if (!addr) return "-";
    const a = String(addr);
    if (a.length <= 12) return a;
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
  }

  function showToast(msg: string) {
    if (typeof window === 'undefined') return;
    setToast(msg);
    window.setTimeout(() => setToast(""), 5000);
  }

  const toWei = (s: string): bigint => {
    const n = String(s || "0").trim();
    if (!n) return BigInt(0);
    if (!/^[0-9]*\.?[0-9]*$/.test(n)) return BigInt(0);
    const [intPart, fracPart = ""] = n.split(".");
    const frac = (fracPart + "000000000000000000").slice(0, 18);
    const bi = BigInt(intPart || "0") * BigInt("1000000000000000000") + BigInt(frac || "0");
    return bi;
  };

  useEffect(() => {
    const fetchEthBalance = async () => {
      try {
        const eth = (window as unknown as { ethereum?: unknown }).ethereum as { request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown> } | undefined;
        if (!eth) return;
        const accountsResponse = await eth.request({ method: "eth_requestAccounts" }).catch(() => null);
        const accounts = Array.isArray(accountsResponse) ? accountsResponse as string[] : [];
        const address = accounts[0];
        if (!address) return;

        const client = createPublicClient({ chain: sepolia, transport: http(appConfig.rpcUrl) });
        const bal = await client.getBalance({ address: address as `0x${string}` });
        setEthBalance(formatEther(bal));
      } catch {
        setEthBalance("");
      }
    };

    if (typeof window !== 'undefined') {
      fetchEthBalance();
    }
  }, []);

  async function onCheckBalance() {
    setBalanceLoading(true);
    try {
      setCurrentStep("Connecting wallet...");
      if (!provider) { showToast("Please connect your wallet first"); return; }
      if (!address) { showToast("No wallet address"); return; }
      const from = address;

      setCurrentStep("Initializing FHE SDK...");
      const { ensureRelayer, userDecryptEuint64 } = await import("@/fhevm/relayer");
      await ensureRelayer({ requireInstance: true }).catch(() => { throw new Error("Relayer SDK not initialized"); });

      setCurrentStep("Fetching encrypted balance...");
      const publicClient = createPublicClient({ chain: sepolia, transport: http(appConfig.rpcUrl) });
      const poolZethc = await publicClient.readContract({
        address: poolAddress as `0x${string}`,
        abi: IDOPoolAbi as unknown as Abi,
        functionName: "zethc",
      }) as `0x${string}`;

      if (!poolZethc || /^0x0+$/i.test(poolZethc)) { showToast("Pool zETHc address not set"); return; }

      const { result: cipher } = await publicClient.simulateContract({
        address: poolZethc,
        abi: ConfidentialZETHAbi as unknown as Abi,
        functionName: "encryptedBalanceOf",
        args: [from as `0x${string}`],
        account: from as `0x${string}`,
      }) as { result: `0x${string}` | string };

      if (typeof cipher === "string" && /^0x0+$/i.test(cipher)) {
        showToast("Balance not initialized. Please wrap some ETH first.");
        return;
      }

      setCurrentStep("Decrypting balance...");
      const balanceWei = await userDecryptEuint64(poolZethc, cipher as string);
      const v = Number(balanceWei) / 1e18;
      setZethcBalance(v.toFixed(4));
      showToast(`Balance: ${v.toFixed(4)} zETHc`);
    } catch (e) {
      const errMsg = (e as Error)?.message || String(e);
      showToast(`Query failed: ${errMsg}`);
      setZethcBalance(null);
    } finally {
      setBalanceLoading(false);
      setCurrentStep("");
    }
  }

  async function onContribute() {
    try {
      if (!amount) return;
      setBusy(true);
      const eth = (window as unknown as { ethereum?: unknown }).ethereum as { request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown> } | undefined;
      if (!eth) { showToast("No wallet detected"); return; }
      const wallet = createWalletClient({ chain: sepolia, transport: custom(eth) });
      const accountsResp2 = await eth.request({ method: "eth_requestAccounts" });
      const accounts2 = Array.isArray(accountsResp2) ? (accountsResp2 as string[]) : [];
      const from = accounts2[0];
      if (!from) { showToast("No wallet address"); return; }

      const valueWei = toWei(amount);
      if (valueWei <= BigInt(0)) { showToast("Please enter a valid amount"); return; }

      if (isPrivate) {
        const publicClient = createPublicClient({ chain: sepolia, transport: http(appConfig.rpcUrl) });
        
        setCurrentStep("Fetching pool contract info...");
        const poolZethc = await publicClient.readContract({
          address: poolAddress as `0x${string}`,
          abi: IDOPoolAbi as unknown as Abi,
          functionName: "zethc",
        }) as `0x${string}`;
        if (!poolZethc) { showToast("Pool zETHc address not found"); return; }

        console.log("Preparing approval:", { poolZethc, poolAddress, from, valueWei: valueWei.toString() });

        try {
          const balanceHandle = await publicClient.readContract({
            address: poolZethc,
            abi: ConfidentialZETHAbi as unknown as Abi,
            functionName: "balanceOf",
            args: [from as `0x${string}`],
          }) as `0x${string}`;
          console.log("User balance handle:", balanceHandle);
        } catch (balErr) {
          console.warn("Cannot read balance (expected behavior, needs decryption):", balErr);
        }

        const maxUint64 = BigInt("18446744073709551615");
        try {
          setCurrentStep("Encrypting approval amount...");
          const encApprove = await encryptEuint64(poolZethc, from, maxUint64, "encryptedApprove");
          console.log("Approving maximum amount (uint64.max)");
          
          setCurrentStep("Requesting approval transaction...");
          const approveHash = await wallet.writeContract({
            address: poolZethc,
            abi: ConfidentialZETHAbi as unknown as Abi,
            functionName: "encryptedApprove",
            account: from as `0x${string}`,
            args: [poolAddress as `0x${string}`, encApprove.data as `0x${string}`, encApprove.proof as `0x${string}`],
          });
          
          setCurrentStep("Waiting for approval confirmation...");
          showToast(`Approval submitted: ${approveHash.slice(0, 10)}...`);
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          console.log("Approval successful");
        } catch (approveErr) {
          const errMsg = (approveErr as Error)?.message || String(approveErr);
          console.error("Approval failed details:", approveErr);
          throw new Error(`Approval failed: ${errMsg}`);
        }

        try {
          setCurrentStep("Encrypting contribution amount...");
          const enc = await encryptEuint64(poolAddress, from, valueWei, "contribute");
          console.log("Contribution encryption successful:", { data: enc.data.slice(0, 20) + "...", proofLength: enc.proof.length });
          
          setCurrentStep("Submitting contribution transaction...");
          const hash = await wallet.writeContract({
            address: poolAddress as `0x${string}`,
            abi: IDOPoolAbi as unknown as Abi,
            functionName: "contribute",
            account: from as `0x${string}`,
            args: [enc.data as `0x${string}`, enc.proof as `0x${string}`, [], []],
          });
          
          setCurrentStep("Waiting for transaction confirmation...");
          showToast(`Contribution submitted: ${hash.slice(0, 10)}...`);
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          const parsed = parseEventLogs({ abi: IDOPoolAbi as unknown as Abi, logs: receipt.logs, eventName: "ContributedZethc" });
          const ev = parsed.find(Boolean) as unknown as { args?: { user?: string } } | undefined;
          const user = (ev?.args?.user as string | undefined) || from;
          window.dispatchEvent(new CustomEvent("pool:new-contribution", { detail: { pool: poolAddress, user, isPrivate: true, tx: receipt.transactionHash } }));
          
          fetch("/api/contributions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ poolAddress, user, isPrivate: true, tx: receipt.transactionHash }),
          }).catch(err => console.error("Failed to save contribution:", err));
          
          setCurrentStep("Contribution successful!");
          showToast("Contribution successful!");
        } catch (contributeErr) {
          const errMsg = (contributeErr as Error)?.message || String(contributeErr);
          console.error("Contribution failed details:", contributeErr);
          throw new Error(`Contribution failed: ${errMsg}`);
        }
      } else {
        setCurrentStep("Submitting public contribution...");
        const ZERO32 = ("0x" + "00".repeat(32)) as `0x${string}`;
        const hash = await wallet.writeContract({
          address: poolAddress as `0x${string}`,
          abi: IDOPoolAbi as unknown as Abi,
          functionName: "contribute",
          account: from as `0x${string}`,
          args: [ZERO32, "0x", [], []],
          value: valueWei,
        });
        setCurrentStep("Waiting for transaction confirmation...");
        showToast(`Public contribution submitted: ${hash.slice(0, 10)}...`);
        try {
          const publicClient = createPublicClient({ chain: sepolia, transport: http(appConfig.rpcUrl) });
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          const parsed = parseEventLogs({ abi: IDOPoolAbi as unknown as Abi, logs: receipt.logs, eventName: "ContributedEth" });
          const ev = parsed.find(Boolean) as unknown as { args?: { user?: string; amountWei?: bigint } } | undefined;
          const user = (ev?.args?.user as string | undefined) || from;
          const amountWei = (ev?.args?.amountWei as bigint | undefined) || valueWei;
          window.dispatchEvent(new CustomEvent("pool:new-contribution", { detail: { pool: poolAddress, user, isPrivate: false, amountWei, tx: receipt.transactionHash } }));
          
          fetch("/api/contributions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ poolAddress, user, isPrivate: false, amountWei: amountWei.toString(), tx: receipt.transactionHash }),
          }).catch(err => console.error("Failed to save contribution:", err));
          
          setCurrentStep("Contribution successful!");
          showToast("Contribution successful!");
        } catch { /* ignore */ }
      }
    } catch (e) {
      showToast(`Failed: ${(e as Error)?.message || String(e)}`);
      setCurrentStep("");
    } finally {
      setBusy(false);
      setTimeout(() => setCurrentStep(""), 3000);
    }
  }

  return (
    <div className="rounded-lg border border-black/10 bg-white card-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{actionLabel}</div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded ${isPrivate ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-800"}`}>Private</span>
          <button
            type="button"
            onClick={() => setIsPrivate(!isPrivate)}
            className={`h-6 w-10 rounded-full p-0.5 transition-colors ${isPrivate ? "bg-purple-600" : "bg-gray-300"}`}
            aria-label="toggle private/public"
          >
            <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${isPrivate ? "translate-x-4" : "translate-x-0"}`}></span>
          </button>
          <span className={`text-xs px-2 py-1 rounded ${!isPrivate ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"}`}>Public</span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs text-black/70">{isPrivate ? amountLabelPrivate : amountLabelPublic}</label>
          {isPrivate ? (
            <button
              type="button"
              onClick={onCheckBalance}
              disabled={balanceLoading}
              className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 transition-colors"
            >
              {balanceLoading ? "Checking..." : zethcBalance !== null ? `${zethcBalance} zETHc` : "Check Balance"}
            </button>
          ) : (
            <span className="text-xs text-black/60">
              Balance: {ethBalance ? `${Number(ethBalance).toFixed(4)} ETH` : "--"}
            </span>
          )}
        </div>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="decimal"
          placeholder="0"
          className="w-full h-11 rounded-lg border border-black/20 px-4 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none"
        />
      </div>

      <div className="text-[11px] text-black/60 leading-5">
        {isPrivate ? (
          <div>Private mode uses zETHc. If needed, wrap ETH → zETHc via top Swap.</div>
        ) : (
          <div>Public mode uses ETH; the amount is recorded on-chain in plaintext.</div>
        )}
        <div className="mt-1">Pool: <span className="font-mono text-[11px] align-middle whitespace-nowrap overflow-hidden text-ellipsis inline-block max-w-full" title={poolAddress}>{shortAddress(poolAddress)}</span></div>
      </div>

      {currentStep && (
        <div className="text-xs text-purple-600 bg-purple-50 rounded px-3 py-2 flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{currentStep}</span>
        </div>
      )}

      <button
        type="button"
        onClick={onContribute}
        className="w-full h-11 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
        disabled={!amount || busy}
      >
        {busy ? (currentStep || "Processing...") : actionLabel}
      </button>

      {toast && (
        <div className="fixed top-4 right-4 z-30">
          <div className="rounded-md border border-black/10 bg-white px-3 py-2 shadow max-w-xs">
            <div className="text-sm break-all whitespace-pre-wrap">{toast}</div>
          </div>
        </div>
      )}
    </div>
  );
}


