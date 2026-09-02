import { useMemo, useState } from 'react';
import { Printer, CheckCircle2, Wallet, AlertTriangle } from 'lucide-react';
import Modal from '../ui/Modal';
import { cashService, CASH_METHODS } from '../../services/cashService';
import { settingsService } from '../../services/settingsService';
import { formatMoney } from '../../services/storage';
import type { CashCut, CashSession, PaymentMethod } from '../../types';

const METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
};

interface CashCutModalProps {
  /** Requerida en modo crear; no se usa en modo ver/reimprimir. */
  session?: CashSession;
  /** Si viene, el modal es modo ver/reimprimir de un corte almacenado. */
  cut?: CashCut;
  onClose: () => void;
  onConfirm?: (payload: { efectivoContado: number; notas?: string }, imprimir: boolean) => void;
}

/** Área imprimible del corte (ticket 80mm). */
function CashCutPrint({ cut }: { cut: CashCut }) {
  const settings = settingsService.getSettings();
  const date = new Date(cut.cerrado_el);

  return (
    <div id="cash-cut-area" className="receipt font-mono text-xs text-black bg-white p-4 rounded-lg">
      <div className="text-center mb-2">
        <p className="text-sm font-bold">{settings.pharmacyName}</p>
        <p>{settings.licenseNumber}</p>
        <p className="mt-1">CORTE DE CAJA</p>
        <p>{cut.caja ?? ''}</p>
        <p>
          {date.toLocaleDateString('es-MX')} {date.toLocaleTimeString('es-MX')}
        </p>
        <p>Cajero: {cut.cajero}</p>
      </div>

      <div className="border-t border-dashed border-gray-400 my-2" />

      {CASH_METHODS.map((m) => (
        <div key={m} className="mb-1">
          <div className="flex justify-between font-bold">
            <span>{METHOD_LABELS[m]}</span>
            <span>{formatMoney(cut.esperado[m])}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>{cut.ventas_por_metodo[m].tickets} ticket(s)</span>
            <span>contado: {formatMoney(cut.contado[m] ?? 0)}</span>
          </div>
        </div>
      ))}

      <div className="border-t border-dashed border-gray-400 my-2" />

      <div className="flex justify-between">
        <span>Total esperado</span>
        <span>{formatMoney(Object.values(cut.esperado).reduce((a, b) => a + b, 0))}</span>
      </div>
      <div className="flex justify-between text-sm font-bold mt-1">
        <span>DIFERENCIA</span>
        <span>{formatMoney(cut.diferencia.total)}</span>
      </div>
      {cut.diferencia.total !== 0 && (
        <div className="text-gray-600">
          {cut.diferencia.total > 0 ? 'Sobrante' : 'Faltante'} de{' '}
          {formatMoney(Math.abs(cut.diferencia.total))}
        </div>
      )}

      {cut.notas && (
        <>
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div>Notas: {cut.notas}</div>
        </>
      )}

      <div className="border-t border-dashed border-gray-400 my-2" />

      <div className="text-center">
        <p className="mt-6">______________________</p>
        <p>Cajero</p>
        <p className="mt-6">______________________</p>
        <p>Encargado</p>
        <p className="text-[10px] text-gray-500 mt-1">Farmacia POS v1.2.0</p>
      </div>
    </div>
  );
}

function CashCutModal({ session, cut, onClose, onConfirm }: CashCutModalProps) {
  const [efectivoContado, setEfectivoContado] = useState('');
  const [notas, setNotas] = useState('');

  const expected = useMemo(
    () => (!cut && session ? cashService.computeExpected(session) : null),
    [cut, session]
  );
  const contado = parseFloat(efectivoContado) || 0;
  const diferencia = expected ? contado - expected.esperado.efectivo : 0;
  const isValid = contado >= 0;

  // Modo ver/reimprimir
  if (cut) {
    return (
      <Modal title="Corte de caja" onClose={onClose}>
        <CashCutPrint cut={cut} />
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cerrar
          </button>
          <button onClick={() => window.print()} className="btn-primary flex-1">
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </Modal>
    );
  }

  const handleConfirm = (imprimir: boolean) => {
    if (!isValid) return;
    onConfirm?.({ efectivoContado: contado, notas: notas.trim() || undefined }, imprimir);
  };

  // En modo crear, la sesión y el esperado están garantizados
  const exp = expected as NonNullable<typeof expected>;

  return (
    <Modal title="Corte de caja" onClose={onClose}>
      <div className="space-y-4">
        {/* Resumen por método */}
        <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4 space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Wallet className="w-4 h-4" /> Resumen del turno
          </p>
          {CASH_METHODS.map((m) => (
            <div key={m} className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-300">
                {METHOD_LABELS[m]}{' '}
                <span className="text-slate-400 dark:text-slate-500">
                  ({exp.ventas[m].tickets} ticket
                  {exp.ventas[m].tickets === 1 ? '' : 's'})
                </span>
              </span>
              <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                {formatMoney(exp.esperado[m])}
              </span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold border-t border-slate-200 dark:border-slate-600 pt-2">
            <span className="text-slate-800 dark:text-slate-100">Total</span>
            <span className="tabular-nums">{formatMoney(exp.totalVentas)}</span>
          </div>
        </div>

        {/* Conteo */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Efectivo contado en caja *
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="input-field"
            value={efectivoContado}
            onChange={(e) => setEfectivoContado(e.target.value)}
            placeholder="0.00"
            autoFocus
          />
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Efectivo esperado:</span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
              {formatMoney(exp.esperado.efectivo)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Diferencia:</span>
            <span
              className={`font-semibold tabular-nums ${
                diferencia === 0
                  ? 'text-slate-700 dark:text-slate-200'
                  : diferencia > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
              }`}
            >
              {diferencia > 0
                ? `Sobrante ${formatMoney(diferencia)}`
                : diferencia < 0
                  ? `Faltante ${formatMoney(Math.abs(diferencia))}`
                  : 'Cuadrado'}
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Tarjeta y transferencia son electrónicas (verificadas contra el sistema).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Notas (opcional)
          </label>
          <input
            className="input-field"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej. Sin incidencias"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button
            onClick={() => handleConfirm(false)}
            disabled={!isValid}
            className="btn-ghost flex-1"
          >
            <CheckCircle2 className="w-4 h-4" />
            Guardar
          </button>
          <button
            onClick={() => handleConfirm(true)}
            disabled={!isValid}
            className="btn-primary flex-1"
          >
            <Printer className="w-4 h-4" />
            Guardar e imprimir
          </button>
        </div>

        {exp.totalVentas === 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg text-sm text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            No hay ventas registradas en este turno.
          </div>
        )}
      </div>
    </Modal>
  );
}

export default CashCutModal;
