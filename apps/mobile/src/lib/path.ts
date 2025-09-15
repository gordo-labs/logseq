export function joinPath(...segments: string[]): string {
  let result = '';
  segments.forEach((segment, index) => {
    if (!segment) return;
    let normalized = segment.replace(/\\+/g, '/');
    if (!result) {
      const trimmed = normalized.replace(/\/+$/u, '');
      if (segment.startsWith('/')) {
        const noLeading = trimmed.replace(/^\/+/, '');
        result = `/${noLeading}`;
      } else {
        result = trimmed;
      }
    } else {
      normalized = normalized.replace(/^\/+/, '').replace(/\/+$/u, '');
      if (!normalized) return;
      result = result.endsWith('/') ? `${result}${normalized}` : `${result}/${normalized}`;
    }
    if (index === 0 && segment === '/') {
      result = '/';
    }
  });
  if (!result) return '';
  if (result.length > 1 && result.endsWith('/')) {
    result = result.slice(0, -1);
  }
  return result;
}

export function dirname(filePath: string): string {
  const normalized = filePath.replace(/\\+/g, '/');
  const index = normalized.lastIndexOf('/');
  if (index < 0) return '';
  if (index === 0) return '/';
  return normalized.slice(0, index);
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*\u0000]/g, '_');
}
