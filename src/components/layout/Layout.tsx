import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import TitleBar from '../ui/TitleBar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    // Obtener versión de la aplicación
    if (window.electronAPI) {
      window.electronAPI.getAppVersion().then(version => {
        setAppVersion(version);
      });
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* TitleBar personalizada para Electron */}
      {window.electronAPI && <TitleBar />}
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {!window.electronAPI && <Header />} {/* Mostrar header normal si no es Electron */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
            {children}
          </main>
          {appVersion && (
            <footer className="bg-white border-t px-4 py-2 text-xs text-gray-500">
              Versión {appVersion}
            </footer>
          )}
        </div>
      </div>
    </div>
  );
};

export default Layout;
