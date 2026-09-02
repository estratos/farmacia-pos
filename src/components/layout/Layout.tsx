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

  // 1) Sesión fresca con las credenciales de Configuración (garantiza el rol
  //    correcto, p. ej. admin/manager para sincronizar el catálogo).
  // 2) Si falla (sin red o credenciales inválidas), se usa el token guardado.
  async function bootstrapAuth() {
    const settings = settingsService.getSettings();
    if (settings.apiUsername && settings.apiPassword) {
      try {
        const auth = await login(settings.apiUsername, settings.apiPassword);
        setAuthToken(auth.token);
        setSyncHandlers(remoteSyncHandlers);
        void reconcileLocalCatalog().catch(() => undefined);
        return;
      } catch {
        // sin red o credenciales inválidas → se cae al token guardado
      }
    }

    const stored = getStoredAuth();
    if (stored) {
      setAuthToken(stored.token);
      setSyncHandlers(remoteSyncHandlers);
      void reconcileLocalCatalog().catch(() => undefined);
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

            {/* Contenido principal — padding vertical reducido para aprovechar la altura */}
            <main className="flex-1 overflow-auto px-5 py-4 bg-slate-50 dark:bg-slate-900">
              {children}
            </main>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
};

export default Layout;
