import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";
import Link from "next/link";
import ContributeBox from "@/app/components/ContributeBox";
import PoolProgress from "@/app/components/PoolProgress";
import RecentContribFeed from "@/app/components/RecentContribFeed";
import GalleryWithLightbox from "@/app/components/GalleryWithLightbox";

type Props = { params: Promise<{ id: string }> };

type Project = {
  id: string;
  title: string;
  category?: string;
  description?: string;
  images?: string[];
  hardCap?: string;
  minPer?: string;
  maxPer?: string;
  start?: string;
  end?: string;
  poolAddress: string;
  creator: string;
  createdAt: string;
};

function readProjects(): Project[] {
  const file = path.join(process.cwd(), "data", "projects.json");
  if (!fs.existsSync(file)) return [] as Project[];
  try {
    const txt = fs.readFileSync(file, "utf8");
    return JSON.parse(txt) as Project[];
  } catch {
    return [] as Project[];
  }
}

function formatDate(s?: string): string {
  if (!s) return "-";
  const ts = Date.parse(s);
  if (Number.isNaN(ts)) return s;
  return new Date(ts).toLocaleString();
}

function shortAddress(addr?: string): string {
  if (!addr) return "-";
  const a = String(addr);
  if (a.length <= 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const projects = readProjects();
  const project = projects.find((pj: Project) => String(pj.id) === id);
  if (!project) return notFound();

  const images: string[] = Array.isArray(project.images) ? project.images : [];
  const normalize = (src: string): string => (src.startsWith("/") || src.startsWith("http")) ? src : `/uploads/projects/${encodeURIComponent(project.id)}/${src}`;
  const normImages = images.map(normalize);
  const cover = normImages[0];
  const now = Date.now();
  const startTs = project.start ? Date.parse(project.start) : NaN;
  const endTs = project.end ? Date.parse(project.end) : NaN;
  const status = (!Number.isNaN(startTs) && !Number.isNaN(endTs))
    ? (now < startTs ? "Upcoming" as const : now > endTs ? "Ended" as const : "Ongoing" as const)
    : ("Upcoming" as const);
  const statusClassEn = status === "Ongoing" ? "bg-green-500 text-white" : status === "Ended" ? "bg-red-500 text-white" : "bg-gray-200 text-gray-800";

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

  const actionLabel = project.category === "crowdfunding" || project.category === "Crowdfunding" ? "Contribute"
    : project.category === "donation" || project.category === "Donation" ? "Donate"
    : project.category === "sponsorship" || project.category === "Sponsorship" ? "Sponsor"
    : project.category === "tip" || project.category === "Tip" ? "Tip"
    : "Participate";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/projects" className="text-sm text-black/60 hover:underline">← Back to Discover</Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-black/10 bg-white card-surface">
        <div className="relative">
          <div className="aspect-[16/7] bg-black/5">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt={project.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-black/50">No cover</div>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex items-center gap-2 mb-2">
              {project.category && (
                <span className="text-xs px-2 py-1 rounded bg-purple-600 text-white">{mapCategory(project.category)}</span>
              )}
              <span className={`text-xs px-2 py-1 rounded ${statusClassEn}`}>{status}</span>
            </div>
            <h1 className="text-white text-2xl font-semibold drop-shadow">{project.title}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4">
          <div className="rounded-lg border border-black/10 p-3 bg-white card-surface">
            <div className="text-xs text-black/60">Hard Cap</div>
            <div className="text-lg font-semibold">{project.hardCap || "-"} ETH</div>
          </div>
          <div className="rounded-lg border border-black/10 p-3 bg-white card-surface">
            <div className="text-xs text-black/60">Min / Max per</div>
            <div className="text-lg font-semibold">{project.minPer || "-"} / {project.maxPer || "Unlimited"} ETH</div>
          </div>
          <div className="rounded-lg border border-black/10 p-3 bg-white card-surface">
            <div className="text-xs text-black/60">Time</div>
            <div className="text-sm font-medium leading-5">{formatDate(project.start)} — {formatDate(project.end)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <PoolProgress poolAddress={project.poolAddress} title={`${actionLabel} Progress`} />
          {project.description && (
          <div className="rounded-lg border border-black/10 bg-white card-surface p-4">
              <h2 className="text-base font-medium mb-2">Description</h2>
              <p className="text-sm text-black/80 whitespace-pre-wrap leading-6">{project.description}</p>
            </div>
          )}

          {images.length > 0 && (
            <div className="rounded-lg border border-black/10 bg-white card-surface p-4">
              <h2 className="text-base font-medium mb-3">Images</h2>
              <GalleryWithLightbox images={normImages} title={project.title} />
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-black/10 bg-white card-surface p-4 text-sm space-y-2">
            <div>
              <div className="text-black/60">Pool Address</div>
              <div className="font-mono text-[13px] whitespace-nowrap overflow-hidden text-ellipsis" title={project.poolAddress}>{shortAddress(project.poolAddress)}</div>
            </div>
            <div>
              <div className="text-black/60">Creator</div>
              <div className="font-mono text-[13px] whitespace-nowrap overflow-hidden text-ellipsis" title={project.creator}>{shortAddress(project.creator)}</div>
            </div>
            <div>
              <div className="text-black/60">Created At</div>
              <div>{formatDate(project.createdAt)}</div>
            </div>
          </div>

          <ContributeBox
            poolAddress={project.poolAddress}
            actionLabel={actionLabel}
            amountLabelPrivate={`${actionLabel} Amount (zETHc)`}
            amountLabelPublic={`${actionLabel} Amount (ETH)`}
          />
          <RecentContribFeed poolAddress={project.poolAddress} />
        </aside>
      </div>
    </div>
  );
}


