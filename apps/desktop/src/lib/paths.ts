export function relativeToRoot(absolutePath: string, root: string): string {
  if (!absolutePath) return '';
  const normalizedRoot = normalizePath(root);
  const normalizedTarget = normalizePath(absolutePath);
  if (!normalizedRoot || !normalizedTarget.startsWith(normalizedRoot)) {
    return normalizedTarget;
  }
  return normalizedTarget.slice(normalizedRoot.length).replace(/^\//, '');
}

export function joinPath(base: string, segment: string): string {
  if (!base) return segment;
  if (!segment) return base;
  const normalizedBase = normalizePath(base).replace(/\/$/, '');
  const normalizedSegment = normalizePath(segment).replace(/^\//, '');
  return `${normalizedBase}/${normalizedSegment}`;
}

export function pageFileName(title: string): string {
  const trimmed = title.trim();
  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const base = slug || 'untitled-page';
  return `${base}.md`;
}

function normalizePath(input: string): string {
  return input.replace(/\\/g, '/');
}
