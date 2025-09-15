import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { openIndex, writeFile, search, backlinks, SidecarIndex } from "../../sidecar-index/src/index";

interface Fingerprint {
  mtime: number;
  size: number;
  hash: string;
}

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
}
