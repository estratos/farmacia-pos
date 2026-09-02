import { useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Scale,
  History,
  Filter,
  RotateCcw,
  PackageSearch,
  ClipboardList,
} from 'lucide-react';
import {
  movementService,
  MOVEMENT_LABELS,
  MOVEMENT_STYLES,
} from '../services/movementService';
import type { MovementType } from '../types';

const TYPES: MovementType[] = [
  'initial',
  'purchase',
  'sale',
  'return',
  'adjustment',
  'shrinkage',
];

function Movements() {
  const [type, setType] = useState<MovementType | 'all'>('all');
  const [productId, setProductId] = useState<string | 'all'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => movementService.filter({ type, productId, from, to, query }),
    [type, productId, from, to, query]
  );

  const summary = useMemo(() => movementService.getSummary(filtered), [filtered]);

  // Opciones de producto derivadas de los movimientos (incluye productos eliminados)
  const productOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of movementService.getMovements()) {
      if (!map.has(m.product_id)) map.set(m.product_id, m.product_name);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, []);

  const summaryCards = [
    {
      label: 'Entradas',
      value: `${summary.totalIn} uds`,
      icon: ArrowDownToLine,
      chip: 'bg-emerald-100 dark:bg-emerald-500/15',
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Salidas',
      value: `${summary.totalOut} uds`,
      icon: ArrowUpFromLine,
      chip: 'bg-red-100 dark:bg-red-500/15',
      color: 'text-red-600 dark:text-red-400',
    },
    {
      label: 'Neto',
      value: `${summary.net > 0 ? '+' : ''}${summary.net} uds`,
      icon: Scale,
      chip: 'bg-blue-100 dark:bg-blue-500/15',
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Movimientos',
      value: String(summary.count),
      icon: History,
      chip: 'bg-violet-100 dark:bg-violet-500/15',
      color: 'text-violet-600 dark:text-violet-400',
    },
  ];

  const hasFilters = type !== 'all' || productId !== 'all' || from || to || query.trim();

  const clearFilters = () => {
    setType('all');
    setProductId('all');
    setFrom('');
    setTo('');
    setQuery('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Movimientos de Inventario
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Registro de auditoría — los movimientos no se pueden editar ni eliminar
          </p>
        </div>
      </div>

      {/* Resumen (sobre el filtro actual) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {summaryCards.map((s) => {
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

      {/* Filtros */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mr-1">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filtros</span>
          </div>
          <div className="min-w-40">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Tipo
            </label>
            <select
              className="input-field py-2"
              value={type}
              onChange={(e) => setType(e.target.value as MovementType | 'all')}
            >
              <option value="all">Todos</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {MOVEMENT_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-52">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Producto
            </label>
            <select
              className="input-field py-2"
              value={productId}
              onChange={(e) =>
                setProductId(e.target.value === 'all' ? 'all' : e.target.value)
              }
            >
              <option value="all">Todos</option>
              {productOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Desde
            </label>
            <input
              type="date"
              className="input-field py-2"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Hasta
            </label>
            <input
              type="date"
              className="input-field py-2"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-52">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Buscar
            </label>
            <input
              type="text"
              className="input-field py-2"
              placeholder="Producto, código, referencia, motivo..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="btn-ghost py-2 text-sm">
              <RotateCcw className="w-4 h-4" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla de movimientos */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/40">
              <tr>
                <th className="table-header">Fecha</th>
                <th className="table-header">Producto</th>
                <th className="table-header">Tipo</th>
                <th className="table-header text-right">Cantidad</th>
                <th className="table-header">Stock</th>
                <th className="table-header">Referencia</th>
                <th className="table-header">Motivo / Proveedor</th>
                <th className="table-header">Usuario</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                  <td className="table-cell text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {new Date(m.created_at).toLocaleString('es-MX', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="table-cell">
                    <div className="font-medium text-slate-900 dark:text-white">{m.product_name}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {m.product_barcode}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${MOVEMENT_STYLES[m.type]}`}>
                      {MOVEMENT_LABELS[m.type]}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <span
                      className={`font-semibold tabular-nums ${
                        m.quantity > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {m.quantity > 0 ? '+' : ''}
                      {m.quantity}
                    </span>
                  </td>
                  <td className="table-cell text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                    {m.stock_before} → {m.stock_after}
                  </td>
                  <td className="table-cell text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {m.reference ?? '—'}
                  </td>
                  <td className="table-cell text-slate-500 dark:text-slate-400 max-w-52 truncate" title={m.reason ?? m.supplier ?? ''}>
                    {m.reason ?? m.supplier ?? '—'}
                  </td>
                  <td className="table-cell text-slate-500 dark:text-slate-400">{m.user}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-400 dark:text-slate-500">
                    <PackageSearch className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    No hay movimientos con los filtros seleccionados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Movements;
