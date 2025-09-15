import { nanoid } from 'nanoid';

export function createTransactionId(): string {
  return `tx_${nanoid(12)}`;
}

export function createBlockId(pageTitle: string): string {
  const slug = pageTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'block';
  return `${slug}-${nanoid(8)}`;
}
