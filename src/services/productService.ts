import { loadData, saveData, nextId } from './storage';
import type { Product } from '../types';

const KEY = 'products';

const seedProducts: Product[] = [
  {
    id: 1,
    name: 'Paracetamol 500mg',
    description: 'Analgésico y antipirético',
    price: 25.5,
    stock: 45,
    barcode: '750123456789',
    category: 'Analgésico',
    requires_prescription: false,
    controlled: false,
    expiration_date: '2026-12-31',
    lot_number: 'LOT-001',
  },
  {
    id: 2,
    name: 'Amoxicilina 250mg',
    description: 'Antibiótico de amplio espectro',
    price: 89.0,
    stock: 23,
    barcode: '750123456790',
    category: 'Antibiótico',
    requires_prescription: true,
    controlled: false,
    expiration_date: '2026-06-30',
    lot_number: 'LOT-002',
  },
  {
    id: 3,
    name: 'Omeprazol 20mg',
    description: 'Inhibidor de bomba de protones',
    price: 45.0,
    stock: 67,
    barcode: '750123456791',
    category: 'Gastrointestinal',
    requires_prescription: false,
    controlled: false,
    expiration_date: '2027-03-15',
    lot_number: 'LOT-003',
  },
  {
    id: 4,
    name: 'Aspirina 500mg',
    description: 'Antiagregante plaquetario',
    price: 35.0,
    stock: 89,
    barcode: '750123456792',
    category: 'Analgésico',
    requires_prescription: false,
    controlled: false,
    expiration_date: '2026-09-30',
    lot_number: 'LOT-004',
  },
  {
    id: 5,
    name: 'Losartán 50mg',
    description: 'Antihipertensivo',
    price: 120.0,
    stock: 12,
    barcode: '750123456793',
    category: 'Cardiovascular',
    requires_prescription: true,
    controlled: false,
    expiration_date: '2026-11-30',
    lot_number: 'LOT-005',
  },
  {
    id: 6,
    name: 'Clonazepam 2mg',
    description: 'Ansiolítico (controlado)',
    price: 95.0,
    stock: 30,
    barcode: '750123456794',
    category: 'Controlado',
    requires_prescription: true,
    controlled: true,
    expiration_date: '2026-08-31',
    lot_number: 'LOT-006',
  },
];

function read(): Product[] {
  return loadData<Product[]>(KEY, seedProducts);
}

function write(products: Product[]): void {
  saveData(KEY, products);
}

export const productService = {
  getProducts(): Product[] {
    return read();
  },

  searchProducts(query: string): Product[] {
    const q = query.trim().toLowerCase();
    if (!q) return read();
    return read().filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  },

  getProductByBarcode(barcode: string): Product | undefined {
    return read().find((p) => p.barcode === barcode.trim());
  },

  getById(id: number): Product | undefined {
    return read().find((p) => p.id === id);
  },

  createProduct(data: Omit<Product, 'id'>): Product {
    const products = read();
    const product: Product = { ...data, id: nextId(products) };
    write([...products, product]);
    return product;
  },

  updateProduct(id: number, data: Partial<Product>): Product | undefined {
    const products = read();
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    const updated = { ...products[idx], ...data, id };
    products[idx] = updated;
    write(products);
    return updated;
  },

  deleteProduct(id: number): void {
    write(read().filter((p) => p.id !== id));
  },

  adjustStock(id: number, delta: number): void {
    const products = read();
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return;
    products[idx] = {
      ...products[idx],
      stock: Math.max(0, products[idx].stock + delta),
    };
    write(products);
  },

  getLowStock(threshold = 10): Product[] {
    return read().filter((p) => p.stock <= threshold);
  },
};
