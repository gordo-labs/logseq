import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { Indexer } from "../src/indexer";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "graph-"));
const a = path.join(dir, "a.md");
const b = path.join(dir, "b.md");
fs.writeFileSync(a, "A page\n\n[[B]] link to B\n");
fs.writeFileSync(b, "B page\n");

const idx = new Indexer(dir);
idx.indexAll();

let results = idx.search("link");
assert.equal(results.length, 1);
assert.ok(results[0].text.includes("[[B]]"));

let bl = idx.backlinks("B");
assert.equal(bl.length, 1);
assert.ok(bl[0].text.includes("[[B]]"));

const fpBefore = idx.fingerprints[a];

fs.writeFileSync(b, "B page\n\nreference [[A]]\n");
idx.indexAll();

const fpAfter = idx.fingerprints[a];
assert.equal(fpBefore.hash, fpAfter.hash);

bl = idx.backlinks("A");
assert.equal(bl.length, 1);
assert.ok(bl[0].text.includes("[[A]]"));

console.log("indexer tests passed");
