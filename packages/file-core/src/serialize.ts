import type { Transaction } from './tx';

/** Serialize a transaction to a JSON string. */
export function serializeTx(tx: Transaction): string {
  return JSON.stringify(tx);
}

/** Deserialize a transaction from JSON. */
export function deserializeTx(data: string): Transaction {
  return JSON.parse(data) as Transaction;
}
