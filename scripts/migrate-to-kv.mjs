import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '..', 'data', 'projects.json');

async function migrate() {
  try {
    if (!fs.existsSync(dataPath)) {
      console.log('No projects.json file found, skipping migration');
      return;
    }

    const data = fs.readFileSync(dataPath, 'utf-8');
    const projects = JSON.parse(data);

    await kv.set('fhe-launch:projects', projects);
    
    console.log(`✅ Migrated ${projects.length} projects to Vercel KV`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();

