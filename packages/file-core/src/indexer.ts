<<<<<<< ours
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { FsAdapter } from '@logseq/fs-adapter';
// TODO: use package import when sidecar-index is published
import { parseFile } from './parse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
=======
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { openIndex, writeFile, search, backlinks, SidecarIndex } from "../../sidecar-index/src/index";
>>>>>>> theirs

interface Fingerprint {
  mtime: number;
  size: number;
  hash: string;
}

<<<<<<< ours
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
=======
type Fingerprints = Record<string, Fingerprint>;

export class Indexer {
  private index: SidecarIndex;
  public fingerprints: Fingerprints;
  constructor(private root: string) {
    this.index = openIndex(root);
    this.fingerprints = {};
    const fpPath = path.join(root, ".graph", "fingerprints.json");
    if (fs.existsSync(fpPath)) {
      this.fingerprints = JSON.parse(fs.readFileSync(fpPath, "utf8"));
    }
  }

  private fpPath() {
    return path.join(this.root, ".graph", "fingerprints.json");
  }

  private calcFingerprint(filePath: string): Fingerprint {
    const stat = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, "utf8");
    const hash = crypto.createHash("sha1").update(content).digest("hex");
    return { mtime: stat.mtimeMs, size: stat.size, hash };
  }

  private saveFingerprints() {
    fs.mkdirSync(path.dirname(this.fpPath()), { recursive: true });
    fs.writeFileSync(this.fpPath(), JSON.stringify(this.fingerprints, null, 2));
  }

  indexAll() {
    const files = fs.readdirSync(this.root).filter((f) => f.endsWith(".md"));
    for (const f of files) {
      const full = path.join(this.root, f);
      const fp = this.calcFingerprint(full);
      const prev = this.fingerprints[full];
      if (prev && prev.mtime === fp.mtime && prev.size === fp.size && prev.hash === fp.hash) {
        continue;
      }
      const content = fs.readFileSync(full, "utf8");
      writeFile(this.index, full, content);
      this.fingerprints[full] = fp;
    }
    this.saveFingerprints();
  }

  search(term: string) {
    return search(this.index, term);
  }

  backlinks(page: string) {
    return backlinks(this.index, page);
  }
>>>>>>> theirs
}
