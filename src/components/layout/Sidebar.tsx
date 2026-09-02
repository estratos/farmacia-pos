import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings,
  History,
  Wallet,
} from 'lucide-react';
import { settingsService } from '../../services/settingsService';

interface MenuItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const menuGroups: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Principal',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/pos', icon: ShoppingCart, label: 'Punto de Venta' },
      { path: '/inventory', icon: Package, label: 'Inventario' },
      { path: '/movements', icon: History, label: 'Movimientos' },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { path: '/customers', icon: Users, label: 'Clientes' },
      { path: '/cash', icon: Wallet, label: 'Caja' },
      { path: '/reports', icon: BarChart3, label: 'Reportes' },
    ],
  },
  {
    title: 'Sistema',
    items: [{ path: '/settings', icon: Settings, label: 'Configuración' }],
  },
];

/**
 * Sidebar sin encabezado duplicado: la identidad principal es el título de la
 * ventana (TitleBar). El menú comienza directamente con "PRINCIPAL".
 */
const Sidebar: React.FC = () => {
  const location = useLocation();
  const settings = settingsService.getSettings();

  return (
    <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col h-full shrink-0">
      {/* Navegación */}
      <nav className="flex-1 px-3 pt-4 pb-3 space-y-3 overflow-y-auto">
        {menuGroups.map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-blue-600" />
                    )}
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    <span className="leading-none">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Información de la farmacia */}
      <div className="p-3.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
        <div className="text-sm">
          <p className="font-semibold text-slate-800 dark:text-slate-100">{settings.pharmacyName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{settings.licenseNumber}</p>
          <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-400 dark:text-slate-500">v1.2.0</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
