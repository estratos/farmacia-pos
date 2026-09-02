import { useSyncExternalStore } from 'react';
import { Wifi, WifiOff, RefreshCw, CloudUpload } from 'lucide-react';
import { getSyncState, subscribeSyncState } from '../../services/syncEngine';

/**
 * Indicador del estado de sincronización con el backend central.
 * Muestra: Sincronizado / Sincronizando… / Sin conexión (con pendientes).
 */
function SyncIndicator() {
  const state = useSyncExternalStore(subscribeSyncState, getSyncState);

  if (state.status === 'syncing') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        Sincronizando…
      </span>
    );
  }

  if (state.status === 'offline') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300" title="Sin conexión con el servidor central">
        <WifiOff className="w-3.5 h-3.5" />
        Sin conexión
        {state.pendingCount > 0 && ` · ${state.pendingCount} pendiente${state.pendingCount === 1 ? '' : 's'}`}
      </span>
    );
  }

  if (state.pendingCount > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300" title="Cambios pendientes de sincronizar">
        <CloudUpload className="w-3.5 h-3.5" />
        {state.pendingCount} cambio{state.pendingCount === 1 ? '' : 's'} pendiente{state.pendingCount === 1 ? '' : 's'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" title={state.lastSyncAt ? `Última sincronización: ${new Date(state.lastSyncAt).toLocaleTimeString('es-MX')}` : 'Sincronizado con el servidor central'}>
      <Wifi className="w-3.5 h-3.5" />
      Sincronizado
    </span>
  );
}

export default SyncIndicator;
