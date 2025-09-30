import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export const runtime = "nodejs";

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const id = (form.get("id") as string) || `proj-${Date.now()}`;
    const files = form.getAll("files");
    if (!files.length) {
      return NextResponse.json({ error: "no files" }, { status: 400 });
    }

    const baseDir = path.join(process.cwd(), "public", "uploads", "projects", id);
    ensureDir(baseDir);

    const saved: string[] = [];
    let idx = 0;
    for (const f of files) {
      if (!(f instanceof File)) continue;
      const arrayBuffer = await f.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = (f.name.split(".").pop() || "png").toLowerCase();
      const filename = `${idx++}.${ext}`;
      const full = path.join(baseDir, filename);
      fs.writeFileSync(full, buffer);
      saved.push(`/uploads/projects/${id}/${filename}`);
    }

    return NextResponse.json({ id, files: saved });
  } catch (e) {
    const msg = (e as Error)?.message || String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


