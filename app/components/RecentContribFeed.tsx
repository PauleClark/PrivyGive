"use client";

import { useEffect, useState } from "react";

interface RecentContribFeedProps {
  poolAddress: string;
}

interface ContributionData {
  user: string;
  isPrivate: boolean;
  amountWei?: string;
  tx?: string;
  timestamp: number;
}

type Entry = {
  key: string;
  user: string;
  isPrivate: boolean;
  amountWei?: bigint;
  tx?: string;
  ts?: number;
};

function short(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatEth(bi?: bigint) {
  if (bi === undefined) return "**";
  const ONE_E18 = BigInt("1000000000000000000");
  const int = bi / ONE_E18;
  const frac = (bi % ONE_E18).toString().padStart(18, "0").slice(0, 4);
  return `${int.toString()}.${frac}`;
}

const LOCAL_STORAGE_KEY = "fhe-launch-local-contributions";

function saveLocalContributions(poolAddress: string, entries: Entry[]) {
  if (typeof window === 'undefined') return;
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "{}");
    const serialized = entries.map(e => ({
      ...e,
      amountWei: e.amountWei?.toString(),
    }));
    stored[poolAddress.toLowerCase()] = serialized;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stored));
  } catch (err) {
    console.error("Failed to save local contributions:", err);
  }
}

function loadLocalContributions(poolAddress: string): Entry[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "{}");
    const serialized = stored[poolAddress.toLowerCase()] || [];
    return serialized.map((e: Entry & { amountWei?: string }) => ({
      ...e,
      amountWei: e.amountWei ? BigInt(e.amountWei) : undefined,
    }));
  } catch (err) {
    console.error("Failed to load local contributions:", err);
    return [];
  }
}

export default function RecentContribFeed({ poolAddress }: RecentContribFeedProps) {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    let stopped = false;
    
    const localEntries = loadLocalContributions(poolAddress);
    if (localEntries.length > 0) {
      setEntries(localEntries);
    }
    
    function onLocal(e: Event) {
      const d = (e as CustomEvent).detail as { pool: string; user: string; isPrivate: boolean; amountWei?: bigint; tx?: string };
      if (!d || d.pool?.toLowerCase() !== poolAddress.toLowerCase()) return;
      const newEntry = { 
        key: `${d.tx || Date.now()}-local`, 
        user: d.user, 
        isPrivate: d.isPrivate, 
        amountWei: d.amountWei, 
        tx: d.tx, 
        ts: Date.now() 
      };
      setEntries(prev => {
        const updated = [newEntry, ...prev].slice(0, 50);
        const localOnly = updated.filter(e => e.key.endsWith('-local'));
        saveLocalContributions(poolAddress, localOnly);
        return updated;
      });
    }
    window.addEventListener("pool:new-contribution", onLocal as EventListener);

    const fetchContributions = async () => {
      try {
        const response = await fetch(`/api/contributions?poolAddress=${encodeURIComponent(poolAddress)}`);
        if (!response.ok) return;
        
        const data = await response.json();
        const contributions = data.contributions || [];
        
        const mapped: Entry[] = contributions.map((c: ContributionData) => ({
          key: `${c.tx || c.timestamp}`,
          user: c.user,
          isPrivate: c.isPrivate,
          amountWei: c.amountWei ? BigInt(c.amountWei) : undefined,
          tx: c.tx,
          ts: c.timestamp,
        }));
        
        setEntries(prev => {
          const localEntries = prev.filter(e => e.key.endsWith('-local'));
          const apiTxSet = new Set(mapped.map(m => m.tx).filter(Boolean));
          const uniqueLocal = localEntries.filter(e => !e.tx || !apiTxSet.has(e.tx));
          const merged = [...uniqueLocal, ...mapped];
          saveLocalContributions(poolAddress, uniqueLocal);
          return merged.slice(0, 50);
        });
      } catch (err) {
        console.error('Failed to fetch contributions:', err);
      }
    };

    fetchContributions();

    const timer = window.setInterval(() => {
      if (!stopped) fetchContributions();
    }, 10000);

    return () => { 
      stopped = true; 
      window.clearInterval(timer); 
      window.removeEventListener("pool:new-contribution", onLocal as EventListener); 
    };
  }, [poolAddress]);

  return (
    <div className="rounded-lg border border-black/10 bg-white card-surface p-4 space-y-3">
      <div className="text-sm font-medium">Recent Contributions</div>
      <div className="h-60 overflow-auto space-y-2 pr-1">
        {entries.length === 0 ? (
          <div className="text-xs text-black/50">No records</div>
        ) : (
          entries.map((e) => (
            <div key={e.key} className="flex items-center justify-between text-sm">
              <div className="font-mono text-[12px] text-black/70">{short(e.user)}</div>
              <div className={`text-[12px] ${e.isPrivate ? "text-black/50" : "text-black/80"}`}>
                {e.isPrivate ? "**" : `${formatEth(e.amountWei)} ETH`}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


