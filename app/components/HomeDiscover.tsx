"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Project = {
  id: string;
  title: string;
  images?: string[];
  category?: string;
  start?: string;
  end?: string;
};

function toStatus(p: Project): { label: string; cls: string; startTs: number; endTs: number } {
  const now = Date.now();
  const s = p.start ? Date.parse(p.start) : NaN;
  const e = p.end ? Date.parse(p.end) : NaN;
  if (!Number.isNaN(s) && !Number.isNaN(e)) {
    if (now < s) return { label: "Not started", cls: "bg-gray-200 text-gray-800", startTs: s, endTs: e };
    if (now > e) return { label: "Ended", cls: "bg-red-500 text-white", startTs: s, endTs: e };
    return { label: "Ongoing", cls: "bg-green-500 text-white", startTs: s, endTs: e };
  }
  return { label: "Not started", cls: "bg-gray-200 text-gray-800", startTs: NaN, endTs: NaN };
}

export default function HomeDiscover() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/projects', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setProjects(Array.isArray(data) ? [...data].reverse().slice(0, 6) : []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-black/10 p-6 bg-white">
        <div className="text-sm text-black/60">Loading...</div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-black/10 p-6 bg-white">
        <div className="text-sm text-black/60">No projects</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((p) => {
        const coverRaw = p.images && p.images.length > 0 ? p.images[0] : undefined;
        const cover = coverRaw
          ? (coverRaw.startsWith("/") || coverRaw.startsWith("http")
              ? coverRaw
              : `/uploads/projects/${encodeURIComponent(p.id)}/${coverRaw}`)
          : undefined;
        const status = toStatus(p);
        return (
          <Link key={p.id} href={`/projects/${encodeURIComponent(p.id)}`} className="group rounded-lg border border-black/10 bg-white card-surface overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="aspect-[4/3] bg-black/5 relative">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt={p.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-black/50">No cover</div>
              )}
              <div className="absolute top-2 left-2 flex items-center gap-2">
                {p.category && (
                  <span className="text-xs px-2 py-1 rounded bg-purple-600 text-white">{p.category}</span>
                )}
              </div>
              <div className="absolute top-2 right-2">
                <span className={`text-xs px-2 py-1 rounded ${status.cls}`}>{status.label}</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <div className="text-white font-medium line-clamp-1">{p.title}</div>
                {!Number.isNaN(status.startTs) && !Number.isNaN(status.endTs) && (
                  <div className="mt-0.5 text-[11px] text-white/80 line-clamp-1">
                    {new Date(status.startTs).toLocaleString()} - {new Date(status.endTs).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}


