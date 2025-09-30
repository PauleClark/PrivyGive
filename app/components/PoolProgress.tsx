"use client";

import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import type { Abi } from "viem";
import { IDOPoolAbi } from "@/abi/IDOPool";
import appConfig from "@/config/app.config";
import { userDecryptEuint64 } from "@/fhevm/relayer";

interface PoolProgressProps {
  poolAddress: string;
  title?: string;
}

function formatEth(bi: bigint): string {
  const ZERO = BigInt(0);
  const ONE_E18 = BigInt("1000000000000000000");
  const neg = bi < ZERO;
  const v = neg ? -bi : bi;
  const int = v / ONE_E18;
  const frac = (v % ONE_E18).toString().padStart(18, "0").slice(0, 4);
  return `${neg ? "-" : ""}${int.toString()}.${frac}`;
}

export default function PoolProgress({ poolAddress, title }: PoolProgressProps) {
  const [hardCapPublic, setHardCapPublic] = useState<bigint>(BigInt(0));
  const [raisedEthPublic, setRaisedEthPublic] = useState<bigint>(BigInt(0));
  const [encryptedMyContrib, setEncryptedMyContrib] = useState<`0x${string}` | null>(null);
  const [decMyContrib, setDecMyContrib] = useState<bigint | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [decLoading, setDecLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<string>("");
  const [userAddress, setUserAddress] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 5000);
  }

  useEffect(() => {
    const client = createPublicClient({ chain: sepolia, transport: http(appConfig.rpcUrl) });
    (async () => {
      try {
        const [hc, re] = await Promise.all([
          client.readContract({ address: poolAddress as `0x${string}`, abi: IDOPoolAbi as unknown as Abi, functionName: "hardCapPublic" }) as Promise<bigint>,
          client.readContract({ address: poolAddress as `0x${string}`, abi: IDOPoolAbi as unknown as Abi, functionName: "raisedEthPublic" }) as Promise<bigint>,
        ]);
        setHardCapPublic(hc);
        setRaisedEthPublic(re);

        const eth = (window as unknown as { ethereum?: unknown }).ethereum as { request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown> } | undefined;
        if (eth) {
          try {
            const accountsResponse = await eth.request({ method: "eth_requestAccounts" });
            const accounts = Array.isArray(accountsResponse) ? accountsResponse as string[] : [];
            const addr = accounts[0];
            if (!addr) return;
            setUserAddress(addr);
            
            try {
              const { result: myContrib } = await client.simulateContract({
                address: poolAddress as `0x${string}`,
                abi: IDOPoolAbi as unknown as Abi,
                functionName: "encryptedUserContrib",
                args: [addr],
                account: addr as `0x${string}`,
              });
              const contribHandle = myContrib as `0x${string}`;
              // Check if user has no encrypted contribution (zero handle)
              if (/^0x0+$/i.test(contribHandle)) {
                // User has no encrypted contribution, set to 0 directly
                setDecMyContrib(BigInt(0));
                setEncryptedMyContrib(null); // Clear the encrypted handle
              } else {
                // User has actual encrypted contribution
                setEncryptedMyContrib(contribHandle);
              }
            } catch (contribErr) {
              console.error("Failed to read encrypted contribution:", contribErr);
            }
          } catch {
            const [hc, re] = await Promise.all([
              client.readContract({ address: poolAddress as `0x${string}`, abi: IDOPoolAbi as unknown as Abi, functionName: "hardCapPublic" }) as Promise<bigint>,
              client.readContract({ address: poolAddress as `0x${string}`, abi: IDOPoolAbi as unknown as Abi, functionName: "raisedEthPublic" }) as Promise<bigint>,
            ]);
            setHardCapPublic(hc);
            setRaisedEthPublic(re);
          }
        }
      } catch (e) {
        showToast(`Failed to read progress: ${(e as Error)?.message || String(e)}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [poolAddress]);

  function percent(n: bigint, d: bigint): number {
    const ZERO = BigInt(0);
    const HUNDRED_X100 = BigInt(10000);
    if (d === ZERO) return 0;
    const p = Number((n * HUNDRED_X100) / d) / 100;
    return Math.max(0, Math.min(100, p));
  }

  async function onDecrypt() {
    if (!encryptedMyContrib) { showToast("No encrypted contribution data"); return; }
    if (!userAddress) { showToast("Please connect wallet"); return; }
    
    // Check if the encrypted contribution is a zero handle (user has no encrypted contribution)
    if (/^0x0+$/i.test(encryptedMyContrib)) {
      setDecMyContrib(BigInt(0));
      showToast("No encrypted contribution found (balance: 0)");
      return;
    }
    
    setDecLoading(true);
    try {
      const myContrib = await userDecryptEuint64(poolAddress, encryptedMyContrib);
      setDecMyContrib(myContrib);
      showToast("My contribution decrypted successfully!");
    } catch (e) {
      const errMsg = (e as Error)?.message || String(e);
      showToast(`Decryption failed: ${errMsg}`);
    } finally {
      setDecLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-black/10 bg-white card-surface p-4 space-y-4">
      <div className="text-sm font-medium">{title ?? "Pool Info"}</div>

      <div className="space-y-2">
        <div className="text-xs text-black/60">Public ETH Progress</div>
        <div className="h-2 w-full bg-black/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600"
            style={{ width: `${percent(raisedEthPublic, hardCapPublic)}%` }}
          />
        </div>
        <div className="text-xs text-black/70 flex justify-between">
          <span>{formatEth(raisedEthPublic)} / {formatEth(hardCapPublic)} ETH</span>
          <span>{percent(raisedEthPublic, hardCapPublic).toFixed(2)}%</span>
        </div>
      </div>

      {userAddress && (
        <div className="space-y-2 border-t border-black/10 pt-3">
          <div className="text-xs text-black/60">My Confidential Contribution</div>
          <div className="flex items-center justify-between">
            <div className="text-sm font-mono">
              {decMyContrib !== null ? (
                <span className="text-purple-600 font-semibold">{formatEth(decMyContrib)} ETH</span>
              ) : encryptedMyContrib ? (
                <span className="text-black/40">Encrypted - Click Decrypt</span>
              ) : (
                <span className="text-black/40">No encrypted contribution</span>
              )}
            </div>
            {encryptedMyContrib && (
              <button 
                onClick={onDecrypt} 
                className="text-xs px-3 py-1.5 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors" 
                disabled={decLoading}
              >
                {decLoading ? "Decrypting..." : "Decrypt"}
              </button>
            )}
          </div>
        </div>
      )}

      {loading && <div className="text-xs text-black/50">Loading...</div>}
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


