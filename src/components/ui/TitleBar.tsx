import { Minus, Square, X, Pill } from 'lucide-react';

const TitleBar: React.FC = () => {
  const handleMinimize = () => window.electronAPI?.minimizeWindow?.();
  const handleMaximize = () => window.electronAPI?.maximizeWindow?.();
  const handleClose = () => window.electronAPI?.closeWindow?.();

  return (
    <div className="flex justify-between items-center bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-3 draggable select-none">
      <div className="flex items-center gap-2 py-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-600 text-white">
          <Pill className="w-4 h-4" />
        </span>
        <span className="text-sm font-semibold tracking-tight">Farmacia POS</span>
      </div>

      <div className="flex space-x-1 non-draggable">
        <button
          onClick={handleMinimize}
          className="w-8 h-7 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
          title="Minimizar"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-8 h-7 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
          title="Maximizar"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleClose}
          className="w-8 h-7 rounded-md hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
