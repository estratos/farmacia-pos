/**
 * Servicio de caja (cortes de caja), local-first y reactivo.
 * Una sesión abierta por dispositivo; las ventas alimentan el esperado leyendo
 * saleService (sin duplicar estado); retiros/ingresos son movimientos propios.
 * (Los endpoints /cash/* del backend se conectarán cuando existan.)
 */
import { loadData, saveData, uuid } from './storage';
import { saleService } from './saleService';
import type {
  CashCut,
  CashMovement,
  CashSession,
  PaymentMethod,
} from '../types';

const SESSION_KEY = 'cash_session';
const CUTS_KEY = 'cash_cuts';
const MOVEMENTS_KEY = 'cash_movements';

export const CASH_METHODS: PaymentMethod[] = ['efectivo', 'tarjeta', 'transferencia'];

const zeroTotals = (): Record<PaymentMethod, { tickets: number; total: number }> => ({
  efectivo: { tickets: 0, total: 0 },
  tarjeta: { tickets: 0, total: 0 },
  transferencia: { tickets: 0, total: 0 },
});

const zeroNumbers = (): Record<PaymentMethod, number> => ({
  efectivo: 0,
  tarjeta: 0,
  transferencia: 0,
});

function readSession(): CashSession | null {
  return loadData<CashSession | null>(SESSION_KEY, null);
}

function readCuts(): CashCut[] {
  return loadData<CashCut[]>(CUTS_KEY, []);
}

function readMovements(): CashMovement[] {
  return loadData<CashMovement[]>(MOVEMENTS_KEY, []);
}

