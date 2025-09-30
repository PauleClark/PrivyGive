import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'projects.json');

function ensureDataDir() {
  const dataDir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readProjects() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeProjects(projects: unknown[]) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2));
}

export async function GET() {
  try {
    const projects = readProjects();
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

    const projects = readProjects();
    projects.push(projectData);
    writeProjects(projects);

    return NextResponse.json({ success: true, id: projectData.id });
  } catch {
    return NextResponse.json({ error: 'Failed to save project' }, { status: 500 });
  }
}
