import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { FsAdapter } from '@logseq/fs-adapter';
// TODO: use package import when sidecar-index is published
import { parseFile } from './parse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Fingerprint {
  mtime: number;
  size: number;
  hash: string;
}

export async function indexGraph(root: string, adapter: FsAdapter) {
  const modPath = path.resolve(__dirname, '../../../sidecar-index/dist/index.js');
  const mod = (await import(modPath)) as any;
  const sidecar = await mod.openSidecar(root);
  const fpPath = path.join(root, '.graph', 'fingerprints.json');
  let fps: Record<string, Fingerprint> = {};
  if (fs.existsSync(fpPath)) {
    fps = JSON.parse(fs.readFileSync(fpPath, 'utf8'));
  }
  const files = await adapter.listFiles(root);
  const mdFiles = files.filter((f: string) => f.endsWith('.md'));
  const updated: string[] = [];

  for (const file of mdFiles) {
    const content = await adapter.readFile(file);
    const stat = await adapter.stat(file);
    const hash = crypto.createHash('sha1').update(content).digest('hex');
    const fp: Fingerprint = { mtime: stat.mtimeMs, size: content.length, hash };
    const rel = path.relative(root, file);
    const prev = fps[rel];
    if (!prev || prev.mtime !== fp.mtime || prev.size !== fp.size || prev.hash !== fp.hash) {
      const parsed = parseFile(file, content);
      sidecar.update(parsed.page, parsed.blocks);
      fps[rel] = fp;
      updated.push(rel);
    }
  }

  await sidecar.save();
  fs.mkdirSync(path.dirname(fpPath), { recursive: true });
  fs.writeFileSync(fpPath, JSON.stringify(fps, null, 2), 'utf8');
  return updated;
}
