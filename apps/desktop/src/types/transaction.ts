import type { WriteFileOperation } from './system';

export interface Transaction {
  id: string;
  operations: WriteFileOperation[];
}

export function createTransaction(id: string, operations: WriteFileOperation[]): Transaction {
  return { id, operations };
}
