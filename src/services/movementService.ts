import { loadData, saveData, uuid } from './storage';
import type { InventoryMovement, MovementType, Product } from '../types';

const KEY = 'movements';
const SEED_FLAG_KEY = 'movements_seeded';

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  initial: 'Stock inicial',
  purchase: 'Entrada / compra',
  sale: 'Venta',
  return: 'Devolución',
  adjustment: 'Ajuste',
  shrinkage: 'Merma',
  purchase_return: 'Devolución de compra',
};

export const MOVEMENT_STYLES: Record<MovementType, string> = {
  initial: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  purchase: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  sale: 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300',
  return: 'bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300',
  adjustment: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300',
  shrinkage: 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300',
  purchase_return: 'bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300',
};

function read(): InventoryMovement[] {
  return loadData<InventoryMovement[]>(KEY, []);
}

function write(movements: InventoryMovement[]): void {
  saveData(KEY, movements);
}

export interface MovementInput {
  product_id: string;
  product_name: string;
  product_barcode: string;
  type: MovementType;
  quantity: number; // con signo
  stock_before: number;
  stock_after: number;
  unit_price?: number;
  reference?: string;
  reason?: string;
  supplier?: string;
  user?: string;
  notes?: string;
}

export const movementService = {
  getMovements(): InventoryMovement[] {
    return read();
  },

  /** Registra un movimiento (append-only). Devuelve el movimiento creado. */
  record(input: MovementInput): InventoryMovement {
    const movements = read();
    const movement: InventoryMovement = {
      id: uuid(),
      created_at: new Date().toISOString(),
      user: input.user ?? 'Admin',
      ...input,
    };
    write([movement, ...movements]);
    return movement;
  },

  getByProduct(productId: string): InventoryMovement[] {
    return read().filter((m) => m.product_id === productId);
  },

  getByType(type: MovementType): InventoryMovement[] {
    return read().filter((m) => m.type === type);
  },

  /**
   * Filtros combinados para la pantalla de movimientos.
   * Las fechas se comparan por día local (AAAA-MM-DD).
   */
  filter(options: {
    type?: MovementType | 'all';
    productId?: string | 'all';
    from?: string;
    to?: string;
    query?: string;
  }): InventoryMovement[] {
    const { type = 'all', productId = 'all', from, to, query } = options;
    let result = read();

    if (type !== 'all') result = result.filter((m) => m.type === type);
    if (productId !== 'all') result = result.filter((m) => m.product_id === productId);
    if (from) {
      result = result.filter((m) => m.created_at.slice(0, 10) >= from);
    }
    if (to) {
      result = result.filter((m) => m.created_at.slice(0, 10) <= to);
    }
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (m) =>
          m.product_name.toLowerCase().includes(q) ||
          m.product_barcode.includes(q) ||
          (m.reference ?? '').toLowerCase().includes(q) ||
          (m.reason ?? '').toLowerCase().includes(q) ||
          (m.supplier ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  },

  getSummary(movements: InventoryMovement[]) {
    const totalIn = movements
      .filter((m) => m.quantity > 0)
      .reduce((sum, m) => sum + m.quantity, 0);
    const totalOut = movements
      .filter((m) => m.quantity < 0)
      .reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    return {
      count: movements.length,
      totalIn,
      totalOut,
      net: totalIn - totalOut,
    };
  },

  /**
   * Crea movimientos 'initial' por el stock actual de los productos
   * la primera vez (idempotente vía flag). Así la traza es consistente
   * aunque el stock ya existía antes de esta función.
   */  ensureInitialMovements(products: Product[]): void {
    if (loadData<boolean>(SEED_FLAG_KEY, false)) return;
    const movements = read();
    const existingProductIds = new Set(movements.map((m) => m.product_id));
    const toAdd: InventoryMovement[] = [];
    for (const product of products) {
      if (product.stock <= 0 || existingProductIds.has(product.id)) continue;
      toAdd.push({
        id: uuid(),
        product_id: product.id,
        product_name: product.name,
        product_barcode: product.barcode,
        type: 'initial',
        quantity: product.stock,
        stock_before: 0,
        stock_after: product.stock,
        unit_price: product.price,
        reason: 'Stock inicial registrado',
        user: 'Sistema',
        created_at: new Date().toISOString(),
      });
    }
    if (toAdd.length > 0) {
      write([...toAdd, ...movements]);
    }
    saveData(SEED_FLAG_KEY, true);
  },

  /** Aplica un movimiento del servidor (append-only; no reemplaza existentes). */
  upsertRemote(movement: InventoryMovement): void {
    const movements = read();
    if (movements.some((m) => m.id === movement.id)) return;
    write([movement, ...movements]);
  },
};
