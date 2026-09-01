import { CheckCircle2, Printer, RefreshCw } from 'lucide-react';
import Modal from '../ui/Modal';
import { settingsService } from '../../services/settingsService';
import { formatMoney } from '../../services/storage';
import type { Sale } from '../../types';

interface ReceiptProps {
  sale: Sale;
  onClose: () => void;
}

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
};

function Receipt({ sale, onClose }: ReceiptProps) {
  const settings = settingsService.getSettings();
  const date = new Date(sale.date);

  return (
    <Modal title="Venta Completada" onClose={onClose}>
      {/* Área imprimible: ticket térmico 80mm */}
      <div id="receipt-area" className="receipt font-mono text-xs text-black bg-white p-4 rounded-lg">
        <div className="text-center mb-2">
          <p className="text-sm font-bold">{settings.pharmacyName}</p>
          <p>{settings.licenseNumber}</p>
          <p className="mt-1">Ticket #{String(sale.id).padStart(5, '0')}</p>
          <p>
            {date.toLocaleDateString('es-MX')} {date.toLocaleTimeString('es-MX')}
          </p>
        </div>

        <div className="border-t border-dashed border-gray-400 my-2" />

        {sale.items.map((item) => (
          <div key={item.id} className="mb-1">
            <div className="flex justify-between">
              <span>{item.name}</span>
              <span>{formatMoney(item.price * item.quantity)}</span>
            </div>
            <div className="text-gray-600">
              {item.quantity} x {formatMoney(item.price)}
              {item.requires_prescription && '  [RECETA]'}
            </div>
          </div>
        ))}

        <div className="border-t border-dashed border-gray-400 my-2" />

        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatMoney(sale.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>IVA ({settings.taxRate}%)</span>
          <span>{formatMoney(sale.tax)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold mt-1">
          <span>TOTAL</span>
          <span>{formatMoney(sale.total)}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>{PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method}</span>
          <span>{formatMoney(sale.received ?? sale.total)}</span>
        </div>
        {typeof sale.change === 'number' && (
          <div className="flex justify-between">
            <span>Cambio</span>
            <span>{formatMoney(sale.change)}</span>
          </div>
        )}

        <div className="border-t border-dashed border-gray-400 my-2" />

        <div className="text-center">
          <p>{settings.receiptFooter}</p>
          <p className="text-[10px] text-gray-500 mt-1">Farmacia POS v1.2.0</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mt-4 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg text-sm text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        Venta registrada — el inventario se actualizó
      </div>

      <div className="flex space-x-2 mt-4">
        <button onClick={onClose} className="btn-secondary flex-1">
          <RefreshCw className="w-4 h-4" />
          Nueva Venta
        </button>
        <button onClick={() => window.print()} className="btn-primary flex-1">
          <Printer className="w-4 h-4" />
          Imprimir Recibo
        </button>
      </div>
    </Modal>
  );
}

export default Receipt;
