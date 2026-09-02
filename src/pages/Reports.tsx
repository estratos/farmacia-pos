import { useMemo, useState } from 'react';
import {
  Receipt,
  DollarSign,
  Package,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from 'lucide-react';
import { saleService } from '../services/saleService';
import { formatMoney } from '../services/storage';

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
};

function Reports() {
  const [expandedSale, setExpandedSale] = useState<string | null>(null);

  const data = useMemo(() => {
    const sales = saleService.getSales();
    const byDay = saleService.getSalesByDay();
    const topProducts = saleService.getTopProducts(10);

    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const totalItems = sales.reduce(
      (sum, s) => sum + s.items.reduce((acc, i) => acc + i.quantity, 0),
      0
    );
    const averageTicket = sales.length > 0 ? totalRevenue / sales.length : 0;

    return { sales, byDay, topProducts, totalRevenue, totalItems, averageTicket };
  }, []);

  const summary = [
    {
      label: 'Ventas Totales',
      value: String(data.sales.length),
      icon: Receipt,
      chip: 'bg-blue-100 dark:bg-blue-500/15',
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Ingresos Totales',
      value: formatMoney(data.totalRevenue),
      icon: DollarSign,
      chip: 'bg-emerald-100 dark:bg-emerald-500/15',
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Artículos Vendidos',
      value: String(data.totalItems),
      icon: Package,
      chip: 'bg-violet-100 dark:bg-violet-500/15',
      color: 'text-violet-600 dark:text-violet-400',
    },
    {
      label: 'Ticket Promedio',
      value: formatMoney(data.averageTicket),
      icon: TrendingUp,
      chip: 'bg-sky-100 dark:bg-sky-500/15',
      color: 'text-sky-600 dark:text-sky-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reportes</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Resumen de actividad de ventas
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {summary.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card p-5 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {s.label}
                </h3>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {s.value}
                </p>
              </div>
              <span className={`flex items-center justify-center w-11 h-11 rounded-xl ${s.chip}`}>
                <Icon className={`w-5 h-5 ${s.color}`} />
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Ventas por día */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            Ventas por Día
          </h3>
          {data.byDay.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500">
              <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sin ventas registradas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 dark:bg-slate-700/40">
                  <tr>
                    <th className="table-header">Fecha</th>
                    <th className="table-header">Ventas</th>
                    <th className="table-header">Ingresos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {data.byDay.map((d) => (
                    <tr key={d.date} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <td className="table-cell">
                        {new Date(d.date).toLocaleDateString('es-MX', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>
                      <td className="table-cell tabular-nums">{d.count}</td>
                      <td className="table-cell font-medium tabular-nums">
                        {formatMoney(d.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Productos más vendidos */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            Productos Más Vendidos
          </h3>
          {data.topProducts.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sin ventas registradas.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.topProducts.map((p, i) => (
                <div
                  key={p.name}
                  className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0
                          ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-900 dark:text-white tabular-nums">
                      {p.sold} uds
                    </div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatMoney(p.revenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Historial de ventas */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
          Historial de Ventas
        </h3>
        {data.sales.length === 0 ? (
          <div className="text-center py-10 text-slate-400 dark:text-slate-500">
            <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aún no hay ventas registradas.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.sales.map((sale) => (
              <div
                key={sale.id}
                className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                  className="w-full flex justify-between items-center px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                >
                  <div className="flex items-center gap-3 text-left">
                    <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                      {sale.reference ?? `#${String(sale.id).slice(0, 8)}`}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {new Date(sale.date).toLocaleString('es-MX')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                      {formatMoney(sale.total)}
                    </span>
                    <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hidden sm:inline-flex">
                      {PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method}
                    </span>
                    {expandedSale === sale.id ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>
                {expandedSale === sale.id && (
                  <div className="px-4 pb-3 border-t border-slate-100 dark:border-slate-700 pt-2">
                    {sale.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between text-sm py-0.5 text-slate-600 dark:text-slate-300"
                      >
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                        <span className="tabular-nums">{formatMoney(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;
