import path from './browser-path.js';
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

export interface IndexProgress {
  processed: number;
  total: number;
  updated: string[];
}

export async function indexGraph(
  root: string,
  adapter: FsAdapter,
  options?: {
    batchSize?: number;
    onProgress?: (progress: IndexProgress) => void;
    signal?: AbortSignal;
  }
): Promise<string[]> {
  const batchSize = options?.batchSize ?? 20;
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

  for (let i = 0; i < mdFiles.length; i += batchSize) {
    if (options?.signal?.aborted) {
      break;
    }

    const batch = mdFiles.slice(i, i + batchSize);
    
    for (const file of batch) {
      if (options?.signal?.aborted) {
        break;
      }

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

    if (options?.onProgress) {
      options.onProgress({
        processed: Math.min(i + batchSize, mdFiles.length),
        total: mdFiles.length,
        updated: [...updated]
      });
    }

    await new Promise(resolve => setTimeout(resolve, 0));
  }

  await sidecar.save();
  fs.mkdirSync(path.dirname(fpPath), { recursive: true });
  fs.writeFileSync(fpPath, JSON.stringify(fps, null, 2), 'utf8');
  return updated;
}
