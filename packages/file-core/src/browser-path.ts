// Browser-compatible path utilities (subset of node:path)

export function basename(p: string, ext?: string): string {
  // Remove trailing slashes
  p = p.replace(/\/+$/, '');
  const parts = p.split('/');
  let base = parts[parts.length - 1] || '';
  if (ext && base.endsWith(ext)) {
    base = base.slice(0, -ext.length);
  }
  return base;
}

export function dirname(p: string): string {
  // Remove trailing slashes
  p = p.replace(/\/+$/, '');
  const lastSlash = p.lastIndexOf('/');
  if (lastSlash === -1) return '.';
  if (lastSlash === 0) return '/';
  return p.slice(0, lastSlash);
}

export function extname(p: string): string {
  const base = basename(p);
  const lastDot = base.lastIndexOf('.');
  if (lastDot <= 0) return '';
  return base.slice(lastDot);
}

export function join(...parts: string[]): string {
  const result = parts
    .filter(p => p.length > 0)
    .join('/')
    .replace(/\/+/g, '/');
  return result || '.';
}

export function resolve(...parts: string[]): string {
  let result = '';
  for (const part of parts) {
    if (part.startsWith('/')) {
      result = part;
    } else if (result.endsWith('/')) {
      result += part;
    } else {
      result += '/' + part;
    }
  }
  // Normalize
  const segments: string[] = [];
  for (const seg of result.split('/')) {
    if (seg === '..') {
      segments.pop();
    } else if (seg !== '.' && seg !== '') {
      segments.push(seg);
    }
  }
  return '/' + segments.join('/');
}

export function relative(from: string, to: string): string {
  const fromParts = resolve(from).split('/').filter(p => p);
  const toParts = resolve(to).split('/').filter(p => p);
  
  let i = 0;
  while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) {
    i++;
  }
  
  const ups = fromParts.length - i;
  const result = [...Array(ups).fill('..'), ...toParts.slice(i)];
  return result.join('/') || '.';
}

export const sep = '/';
export const delimiter = ':';

const path = {
  basename,
  dirname,
  extname,
  join,
  resolve,
  relative,
  sep,
  delimiter
};

export default path;
