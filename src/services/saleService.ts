import { loadData, saveData, uuid } from './storage';
import { productService } from './productService';
import type { Sale } from '../types';

const KEY = 'sales';

function read(): Sale[] {
  return loadData<Sale[]>(KEY, []);
}

function write(sales: Sale[]): void {
  saveData(KEY, sales);
  bump();
}

// --- Reactividad: las vistas se re-renderizan cuando cambian las ventas ---
let revision = 0;
const listeners = new Set<() => void>();
function bump(): void {
  revision += 1;
  listeners.forEach((fn) => fn());
}
export function subscribeSales(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export function getSalesRevision(): number {
  return revision;
}

export const saleService = {
  getSales(): Sale[] {
    return read();
  },

  getSaleById(id: string): Sale | undefined {
    return read().find((s) => s.id === id);
  },

  createSale(
    sale: Omit<Sale, 'id' | 'date'>,
    opts?: { user?: string; id?: string }
  ): Sale {
    const sales = read();
    const id = opts?.id ?? uuid();
    const reference = `VENTA-${String(id).slice(0, 8)}`;

    // Descontar stock de cada producto vendido y registrar el movimiento
    for (const item of sale.items) {
      productService.adjustStock(item.id, -item.quantity, {
        type: 'sale',
        reference,
        unitPrice: item.price,
        user: opts?.user,
      });
    }

    const record: Sale = { ...sale, id, date: new Date().toISOString() };
    write([record, ...sales]);
    return record;
  },

  deleteSale(id: string): void {
    write(read().filter((s) => s.id !== id));
  },

  /** Aplica una venta del servidor (si existe, reemplaza — ej. anulación). */
  upsertRemote(sale: Sale): void {
    const sales = read();
    const idx = sales.findIndex((s) => s.id === sale.id);
    if (idx === -1) {
      write([sale, ...sales]);
    } else {
      sales[idx] = sale;
      write(sales);
    }
  },

  /** Ventas registradas hoy (fecha local). */
  getTodaySales(): Sale[] {
    const today = new Date().toDateString();
    return read().filter((s) => new Date(s.date).toDateString() === today);
  },

  /** Ventas agrupadas por fecha (para Reportes). */
  getSalesByDay(): { date: string; count: number; total: number }[] {
    const map = new Map<string, { count: number; total: number }>();
    for (const sale of read()) {
      const day = new Date(sale.date).toDateString();
      const entry = map.get(day) ?? { count: 0, total: 0 };
      entry.count += 1;
      entry.total += sale.total;
      map.set(day, entry);
    }
    return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
  },

  /** Productos más vendidos por unidades (para Reportes/Dashboard). */
  getTopProducts(limit = 5): { name: string; sold: number; revenue: number }[] {
    const map = new Map<string, { name: string; sold: number; revenue: number }>();
    for (const sale of read()) {
      for (const item of sale.items) {
        const entry = map.get(item.name) ?? { name: item.name, sold: 0, revenue: 0 };
        entry.sold += item.quantity;
        entry.revenue += item.price * item.quantity;
        map.set(item.name, entry);
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.sold - a.sold)
      .slice(0, limit);
  },
};
