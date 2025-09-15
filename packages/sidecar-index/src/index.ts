import fs from "node:fs";
import path from "node:path";
import { updateFile, IndexData } from "./write";
import { search as readSearch, backlinks as readBacklinks } from "./read";

export interface SidecarIndex {
  data: IndexData;
  root: string;
}

export function openIndex(graphDir: string): SidecarIndex {
  const graphPath = path.join(graphDir, ".graph");
  fs.mkdirSync(graphPath, { recursive: true });
  const indexFile = path.join(graphPath, "index.json");
  let data: IndexData = { files: {}, blocks: {}, links: {} };
  if (fs.existsSync(indexFile)) {
    data = JSON.parse(fs.readFileSync(indexFile, "utf8"));
  }
  return { data, root: graphDir };
}

function persist(index: SidecarIndex) {
  const indexFile = path.join(index.root, ".graph", "index.json");
  fs.writeFileSync(indexFile, JSON.stringify(index.data, null, 2));
}

export function writeFile(index: SidecarIndex, filePath: string, content: string) {
  updateFile(index.data, filePath, content);
  persist(index);
}

export function search(index: SidecarIndex, term: string) {
  return readSearch(index.data, term);
}

export function backlinks(index: SidecarIndex, page: string) {
  return readBacklinks(index.data, page);
}
