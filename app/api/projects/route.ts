import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const PROJECTS_KEY = 'fhe-launch:projects';

async function readProjects() {
  try {
    const projects = await kv.get<unknown[]>(PROJECTS_KEY);
    return projects || [];
  } catch {
    return [];
  }
}

async function writeProjects(projects: unknown[]) {
  await kv.set(PROJECTS_KEY, projects);
}

export async function GET() {
  try {
    const projects = await readProjects();
    return NextResponse.json(projects);
  } catch {
    return NextResponse.json({ error: 'Failed to read projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const projectData = await request.json();
    
    if (!projectData.title || !projectData.poolAddress || !projectData.creator) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const projects = await readProjects();
    projects.push(projectData);
    await writeProjects(projects);

    return NextResponse.json({ success: true, id: projectData.id });
  } catch {
    return NextResponse.json({ error: 'Failed to save project' }, { status: 500 });
  }
}
