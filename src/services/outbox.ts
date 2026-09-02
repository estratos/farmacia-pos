/**
 * Outbox: cola persistente de operaciones pendientes de sincronizar con el
 * backend central. Cada operación lleva un id único (client_op_id) para
 * idempotencia en el servidor.
 */
import { loadData, saveData } from './storage';

export type OutboxStatus = 'pending' | 'failed';

export interface OutboxOperation {
  id: string; // client_op_id (uuid)
  op: string; // 'create_sale' | 'create_movement' | 'upsert_product' | ...
  payload: unknown;
  createdAt: string; // ISO
  status: OutboxStatus;
  error?: string;
}

const KEY = 'outbox';

function read(): OutboxOperation[] {
  return loadData<OutboxOperation[]>(KEY, []);
}

function write(ops: OutboxOperation[]): void {
  saveData(KEY, ops);
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const outboxService = {
  /** Encola una operación pendiente (persistente). */
  enqueue(op: string, payload: unknown): OutboxOperation {
    const operation: OutboxOperation = {
      id: uuid(),
      op,
      payload,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    write([operation, ...read()]);
    return operation;
  },

  /** Operaciones pendientes primero (más antiguas primero), luego fallidas. */
  list(): OutboxOperation[] {
    const ops = read();
    const order: Record<OutboxStatus, number> = { pending: 0, failed: 1 };
    return [...ops].sort(
      (a, b) =>
        order[a.status] - order[b.status] ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  },

  pending(): OutboxOperation[] {
    return read().filter((o) => o.status === 'pending');
  },

  remove(id: string): void {
    write(read().filter((o) => o.id !== id));
  },

  markFailed(id: string, error: string): void {
    write(
      read().map((o) => (o.id === id ? { ...o, status: 'failed' as const, error } : o))
    );
  },

  clear(): void {
    write([]);
  },

  pendingCount(): number {
    return read().filter((o) => o.status === 'pending').length;
  },
};
