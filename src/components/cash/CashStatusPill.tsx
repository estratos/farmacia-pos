import { useSyncExternalStore } from 'react';
import { Wallet } from 'lucide-react';
import { cashService, subscribeCash, getCashRevision } from '../../services/cashService';

/** Indicador compacto del estado de la caja (Header/TitleBar). */
function CashStatusPill() {
  useSyncExternalStore(subscribeCash, getCashRevision);
  const session = cashService.getCurrentSession();

  if (session) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
        title={`Caja abierta desde ${new Date(session.abierta_el).toLocaleString('es-MX')}`}
      >
        <Wallet className="w-3.5 h-3.5" />
        Caja abierta
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
      <Wallet className="w-3.5 h-3.5" />
      Caja cerrada
    </span>
  );
}

export default CashStatusPill;
