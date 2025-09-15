import fs from 'node:fs/promises';
import path from 'node:path';

export async function init(root: string): Promise<void> {
  await fs.mkdir(path.join(root, '.graph'), { recursive: true });
  // TODO: wire to @logseq/file-core and @logseq/sidecar-index
}
