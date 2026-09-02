/**
 * SyncEngine: coordina la sincronización con el backend central.
 *
 * ESTADO ACTUAL: infraestructura preparada. Las operaciones reales de push/pull
 * se conectarán cuando llegue la documentación de la API (docs/central-api-design.md):
 *   - pushOperation: envía una operación del outbox al servidor (write-through
 *     /sync/push) y devuelve { ok, error?, data? }.
 *   - pullChanges: trae los cambios del servidor (GET /sync/changes con cursor)
 *     y los aplica al almacén local.
 */
import { outboxService } from './outbox';
import type { OutboxOperation } from './outbox';

export type SyncStatus = 'online' | 'offline' | 'syncing';

export interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncAt: string | null;
}

export interface SyncHandlers {
  /** Envía una operación pendiente al servidor. Lanza OfflineError si no hay red. */
  pushOperation: (op: OutboxOperation) => Promise<{ ok: boolean; error?: string }>;
  /** Trae y aplica los cambios del servidor (pull incremental con cursor). */
  pullChanges: () => Promise<void>;
}

const DEFAULT_STATE: SyncState = {
  status: typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
  pendingCount: 0,
  lastSyncAt: null,
};

let state: SyncState = { ...DEFAULT_STATE, pendingCount: outboxService.pendingCount() };
const listeners = new Set<(s: SyncState) => void>();

function setState(patch: Partial<SyncState>): void {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn(state));
}

export function getSyncState(): SyncState {
  return state;
}

export function subscribeSyncState(fn: (s: SyncState) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let handlers: SyncHandlers | null = null;
let running = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let intervalTimer: ReturnType<typeof setInterval> | null = null;

const RETRY_BASE_MS = 1_000;
const RETRY_MAX_MS = 60_000;
const SYNC_INTERVAL_MS = 60_000;

function backoffDelay(attempt: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** attempt, RETRY_MAX_MS);
}

function refreshPendingCount(): void {
  const count = outboxService.pendingCount();
  if (count !== state.pendingCount) {
    setState({ pendingCount: count });
  }
}

/**
 * Un ciclo de sincronización: push del outbox + pull de cambios.
 * Puede lanzarse manualmente (evento 'online', después de cada operación) o por el
 * temporizador. Los reintentos usan backoff exponencial.
 * Sin handlers configurados (documentación de la API pendiente), solo actualiza
 * el conteo de pendientes.
 */
export async function runSync(): Promise<void> {
  if (running) return;
  if (!handlers) {
    refreshPendingCount();
    return;
  }
  running = true;
  setState({ status: 'syncing' });

  let attempt = 0;
  let finished = false;
  while (!finished) {
    try {
      // 1) Push: enviar las operaciones pendientes en orden
      for (const op of outboxService.pending()) {
        try {
          const result = await handlers.pushOperation(op);
          if (result.ok) {
            outboxService.remove(op.id);
          } else {
            outboxService.markFailed(op.id, result.error ?? 'Error del servidor');
          }
          refreshPendingCount();
        } catch (err) {
          // OfflineError u otro fallo de red: detener el push, reintentar con backoff
          if (err instanceof Error && err.name === 'OfflineError') {
            setState({ status: 'offline' });
            scheduleRetry(attempt + 1);
            return;
          }
          // Error de otra naturaleza: marcar la operación como fallida y continuar
          outboxService.markFailed(op.id, err instanceof Error ? err.message : String(err));
          refreshPendingCount();
        }
      }

      // 2) Pull: aplicar cambios del servidor
      await handlers.pullChanges();

      setState({ status: 'online', lastSyncAt: new Date().toISOString() });
      finished = true;
    } catch {
      setState({ status: 'offline' });
      scheduleRetry(attempt + 1);
      return;
    } finally {
      attempt += 1;
    }
  }

  running = false;
}

function scheduleRetry(attempt: number): void {
  running = false;
  refreshPendingCount();
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    void runSync();
  }, backoffDelay(attempt));
}

function handleOnline(): void {
  setState({ status: 'online' });
  void runSync();
}

function handleOffline(): void {
  setState({ status: 'offline' });
  if (retryTimer) clearTimeout(retryTimer);
}

/**
 * Conecta los handlers reales de push/pull (cuando llegue la documentación de la API)
 * y dispara una sincronización inmediata.
 */
export function setSyncHandlers(handlersImpl: SyncHandlers): void {
  handlers = handlersImpl;
  void runSync();
}

/**
 * Inicializa el motor: registra eventos de conectividad, temporizador periódico
 * y, opcionalmente, los handlers de push/pull (se conectan con la documentación
 * de la API vía setSyncHandlers).
 */
export function initSyncEngine(handlersImpl?: SyncHandlers): void {
  handlers = handlersImpl ?? handlers;
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  intervalTimer = setInterval(() => {
    refreshPendingCount();
    if (state.status === 'online') void runSync();
  }, SYNC_INTERVAL_MS);
  refreshPendingCount();
  void runSync();
}

export function destroySyncEngine(): void {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  if (retryTimer) clearTimeout(retryTimer);
  if (intervalTimer) clearInterval(intervalTimer);
}
