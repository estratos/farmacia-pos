import { useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import TitleBar from '../ui/TitleBar';
import { ToastProvider } from '../ui/Toast';
import { applyTheme, getTheme } from '../../lib/theme';
import { initSyncEngine, setSyncHandlers } from '../../services/syncEngine';
import { getStoredAuth, login, remoteSyncHandlers, reconcileLocalCatalog } from '../../services/remoteApi';
import { setAuthToken } from '../../services/apiClient';
import { settingsService } from '../../services/settingsService';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  useEffect(() => {
    applyTheme(getTheme());
    // Motor de sincronización (conectividad + estado). Los handlers se conectan
    // tras autenticarse (ver bootstrapAuth).
    initSyncEngine();
    void bootstrapAuth();
  }, []);

  // Restaura la sesión o inicia sesión con las credenciales guardadas, y conecta
  // el syncEngine al backend central.
  async function bootstrapAuth() {
    const stored = getStoredAuth();
    if (stored) {
      setAuthToken(stored.token);
      setSyncHandlers(remoteSyncHandlers);
      // Reconciliación del catálogo una vez por arranque (si falla, se reintenta
      // en el siguiente arranque o con "Sincronizar ahora")
      void reconcileLocalCatalog().catch(() => undefined);
      return;
    }
    const settings = settingsService.getSettings();
    if (settings.apiUsername && settings.apiPassword) {
      try {
        await login(settings.apiUsername, settings.apiPassword);
        setSyncHandlers(remoteSyncHandlers);
        void reconcileLocalCatalog().catch(() => undefined);
      } catch {
        // sin red o credenciales inválidas: se reintenta en el siguiente arranque
      }
    }
  }

  return (
    <ToastProvider>
      <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        {/* TitleBar solo en Electron */}
        {isElectron && <TitleBar />}

        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header normal cuando no es Electron */}
            {!isElectron && <Header />}

            {/* Contenido principal */}
            <main className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-900">
              {children}
            </main>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
};

export default Layout;
