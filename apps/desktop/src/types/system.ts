export interface WriteFileOperation {
  path: string;
  content: string;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export interface OpsLogEntry {
  id: string;
  timestamp: number;
  transactionId: string;
  operations: WriteFileOperation[];
}
