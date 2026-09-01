import { useEffect, useState } from 'react';
import { Clock, Sun, Moon, CalendarDays } from 'lucide-react';
import { settingsService } from '../../services/settingsService';
import { useAppContext } from '../../contexts/AppContext';
import { applyTheme, getTheme } from '../../lib/theme';

function Header() {
  const { state } = useAppContext();
  const settings = settingsService.getSettings();
  const [now, setNow] = useState(new Date());
  const [dark, setDark] = useState(getTheme() === 'dark');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const currentTime = now.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const currentDate = now.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const userInitial = state.user?.name?.charAt(0).toUpperCase() ?? 'A';

  const handleToggleTheme = () => {
    const next = dark ? 'light' : 'dark';
    applyTheme(next);
    setDark(next === 'dark');
  };

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-center px-6 py-3">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <p className="text-sm text-slate-600 dark:text-slate-300 capitalize">{currentDate}</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-1.5">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-base font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
              {currentTime}
            </span>
          </div>

          <button
            onClick={handleToggleTheme}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-1.5">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {state.user?.name ?? 'Admin'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{settings.pharmacyName}</p>
            </div>
            <div className="w-9 h-9 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center border-2 border-blue-200 dark:border-blue-500/40">
              <span className="text-blue-700 dark:text-blue-300 font-bold text-sm">{userInitial}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
