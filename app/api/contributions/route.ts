import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const dataPath = path.join(process.cwd(), "data", "projects.json");

interface Contribution {
  user: string;
  isPrivate: boolean;
  amountWei?: string;
  tx?: string;
  timestamp: number;
}

interface Project {
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
  contributions?: Contribution[];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { poolAddress, user, isPrivate, amountWei, tx } = body;

    if (!poolAddress || !user) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const raw = await fs.readFile(dataPath, "utf-8");
    const projects = JSON.parse(raw) as Project[];

    const project = projects.find(
      (p: Project) => p.poolAddress?.toLowerCase() === poolAddress.toLowerCase()
    );

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!project.contributions) {
      project.contributions = [];
    }

    project.contributions.push({
      user,
      isPrivate,
      amountWei: amountWei?.toString(),
      tx,
      timestamp: Date.now(),
    });

    await fs.writeFile(dataPath, JSON.stringify(projects, null, 2), "utf-8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save contribution:", error);
    return NextResponse.json(
      { error: "Failed to save contribution" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const poolAddress = searchParams.get("poolAddress");

    if (!poolAddress) {
      return NextResponse.json({ error: "Missing poolAddress" }, { status: 400 });
    }

    const raw = await fs.readFile(dataPath, "utf-8");
    const projects = JSON.parse(raw) as Project[];

    const project = projects.find(
      (p: Project) => p.poolAddress?.toLowerCase() === poolAddress.toLowerCase()
    );

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const contributions = project.contributions || [];
    contributions.sort((a: Contribution, b: Contribution) => b.timestamp - a.timestamp);

    return NextResponse.json({ contributions });
  } catch (error) {
    console.error("Failed to fetch contributions:", error);
    return NextResponse.json(
      { error: "Failed to fetch contributions" },
      { status: 500 }
    );
  }
}
