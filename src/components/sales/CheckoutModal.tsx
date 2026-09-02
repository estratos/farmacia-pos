import { useState } from 'react';
import { Banknote, CreditCard, Landmark, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { formatMoney } from '../../services/storage';
import type { CartItem, PaymentMethod } from '../../types';

interface CheckoutModalProps {
  items: CartItem[];
  subtotal: number;
  /** Tasa de la tienda en porcentaje (ej. 16). Se puede marcar "Sin IVA" (0%). */
  taxRatePercent: number;
  onConfirm: (payload: {
    items: CartItem[];
    subtotal: number;
    tax: number;
    total: number;
    tax_rate?: number; // fracción 0–1; 0 = venta sin IVA
    payment_method: PaymentMethod;
    received?: number;
    change?: number;
  }) => void;
  onCancel: () => void;
}

const METHODS: { value: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { value: 'transferencia', label: 'Transferencia', icon: Landmark },
];

function CheckoutModal({ items, subtotal, taxRatePercent, onConfirm, onCancel }: CheckoutModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('efectivo');
  const [received, setReceived] = useState('');
  const [sinIva, setSinIva] = useState(false);

  // IVA efectivo: 0 si "Sin IVA", si no la tasa de la tienda
  const tax = sinIva ? 0 : (subtotal * taxRatePercent) / 100;
  const total = subtotal + tax;
  const taxRateFraction = sinIva ? 0 : taxRatePercent / 100;

  const receivedNum = parseFloat(received) || 0;
  const change = receivedNum - total;
  const isValid = method !== 'efectivo' || (receivedNum >= total && receivedNum > 0);

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm({
      items,
      subtotal,
      tax,
      total,
      tax_rate: taxRateFraction,
      payment_method: method,
      received: method === 'efectivo' ? receivedNum : undefined,
      change: method === 'efectivo' ? change : undefined,
    });
  };

  return (
    <Modal title="Cobro de Venta" onClose={onCancel}>
      <div className="space-y-4">
        <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total a cobrar</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {formatMoney(total)}
          </p>

          {/* Selector de IVA por venta */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              onClick={() => setSinIva(false)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                !sinIva
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50'
              }`}
            >
              Con IVA ({taxRatePercent}%)
            </button>
            <button
              onClick={() => setSinIva(true)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                sinIva
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50'
              }`}
            >
              Sin IVA (0%)
            </button>
          </div>

          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>IVA {sinIva ? '(0%)' : `(${taxRatePercent}%)`}</span>
              <span className="tabular-nums">{formatMoney(tax)}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Método de pago
          </label>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setMethod(value)}
                className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-medium transition-colors ${
                  method === value
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {method === 'efectivo' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Monto recibido
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input-field"
              placeholder="0.00"
              value={received}
              onChange={(e) => setReceived(e.target.value)}
              autoFocus
            />
            {receivedNum > 0 && (
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Cambio:</span>
                <span
                  className={`font-semibold tabular-nums ${
                    change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {change >= 0 ? formatMoney(change) : 'Monto insuficiente'}
                </span>
              </div>
            )}
          </div>
        )}

        {items.some((i) => i.requires_prescription) && (
          <div className="px-3 py-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Este ticket incluye productos que <strong>requieren receta</strong>. Verifica la
              receta antes de entregar.
            </span>
          </div>
        )}

        <div className="flex space-x-2 pt-2">
          <button onClick={onCancel} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={!isValid} className="btn-success flex-1">
            <CheckCircle2 className="w-4 h-4" />
            Confirmar Venta
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default CheckoutModal;
