import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import TitleBar from '../ui/TitleBar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* TitleBar solo en Electron */}
      {isElectron && <TitleBar />}
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header normal cuando no es Electron */}
          {!isElectron && <Header />}
          
          {/* Contenido principal */}
          <main className="flex-1 overflow-auto p-6 bg-gray-50">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;