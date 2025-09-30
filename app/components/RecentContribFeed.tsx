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

export default function RecentContribFeed({ poolAddress }: RecentContribFeedProps) {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    let stopped = false;
    
    function onLocal(e: Event) {
      const d = (e as CustomEvent).detail as { pool: string; user: string; isPrivate: boolean; amountWei?: bigint; tx?: string };
      if (!d || d.pool?.toLowerCase() !== poolAddress.toLowerCase()) return;
      setEntries(prev => [
        { 
          key: `${d.tx || Date.now()}-local`, 
          user: d.user, 
          isPrivate: d.isPrivate, 
          amountWei: d.amountWei, 
          tx: d.tx, 
          ts: Date.now() 
        }, 
        ...prev
      ].slice(0, 50));
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
        
        setEntries(mapped.slice(0, 50));
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


