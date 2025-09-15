import type { WriteFileOperation } from './write.js';

export interface Transaction {
  id: string;
  operations: WriteFileOperation[];
}

export function createTransaction(id: string, operations: WriteFileOperation[]): Transaction {
  return { id, operations };
}
