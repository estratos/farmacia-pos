import { useState } from 'react';
import { useSyncExternalStore } from 'react';
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Scissors,
  Printer,
  Plus,
  Minus,
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import CashCutModal from '../components/cash/CashCutModal';
import { useAppContext } from '../contexts/AppContext';
import { useToast } from '../components/ui/Toast';
import { cashService, subscribeCash, getCashRevision, CASH_METHODS } from '../services/cashService';
import { subscribeSales, getSalesRevision } from '../services/saleService';
import { formatMoney } from '../services/storage';
import type { CashCut } from '../types';

const METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
};

const MOVEMENT_LABELS: Record<string, string> = {
  apertura: 'Apertura',
  cierre: 'Cierre',
  retiro: 'Retiro',
  ingreso: 'Ingreso',
  ajuste: 'Ajuste',
};

function CashPage() {
  const { state } = useAppContext();
  const { showToast } = useToast();
  const userName = state.user?.name ?? 'Admin';

  useSyncExternalStore(subscribeCash, getCashRevision);
  useSyncExternalStore(subscribeSales, getSalesRevision); // las ventas afectan el esperado

  const session = cashService.getCurrentSession();
  const expected = session ? cashService.computeExpected(session) : null;
  const cuts = cashService.getCuts();
  const sessionMovements = session
    ? cashService.getMovements().filter((m) => m.session_id === session.id)
    : [];

  const [fondo, setFondo] = useState('');
  const [showCut, setShowCut] = useState(false);
  const [viewCut, setViewCut] = useState<CashCut | null>(null);
  const [movType, setMovType] = useState<'retiro' | 'ingreso' | null>(null);
  const [movMonto, setMovMonto] = useState('');
  const [movMotivo, setMovMotivo] = useState('');

  const handleOpen = () => {
    const f = parseFloat(fondo);
    if (isNaN(f) || f < 0) {
      showToast('error', 'Fondo inválido');
      return;
    }
    cashService.openSession({ fondo: f, cajero: userName });
    setFondo('');
    showToast('success', 'Caja abierta');
  };

  const handleCutConfirm = (
    payload: { efectivoContado: number; notas?: string },
    imprimir: boolean
  ) => {
    const cut = cashService.closeSession({
      efectivoContado: payload.efectivoContado,
      notas: payload.notas,
      cajero: userName,
    });
    setShowCut(false);
    if (cut) {
      setViewCut(cut);
      if (imprimir) setTimeout(() => window.print(), 400);
      showToast('success', 'Corte de caja guardado');
    }
  };

  const handleMovement = () => {
    if (!movType) return;
    const monto = parseFloat(movMonto);
    if (isNaN(monto) || monto <= 0) {
      showToast('error', 'Monto inválido');
      return;
    }
    if (movType === 'retiro') {
      cashService.withdrawal(monto, movMotivo.trim(), userName);
      showToast('success', `Retiro de ${formatMoney(monto)} registrado`);
    } else {
      cashService.ingress(monto, movMotivo.trim(), userName);
      showToast('success', `Ingreso de ${formatMoney(monto)} registrado`);
    }
    setMovType(null);
    setMovMonto('');
    setMovMotivo('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          Caja
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {session
            ? `Turno abierto desde ${new Date(session.abierta_el).toLocaleString('es-MX')} — ${session.caja}`
            : 'Sin turno abierto — abre la caja para comenzar'}
        </p>
      </div>

      {!session ? (
        /* Apertura */
        <div className="card p-6 max-w-md">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
            Abrir caja
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Registra el fondo inicial en efectivo para comenzar el turno (necesario para vender).
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Fondo inicial (efectivo)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field"
                value={fondo}
                onChange={(e) => setFondo(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <button onClick={handleOpen} className="btn-primary w-full">
              <Wallet className="w-4 h-4" />
              Abrir caja
            </button>
          </div>
        </div>
      ) : (
        /* Turno abierto */
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 card p-6">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Resumen del turno
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setMovType('retiro')}
                  className="btn-ghost text-sm"
                  title="Retirar efectivo de la caja"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  Retiro
                </button>
                <button
                  onClick={() => setMovType('ingreso')}
                  className="btn-ghost text-sm"
                  title="Ingresar efectivo a la caja"
                >
                  <ArrowUpFromLine className="w-4 h-4" />
                  Ingreso
                </button>
                <button onClick={() => setShowCut(true)} className="btn-success text-sm">
                  <Scissors className="w-4 h-4" />
                  Corte de caja
                </button>
              </div>
            </div>

            {expected && (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700/40">
                    <tr>
                      <th className="table-header">Método</th>
                      <th className="table-header text-right">Tickets</th>
                      <th className="table-header text-right">Esperado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {CASH_METHODS.map((m) => (
                      <tr key={m} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                        <td className="table-cell">{METHOD_LABELS[m]}</td>
                        <td className="table-cell text-right tabular-nums">
                          {expected.ventas[m].tickets}
                        </td>
                        <td className="table-cell text-right font-medium tabular-nums">
                          {formatMoney(expected.esperado[m])}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td className="table-cell font-semibold">Total ventas</td>
                      <td className="table-cell text-right tabular-nums">
                        {CASH_METHODS.reduce((s, m) => s + expected.ventas[m].tickets, 0)}
                      </td>
                      <td className="table-cell text-right font-bold tabular-nums">
                        {formatMoney(expected.totalVentas)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
              El esperado de efectivo incluye el fondo inicial, las ventas en efectivo y los
              retiros/ingresos del turno.
            </p>

            {/* Movimientos de caja persistidos (apertura/cierre/retiros/ingresos) */}
            <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Movimientos de caja
              </h4>
              {sessionMovements.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Sin movimientos registrados en este turno.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {sessionMovements.map((m) => (
                    <div
                      key={m.id}
                      className="flex justify-between items-center px-3 py-1.5 bg-slate-50 dark:bg-slate-700/40 rounded-lg text-sm"
                    >
                      <div className="min-w-0">
                        <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {MOVEMENT_LABELS[m.tipo] ?? m.tipo}
                        </span>
                        {m.motivo && (
                          <span className="ml-2 text-xs text-slate-400 dark:text-slate-500 truncate">
                            {m.motivo}
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`font-semibold tabular-nums ${
                            m.monto > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : m.monto < 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {m.monto > 0 ? '+' : ''}
                          {formatMoney(m.monto)}
                        </span>
                        <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                          {new Date(m.fecha).toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Historial de cortes */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
              Historial de cortes
            </h3>
            {cuts.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Aún no hay cortes registrados.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {cuts.map((c) => (
                  <div
                    key={c.id}
                    className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-100">
                        {new Date(c.cerrado_el).toLocaleString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p
                        className={`text-xs font-semibold ${
                          c.diferencia.total === 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        Diferencia: {formatMoney(c.diferencia.total)}
                      </p>
                    </div>
                    <button
                      onClick={() => setViewCut(c)}
                      className="p-2 rounded-lg text-slate-500 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 transition-colors"
                      title="Ver / reimprimir corte"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showCut && session && (
        <CashCutModal
          session={session}
          onClose={() => setShowCut(false)}
          onConfirm={handleCutConfirm}
        />
      )}

      {viewCut && <CashCutModal cut={viewCut} onClose={() => setViewCut(null)} />}

      {movType && (
        <Modal
          title={movType === 'retiro' ? 'Retiro de efectivo' : 'Ingreso de efectivo'}
          onClose={() => setMovType(null)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Monto *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field"
                value={movMonto}
                onChange={(e) => setMovMonto(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Motivo
              </label>
              <input
                className="input-field"
                value={movMotivo}
                onChange={(e) => setMovMotivo(e.target.value)}
                placeholder={
                  movType === 'retiro'
                    ? 'Ej. Entrega a gerencia'
                    : 'Ej. Reposición de cambio'
                }
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setMovType(null)} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button onClick={handleMovement} className="btn-primary flex-1">
                {movType === 'retiro' ? (
                  <Minus className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {movType === 'retiro' ? 'Retirar' : 'Ingresar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default CashPage;
