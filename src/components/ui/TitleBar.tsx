import React from 'react';

const TitleBar: React.FC = () => {
  const handleMinimize = () => {
    if (window.electronAPI?.minimizeWindow) {
      window.electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI?.maximizeWindow) {
      window.electronAPI.maximizeWindow();
    }
  };

  const handleClose = () => {
    if (window.electronAPI?.closeWindow) {
      window.electronAPI.closeWindow();
    }
  };

  return (
    <div className="flex justify-between items-center bg-blue-600 text-white px-4 py-2 draggable">
      <div className="flex items-center">
        <span className="text-sm font-semibold">💊 Farmacia POS</span>
      </div>
      
      <div className="flex space-x-2 non-draggable">
        <button
          onClick={handleMinimize}
          className="w-3 h-3 bg-yellow-500 rounded-full hover:bg-yellow-400 transition-colors flex items-center justify-center text-[8px] text-black font-bold"
          title="Minimizar"
        >
          _
        </button>
        <button
          onClick={handleMaximize}
          className="w-3 h-3 bg-green-500 rounded-full hover:bg-green-400 transition-colors flex items-center justify-center text-[8px] text-black font-bold"
          title="Maximizar"
        >
          □
        </button>
        <button
          onClick={handleClose}
          className="w-3 h-3 bg-red-500 rounded-full hover:bg-red-400 transition-colors flex items-center justify-center text-[8px] text-black font-bold"
          title="Cerrar"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default TitleBar;