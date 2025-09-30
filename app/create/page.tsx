"use client";

import { useEffect, useState, Suspense } from "react";
import { useWallet } from "../wallet-provider";
import { useRouter, useSearchParams } from "next/navigation";
import appConfig from "@/config/app.config";
import { LaunchpadFactoryAbi } from "@/abi/LaunchpadFactory";
import { createWalletClient, custom } from "viem";
import { sepolia } from "viem/chains";
import type { Abi } from "viem";

type EIP1193Provider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

function CreatePageInner() {
  const { isConnected, address } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [category, setCategory] = useState("crowdfunding");
  const [description, setDescription] = useState("");
  const [hardCap, setHardCap] = useState("");
  const [minPer, setMinPer] = useState("");
  const [maxPer, setMaxPer] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [startNow, setStartNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [creatingPool, setCreatingPool] = useState(false);
  const [poolAddress, setPoolAddress] = useState<string>("");
  const [toast, setToast] = useState<string>("");
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = images.map(img => URL.createObjectURL(img));
    setPreviewUrls(urls);
    return () => { urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [images]);

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam && ['crowdfunding', 'donation', 'sponsorship', 'tip'].includes(categoryParam)) {
      setCategory(categoryParam);
    }
  }, [searchParams]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 5000);
  }

  function parseDateTimeToSeconds(input: string): number {
    const normalized = String(input || "").trim().replace("T", " ");
    const m = normalized.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2})$/);
    if (!m) return 0;
    const [, yyyy, mm, dd, HH, MM] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(HH), Number(MM), 0, 0);
    const ts = d.getTime();
    if (Number.isNaN(ts)) return 0;
    return Math.floor(ts / 1000);
  }

  async function onCreatePool() {
    try {
      if (!isConnected || !address) { showToast("Please connect wallet first"); return; }
      if (!title) { showToast("Please enter title"); return; }
      const nowSec = Math.floor(Date.now() / 1000);
      const startTs = startNow ? nowSec : parseDateTimeToSeconds(start);
      const endTs = parseDateTimeToSeconds(end);
      if (!endTs) { showToast("Please select valid end time"); return; }
      if (!startNow && !startTs) { showToast("Please select valid start time"); return; }
      if (endTs <= startTs) { showToast("End time must be later than start time"); return; }
      if (!startNow && startTs <= nowSec + 120) { showToast("Start time must be at least 2 minutes from now"); return; }
      const toWei = (s: string): bigint => {
        const n = String(s || "0").trim();
        if (!n) return BigInt(0);
        if (!/^[0-9]*\.?[0-9]*$/.test(n)) return BigInt(0);
        const [intPart, fracPart = ""] = n.split(".");
        const frac = (fracPart + "000000000000000000").slice(0, 18);
        const bi = BigInt(intPart || "0") * BigInt("1000000000000000000") + BigInt(frac || "0");
        return bi;
      };
      const hardCapWei = toWei(hardCap);
      const minWei = toWei(minPer);
      const maxWei = toWei(maxPer);
      const U64_MAX = BigInt("18446744073709551615");
      if (hardCapWei > U64_MAX || minWei > U64_MAX || maxWei > U64_MAX) {
        showToast("Amount exceeds limit, please reduce input");
        return;
      }
      if (maxWei !== BigInt(0) && maxWei < minWei) { showToast("Min amount cannot be greater than max amount"); return; }

      setCreatingPool(true);

      const anyWindow = window as unknown as { ethereum?: unknown };
      if (!anyWindow.ethereum) { showToast("Wallet not detected"); setCreatingPool(false); return; }

      const wallet = createWalletClient({ chain: sepolia, transport: custom(anyWindow.ethereum as EIP1193Provider) });
      const factory = appConfig.factoryAddress as `0x${string}`;

      const hash = await wallet.writeContract({
        address: factory,
        abi: LaunchpadFactoryAbi as unknown as readonly unknown[],
        functionName: "createAndInitPool",
        account: address as `0x${string}`,
        args: [
          title,
          BigInt(1),
          BigInt(1),
          BigInt(startTs),
          BigInt(endTs),
          minWei,
          maxWei,
          hardCapWei,
          startNow
        ]
      });
      showToast("Creating pool, please wait for confirmation...");
      const { createPublicClient, http, parseEventLogs } = await import("viem");
      const publicClient = createPublicClient({ chain: sepolia, transport: http(appConfig.rpcUrl) });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const parsed = parseEventLogs({ abi: LaunchpadFactoryAbi as unknown as Abi, logs: receipt.logs, eventName: "PoolCreated" });
      const last = parsed[parsed.length - 1] as unknown as { args?: { pool?: string } } | undefined;
      const newPool = last?.args?.pool;
      if (newPool) {
        setPoolAddress(newPool as string);
        showToast("Pool created successfully!");
      } else {
        showToast("Failed to parse pool address, please check later");
      }
      setCreatingPool(false);
      
    } catch (e) {
      const msg = (e as Error)?.message || String(e);
      showToast(`Pool creation failed: ${msg}`);
      setCreatingPool(false);
    }
  }

  async function onCreateProject() {
    if (!poolAddress) { showToast("Please create pool first"); return; }
    if (!title) { showToast("Please enter title"); return; }
    
    setBusy(true);
    try {
      const projectId = `proj-${Date.now()}`;
      let imageUrls: string[] = [];
      if (images.length > 0) {
        const form = new FormData();
        form.append("id", projectId);
        images.forEach((file) => form.append("files", file));
        const up = await fetch('/api/upload', { method: 'POST', body: form });
        if (!up.ok) {
          const errText = await up.text();
          throw new Error(`Upload failed: ${errText}`);
        }
        const upJson = await up.json() as { id: string; files: string[] };
        imageUrls = upJson.files || [];
      }

      const startSaved = startNow ? new Date().toISOString() : start;
      const projectData = {
        id: projectId,
        title,
        category,
        description,
        images: imageUrls,
        hardCap,
        minPer,
        maxPer,
        start: startSaved,
        end,
        poolAddress,
        creator: address,
        createdAt: new Date().toISOString()
      };

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });

      if (response.ok) {
        showToast("Project created successfully!");
        setTitle("");
        setImages([]);
        setCategory("crowdfunding");
        setDescription("");
        setHardCap("");
        setMinPer("");
        setMaxPer("");
        setStart("");
        setEnd("");
        setPoolAddress("");
        window.setTimeout(() => router.push('/projects'), 1200);
      } else {
        showToast("Project save failed");
      }
    } catch (e) {
      const msg = (e as Error)?.message || String(e);
      showToast(`Project creation failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold mb-4">Create</h1>
      <div className="space-y-6 rounded-2xl border border-black/10 bg-white card-surface p-4 shadow-sm">
        <div>
          <label className="block text-sm mb-2">Images</label>
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {previewUrls.map((url, idx) => (
                <div key={idx} className="aspect-square rounded-md border border-black/10 overflow-hidden bg-white card-surface relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImages(prev => prev.filter((_, i) => i !== idx));
                    }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
              <div className="aspect-square rounded-md border border-black/10 bg-black/5 flex items-center justify-center relative overflow-hidden">
                <span className="text-xs text-black/50">Add Images</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setImages(prev => [...prev, ...files]);
                  }} 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                />
              </div>
            </div>
            {images.length > 0 && (
              <button 
                type="button" 
                onClick={() => setImages([])} 
                className="text-xs text-red-600 hover:underline"
              >
                Clear all images
              </button>
            )}
          </div>
        </div>
        
        <div>
          <label className="block text-sm mb-1 font-medium">Title</label>
          <input className="w-full rounded-lg border border-black/20 px-4 py-3 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        
        <div>
          <label className="block text-sm mb-2 font-medium">Category</label>
          <div className="flex gap-3">
            {["crowdfunding", "donation", "sponsorship", "tip"].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  category === cat 
                    ? "bg-purple-600 text-white border-purple-600" 
                    : "bg-white text-black border-black/20 hover:border-purple-300"
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1 font-medium">Description</label>
          <textarea className="w-full min-h-28 rounded-lg border border-black/20 px-4 py-3 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none resize-none transition-all" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1 font-medium">Total Funds to Raise (ETH)</label>
            <input className="w-full rounded-lg border border-black/20 px-4 py-3 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all" value={hardCap} onChange={(e) => setHardCap(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">Min per Person (ETH)</label>
            <input className="w-full rounded-lg border border-black/20 px-4 py-3 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all" value={minPer} onChange={(e) => setMinPer(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">Max per Person (ETH)</label>
            <input className="w-full rounded-lg border border-black/20 px-4 py-3 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all" value={maxPer} onChange={(e) => setMaxPer(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0 (unlimited)" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1 font-medium">Start Time</label>
            <div className="flex items-center gap-3">
              <input
                lang="en-US"
                type="datetime-local"
                className="w-full rounded-lg border border-black/20 px-4 py-3 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all disabled:opacity-50"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                disabled={startNow}
              />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <input id="start-now" type="checkbox" checked={startNow} onChange={() => setStartNow(!startNow)} />
              <label htmlFor="start-now">Start Immediately</label>
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">End Time</label>
            <input lang="en-US" type="datetime-local" className="w-full rounded-lg border border-black/20 px-4 py-3 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all" value={end} onChange={(e) => setEnd(e.target.value)} min={start || new Date().toISOString().slice(0, 16)} />
          </div>
        </div>
        {poolAddress && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <span className="font-medium">Pool Address: </span>
              <span className="font-mono break-all">{poolAddress}</span>
            </p>
          </div>
        )}

        <div className="pt-2 flex justify-end gap-3">
          <button 
            disabled={creatingPool || poolAddress !== ""} 
            onClick={onCreatePool} 
            className="h-11 px-6 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creatingPool ? "Creating Pool..." : "Create Pool"}
          </button>
          <button 
            disabled={busy || !poolAddress} 
            onClick={onCreateProject} 
            className={`h-11 px-6 rounded-lg text-white disabled:opacity-50 ${
              poolAddress ? "bg-purple-600 hover:bg-purple-700" : "bg-gray-400"
            }`}
          >
            {busy ? "Creating Project..." : "Create Project"}
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-30">
          <div className="rounded-md border border-black/10 bg-background px-3 py-2 shadow max-w-xs">
            <div className="text-sm break-all whitespace-pre-wrap">{toast}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-black/60">Loading...</div>}>
      <CreatePageInner />
    </Suspense>
  );
}


