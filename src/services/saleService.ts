import { loadData, saveData, nextId } from './storage';
import { productService } from './productService';
import type { Sale } from '../types';

const KEY = 'sales';

function read(): Sale[] {
  return loadData<Sale[]>(KEY, []);
}

function write(sales: Sale[]): void {
  saveData(KEY, sales);
}

export const saleService = {
  getSales(): Sale[] {
    return read();
  },

  getSaleById(id: number): Sale | undefined {
    return read().find((s) => s.id === id);
  },

  createSale(
    sale: Omit<Sale, 'id' | 'date'>,
    opts?: { user?: string }
  ): Sale {
    const sales = read();
    const id = nextId(sales);
    const reference = `VENTA-${String(id).padStart(5, '0')}`;

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

  deleteSale(id: number): void {
    write(read().filter((s) => s.id !== id));
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
