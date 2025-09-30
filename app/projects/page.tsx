"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Project {
  id: string;
  title: string;
  images?: string[];
  category?: string;
  start?: string;
  end?: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch('/api/projects', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          setProjects(Array.isArray(data) ? [...data].reverse() : []);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Discover</h1>
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const now = Date.now();
  const toBucket = (p: Project): "upcoming" | "ongoing" | "ended" => {
    const s = p.start ? Date.parse(p.start) : NaN;
    const e = p.end ? Date.parse(p.end) : NaN;
    if (!Number.isNaN(s) && !Number.isNaN(e)) {
      if (now < s) return "upcoming";
      if (now > e) return "ended";
      return "ongoing";
    }
    return "upcoming";
  };

  const buckets = {
    ongoing: projects.filter(p => toBucket(p) === "ongoing"),
    upcoming: projects.filter(p => toBucket(p) === "upcoming"),
    ended: projects.filter(p => toBucket(p) === "ended"),
  };

  const mapCategory = (cat?: string): string | undefined => {
    if (!cat) return undefined;
    switch (cat) {
      case "crowdfunding": return "Crowdfunding";
      case "donation": return "Donation";
      case "sponsorship": return "Sponsorship";
      case "tip": return "Tip";
      default: return cat;
    }
  };

  const Card = ({ project }: { project: Project }) => {
    const coverRaw = project.images && project.images.length > 0 ? project.images[0] : undefined;
    const cover = coverRaw
      ? (coverRaw.startsWith("/") || coverRaw.startsWith("http")
          ? coverRaw
          : `/uploads/projects/${encodeURIComponent(project.id)}/${coverRaw}`)
      : undefined;
    const startTs = project.start ? Date.parse(project.start) : NaN;
    const endTs = project.end ? Date.parse(project.end) : NaN;
    const status = toBucket(project);
    const statusLabel = status === "ongoing" ? "Ongoing" : status === "upcoming" ? "Upcoming" : "Ended";
    const statusClass = status === "ongoing" ? "bg-green-500 text-white" : status === "ended" ? "bg-red-500 text-white" : "bg-gray-200 text-gray-800";
    return (
      <Link
        href={`/projects/${encodeURIComponent(project.id)}`}
        className="group rounded-lg border border-black/10 bg-white card-surface overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="aspect-[4/3] bg-black/5 relative">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={project.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-black/50">No cover</div>
          )}
          <div className="absolute top-2 left-2 flex items-center gap-2">
            {project.category && (
              <span className="text-xs px-2 py-1 rounded bg-purple-600 text-white">{mapCategory(project.category)}</span>
            )}
          </div>
          <div className="absolute top-2 right-2">
            <span className={`text-xs px-2 py-1 rounded ${statusClass}`}>{statusLabel}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
            <div className="text-white font-medium line-clamp-1">{project.title}</div>
            {!Number.isNaN(startTs) && !Number.isNaN(endTs) && (
              <div className="mt-0.5 text-[11px] text-white/80 line-clamp-1">
                {new Date(startTs).toLocaleString()} - {new Date(endTs).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Discover</h1>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-black/10 p-4">
          <p className="text-sm text-black/70">No projects</p>
        </div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-base font-medium">Ongoing</h2>
            {buckets.ongoing.length === 0 ? (
              <div className="text-sm text-black/50">No ongoing projects</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {buckets.ongoing.map(p => (<Card key={p.id} project={p} />))}
              </div>
            )}
          </section>
          <section className="space-y-3">
            <h2 className="text-base font-medium">Upcoming</h2>
            {buckets.upcoming.length === 0 ? (
              <div className="text-sm text-black/50">No upcoming projects</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {buckets.upcoming.map(p => (<Card key={p.id} project={p} />))}
              </div>
            )}
          </section>
          <section className="space-y-3">
            <h2 className="text-base font-medium">Ended</h2>
            {buckets.ended.length === 0 ? (
              <div className="text-sm text-black/50">No ended projects</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {buckets.ended.map(p => (<Card key={p.id} project={p} />))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

