import { loadData, saveData, nextId } from './storage';
import type { Customer } from '../types';

const KEY = 'customers';

function read(): Customer[] {
  return loadData<Customer[]>(KEY, []);
}

function write(customers: Customer[]): void {
  saveData(KEY, customers);
}

export const customerService = {
  getCustomers(): Customer[] {
    return read();
  },

  getById(id: number): Customer | undefined {
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

  createCustomer(data: Omit<Customer, 'id' | 'created_at'>): Customer {
    const customers = read();
    const customer: Customer = {
      ...data,
      id: nextId(customers),
      created_at: new Date().toISOString(),
    };
    write([...customers, customer]);
    return customer;
  },

  updateCustomer(id: number, data: Partial<Customer>): Customer | undefined {
    const customers = read();
    const idx = customers.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    const updated = { ...customers[idx], ...data, id };
    customers[idx] = updated;
    write(customers);
    return updated;
  },

  deleteCustomer(id: number): void {
    write(read().filter((c) => c.id !== id));
  },
};
