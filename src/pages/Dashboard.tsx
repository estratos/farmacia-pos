import { useMemo, useSyncExternalStore } from 'react';
import { ShoppingCart, DollarSign, Package, PackageX, AlertTriangle } from 'lucide-react';
import { saleService, subscribeSales, getSalesRevision } from '../services/saleService';
import { productService, subscribeProducts, getProductsRevision } from '../services/productService';
import { customerService } from '../services/customerService';
import { settingsService } from '../services/settingsService';
import { formatMoney } from '../services/storage';

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
};

const STAT_STYLES: Record<string, { chip: string; iconColor: string }> = {
  blue: { chip: 'bg-blue-100 dark:bg-blue-500/15', iconColor: 'text-blue-600 dark:text-blue-400' },
  emerald: {
    chip: 'bg-emerald-100 dark:bg-emerald-500/15',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  violet: {
    chip: 'bg-violet-100 dark:bg-violet-500/15',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  amber: {
    chip: 'bg-amber-100 dark:bg-amber-500/15',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
};

function Dashboard() {
  // Re-render cuando cambian ventas/productos (sync, write-through)
  useSyncExternalStore(subscribeSales, getSalesRevision);
  useSyncExternalStore(subscribeProducts, getProductsRevision);

  const data = useMemo(() => {
    const todaySales = saleService.getTodaySales();
    const allSales = saleService.getSales();
    const lowStock = productService.getLowStock();
    const customers = customerService.getCustomers();

    const soldToday = todaySales.reduce(
      (sum, s) => sum + s.items.reduce((acc, i) => acc + i.quantity, 0),
      0
    );
    const revenueToday = todaySales.reduce((sum, s) => sum + s.total, 0);

    // Últimos 7 días para la gráfica
    const byDay = new Map<string, number>();
    for (const sale of allSales) {
      const day = new Date(sale.date).toDateString();
      byDay.set(day, (byDay.get(day) ?? 0) + sale.total);
    }
    const chartDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toDateString();
      return {
        key,
        label: d.toLocaleDateString('es-MX', { weekday: 'short' }),
        total: byDay.get(key) ?? 0,
      };
    });

    return {
      todayCount: todaySales.length,
      soldToday,
      revenueToday,
      lowStockCount: lowStock.length,
      lowStock,
      customerCount: customers.length,
      recentSales: allSales.slice(0, 5),
      topProducts: saleService.getTopProducts(4),
      chartDays,
    };
  }, []);

  const maxChart = Math.max(...data.chartDays.map((d) => d.total), 1);
  const hasChartData = data.chartDays.some((d) => d.total > 0);

  const stats = [
    {
      label: 'Ventas Hoy',
      value: String(data.todayCount),
      icon: ShoppingCart,
      style: STAT_STYLES.blue,
    },
    {
      label: 'Ingresos Hoy',
      value: formatMoney(data.revenueToday),
      icon: DollarSign,
      style: STAT_STYLES.emerald,
    },
    {
      label: 'Productos Vendidos',
      value: String(data.soldToday),
      icon: Package,
      style: STAT_STYLES.violet,
    },
    {
      label: 'Inventario Bajo',
      value: String(data.lowStockCount),
      icon: PackageX,
      style: STAT_STYLES.amber,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {new Date().toLocaleDateString('es-MX', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
          {data.customerCount} clientes registrados
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card p-4 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {stat.label}
                </h3>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums leading-tight">
                  {stat.value}
                </p>
                {/* Espacio reservado para futuros indicadores (vs. ayer, metas…) */}
                <div className="h-4" aria-hidden="true" />
              </div>
              <span
                className={`flex items-center justify-center w-10 h-10 rounded-xl ${stat.style.chip}`}
              >
                <Icon className={`w-5 h-5 ${stat.style.iconColor}`} />
              </span>
            </div>
          );
        })}
      </div>

      {/* Gráfica de ventas (últimos 7 días) — compacta */}
      <div className="card p-4">
        <div className="flex justify-between items-baseline mb-2">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Ventas — últimos 7 días
          </h3>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Ingresos diarios totales
          </span>
        </div>
        {hasChartData ? (
          <div className="flex items-end gap-2 h-24">
            {data.chartDays.map((d) => (
              <div key={d.key} className="flex-1 flex flex-col items-center gap-1 h-full">
                <div
                  className="w-full max-w-12 rounded-t-md bg-blue-500/70 dark:bg-blue-500/50 hover:bg-blue-600 dark:hover:bg-blue-400/70 transition-colors"
                  style={{
                    height: d.total > 0 ? `${Math.max((d.total / maxChart) * 100, 4)}%` : '2px',
                    opacity: d.total > 0 ? 1 : 0.25,
                  }}
                  title={`${d.label}: ${formatMoney(d.total)}`}
                />
                <span className="text-[10px] font-medium uppercase text-slate-400 dark:text-slate-500">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-16 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
            Sin ventas en los últimos 7 días — la gráfica aparecerá aquí.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Ventas Recientes */}
        <div className="card p-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-3">
            Ventas Recientes
          </h3>
          {data.recentSales.length === 0 ? (
            <div className="text-center py-6 text-slate-400 dark:text-slate-500">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aún no hay ventas registradas.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {data.recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-700/40 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors"
                >
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-100">
                      #{String(sale.id).padStart(5, '0')}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method} ·{' '}
                      {new Date(sale.date).toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-900 dark:text-white tabular-nums">
                      {formatMoney(sale.total)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {sale.items.length} artículos
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Productos Populares */}
        <div className="card p-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-3">
            Productos Populares
          </h3>
          {data.topProducts.length === 0 ? (
            <div className="text-center py-6 text-slate-400 dark:text-slate-500">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Los productos más vendidos aparecerán aquí.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {data.topProducts.map((product) => (
                <div
                  key={product.name}
                  className="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-700/40 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors"
                >
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-100">
                      {product.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {product.sold} vendidos
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatMoney(product.revenue)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Ingresos</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inventario bajo */}
      {data.lowStock.length > 0 && (
        <div className="card p-4 border-l-4 border-amber-500 bg-amber-50/60 dark:bg-amber-500/5 dark:border-amber-500/60">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Productos con stock bajo
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.lowStock.map((p) => (
              <span
                key={p.id}
                className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-sm px-3 py-1 rounded-full"
              >
                {p.name} — {p.stock} uds
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Farmacia: {settingsService.getSettings().pharmacyName}
      </p>
    </div>
  );
}

export default Dashboard;
