import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: '🏠', label: 'Dashboard' },
    { path: '/pos', icon: '💊', label: 'Punto de Venta' },
    { path: '/inventory', icon: '📦', label: 'Inventario' },
    { path: '/customers', icon: '👥', label: 'Clientes' },
    { path: '/reports', icon: '📊', label: 'Reportes' },
    { path: '/settings', icon: '⚙️', label: 'Configuración' },
  ];

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col h-full">
      {/* Logo y título */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <h1 className="text-xl font-bold text-blue-600">💊 Farmacia POS</h1>
        <p className="text-sm text-gray-500 mt-1">Sistema de ventas</p>
      </div>
      
      {/* Navegación */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
              location.pathname === item.path 
                ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
            }`}
          >
            <span className="mr-3 text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Información de la farmacia */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-sm text-gray-600">
          <p className="font-semibold text-gray-800">Farmacia Central</p>
          <p className="text-xs text-gray-500">Lic. #12345</p>
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-400">v1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;