import { useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import TitleBar from '../ui/TitleBar';
import { ToastProvider } from '../ui/Toast';
import { applyTheme, getTheme } from '../../lib/theme';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  useEffect(() => {
    applyTheme(getTheme());
  }, []);

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
