import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const id = (form.get("id") as string) || `proj-${Date.now()}`;
    const files = form.getAll("files");
    if (!files.length) {
      return NextResponse.json({ error: "no files" }, { status: 400 });
    }

    const saved: string[] = [];
    let idx = 0;
    for (const f of files) {
      if (!(f instanceof File)) continue;
      const ext = (f.name.split(".").pop() || "png").toLowerCase();
      const filename = `projects/${id}/${idx++}.${ext}`;
      
      const blob = await put(filename, f, {
        access: "public",
      });
      
      saved.push(blob.url);
    }

    return NextResponse.json({ id, files: saved });
  } catch (e) {
    const msg = (e as Error)?.message || String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


