import { useState } from 'react';
import { Wallet } from 'lucide-react';
import Modal from '../ui/Modal';

interface OpenCashModalProps {
  onOpen: (fondo: number) => void;
  onClose: () => void;
}

/** Apertura de caja (fondo inicial) — requerida para vender. */
function OpenCashModal({ onOpen, onClose }: OpenCashModalProps) {
  const [fondo, setFondo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleOpen = () => {
    const f = parseFloat(fondo);
    if (isNaN(f) || f < 0) {
      setError('El fondo debe ser un monto válido (0 o mayor)');
      return;
    }
    onOpen(f);
  };

  return (
    <Modal title="Abrir caja" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg text-sm text-blue-700 dark:text-blue-300">
          <Wallet className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Para vender debes <strong>abrir la caja</strong>: registra el fondo inicial en
            efectivo (0 si no hay fondo).
          </span>
        </div>

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
            onChange={(e) => {
              setFondo(e.target.value);
              setError(null);
            }}
            placeholder="0.00"
            autoFocus
          />
        </div>

        {error && (
          <div className="px-3 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button onClick={handleOpen} className="btn-primary flex-1">
            <Wallet className="w-4 h-4" />
            Abrir caja
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default OpenCashModal;
