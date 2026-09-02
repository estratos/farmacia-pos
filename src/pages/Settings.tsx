import { useState } from 'react';
import { Pill, Percent, Receipt, Info, Save, Plug, Unplug, LoaderCircle, RefreshCw } from 'lucide-react';
import { settingsService, defaultSettings } from '../services/settingsService';
import { useToast } from '../components/ui/Toast';
import { getApiBaseUrl } from '../services/apiClient';
import { getStoredAuth, login, clearAuth, remoteSyncHandlers } from '../services/remoteApi';
import { setSyncHandlers, runSync } from '../services/syncEngine';
import { productService } from '../services/productService';
import type { AppSettings } from '../types';

function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(() => settingsService.getSettings());
  const { showToast } = useToast();
  const [connecting, setConnecting] = useState(false);

  const handleSave = () => {
    settingsService.saveSettings(settings);
    showToast('success', 'Configuración guardada');
  };

  const set = (patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const auth = getStoredAuth();

  const handleConnect = async () => {
    if (!settings.apiUsername || !settings.apiPassword) {
      showToast('error', 'Ingresa usuario y contraseña del servidor central');
      return;
    }
    setConnecting(true);
    try {
      settingsService.saveSettings(settings);
      const result = await login(settings.apiUsername, settings.apiPassword);
      setSyncHandlers(remoteSyncHandlers);
      showToast('success', `Conectado a ${result.store.name}`);
    } catch {
      showToast('error', 'No se pudo conectar: revisa credenciales o la conexión');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    clearAuth();
    showToast('info', 'Sesión cerrada');
  };

  const [syncing, setSyncing] = useState(false);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await runSync();
      const count = productService.getProducts().length;
      showToast('success', `Catálogo sincronizado (${count} productos)`);
    } catch {
      showToast('error', 'No se pudo sincronizar: revisa la conexión y las credenciales');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configuración</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ajustes generales de la farmacia
        </p>
      </div>

      <div className="card p-6 space-y-6">
        {/* Farmacia */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <Pill className="w-4 h-4" />
            </span>
            Farmacia
          </h3>
          <div className="space-y-4 pl-11">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nombre de la farmacia
              </label>
              <input
                className="input-field"
                value={settings.pharmacyName}
                onChange={(e) => set({ pharmacyName: e.target.value })}
                placeholder={defaultSettings.pharmacyName}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Número de licencia
              </label>
              <input
                className="input-field"
                value={settings.licenseNumber}
                onChange={(e) => set({ licenseNumber: e.target.value })}
                placeholder={defaultSettings.licenseNumber}
              />
            </div>
          </div>
        </section>

        {/* Impuestos */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Percent className="w-4 h-4" />
            </span>
            Impuestos
          </h3>
          <div className="space-y-4 pl-11">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                IVA (%) — usado en el carrito y el recibo
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className="input-field max-w-xs"
                value={settings.taxRate}
                onChange={(e) => set({ taxRate: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </section>

        {/* Recibo */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400">
              <Receipt className="w-4 h-4" />
            </span>
            Recibo / Ticket
          </h3>
          <div className="space-y-4 pl-11">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Pie de recibo
              </label>
              <input
                className="input-field"
                value={settings.receiptFooter}
                onChange={(e) => set({ receiptFooter: e.target.value })}
                placeholder={defaultSettings.receiptFooter}
              />
            </div>
          </div>
        </section>

        {/* Conexión con el servidor central */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Plug className="w-4 h-4" />
            </span>
            Conexión con el servidor central
          </h3>
          <div className="space-y-4 pl-11">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                URL de la API
              </label>
              <input className="input-field" value={getApiBaseUrl()} readOnly disabled />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Se configura con VITE_API_BASE_URL (ver .env.example)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Usuario
                </label>
                <input
                  className="input-field"
                  value={settings.apiUsername ?? ''}
                  onChange={(e) => set({ apiUsername: e.target.value })}
                  placeholder="admin"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  className="input-field"
                  value={settings.apiPassword ?? ''}
                  onChange={(e) => set({ apiPassword: e.target.value })}
                  placeholder="••••••••"
                  autoComplete="off"
                />
              </div>
            </div>

            {auth ? (
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg">
                <div className="text-sm text-emerald-700 dark:text-emerald-300">
                  <p className="font-semibold">Conectado a {auth.store.name}</p>
                  <p className="text-xs">
                    {auth.user.name} ({auth.user.role}) — tienda {auth.store.id.slice(0, 8)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleSyncNow}
                    disabled={syncing}
                    className="btn-ghost text-sm"
                    title="Forzar sincronización del catálogo"
                  >
                    {syncing ? (
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
                  </button>
                  <button onClick={handleDisconnect} className="btn-ghost text-sm">
                    <Unplug className="w-4 h-4" />
                    Desconectar
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={handleConnect} disabled={connecting} className="btn-success">
                {connecting ? (
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                ) : (
                  <Plug className="w-4 h-4" />
                )}
                {connecting ? 'Conectando…' : 'Conectar al servidor'}
              </button>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Al conectarte, la app sincroniza el catálogo y el inventario. Sin conexión, todo
              sigue funcionando en local y los cambios se sincronizan al restaurar la conexión.
            </p>
          </div>
        </section>

        <div className="flex justify-end border-t border-slate-200 dark:border-slate-700 pt-4">
          <button onClick={handleSave} className="btn-primary">
            <Save className="w-4 h-4" />
            Guardar Configuración
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            <Info className="w-4 h-4" />
          </span>
          Acerca de
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 pl-11">
          Farmacia POS v1.2.0 — Sistema de punto de venta para farmacias.
          <br />
          Los datos se guardan localmente en este equipo.
        </p>
      </div>
    </div>
  );
}

export default SettingsPage;
