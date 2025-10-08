import React from 'react';

const Header: React.FC = () => {
  const currentTime = new Date().toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const currentDate = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex justify-between items-center px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Panel de Control
          </h1>
          <p className="text-sm text-gray-600 mt-1 capitalize">{currentDate}</p>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{currentTime}</div>
            <p className="text-sm text-gray-500">Hora actual</p>
          </div>
          
          <div className="flex items-center space-x-4 bg-gray-50 rounded-lg px-4 py-2">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800">Usuario: Admin</p>
              <p className="text-xs text-gray-500">Farmacia Central</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center border-2 border-blue-200">
              <span className="text-blue-600 font-bold text-sm">A</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;