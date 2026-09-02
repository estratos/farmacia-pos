import { loadData, saveData, uuid } from './storage';
import type { Customer } from '../types';

const KEY = 'customers';

function read(): Customer[] {
  return loadData<Customer[]>(KEY, []);
}

function write(customers: Customer[]): void {
  saveData(KEY, customers);
  bump();
}

// --- Reactividad: las vistas se re-renderizan cuando cambian los clientes ---
let revision = 0;
const listeners = new Set<() => void>();
function bump(): void {
  revision += 1;
  listeners.forEach((fn) => fn());
}
export function subscribeCustomers(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export function getCustomersRevision(): number {
  return revision;
}

export const customerService = {
  getCustomers(): Customer[] {
    return read();
  },

  getById(id: string): Customer | undefined {
    return read().find((c) => c.id === id);
  },

  searchCustomers(query: string): Customer[] {
    const q = query.trim().toLowerCase();
    if (!q) return read();
    return read().filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  },

  createCustomer(
    data: Omit<Customer, 'id' | 'created_at'>,
    opts?: { id?: string }
  ): Customer {
    const customers = read();
    const customer: Customer = {
      ...data,
      id: opts?.id ?? uuid(),
      created_at: new Date().toISOString(),
    };
    write([...customers, customer]);
    return customer;
  },

  updateCustomer(id: string, data: Partial<Customer>): Customer | undefined {
    const customers = read();
    const idx = customers.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    const updated = { ...customers[idx], ...data, id };
    customers[idx] = updated;
    write(customers);
    return updated;
  },

  deleteCustomer(id: string): void {
    write(read().filter((c) => c.id !== id));
  },

  /** Aplica un cliente del servidor (upsert). */
  upsertRemote(customer: Customer): void {
    const customers = read();
    const idx = customers.findIndex((c) => c.id === customer.id);
    if (idx === -1) {
      write([customer, ...customers]);
    } else {
      customers[idx] = { ...customers[idx], ...customer };
      write(customers);
    }
  },
};