// --- Reactividad ---
let revision = 0;
const listeners = new Set<() => void>();
function bump(): void {
  revision += 1;
  listeners.forEach((fn) => fn());
}
export function subscribeCash(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export function getCashRevision(): number {
  return revision;
}

// --- Sincronización con el backend (handler inyectado por remoteApi) ---
export type CashOp = 'open' | 'close' | 'withdrawal' | 'ingress';
let syncHandler: ((op: CashOp, payload: Record<string, unknown>) => void) | null = null;

/** remoteApi registra aquí el envío al backend (write-through/outbox). */
export function setCashSyncHandler(
  fn: ((op: CashOp, payload: Record<string, unknown>) => void) | null
): void {
  syncHandler = fn;
}

function notifySync(op: CashOp, payload: Record<string, unknown>): void {
  syncHandler?.(op, payload);
}

export interface ExpectedCash {
  ventas: Record<PaymentMethod, { tickets: number; total: number }>;
  esperado: Record<PaymentMethod, number>;
  totalVentas: number;
}

export const cashService = {
  getCurrentSession(): CashSession | null {
    const session = readSession();
    return session && !session.cerrada_el ? session : null;
  },

  openSession(opts: { fondo: number; cajero: string; caja?: string }): CashSession {
    const existing = this.getCurrentSession();
    if (existing) return existing;

    const session: CashSession = {
      id: uuid(),
      caja: opts.caja ?? 'Caja 1',
      fondo: Math.max(0, opts.fondo),
      cajero: opts.cajero,
      abierta_el: new Date().toISOString(),
      cerrada_el: null,
    };
    saveData(SESSION_KEY, session);

    const movement: CashMovement = {
      id: uuid(),
      session_id: session.id,
      tipo: 'apertura',
      monto: session.fondo,
      motivo: 'Apertura de caja',
      fecha: session.abierta_el,
      usuario: opts.cajero,
    };
    saveData(MOVEMENTS_KEY, [movement, ...readMovements()]);
    bump();
    notifySync('open', {
      id: session.id, // id de cliente: el backend lo respeta (local == servidor)
      session_id: session.id,
      caja: session.caja,
      fondo: session.fondo,
      cajero: session.cajero,
      abierta_el: session.abierta_el,
    });
    return session;
  },

  /** Retiro de efectivo (negativo) durante el turno. */
  withdrawal(monto: number, motivo: string, usuario: string): CashMovement | null {
    return this.addMovement('retiro', -Math.abs(monto), motivo, usuario);
  },

  /** Ingreso de efectivo (positivo) durante el turno. */
  ingress(monto: number, motivo: string, usuario: string): CashMovement | null {
    return this.addMovement('ingreso', Math.abs(monto), motivo, usuario);
  },

  addMovement(
    tipo: CashMovement['tipo'],
    monto: number,
    motivo: string,
    usuario: string
  ): CashMovement | null {
    const session = this.getCurrentSession();
    if (!session) return null;
    const movement: CashMovement = {
      id: uuid(),
      session_id: session.id,
      tipo,
      monto,
      motivo: motivo || undefined,
      fecha: new Date().toISOString(),
      usuario,
    };
    saveData(MOVEMENTS_KEY, [movement, ...readMovements()]);
    bump();
    notifySync(tipo === 'retiro' ? 'withdrawal' : 'ingress', {
      id: movement.id, // id de cliente del movimiento
      session_id: session.id,
      remote_session_id: session.remote_session_id,
      monto,
      motivo: motivo || undefined,
      fecha: movement.fecha,
      usuario,
    });
    return movement;
  },

  getMovements(): CashMovement[] {
    return readMovements();
  },

  /**
   * Asocia la sesión local con la sesión creada por el backend (sus ids
   * difieren porque /cash/open no acepta el id del cliente todavía).
   */
  setRemoteSessionId(localSessionId: string, remoteSessionId: string): void {
    const session = readSession();
    if (!session || session.id !== localSessionId || session.cerrada_el) return;
    saveData(SESSION_KEY, { ...session, remote_session_id: remoteSessionId });
    bump();
  },

  /**
   * Esperado de la sesión: ventas (desde saleService, en el rango de la sesión)
   * + apertura/ingresos/retiros (movimientos propios).
   */
  computeExpected(session: CashSession): ExpectedCash {
    const since = new Date(session.abierta_el).getTime();
    const ventas = zeroTotals();
    let totalVentas = 0;

    for (const sale of saleService.getSales()) {
      if (sale.status === 'voided') continue; // las anuladas revierten su efecto
      if (new Date(sale.date).getTime() < since) continue;
      const m = sale.payment_method;
      ventas[m].tickets += 1;
      ventas[m].total += sale.total;
      totalVentas += sale.total;
    }

    let extraEfectivo = session.fondo;
    for (const mv of readMovements()) {
      if (mv.session_id !== session.id) continue;
      extraEfectivo += mv.monto; // apertura(+) / ingreso(+) / retiro(-)
    }

    const esperado = zeroNumbers();
    esperado.efectivo = extraEfectivo;
    esperado.tarjeta = ventas.tarjeta.total;
    esperado.transferencia = ventas.transferencia.total;

    return { ventas, esperado, totalVentas };
  },

  /**
   * Cierra la sesión con el corte: calcula esperado, aplica el conteo de
   * efectivo (tarjeta/transferencia son electrónicas → diferencia 0) y guarda.
   */
  closeSession(opts: {
    efectivoContado: number;
    notas?: string;
    cajero: string;
  }): CashCut | null {
    const session = this.getCurrentSession();
    if (!session) return null;

    const { ventas, esperado } = this.computeExpected(session);

    const contado: Partial<Record<PaymentMethod, number>> = {
      efectivo: Math.max(0, opts.efectivoContado),
      tarjeta: esperado.tarjeta,
      transferencia: esperado.transferencia,
    };

    const diferencia = zeroNumbers() as Record<PaymentMethod, number> & {
      total: number;
    };
    diferencia.efectivo = (contado.efectivo ?? 0) - esperado.efectivo;
    diferencia.tarjeta = 0;
    diferencia.transferencia = 0;
    diferencia.total =
      diferencia.efectivo + diferencia.tarjeta + diferencia.transferencia;

    const cut: CashCut = {
      id: uuid(),
      session_id: session.id,
      caja: session.caja,
      ventas_por_metodo: ventas,
      esperado,
      contado,
      diferencia,
      notas: opts.notas,
      cajero: opts.cajero,
      cerrado_el: new Date().toISOString(),
    };

    saveData(CUTS_KEY, [cut, ...readCuts()]);
    saveData(SESSION_KEY, { ...session, cerrada_el: cut.cerrado_el });

    // Movimiento de cierre (auditoría local + sincronización)
    const cierre: CashMovement = {
      id: uuid(),
      session_id: session.id,
      tipo: 'cierre',
      monto: 0,
      motivo: `Corte de caja (diferencia ${cut.diferencia.total > 0 ? '+' : ''}${cut.diferencia.total})`,
      fecha: cut.cerrado_el,
      usuario: opts.cajero,
    };
    saveData(MOVEMENTS_KEY, [cierre, ...readMovements()]);

    bump();
    notifySync('close', {
      id: cut.id, // id de cliente del corte
      session_id: session.id,
      remote_session_id: session.remote_session_id,
      cut_id: cut.id,
      contado: cut.contado,
      notas: cut.notas,
      cajero: opts.cajero,
      cerrado_el: cut.cerrado_el,
    });
    return cut;
  },

  getCuts(): CashCut[] {
    return readCuts();
  },

  getCutById(id: string): CashCut | undefined {
    return readCuts().find((c) => c.id === id);
  },
};
